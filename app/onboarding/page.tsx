import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getProfile } from '@/lib/profile';
import OnboardingWizard from './OnboardingWizard';

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const profile = getProfile(user.id);
  // Готовый профиль можно перередактировать с предзаполнением.
  return (
    <OnboardingWizard
      initial={
        profile
          ? {
              level: profile.level,
              daily_goal: profile.daily_goal,
              interests: profile.interests,
              refined_topics: profile.refined_topics,
            }
          : null
      }
    />
  );
}
