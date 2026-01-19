
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizSettings, QuizResponse, StoryResponse, VocabularyListResponse, WordDetailResponse, GlossaryEntry, StudyGuideResponse } from "../types";

const SYSTEM_INSTRUCTION = `
You are the "French Quiz Engine," a specialized API endpoint that generates structured JSON quizzes.

**Content Requirements:**
1. Generate **10 questions** per request.
2. Mix question types (MCQ, Fill in blank, Matching).
3. **Fill-in-the-blank Rule:** 
   - Use exactly five underscores '_____' for blanks. 
   - 'correct_answer' MUST be the exact missing word.

**Glossary Constraint (CRITICAL):**
- You MUST include a "glossary" array.
- **STRICT LIMIT:** Generate EXACTLY 8 glossary entries. Do not generate more.
- Select only the 8 most difficult/relevant words from the quiz.
- Keep definitions and examples short and concise.
`;

const STORY_SYSTEM_INSTRUCTION = `
You are a French Master Storyteller. 
Write engaging, creative, and culturally rich stories suitable for language learners.

**Output Constraints:**
- **content**: A cohesive story (approx 200-250 words). Focus on narrative flow and vocabulary richness appropriate for the level.
- **glossary**: 
  - Generate a **comprehensive** glossary of **25-30 words**. 
  - Include ALL potentially challenging verbs, nouns, and adjectives found in the story.
  - The goal is to minimize the need for the user to look up words externally.
  - The 'word' field must match the text form exactly where possible.
`;

const VOCAB_LIST_INSTRUCTION = `
Generate a comprehensive list of 300 high-frequency words for the requested CEFR level.
**STRICT RULES:**
1. The "word" field MUST be the French word.
2. The "translation" field MUST be the English translation.
3. Mix verbs, nouns, and adjectives appropriately for the level.
4. Ensure no English words appear in the "word" column.
`;

const WORD_DETAIL_INSTRUCTION = `
Analyze the French word provided.
- If Verb: provide conjugations (Present, Passe Compose, Imparfait, Future).
- If Noun/Adj: provide gender/plural forms.
- Provide **1 short example** sentence.
- **Phonetics**: Provide IPA pronunciation.
`;

const STUDY_GUIDE_INSTRUCTION = `
You are a French Language Teacher. Create a concise but comprehensive study guide for the specific topic.
**Format**:
1. **Concept Explanation**: Clear, simple English explanation of the grammar rule or concept.
2. **Key Rules**: Bullet points of how to form/use it (syntax, agreements).
3. **Exceptions**: Any irregulars or warnings (if none, leave empty).
4. **Examples**: 5 clear examples with French and English translations.
`;

// Define schemas as plain objects to follow recommended JSON response configuration
const RESPONSE_SCHEMA = {
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
                  options: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING }
                  },
                  correct_answer: { 
                    type: Type.STRING
                  },
                  sentence_with_blank: { 
                    type: Type.STRING
                  },
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
              word: { type: Type.STRING },
              definition: { type: Type.STRING },
              phonetics: { type: Type.STRING },
              example: { type: Type.STRING }
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

const STORY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    story: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        topic: { type: Type.STRING },
        cefr_level: { type: Type.STRING },
        sub_difficulty: { type: Type.STRING },
        content: { type: Type.STRING },
        glossary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              definition: { type: Type.STRING },
              phonetics: { type: Type.STRING },
              example: { type: Type.STRING }
            },
            required: ["word", "definition", "phonetics", "example"]
          }
        }
      },
      required: ["title", "topic", "cefr_level", "sub_difficulty", "content", "glossary"]
    }
  },
  required: ["story"]
};

const VOCAB_LIST_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    level: { type: Type.STRING },
    words: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['verb', 'noun', 'adjective', 'other'] },
          translation: { type: Type.STRING }
        },
        required: ['word', 'type', 'translation']
      }
    }
  },
  required: ['level', 'words']
};

