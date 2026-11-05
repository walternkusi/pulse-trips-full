'use client';
// The tour editor itself is unchanged; the glass theme restyles it.
import { useAdmin } from '@/components/admin/AdminContext';
import PageHeader from '@/components/admin/PageHeader';
import TourEditor from '@/components/admin/TourEditor';

export default function Page() {
  const { token } = useAdmin();
  return (
    <>
      <PageHeader title="Tours" subtitle="Edit tour cards and pages: text, photos, prices and the schedule." />
      <TourEditor token={token} />
    </>
  );
}
