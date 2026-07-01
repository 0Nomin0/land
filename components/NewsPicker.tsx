'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const COUNTRIES: [string, string][] = [
  ['Deutschland', '🇩🇪'],
  ['Österreich', '🇦🇹'],
  ['Schweiz', '🇨🇭'],
  ['USA', '🇺🇸'],
  ['Großbritannien', '🇬🇧'],
  ['Frankreich', '🇫🇷'],
  ['Ukraine', '🇺🇦'],
  ['Polen', '🇵🇱'],
  ['Italien', '🇮🇹'],
  ['Spanien', '🇪🇸'],
  ['Japan', '🇯🇵'],
  ['China', '🇨🇳'],
];

export default function NewsPicker() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(country: string) {
    if (busy) return;
    setError(null);
    setBusy(country);
    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Не удалось собрать новости. Попробуй ещё раз.');
        return;
      }
      router.push(`/read/${data.text.id}`);
      router.refresh();
    } catch {
      setError('Сеть недоступна');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {COUNTRIES.map(([name, flag]) => (
          <button
            key={name}
            onClick={() => pick(name)}
            disabled={!!busy}
            className={`glass flex items-center gap-2 rounded-xl px-4 py-3 text-left transition active:scale-95 disabled:opacity-40 ${
              busy === name ? 'border-brand bg-brand/20' : 'hover:border-brand/40'
            }`}
          >
            <span className="text-2xl">{flag}</span>
            <span className="font-medium">
              {busy === name ? 'Собираю…' : name}
            </span>
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-amber-400">{error}</p>}
    </div>
  );
}
