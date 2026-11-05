'use client';
import { Suspense } from 'react';
import OverviewPage from '@/components/admin/pages/OverviewPage';

export default function Page() { return <Suspense fallback={null}><OverviewPage /></Suspense>; }
