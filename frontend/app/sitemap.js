// =============================================================================
// SITEMAP (/sitemap.xml): lists every public page so Google finds them fast.
// Tours come from the backend, so new tours appear automatically.
// =============================================================================
import { api } from '@/lib/api';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default async function sitemap() {
  const { tours } = await api.getTours().catch(() => ({ tours: [] }));
  const now = new Date();
  const pages = ['', '/tours', '/how-it-works', '/reviews', '/policies', '/contact', '/travel-guide']
    .map((p) => ({ url: `${SITE}${p}`, lastModified: now, changeFrequency: 'weekly', priority: p === '' ? 1 : 0.6 }));
  const tourPages = tours.map((t) => ({ url: `${SITE}/tours/${t.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.9 }));
  return [...pages, ...tourPages];
}
