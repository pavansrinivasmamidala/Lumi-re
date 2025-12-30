import { GoogleGenAI, Type, Schema } from "@google/genai";
import { QuizSettings, QuizResponse } from "../types";

const SYSTEM_INSTRUCTION = `
You are the "French Quiz Engine," a specialized API endpoint that generates structured JSON quizzes for French language learners. You possess expert knowledge of French grammar, vocabulary, and CEFR proficiency standards.

**Difficulty Matrix Logic:**
You must adjust the complexity based on the combination of CEFR Level and Sub-Difficulty:
- **Easy:** Focus on the core rule/vocabulary. Simple sentence structures (SVO). High-frequency words.
- **Medium:** Introduce standard sentence structures, slight nuances, and common variations.
- **Hard:** Test exceptions to the rule, use complex sentence structures, varying tenses, or "faux amis" (false friends).

**Content Requirements:**
1. Generate **5 questions** per request.
2. Mix the question types (MCQ, Fill in blank, Matching) to ensure variety.
3. Ensure all French accents (é, à, ù, ç) are correct.

**Glossary Requirement:**
You MUST include a "glossary" array in the response. 
- Identify key French words used in the questions and answers.
- For each unique word, provide:
  - English definition (context-aware).
  - Phonetics (IPA format).
  - A short example sentence in French using the word.
- Ensure the glossary covers nouns, verbs, and adjectives used in the quiz content.
`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    quiz: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        topic: { type: Type.STRING },
        cefr_level: { type: Type.STRING },
        sub_difficulty: { type: Type.STRING },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              type: { type: Type.STRING, enum: ["mcq", "fill_blank", "matching"] },
              question_text: { type: Type.STRING },
              explanation: { type: Type.STRING },
              content: {
                type: Type.OBJECT,
                properties: {
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correct_answer: { type: Type.STRING },
                  sentence_with_blank: { type: Type.STRING },
                  pairs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        left: { type: Type.STRING },
                        right: { type: Type.STRING },
                      },
                      required: ["left", "right"],
                    },
                  },
                },
              },
            },
            required: ["id", "type", "question_text", "content", "explanation"],
          },
        },
        glossary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "The word in lowercase" },
              definition: { type: Type.STRING, description: "English meaning" },
              phonetics: { type: Type.STRING, description: "IPA pronunciation" },
              example: { type: Type.STRING, description: "Short French example sentence" }
            },
            required: ["word", "definition", "phonetics", "example"]
          }
        }
      },
      required: ["title", "topic", "cefr_level", "sub_difficulty", "questions", "glossary"],
    },
  },
  required: ["quiz"],
};

export const generateQuiz = async (settings: QuizSettings): Promise<QuizResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Topic: ${settings.topic}
    CEFR Level: ${settings.level}
    Sub-Difficulty: ${settings.difficulty}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7, 
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as QuizResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
