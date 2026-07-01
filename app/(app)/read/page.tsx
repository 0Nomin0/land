import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getProfile } from '@/lib/profile';
import { listTexts } from '@/lib/texts';
import ReadGenerator from '@/components/ReadGenerator';

export const dynamic = 'force-dynamic';

export default async function ReadPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const profile = getProfile(user.id);
  if (!profile || !profile.onboarding_done) redirect('/onboarding');

  const texts = listTexts(user.id);
  // Используем исходные интересы из онбординга — то что сам указал, не AI-подтемы
  const topics = profile.interests.length ? profile.interests : profile.refined_topics;

  return (
    <div className="px-4 py-8">
      <h1 className="text-2xl font-bold">Тексты по твоим темам</h1>
      <p className="mt-1 text-white/55">
        Короткие тексты с твоими словами. Нажми на слово — увидишь перевод и услышишь
        произношение.
      </p>

      <ReadGenerator topics={topics} />

      <div className="mt-8 space-y-3">
        {texts.length === 0 && (
          <p className="text-white/40">
            Пока нет текстов. Сгенерируй первый — выбери тему выше.
          </p>
        )}
        {texts.map((t, i) => (
          <Link
            key={t.id}
            href={`/read/${t.id}`}
            className={`glass animate-fade-up flex gap-4 overflow-hidden rounded-2xl p-3 transition hover:-translate-y-0.5 hover:border-brand/30 delay-${Math.min(i + 1, 5)}`}
          >
            {t.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.image_url}
                alt=""
                className="h-20 w-28 shrink-0 rounded-xl object-cover"
                loading="lazy"
              />
            )}
            <div className="min-w-0 flex-1 py-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate font-display font-semibold">{t.title}</h3>
                <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand-light">
                  {t.level} · {t.topic}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-white/50">{t.body}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
