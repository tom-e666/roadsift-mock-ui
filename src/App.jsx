import React, { useEffect, useState } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, Search, Sun, Moon, Bell, ChevronDown, X, Check, Command, FlaskConical } from 'lucide-react';
import { CommandPalette } from './components/CommandPalette.jsx';
import { Button, Modal } from './components/UI.jsx';
import { groups, allPages, initialDatasets, initialRuns } from './data.js';
import { Pools, Datasets, Explorer, ImportData, Mining, History, StrategyComparison, SettingsPage, SystemPage, Onboarding } from './Pages.jsx';

function readState(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key)); return value == null ? fallback : value; } catch { return fallback; } }
function useLocalState(key, initial) { const [value, setValue] = useState(() => readState(key, initial)); useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Demo still works without storage. */ } }, [key, value]); return [value, setValue]; }
function currentPage() { const path = window.location.pathname.split('/')[1] || 'datasets'; return ({ 'frame-selection': 'mining', 'label-dataset': 'datasets', 'train-model': 'datasets', 'model-metrics': 'datasets', projects: 'history', lineage: 'datasets', labeling: 'datasets', pal: 'mining', documentation: 'onboarding' })[path] || (allPages.some(([id]) => id === path) ? path : 'datasets'); }

export default function App() {
  const [page, setPage] = useState(currentPage);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  const [collapsed, setCollapsed] = useLocalState('roadsift-mock-collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [datasets, setDatasets] = useLocalState('roadsift-mock-datasets-v3', initialDatasets);
  const [runs, setRuns] = useLocalState('roadsift-mock-runs-v2', initialRuns);
  const [preferences, setPreferences] = useLocalState('roadsift-mock-preferences', { compact: false, animations: true });
  const [language, setLanguage] = useLocalState('roadsift-language', 'en');
  const [contextDataset, setContextDataset] = useState(null);
  const navVi = { Pools:'Pools', Datasets:'Bộ dữ liệu', 'Data Explorer':'Data Explorer', 'Import Data':'Nhập dữ liệu', Mining:'Mining', Runs:'Lịch sử chạy', 'Strategy Comparison':'So sánh chiến lược', Settings:'Cài đặt', System:'Hệ thống', Onboarding:'Hướng dẫn bắt đầu' };
  const rawTitle = allPages.find(([id]) => id === page)?.[1];
  const title = language === 'vi' ? (navVi[rawTitle] || rawTitle) : rawTitle;
  const navigate = (target, dataset) => {
    const next = target.startsWith('/') ? target.slice(1).split('?')[0] : target;
    if (!allPages.some(([id]) => id === next)) return;
    if (dataset) setContextDataset(dataset);
    window.history.pushState({}, '', `/${next}`); setPage(next); setMobileOpen(false); setCommandOpen(false); setAccountOpen(false); window.scrollTo(0, 0);
  };
  useEffect(() => { const handler = () => setPage(currentPage()); window.addEventListener('popstate', handler); return () => window.removeEventListener('popstate', handler); }, []);
  useEffect(() => { document.title = `RoadSift · ${title}`; }, [title]);
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('roadsift-mock-theme', theme); } catch {} }, [theme]);
  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCommandOpen(value => !value); }
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') { e.preventDefault(); setCollapsed(value => !value); }
      if (e.key === 'Escape') { setMobileOpen(false); setAccountOpen(false); }
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 3200); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (!accountOpen) return; const handler = e => { if (!e.target.closest('.account-anchor')) setAccountOpen(false); }; document.addEventListener('pointerdown', handler); return () => document.removeEventListener('pointerdown', handler); }, [accountOpen]);
  useEffect(() => { if (!mobileOpen) return; const previous = document.activeElement; const old = document.body.style.overflow; document.body.style.overflow = 'hidden'; document.querySelector('.sidebar__close')?.focus(); return () => { document.body.style.overflow = old; previous?.focus?.(); }; }, [mobileOpen]);
  const notify = message => setToast({ message, id: Date.now() });
  const shared = { navigate, notify, datasets, setDatasets, runs, setRuns, contextDataset, language, setLanguage };
  const pages = { pools: Pools, datasets: Datasets, 'data-explorer': Explorer, import: ImportData, mining: Mining, history: History, comparison: StrategyComparison, system: SystemPage, onboarding: Onboarding };
  const Page = pages[page];
  return <div className={`app ${collapsed ? 'app--collapsed' : ''} ${preferences.compact ? 'app--compact' : ''} ${preferences.animations ? '' : 'app--no-motion'}`}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    {mobileOpen && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`} aria-label="Primary navigation" onKeyDown={event => {
      if (!mobileOpen || event.key !== 'Tab') return;
      const controls = [...event.currentTarget.querySelectorAll('button')].filter(node => node.getClientRects().length);
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }}>
      <div className="sidebar__brand"><button className="brand-mark" aria-label="RoadSift home" onClick={() => navigate('datasets')}><img src="/brand/roadsift-mark.svg" alt="" /></button><div className="brand-copy"><strong>RoadSift</strong><span>Perception workspace</span></div><button className="sidebar__collapse icon-control" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title="Toggle sidebar · Ctrl / ⌘ \\" onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button><button className="sidebar__close icon-control" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      <button className="sidebar__search" onClick={() => setCommandOpen(true)} aria-label={language==='vi'?'Tìm kiếm workspace':'Search workspace'}><Search size={14} /><span>{language==='vi'?'Tìm kiếm workspace':'Search workspace'}</span><kbd>⌘ K</kbd></button>
      <nav>{groups.map(([label, items]) => <div className="nav-group" key={label}><p>{language==='vi'?({Library:'Thư viện',Workflow:'Quy trình',Workspace:'Workspace'}[label]||label):label}</p>{items.map(([id, name, Icon]) => { const displayName=language==='vi'?(navVi[name]||name):name; return <button key={id} title={displayName} aria-label={displayName} aria-current={page === id ? 'page' : undefined} className={page === id ? 'nav-item nav-item--active' : 'nav-item'} onClick={() => navigate(id)}><Icon size={17} strokeWidth={1.7} /><span>{displayName}</span>{page === id && <i />}</button>})}</div>)}</nav>
    </aside>
    <div className="workspace"><header className="topbar"><div className="topbar__location"><button className="icon-control mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={19} /></button><span>Workspace</span><i>/</i><strong>{title}</strong></div><div className="topbar__actions"><button className="topbar__search" onClick={() => setCommandOpen(true)} aria-label={language==='vi'?'Mở tìm kiếm workspace':'Open workspace search'}><Search size={14} /><span>{language==='vi'?'Tìm kiếm':'Search anything'}</span><kbd><Command size={10} />K</kbd></button><div className="language-switch" role="group" aria-label="Language"><button aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>EN</button><button aria-pressed={language==='vi'} onClick={()=>setLanguage('vi')}>VI</button></div><div className="theme-switch" role="group" aria-label="Appearance"><button aria-label="Light theme" aria-pressed={theme === 'light'} title="Light theme" onClick={() => setTheme('light')}><Sun size={14} /></button><button aria-label="Dark theme" aria-pressed={theme === 'dark'} title="Dark theme" onClick={() => setTheme('dark')}><Moon size={14} /></button></div><button className="icon-control notification-trigger" aria-label="Notifications" onClick={() => setNotificationsOpen(true)}><Bell size={17} /><i /></button><span className="topbar__divider" /><div className="account-anchor"><button className="account-trigger" aria-label="Demo account menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(value => !value)}><span className="avatar">D</span><ChevronDown size={12} /></button>{accountOpen && <div className="account-popover"><strong>Demo workspace</strong><p>Explore the interface freely.</p><Button onClick={() => navigate('settings')}>Workspace settings</Button><Button variant="ghost" onClick={() => navigate('onboarding')}>Getting started</Button></div>}</div></div></header>
      <main id="main-content" tabIndex={-1} className="content">{Page ? <Page {...shared} /> : <SettingsPage {...shared} theme={theme} setTheme={setTheme} preferences={preferences} setPreferences={setPreferences} />}</main>
    </div>
    <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={navigate} groups={groups} />
    {notificationsOpen && <Modal title="Notifications" onClose={() => setNotificationsOpen(false)}><div className="notification"><span className="notification__icon"><Check size={18} /></span><div><strong>Your demo workspace is ready</strong><p>Explore sample datasets, review frames, and try the simulated workflows.</p><small>Demo notification</small></div></div></Modal>}
    {toast && <div className="toast" role="status"><Check size={17} /><span>{toast.message}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={15} /></button></div>}
  </div>;
}
