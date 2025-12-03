import { GoogleGenAI } from "@google/genai";
import { Inquiry, CustomerType } from '../types';

// Ensure we handle the case where the key might be missing in the environment for the demo
const getClient = (): GoogleGenAI | null => {
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key is missing. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeSentiment = async (feedback: string): Promise<string> => {
  const client = getClient();
  if (!client) return "AI Unavailable";

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the sentiment of this sales feedback in one word (Positive, Negative, or Neutral): "${feedback}"`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("AI Error:", error);
    return "Error";
  }
};

export const generateSalesInsight = async (inquiries: Inquiry[]): Promise<string> => {
  const client = getClient();
  if (!client) return "AI insights unavailable due to missing API Key.";

  const dataSummary = inquiries.slice(0, 20).map(i => 
    `- Type: ${i.customerType}, Feedback: ${i.feedback}`
  ).join('\n');

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are a sales manager assistant. Here is a list of recent customer inquiries:
        ${dataSummary}
        
        Provide a concise 2-sentence strategic advice for the sales team based on this data.
      `,
    });
    return response.text;
  } catch (error) {
    console.error("AI Error:", error);
    return "Could not generate insights.";
  }
};
