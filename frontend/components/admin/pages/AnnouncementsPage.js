'use client';
// ANNOUNCEMENTS: list with status filters and Edit / Archive / Delete.
// The backend has no announcements endpoint yet, so this screen runs on the sample data in lib/admin-mock.js
// and keeps your changes in this browser (localStorage). A notice on the page says so.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Archive, ArchiveRestore, CalendarClock, Info, Pencil, Plus, Trash2, X } from 'lucide-react';
import { MOCK_ANNOUNCEMENTS } from '@/lib/admin-mock';
import { useConfirm } from '@/components/ConfirmDialog';
import GlassCard from '../GlassCard';
import FilterChips from '../FilterChips';
import StatusBadge from '../StatusBadge';
import PageHeader, { primaryBtn, tealBtn } from '../PageHeader';
import { container } from '../motion';

const KEY = 'pt_admin_announcements';
const fmt = (iso) => new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'medium' });
const input = 'h-11 w-full rounded-xl border border-white/25 bg-white/10 px-3 text-white outline-none transition hover:border-white/45 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/20';

function Editor({ draft, onSave, onClose }) {
  const [form, setForm] = useState(draft);
  const first = useRef(null);
  useEffect(() => { first.current?.focus(); const onKey = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.form role="dialog" aria-modal="true" aria-labelledby="ann-title" onSubmit={(e) => { e.preventDefault(); onSave(form); }} initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.25 }} className="glass-card glass-card-strong grid w-full max-w-lg gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id="ann-title" className="m-0 text-xl font-semibold text-white">{draft.id ? 'Edit announcement' : 'New announcement'}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/15"><X size={18} /></button>
        </div>
        <label className="grid gap-1.5 text-sm font-medium text-white/90">Title<input ref={first} required maxLength={90} value={form.title} onChange={set('title')} className={input} /></label>
        <label className="grid gap-1.5 text-sm font-medium text-white/90">Message<textarea required rows={4} maxLength={400} value={form.body} onChange={set('body')} className={`${input} h-auto py-2.5`} /></label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-white/90">Status
            <select value={form.status} onChange={set('status')} className={input}>{['draft', 'scheduled', 'published', 'archived'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-white/90">Date<input type="date" required value={form.date.slice(0, 10)} onChange={(e) => setForm({ ...form, date: new Date(e.target.value).toISOString() })} className={input} /></label>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="inline-flex min-h-[42px] items-center rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20">Cancel</button>
          <button className={tealBtn}>Save</button>
        </div>
      </motion.form>
    </motion.div>
  );
}

export default function AnnouncementsPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);

  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(KEY) || 'null') || MOCK_ANNOUNCEMENTS); } catch { setItems(MOCK_ANNOUNCEMENTS); } }, []);
  const persist = useCallback((next) => {
    setItems(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event('pt-announcements')); } catch { /* ignore */ }
  }, []);

  const save = (form) => { persist(form.id ? items.map((a) => (a.id === form.id ? form : a)) : [{ ...form, id: `a${Date.now()}` }, ...items]); setEditing(null); };
  const archive = (a) => persist(items.map((x) => (x.id === a.id ? { ...x, status: x.status === 'archived' ? 'draft' : 'archived' } : x)));
  const remove = async (a) => { if (await confirm({ title: 'Delete this announcement?', message: `“${a.title}” will be removed. This cannot be undone.`, confirmLabel: 'Delete', cancelLabel: 'Keep it', tone: 'danger' })) persist(items.filter((x) => x.id !== a.id)); };

  const list = (items || []).filter((a) => filter === 'all' || a.status === filter).sort((a, b) => b.date.localeCompare(a.date));
  const n = (s) => (items || []).filter((a) => s === 'all' || a.status === s).length;

  return (
    <>
      <PageHeader title="Announcements" subtitle="News for your guests and team: publish now, schedule for later or keep a draft.">
        <button type="button" className={primaryBtn} onClick={() => setEditing({ title: '', body: '', status: 'draft', date: new Date().toISOString() })}><Plus size={16} aria-hidden="true" /> New announcement</button>
      </PageHeader>

      <p className="mb-5 flex items-start gap-2 rounded-xl border border-amber-300/30 bg-amber-400/15 px-4 py-3 text-sm text-amber-100">
        <Info size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span><b>Sample data.</b> Announcements are not connected to the website yet. What you change here is saved in this browser only.</span>
      </p>

      <div className="mb-5">
        <FilterChips label="Announcement status" value={filter} onChange={setFilter} options={['all', 'published', 'draft', 'scheduled', 'archived'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), count: n(s) }))} />
      </div>

      <motion.ul key={filter} variants={container} initial="hidden" animate="show" className="m-0 grid list-none gap-4 p-0">
        {list.map((a) => (
          <GlassCard as="li" key={a.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-lg font-semibold text-white">{a.title}</h2><StatusBadge status={a.status} /></div>
                <p className="m-0 mt-1.5 max-w-3xl text-sm leading-relaxed text-white/75">{a.body}</p>
                <p className="m-0 mt-3 flex items-center gap-1.5 text-xs text-white/70"><CalendarClock size={14} aria-hidden="true" />{a.status === 'scheduled' ? 'Goes out ' : a.status === 'published' ? 'Published ' : 'Updated '}{fmt(a.date)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setEditing(a)} className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white/20 active:scale-95"><Pencil size={14} aria-hidden="true" /> Edit</button>
                <button type="button" onClick={() => archive(a)} className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white/20 active:scale-95">{a.status === 'archived' ? <ArchiveRestore size={14} aria-hidden="true" /> : <Archive size={14} aria-hidden="true" />}{a.status === 'archived' ? 'Restore' : 'Archive'}</button>
                <button type="button" onClick={() => remove(a)} className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-rose-300/50 bg-rose-400/15 px-3 text-sm font-medium text-rose-100 transition hover:bg-rose-400/30 active:scale-95"><Trash2 size={14} aria-hidden="true" /> Delete</button>
              </div>
            </div>
          </GlassCard>
        ))}
        {items && !list.length && <GlassCard as="li" hover={false} className="p-10 text-center text-white/75">Nothing here yet.</GlassCard>}
      </motion.ul>

      <AnimatePresence>{editing && <Editor draft={editing} onSave={save} onClose={() => setEditing(null)} />}</AnimatePresence>
    </>
  );
}
