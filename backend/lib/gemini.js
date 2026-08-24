const { GoogleGenAI } = require("@google/genai");

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_actual_gemini_api_key_here") {
    const error = new Error("GEMINI_API_KEY is not configured in backend/.env");
    error.code = "GEMINI_KEY_MISSING";
    error.status = 500;
    throw error;
  }

  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

module.exports = { getGeminiClient };
