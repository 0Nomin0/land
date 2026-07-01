import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProfile } from '@/lib/profile';
import { createBatchTexts } from '@/lib/texts';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });

  const profile = getProfile(user.id);
  if (!profile || !profile.onboarding_done) {
    return NextResponse.json({ message: 'Сначала заверши настройку' }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const topics: string[] = Array.isArray(body.topics)
    ? (body.topics as unknown[]).filter((t): t is string => typeof t === 'string').slice(0, 5)
    : [];
  const count: number =
    typeof body.count === 'number' ? Math.min(Math.max(body.count, 1), 5) : 3;

  if (topics.length === 0) {
    return NextResponse.json({ message: 'Выбери хотя бы одну тему' }, { status: 400 });
  }

  try {
    const texts = await createBatchTexts(user.id, profile.level, topics, count);
    if (texts.length === 0) {
      return NextResponse.json(
        { message: 'Не удалось создать тексты. Возможно, лимит AI — попробуй чуть позже.' },
        { status: 500 },
      );
    }
    return NextResponse.json({ texts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ошибка генерации';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
