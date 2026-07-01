import { redirect } from 'next/navigation';
import { getCurrentUser, isAdminUser, listAccounts } from '@/lib/auth';
import AdminPanel from '@/components/AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isAdminUser(user.id)) redirect('/learn');

  const accounts = listAccounts();

  return (
    <div className="px-4 py-8">
      <h1 className="font-display text-2xl font-bold">Управление аккаунтами 🔑</h1>
      <p className="mt-1 text-sm text-white/45">Только для администратора</p>
      <AdminPanel accounts={accounts} currentUserId={user.id} />
    </div>
  );
}
