'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getBatch,
  getNextTextId,
  isLastInBatch,
  isInBatch,
  getBatchProgress,
  clearBatch,
  storeBatch,
} from '@/lib/client/batch';

type Mode = 'loading' | 'next' | 'last' | 'more' | 'solo';

export default function NextTextButton({
  currentTextId,
  topic,
}: {
  currentTextId: number;
  topic: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('loading');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInBatch(currentTextId)) {
      setProgress(getBatchProgress(currentTextId));
      if (isLastInBatch(currentTextId)) {
        setMode('last');
      } else {
        setMode('next');
      }
    } else {
      setMode('solo');
    }
  }, [currentTextId]);

  function goNext() {
    const nextId = getNextTextId(currentTextId);
    if (nextId) router.push(`/read/${nextId}`);
  }

  async function generateMore() {
    setGenerating(true);
    setError(null);
    const batch = getBatch();
    const topics = batch?.topicLabel
      ? batch.topicLabel.split(', ').filter(Boolean)
      : [topic];
    try {
      const res = await fetch('/api/ai/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics, count: 3 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Не удалось сгенерировать.');
        return;
      }
      const textIds: number[] = data.texts.map((t: { id: number }) => t.id);
      storeBatch(textIds, batch?.topicLabel ?? topic);
      if (textIds.length > 0) {
        router.push(`/read/${textIds[0]}`);
        router.refresh();
      }
    } catch {
      setError('Сеть недоступна');
    } finally {
      setGenerating(false);
    }
  }

  async function generateSingle() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Не удалось сгенерировать.');
        return;
      }
      router.push(`/read/${data.text.id}`);
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    } finally {
      setGenerating(false);
    }
  }

  if (mode === 'loading') return null;

  return (
    <div className="mt-10 flex flex-col items-center gap-3">
      {progress && (
        <div className="flex items-center gap-1.5">
          {Array.from({ length: progress.total }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i + 1 === progress.current
                  ? 'w-5 bg-brand'
                  : i + 1 < progress.current
                    ? 'w-2.5 bg-white/30'
                    : 'w-2.5 bg-white/10'
              }`}
            />
          ))}
          <span className="ml-1 text-xs text-white/30">
            {progress.current}/{progress.total}
          </span>
        </div>
      )}

      {mode === 'next' && (
        <button
          onClick={goNext}
          className="rounded-xl bg-brand px-8 py-3 font-semibold shadow-lg shadow-brand/25 transition hover:bg-brand-dark active:scale-95"
        >
          Следующий текст →
        </button>
      )}

      {mode === 'last' && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/3 px-6 py-5 text-center">
          <p className="text-sm text-white/50">Это последний текст в пачке</p>
          <div className="flex gap-3">
            <button
              onClick={generateMore}
              disabled={generating}
              className="rounded-xl bg-brand px-6 py-2.5 font-semibold shadow-lg shadow-brand/20 transition hover:bg-brand-dark active:scale-95 disabled:opacity-50"
            >
              {generating ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Пишу…
                </span>
              ) : (
                'Ещё 3 текста →'
              )}
            </button>
            <button
              onClick={() => { clearBatch(); setMode('solo'); }}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/40 transition hover:border-white/25 hover:text-white/70"
            >
              Хватит
            </button>
          </div>
        </div>
      )}

      {mode === 'solo' && (
        <button
          onClick={generateSingle}
          disabled={generating}
          className="rounded-xl bg-brand/15 border border-brand/25 px-8 py-3 font-semibold text-brand-light transition hover:bg-brand/25 active:scale-95 disabled:opacity-50"
        >
          {generating ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
              Пишу…
            </span>
          ) : (
            'Следующий текст по этой теме →'
          )}
        </button>
      )}

      {error && <p className="text-sm text-amber-400">{error}</p>}
    </div>
  );
}
