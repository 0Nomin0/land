'use client';

import { useEffect, useState } from 'react';
import TtsButton from '@/components/TtsButton';
import { displayWord } from '@/lib/clientUtil';
import type { GameProps } from './types';

const RATINGS = [
  { label: 'Не помню', grade: 1, color: 'bg-red-500/20 hover:bg-red-500/30 text-red-200' },
  { label: 'Трудно', grade: 3, color: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200' },
  { label: 'Норм', grade: 4, color: 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-200' },
  { label: 'Легко', grade: 5, color: 'bg-green-500/20 hover:bg-green-500/30 text-green-200' },
];

export default function Flashcard({ cards, onGrade, onDone, onKnow }: GameProps) {
  // Отслеживаем текущее слово по ID (не по индексу) — индекс нестабилен при фильтрации
  const [currentId, setCurrentId] = useState<number | null>(cards[0]?.word.id ?? null);
  const [flipped, setFlipped] = useState(false);
  const [waiting, setWaiting] = useState(false);

  // Когда карточки появляются (например замена пришла) и currentId не установлен — берём первую
  useEffect(() => {
    if (currentId === null && cards.length > 0) {
      setCurrentId(cards[0].word.id);
    }
  }, [cards, currentId]);

  if (cards.length === 0) {
    if (waiting) {
      return (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-brand" />
          <p className="text-sm text-white/40">Ищу следующее слово…</p>
        </div>
      );
    }
    onDone();
    return null;
  }

  const idx = cards.findIndex((c) => c.word.id === currentId);
  const card = idx >= 0 ? cards[idx] : cards[0];
  const word = card.word;
  const displayIdx = idx >= 0 ? idx : 0;

  function advance() {
    const nextIdx = displayIdx + 1;
    if (nextIdx >= cards.length) onDone();
    else {
      setCurrentId(cards[nextIdx].word.id);
      setFlipped(false);
    }
  }

  function rate(grade: number) {
    onGrade(word.id, grade);
    advance();
  }

  async function know() {
    if (waiting) return;

    // Запоминаем что идёт после текущего — до того как карточка исчезнет из массива
    const nextCard = displayIdx + 1 < cards.length ? cards[displayIdx + 1] : null;
    setCurrentId(nextCard?.word.id ?? null);
    setFlipped(false);
    setWaiting(true);

    try {
      await onKnow?.(word.id);
      // После await:
      // – родитель добавил замену в конец cards
      // – если текущего nextCard нет (были последними) — currentId=null,
      //   useEffect поставит его на замену когда она придёт
    } finally {
      setWaiting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-7">
      <p className="text-sm tracking-wide text-white/40">
        Карточка {displayIdx + 1} / {cards.length}
      </p>

      <div className="flip-scene w-full max-w-md">
        <div
          key={word.id}
          onClick={() => !waiting && setFlipped((f) => !f)}
          className={`flip-card animate-scale-in min-h-[240px] cursor-pointer ${
            flipped ? 'is-flipped' : ''
          }`}
        >
          {/* лицо */}
          <div className="flip-face glass flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-3xl p-8 text-center">
            {waiting ? (
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-brand" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {word.article && (
                    <span className="rounded-md bg-brand/20 px-2 py-0.5 text-sm text-brand-light">
                      {word.article}
                    </span>
                  )}
                  <span className="font-display text-4xl font-bold">{word.lemma}</span>
                  <TtsButton text={word.lemma} />
                </div>
                {word.transcription && (
                  <span className="font-mono text-sm text-white/40">
                    [{word.transcription}]
                  </span>
                )}
                {word.example && (
                  <p className="text-sm italic text-white/45">{word.example}</p>
                )}
                <p className="mt-3 text-xs text-white/30">нажми, чтобы перевернуть</p>
              </>
            )}
          </div>

          {/* оборот */}
          <div className="flip-face flip-back glass flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-3xl border-brand/30 p-8 text-center">
            <span className="font-display text-4xl font-bold text-brand-light">
              {word.translation}
            </span>
            <span className="text-sm text-white/40">
              {displayWord(word.article, word.lemma)}
            </span>
            {word.example && (
              <p className="mt-2 text-sm italic text-white/40">{word.example}</p>
            )}
          </div>
        </div>
      </div>

      {!waiting && (
        flipped ? (
          <div className="grid w-full max-w-md animate-fade-up grid-cols-2 gap-2 sm:grid-cols-4">
            {RATINGS.map((r) => (
              <button
                key={r.grade}
                onClick={() => rate(r.grade)}
                className={`rounded-xl py-3 text-sm font-medium transition active:scale-95 ${r.color}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setFlipped(true)}
              className="rounded-xl bg-brand px-8 py-3 font-semibold shadow-lg shadow-brand/25 transition hover:bg-brand-dark active:scale-95"
            >
              Показать перевод
            </button>
            {onKnow && (
              <button
                onClick={know}
                className="rounded-lg px-4 py-2 text-sm text-white/45 transition hover:text-white"
              >
                ✓ Я уже знаю это слово
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
