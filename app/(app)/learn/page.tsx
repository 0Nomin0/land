import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getProfile } from '@/lib/profile';
import LearnSession from '@/components/LearnSession';

export const dynamic = 'force-dynamic';

export default async function LearnPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const profile = getProfile(user.id);
  if (!profile || !profile.onboarding_done) redirect('/onboarding');

  return <LearnSession />;
}
