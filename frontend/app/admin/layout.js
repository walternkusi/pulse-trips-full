// Admin is internal: keep it out of search engines. The glass dashboard styles load only here.
import './admin.css';
import AdminShell from '@/components/admin/AdminShell';

export const metadata = { title: 'Team dashboard', robots: { index: false, follow: false } };
export default function AdminLayout({ children }) { return <AdminShell>{children}</AdminShell>; }
