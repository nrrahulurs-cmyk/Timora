import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "placeholder-key";
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}
