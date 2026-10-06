import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowUpRight, Inbox } from 'lucide-react';

export function Button({ children, icon: Icon, variant = 'secondary', className = '', ...props }) { return <button type="button" className={`button button--${variant} ${className}`} {...props}>{Icon && <Icon size={15} />}{children}</button>; }
export function Badge({ children, tone }) { return <span className={`badge badge--${tone || String(children).toLowerCase().replaceAll(' ', '-')}`}>{children}</span>; }
export function PageHeader({ eyebrow, title, description, actions }) { return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div><div className="page-actions">{actions}</div></header>; }
export function Metric({ label, value, detail, icon: Icon, tone = 'blue' }) { return <div className="metric"><div className="metric__top"><span>{label}</span>{Icon && <span className={`metric__icon metric__icon--${tone}`}><Icon size={16} /></span>}</div><strong>{value}</strong>{detail && <small>{detail}</small>}</div>; }
export function Segmented({ options, value, onChange, label }) { return <div className="segmented" role="group" aria-label={label}>{options.map(option => <button key={option.value} aria-pressed={value === option.value} title={option.label} onClick={() => onChange(option.value)}>{option.icon && <option.icon size={15} />}{option.label}</button>)}</div>; }
export function Empty({ title, detail, action }) { return <div className="empty"><span><Inbox size={26} /></span><h3>{title}</h3><p>{detail}</p>{action}</div>; }
export function Panel({ title, description, actions, children, className = '' }) { return <section className={`panel ${className}`}><header className="panel__header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{actions}</header><div className="panel__body">{children}</div></section>; }
export function DemoNote({ children = 'Sample data · for interface exploration only' }) { return <p className="demo-note"><span />{children}</p>; }
export function Field({ label, hint, children }) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Toggle({ checked, onChange, label }) { return <button className={`toggle ${checked ? 'toggle--on' : ''}`} role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)}><i /></button>; }
export function Modal({ title, children, footer, onClose, sheet = false }) {
  const ref = useRef(null);
  const DEFAULT_SHEET_WIDTH = 400;
  const [sheetWidth, setSheetWidth] = useState(() => {
    if (!sheet || typeof window === 'undefined') return DEFAULT_SHEET_WIDTH;
    const saved = Number(window.localStorage.getItem('roadsift.sheetWidth'));
    return Number.isFinite(saved) && saved >= 320 ? saved : DEFAULT_SHEET_WIDTH;
  });
  const clampSheetWidth = width => Math.max(320, Math.min(width, Math.floor(window.innerWidth * .6)));
  const updateSheetWidth = width => {
    const next = clampSheetWidth(width);
    setSheetWidth(next);
    window.localStorage.setItem('roadsift.sheetWidth', String(next));
  };
  const startResize = e => {
    if (!sheet || window.innerWidth <= 767) return;
    e.preventDefault();
    const onMove = event => updateSheetWidth(window.innerWidth - event.clientX);
    const onUp = () => {
      document.body.classList.remove('is-resizing-sheet');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    document.body.classList.add('is-resizing-sheet');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };
  const resetSheetWidth = () => updateSheetWidth(DEFAULT_SHEET_WIDTH);
  const resizeWithKeyboard = e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'Home') resetSheetWidth();
    else updateSheetWidth(sheetWidth + (e.key === 'ArrowLeft' ? 24 : -24));
  };
  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.body.style.overflow = oldOverflow; document.body.classList.remove('is-resizing-sheet'); previous?.focus?.(); };
  }, []);
  const onKeyDown = e => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    if (e.key === 'Tab') {
      const nodes = [...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')];
      const first = nodes[0], last = nodes.at(-1);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  };
  const sheetStyle = sheet ? { '--sheet-width': `${sheetWidth}px` } : undefined;
  return createPortal(<div className={`modal-layer ${sheet ? 'modal-layer--sheet' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section ref={ref} style={sheetStyle} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`modal ${sheet ? 'modal--sheet' : ''}`} onKeyDown={onKeyDown}>
      {sheet && <div className="sheet-resize-handle" role="separator" aria-label="Resize side panel" aria-orientation="vertical" aria-valuemin={320} aria-valuemax={Math.floor(window.innerWidth * .6)} aria-valuenow={Math.round(sheetWidth)} tabIndex={0} onPointerDown={startResize} onDoubleClick={resetSheetWidth} onKeyDown={resizeWithKeyboard}><span /></div>}
      <header><h2>{title}</h2><Button aria-label="Close dialog" variant="ghost" onClick={onClose} icon={X} /></header>
      <div className="modal__body">{children}</div>{footer && <footer>{footer}</footer>}
    </section>
  </div>, document.body);
}
export function TextLink({ children, onClick }) { return <button className="text-link" onClick={onClick}>{children}<ArrowUpRight size={14} /></button>; }
