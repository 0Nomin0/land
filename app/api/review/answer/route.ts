import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recordAnswer } from '@/lib/session';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { wordId, grade } = await req.json().catch(() => ({}));
  if (typeof wordId !== 'number' || typeof grade !== 'number') {
    return NextResponse.json({ error: 'bad_input' }, { status: 400 });
  }

  const result = recordAnswer(user.id, wordId, grade);
  if (!result.ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
