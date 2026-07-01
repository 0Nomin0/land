import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getProfile } from '@/lib/profile';
import { getAllUserCards } from '@/lib/session';
import TtsButton from '@/components/TtsButton';
import type { SrsCard } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function WordsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const profile = getProfile(user.id);
  if (!profile || !profile.onboarding_done) redirect('/onboarding');

  const cards = getAllUserCards(user.id);

  const known = cards.filter((c) => c.status === 'known');
  const learning = cards.filter(
    (c) => c.status === 'review' || (c.status === 'learning' && c.repetitions > 0),
  );
  const notKnown = cards.filter(
    (c) => c.status === 'new' || (c.status === 'learning' && c.repetitions === 0),
  );

  return (
    <div className="px-4 py-8">
      <h1 className="font-display text-2xl font-bold">Мои слова</h1>
      <p className="mt-1 text-white/55">Всего: {cards.length}</p>

      {cards.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-white/55">Пока нет слов. Начни учить!</p>
          <Link
            href="/learn"
            className="mt-4 inline-block rounded-lg bg-brand px-5 py-2 font-semibold"
          >
            Учить →
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <Group title="Знаю" icon="✅" tone="text-green-300" cards={known} />
          <Group title="Учу" icon="📚" tone="text-sky-300" cards={learning} />
          <Group title="Не знаю / новые" icon="🌱" tone="text-amber-300" cards={notKnown} />
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  icon,
  tone,
  cards,
}: {
  title: string;
  icon: string;
  tone: string;
  cards: SrsCard[];
}) {
  if (cards.length === 0) return null;
  return (
    <section>
      <h2 className={`mb-3 flex items-center gap-2 font-display text-lg font-semibold ${tone}`}>
        <span>{icon}</span> {title}
        <span className="text-sm font-normal text-white/40">· {cards.length}</span>
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {cards.map((c) => (
          <li
            key={c.word.id}
            className="glass flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
          >
            <TtsButton text={c.word.lemma} />
            <span className="font-medium">
              {c.word.article ? `${c.word.article} ` : ''}
              {c.word.lemma}
            </span>
            {c.word.transcription && (
              <span className="font-mono text-xs text-white/30">
                {c.word.transcription}
              </span>
            )}
            <span className="ml-auto text-brand-light">{c.word.translation}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
