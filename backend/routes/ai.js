const express = require("express");
const { getGeminiClient } = require("../lib/gemini");
const { getSupabase } = require("../supabase");
const { requireAuth, requireRole } = require("../middleware/auth");
const { uploadImage } = require("../lib/storage");
const { classifyScore } = require("../lib/crop-image-score");
const { buildAssessment, buildAssessmentPrompt } = require("../lib/pineapple-assessment");
const { generateVisionJson, visionModels } = require("../lib/gemini-vision");
const { publicRules, scoreInspection } = require("../lib/crop-rule-inspection");

const router = express.Router();

const MINIMUM_PINEAPPLE_CONFIDENCE = 0.75;
const IMAGE_CONTEXTS = new Set(["field", "leaf-close-up", "fruit-close-up", "whole-plant", "mixed"]);

class PineappleImageValidationError extends Error {
  constructor(reason) {
    super(`Upload rejected: this image does not appear to show a pineapple plant, fruit, leaf, or pineapple field.${reason ? ` ${reason}` : ""}`);
    this.statusCode = 422;
    this.code = "PINEAPPLE_IMAGE_REQUIRED";
  }
}

function cleanBase64(input, defaultMime = "image/jpeg") {
  if (!input || typeof input !== "string") {
    throw new Error("A valid image is required.");
  }

  const match = input.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      data: match[2],
    };
  }

  return {
    mimeType: defaultMime,
    data: input.trim(),
  };
}

async function validatePineappleImage(ai, mimeType, base64Data) {
  let validationModel = null;
  const validation = await generateVisionJson(ai, mimeType, base64Data, `
You validate images for a pineapple crop-health system.
Inspect the attached image before any disease diagnosis is performed.

Accept only images that clearly show one or more of the following:
- pineapple fruit, plant, leaves, crown, or close-up pineapple disease/pest symptoms;
- a pineapple field, plantation, or farm where pineapple plants are visible.

Reject unrelated crops, people, animals, vehicles, equipment-only photos, documents, screenshots, landscapes without visible pineapple plants, and images that are too unclear to identify.

Respond in STRICT JSON without markdown:
{
  "isPineappleRelated": <boolean>,
  "confidence": <number from 0 to 1>,
  "imageContext": "<'field' | 'leaf-close-up' | 'fruit-close-up' | 'whole-plant' | 'mixed'>",
  "reason": "<short, student-friendly explanation>"
}`, { stage: "photo check", onModelSuccess: (model) => { validationModel = model; } });

  const confidence = Number(validation.confidence);
  if (validation.isPineappleRelated !== true || !Number.isFinite(confidence) || confidence < MINIMUM_PINEAPPLE_CONFIDENCE) {
    throw new PineappleImageValidationError(validation.reason || "Please upload a clear pineapple crop image.");
  }

  return {
    imageContext: IMAGE_CONTEXTS.has(validation.imageContext) ? validation.imageContext : "mixed",
    model: validationModel,
  };
}

// GET all inspections from database
router.get("/crop-inspections", requireAuth, async (req, res) => {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from("crop_health_inspections")
      .select("*")
      .order("created_at", { ascending: false });

    if (req.query.field && req.query.field !== "all") {
      query = query.eq("field_name", req.query.field);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Supabase query error:", error.message);
      return res.status(500).json({ error: "Failed to load crop inspections." });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.warn("Failed to fetch crop inspections from database:", err.message);
    return res.status(500).json({ error: "Failed to load crop inspections." });
  }
});

