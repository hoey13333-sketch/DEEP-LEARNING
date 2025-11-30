export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type MaterialType = 'audio' | 'video' | 'text';

export interface Material {
  id: string;
  title: string;
  type: MaterialType;
  duration: string;
  source: string; // URL or 'Uploaded'
  difficulty: Difficulty;
  topic: string;
  thumbnail?: string;
  audioUrl?: string; // Blob URL for local files
  transcript: string;
  createdAt: number;
}

export interface VocabularyItem {
  id: string;
  word: string;
  context: string;
  definition: string;
  translation: string;
  addedAt: number;
  nextReviewAt: number;
  stage: number; // Ebbinghaus stage (0-5)
}

export interface GrammarItem {
  id: string;
  sentence: string;
  rule: string;
  explanation: string;
  addedAt: number;
  nextReviewAt: number;
  stage: number; // Ebbinghaus stage (0-5)
}

export enum AppView {
  DASHBOARD = 'dashboard',
  LISTENING = 'listening',
  SPEAKING = 'speaking',
  VOCABULARY = 'vocabulary',
  GRAMMAR = 'grammar'
}

export interface UserStats {
  totalHours: number;
  materialsCompleted: number;
  streakDays: number;
  todayMinutes: number;
}

export interface LearningTrend {
  date: string;
  accuracy: number;
  fluency: number;
}

export interface WeaknessAnalysis {
  errorWords: { word: string; count: number }[];
  pronunciation: { phoneme: string; score: number }[];
  grammarPoints: { rule: string; frequency: number }[];
}

export interface ReviewTask {
    id: string;
    title: string;
    type: 'word' | 'grammar';
    nextReviewAt: number;
}