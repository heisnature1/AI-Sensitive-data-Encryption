import { useState } from 'react';
import {
  Bell,
  Check,
  ClipboardPaste,
  Database,
  Download,
  FolderUp,
  Info,
  LockKeyhole,
  Puzzle,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  createDemoState,
  createEmptyState,
  isExtensionEnvironment,
  type HushState,
} from '../lib/storage';
import { downloadJson, type Notify, type StateUpdater } from '../lib/ui';
import { Modal } from '../components/Modal';
import { PageIntro } from '../components/PageIntro';
import { Toggle } from '../components/Toggle';

export function Settings({ state, updateState, notify }: {
  state: HushState;
  updateState: StateUpdater;
  notify: Notify;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const extension = isExtensionEnvironment();
  return (
    <>
      <PageIntro eyebrow="SETTINGS" title="Protection, on your terms." description="Manage local behavior, your extension, and the data Hush keeps." />

      <div className="settings-layout">
        <div className="settings-main">
          <section className="panel settings-section">
            <header className="settings-section__header"><span><ShieldCheck size={19} /></span><div><h2>Protection behavior</h2><p>Control when Hush steps in and how it lets you know.</p></div></header>
            <div className="setting-row"><span className="setting-row__icon"><ShieldCheck size={18} /></span><div><strong>Prompt protection</strong><p>Scan supported AI composers before prompts are submitted.</p></div><Toggle checked={state.settings.enabled} onChange={(enabled) => updateState((current) => ({ ...current, settings: { ...current.settings, enabled } }))} label="Toggle prompt protection" /></div>
            <div className="setting-row"><span className="setting-row__icon"><ClipboardPaste size={18} /></span><div><strong>Scan pasted text</strong><p>Mask sensitive clipboard content as it enters an AI composer.</p></div><Toggle checked={state.settings.maskOnPaste} onChange={(maskOnPaste) => updateState((current) => ({ ...current, settings: { ...current.settings, maskOnPaste } }))} label="Toggle paste scanning" /></div>
            <div className="setting-row"><span className="setting-row__icon"><Bell size={18} /></span><div><strong>Desktop notifications</strong><p>Show a metadata-only browser notification after masking or blocking.</p></div><Toggle checked={state.settings.notifications} onChange={(notifications) => updateState((current) => ({ ...current, settings: { ...current.settings, notifications } }))} label="Toggle desktop notifications" /></div>
          </section>

          <section className="panel settings-section">
            <header className="settings-section__header"><span><Puzzle size={19} /></span><div><h2>Browser extension</h2><p>{extension ? 'Hush is running inside your browser extension.' : 'Add send-time protection to supported AI websites.'}</p></div><span className={`connection-badge ${extension ? 'connection-badge--connected' : ''}`}><span />{extension ? 'Connected' : 'Not installed'}</span></header>
            {extension ? (
              <div className="extension-connected"><span><Check size={22} /></span><div><strong>You’re protected at the source.</strong><p>Use the Hush toolbar popup for quick status, or keep this control center open for detailed policies.</p></div></div>
            ) : (
              <div className="install-steps">
                <div><span>1</span><p><strong>Build the extension</strong>Run <code>npm install && npm run build</code> in the project folder.</p></div>
                <div><span>2</span><p><strong>Open browser extensions</strong>Visit <code>chrome://extensions</code> or <code>edge://extensions</code> and enable Developer mode.</p></div>
                <div><span>3</span><p><strong>Load Hush</strong>Choose “Load unpacked” and select the generated <code>dist/</code> folder.</p></div>
              </div>
            )}
          </section>

          <section className="panel settings-section">
            <header className="settings-section__header"><span><Database size={19} /></span><div><h2>Local data</h2><p>Your settings and metadata stay in this browser profile.</p></div></header>
            <div className="data-summary"><div><strong>{state.activity.length}</strong><span>Stored events</span></div><div><strong>0</strong><span>Stored prompts</span></div><div><strong>0</strong><span>Detected values stored</span></div></div>
            <div className="data-actions">
              <button className="button button--secondary" type="button" onClick={() => {
                downloadJson(`hush-settings-${new Date().toISOString().slice(0, 10)}.json`, state);
                notify('Settings and privacy-safe metadata exported.');
              }}><Download size={16} />Export local data</button>
              {!extension && <button className="button button--secondary" type="button" onClick={() => { updateState(() => createDemoState()); notify('Demo workspace restored.'); }}><RotateCcw size={16} />Restore demo</button>}
              <button className="button button--ghost-danger" type="button" onClick={() => setConfirmReset(true)}><Trash2 size={16} />Reset everything</button>
            </div>
          </section>
        </div>

        <aside className="settings-side">
          <section className="local-card">
            <span className="local-card__icon"><LockKeyhole size={25} /></span>
            <span className="eyebrow">LOCAL BY DESIGN</span>
            <h2>Your words are yours.</h2>
            <p>Hush has no server, no analytics SDK, and no account system. Scanning and masking happen in your browser.</p>
            <ul><li><Check size={14} />No prompt text in activity logs</li><li><Check size={14} />No third-party network requests</li><li><Check size={14} />No cloud AI detection calls</li></ul>
          </section>
          <section className="scope-card"><Info size={18} /><div><strong>Know the scope</strong><p>Hush is a defense-in-depth layer, not a guarantee. It scans supported text composers, not file attachments or every possible network path. Always review sensitive output.</p></div></section>
          <div className="version-line"><FolderUp size={14} />Hush for Chrome & Edge · v1.0.0</div>
        </aside>
      </div>

      {confirmReset && <Modal title="Reset Hush completely?" description="This removes local settings, policies, activity, and counters." onClose={() => setConfirmReset(false)} width="small"><p className="modal-copy">The extension will return to its default protection policies. This cannot be undone.</p><div className="modal-actions"><button className="button button--secondary" type="button" onClick={() => setConfirmReset(false)}>Cancel</button><button className="button button--danger" type="button" onClick={() => { updateState(() => createEmptyState()); setConfirmReset(false); notify('Hush reset to a fresh local workspace.'); }}><Trash2 size={16} />Reset everything</button></div></Modal>}
    </>
  );
}