// POST save inspection manually
router.post("/crop-inspections", requireAuth, async (req, res) => {
  try {
    const supabase = getSupabase();
    const {
      field,
      healthScore,
      healthStatus,
      diseaseOrIssueName,
      visualSummary,
      issues,
      recommendations,
      image,
      imageMime,
      imageName,
      status,
    } = req.body;

    let imageUrl = null;
    let imageStoragePath = null;
    const normalizedHealthScore = Number.isInteger(healthScore) && healthScore >= 0 && healthScore <= 100 ? healthScore : null;

    if (image && typeof image === "string" && image.startsWith("data:image/")) {
      const { data: base64Data, mimeType } = cleanBase64(image, imageMime || "image/png");
      await validatePineappleImage(getGeminiClient(), mimeType, base64Data);
      const uploadRes = await uploadImage("crop-inspections", base64Data, mimeType, field);
      if (uploadRes) {
        imageUrl = uploadRes.imageUrl;
        imageStoragePath = uploadRes.storagePath;
      }
    } else if (image && typeof image === "string" && image.startsWith("http")) {
      throw new PineappleImageValidationError("Only a newly scanned pineapple image can be saved.");
    }

    const record = {
      field_name: field || "Field A",
      crop_type: "Pineapple",
      health_score: normalizedHealthScore,
      health_status: healthStatus || classifyScore(normalizedHealthScore),
      disease_or_issue_name: diseaseOrIssueName || "General Crop Inspection",
      visual_summary: visualSummary || "",
      identified_symptoms: Array.isArray(issues) ? issues : [],
      action_recommendations: Array.isArray(recommendations) ? recommendations : [],
      image_url: imageUrl,
      image_storage_path: imageStoragePath,
      image_name: imageName || `${field || "Field"} image`,
      image_mime_type: imageMime || "image/png",
      status: status || "COMPLETED",
      analyzed_by: req.user?.id || null,
    };

    const { data, error } = await supabase
      .from("crop_health_inspections")
      .insert(record)
      .select()
      .single();

    if (error) {
      console.warn("Supabase insert error:", error.message);
      return res.status(500).json({ error: "Failed to save inspection record." });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.warn("Save inspection exception:", err.message);
    return res.status(err.statusCode || 500).json({
      error: err.message || "Failed to save inspection.",
      code: err.code,
    });
  }
});

// DELETE an inspection record
router.delete("/crop-inspections/:id", requireAuth, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("crop_health_inspections")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ success: true, message: "Inspection record deleted." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Rule-based visual inspection: descriptions and scores are defined on the server.
router.get("/crop-inspection-rules", requireAuth, requireRole("admin"), (req, res) => {
  res.json({ factors: publicRules() });
});

router.post("/crop-rule-inspection", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { field, selections, image, imageName } = req.body || {};
    if (!["Field A", "Field B", "Field C", "Field D"].includes(field)) {
      return res.status(400).json({ error: "Choose a valid field." });
    }
    let result;
    try { result = scoreInspection(selections); }
    catch (error) { return res.status(400).json({ error: error.message }); }

    let imageUrl = null;
    let imageStoragePath = null;
    let imageMime = null;
    if (image != null) {
      const match = typeof image === "string" && image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match || Buffer.byteLength(match[2], "base64") > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "Use a JPEG, PNG, or WebP photo no larger than 10 MB." });
      }
      imageMime = match[1];
      const uploaded = await uploadImage("crop-inspections", match[2], imageMime, field);
      if (!uploaded) return res.status(503).json({ error: "Could not save the inspection photo. Please retry." });
      imageUrl = uploaded.imageUrl;
      imageStoragePath = uploaded.storagePath;
    }

    const diagnosis = {
      score: result.score,
      factorScores: result.factorScores,
      factorRatings: result.ratings,
      visibleCropRegions: [],
      scoringMethod: "manual-description-rules-v1",
      coverage: result.coverage,
      isPartial: result.isPartial,
      healthStatus: result.healthStatus,
      diseaseOrIssueName: "Rule-based visual inspection",
      issues: result.findings,
      recommendations: result.recommendations,
      visualSummary: result.summary,
    };
    const record = {
      field_name: field,
      crop_type: "Pineapple",
      health_score: result.score,
      health_status: result.healthStatus,
      disease_or_issue_name: diagnosis.diseaseOrIssueName,
      visual_summary: result.summary,
      identified_symptoms: result.findings,
      action_recommendations: result.recommendations,
      factor_scores: { ...result.factorScores, ratings: result.ratings, method: diagnosis.scoringMethod, coverage: result.coverage },
      assessment_source: "rule-inspection",
      ai_model: null,
      image_url: imageUrl,
      image_storage_path: imageStoragePath,
      image_name: typeof imageName === "string" ? imageName.slice(0, 120) : null,
      image_mime_type: imageMime,
      status: "COMPLETED",
      analyzed_by: req.user?.id || null,
    };
    const { data, error } = await getSupabase().from("crop_health_inspections").insert(record).select().single();
    if (error) return res.status(500).json({ error: "Failed to save the rule-based inspection." });
    return res.json({ success: true, diagnosis, savedRecord: data });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to record the inspection." });
  }
});

