import { GoogleGenAI } from "@google/genai";
import { VocabularyItem, Difficulty } from "../types";

// Safely access API_KEY. In raw browser environments, 'process' might be undefined.
// We wrap this to prevent the "blank page" crash (ReferenceError).
let apiKey = '';
try {
  // @ts-ignore
  if (typeof process !== 'undefined' && process && process.env && process.env.API_KEY) {
    // @ts-ignore
    apiKey = process.env.API_KEY;
  }
} catch (e) {
  console.warn("Could not access process.env.API_KEY. AI features will be disabled.");
}

let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const analyzeWord = async (word: string, context: string): Promise<Partial<VocabularyItem>> => {
  if (!ai) return { 
    definition: "AI Service Unavailable (Check API Key)", 
    translation: "无法连接AI" 
  };

  try {
    const prompt = `Analyze the word "${word}" in the context of: "${context}". 
    Return a JSON object with "definition" (English definition) and "translation" (Chinese translation). 
    Keep it concise.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return { definition: "Error analyzing word", translation: "分析出错" };
  }
};

export interface PronunciationResult {
  overall: number;
  fluency: number;
  pronunciation: number;
  intonation: number;
  feedback: string;
}

export const gradePronunciation = async (originalText: string): Promise<PronunciationResult> => {
  // Mock response if AI is unavailable or for instant feedback in demo
  if (!ai) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const score = Math.floor(Math.random() * (98 - 80) + 80);
          resolve({
            overall: score,
            fluency: score - Math.floor(Math.random() * 5),
            pronunciation: score + Math.floor(Math.random() * 3),
            intonation: score - Math.floor(Math.random() * 3),
            feedback: "整体语调自然，但在连读方面还有提升空间。注意元音的发音饱满度。"
          });
        }, 1500);
      });
  }

  return new Promise((resolve) => {
    setTimeout(() => {
       const baseScore = Math.floor(Math.random() * 15) + 80;
       resolve({
        overall: baseScore,
        fluency: Math.min(100, baseScore + Math.floor(Math.random() * 5)),
        pronunciation: Math.min(100, baseScore - Math.floor(Math.random() * 5)),
        intonation: Math.min(100, baseScore + Math.floor(Math.random() * 3)),
        feedback: "Great effort! Focus on the rhythm of the sentence. Some vowel sounds could be clearer."
      });
    }, 1500);
  });
};

export const translateText = async (text: string): Promise<string> => {
  if (!ai) {
      return new Promise(resolve => {
          setTimeout(() => resolve("这是模拟的中文翻译结果。AI服务未配置。"), 500);
      });
  }
  try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Translate the following English sentence into natural, fluent Simplified Chinese. Only return the translation.\n\nSentence: "${text}"`,
      });
      return response.text?.trim() || "翻译失败";
  } catch (error) {
      console.error("Translation error", error);
      return "翻译服务不可用";
  }
};

export const classifyTopic = async (input: string): Promise<string> => {
  if (!ai) return "General";
  try {
    const prompt = `Classify the following text or title into a single, short English topic category (e.g., Technology, Business, Culture, Science, Daily Life, Travel). 
    Return ONLY the category name.
    
    Input: "${input.substring(0, 500)}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim().replace(/\./g, '') || "General";
  } catch (error) {
    console.error("Topic classification error", error);
    return "General";
  }
};

export const estimateDifficulty = async (input: string): Promise<Difficulty> => {
  if (!ai) return "intermediate";
  try {
    const prompt = `Analyze the complexity of the following English text/title and classify its difficulty level for an English learner.
    Return ONLY one of these three words: "beginner", "intermediate", or "advanced".
    
    Input: "${input.substring(0, 500)}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text?.trim().toLowerCase() || "";
    if (text.includes("beginner")) return "beginner";
    if (text.includes("advanced")) return "advanced";
    return "intermediate";
  } catch (error) {
    return "intermediate";
  }
};

export const generateTranscriptFromText = async (text: string): Promise<string> => {
    return text;
}