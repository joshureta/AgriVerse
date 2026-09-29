const express = require("express");
const { getGeminiClient } = require("../lib/gemini");
const { getSupabase } = require("../supabase");
const { requireAuth } = require("../middleware/auth");
const { uploadImage } = require("../lib/storage");

const router = express.Router();

const MINIMUM_PINEAPPLE_CONFIDENCE = 0.75;
const IMAGE_CONTEXTS = new Set(["field", "leaf-close-up", "fruit-close-up", "whole-plant", "mixed"]);
const VISION_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.7-flash",
].filter(Boolean);

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

function parseJsonFromText(rawText) {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Unable to parse AI response into JSON format.");
  }
}

async function generateVisionJson(ai, mimeType, base64Data, promptText) {
  let response = null;
  let lastError = null;

  for (const model of VISION_MODELS) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: [
          { inlineData: { mimeType, data: base64Data } },
          promptText,
        ],
        config: { responseMimeType: "application/json" },
      });
      if (response?.text) return parseJsonFromText(response.text);
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} failed, trying next candidate...`, err.message);
    }
  }

  throw lastError || new Error("Failed to scan the uploaded image.");
}

async function validatePineappleImage(ai, mimeType, base64Data) {
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
}`);

  const confidence = Number(validation.confidence);
  if (validation.isPineappleRelated !== true || !Number.isFinite(confidence) || confidence < MINIMUM_PINEAPPLE_CONFIDENCE) {
    throw new PineappleImageValidationError(validation.reason || "Please upload a clear pineapple crop image.");
  }

  return IMAGE_CONTEXTS.has(validation.imageContext) ? validation.imageContext : "mixed";
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
      health_score: typeof healthScore === "number" ? healthScore : 80,
      health_status: healthStatus || "Healthy",
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

