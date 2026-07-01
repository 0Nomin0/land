import { NextResponse } from 'next/server';
import { createSession, findUserByCode } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code: unknown = body.code;

  if (typeof code !== 'string' || !code.trim()) {
    return NextResponse.json({ error: 'Введи код доступа' }, { status: 400 });
  }

  const user = await findUserByCode(code.trim());
  if (!user) {
    return NextResponse.json({ error: 'Неверный код доступа' }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
