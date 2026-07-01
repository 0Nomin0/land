'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Неверный код доступа');
        setShake(true);
        setTimeout(() => setShake(false), 600);
        return;
      }
      router.replace('/learn');
      router.refresh();
    } catch {
      setError('Сеть недоступна, попробуй ещё раз');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="mb-10 text-center animate-fade-up">
        <h1 className="font-display text-5xl font-bold tracking-tight">
          Wort<span className="text-brand-light">land</span>
        </h1>
        <p className="mt-2 text-sm text-white/35">Немецкий через интерес</p>
      </div>

      <div className="glass animate-scale-in rounded-2xl p-8 shadow-2xl shadow-brand/10">
        <h2 className="mb-1 font-display text-xl font-semibold">Добро пожаловать</h2>
        <p className="mb-6 text-sm text-white/40">Введи код доступа</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="••••••••••"
            className={`w-full rounded-xl border bg-black/30 px-4 py-3 text-center text-2xl tracking-[0.3em] outline-none transition focus:ring-1 focus:ring-brand/30 ${
              shake ? 'animate-wiggle border-red-500/50' : 'border-white/10 focus:border-brand'
            }`}
          />
          {error && (
            <p className="animate-fade-up rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-3 font-semibold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Проверяю…
              </span>
            ) : (
              'Войти →'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
