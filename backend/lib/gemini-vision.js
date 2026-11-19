const DEFAULT_VISION_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.7-flash",
];

function visionModels(preferred = process.env.GEMINI_MODEL) {
  return [...new Set([preferred, ...DEFAULT_VISION_MODELS].filter(Boolean))];
}

function parseJsonFromText(rawText) {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Unable to parse AI response into JSON format.");
  }
}

function apiStatus(error) {
  for (const value of [error?.status, error?.statusCode, error?.code]) {
    const status = Number(value);
    if (Number.isInteger(status) && status >= 400 && status <= 599) return status;
  }
  try {
    const parsed = JSON.parse(error?.message || "");
    const status = Number(parsed?.error?.code);
    if (Number.isInteger(status) && status >= 400 && status <= 599) return status;
  } catch {}
  const match = String(error?.message || "").match(/\b(408|429|5\d\d)\b/);
  return match ? Number(match[1]) : null;
}

function isTransient(status) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

async function generateVisionJson(ai, mimeType, base64Data, promptText, {
  models = visionModels(),
  stage = "image analysis",
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  random = Math.random,
  onModelSuccess = () => {},
} = {}) {
  let lastError = null;
  let lastStatus = null;

  for (const [index, model] of models.entries()) {
    // Retry the preferred model twice, then make one attempt with each fallback.
    const attempts = index === 0 ? 3 : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            { inlineData: { mimeType, data: base64Data } },
            promptText,
          ],
          config: { responseMimeType: "application/json" },
        });
        if (!response?.text) throw new Error("Gemini returned an empty image analysis.");
        const parsed = parseJsonFromText(response.text);
        onModelSuccess(model);
        return parsed;
      } catch (error) {
        lastError = error;
        lastStatus = apiStatus(error);
        if (isTransient(lastStatus) && attempt < attempts - 1) {
          const delay = 1000 * 2 ** attempt + Math.floor(random() * 250);
          console.warn(`Gemini ${stage}: ${model} returned ${lastStatus}; retrying shortly.`);
          await sleep(delay);
          continue;
        }
        if (isTransient(lastStatus) || lastStatus === 404) {
          console.warn(`Gemini ${stage}: ${model} returned ${lastStatus}; trying another model if available.`);
          break;
        }
        throw error;
      }
    }
  }

  if (isTransient(lastStatus)) {
    const error = new Error("Gemini is temporarily busy. Please try analyzing the image again in a few minutes.");
    error.statusCode = 503;
    error.code = "GEMINI_TEMPORARILY_UNAVAILABLE";
    throw error;
  }
  throw lastError || new Error("Failed to analyze the uploaded image.");
}

module.exports = { apiStatus, generateVisionJson, visionModels };
