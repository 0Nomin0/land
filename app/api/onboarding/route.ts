import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { saveProfile } from '@/lib/profile';
import { LEVELS, type Level } from '@/lib/types';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { level, daily_goal, interests, refined_topics } = body;

  if (!LEVELS.includes(level)) {
    return NextResponse.json({ error: 'bad_level' }, { status: 400 });
  }
  const goal = Number(daily_goal);
  if (!Number.isFinite(goal) || goal < 1 || goal > 50) {
    return NextResponse.json({ error: 'bad_goal' }, { status: 400 });
  }
  const interestsArr = Array.isArray(interests)
    ? interests.map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
    : [];
  const topicsArr = Array.isArray(refined_topics)
    ? refined_topics.map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
    : [];

  if (topicsArr.length === 0 && interestsArr.length === 0) {
    return NextResponse.json({ error: 'no_topics' }, { status: 400 });
  }

  saveProfile(user.id, {
    level: level as Level,
    daily_goal: Math.round(goal),
    interests: interestsArr,
    refined_topics: topicsArr,
  });

  return NextResponse.json({ ok: true });
}