const WORD_DETAIL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    word_data: {
      type: Type.OBJECT,
      properties: {
        word: { type: Type.STRING },
        type: { type: Type.STRING, enum: ['verb', 'noun', 'adjective', 'other'] },
        translation: { type: Type.STRING },
        definition: { type: Type.STRING },
        phonetics: { type: Type.STRING },
        
        // Verb Specifics
        verb_group: { type: Type.STRING },
        auxiliary_verb: { type: Type.STRING },
        tenses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              conjugations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pronoun: { type: Type.STRING },
                    form: { type: Type.STRING }
                  },
                  required: ['pronoun', 'form']
                }
              }
            },
            required: ['name', 'conjugations']
          }
        },

        // Noun/Adj
        gender: { type: Type.STRING, enum: ['masculine', 'feminine', 'invariable'] },
        forms: {
          type: Type.OBJECT,
          properties: {
            masculine_singular: { type: Type.STRING },
            feminine_singular: { type: Type.STRING },
            masculine_plural: { type: Type.STRING },
            feminine_plural: { type: Type.STRING },
          }
        },

        related_pronouns: { type: Type.ARRAY, items: { type: Type.STRING } },
        examples: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              french: { type: Type.STRING },
              english: { type: Type.STRING }
            },
            required: ['french', 'english']
          }
        },
        exceptions_or_notes: { type: Type.STRING }
      },
      required: ['word', 'type', 'translation', 'definition', 'examples']
    }
  },
  required: ['word_data']
};

const STUDY_GUIDE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        guide: {
            type: Type.OBJECT,
            properties: {
                concept_explanation: { type: Type.STRING },
                key_rules: { type: Type.ARRAY, items: { type: Type.STRING } },
                exceptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                examples: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            french: { type: Type.STRING },
                            english: { type: Type.STRING }
                        },
                        required: ["french", "english"]
                    }
                }
            },
            required: ["concept_explanation", "key_rules", "examples"]
        }
    },
    required: ["guide"]
};

export const checkApiKeyConfigured = (): boolean => {
  return !!process.env.API_KEY;
};

export const generateQuiz = async (settings: QuizSettings): Promise<QuizResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please add API_KEY to your .env file.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Topic: ${settings.topic}
    CEFR Level: ${settings.level}
    Sub-Difficulty: ${settings.difficulty}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.4, 
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

export const generateStory = async (settings: QuizSettings): Promise<StoryResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please add API_KEY to your .env file.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let promptText = `CEFR Level: ${settings.level}\nSub-Difficulty: ${settings.difficulty}`;
  if (settings.topic && settings.topic !== 'Surprise Me') {
      promptText += `\nTopic: ${settings.topic}`;
  } else {
      promptText += `\nTopic: Choose a creative, engaging, and random topic suitable for this level.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: promptText,
      config: {
        systemInstruction: STORY_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: STORY_SCHEMA,
        temperature: 0.8, 
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as StoryResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateVocabularyList = async (level: string): Promise<VocabularyListResponse> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Generate a list of 300 common vocabulary words for CEFR Level: ${level}. Ensure all "word" values are in French only.`,
      config: {
        systemInstruction: VOCAB_LIST_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: VOCAB_LIST_SCHEMA,
        temperature: 0.4,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as VocabularyListResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateWordDetails = async (word: string): Promise<WordDetailResponse> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this word: ${word}`,
      config: {
        systemInstruction: WORD_DETAIL_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: WORD_DETAIL_SCHEMA,
        temperature: 0.3,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as WordDetailResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateStudyGuide = async (topic: string, level: string): Promise<StudyGuideResponse> => {
    if (!process.env.API_KEY) throw new Error("API Key is missing.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Create a study guide for: ${topic} (Level: ${level})`,
        config: {
          systemInstruction: STUDY_GUIDE_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: STUDY_GUIDE_SCHEMA,
          temperature: 0.4,
        },
      });
  
      const text = response.text;
      if (!text) throw new Error("No response from Gemini");
  
      return JSON.parse(text) as StudyGuideResponse;
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  };

// --- AUDIO GENERATION ---

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const pcmToAudioBuffer = (base64: string, ctx: AudioContext, sampleRate: number = 24000): AudioBuffer => {
  const bytes = base64ToUint8Array(base64);
  const dataInt16 = new Int16Array(bytes.buffer);
  const numChannels = 1;
  const frameCount = dataInt16.length / numChannels;
  
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0); 
  
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  
  return buffer;
}

export const generateSpeech = async (text: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio data returned");
    }

    return base64Audio;

  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};
