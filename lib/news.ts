import 'server-only';

const TIMEOUT_MS = 9000;

/** Декодирование базовых HTML/XML-сущностей. */
function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Реальные немецкоязычные заголовки по стране через Google News RSS.
 * Возвращает до `limit` заголовков. Ошибки/таймаут → [].
 */
export async function fetchHeadlines(query: string, limit = 6): Promise<string[]> {
  const url =
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent(query) +
    '&hl=de&gl=DE&ceid=DE:de';

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 Wortland/1.0' },
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    const titles: string[] = [];
    for (const it of items) {
      const m = it[1].match(/<title>([\s\S]*?)<\/title>/);
      if (!m) continue;
      let title = decode(m[1]);
      // Google News добавляет «… - Источник» — отрежем источник
      title = title.replace(/\s+-\s+[^-]+$/, '').trim();
      if (title) titles.push(title);
      if (titles.length >= limit) break;
    }
    return titles;
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}
