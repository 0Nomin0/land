'use client';

import { useMemo, useState } from 'react';
import { displayWord, shuffle } from '@/lib/clientUtil';
import type { SrsCard } from '@/lib/types';
import type { GameProps } from './types';

const BATCH = 5;

export default function Match({ cards, onGrade, onDone }: GameProps) {
  // Разбиваем на батчи по BATCH пар.
  const batches = useMemo(() => {
    const chunks: SrsCard[][] = [];
    for (let i = 0; i < cards.length; i += BATCH) {
      chunks.push(cards.slice(i, i + BATCH));
    }
    return chunks;
  }, [cards]);

  const [batchIdx, setBatchIdx] = useState(0);

  if (cards.length === 0 || batches.length === 0) {
    onDone();
    return null;
  }

  const batch = batches[batchIdx];

  return (
    <MatchBatch
      key={batchIdx}
      batch={batch}
      onGrade={onGrade}
      onBatchDone={() => {
        if (batchIdx + 1 >= batches.length) onDone();
        else setBatchIdx(batchIdx + 1);
      }}
      progress={`Группа ${batchIdx + 1} из ${batches.length}`}
    />
  );
}

function MatchBatch({
  batch,
  onGrade,
  onBatchDone,
  progress,
}: {
  batch: SrsCard[];
  onGrade: (wordId: number, grade: number) => void;
  onBatchDone: () => void;
  progress: string;
}) {
  const left = useMemo(() => shuffle(batch), [batch]);
  const right = useMemo(() => shuffle(batch), [batch]);

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  // штрафуем оценку только при первой ошибке по слову
  const [erred, setErred] = useState<Set<number>>(new Set());

  function clickLeft(id: number) {
    if (matched.has(id)) return;
    setSelectedLeft(id);
    setWrong(null);
  }

  function clickRight(id: number) {
    if (matched.has(id) || selectedLeft === null) return;
    if (id === selectedLeft) {
      const next = new Set(matched).add(id);
      setMatched(next);
      onGrade(id, erred.has(id) ? 3 : 4);
      setSelectedLeft(null);
      if (next.size === batch.length) {
        setTimeout(onBatchDone, 400);
      }
    } else {
      setWrong(id);
      setErred((prev) => new Set(prev).add(selectedLeft));
      onGrade(selectedLeft, 2);
      setTimeout(() => setWrong(null), 500);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-white/40">{progress} · соедини пары</p>
      <div className="grid w-full max-w-xl grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {left.map((c) => (
            <button
              key={c.word.id}
              onClick={() => clickLeft(c.word.id)}
              disabled={matched.has(c.word.id)}
              className={`rounded-xl border px-4 py-3 text-center font-medium transition ${
                matched.has(c.word.id)
                  ? 'border-green-500/40 bg-green-500/10 text-white/40'
                  : selectedLeft === c.word.id
                    ? 'border-brand bg-brand/15'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              {displayWord(c.word.article, c.word.lemma)}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {right.map((c) => (
            <button
              key={c.word.id}
              onClick={() => clickRight(c.word.id)}
              disabled={matched.has(c.word.id)}
              className={`rounded-xl border px-4 py-3 text-center transition ${
                matched.has(c.word.id)
                  ? 'border-green-500/40 bg-green-500/10 text-white/40'
                  : wrong === c.word.id
                    ? 'border-red-500 bg-red-500/15'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              {c.word.translation}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
