import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProfile } from '@/lib/profile';
import { addMoreWordsToday } from '@/lib/session';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const profile = getProfile(user.id);
  if (!profile) return NextResponse.json({ error: 'no profile' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const count = typeof body.count === 'number' ? Math.min(Math.max(body.count, 1), 20) : 5;

  try {
    const cards = await addMoreWordsToday(user.id, profile.level, count);
    return NextResponse.json({ ok: true, cards });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Ошибка' },
      { status: 500 },
    );
  }
}
