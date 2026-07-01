'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { SrsCard } from '@/lib/types';
import Flashcard from './games/Flashcard';
import Quiz from './games/Quiz';
import TypeIn from './games/TypeIn';
import Match from './games/Match';
import DailyWordList from './DailyWordList';
import type { GameProps } from './games/types';

type Phase = {
  key: string;
  title: string;
  Comp: (p: GameProps) => React.ReactNode;
};

const ALL_PHASES: Phase[] = [
  { key: 'flash', title: 'Знакомство', Comp: Flashcard },
  { key: 'quiz', title: 'Выбор перевода', Comp: Quiz },
  { key: 'type', title: 'Набор слова', Comp: TypeIn },
  { key: 'match', title: 'Сопоставление', Comp: Match },
];

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'playing'; cards: SrsCard[] }
  | { kind: 'saving' }
  | { kind: 'done'; count: number };

export default function LearnSession() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [addingMore, setAddingMore] = useState(false);
  const [knownVersion, setKnownVersion] = useState(0); // триггер ре-рендера при знаю
  const grades = useRef<Map<number, number[]>>(new Map());
  const knownIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    grades.current.clear();
    knownIds.current.clear();

    (async () => {
      try {
        const res = await fetch('/api/session/today');
        if (res.status === 409) {
          window.location.href = '/onboarding';
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({
            kind: 'error',
            message:
              data.message ??
              (data.error === 'ai'
                ? 'AI временно недоступен. Проверь ключ ANTHROPIC_API_KEY.'
                : 'Не удалось загрузить сессию'),
          });
          return;
        }
        const cards: SrsCard[] = [...data.newCards, ...data.reviewCards];
        const seen = new Set<number>();
        const unique = cards.filter((c) =>
          seen.has(c.word.id) ? false : (seen.add(c.word.id), true),
        );
        if (unique.length === 0) setState({ kind: 'empty' });
        else setState({ kind: 'playing', cards: unique });
      } catch {
        if (!cancelled) setState({ kind: 'error', message: 'Сеть недоступна' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  const phases = useMemo(() => {
    if (state.kind !== 'playing') return ALL_PHASES;
    return ALL_PHASES.filter((p) =>
      p.key === 'match' ? state.cards.length >= 2 : true,
    );
  }, [state]);

  function recordGrade(wordId: number, grade: number) {
    const m = grades.current;
    if (!m.has(wordId)) m.set(wordId, []);
    m.get(wordId)!.push(grade);
  }

  async function recordKnown(wordId: number): Promise<void> {
    // Сразу помечаем как знаю — ре-рендер уберёт карточку из вида
    grades.current.delete(wordId);
    knownIds.current.add(wordId);
    setKnownVersion((v) => v + 1); // форс ре-рендер чтобы фильтр применился

    try {
      const res = await fetch('/api/words/know', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.replacement) {
          // Добавляем замену — Flashcard увидит её и покажет (i не менялся)
          setState((prev) => {
            if (prev.kind !== 'playing') return prev;
            const alreadyHas = prev.cards.some((c) => c.word.id === data.replacement.word.id);
            return alreadyHas ? prev : { ...prev, cards: [...prev.cards, data.replacement] };
          });
        }
      }
    } catch {
      /* слово уже помечено как знаю — ничего страшного */
    }
    // Promise resolves → Flashcard выходит из waiting, проверяет cards
  }

  async function nextPhase() {
    if (state.kind !== 'playing') return;
    if (phaseIdx + 1 < phases.length) {
      setPhaseIdx(phaseIdx + 1);
      return;
    }
    setState({ kind: 'saving' });
    const entries = [...grades.current.entries()];
    for (const [wordId, gs] of entries) {
      const avg = Math.round(gs.reduce((a, b) => a + b, 0) / gs.length);
      await fetch('/api/review/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId, grade: avg }),
      }).catch(() => {});
    }
    await fetch('/api/session/complete', { method: 'POST' }).catch(() => {});
    setState({ kind: 'done', count: entries.length });
  }

  async function addMoreWords(count: number) {
    setAddingMore(true);
    try {
      const res = await fetch('/api/session/add-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      if (res.ok) {
        const data = await res.json();
        const newCards: SrsCard[] = data.cards ?? [];
        if (newCards.length > 0) {
          // Только новые слова — без повторения уже выученных
          grades.current.clear();
          knownIds.current.clear();
          setPhaseIdx(0);
          setState({ kind: 'playing', cards: newCards });
        }
      }
    } finally {
      setAddingMore(false);
    }
  }

  if (state.kind === 'loading')
    return (
      <Centered>
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-brand" />
        <p className="mt-3 text-white/50">Готовлю слова на сегодня…</p>
      </Centered>
    );

  if (state.kind === 'saving')
    return (
      <Centered>
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-brand" />
        <p className="mt-3 text-white/50">Сохраняю прогресс…</p>
      </Centered>
    );

  if (state.kind === 'error')
    return (
      <Centered>
        <p className="text-red-400">{state.message}</p>
        <button
          onClick={() => setSessionKey((k) => k + 1)}
          className="mt-4 rounded-lg bg-brand px-5 py-2 font-semibold"
        >
          Повторить
        </button>
      </Centered>
    );

  if (state.kind === 'empty')
    return (
      <DailyWordList
        onLearnMore={() => addMoreWords(5)}
        addingMore={addingMore}
      />
    );

  if (state.kind === 'done')
    return (
      <DailyWordList
        onLearnMore={() => addMoreWords(5)}
        addingMore={addingMore}
      />
    );

  // playing
  const phase = phases[phaseIdx];
  const Comp = phase.Comp;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-center gap-1.5">
        {phases.map((p, idx) => (
          <span
            key={p.key}
            className={`flex h-7 items-center rounded-full px-2.5 text-xs transition ${
              idx === phaseIdx
                ? 'bg-brand text-white'
                : idx < phaseIdx
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-white/5 text-white/40'
            }`}
          >
            {idx < phaseIdx ? '✓ ' : ''}
            {p.title}
          </span>
        ))}
      </div>

      <Comp
        key={`${phase.key}-${knownVersion}`}
        cards={state.cards.filter((c) => !knownIds.current.has(c.word.id))}
        onGrade={recordGrade}
        onDone={nextPhase}
        onKnow={phase.key === 'flash' ? recordKnown : undefined}
      />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  );
}
