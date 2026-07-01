export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export interface User {
  id: number;
  email: string;
}

export interface Profile {
  user_id: number;
  language: string;
  level: Level;
  daily_goal: number;
  interests: string[];
  refined_topics: string[];
  onboarding_done: boolean;
}

export interface Word {
  id: number;
  language: string;
  level: Level;
  lemma: string;
  article: string | null;
  translation: string;
  part_of_speech: string | null;
  example: string | null;
  transcription: string | null;
  image_url: string | null;
  topic: string;
}

/** Слово вместе с SRS-состоянием пользователя (для сессии/повторений). */
export interface SrsCard {
  word: Word;
  status: 'new' | 'learning' | 'review' | 'known';
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_at: number;
  last_reviewed: number | null;
}

export interface WordLink {
  /** слово как оно встречается в тексте */
  surface: string;
  lemma: string;
  translation: string;
  transcription?: string | null;
}

export interface ReadingText {
  id: number;
  topic: string;
  level: Level;
  title: string;
  body: string;
  word_links: WordLink[];
  image_url: string | null;
  image_attr: string | null;
  image_link: string | null;
  created_at: number;
}
