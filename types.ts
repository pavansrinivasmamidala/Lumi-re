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

export interface SavedQuiz {
  id: string;
  created_at: number;
  data: QuizData;
}

export interface QuizResponse {
  quiz: QuizData;
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
