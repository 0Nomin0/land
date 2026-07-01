'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SrsCard } from '@/lib/types';
import { useTts } from '@/hooks/useTts';

interface Props {
  onLearnMore: () => void;
  addingMore: boolean;
}

export default function DailyWordList({ onLearnMore, addingMore }: Props) {
  const [cards, setCards] = useState<SrsCard[] | null>(null);
  const { speak, supported } = useTts();

  useEffect(() => {
    fetch('/api/session/daily-words')
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []))
      .catch(() => setCards([]));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 text-center">
        <p className="text-3xl">🚀</p>
        <p className="mt-2 text-2xl font-bold">Отличная работа!</p>
        <p className="mt-1 text-sm text-white/50">
          Слова дня — запомни их на картинках
        </p>
      </div>

      {cards === null ? (
        <div className="flex justify-center py-12">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-brand" />
        </div>
      ) : cards.length === 0 ? (
        <p className="py-8 text-center text-white/40">Нет слов на сегодня</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <WordCard key={card.word.id} card={card} speak={speak} ttsOk={supported} />
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/read"
          className="rounded-xl bg-brand px-5 py-2.5 font-semibold shadow-lg shadow-brand/20"
        >
          Закрепить чтением →
        </Link>
        <button
          onClick={onLearnMore}
          disabled={addingMore}
          className="rounded-xl border border-white/15 px-5 py-2.5 font-medium transition hover:border-brand/40 hover:bg-brand/10 disabled:opacity-50"
        >
          {addingMore ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              Добавляю…
            </span>
          ) : (
            'Выучить ещё 5 слов'
          )}
        </button>
        <Link
          href="/dashboard"
          className="rounded-xl border border-white/10 px-5 py-2.5 text-white/60 transition hover:text-white"
        >
          Прогресс
        </Link>
      </div>
    </div>
  );
}

function WordCard({
  card,
  speak,
  ttsOk,
}: {
  card: SrsCard;
  speak: (t: string) => void;
  ttsOk: boolean;
}) {
  const { word } = card;
  const label = word.article ? `${word.article} ${word.lemma}` : word.lemma;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/5 transition hover:border-brand/30 hover:bg-white/8">
      {word.image_url ? (
        <div className="relative h-28 w-full overflow-hidden bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={word.image_url}
            alt={word.lemma}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex h-28 items-center justify-center bg-gradient-to-br from-brand/10 to-transparent">
          <span className="text-4xl opacity-30">📖</span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <div className="flex items-start justify-between gap-1">
          <span className="font-semibold leading-tight text-white">{label}</span>
          {ttsOk && (
            <button
              onClick={() => speak(label)}
              className="mt-0.5 shrink-0 rounded-full p-1 text-white/30 transition hover:bg-white/10 hover:text-white/70"
              title="Произнести"
            >
              🔊
            </button>
          )}
        </div>
        {word.transcription && (
          <span className="text-xs text-white/35">[{word.transcription}]</span>
        )}
        <span className="text-sm text-white/60">{word.translation}</span>
      </div>
    </div>
  );
}
