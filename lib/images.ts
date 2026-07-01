import 'server-only';

export interface FoundImage {
  url: string;
  attribution: string; // «Автор / Источник»
  link: string; // ссылка на оригинал
}

const TIMEOUT_MS = 8000;

async function fetchJson(url: string, headers?: Record<string, string>) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Ищет иллюстративное фото по запросу.
 * 1) Unsplash (если задан UNSPLASH_ACCESS_KEY) — лучшее качество.
 * 2) Openverse — keyless-фолбэк, тоже реальные фото.
 * Любая ошибка → null (текст просто будет без картинки).
 */
export async function findImage(query: string): Promise<FoundImage | null> {
  const q = query.trim();
  if (!q) return null;

  const unsplash = await tryUnsplash(q);
  if (unsplash) return unsplash;

  return tryOpenverse(q);
}

async function tryUnsplash(q: string): Promise<FoundImage | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const url =
    'https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&query=' +
    encodeURIComponent(q);
  const data = await fetchJson(url, { Authorization: `Client-ID ${key}` });
  const photo = data?.results?.[0];
  if (!photo?.urls?.regular) return null;

  return {
    url: photo.urls.regular,
    attribution: `${photo.user?.name ?? 'Unsplash'} / Unsplash`,
    link: photo.links?.html ?? 'https://unsplash.com',
  };
}

async function tryOpenverse(q: string): Promise<FoundImage | null> {
  const url =
    'https://api.openverse.org/v1/images/?page_size=1&mature=false&q=' +
    encodeURIComponent(q);
  const data = await fetchJson(url, { 'User-Agent': 'Wortland/1.0' });
  const img = data?.results?.[0];
  if (!img?.url) return null;

  return {
    url: img.url,
    attribution: `${img.creator ?? 'Openverse'} / Openverse`,
    link: img.foreign_landing_url ?? img.url,
  };
}
