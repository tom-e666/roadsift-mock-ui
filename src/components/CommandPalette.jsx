import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export function CommandPalette({ open, onClose, onNavigate, groups }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const input = useRef(null);
  const panel = useRef(null);
  const previousFocus = useRef(null);
  const options = groups.flatMap(([group, items]) => items.map(([id, title, Icon]) => ({ id, title, Icon, group }))).filter(item => `${item.title} ${item.group}`.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement;
    setQuery(''); setSelected(0); input.current?.focus();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = oldOverflow; previousFocus.current?.focus?.(); };
  }, [open]);
  useEffect(() => { panel.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' }); }, [selected]);
  if (!open) return null;
  const choose = option => { if (option) { onNavigate(option.id); onClose(); } };
  const keydown = event => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(value => options.length ? (value + 1) % options.length : 0); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(value => options.length ? (value - 1 + options.length) % options.length : 0); }
    if (event.key === 'Enter') { event.preventDefault(); choose(options[selected]); }
    if (event.key === 'Tab') {
      const elements = Array.from(panel.current.querySelectorAll('button:not(:disabled), input'));
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  };
  return createPortal(<div className="apple-command-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apple-command" ref={panel} role="dialog" aria-modal="true" aria-label="Search workspace" onKeyDown={keydown}>
      <div className="apple-command__input"><Search size={21} /><input ref={input} role="combobox" aria-label="Find a workspace" aria-expanded="true" aria-controls="workspace-options" aria-autocomplete="list" aria-activedescendant={options[selected] ? `command-${options[selected].id}` : undefined} placeholder="Where would you like to go?" value={query} onChange={event => { setQuery(event.target.value); setSelected(0); }} /><button aria-label="Close search" onClick={onClose}><X size={18} /></button></div>
      <div className="apple-command__results" id="workspace-options" role="listbox" aria-label="Workspaces">{options.length ? options.map(({ id, title, Icon, group }, index) => <button id={`command-${id}`} key={id} role="option" aria-selected={index === selected} onMouseMove={() => setSelected(index)} onClick={() => choose(options[index])}><span className="apple-command__icon"><Icon size={18} /></span><span><strong>{title}</strong><small>{group}</small></span><ArrowUpRight size={15} /></button>) : <p className="apple-command__empty">No matching workspace. Try “datasets”, “training” or “settings”.</p>}</div>
      <footer><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span><kbd>esc</kbd> to close</span></footer>
    </section>
  </div>, document.body);
}
