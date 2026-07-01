const BATCH_KEY = 'wl_batch';

export interface Batch {
  textIds: number[];
  topicLabel: string;
}

export function storeBatch(textIds: number[], topicLabel: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BATCH_KEY, JSON.stringify({ textIds, topicLabel }));
}

export function getBatch(): Batch | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BATCH_KEY);
    return raw ? (JSON.parse(raw) as Batch) : null;
  } catch {
    return null;
  }
}

export function clearBatch(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BATCH_KEY);
}

export function getNextTextId(currentId: number): number | null {
  const batch = getBatch();
  if (!batch) return null;
  const idx = batch.textIds.indexOf(currentId);
  if (idx === -1 || idx >= batch.textIds.length - 1) return null;
  return batch.textIds[idx + 1];
}

export function isLastInBatch(currentId: number): boolean {
  const batch = getBatch();
  if (!batch) return false;
  const idx = batch.textIds.indexOf(currentId);
  return idx !== -1 && idx === batch.textIds.length - 1;
}

export function isInBatch(currentId: number): boolean {
  const batch = getBatch();
  if (!batch) return false;
  return batch.textIds.includes(currentId);
}

export function getBatchProgress(currentId: number): { current: number; total: number } | null {
  const batch = getBatch();
  if (!batch) return null;
  const idx = batch.textIds.indexOf(currentId);
  if (idx === -1) return null;
  return { current: idx + 1, total: batch.textIds.length };
}
