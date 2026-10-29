'use client';
// "Download PDF": opens the print dialog, where visitors pick "Save as PDF".
import Icon from './Icons';

export default function PrintButton({ label = 'Download PDF' }) {
  return (
    <button className="btn btn-outline no-print" onClick={() => window.print()}>
      <Icon name="download" size={18} /> {label}
    </button>
  );
}
