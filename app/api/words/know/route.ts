import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProfile } from '@/lib/profile';
import { markKnownAndGetReplacement } from '@/lib/session';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { wordId } = await req.json().catch(() => ({}));
  if (typeof wordId !== 'number') {
    return NextResponse.json({ error: 'bad_input' }, { status: 400 });
  }

  const profile = getProfile(user.id);
  if (!profile) return NextResponse.json({ error: 'no_profile' }, { status: 409 });

  const result = await markKnownAndGetReplacement(user.id, wordId, profile.level);
  if (!result.ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({ ok: true, replacement: result.replacement });
}
