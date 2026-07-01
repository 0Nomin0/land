import type { SrsCard } from '@/lib/types';

export interface GameProps {
  cards: SrsCard[];
  /** Записать оценку ответа (0..5) по слову. Может вызываться несколько раз. */
  onGrade: (wordId: number, grade: number) => void;
  /** Фаза завершена. */
  onDone: () => void;
  /** «Я уже знаю это слово» — исключить из изучения (только на этапе знакомства). */
  onKnow?: (wordId: number) => Promise<void>;
}
