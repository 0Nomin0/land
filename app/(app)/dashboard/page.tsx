import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getProfile } from '@/lib/profile';
import { getStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const profile = getProfile(user.id);
  if (!profile || !profile.onboarding_done) redirect('/onboarding');

  const s = getStats(user.id);

  const cards = [
    { label: 'Слов в изучении', value: s.total, icon: '📚' },
    { label: 'Выучено', value: s.known, icon: '✅' },
    { label: 'На повторении', value: s.review, icon: '🔁' },
    { label: 'Новые/учатся', value: s.learning, icon: '🌱' },
    { label: 'Готовы к повтору', value: s.dueNow, icon: '⏰' },
    { label: 'Серия дней', value: s.streakDays, icon: '🔥' },
  ];

  return (
    <div className="px-4 py-8">
      <h1 className="text-2xl font-bold">Привет, {user.email.split('@')[0]} 👋</h1>
      <p className="mt-1 text-white/55">
        Уровень {profile.level} · цель {profile.daily_goal} слов/день
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <div className="text-2xl">{c.icon}</div>
            <div className="mt-2 text-3xl font-bold">{c.value}</div>
            <div className="text-sm text-white/50">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm text-white/60">
          Сегодня проработано повторов: <b className="text-white">{s.reviewedToday}</b>
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/learn" className="rounded-lg bg-brand px-5 py-2.5 font-semibold">
          Учить новые →
        </Link>
        {s.dueNow > 0 && (
          <Link
            href="/review"
            className="rounded-lg border border-white/15 px-5 py-2.5"
          >
            Повторить ({s.dueNow})
          </Link>
        )}
        <Link
          href="/onboarding"
          className="rounded-lg border border-white/15 px-5 py-2.5 text-white/70"
        >
          Настройки обучения
        </Link>
      </div>
    </div>
  );
}
