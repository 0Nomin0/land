import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDailyCards } from '@/lib/session';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const cards = getDailyCards(user.id);
  return NextResponse.json({ cards });
}
