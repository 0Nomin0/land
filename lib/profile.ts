import 'server-only';
import { db } from './db';
import type { Level, Profile } from './types';

interface ProfileRow {
  user_id: number;
  language: string;
  level: string;
  daily_goal: number;
  interests: string;
  refined_topics: string;
  onboarding_done: number;
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    user_id: row.user_id,
    language: row.language,
    level: row.level as Level,
    daily_goal: row.daily_goal,
    interests: safeParse(row.interests),
    refined_topics: safeParse(row.refined_topics),
    onboarding_done: row.onboarding_done === 1,
  };
}

function safeParse(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function getProfile(userId: number): Profile | null {
  const row = db
    .prepare('SELECT * FROM user_profiles WHERE user_id = ?')
    .get(userId) as ProfileRow | undefined;
  return row ? rowToProfile(row) : null;
}

/** Обновить только список тем (для догенерации тем на странице текстов). */
export function updateRefinedTopics(userId: number, topics: string[]): void {
  db.prepare('UPDATE user_profiles SET refined_topics = ? WHERE user_id = ?').run(
    JSON.stringify(topics.slice(0, 40)),
    userId,
  );
}

export function saveProfile(
  userId: number,
  data: {
    level: Level;
    daily_goal: number;
    interests: string[];
    refined_topics: string[];
  },
): void {
  db.prepare(
    `INSERT INTO user_profiles
       (user_id, language, level, daily_goal, interests, refined_topics, onboarding_done)
     VALUES (?, 'de', ?, ?, ?, ?, 1)
     ON CONFLICT(user_id) DO UPDATE SET
       level = excluded.level,
       daily_goal = excluded.daily_goal,
       interests = excluded.interests,
       refined_topics = excluded.refined_topics,
       onboarding_done = 1`,
  ).run(
    userId,
    data.level,
    data.daily_goal,
    JSON.stringify(data.interests),
    JSON.stringify(data.refined_topics),
  );
}
