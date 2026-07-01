import 'server-only';
import { db } from './db';
import { ensureLevelWords } from './words';
import { findImage } from './images';
import { schedule, type SrsState } from './srs';
import type { Level, Profile, SrsCard, Word } from './types';

interface UserWordRow {
  word_id: number;
  status: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_at: number;
  last_reviewed: number | null;
  language: string;
  level: string;
  lemma: string;
  article: string | null;
  translation: string;
  part_of_speech: string | null;
  example: string | null;
  transcription: string | null;
  image_url: string | null;
  topic: string;
}

function rowToCard(r: UserWordRow): SrsCard {
  const word: Word = {
    id: r.word_id,
    language: r.language,
    level: r.level as Level,
    lemma: r.lemma,
    article: r.article,
    translation: r.translation,
    part_of_speech: r.part_of_speech,
    example: r.example,
    transcription: r.transcription,
    image_url: r.image_url ?? null,
    topic: r.topic,
  };
  return {
    word,
    status: r.status as SrsCard['status'],
    ease_factor: r.ease_factor,
    interval_days: r.interval_days,
    repetitions: r.repetitions,
    due_at: r.due_at,
    last_reviewed: r.last_reviewed,
  };
}

const CARD_JOIN = `
  SELECT uw.word_id, uw.status, uw.ease_factor, uw.interval_days,
         uw.repetitions, uw.due_at, uw.last_reviewed,
         w.language, w.level, w.lemma, w.article, w.translation,
         w.part_of_speech, w.example, w.transcription, w.image_url, w.topic
  FROM user_words uw JOIN words w ON w.id = uw.word_id
  WHERE uw.user_id = ?
`;

