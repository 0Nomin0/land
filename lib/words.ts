import 'server-only';
import { db } from './db';
import { generateWords } from './ai';
import type { Level, Word } from './types';

interface WordRow {
  id: number;
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

function rowToWord(r: WordRow): Word {
  return { ...r, level: r.level as Level };
}

/** Слова из общего пула уровня, исключая заданные леммы. */
export function getLevelWords(
  level: Level,
  limit: number,
  excludeLemmas: string[] = [],
): Word[] {
  const rows = db
    .prepare(
      `SELECT * FROM words WHERE language = 'de' AND level = ? ORDER BY id`,
    )
    .all(level) as unknown as WordRow[];

  const ex = new Set(excludeLemmas.map((l) => l.toLowerCase()));
  return rows
    .map(rowToWord)
    .filter((w) => !ex.has(w.lemma.toLowerCase()))
    .slice(0, limit);
}

/** Вставка сгенерированных слов с дедупом по (language, level, lemma). */
function insertWords(
  level: Level,
  words: {
    lemma: string;
    article: string | null;
    translation: string;
    part_of_speech: string;
    example: string;
    transcription: string;
  }[],
): void {
  const stmt = db.prepare(
    `INSERT INTO words
       (language, level, lemma, article, translation, part_of_speech, example, transcription, topic, created_at)
     VALUES ('de', ?, ?, ?, ?, ?, ?, ?, 'general', ?)
     ON CONFLICT(language, level, lemma) DO NOTHING`,
  );
  const now = Date.now();
  for (const w of words) {
    stmt.run(
      level,
      w.lemma,
      w.article,
      w.translation,
      w.part_of_speech,
      w.example,
      w.transcription || null,
      now,
    );
  }
}

/**
 * Гарантирует `count` НОВЫХ для пользователя слов уровня: сначала из общего пула,
 * при нехватке — генерация через AI с дозаписью в пул. Пул общий для всех на уровне.
 */
export async function ensureLevelWords(
  level: Level,
  count: number,
  excludeLemmas: string[] = [],
): Promise<Word[]> {
  let cached = getLevelWords(level, count, excludeLemmas);
  if (cached.length >= count) return cached.slice(0, count);

  const need = count - cached.length;
  const exclude = [...excludeLemmas, ...cached.map((w) => w.lemma)];

  // Генерируем большой батч — заполняем пул для будущих пользователей
  const batchSize = Math.max(need + 40, 50);
  const generated = await generateWords({
    level,
    count: batchSize,
    exclude,
  });
  insertWords(level, generated);

  cached = getLevelWords(level, count, excludeLemmas);
  return cached.slice(0, count);
}
