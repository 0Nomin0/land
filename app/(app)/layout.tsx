import { redirect } from 'next/navigation';
import { getCurrentUser, isAdminUser } from '@/lib/auth';
import NavBar from '@/components/NavBar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const isAdmin = isAdminUser(user.id);

  return (
    <>
      <NavBar isAdmin={isAdmin} />
      <div className="mx-auto max-w-4xl">{children}</div>
    </>
  );
}
