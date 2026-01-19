
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type QuestionType = 'mcq' | 'fill_blank' | 'matching';

export interface MatchingPair {
  left: string;
  right: string;
}

export interface QuestionContent {
  // MCQ
  options?: string[];
  
  // Fill Blank
  sentence_with_blank?: string;
  
  // Matching
  pairs?: MatchingPair[];
  
  // Common
  correct_answer?: string; 
}

export interface Question {
  id: number;
  type: QuestionType;
  question_text: string;
  content: QuestionContent;
  explanation: string;
}

export interface GlossaryEntry {
  word: string;
  definition: string;
  phonetics: string;
  example: string;
}

export interface QuizData {
  title: string;
  topic: string;
  cefr_level: string;
  sub_difficulty: string;
  questions: Question[];
  glossary: GlossaryEntry[];
}

export interface StoryData {
  title: string;
  topic: string;
  cefr_level: string;
  sub_difficulty: string;
  content: string;
  glossary: GlossaryEntry[];
}

export interface SavedQuiz {
  id: string;
  created_at: number;
  data: QuizData;
}

export interface SavedStory {
  id: string;
  created_at: number;
  data: StoryData;
}

export interface QuizResponse {
  quiz: QuizData;
}

export interface StoryResponse {
  story: StoryData;
}

export interface QuizSettings {
  topic: string;
  level: CefrLevel;
  difficulty: Difficulty;
}

// User Answer Types
export type UserAnswerValue = string | Record<string, string>; // Record is for matching {left: right}

export interface QuizState {
  currentQuestionIndex: number;
  answers: Record<number, UserAnswerValue>;
  isSubmitted: boolean;
  score: number;
}

// --- VOCABULARY TYPES ---

export interface WordItem {
  word: string;
  type: 'verb' | 'noun' | 'adjective' | 'other';
  translation: string;
}

export interface VocabularyListResponse {
  level: string;
  words: WordItem[];
}

export interface Conjugation {
  pronoun: string; // je, tu, il/elle...
  form: string;    // suis, es, est...
}

export interface TenseData {
  name: string; // Present, Future...
  conjugations: Conjugation[];
}

export interface WordDetail {
  word: string;
  type: 'verb' | 'noun' | 'adjective' | 'other';
  translation: string;
  definition: string;
  phonetics?: string; // Added field
  
  // Verb Specifics
  verb_group?: string; // 1st, 2nd, 3rd, Irregular
  auxiliary_verb?: string; // avoir, être
  tenses?: TenseData[];

  // Noun/Adj Specifics
  gender?: 'masculine' | 'feminine' | 'invariable';
  forms?: {
    masculine_singular?: string;
    feminine_singular?: string;
    masculine_plural?: string;
    feminine_plural?: string;
  };

  // General
  related_pronouns?: string[]; // For verbs: pronouns used. For others: typically N/A
  examples: { french: string; english: string }[];
  exceptions_or_notes?: string;
}

export interface WordDetailResponse {
  word_data: WordDetail;
}

// Database representation of a vocabulary word
export interface VocabularyEntry extends WordItem {
  id?: string;
  level: CefrLevel;
  details?: WordDetail | null; // Cached detailed analysis
}

// --- PATH TYPES ---

export interface PathCheckpoint {
  title: string;
  description: string;
  examples: string[];
}

export interface UserProgress {
  level_id: string;
  checkpoint_title: string;
  completed: boolean;
  score: number;
}

export interface StudyGuideContent {
  concept_explanation: string;
  key_rules: string[];
  exceptions: string[];
  examples: { french: string; english: string }[];
}

export interface StudyGuideResponse {
  guide: StudyGuideContent;
}

export interface StudyGuideDB {
  id?: string;
  level_id: string;
  topic_id: string;
  content: StudyGuideContent;
}
