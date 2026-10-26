import { useEffect } from 'react';
import { ArrowUpRight, FlaskConical, LockKeyhole, ScanLine, ShieldCheck } from 'lucide-react';
import { Brand } from '../components/Brand';
import { DestinationIcon } from '../components/DestinationIcon';
import { Toggle } from '../components/Toggle';
import { isExtensionEnvironment, type HushState } from '../lib/storage';
import { formatRelativeTime, type PageId, type StateUpdater } from '../lib/ui';

export function Popup({ state, updateState }: { state: HushState; updateState: StateUpdater }) {
  useEffect(() => {
    document.body.classList.add('popup-body');
    return () => document.body.classList.remove('popup-body');
  }, []);

  const openDashboard = (page: PageId = 'overview') => {
    if (isExtensionEnvironment()) {
      void chrome.tabs.create({ url: chrome.runtime.getURL(`index.html#${page}`) });
      window.close();
    } else {
      window.open(`${window.location.pathname}#${page}`, '_blank');
    }
  };

  return (
    <main className="popup">
      <header className="popup__header"><Brand /><span className="popup-local"><LockKeyhole size={12} />Local only</span></header>
      <section className={`popup-status ${!state.settings.enabled ? 'popup-status--off' : ''}`}>
        <div className="popup-status__top"><span className="popup-status__shield"><ShieldCheck size={25} /></span><Toggle checked={state.settings.enabled} onChange={(enabled) => updateState((current) => ({ ...current, settings: { ...current.settings, enabled } }))} label="Toggle Hush protection" /></div>
        <h1>{state.settings.enabled ? 'You’re covered.' : 'Protection is paused.'}</h1>
        <p>{state.settings.enabled ? 'Hush is watching your supported AI prompts.' : 'Turn protection on before using an AI tool.'}</p>
        <span className="popup-status__badge"><span className="status-dot" />{state.isDemo ? 'Demo workspace' : 'Live local workspace'}</span>
      </section>
      <div className="popup-stats"><div><span><ScanLine size={15} />Prompts scanned</span><strong>{state.stats.scanned.toLocaleString()}</strong></div><div><span><ShieldCheck size={15} />Items protected</span><strong>{state.stats.itemsProtected.toLocaleString()}</strong></div></div>
      <section className="popup-recent"><header><h2>Recent activity</h2>{state.activity.length > 0 && <button type="button" onClick={() => openDashboard('activity')}>View all</button>}</header>{state.activity.length > 0 ? state.activity.slice(0, 3).map((event) => <div className="popup-event" key={event.id}><DestinationIcon id={event.destinationId} size="small" /><div><strong>{event.destinationName}</strong><span>{event.action === 'allowed' ? 'No sensitive data found' : `${event.findings} ${event.findings === 1 ? 'item' : 'items'} ${event.action}`}</span></div><time>{formatRelativeTime(event.timestamp)}</time></div>) : <p className="popup-empty">No protection events yet.</p>}</section>
      <div className="popup-actions"><button className="button button--primary" type="button" onClick={() => openDashboard('overview')}>Open control center<ArrowUpRight size={16} /></button><button className="button button--secondary" type="button" onClick={() => openDashboard('playground')} aria-label="Test a prompt"><FlaskConical size={17} /></button></div>
      <footer className="popup-footer">No prompt text stored. No cloud scanning.</footer>
    </main>
  );
}
