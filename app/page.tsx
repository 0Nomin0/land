import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';

const SAMPLE = [
  ['der', 'Wein', 'вино'],
  ['die', 'Nacht', 'ночь'],
  ['das', 'Feuer', 'огонь'],
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-10 px-5 py-14 sm:gap-12 sm:py-20">
      {/* герой */}
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="animate-fade-up rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-sm text-brand-light">
          🇩🇪 Немецкий · персонально под тебя
        </span>

        <h1 className="animate-fade-up delay-1 max-w-3xl text-balance font-display text-4xl font-bold leading-[1.07] tracking-tight sm:text-6xl">
          Учи слова, которые тебе{' '}
          <span className="bg-gradient-to-r from-brand-light via-brand-glow to-brand bg-clip-text text-transparent">
            действительно интересны
          </span>
        </h1>

        <p className="animate-fade-up delay-2 max-w-xl text-lg text-white/55">
          Выбираешь уровень и темы — AI подбирает слова, мини-игры помогают их
          запомнить, а интервальное повторение не даёт забыть. В конце — тексты по
          твоим темам с переводом по клику и озвучкой.
        </p>

        <div className="animate-fade-up delay-3 flex flex-wrap items-center justify-center gap-4 pt-2">
          {user ? (
            <Link
              href="/learn"
              className="rounded-xl bg-brand px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark hover:shadow-brand/50"
            >
              Продолжить учёбу →
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-xl bg-brand px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark hover:shadow-brand/50"
              >
                Начать бесплатно
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/15 px-8 py-3.5 text-lg font-semibold text-white/80 transition hover:border-brand/40 hover:bg-white/5"
              >
                Войти
              </Link>
            </>
          )}
        </div>
      </div>

      {/* плавающие карточки-образцы */}
      <div className="animate-fade-up delay-4 flex flex-wrap justify-center gap-4">
        {SAMPLE.map(([art, word, tr], i) => (
          <div
            key={word}
            className="glass animate-fade-up w-44 rounded-2xl p-5 text-left"
            style={{ animationDelay: `${0.3 + i * 0.08}s` }}
          >
            <span className="text-xs text-brand-light">{art}</span>
            <div className="font-display text-2xl font-bold">{word}</div>
            <div className="mt-1 text-sm text-white/50">{tr}</div>
          </div>
        ))}
      </div>

      {/* фичи */}
      <div className="grid w-full gap-4 sm:grid-cols-3">
        {[
          ['🎯', 'Под твой уровень', 'A1–C2 и твои интересы определяют подборку слов'],
          ['🧠', 'Не забудешь', 'Алгоритм SM-2 напоминает слова точно перед забыванием'],
          ['📖', 'Тексты по темам', 'Читаешь — кликаешь слово — видишь перевод и слышишь'],
        ].map(([icon, title, text], i) => (
          <div
            key={title}
            className={`glass animate-fade-up rounded-2xl p-5 text-left transition hover:-translate-y-1 hover:border-brand/30 delay-${i + 2}`}
          >
            <div className="text-2xl">{icon}</div>
            <h3 className="mt-2 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-white/55">{text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
