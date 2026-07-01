import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProfile } from '@/lib/profile';
import { buildTodaySession } from '@/lib/session';
import { AiError } from '@/lib/ai';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const profile = getProfile(user.id);
  if (!profile || !profile.onboarding_done) {
    return NextResponse.json({ error: 'no_profile' }, { status: 409 });
  }

  try {
    const { newCards, reviewCards } = await buildTodaySession(profile);
    return NextResponse.json({ newCards, reviewCards });
  } catch (e) {
    if (e instanceof AiError) {
      return NextResponse.json({ error: 'ai', message: e.message }, { status: 502 });
    }
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
