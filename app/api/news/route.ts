import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProfile } from '@/lib/profile';
import { createNewsText } from '@/lib/texts';
import { AiError } from '@/lib/ai';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const profile = getProfile(user.id);
  if (!profile) return NextResponse.json({ error: 'no_profile' }, { status: 409 });

  const { country } = await req.json().catch(() => ({}));
  const c = typeof country === 'string' ? country.trim() : '';
  if (!c || c.length > 40) {
    return NextResponse.json({ error: 'bad_input' }, { status: 400 });
  }

  try {
    const text = await createNewsText(user.id, profile.level, c);
    return NextResponse.json({ text });
  } catch (e) {
    if (e instanceof AiError) {
      return NextResponse.json({ error: 'ai', message: e.message }, { status: 502 });
    }
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
