import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProfile } from '@/lib/profile';
import { createTextForTopic } from '@/lib/texts';
import { AiError } from '@/lib/ai';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const profile = getProfile(user.id);
  if (!profile) return NextResponse.json({ error: 'no_profile' }, { status: 409 });

  const { topic } = await req.json().catch(() => ({}));
  const chosen =
    typeof topic === 'string' && topic.trim()
      ? topic.trim()
      : profile.refined_topics[0] ?? profile.interests[0] ?? 'Alltag';

  try {
    const text = await createTextForTopic(user.id, profile.level, chosen);
    return NextResponse.json({ text });
  } catch (e) {
    if (e instanceof AiError) {
      return NextResponse.json({ error: 'ai', message: e.message }, { status: 502 });
    }
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
