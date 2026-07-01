import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getProfile } from '@/lib/profile';
import NewsPicker from '@/components/NewsPicker';

export const dynamic = 'force-dynamic';

export default async function NewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const profile = getProfile(user.id);
  if (!profile || !profile.onboarding_done) redirect('/onboarding');

  return (
    <div className="px-4 py-8">
      <h1 className="font-display text-2xl font-bold">Новости 📰</h1>
      <p className="mt-1 text-white/55">
        Выбери страну — соберём реальные новости и перескажем их простым немецким под
        твой уровень, с твоими словами и переводом по клику.
      </p>
      <NewsPicker />
    </div>
  );
}
