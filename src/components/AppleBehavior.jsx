import { useEffect } from 'react';

const interactive = 'button, a, input, select, textarea, [role="button"]';

export function AppleBehavior() {
  useEffect(() => {
    const cleanups = [];
    const enhanced = new WeakSet();
    const enhanceTables = () => [...document.querySelectorAll('table')].forEach(table => {
      if (enhanced.has(table)) return;
      enhanced.add(table);
      const headers = [...table.querySelectorAll('thead th')];
      const rows = () => [...table.querySelectorAll('tbody tr')];

      table.setAttribute('role', 'grid');
      table.tabIndex = 0;
      table.setAttribute('aria-label', table.getAttribute('aria-label') || 'Data table');

      headers.forEach((th, index) => {
        if (!th.textContent.trim() || index === headers.length - 1) return;
        th.classList.add('apple-sortable');
        th.tabIndex = 0;
        th.setAttribute('role', 'columnheader');
        th.setAttribute('aria-sort', 'none');

        const sort = () => {
          const body = table.tBodies[0];
          if (!body) return;
          const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
          headers.forEach(h => h.setAttribute('aria-sort', 'none'));
          th.setAttribute('aria-sort', direction);
          const sign = direction === 'ascending' ? 1 : -1;
          [...body.rows].sort((a, b) => {
            const av = a.cells[index]?.innerText.trim() || '';
            const bv = b.cells[index]?.innerText.trim() || '';
            return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' }) * sign;
          }).forEach(row => body.appendChild(row));
        };
        const click = e => { if (!e.target.closest(interactive)) sort(); };
        const key = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sort(); } };
        th.addEventListener('click', click); th.addEventListener('keydown', key);
        cleanups.push(() => { th.removeEventListener('click', click); th.removeEventListener('keydown', key); });
      });

      const selectRow = (row, focus = false) => {
        rows().forEach(r => { r.classList.toggle('apple-row-selected', r === row); r.setAttribute('aria-selected', String(r === row)); });
        if (focus) row?.scrollIntoView({ block: 'nearest' });
      };
      rows().forEach(row => {
        row.setAttribute('role', 'row'); row.setAttribute('aria-selected', 'false');
        const click = e => { if (!e.target.closest(interactive)) selectRow(row); };
        row.addEventListener('click', click); cleanups.push(() => row.removeEventListener('click', click));
      });
      const keydown = e => {
        if (!['ArrowDown','ArrowUp','Enter',' '].includes(e.key) || e.target.closest('input,select,textarea')) return;
        const list = rows(); if (!list.length) return;
        const current = list.findIndex(r => r.classList.contains('apple-row-selected'));
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const delta = e.key === 'ArrowDown' ? 1 : -1;
          selectRow(list[Math.max(0, Math.min(list.length - 1, current < 0 ? (delta > 0 ? 0 : list.length - 1) : current + delta))], true);
        } else if (current >= 0) {
          e.preventDefault(); list[current].querySelector('button,a')?.click();
        }
      };
      table.addEventListener('keydown', keydown); cleanups.push(() => table.removeEventListener('keydown', keydown));
    });
    enhanceTables();
    const observer = new MutationObserver(enhanceTables);
    observer.observe(document.body, { childList: true, subtree: true });
    cleanups.push(() => observer.disconnect());

    const pointerDown = e => {
      const control = e.target.closest('button, .dataset-card, .run-card, .lineage-node');
      if (control && !control.disabled) control.classList.add('apple-pressed');
    };
    const pointerUp = () => document.querySelectorAll('.apple-pressed').forEach(el => el.classList.remove('apple-pressed'));
    document.addEventListener('pointerdown', pointerDown);
    document.addEventListener('pointerup', pointerUp);
    document.addEventListener('pointercancel', pointerUp);
    cleanups.push(() => { document.removeEventListener('pointerdown', pointerDown); document.removeEventListener('pointerup', pointerUp); document.removeEventListener('pointercancel', pointerUp); });

    return () => cleanups.forEach(fn => fn());
  });

  return null;
}