// POST AI Diagnosis
router.post("/crop-diagnosis", requireAuth, async (req, res) => {
  try {
    const { image, mimeType, field, cropType } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image data is required for crop diagnosis." });
    }

    const { data: base64Data, mimeType: finalMimeType } = cleanBase64(image, mimeType);

    const ai = getGeminiClient();

    // This scan happens before diagnosis, storage, and database insertion.
    const imageContext = await validatePineappleImage(ai, finalMimeType, base64Data);

    const promptText = `
You are a senior tropical crop pathologist and pineapple agronomy specialist for AgriVerse.
Analyze the attached crop photo taken from ${field || "the farm"} (Crop: ${cropType || "Pineapple / Ananas comosus"}).
The image was classified as: ${imageContext}.

IMAGE-SPECIFIC RULES:
- field: assess only visible stand patterns such as uneven vigor, canopy color, affected areas, water stress, drainage clues, weed pressure, or pest/disease spread. Give field-scale scouting and management recommendations.
- leaf-close-up: assess only visible leaf color, lesions, margins, spotting, necrosis, pests, scale, mealybugs, or mite damage. Give close-up symptom confirmation and targeted scouting/treatment recommendations.
- fruit-close-up: assess only visible fruit color, rot, lesions, cracks, deformity, sunburn, crown condition, or pest damage. Give fruit handling, sanitation, harvest, and targeted treatment recommendations.
- whole-plant: assess only visible plant vigor, leaf arrangement, crown/heart condition, wilt, and canopy color. Give plant-level management recommendations.
- mixed: use evidence from each visible subject, but state which evidence belongs to the field, leaf, fruit, or plant.

EVIDENCE RULES:
- Report only symptoms that are visible in this photo. Do not invent root, soil, fruit, leaf, pest, or field symptoms that the image cannot show.
- If a disease cannot be identified confidently from this view, say that visual confirmation is insufficient and recommend the exact follow-up photo or field check needed.
- Do not recommend a pesticide or fertilizer merely because it appears in the taxonomy. Recommendations must match the visible symptoms and image context.
- Do not provide chemical rates. Advise users to follow the locally approved product label and consult an agricultural technician when treatment is needed.

Perform a comprehensive visual pathology and entomological diagnosis using the following pineapple disease & pest taxonomy:

1. PINEAPPLE PATHOLOGY TAXONOMY:
   - Pineapple Mealybug Wilt Disease (PMWD) / Pink Mealybugs (Dysmicoccus brevipes): Red/bronze leaf discoloration, reflexed/curling downward leaf tips, flaccid foliage, white cottony mealybug colonies at lower leaf bases.
   - Phytophthora Heart Rot / Root Rot (Phytophthora nicotianae / cinnamomi): Pale yellow-green central heart leaves, water-soaked brown rotting at basal leaf attachments, easily detachable central whorl.
   - Black Rot / Butt Rot (Thielaviopsis paradoxa / Ceratocystis paradoxa): Soft, watery dark-brown to black decay on peduncle, base, or fruit tissue.
   - Fusariosis / Fruit Collapse (Fusarium guttiforme / Erwinia chrysanthemi): Curvature or deformation of fruit/crown, resinous exudate (gumming), localized soft tissue breakdown.
   - Pineapple Scale Insects (Diaspis boisduvalii) & Mites (Dolichotetranychus floridanus): Clustered yellowish spotting, waxy scale crusts along leaf lamina.

2. NUTRIENT DEFICIENCIES (N-P-K):
   - Nitrogen (N) Deficiency: Generalized pale yellow chlorosis starting on older/middle leaves, stunted vegetative vigor.
   - Phosphorus (P) Deficiency: Characteristic dark reddish-purple discoloration along margins and leaf underside.
   - Potassium (K) Deficiency: Marginal leaf scorch, yellow spotting on tips turning into dry brown necrotic margins.
   - Normal / Balanced Nutrition: Deep green, uniform color throughout canopy.

3. VEGETATIVE & FRUIT VIGOR:
   - Evaluate leaf color (Green, Slight Yellow, Pale Yellow, Yellow, Red/Purple, Necrotic).
   - Evaluate leaf shape (Upright, Turgid, Curled, Wilted).
   - Evaluate fruit appearance (Uniform, Deformed, Rotting, Normal).

Respond in STRICT JSON format (without markdown code blocks) matching this schema:
{
  "score": <integer 0-100 indicating health percentage, 90-100 for healthy, 60-80 for moderate, <50 for severe>,
  "pineappleHealth": "<'Healthy' | 'Moderate' | 'At Risk' | 'Critical'>",
  "cropCondition": "<'Good' | 'Fair' | 'Poor' | 'Critical'>",
  "diseaseStatus": "<'None' | 'Minor' | 'Detected'>",
  "pestStatus": "<'None' | 'Minor' | 'Detected'>",
  "nutrientStatus": "<'Normal' | 'Nitrogen Deficiency' | 'Phosphorus Deficiency' | 'Potassium Deficiency' | 'Multiple Deficiencies'>",
  "imageContext": "${imageContext}",
  "diseaseOrIssueName": "<Exact taxonomic name, e.g. 'Pineapple Mealybug Wilt (PMWD)', 'Phytophthora Heart Rot', 'Potassium Deficiency (Marginal Scorch)', 'Healthy Pineapple Stand'>",
  "healthStatus": "<'Healthy' | 'Pest Infested' | 'Fungal Disease' | 'Nutrient Deficient' | 'Environmental Stress' | 'Critical'>",
  "issues": [
    "<Only a visible symptom, including exact location in the photo>",
    "<Another visible symptom, or an evidence limitation if no second symptom is visible>"
  ],
  "recommendations": [
    "<Context-specific immediate next step based on visible evidence>",
    "<Context-specific inspection, sanitation, irrigation, nutrition, or treatment step>",
    "<Appropriate follow-up monitoring or photo/check recommendation>"
  ],
  "visualSummary": "<Concise 1-2 sentence agronomic summary of the plant's visible pathology and vigor>"
}
`;

    const diagnosis = await generateVisionJson(ai, finalMimeType, base64Data, promptText);

    const sanitizedDiagnosis = {
      score: typeof diagnosis.score === "number" ? Math.max(0, Math.min(100, Math.round(diagnosis.score))) : 80,
      pineappleHealth: diagnosis.pineappleHealth || (diagnosis.score >= 80 ? "Healthy" : diagnosis.score >= 60 ? "Moderate" : "At Risk"),
      cropCondition: diagnosis.cropCondition || (diagnosis.score >= 80 ? "Good" : diagnosis.score >= 60 ? "Fair" : "Poor"),
      diseaseStatus: diagnosis.diseaseStatus || "None",
      pestStatus: diagnosis.pestStatus || "None",
      nutrientStatus: diagnosis.nutrientStatus || "Normal",
      imageContext: IMAGE_CONTEXTS.has(diagnosis.imageContext) ? diagnosis.imageContext : imageContext,
      diseaseOrIssueName: diagnosis.diseaseOrIssueName || "General Crop Inspection",
      healthStatus: diagnosis.healthStatus || (diagnosis.score >= 80 ? "Healthy" : "Attention Needed"),
      issues: Array.isArray(diagnosis.issues) && diagnosis.issues.length ? diagnosis.issues : ["No critical visual symptoms detected."],
      recommendations: Array.isArray(diagnosis.recommendations) && diagnosis.recommendations.length
        ? diagnosis.recommendations
        : ["Maintain regular scouting and standard field irrigation."],
      visualSummary: diagnosis.visualSummary || "Crop foliage shows normal vegetative characteristics.",
    };

    // Auto-save to Supabase
    let savedRecord = null;
    try {
      const supabase = getSupabase();
      const uploadRes = await uploadImage("crop-inspections", base64Data, finalMimeType, field);
      
      const record = {
        field_name: field || "Field A",
        crop_type: cropType || "Pineapple",
        health_score: sanitizedDiagnosis.score,
        health_status: sanitizedDiagnosis.healthStatus,
        disease_or_issue_name: sanitizedDiagnosis.diseaseOrIssueName,
        visual_summary: sanitizedDiagnosis.visualSummary,
        identified_symptoms: sanitizedDiagnosis.issues,
        action_recommendations: sanitizedDiagnosis.recommendations,
        image_url: uploadRes?.imageUrl || null,
        image_storage_path: uploadRes?.storagePath || null,
        image_name: `${field || "Field"} diagnosis photo`,
        image_mime_type: finalMimeType,
        status: "COMPLETED",
        analyzed_by: req.user?.id || null,
      };

      const { data: dbData } = await supabase
        .from("crop_health_inspections")
        .insert(record)
        .select()
        .single();

      if (dbData) savedRecord = dbData;
    } catch (saveErr) {
      console.warn("Auto-save to Supabase warning:", saveErr.message);
    }

    res.json({
      success: true,
      field: field || "Field A",
      cropType: cropType || "Pineapple",
      diagnosis: sanitizedDiagnosis,
      savedRecord,
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
