import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getText } from '@/lib/texts';
import ClickableText from '@/components/ClickableText';
import TtsButton from '@/components/TtsButton';
import NextTextButton from '@/components/NextTextButton';

export const dynamic = 'force-dynamic';

export default async function TextPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const text = getText(user.id, Number(id));
  if (!text) notFound();

  return (
    <article className="px-4 py-8">
      <Link href="/read" className="text-sm text-white/50 hover:text-white">
        ← Все тексты
      </Link>

      {text.image_url && (
        <figure className="mt-4 overflow-hidden rounded-2xl border border-brand/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={text.image_url}
            alt={text.title}
            className="max-h-72 w-full animate-fade-in object-cover"
          />
          {text.image_attr && (
            <figcaption className="bg-black/40 px-3 py-1 text-right text-[11px] text-white/40">
              {text.image_link ? (
                <a href={text.image_link} target="_blank" rel="noreferrer" className="hover:text-white/70">
                  📷 {text.image_attr}
                </a>
              ) : (
                <>📷 {text.image_attr}</>
              )}
            </figcaption>
          )}
        </figure>
      )}

      <div className="mt-5 mb-2 flex items-center gap-2">
        <h1 className="font-display text-3xl font-bold">{text.title}</h1>
        <TtsButton text={text.title} />
      </div>
      <p className="mb-6 text-sm text-white/45">
        {text.level} · {text.topic}
      </p>

      <ClickableText body={text.body} wordLinks={text.word_links} />

      <NextTextButton currentTextId={text.id} topic={text.topic} />

      {text.word_links.length > 0 && (
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 text-sm font-semibold text-white/60">
            Ключевые слова
          </h2>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {dedupeLinks(text.word_links).map((l) => (
              <li key={l.lemma + l.translation} className="flex items-center gap-2 text-sm">
                <TtsButton text={l.lemma} />
                <span className="font-medium">{l.lemma}</span>
                {l.transcription && (
                  <span className="font-mono text-xs text-white/35">
                    {l.transcription}
                  </span>
                )}
                <span className="text-white/40">—</span>
                <span className="text-brand-light">{l.translation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function dedupeLinks<T extends { lemma: string }>(links: T[]): T[] {
  const seen = new Set<string>();
  return links.filter((l) =>
    seen.has(l.lemma.toLowerCase()) ? false : (seen.add(l.lemma.toLowerCase()), true),
  );
}
