/**
 * Алгоритм интервального повторения SM-2 (как в Anki/SuperMemo).
 * Чистая функция без зависимостей — легко тестируется.
 *
 * grade (оценка ответа) 0..5:
 *   0–2 — не вспомнил / с трудом → интервал сбрасывается;
 *   3   — вспомнил с усилием;
 *   4   — вспомнил;
 *   5   — легко.
 */

export type CardStatus = 'new' | 'learning' | 'review' | 'known';

export interface SrsState {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
}

export interface SrsResult extends SrsState {
  due_at: number;
  status: CardStatus;
  last_reviewed: number;
}

const MIN_EASE = 1.3;
const DAY_MS = 86_400_000;
const KNOWN_THRESHOLD_DAYS = 21;

export function schedule(
  state: SrsState,
  grade: number,
  now: number = Date.now(),
): SrsResult {
  const q = Math.max(0, Math.min(5, Math.round(grade)));

  // Обновление лёгкости (применяется всегда), нижняя граница 1.3.
  let ease = state.ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < MIN_EASE) ease = MIN_EASE;

  let repetitions: number;
  let interval: number;
  let status: CardStatus;

  if (q < 3) {
    // Провал — учим заново, показать снова в этой же сессии (интервал 0 = due сейчас).
    repetitions = 0;
    interval = 0;
    status = 'learning';
  } else {
    repetitions = state.repetitions + 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(state.interval_days * ease);

    status = interval >= KNOWN_THRESHOLD_DAYS ? 'known' : 'review';
  }

  return {
    ease_factor: Math.round(ease * 1000) / 1000,
    interval_days: interval,
    repetitions,
    due_at: now + interval * DAY_MS,
    status,
    last_reviewed: now,
  };
}

/** Начальное состояние новой карточки. */
export function freshState(): SrsState {
  return { ease_factor: 2.5, interval_days: 0, repetitions: 0 };
}
