import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getProfile } from '@/lib/profile';
import { getDueCards } from '@/lib/session';
import ReviewSession from '@/components/ReviewSession';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const profile = getProfile(user.id);
  if (!profile || !profile.onboarding_done) redirect('/onboarding');

  const cards = getDueCards(user.id);

  if (cards.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-xl font-semibold">Нечего повторять 👌</p>
        <p className="mt-2 text-white/55">
          Все слова на повторении ещё «свежие». Загляни позже.
        </p>
        <Link href="/learn" className="mt-6 rounded-lg bg-brand px-5 py-2 font-semibold">
          Учить новые →
        </Link>
      </div>
    );
  }

  return <ReviewSession initialCards={cards} />;
}
