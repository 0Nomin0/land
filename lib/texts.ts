import 'server-only';
import { db } from './db';
import { generateText } from './ai';
import { findImage } from './images';
import { fetchHeadlines } from './news';
import { getReinforcementWords } from './session';
import type { Level, ReadingText, WordLink } from './types';

interface TextRow {
  id: number;
  topic: string;
  level: string;
  title: string;
  body: string;
  word_links: string;
  image_url: string | null;
  image_attr: string | null;
  image_link: string | null;
  created_at: number;
}

function rowToText(r: TextRow): ReadingText {
  let links: WordLink[] = [];
  try {
    const v = JSON.parse(r.word_links);
    if (Array.isArray(v)) links = v;
  } catch {
    /* ignore */
  }
  return {
    id: r.id,
    topic: r.topic,
    level: r.level as Level,
    title: r.title,
    body: r.body,
    word_links: links,
    image_url: r.image_url ?? null,
    image_attr: r.image_attr ?? null,
    image_link: r.image_link ?? null,
    created_at: r.created_at,
  };
}

export function listTexts(userId: number): ReadingText[] {
  const rows = db
    .prepare(
      'SELECT * FROM texts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    )
    .all(userId) as unknown as TextRow[];
  return rows.map(rowToText);
}

export function getText(userId: number, id: number): ReadingText | null {
  const row = db
    .prepare('SELECT * FROM texts WHERE user_id = ? AND id = ?')
    .get(userId, id) as TextRow | undefined;
  return row ? rowToText(row) : null;
}

/** Собирает word_links (+ гарантирует наличие изучаемых слов), ищет фото и сохраняет текст. */
async function assembleAndSave(
  userId: number,
  level: Level,
  topic: string,
  gen: Awaited<ReturnType<typeof generateText>>,
  mustInclude: { lemma: string; translation: string }[],
): Promise<ReadingText> {
  const linkMap = new Map<string, WordLink>();
  for (const l of gen.word_links) {
    linkMap.set(l.surface.toLowerCase(), l);
  }
  for (const w of mustInclude) {
    if (![...linkMap.values()].some((l) => l.lemma === w.lemma)) {
      linkMap.set(w.lemma.toLowerCase(), {
        surface: w.lemma,
        lemma: w.lemma,
        translation: w.translation,
      });
    }
  }
  const links = [...linkMap.values()];

  const image = await findImage(gen.image_query || topic);
  const now = Date.now();
  const info = db
    .prepare(
      `INSERT INTO texts
         (user_id, topic, level, title, body, word_links, image_url, image_attr, image_link, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      userId,
      topic,
      level,
      gen.title,
      gen.body,
      JSON.stringify(links),
      image?.url ?? null,
      image?.attribution ?? null,
      image?.link ?? null,
      now,
    );

  return {
    id: Number(info.lastInsertRowid),
    topic,
    level,
    title: gen.title,
    body: gen.body,
    word_links: links,
    image_url: image?.url ?? null,
    image_attr: image?.attribution ?? null,
    image_link: image?.link ?? null,
    created_at: now,
  };
}

/**
 * Сгенерировать новый текст по теме, ОБЯЗАТЕЛЬНО включив сегодняшние слова
 * (+ слова к повторению) для их закрепления, и сохранить.
 */
export async function createTextForTopic(
  userId: number,
  level: Level,
  topic: string,
): Promise<ReadingText> {
  const mustInclude = getReinforcementWords(userId);
  const gen = await generateText({ level, topic, mustIncludeWords: mustInclude });
  return assembleAndSave(userId, level, topic, gen, mustInclude);
}

/**
 * Пакетная генерация текстов по нескольким темам параллельно.
 * Темы чередуются: topics=['футбол','история'], count=3 → ['футбол','история','футбол'].
 */
export async function createBatchTexts(
  userId: number,
  level: Level,
  topics: string[],
  count = 3,
): Promise<ReadingText[]> {
  if (topics.length === 0) return [];
  const picks = Array.from({ length: count }, (_, i) => topics[i % topics.length]);
  const results = await Promise.allSettled(
    picks.map((topic) => createTextForTopic(userId, level, topic)),
  );
  return results
    .filter((r): r is PromiseFulfilledResult<ReadingText> => r.status === 'fulfilled')
    .map((r) => r.value);
}

/**
 * Новостная заметка: тянет реальные немецкие заголовки по стране, адаптирует под
 * уровень и сегодняшние слова, сохраняет как текст.
 */
export async function createNewsText(
  userId: number,
  level: Level,
  country: string,
): Promise<ReadingText> {
  const headlines = await fetchHeadlines(country);
  const mustInclude = getReinforcementWords(userId);
  const topic = `Новости: ${country}`;
  const gen = await generateText({
    level,
    topic,
    mustIncludeWords: mustInclude,
    source: headlines.length ? headlines.join('\n') : undefined,
  });
  return assembleAndSave(userId, level, topic, gen, mustInclude);
}
