import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity as ActivityIcon,
  Check,
  FlaskConical,
  Globe2,
  HelpCircle,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Puzzle,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Brand } from './components/Brand';
import { Modal } from './components/Modal';
import { useHushState } from './lib/useHushState';
import { isExtensionEnvironment } from './lib/storage';
import type { PageId } from './lib/ui';
import { Overview } from './pages/Overview';
import { Activity } from './pages/Activity';
import { Policies } from './pages/Policies';
import { Destinations } from './pages/Destinations';
import { Playground } from './pages/Playground';
import { Settings } from './pages/Settings';
import { Popup } from './pages/Popup';

const NAV_ITEMS: { id: PageId; label: string; icon: typeof LayoutDashboard; section: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, section: 'Workspace' },
  { id: 'activity', label: 'Activity', icon: ActivityIcon, section: 'Workspace' },
  { id: 'playground', label: 'Test playground', icon: FlaskConical, section: 'Workspace' },
  { id: 'policies', label: 'Protection policies', icon: ShieldCheck, section: 'Protection' },
  { id: 'destinations', label: 'AI destinations', icon: Globe2, section: 'Protection' },
];

const PAGE_LABELS: Record<PageId, string> = {
  overview: 'Overview', activity: 'Activity', policies: 'Protection policies',
  destinations: 'AI destinations', playground: 'Test playground', settings: 'Settings',
};

function initialPage(): PageId {
  const hash = window.location.hash.slice(1) as PageId;
  return Object.keys(PAGE_LABELS).includes(hash) ? hash : 'overview';
}

export default function App() {
  const { state, updateState, loaded } = useHushState();
  const [page, setPage] = useState<PageId>(initialPage);
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  const popup = new URLSearchParams(window.location.search).get('view') === 'popup';

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3500);
  }, []);

  const navigate = useCallback((next: PageId) => {
    setPage(next);
    setMobileOpen(false);
    const url = new URL(window.location.href);
    url.hash = next;
    window.history.replaceState(null, '', url);
  }, []);

  useEffect(() => {
    const onHashChange = () => setPage(initialPage());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.title = `${PAGE_LABELS[page]} · Hush`;
    if (popup) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        navigate('activity');
        window.setTimeout(() => document.getElementById('global-search')?.focus(), 0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, page, popup]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  if (popup) return <Popup state={state} updateState={updateState} />;

  const currentPage = () => {
    switch (page) {
      case 'activity': return <Activity state={state} updateState={updateState} query={query} setQuery={setQuery} notify={notify} />;
      case 'policies': return <Policies state={state} updateState={updateState} navigate={navigate} notify={notify} />;
      case 'destinations': return <Destinations state={state} updateState={updateState} navigate={navigate} notify={notify} />;
      case 'playground': return <Playground state={state} updateState={updateState} navigate={navigate} notify={notify} />;
      case 'settings': return <Settings state={state} updateState={updateState} notify={notify} />;
      default: return <Overview state={state} updateState={updateState} navigate={navigate} />;
    }
  };

  return (
    <div className={`app-shell ${loaded ? 'app-shell--loaded' : ''}`}>
      {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand"><button type="button" onClick={() => navigate('overview')} aria-label="Go to overview"><Brand /></button><button className="sidebar-close icon-button" type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <div className="workspace-card"><span className="workspace-avatar">L</span><div><strong>Local workspace</strong><span>Personal browser</span></div><LockKeyhole size={14} /></div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {['Workspace', 'Protection'].map((section) => (
            <div className="nav-section" key={section}>
              <span className="nav-section__label">{section}</span>
              {NAV_ITEMS.filter((item) => item.section === section).map((item) => {
                const Icon = item.icon;
                return <button type="button" key={item.id} className={`nav-item ${page === item.id ? 'nav-item--active' : ''}`} onClick={() => navigate(item.id)}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'activity' && state.activity.length > 0 && <span className="nav-count">{state.activity.length}</span>}{item.id === 'playground' && <span className="nav-new">Try</span>}</button>;
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar__bottom">
          <div className="local-promise"><span><LockKeyhole size={17} /></span><strong>Local by design</strong><p>Your text never leaves this browser for scanning.</p><button type="button" onClick={() => setHelpOpen(true)}>How it works<ArrowUpRightIcon /></button></div>
          <button type="button" className={`nav-item ${page === 'settings' ? 'nav-item--active' : ''}`} onClick={() => navigate('settings')}><SettingsIcon size={18} /><span>Settings</span></button>
          <div className="sidebar-profile"><span>YOU</span><div><strong>Browser profile</strong><small>Data stored locally</small></div><span className="status-dot" /></div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__left"><button className="mobile-menu icon-button" type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumbs"><span>Control center</span><i>/</i><strong>{PAGE_LABELS[page]}</strong></div></div>
          <label className="search-field global-search"><Search size={16} /><input id="global-search" value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value) navigate('activity'); }} placeholder="Search activity…" aria-label="Search activity" /><kbd>⌘ K</kbd></label>
          <div className="topbar__right">
            {state.isDemo && <span className="demo-badge">Demo data</span>}
            <button className="icon-button help-button" type="button" aria-label="Help and scope" onClick={() => setHelpOpen(true)}><HelpCircle size={18} /></button>
            {isExtensionEnvironment() ? <span className="extension-pill"><Puzzle size={15} /><span>Extension connected</span><i /></span> : <button className="button button--install" type="button" onClick={() => navigate('settings')}><Puzzle size={15} />Install extension</button>}
          </div>
        </header>
        <main className="page-content" key={page}>{currentPage()}</main>
        <footer className="app-footer"><span><BrandMarkSmall />Hush · Local-first AI data protection</span><span>No cloud scanning · No prompt logging</span></footer>
      </div>

      {helpOpen && <Modal title="How Hush protects you" description="A local checkpoint between your thoughts and public AI tools." onClose={() => setHelpOpen(false)}><div className="help-content"><div className="help-step"><span>1</span><div><strong>Scan at the point of sending</strong><p>The extension checks supported AI composers when you press Enter, click Send, submit a form, or paste text.</p></div></div><div className="help-step"><span>2</span><div><strong>Mask or block, never auto-send</strong><p>Sensitive values are replaced in the composer for your review, or the action is held under Block mode.</p></div></div><div className="help-step"><span>3</span><div><strong>Keep a privacy-safe audit trail</strong><p>Only timestamps, destinations, categories, and counts are saved. Prompts and values stay out of storage.</p></div></div><div className="privacy-note"><LockKeyhole size={18} /><p>Hush reduces accidental exposure but cannot guarantee complete detection. It does not scan file attachments or replace organizational DLP.</p></div><button className="button button--primary button--full" type="button" onClick={() => { setHelpOpen(false); navigate('playground'); }}>Try the local playground<FlaskConical size={16} /></button></div></Modal>}
      {toast && <div className="app-toast" role="status"><span><Check size={15} /></span>{toast}<button type="button" onClick={() => setToast('')} aria-label="Dismiss notification"><X size={14} /></button></div>}
    </div>
  );
}

function ArrowUpRightIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12 12 4M5 4h7v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function BrandMarkSmall() {
  return <span className="footer-mark"><ShieldCheck size={13} /></span>;
}
