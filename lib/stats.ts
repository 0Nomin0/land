import 'server-only';
import { db } from './db';

export interface Stats {
  total: number;
  known: number;
  learning: number;
  review: number;
  dueNow: number;
  reviewedToday: number;
  streakDays: number;
}

function count(sql: string, ...params: unknown[]): number {
  const row = db.prepare(sql).get(...(params as never[])) as { c: number };
  return row.c;
}

export function getStats(userId: number): Stats {
  const now = Date.now();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const total = count('SELECT COUNT(*) c FROM user_words WHERE user_id = ?', userId);
  const known = count(
    "SELECT COUNT(*) c FROM user_words WHERE user_id = ? AND status = 'known'",
    userId,
  );
  const review = count(
    "SELECT COUNT(*) c FROM user_words WHERE user_id = ? AND status = 'review'",
    userId,
  );
  const learning = count(
    "SELECT COUNT(*) c FROM user_words WHERE user_id = ? AND status IN ('new','learning')",
    userId,
  );
  const dueNow = count(
    'SELECT COUNT(*) c FROM user_words WHERE user_id = ? AND due_at <= ? AND last_reviewed IS NOT NULL',
    userId,
    now,
  );
  const reviewedToday = count(
    'SELECT COUNT(*) c FROM review_logs WHERE user_id = ? AND reviewed_at >= ?',
    userId,
    dayStart.getTime(),
  );

  return {
    total,
    known,
    learning,
    review,
    dueNow,
    reviewedToday,
    streakDays: computeStreak(userId),
  };
}

/** Число подряд идущих дней (включая сегодня) с хотя бы одним повторением. */
function computeStreak(userId: number): number {
  const rows = db
    .prepare(
      'SELECT DISTINCT reviewed_at FROM review_logs WHERE user_id = ? ORDER BY reviewed_at DESC LIMIT 2000',
    )
    .all(userId) as unknown as { reviewed_at: number }[];

  const days = new Set<string>();
  for (const r of rows) {
    days.add(dayKey(new Date(r.reviewed_at)));
  }

  let streak = 0;
  const cursor = new Date();
  // если сегодня ещё не занимался — стрик считаем со вчера
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
