import { NextResponse } from 'next/server';
import {
  getCurrentUser,
  isAdminUser,
  listAccounts,
  createAccount,
  setAccountBanned,
} from '@/lib/auth';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user.id)) return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  return NextResponse.json({ accounts: listAccounts() });
}

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const label: unknown = body.label;
  if (typeof label !== 'string' || !label.trim()) {
    return NextResponse.json({ error: 'Укажи метку аккаунта' }, { status: 400 });
  }

  const { id, code } = await createAccount(label.trim());
  return NextResponse.json({ id, code, label: label.trim() });
}

export async function PATCH(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { userId, banned } = body as { userId: unknown; banned: unknown };
  if (typeof userId !== 'number' || typeof banned !== 'boolean') {
    return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json({ error: 'Нельзя банить самого себя' }, { status: 400 });
  }

  setAccountBanned(userId, banned);
  return NextResponse.json({ ok: true });
}
