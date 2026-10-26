import { ArrowRight, Check, Globe2, Info, MousePointer2, ScanText, ShieldCheck } from 'lucide-react';
import { DESTINATIONS, isExtensionEnvironment, type HushState } from '../lib/storage';
import type { Navigate, Notify, StateUpdater } from '../lib/ui';
import { DestinationIcon } from '../components/DestinationIcon';
import { PageIntro } from '../components/PageIntro';
import { Toggle } from '../components/Toggle';

export function Destinations({ state, updateState, navigate, notify }: {
  state: HushState;
  updateState: StateUpdater;
  navigate: Navigate;
  notify: Notify;
}) {
  const enabled = DESTINATIONS.filter((destination) => state.destinations[destination.id] !== false).length;
  return (
    <>
      <PageIntro
        eyebrow="AI DESTINATIONS"
        title="One safety net. Every AI tool."
        description="Choose where Hush should inspect prompts before they leave your browser."
        actions={<button className="button button--secondary" type="button" disabled={enabled === DESTINATIONS.length} onClick={() => {
          updateState((current) => ({ ...current, destinations: Object.fromEntries(DESTINATIONS.map((destination) => [destination.id, true])) }));
          notify('All bundled AI destinations enabled.');
        }}><Check size={16} />Enable all</button>}
      />

      {!isExtensionEnvironment() && <div className="preview-notice"><Info size={18} /><div><strong>You’re using the browser control center.</strong><p>Playground scanning is fully functional here. Install the extension to intercept prompts on external AI websites.</p></div><button className="text-button" type="button" onClick={() => navigate('settings')}>Install steps<ArrowRight size={14} /></button></div>}

      <div className="destination-layout">
        <section className="panel destinations-panel">
          <header className="panel__header"><div><h2>Protected destinations</h2><p>{enabled} of {DESTINATIONS.length} destinations enabled</p></div><span className="soft-badge"><span className="status-dot" />Local ruleset v1</span></header>
          <div className="coverage-progress"><span style={{ width: `${enabled / DESTINATIONS.length * 100}%` }} /></div>
          <div className="destination-grid">
            {DESTINATIONS.map((destination) => {
              const active = state.destinations[destination.id] !== false;
              return (
                <article className={`destination-card ${!active ? 'destination-card--off' : ''}`} key={destination.id}>
                  <div className="destination-card__top"><DestinationIcon id={destination.id} size="large" /><Toggle checked={active} onChange={(value) => updateState((current) => ({ ...current, destinations: { ...current.destinations, [destination.id]: value } }))} label={`${active ? 'Disable' : 'Enable'} protection for ${destination.name}`} /></div>
                  <h3>{destination.name}</h3>
                  <p>{destination.description}</p>
                  <span className={`destination-status ${active ? 'destination-status--active' : ''}`}><span />{active ? 'Protection enabled' : 'Protection off'}</span>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="destination-side">
          <section className="panel how-card">
            <span className="eyebrow">THE HANDOFF</span>
            <h2>Protection in three small steps.</h2>
            <div className="how-step"><span><MousePointer2 size={17} /></span><div><strong>1. You hit send</strong><p>Hush intercepts the composer action before the prompt is submitted.</p></div></div>
            <div className="how-step"><span><ScanText size={17} /></span><div><strong>2. Hush scans locally</strong><p>Enabled patterns and context heuristics identify sensitive values.</p></div></div>
            <div className="how-step"><span><ShieldCheck size={17} /></span><div><strong>3. You stay in control</strong><p>Masked text returns to the composer for your review. Nothing auto-sends.</p></div></div>
          </section>
          <section className="destination-note"><Globe2 size={19} /><div><strong>Purposefully scoped.</strong><p>Hush runs only on the AI domains listed here—not on your general browsing.</p></div></section>
        </aside>
      </div>
    </>
  );
}
