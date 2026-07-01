import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { completeDailySet } from '@/lib/session';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });
  completeDailySet(user.id);
  return NextResponse.json({ ok: true });
}
