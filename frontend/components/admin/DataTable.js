'use client';
// Glass table: sortable headers, row hover, pagination and a loading skeleton.
// columns: [{ key, header, render?(row), sortValue?(row), align?: 'right', className? }]
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import Skeleton from './Skeleton';

export default function DataTable({ columns, rows, rowKey, pageSize = 8, loading = false, empty = 'Nothing to show yet.', caption }) {
  const [sort, setSort] = useState(null); // { key, dir }
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const val = (r) => (col?.sortValue ? col.sortValue(r) : r[sort.key]);
    return [...rows].sort((a, b) => {
      const x = val(a), y = val(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''));
      return sort.dir === 'asc' ? c : -c;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const toggle = (key) => { setPage(0); setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' })); };

  if (loading) {
    return <div className="grid gap-2" role="status" aria-label="Loading table">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11" />)}</div>;
  }

  return (
    <div>
      <div className="glass-scroll overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const sortable = c.sortable !== false;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`whitespace-nowrap border-b border-white/20 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/70 ${c.align === 'right' ? 'text-right' : ''}`}>
                    {sortable ? (
                      <button type="button" onClick={() => toggle(c.key)} className={`inline-flex items-center gap-1 rounded uppercase tracking-wider transition hover:text-white ${c.align === 'right' ? 'flex-row-reverse' : ''}`}>
                        {c.header}
                        {active ? (sort.dir === 'asc' ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />) : <ChevronDown size={14} className="opacity-0 group-hover:opacity-40" aria-hidden="true" />}
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr key={rowKey(row)} className="group transition-colors hover:bg-white/[.07] focus-within:bg-white/[.07]">
                {columns.map((c) => (
                  <td key={c.key} className={`border-b border-white/10 px-3 py-3 align-top text-white ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${c.className || ''}`}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="m-0 px-3 py-10 text-center text-sm text-white/70">{empty}</p>}
      </div>
      {rows.length > pageSize && (
        <div className="mt-3 flex items-center justify-between gap-3 text-sm text-white/70">
          <span>{safePage * pageSize + 1}–{Math.min(sorted.length, (safePage + 1) * pageSize)} of {sorted.length}</span>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous page" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 transition hover:bg-white/20 disabled:opacity-40"><ChevronLeft size={16} /></button>
            <span className="px-2 tabular-nums">{safePage + 1} / {pages}</span>
            <button type="button" aria-label="Next page" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 transition hover:bg-white/20 disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
