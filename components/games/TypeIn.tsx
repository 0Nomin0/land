'use client';

import { useState } from 'react';
import TtsButton from '@/components/TtsButton';
import { displayWord, normalizeGerman } from '@/lib/clientUtil';
import type { GameProps } from './types';

export default function TypeIn({ cards, onGrade, onDone }: GameProps) {
  const [i, setI] = useState(0);
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState<null | boolean>(null);

  if (cards.length === 0) {
    onDone();
    return null;
  }

  const card = cards[i];
  const word = card.word;

  function check() {
    if (checked !== null) return;
    const ok = normalizeGerman(value) === normalizeGerman(word.lemma);
    setChecked(ok);
    onGrade(word.id, ok ? 5 : 2);
  }

  function next() {
    if (i + 1 >= cards.length) {
      onDone();
    } else {
      setI(i + 1);
      setValue('');
      setChecked(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-white/40">
        {i + 1} из {cards.length}
      </p>

      <div className="text-center">
        <p className="text-sm text-white/45">Как по-немецки:</p>
        <p className="mt-1 text-3xl font-bold text-brand-light">{word.translation}</p>
      </div>

      <div className="flex w-full max-w-md items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (checked === null ? check : next)();
          }}
          placeholder="Напиши слово…"
          disabled={checked !== null}
          className={`flex-1 rounded-lg border bg-black/30 px-4 py-3 text-lg outline-none ${
            checked === null
              ? 'border-white/10 focus:border-brand'
              : checked
                ? 'border-green-500'
                : 'border-red-500'
          }`}
        />
        <TtsButton text={word.lemma} />
      </div>

      {checked !== null && (
        <div className="text-center">
          {checked ? (
            <p className="text-green-400">Верно! 🎉</p>
          ) : (
            <p className="text-red-400">
              Правильно: <b>{displayWord(word.article, word.lemma)}</b>
            </p>
          )}
        </div>
      )}

      {checked === null ? (
        <button
          onClick={check}
          disabled={!value.trim()}
          className="rounded-xl bg-brand px-8 py-3 font-semibold transition hover:bg-brand-dark disabled:opacity-40"
        >
          Проверить
        </button>
      ) : (
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
