'use client';

import { useState } from 'react';

interface Account {
  id: number;
  label: string;
  isAdmin: boolean;
  isBanned: boolean;
}

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export default function AdminPanel({
  accounts: initial,
  currentUserId,
}: {
  accounts: Account[];
  currentUserId: number;
}) {
  const [accounts, setAccounts] = useState(initial);
  const [newLabel, setNewLabel] = useState('');
  const [newCode, setNewCode] = useState<{ label: string; code: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banning, setBanning] = useState<number | null>(null);
  const [seedLevel, setSeedLevel] = useState<string>('B1');
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  async function toggleBan(acc: Account) {
    setBanning(acc.id);
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: acc.id, banned: !acc.isBanned }),
      });
      if (res.ok) {
        setAccounts((prev) =>
          prev.map((a) => (a.id === acc.id ? { ...a, isBanned: !a.isBanned } : a)),
        );
      }
    } finally {
      setBanning(null);
    }
  }

  async function addAccount() {
    if (!newLabel.trim() || creating) return;
    setError(null);
    setCreating(true);
    setNewCode(null);
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Не удалось создать');
        return;
      }
      setAccounts((prev) => [
        ...prev,
        { id: data.id, label: data.label, isAdmin: false, isBanned: false },
      ]);
      setNewCode({ label: data.label, code: data.code });
      setNewLabel('');
    } finally {
      setCreating(false);
    }
  }

  async function seedWords() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/admin/seed-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: seedLevel, count: 50 }),
      });
      const data = await res.json();
      if (res.ok) setSeedResult(`✓ ${data.generated} слов добавлено (${seedLevel})`);
      else setSeedResult(`✗ ${data.error ?? 'Ошибка'}`);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="glass overflow-hidden rounded-2xl divide-y divide-white/5">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-medium">{acc.label}</span>
              {acc.id === currentUserId && (
                <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs text-brand-light">
                  это ты
                </span>
              )}
              {acc.isAdmin && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                  admin
                </span>
              )}
              {acc.isBanned && (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                  забанен
                </span>
              )}
            </div>
            {acc.id !== currentUserId && (
              <button
                onClick={() => toggleBan(acc)}
                disabled={banning === acc.id}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition active:scale-95 disabled:opacity-50 ${
                  acc.isBanned
                    ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                    : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                }`}
              >
                {banning === acc.id ? '…' : acc.isBanned ? 'Разбанить' : 'Забанить'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-5">
        <p className="mb-3 text-sm font-semibold">Добавить аккаунт</p>
        <div className="flex gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAccount()}
            placeholder="Метка (напр. friend_1)"
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-brand"
          />
          <button
            onClick={addAccount}
            disabled={creating || !newLabel.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold transition hover:bg-brand-dark active:scale-95 disabled:opacity-40"
          >
            {creating ? '…' : 'Создать'}
          </button>
        </div>

        {newCode && (
          <div className="mt-4 animate-fade-up rounded-xl border border-green-500/30 bg-green-500/8 p-4">
            <p className="text-xs font-medium text-green-400/70">
              ⚠️ Сохрани код для «{newCode.label}» — он больше не отобразится!
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-green-300">
              {newCode.code}
            </p>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}
      </div>

      <div className="glass rounded-2xl p-5">
        <p className="mb-3 text-sm font-semibold">База слов</p>
        <p className="mb-3 text-xs text-white/40">
          Генерирует 50 новых слов через AI для выбранного уровня и кэширует в БД.
        </p>
        <div className="flex gap-2">
          <select
            value={seedLevel}
            onChange={(e) => setSeedLevel(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-brand"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button
            onClick={seedWords}
            disabled={seeding}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold transition hover:bg-brand-dark active:scale-95 disabled:opacity-40"
          >
            {seeding ? '⏳ Генерирую…' : 'Сгенерировать 50 слов'}
          </button>
        </div>
        {seedResult && (
          <p className={`mt-3 text-sm ${seedResult.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
            {seedResult}
          </p>
        )}
      </div>
    </div>
  );
}
