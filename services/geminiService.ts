
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizSettings, QuizResponse, StoryResponse, VocabularyListResponse, WordDetailResponse, GlossaryEntry, StudyGuideResponse, SentenceCategory, SentenceLength, SentenceDifficulty, SentencePrompt, SentenceEvaluation } from "../types";

const ai: any = null;

// --- HELPERS ---
const generateContentWithRetry = async (ai: any, params: any, retries = 4, delayMs = 2000): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      const isTTS = params.model === "gemini-3.1-flash-tts-preview";
      const endpoint = isTTS ? '/api/gemini/generateSpeech' : '/api/gemini/generateContent';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (!res.ok) {
         const err: any = new Error(data.error || "API Error");
         err.status = data.status || res.status;
         throw err;
      }
      return data;
    } catch (error: any) {
      if (error?.status === "RESOURCE_EXHAUSTED" || error?.message?.includes("429")) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i))); 
      } else {
        throw error;
      }
    }
  }
};

// --- EXISTING CONFIGS ---


const SYSTEM_INSTRUCTION = `
You are the "French Quiz Engine". Generate a structured JSON response.

**Output Requirements:**
1. **Quantity**: Exactly **10 questions** and **5 glossary items**.
2. **Types**: Mix 'mcq', 'fill_blank', 'matching', 'sentence_translation'.
3. **Brevity**: Keep 'explanation' under 25 words. Keep glossary 'definition' under 12 words.

**Question Rules:**
- **Fill-in-the-blank**: Use '_____' (5 underscores). 'correct_answer' must be the exact missing word.
- **Translation**: 'source_sentence' is English. 'correct_answer' is French. 'accepted_answers' MUST include "Tu" and "Vous" variations if applicable.
- **Matching**: 'correct_answer' field is required by schema; set it to "See pairs" (string).

**Reliability**:
- For 'mcq', 'correct_answer' MUST be one of the 'options'.
- Ensure JSON is valid.
`;

const STORY_SYSTEM_INSTRUCTION = `
You are a French Master Storyteller. 
Write engaging, creative, and culturally rich stories suitable for language learners.

**Output Constraints:**
- **content**: A cohesive story (approx 200 words).
- **glossary**: 
  - Generate a **comprehensive** glossary of **15-20 words**. 
  - Include ALL challenging verbs, nouns, and adjectives found in the story.
  - The 'word' field must match the text form exactly where possible.
`;

const VOCAB_LIST_INSTRUCTION = `
Generate a list of 300 high-frequency words for the requested CEFR level.
**Rules:**
1. "word": French only.
2. "translation": English.
3. Mix verbs, nouns, adjectives.
`;

const WORD_DETAIL_INSTRUCTION = `
Analyze the French word.
- Verb: provide conjugations.
- Noun/Adj: provide gender/plural.
- 1 short example.
- Phonetics: IPA.
`;

const STUDY_GUIDE_INSTRUCTION = `
Create a concise study guide.
**Format**:
1. **Concept**: Simple English explanation.
2. **Rules**: Bullet points.
3. **Examples**: 5 clear examples (French/English).
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
              type: { type: Type.STRING, enum: ["mcq", "fill_blank", "matching", "sentence_translation"] },
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
                    type: Type.STRING,
                    description: "The correct answer string. For matching, use a placeholder string."
                  },
                  sentence_with_blank: { 
                    type: Type.STRING
                  },
                  source_sentence: { type: Type.STRING },
                  accepted_answers: { type: Type.ARRAY, items: { type: Type.STRING } },
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
                // Removed required constraint on correct_answer to avoid schema validation errors on complex types
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
  return true;
};

export const generateQuiz = async (settings: QuizSettings): Promise<QuizResponse> => {
  const prompt = `
    Generate a French quiz for:
    Topic: ${settings.topic}
    Level: ${settings.level}
    Difficulty: ${settings.difficulty}
  `;

  try {
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite", 
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.35, 
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
  let promptText = `CEFR Level: ${settings.level}\nSub-Difficulty: ${settings.difficulty}`;
  if (settings.topic && settings.topic !== 'Surprise Me') {
      promptText += `\nTopic: ${settings.topic}`;
  } else {
      promptText += `\nTopic: Choose a creative, engaging, and random topic suitable for this level.`;
  }

  try {
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite", 
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
  try {
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-pro-preview",
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
  try {
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
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
    try {
      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.1-flash-lite",
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

export const explainWordInContext = async (word: string, context: string): Promise<any> => {
  const prompt = `You are a French dictionary assistant. 
Explain the French word "${word}" as it is used in the following context:
"${context}"

