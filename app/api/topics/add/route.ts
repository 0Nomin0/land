import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProfile, updateRefinedTopics } from '@/lib/profile';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const profile = getProfile(user.id);
  if (!profile) return NextResponse.json({ error: 'no_profile' }, { status: 409 });

  const { topic } = await req.json().catch(() => ({}));
  const t = typeof topic === 'string' ? topic.trim() : '';
  if (!t || t.length > 60) {
    return NextResponse.json({ error: 'bad_input' }, { status: 400 });
  }

  const exists = profile.refined_topics.some(
    (x) => x.toLowerCase() === t.toLowerCase(),
  );
  const topics = exists ? profile.refined_topics : [...profile.refined_topics, t];
  if (!exists) updateRefinedTopics(user.id, topics);

  return NextResponse.json({ topics });
}
