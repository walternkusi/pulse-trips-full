'use client';
// MODERATION: review every tour listing as a photo card. Approve = publish on the website, Reject = hide it.
// (Uses the real tour catalogue and the existing PUT /api/admin/tours/:slug.)
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, EyeOff, ImageOff, MapPin, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import { useAdmin } from '../AdminContext';
import GlassCard from '../GlassCard';
import Stagger from '../Stagger';
import FilterChips from '../FilterChips';
import StatusBadge from '../StatusBadge';
import PageHeader from '../PageHeader';
import { CardSkeleton } from '../Skeleton';
import { usd } from '../charts';
import { CATEGORY_LABEL } from '@/lib/admin-stats';

export default function ModerationPage() {
  const { token, tours, reload } = useAdmin();
  const confirm = useConfirm();
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });

  const list = useMemo(() => (tours || []).filter((t) => filter === 'all' || (filter === 'published' && t.published !== false) || (filter === 'hidden' && t.published === false) || (filter === 'featured' && t.featured)), [tours, filter]);
  const n = (f) => (tours || []).filter(f).length;

  async function setPublished(t, published) {
    if (!published && !(await confirm({ title: 'Hide this tour?', message: `“${t.name}” will disappear from the website. Existing bookings keep working.`, confirmLabel: 'Hide tour', cancelLabel: 'Keep visible', tone: 'danger' }))) return;
    setBusy(t.slug); setMsg({ type: '', text: '' });
    try {
      await api.admin.setPublished(token, t.slug, published);
      setMsg({ type: 'ok', text: published ? `“${t.name}” is now live on the website.` : `“${t.name}” is hidden from the website.` });
      await reload();
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    setBusy('');
  }

  return (
    <>
      <PageHeader title="Moderation" subtitle="Check each listing before guests see it. Approve to publish, reject to hide." />
      <div className="mb-5">
        <FilterChips label="Listing status" value={filter} onChange={setFilter} options={[
          { value: 'all', label: 'All', count: (tours || []).length }, { value: 'published', label: 'Published', count: n((t) => t.published !== false) },
          { value: 'hidden', label: 'Hidden', count: n((t) => t.published === false) }, { value: 'featured', label: 'Featured', count: n((t) => t.featured) },
        ]} />
      </div>
      <div aria-live="polite">{msg.text && <p role={msg.type === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${msg.type === 'error' ? 'bg-rose-400/20 text-rose-100' : 'bg-emerald-400/20 text-emerald-100'}`}>{msg.text}</p>}</div>

      {!tours ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">{[0, 1, 2].map((i) => <CardSkeleton key={i} className="h-96" />)}</div>
      ) : !list.length ? (
        <GlassCard className="p-10 text-center text-white/75" hover={false}>No listings in this view.</GlassCard>
      ) : (
        <Stagger key={filter} className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => {
            const live = t.published !== false;
            const img = t.images?.[0]?.src?.replace('w=1600', 'w=800');
            return (
              <GlassCard key={t.slug} as="article" className="group flex flex-col overflow-hidden">
                <div className="relative aspect-[3/2] overflow-hidden bg-white/10">
                  {img ? <img src={img} alt={t.images[0].alt || ''} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    : <div className="flex h-full items-center justify-center text-white/70"><ImageOff size={32} aria-label="No photo yet" /></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" aria-hidden="true" />
                  <StatusBadge onImage status={live ? 'published' : 'hidden'} className="absolute left-3 top-3 backdrop-blur" />
                  {t.featured && <StatusBadge onImage status="featured" className="absolute right-3 top-3 backdrop-blur" />}
                  <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/70 px-3 py-1 text-sm font-semibold text-white backdrop-blur">from {usd(t.pricing.adult)}</span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="m-0 text-lg font-semibold leading-snug text-white">{t.name}</h2>
                  <p className="m-0 mt-1 flex items-center gap-1.5 text-sm text-white/70"><MapPin size={14} aria-hidden="true" />{t.country} · {CATEGORY_LABEL[t.category] || t.category}{t.images?.length ? ` · ${t.images.length} photo${t.images.length > 1 ? 's' : ''}` : ' · no photos'}</p>
                  <div className="mt-auto grid grid-cols-[1fr_1fr_auto] gap-2 pt-4">
                    <motion.button type="button" whileTap={{ scale: 0.95 }} disabled={busy === t.slug || live} onClick={() => setPublished(t, true)}
                      className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-emerald-500/85 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"><Check size={16} aria-hidden="true" /> Approve</motion.button>
                    <motion.button type="button" whileTap={{ scale: 0.95 }} disabled={busy === t.slug || !live} onClick={() => setPublished(t, false)}
                      className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-rose-300/50 bg-rose-400/15 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/30 disabled:cursor-not-allowed disabled:opacity-40"><EyeOff size={16} aria-hidden="true" /> Reject</motion.button>
                    <Link href="/admin/tours" aria-label={`Edit ${t.name}`} title="Edit in the tour editor" className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20"><Pencil size={16} aria-hidden="true" /></Link>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </Stagger>
      )}
    </>
  );
}