Output must be JSON conforming to this schema:
{
  "word": "The word (normalized to its base form, e.g., infinitive for verbs)",
  "partOfSpeech": "noun, verb, adjective, etc.",
  "literalTranslation": "Literal English translation of this word",
  "contextualMeaning": "What the word means exactly in this given sentence context",
  "grammarNotes": "Any brief grammatical context (tense, gender, etc.)"
}`;

  try {
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            literalTranslation: { type: Type.STRING },
            contextualMeaning: { type: Type.STRING },
            grammarNotes: { type: Type.STRING }
          },
          required: ["word", "partOfSpeech", "literalTranslation", "contextualMeaning", "grammarNotes"]
        }
      }
    });

    const output = response.text;
    if (!output) throw new Error("Failed to generate explanation");
    return JSON.parse(output);
  } catch (error) {
    console.error("Gemini Word Explanation Error:", error);
    throw error;
  }
};

export const translateParagraphs = async (paragraphs: string[]): Promise<string[]> => {
  if (!paragraphs || paragraphs.length === 0) return [];

  const prompt = `Translate the following French text paragraphs into English.
Return ONLY a JSON array of strings, where each string is the precise translation of the corresponding paragraph.
Ensure the array has exactly ${paragraphs.length} elements.

Paragraphs to translate:
${JSON.stringify(paragraphs)}
`;

  try {
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const output = response.text;
    if (!output) throw new Error("Failed to generate translations");
    return JSON.parse(output);
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  try {
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-tts-preview",
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

export const generateSentencePrompts = async (category: SentenceCategory, length: SentenceLength, difficulty: SentenceDifficulty, weakConcepts?: string[]): Promise<SentencePrompt[]> => {
  const seed = Math.floor(Math.random() * 1000000);
  
  let conceptsPrompt = '';
  if (weakConcepts && weakConcepts.length > 0) {
    conceptsPrompt = `\nThe user has previously struggled with these French grammatical concepts/vocabulary:
${weakConcepts.map(c => `- ${c}`).join('\n')}
Sneakily design some of the English prompts so that when translating them to French, the user will be forced to use these concepts. Make it contextually natural.`;
  }

  const promptStr = `Generate 5 *entirely new and unique* English prompts for a French learner practicing for the TCF speaking exam.
Random Seed to ensure uniqueness: ${seed}
Category: ${category}
Length: ${length} sentences
Target Difficulty: ${difficulty}${conceptsPrompt}

Ensure these are diverse in topics (e.g., everyday life, work, travel, abstract concepts, depending on difficulty) and do not repeat previous common phrases.
Output a JSON array of objects with keys:
- id: a unique string
- english_prompt: The English sentence(s) the user should try to say in French.
- targeted_concept: If the prompt targets one of the user's weak concepts, indicate which one. Otherwise leave empty or null.
- category: "${category}"`;

  try {
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: promptStr,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              english_prompt: { type: Type.STRING },
              targeted_concept: { type: Type.STRING, nullable: true },
              category: { type: Type.STRING }
            },
            required: ["id", "english_prompt", "category"]
          }
        }
      }
    });

    const output = response.text;
    if (!output) throw new Error("Failed to generate sentence prompts");
    return JSON.parse(output);
  } catch (error) {
    console.error("Gemini Sentence Prompts Error:", error);
    throw error;
  }
};

export const evaluateSentenceTranslation = async (englishPrompt: string, userFrench: string, difficulty: SentenceDifficulty): Promise<SentenceEvaluation> => {
  const promptStr = `Evaluate a user's French attempt at translating the following prompt to practice for the TCF exam.
English prompt: "${englishPrompt}"
User's French translation: "${userFrench}"
Target Difficulty Level: ${difficulty}

Provide a detailed evaluation in JSON format:
- is_correct: boolean (overall, does it successfully communicate the meaning?)
- score: 0-10
- feedback: Short general feedback.
- mistakes: Array of { mistake, correction, explanation }. Be precise about accents and position if needed.
- better_variations: Array of 2-3 better, more natural, or more idiomatic ways to express it with { variation, nuance }. Include variations suitable for a TCF exam to achieve a high score.
- grammatical_concepts: Array of key grammatical concepts the user should remember based on their attempt or the ideal translations.`;

  try {
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: promptStr,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_correct: { type: Type.BOOLEAN },
            score: { type: Type.INTEGER },
            feedback: { type: Type.STRING },
            mistakes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  mistake: { type: Type.STRING },
                  correction: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["mistake", "correction", "explanation"]
              }
            },
            better_variations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  variation: { type: Type.STRING },
                  nuance: { type: Type.STRING }
                },
                required: ["variation", "nuance"]
              }
            },
            grammatical_concepts: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["is_correct", "score", "feedback", "mistakes", "better_variations", "grammatical_concepts"]
        }
      }
    });

    const output = response.text;
    if (!output) throw new Error("Failed to evaluate translation");
    return JSON.parse(output);
  } catch (error) {
    console.error("Gemini Evaluation Error:", error);
    throw error;
  }
};
