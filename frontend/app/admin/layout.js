// Admin is internal: keep it out of search engines.
export const metadata = { title: 'Team dashboard', robots: { index: false, follow: false } };
export default function AdminLayout({ children }) { return children; }
