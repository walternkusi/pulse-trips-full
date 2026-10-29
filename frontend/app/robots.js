// ROBOTS (/robots.txt): allow everything public, hide private areas, point to the sitemap.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/bookings'] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
