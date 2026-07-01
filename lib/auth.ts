import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';
import type { User } from './types';

const SESSION_COOKIE = 'wl_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

interface AccountRow {
  id: number;
  email: string;
  password_hash: string;
  is_admin: number;
  is_banned: number;
}

/** Найти аккаунт по коду доступа (перебираем все незабаненные). */
export async function findUserByCode(code: string): Promise<User | null> {
  const rows = db
    .prepare('SELECT id, email, password_hash, is_admin, is_banned FROM users WHERE is_banned = 0')
    .all() as unknown as AccountRow[];
  for (const row of rows) {
    if (await bcrypt.compare(code, row.password_hash)) {
      return { id: row.id, email: row.email };
    }
  }
  return null;
}

/** Список всех аккаунтов для Admin-панели. */
export function listAccounts(): { id: number; label: string; isAdmin: boolean; isBanned: boolean }[] {
  const rows = db
    .prepare('SELECT id, email, is_admin, is_banned FROM users ORDER BY id')
    .all() as unknown as AccountRow[];
  return rows.map((r) => ({
    id: r.id,
    label: r.email,
    isAdmin: r.is_admin === 1,
    isBanned: r.is_banned === 1,
  }));
}

/** Создать новый аккаунт (через Admin). Возвращает plaintext-код (показывается один раз). */
export async function createAccount(label: string): Promise<{ id: number; code: string }> {
  const code = randomBytes(6).toString('base64url').slice(0, 9);
  const hash = await bcrypt.hash(code, 10);
  const info = db
    .prepare(
      'INSERT INTO users (email, password_hash, is_admin, is_banned, created_at) VALUES (?, ?, 0, 0, ?)',
    )
    .run(label, hash, Date.now());
  return { id: Number(info.lastInsertRowid), code };
}

/** Установить статус бана. */
export function setAccountBanned(userId: number, banned: boolean): void {
  db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(banned ? 1 : 0, userId);
}

/** Проверить, является ли пользователь администратором. */
export function isAdminUser(userId: number): boolean {
  const row = db
    .prepare('SELECT is_admin FROM users WHERE id = ?')
    .get(userId) as { is_admin: number } | undefined;
  return row?.is_admin === 1;
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    expiresAt,
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
    store.delete(SESSION_COOKIE);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT u.id, u.email, u.is_banned, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(token) as
    | { id: number; email: string; is_banned: number; expires_at: number }
    | undefined;

  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
    return null;
  }
  if (row.is_banned) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
    (await cookies()).delete(SESSION_COOKIE);
    return null;
  }
  return { id: row.id, email: row.email };
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}
