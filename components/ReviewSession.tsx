'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SrsCard } from '@/lib/types';
import Flashcard from './games/Flashcard';

export default function ReviewSession({
  initialCards,
}: {
  initialCards: SrsCard[];
}) {
  const [done, setDone] = useState(false);
  const total = initialCards.length;

  // В повторении оценка применяется сразу (одна фаза).
  function grade(wordId: number, g: number) {
    fetch('/api/review/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wordId, grade: g }),
    }).catch(() => {});
  }

  if (done)
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-2xl font-bold">Повторение закрыто! ✅</p>
        <p className="mt-2 text-white/55">Слов повторено: {total}</p>
        <div className="mt-6 flex gap-3">
          <Link href="/learn" className="rounded-lg bg-brand px-5 py-2 font-semibold">
            Учить новые →
          </Link>
          <Link href="/read" className="rounded-lg border border-white/15 px-5 py-2">
            Тексты
          </Link>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-center text-lg font-semibold text-white/70">
        Повторение · {total} слов
      </h1>
      <Flashcard cards={initialCards} onGrade={grade} onDone={() => setDone(true)} />
    </div>
  );
}
