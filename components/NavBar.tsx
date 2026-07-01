'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const BASE_LINKS: [string, string, string][] = [
  ['/learn', 'Учить', '🎯'],
  ['/review', 'Повтор', '🔁'],
  ['/read', 'Тексты', '📖'],
  ['/news', 'Новости', '📰'],
  ['/words', 'Слова', '📒'],
  ['/dashboard', 'Прогресс', '📊'],
];

export default function NavBar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const links: [string, string, string][] = isAdmin
    ? [...BASE_LINKS, ['/admin', 'Админ', '🔑']]
    : BASE_LINKS;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-brand/15 bg-ink/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
        <Link
          href="/learn"
          className="shrink-0 font-display text-base font-bold tracking-tight text-brand-light sm:text-lg"
        >
          Wort<span className="text-white">land</span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1">
          {links.map(([href, label, icon]) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition sm:px-3 ${
                  active ? 'bg-brand/20 text-white' : 'text-white/55 hover:text-white'
                }`}
              >
                <span className="text-base">{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={logout}
            aria-label="Выйти"
            className="rounded-lg px-2 py-1.5 text-white/40 transition hover:text-white"
          >
            ↩
          </button>
        </div>
      </nav>
    </header>
  );
}
