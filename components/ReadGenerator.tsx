'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { storeBatch } from '@/lib/client/batch';

export default function ReadGenerator({ topics }: { topics: string[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [extraTopics, setExtraTopics] = useState<string[]>([]);
  const [progress, setProgress] = useState<string | null>(null);

  const allTopics = [...topics, ...extraTopics];

  function toggle(t: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function addCustom() {
    const t = custom.trim();
    if (!t) return;
    if (!allTopics.includes(t)) {
      setExtraTopics((prev) => [...prev, t]);
    }
    setSelected((prev) => new Set([...prev, t]));
    setCustom('');
  }

  async function generate() {
    if (busy || selected.size === 0) return;
    setError(null);
    setBusy(true);
    setProgress('Запускаю генерацию…');
    try {
      const topicList = [...selected];
      setProgress(`Пишу ${Math.min(topicList.length * 1, 3)} текста на тему «${topicList.join(', ')}»…`);
      const res = await fetch('/api/ai/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics: topicList, count: 3 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Не удалось сгенерировать тексты.');
        return;
      }
      const textIds: number[] = data.texts.map((t: { id: number }) => t.id);
      storeBatch(textIds, topicList.join(', '));
      if (textIds.length > 0) {
        router.push(`/read/${textIds[0]}`);
        router.refresh();
      }
    } catch {
      setError('Сеть недоступна');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="glass mt-6 rounded-2xl p-5">
      <p className="mb-1 text-sm font-semibold text-white/80">Выбери темы</p>
      <p className="mb-4 text-xs text-white/40">
        Можно выбрать несколько — сгенерируем 3 текста сразу
      </p>

      <div className="flex flex-wrap gap-2">
        {allTopics.map((t, i) => {
          const on = selected.has(t);
          return (
            <button
              key={t}
              onClick={() => toggle(t)}
              disabled={busy}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`animate-fade-up rounded-full border px-3.5 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-50 ${
                on
                  ? 'border-brand bg-brand text-white shadow-md shadow-brand/30'
                  : 'border-brand/25 bg-brand/8 text-brand-light hover:border-brand/60 hover:bg-brand/18'
              }`}
            >
              {on ? '✓ ' : ''}{t}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Своя тема (Enter чтобы добавить)…"
          maxLength={60}
          disabled={busy}
          className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-brand disabled:opacity-50"
        />
        <button
          onClick={addCustom}
          disabled={busy || !custom.trim()}
          className="rounded-lg bg-white/8 px-4 text-sm font-medium transition hover:bg-white/15 disabled:opacity-40"
        >
          +
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={generate}
          disabled={busy || selected.size === 0}
          className={`rounded-xl px-6 py-2.5 font-semibold transition active:scale-95 ${
            selected.size > 0
              ? 'bg-brand text-white shadow-lg shadow-brand/25 hover:bg-brand-dark'
              : 'bg-white/8 text-white/40'
          } disabled:opacity-60`}
        >
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Пишу…
            </span>
          ) : selected.size > 0 ? (
            `Сгенерировать 3 текста →`
          ) : (
            'Выбери тему'
          )}
        </button>

        {selected.size > 0 && !busy && (
          <span className="text-xs text-white/40">
            выбрано: {[...selected].join(', ')}
          </span>
        )}
      </div>

      {progress && (
        <p className="mt-3 animate-fade-up text-xs text-white/50">{progress}</p>
      )}
      {error && (
        <p className="mt-3 animate-fade-up text-sm text-amber-400">{error}</p>
      )}
    </div>
  );
}
