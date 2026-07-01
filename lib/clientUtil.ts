// Утилиты, безопасные для клиента (без server-only зависимостей).

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Нормализация немецкого ввода: нижний регистр, без артикля и лишних пробелов. */
export function normalizeGerman(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/^(der|die|das)\s+/, '')
    .replace(/\s+/g, ' ');
}

/** Полная форма слова с артиклем для показа. */
export function displayWord(article: string | null, lemma: string): string {
  return article ? `${article} ${lemma}` : lemma;
}
