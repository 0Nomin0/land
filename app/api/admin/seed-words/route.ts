import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdminUser } from '@/lib/auth';
import { ensureLevelWords } from '@/lib/words';
import type { Level } from '@/lib/types';

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });
  if (!isAdminUser(user.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const level: Level = LEVELS.includes(body.level) ? body.level : 'B1';
  const count: number = Math.min(Math.max(Number(body.count) || 50, 10), 100);

  try {
    // ensureLevelWords берёт из пула или генерирует новые через AI
    const words = await ensureLevelWords(level, count, []);
    return NextResponse.json({ ok: true, generated: words.length, level });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Ошибка' },
      { status: 500 },
    );
  }
}
