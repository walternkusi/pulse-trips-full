'use client';
import { useAdmin } from '@/components/admin/AdminContext';
import PageHeader from '@/components/admin/PageHeader';
import RosterPanel from '@/components/admin/pages/RosterPanel';

export default function Page() {
  const { token } = useAdmin();
  return (
    <>
      <PageHeader title="Roster" subtitle="Assign guides, drivers and vehicles to each departure." />
      <RosterPanel token={token} />
    </>
  );
}
