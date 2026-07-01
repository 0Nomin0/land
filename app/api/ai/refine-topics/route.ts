import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { refineTopics, AiError } from '@/lib/ai';
import { LEVELS, type Level } from '@/lib/types';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { interests, level } = await req.json().catch(() => ({}));
  if (!Array.isArray(interests) || !LEVELS.includes(level)) {
    return NextResponse.json({ error: 'bad_input' }, { status: 400 });
  }

  const cleaned = interests
    .map((s: unknown) => String(s).trim())
    .filter(Boolean)
    .slice(0, 20);
  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'empty' }, { status: 400 });
  }

  try {
    const topics = await refineTopics(cleaned, level as Level);
    return NextResponse.json({ topics });
  } catch (e) {
    if (e instanceof AiError) {
      return NextResponse.json({ error: 'ai', message: e.message }, { status: 502 });
    }
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
