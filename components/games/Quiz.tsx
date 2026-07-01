'use client';

import { useMemo, useState } from 'react';
import TtsButton from '@/components/TtsButton';
import { displayWord, shuffle } from '@/lib/clientUtil';
import type { GameProps } from './types';

export default function Quiz({ cards, onGrade, onDone }: GameProps) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  // Заранее готовим варианты ответов для каждой карточки.
  const options = useMemo(
    () =>
      cards.map((c) => {
        const wrong = shuffle(
          cards.filter((x) => x.word.id !== c.word.id).map((x) => x.word.translation),
        ).slice(0, 3);
        return shuffle([c.word.translation, ...wrong]);
      }),
    [cards],
  );

  if (cards.length === 0) {
    onDone();
    return null;
  }

  const card = cards[i];
  const correct = card.word.translation;

  function choose(opt: string) {
    if (picked) return;
    setPicked(opt);
    onGrade(card.word.id, opt === correct ? 5 : 2);
  }

  function next() {
    if (i + 1 >= cards.length) {
      onDone();
    } else {
      setI(i + 1);
      setPicked(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-white/40">
        Вопрос {i + 1} из {cards.length}
      </p>

      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold">
          {displayWord(card.word.article, card.word.lemma)}
        </span>
        <TtsButton text={card.word.lemma} />
      </div>
      <p className="text-sm text-white/45">Выбери перевод</p>

      <div className="grid w-full max-w-md gap-2">
        {options[i].map((opt) => {
          let cls = 'border-white/10 bg-white/5 hover:bg-white/10';
          if (picked) {
            if (opt === correct) cls = 'border-green-500 bg-green-500/15';
            else if (opt === picked) cls = 'border-red-500 bg-red-500/15';
            else cls = 'border-white/5 bg-white/[0.02] opacity-50';
          }
          return (
            <button
              key={opt}
              onClick={() => choose(opt)}
              disabled={!!picked}
              className={`rounded-xl border px-5 py-3 text-left transition ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {picked && (
        <button
          onClick={next}
          className="rounded-xl bg-brand px-8 py-3 font-semibold transition hover:bg-brand-dark"
        >
          {i + 1 >= cards.length ? 'Дальше →' : 'Следующее →'}
        </button>
      )}
    </div>
  );
}
