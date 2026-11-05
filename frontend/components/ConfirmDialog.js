'use client';
// =============================================================================
// CONFIRMATION DIALOG: replaces the browser's own confirm() pop-up ("localhost says").
//   const confirm = useConfirm();
//   if (!(await confirm({ title, message, confirmLabel, cancelLabel, tone: 'danger' }))) return;
// Shows the Pulse Trips name, matches the surrounding theme (light site / glass admin), traps
// keyboard focus, closes with Escape or a click outside, and puts focus back where it was.
// Outside a <ConfirmProvider> it quietly falls back to the browser's dialog, so nothing breaks.
// =============================================================================
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import Icon from './Icons';

const Ctx = createContext(null);

export function useConfirm() {
  const ask = useContext(Ctx);
  return ask || ((o) => Promise.resolve(window.confirm(typeof o === 'string' ? o : o.message)));
}

export function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null);
  const resolver = useRef(null);
  const ask = useCallback((o) => new Promise((resolve) => {
    resolver.current = resolve;
    setReq(typeof o === 'string' ? { message: o } : o);
  }), []);
  const done = useCallback((answer) => { resolver.current?.(answer); resolver.current = null; setReq(null); }, []);
  return <Ctx.Provider value={ask}>{children}{req && <Dialog req={req} onDone={done} />}</Ctx.Provider>;
}

function Dialog({ req, onDone }) {
  const { title = 'Please confirm', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'default' } = req;
  const uid = useId();
  const cancelBtn = useRef(null);
  const okBtn = useRef(null);

  // Focus the safe choice first for destructive actions, and restore focus on close.
  useEffect(() => {
    const before = document.activeElement;
    (tone === 'danger' ? cancelBtn : okBtn).current?.focus();
    return () => before?.focus?.();
  }, [tone]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); onDone(false); }
    if (e.key === 'Tab') { // keep focus between the two buttons while the dialog is open
      e.preventDefault();
      const list = [cancelBtn.current, okBtn.current];
      const i = list.indexOf(document.activeElement);
      list[e.shiftKey ? (i <= 0 ? 1 : 0) : (i === 1 ? 0 : 1)].focus();
    }
  };

  return (
    <div className="confirm-overlay" onKeyDown={onKeyDown} onMouseDown={(e) => e.target === e.currentTarget && onDone(false)}>
      <div role="alertdialog" aria-modal="true" aria-labelledby={`${uid}t`} aria-describedby={`${uid}m`} className={`confirm-card confirm-${tone}`}>
        <div className="confirm-brand">
          <img src="/logo-256.jpg" alt="" width="28" height="28" />
          <span>Pulse<b>Trips</b></span>
        </div>
        <div className="confirm-body">
          <span className="confirm-icon" aria-hidden="true"><Icon name="info" size={22} /></span>
          <div>
            <h2 id={`${uid}t`}>{title}</h2>
            <p id={`${uid}m`}>{message}</p>
          </div>
        </div>
        <div className="confirm-actions">
          <button type="button" ref={cancelBtn} className="btn btn-outline" onClick={() => onDone(false)}>{cancelLabel}</button>
          <button type="button" ref={okBtn} className={`btn ${tone === 'danger' ? 'btn-danger-solid' : ''}`} onClick={() => onDone(true)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
