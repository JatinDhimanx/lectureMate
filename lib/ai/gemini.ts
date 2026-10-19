import { createGoogleGenerativeAI } from "@ai-sdk/google";

const apiKey = process.env.GEMINI_API_KEY || "";

export const google = createGoogleGenerativeAI({
  apiKey: apiKey,
});

/**
 * Returns the primary Gemini Flash model instance.
 */
export function getFlashModel() {
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";
  return google(modelName);
}

/**
 * Returns true only if a real Google AI API key is configured.
 * Rejects obviously non-Google keys (NVIDIA nvapi-, mock keys, etc.)
 */
export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY || "";
  if (!key || key.length < 10) return false;
  // Reject NVIDIA, mock, and other known non-Google key formats
  if (key.startsWith("nvapi-")) return false;
  if (key.startsWith("mock-") || key === "your-api-key" || key.includes("placeholder")) return false;
  // Google AI keys typically start with "AIza" but allow any valid-looking long key
  return key.length > 20;
}
