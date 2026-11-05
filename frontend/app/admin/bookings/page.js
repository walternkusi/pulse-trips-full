'use client';
import { Suspense } from 'react';
import BookingsPage from '@/components/admin/pages/BookingsPage';

export default function Page() { return <Suspense fallback={null}><BookingsPage /></Suspense>; }