// AI photo assessment: four visible dimensions, then the fixed decision tree sets the overall status.
router.post("/crop-diagnosis", requireAuth, async (req, res) => {
  try {
    const { image, mimeType, field, cropType } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image data is required for crop diagnosis." });
    }

    const { data: base64Data, mimeType: finalMimeType } = cleanBase64(image, mimeType);

    const ai = getGeminiClient();

    // This scan happens before diagnosis, storage, and database insertion.
    const { imageContext, model: validationModel } = await validatePineappleImage(ai, finalMimeType, base64Data);

    const promptText = buildAssessmentPrompt({ field, cropType, imageContext });

    let diagnosisModel = null;
    const raw = await generateVisionJson(ai, finalMimeType, base64Data, promptText, {
      stage: "crop diagnosis",
      models: visionModels(validationModel),
      onModelSuccess: (model) => { diagnosisModel = model; },
    });
    const assessment = buildAssessment(raw);

    // No overall numeric score: the decision tree status is the result.
    const sanitizedDiagnosis = {
      score: null,
      overallStatus: assessment.overall.status,
      healthStatus: assessment.overall.label,
      overall: assessment.overall,
      factorRatings: assessment.dimensions,
      factorScores: assessment.factorScores,
      visibleCropRegions: [],
      coverage: null,
      isPartial: false,
      scoringMethod: assessment.method,
      imageContext,
      diseaseOrIssueName: assessment.headline,
      issues: assessment.symptoms,
      recommendations: assessment.recommendations,
      limitations: assessment.limitations,
      visualSummary: assessment.overall.summary,
    };

    // Auto-save to Supabase
    let savedRecord = null;
    let saveWarning = null;
    try {
      const supabase = getSupabase();
      const uploadRes = await uploadImage("crop-inspections", base64Data, finalMimeType, field);
      
      const record = {
        field_name: field || "Field A",
        crop_type: cropType || "Pineapple",
        health_score: null,
        health_status: sanitizedDiagnosis.healthStatus,
        disease_or_issue_name: sanitizedDiagnosis.diseaseOrIssueName,
        visual_summary: sanitizedDiagnosis.visualSummary,
        identified_symptoms: sanitizedDiagnosis.issues,
        action_recommendations: sanitizedDiagnosis.recommendations,
        factor_scores: {
          ...sanitizedDiagnosis.factorScores,
          ratings: sanitizedDiagnosis.factorRatings,
          overall: sanitizedDiagnosis.overall,
          limitations: sanitizedDiagnosis.limitations,
          method: sanitizedDiagnosis.scoringMethod,
        },
        assessment_source: "gemini-diagnosis",
        image_url: uploadRes?.imageUrl || null,
        image_storage_path: uploadRes?.storagePath || null,
        image_name: `${field || "Field"} diagnosis photo`,
        image_mime_type: finalMimeType,
        status: "COMPLETED",
        ai_model: diagnosisModel,
        analyzed_by: req.user?.id || null,
      };

      const { data: dbData, error: saveError } = await supabase
        .from("crop_health_inspections")
        .insert(record)
        .select()
        .single();

      if (saveError) throw saveError;

      if (dbData) savedRecord = dbData;
    } catch (saveErr) {
      console.warn("Auto-save to Supabase warning:", saveErr.message);
      saveWarning = "Diagnosis completed but could not be saved. Check database availability and crop health migrations 064 and 065, then try again.";
    }

    res.json({
      success: true,
      field: field || "Field A",
      cropType: cropType || "Pineapple",
      diagnosis: sanitizedDiagnosis,
      savedRecord,
      saveWarning,
    });
  } catch (error) {
    console.error("AI crop diagnosis error:", error);
    let msg = error.message || "Failed to process crop health diagnosis.";
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.error?.message) {
        msg = parsed.error.message;
      }
    } catch {}
    res.status(error.statusCode || 500).json({
      error: msg,
      code: error.code,
    });
  }
});

module.exports = router;
