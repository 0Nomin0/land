'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEVELS, type Level } from '@/lib/types';

interface Initial {
  level: Level;
  daily_goal: number;
  interests: string[];
  refined_topics: string[];
}

const LEVEL_HINTS: Record<Level, string> = {
  A1: 'Начинаю с нуля',
  A2: 'Базовые фразы',
  B1: 'Бытовое общение',
  B2: 'Уверенно общаюсь',
  C1: 'Свободно',
  C2: 'Почти как носитель',
};

const GOAL_OPTIONS = [5, 10, 15, 20];

export default function OnboardingWizard({ initial }: { initial: Initial | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [level, setLevel] = useState<Level>(initial?.level ?? 'A1');
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);
  const [interestInput, setInterestInput] = useState('');
  const [suggested, setSuggested] = useState<string[]>(initial?.refined_topics ?? []);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    initial?.refined_topics ?? [],
  );
  const [goal, setGoal] = useState<number>(initial?.daily_goal ?? 10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 5;

  function addInterest() {
    const v = interestInput.trim();
    if (v && !interests.includes(v)) setInterests([...interests, v]);
    setInterestInput('');
  }

  function toggleTopic(t: string) {
    setSelectedTopics((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  async function refine() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/refine-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests, level }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Не удалось уточнить темы. Можно продолжить со своими.');
        // fallback: используем сами интересы как темы
        setSuggested(interests);
        setSelectedTopics(interests);
      } else {
        setSuggested(data.topics);
        setSelectedTopics(data.topics);
      }
      setStep(3);
    } catch {
      setError('Сеть недоступна');
      setSuggested(interests);
      setSelectedTopics(interests);
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          daily_goal: goal,
          interests,
          refined_topics: selectedTopics.length ? selectedTopics : interests,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Ошибка сохранения');
        return;
      }
      router.replace('/learn');
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-10">
      {/* прогресс */}
      <div className="mb-8 flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i <= step ? 'bg-brand' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      <div className="flex-1">
        {/* Шаг 0: язык */}
        {step === 0 && (
          <Section title="Какой язык учим?" subtitle="Пока доступен немецкий — другие скоро.">
            <div className="grid gap-3">
              <button className="rounded-xl border-2 border-brand bg-brand/10 px-5 py-4 text-left text-lg font-semibold">
                🇩🇪 Немецкий
              </button>
              {['🇪🇸 Испанский', '🇫🇷 Французский'].map((l) => (
                <button
                  key={l}
                  disabled
                  className="cursor-not-allowed rounded-xl border border-white/10 px-5 py-4 text-left text-lg text-white/30"
                >
                  {l} <span className="text-sm">— скоро</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Шаг 1: уровень */}
        {step === 1 && (
          <Section title="Твой уровень немецкого?" subtitle="Можно изменить позже.">
            <div className="grid grid-cols-2 gap-3">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`rounded-xl border-2 px-4 py-4 text-left transition ${
                    level === l
                      ? 'border-brand bg-brand/10'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="text-xl font-bold">{l}</div>
                  <div className="text-sm text-white/55">{LEVEL_HINTS[l]}</div>
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Шаг 2: интересы */}
        {step === 2 && (
          <Section
            title="Что тебе интересно?"
            subtitle="Любые темы: хобби, работа, сериалы, путешествия… Слова будем подбирать под них."
          >
            <div className="flex gap-2">
              <input
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addInterest();
                  }
                }}
                placeholder="Например: футбол, кулинария, IT…"
                className="flex-1 rounded-lg border border-white/10 bg-black/30 px-4 py-2.5 outline-none focus:border-brand"
              />
              <button
                onClick={addInterest}
                className="rounded-lg bg-brand px-4 font-semibold transition hover:bg-brand-dark"
              >
                +
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {interests.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm"
                >
                  {t}
                  <button
                    onClick={() => setInterests(interests.filter((x) => x !== t))}
                    className="text-white/50 hover:text-white"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {interests.length === 0 && (
                <p className="text-sm text-white/40">Добавь хотя бы одну тему</p>
              )}
            </div>
          </Section>
        )}

        {/* Шаг 3: уточнённые темы */}
        {step === 3 && (
          <Section
            title="Уточним темы"
            subtitle="AI разбил твои интересы на точечные подтемы. Отметь, что хочешь учить."
          >
            <div className="flex flex-wrap gap-2">
              {suggested.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTopic(t)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    selectedTopics.includes(t)
                      ? 'border-brand bg-brand/15 text-white'
                      : 'border-white/15 text-white/60 hover:border-white/30'
                  }`}
                >
                  {selectedTopics.includes(t) ? '✓ ' : ''}
                  {t}
                </button>
              ))}
            </div>
            {error && <p className="mt-4 text-sm text-amber-400">{error}</p>}
          </Section>
        )}

        {/* Шаг 4: цель */}
        {step === 4 && (
          <Section title="Сколько слов в день?" subtitle="Реалистичная цель = стабильный прогресс.">
            <div className="grid grid-cols-2 gap-3">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={`rounded-xl border-2 px-4 py-5 text-center transition ${
                    goal === g
                      ? 'border-brand bg-brand/10'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="text-2xl font-bold">{g}</div>
                  <div className="text-sm text-white/55">слов/день</div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-white/55">Своё число:</span>
              <input
                type="number"
                min={1}
                max={50}
                value={goal}
                onChange={(e) => setGoal(Math.max(1, Math.min(50, Number(e.target.value))))}
                className="w-24 rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-brand"
              />
            </div>
          </Section>
        )}
      </div>

      {error && step !== 3 && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {/* навигация */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || loading}
          className="rounded-lg px-4 py-2 text-white/60 transition hover:bg-white/5 disabled:opacity-30"
        >
          ← Назад
        </button>

        <NextButton
          step={step}
          loading={loading}
          interestsCount={interests.length}
          selectedCount={selectedTopics.length}
          onNext={() => {
            if (step === 2) {
              refine();
            } else if (step === 4) {
              finish();
            } else {
              setStep((s) => s + 1);
            }
          }}
        />
      </div>
    </main>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mb-6 mt-1 text-white/55">{subtitle}</p>
      {children}
    </div>
  );
}

function NextButton({
  step,
  loading,
  interestsCount,
  selectedCount,
  onNext,
}: {
  step: number;
  loading: boolean;
  interestsCount: number;
  selectedCount: number;
  onNext: () => void;
}) {
  const disabled =
    loading ||
    (step === 2 && interestsCount === 0) ||
    (step === 3 && selectedCount === 0);

  const label =
    step === 2 ? (loading ? 'Уточняю…' : 'Уточнить темы →') : step === 4 ? (loading ? 'Сохраняю…' : 'Начать учёбу 🚀') : 'Далее →';

  return (
    <button
      onClick={onNext}
      disabled={disabled}
      className="rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-40"
    >
      {label}
    </button>
  );
}
