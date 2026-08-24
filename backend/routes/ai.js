const express = require("express");
const { getGeminiClient } = require("../lib/gemini");
const { getSupabase } = require("../supabase");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

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

async function uploadCropImage(base64Data, mimeType, fieldName) {
  try {
    const supabase = getSupabase();
    const buffer = Buffer.from(base64Data, "base64");
    const ext = (mimeType || "image/png").split("/")[1] || "png";
    const cleanField = (fieldName || "field").toLowerCase().replace(/[^a-z0-9]/g, "-");
    const filePath = `${cleanField}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("crop-inspections")
      .upload(filePath, buffer, {
        contentType: mimeType || "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.warn("Supabase storage upload error:", uploadError.message);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from("crop-inspections")
      .getPublicUrl(filePath);

    return {
      imageUrl: publicData?.publicUrl || null,
      storagePath: filePath,
    };
  } catch (err) {
    console.warn("Storage upload exception:", err.message);
    return null;
  }
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
      return res.json({ success: true, data: [] });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.warn("Failed to fetch crop inspections from database:", err.message);
    return res.json({ success: true, data: [] });
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
      const uploadRes = await uploadCropImage(base64Data, mimeType, field);
      if (uploadRes) {
        imageUrl = uploadRes.imageUrl;
        imageStoragePath = uploadRes.storagePath;
      }
    } else if (image && typeof image === "string" && image.startsWith("http")) {
      imageUrl = image;
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
      return res.json({ success: true, data: record });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.warn("Save inspection exception:", err.message);
    return res.status(500).json({ error: err.message || "Failed to save inspection." });
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

    const promptText = `
You are a senior tropical crop pathologist and pineapple agronomy specialist for AgriVerse.
Analyze the attached crop photo taken from ${field || "the farm"} (Crop: ${cropType || "Pineapple / Ananas comosus"}).

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
  "diseaseOrIssueName": "<Exact taxonomic name, e.g. 'Pineapple Mealybug Wilt (PMWD)', 'Phytophthora Heart Rot', 'Potassium Deficiency (Marginal Scorch)', 'Healthy Pineapple Stand'>",
  "healthStatus": "<'Healthy' | 'Pest Infested' | 'Fungal Disease' | 'Nutrient Deficient' | 'Environmental Stress' | 'Critical'>",
  "issues": [
    "<Observed symptom 1 with exact visual description and location>",
    "<Observed symptom 2 with exact visual description and location>"
  ],
  "recommendations": [
    "<Action 1: Immediate targeted treatment (e.g. horticultural oil for mealybugs, copper fungicide for rot)>",
    "<Action 2: Targeted fertilizer or agronomic soil practice (e.g. potassium sulfate, nitrogen compost)>",
    "<Action 3: Preventative scouting and field hygiene guideline>"
  ],
  "visualSummary": "<Concise 1-2 sentence agronomic summary of the plant's visible pathology and vigor>"
}
`;

    const candidateModels = [
      process.env.GEMINI_MODEL,
      "gemini-3.6-flash",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ].filter(Boolean);

    let response = null;
    let lastError = null;

    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                mimeType: finalMimeType,
                data: base64Data,
              },
            },
            promptText,
          ],
          config: {
            responseMimeType: "application/json",
          },
        });
        if (response && response.text) {
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${model} failed, trying next candidate...`, err.message);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("Failed to get diagnosis from Gemini AI.");
    }

    const diagnosis = parseJsonFromText(response.text);

    const sanitizedDiagnosis = {
      score: typeof diagnosis.score === "number" ? Math.max(0, Math.min(100, Math.round(diagnosis.score))) : 80,
      pineappleHealth: diagnosis.pineappleHealth || (diagnosis.score >= 80 ? "Healthy" : diagnosis.score >= 60 ? "Moderate" : "At Risk"),
      cropCondition: diagnosis.cropCondition || (diagnosis.score >= 80 ? "Good" : diagnosis.score >= 60 ? "Fair" : "Poor"),
      diseaseStatus: diagnosis.diseaseStatus || "None",
      pestStatus: diagnosis.pestStatus || "None",
      nutrientStatus: diagnosis.nutrientStatus || "Normal",
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
      const uploadRes = await uploadCropImage(base64Data, finalMimeType, field);
      
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
    res.status(500).json({
      error: error.message || "Failed to process crop health diagnosis.",
    });
  }
});

module.exports = router;
