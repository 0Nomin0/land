import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProfile } from '@/lib/profile';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  const profile = getProfile(user.id);
  return NextResponse.json({ user, profile });
}
