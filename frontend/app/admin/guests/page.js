'use client';
import { useAdmin } from '@/components/admin/AdminContext';
import PageHeader from '@/components/admin/PageHeader';
import GuestsPanel from '@/components/admin/pages/GuestsPanel';

export default function Page() {
  const { token } = useAdmin();
  return (
    <>
      <PageHeader title="Guests" subtitle="Past bookings, special requirements, message history and internal notes." />
      <GuestsPanel token={token} />
    </>
  );
}
