'use client';
// Big heading, a short subtitle and up to two buttons on the right.
import { motion } from 'framer-motion';

export default function PageHeader({ title, subtitle, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">{title}</h1>
        {subtitle && <p className="m-0 mt-1.5 max-w-2xl text-sm text-white/70 sm:text-base">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </motion.div>
  );
}

// The two button styles used in headers: a glass secondary and a dark primary.
const base = 'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-2';
export const secondaryBtn = `${base} border border-white/25 bg-white/10 text-white hover:bg-white/20 hover:border-white/40 active:scale-95`;
export const primaryBtn = `${base} border border-white/10 bg-slate-950/70 text-white shadow-lg shadow-black/30 hover:bg-slate-950 hover:-translate-y-0.5 active:scale-95`;
export const tealBtn = `${base} bg-gradient-to-br from-cyan-700 to-teal-700 text-white shadow-lg shadow-cyan-950/40 hover:brightness-110 hover:-translate-y-0.5 active:scale-95`;
