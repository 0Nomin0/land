import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProfile, updateRefinedTopics } from '@/lib/profile';
import { refineTopics, AiError } from '@/lib/ai';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const profile = getProfile(user.id);
  if (!profile) return NextResponse.json({ error: 'no_profile' }, { status: 409 });

  const base =
    profile.interests.length > 0 ? profile.interests : profile.refined_topics;
  if (base.length === 0) {
    return NextResponse.json({ error: 'no_base' }, { status: 400 });
  }

  try {
    const fresh = await refineTopics(base, profile.level);
    const existing = new Set(profile.refined_topics.map((t) => t.toLowerCase()));
    const added = fresh.filter((t) => !existing.has(t.toLowerCase()));
    const merged = [...profile.refined_topics, ...added].slice(0, 40);
    updateRefinedTopics(user.id, merged);
    return NextResponse.json({ topics: merged, added });
  } catch (e) {
    if (e instanceof AiError) {
      return NextResponse.json({ error: 'ai', message: e.message }, { status: 502 });
    }
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
