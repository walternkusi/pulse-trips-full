'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAdmin } from '@/components/admin/AdminContext';
import PageHeader from '@/components/admin/PageHeader';
import CheckInPanel from '@/components/admin/pages/CheckInPanel';

function CheckIn() {
  const { token } = useAdmin();
  const ref = useSearchParams().get('ref') || '';
  return (
    <>
      <PageHeader title="Check-in" subtitle="Scan the QR code on a guest's voucher, or type the booking reference." />
      <CheckInPanel token={token} initialRef={ref} />
    </>
  );
}
export default function Page() { return <Suspense fallback={null}><CheckIn /></Suspense>; }