/** Локальный ключ дня сервера в формате YYYY-MM-DD. */
function dayKey(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** Все леммы, которые у пользователя уже есть. */
function userLemmas(userId: number): string[] {
  const rows = db
    .prepare(
      `SELECT w.lemma FROM user_words uw JOIN words w ON w.id = uw.word_id
       WHERE uw.user_id = ?`,
    )
    .all(userId) as { lemma: string }[];
  return rows.map((r) => r.lemma);
}

/** Карточки к повторению (due_at <= now). */
function dueCards(userId: number, now: number): SrsCard[] {
  const rows = db
    .prepare(`${CARD_JOIN} AND uw.due_at <= ? ORDER BY uw.due_at LIMIT 50`)
    .all(userId, now) as unknown as UserWordRow[];
  return rows.map(rowToCard);
}

/** Карточки по конкретному списку word_ids (сохраняет порядок ids). */
function cardsByIds(userId: number, ids: number[]): SrsCard[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(`${CARD_JOIN} AND uw.word_id IN (${placeholders})`)
    .all(userId, ...ids) as unknown as UserWordRow[];
  const byId = new Map(rows.map((r) => [r.word_id, rowToCard(r)]));
  return ids.map((id) => byId.get(id)).filter((c): c is SrsCard => !!c);
}

function addUserWord(userId: number, wordId: number, now: number): void {
  db.prepare(
    `INSERT INTO user_words
       (user_id, word_id, status, ease_factor, interval_days, repetitions, due_at, last_reviewed)
     VALUES (?, ?, 'new', 2.5, 0, 0, ?, NULL)
     ON CONFLICT(user_id, word_id) DO NOTHING`,
  ).run(userId, wordId, now);
}

// ── Дневной набор ────────────────────────────────────────────────────────────

interface DailySet {
  word_ids: number[];
  completed: boolean;
}

function getDailySet(userId: number, day: string): DailySet | null {
  const row = db
    .prepare('SELECT word_ids, completed FROM daily_sets WHERE user_id = ? AND day = ?')
    .get(userId, day) as { word_ids: string; completed: number } | undefined;
  if (!row) return null;
  let ids: number[] = [];
  try {
    const v = JSON.parse(row.word_ids);
    if (Array.isArray(v)) ids = v;
  } catch {
    /* ignore */
  }
  return { word_ids: ids, completed: row.completed === 1 };
}

function createDailySet(userId: number, day: string, ids: number[]): DailySet {
  db.prepare(
    `INSERT INTO daily_sets (user_id, day, word_ids, completed, created_at)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(user_id, day) DO NOTHING`,
  ).run(userId, day, JSON.stringify(ids), Date.now());
  return { word_ids: ids, completed: false };
}

/** Отметить сегодняшний набор завершённым. */
export function completeDailySet(userId: number): void {
  db.prepare(
    'UPDATE daily_sets SET completed = 1 WHERE user_id = ? AND day = ?',
  ).run(userId, dayKey());
}

/**
 * Дневная сессия. Набор новых слов на день СТАБИЛЕН: фиксируется один раз и
 * переиспользуется при повторных заходах (никакой регенерации). Слова берутся
 * из общего пула УРОВНЯ (не зависят от тем). Темы используются только для текстов.
 */
export async function buildTodaySession(profile: Profile): Promise<{
  newCards: SrsCard[];
  reviewCards: SrsCard[];
}> {
  const now = Date.now();
  const userId = profile.user_id;
  const day = dayKey(now);

  let set = getDailySet(userId, day);

  if (!set) {
    const known = userLemmas(userId);
    const words = await ensureLevelWords(profile.level, profile.daily_goal, known);
    for (const w of words) addUserWord(userId, w.id, now);
    set = createDailySet(userId, day, words.map((w) => w.id));
    // Фоновая загрузка картинок для новых слов
    prefetchWordImages(words.map((w) => w.id)).catch(() => {});
  }

  const newCards = set.completed ? [] : cardsByIds(userId, set.word_ids);
  const newIds = new Set(set.word_ids);
  const reviewCards = dueCards(userId, now).filter((c) => !newIds.has(c.word.id));

  return { newCards, reviewCards };
}

/** Записать ответ пользователя по слову: пересчитать SRS и залогировать. */
export function recordAnswer(
  userId: number,
  wordId: number,
  grade: number,
): { ok: boolean } {
  const row = db
    .prepare(
      `SELECT ease_factor, interval_days, repetitions
       FROM user_words WHERE user_id = ? AND word_id = ?`,
    )
    .get(userId, wordId) as SrsState | undefined;

  if (!row) return { ok: false };

  const next = schedule(row, grade);
  db.prepare(
    `UPDATE user_words SET
       status = ?, ease_factor = ?, interval_days = ?, repetitions = ?,
       due_at = ?, last_reviewed = ?
     WHERE user_id = ? AND word_id = ?`,
  ).run(
    next.status,
    next.ease_factor,
    next.interval_days,
    next.repetitions,
    next.due_at,
    next.last_reviewed,
    userId,
    wordId,
  );

  db.prepare(
    `INSERT INTO review_logs (user_id, word_id, grade, reviewed_at) VALUES (?, ?, ?, ?)`,
  ).run(userId, wordId, Math.round(grade), next.last_reviewed);

  return { ok: true };
}

/** Карточки к повторению (для страницы /review). */
export function getDueCards(userId: number): SrsCard[] {
  return dueCards(userId, Date.now());
}

/** Все слова пользователя со статусом (для страницы «Мои слова»). */
export function getAllUserCards(userId: number): SrsCard[] {
  const rows = db
    .prepare(`${CARD_JOIN} ORDER BY uw.id DESC`)
    .all(userId) as unknown as UserWordRow[];
  return rows.map(rowToCard);
}

/** Фоновая загрузка картинок для слов без image_url (максимум limit штук). */
async function prefetchWordImages(wordIds: number[], limit = 6): Promise<void> {
  const ids = wordIds.slice(0, limit);
  const rows = db
    .prepare(
      `SELECT id, lemma FROM words WHERE id IN (${ids.map(() => '?').join(',')}) AND (image_url IS NULL OR image_url = '')`,
    )
    .all(...ids) as unknown as { id: number; lemma: string }[];
  if (rows.length === 0) return;

  await Promise.allSettled(
    rows.map(async (row) => {
      const img = await findImage(row.lemma);
      if (img?.url) {
        db.prepare('UPDATE words SET image_url = ? WHERE id = ?').run(img.url, row.id);
      }
    }),
  );
}

/** Вернуть всё дневные карточки (для списка-ревью). */
export function getDailyCards(userId: number): SrsCard[] {
  const now = Date.now();
  const set = getDailySet(userId, dayKey(now));
  if (!set || set.word_ids.length === 0) return [];
  return cardsByIds(userId, set.word_ids);
}

/**
 * Пометить слово как «знаю» и немедленно вернуть замену —
 * новое слово того же уровня, добавленное в дневной набор.
 */
export async function markKnownAndGetReplacement(
  userId: number,
  wordId: number,
  level: Level,
): Promise<{ ok: boolean; replacement: SrsCard | null }> {
  const exists = db.prepare('SELECT 1 FROM words WHERE id = ?').get(wordId);
  if (!exists) return { ok: false, replacement: null };

  // Помечаем как known
  const now = Date.now();
  const farDue = now + 180 * 86_400_000;
  db.prepare(
    `INSERT INTO user_words
       (user_id, word_id, status, ease_factor, interval_days, repetitions, due_at, last_reviewed)
     VALUES (?, ?, 'known', 2.6, 180, 3, ?, ?)
     ON CONFLICT(user_id, word_id) DO UPDATE SET
       status = 'known', interval_days = 180, repetitions = 3,
       due_at = excluded.due_at, last_reviewed = excluded.last_reviewed`,
  ).run(userId, wordId, farDue, now);

  // Добавляем в дневной набор замену
  const day = dayKey(now);
  const known = userLemmas(userId);
  try {
    const newWords = await ensureLevelWords(level, 1, known);
    if (newWords.length === 0) return { ok: true, replacement: null };
    const newWord = newWords[0];
    addUserWord(userId, newWord.id, now);

    const set = getDailySet(userId, day);
    if (set) {
      const combined = [...new Set([...set.word_ids, newWord.id])];
      db.prepare(
        'UPDATE daily_sets SET word_ids = ? WHERE user_id = ? AND day = ?',
      ).run(JSON.stringify(combined), userId, day);
    } else {
      createDailySet(userId, day, [newWord.id]);
    }

    // Фоновая загрузка картинки для нового слова
    prefetchWordImages([newWord.id], 1).catch(() => {});

    const cards = cardsByIds(userId, [newWord.id]);
    return { ok: true, replacement: cards[0] ?? null };
  } catch {
    return { ok: true, replacement: null };
  }
}

/**
 * Добавить N новых слов к сегодняшнему набору (кнопка «Учить ещё»).
 * Сбрасывает флаг completed, чтобы слова попали в сессию.
 */
export async function addMoreWordsToday(
  userId: number,
  level: Level,
  count: number,
): Promise<SrsCard[]> {
  const now = Date.now();
  const day = dayKey(now);
  const known = userLemmas(userId);
  const newWords = await ensureLevelWords(level, count, known);
  for (const w of newWords) addUserWord(userId, w.id, now);
  const newIds = newWords.map((w) => w.id);

  const set = getDailySet(userId, day);
  if (!set) {
    createDailySet(userId, day, newIds);
  } else {
    const combined = [...new Set([...set.word_ids, ...newIds])];
    db.prepare(
      'UPDATE daily_sets SET word_ids = ?, completed = 0 WHERE user_id = ? AND day = ?',
    ).run(JSON.stringify(combined), userId, day);
  }

  prefetchWordImages(newIds).catch(() => {});
  return cardsByIds(userId, newIds);
}

function recentWords(
  userId: number,
  limit: number,
): { lemma: string; translation: string }[] {
  return db
    .prepare(
      `SELECT w.lemma, w.translation
       FROM user_words uw JOIN words w ON w.id = uw.word_id
       WHERE uw.user_id = ? ORDER BY uw.id DESC LIMIT ?`,
    )
    .all(userId, limit) as unknown as { lemma: string; translation: string }[];
}

/**
 * Слова для закрепления в тексте: СЕГОДНЯШНИЙ набор + слова к повторению (механизм
 * интервального запоминания). Текст составляется так, чтобы эти слова в нём были.
 */
export function getReinforcementWords(
  userId: number,
): { lemma: string; translation: string }[] {
  const now = Date.now();
  const set = getDailySet(userId, dayKey(now));
  const todays = set ? cardsByIds(userId, set.word_ids) : [];
  const due = dueCards(userId, now);

  const seen = new Set<number>();
  const out: { lemma: string; translation: string }[] = [];
  for (const c of [...todays, ...due]) {
    if (seen.has(c.word.id)) continue;
    seen.add(c.word.id);
    out.push({ lemma: c.word.lemma, translation: c.word.translation });
    if (out.length >= 10) break;
  }
  // если сегодня ещё ничего не учили — берём последние изученные
  return out.length > 0 ? out : recentWords(userId, 8);
}
