'use client';
// Shared admin state: who is signed in and the data every page needs (loaded once).
import { createContext, useContext } from 'react';

export const AdminContext = createContext(null);
export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminShell>');
  return ctx;
}
