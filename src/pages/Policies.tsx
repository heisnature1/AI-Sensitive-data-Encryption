import { useMemo, useState } from 'react';
import {
  Ban,
  Braces,
  Check,
  CreditCard,
  Fingerprint,
  KeyRound,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { DETECTORS, type DetectionCategory, type MaskStyle, type ProtectionMode } from '../lib/protection';
import type { HushState } from '../lib/storage';
import type { Navigate, Notify, StateUpdater } from '../lib/ui';
import { PageIntro } from '../components/PageIntro';
import { Toggle } from '../components/Toggle';

interface PoliciesProps {
  state: HushState;
  updateState: StateUpdater;
  navigate: Navigate;
  notify: Notify;
}

const CATEGORY_ICONS = { Secrets: KeyRound, PII: Fingerprint, Financial: CreditCard };

export function Policies({ state, updateState, navigate, notify }: PoliciesProps) {
  const [category, setCategory] = useState<'All' | DetectionCategory>('All');
  const [query, setQuery] = useState('');
  const enabledCount = DETECTORS.filter((detector) => state.policies[detector.id] !== false).length;
  const filtered = useMemo(() => DETECTORS.filter((detector) => {
    const matchesCategory = category === 'All' || detector.category === category;
    const needle = query.toLowerCase().trim();
    return matchesCategory && (!needle || `${detector.label} ${detector.description}`.toLowerCase().includes(needle));
  }), [category, query]);

  const setMode = (mode: ProtectionMode) => updateState((current) => ({ ...current, settings: { ...current.settings, mode } }));
  const setMaskStyle = (maskStyle: MaskStyle) => updateState((current) => ({ ...current, settings: { ...current.settings, maskStyle } }));
  const togglePolicy = (id: string, enabled: boolean) => updateState((current) => ({ ...current, policies: { ...current.policies, [id]: enabled } }));

  return (
    <>
      <PageIntro
        eyebrow="PROTECTION POLICIES"
        title="Rules that know what matters."
        description={`${enabledCount} of ${DETECTORS.length} detectors active. Tune protection to match your workflow.`}
        actions={<button className="button button--secondary" type="button" onClick={() => navigate('playground')}><ScanSearch size={16} />Test your policies</button>}
      />

      <section className="panel response-panel">
        <div className="section-heading"><div><h2>When sensitive data is found</h2><p>Choose the default response across every protected AI destination.</p></div><span className="soft-badge"><Sparkles size={13} />Recommended: Mask</span></div>
        <div className="response-options">
          <button type="button" className={`response-option ${state.settings.mode === 'mask' ? 'response-option--selected' : ''}`} onClick={() => setMode('mask')}>
            <span className="response-option__icon"><ShieldCheck size={21} /></span>
            <span><strong>Mask & let me review</strong><small>Replace sensitive values, keep the prompt in the composer, and preserve your workflow.</small></span>
            <span className="radio-indicator">{state.settings.mode === 'mask' && <Check size={13} />}</span>
          </button>
          <button type="button" className={`response-option ${state.settings.mode === 'block' ? 'response-option--selected response-option--block' : ''}`} onClick={() => setMode('block')}>
            <span className="response-option__icon"><Ban size={21} /></span>
            <span><strong>Block the prompt</strong><small>Stop the action and leave the original text untouched so you can edit it yourself.</small></span>
            <span className="radio-indicator">{state.settings.mode === 'block' && <Check size={13} />}</span>
          </button>
        </div>
        {state.settings.mode === 'mask' && (
          <div className="mask-style-row">
            <div><strong>Replacement format</strong><p>Tokens preserve type context without retaining the original value.</p></div>
            <label className="select-field"><span className="sr-only">Replacement format</span><select value={state.settings.maskStyle} onChange={(event) => setMaskStyle(event.target.value as MaskStyle)}><option value="token">Pseudonym token</option><option value="redact">Full redaction</option><option value="hash">SHA-256 placeholder</option></select></label>
            <code>{state.settings.maskStyle === 'token' ? '[EMAIL_A1B2C3]' : state.settings.maskStyle === 'redact' ? '[REDACTED_EMAIL]' : '[EMAIL_SHA256:94a8…]'}</code>
          </div>
        )}
        {state.settings.maskStyle === 'hash' && state.settings.mode === 'mask' && <p className="inline-warning">SHA-256 placeholders support correlation, but hashing is not anonymization for guessable values such as SSNs. Prefer full redaction for low-entropy data.</p>}
      </section>

      <section className="panel policies-panel">
        <div className="policy-toolbar">
          <div className="policy-tabs" role="tablist" aria-label="Policy categories">
            {(['All', 'Secrets', 'PII', 'Financial'] as const).map((item) => <button role="tab" aria-selected={category === item} type="button" key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}<span>{item === 'All' ? DETECTORS.length : DETECTORS.filter((detector) => detector.category === item).length}</span></button>)}
          </div>
          <label className="search-field policy-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a policy…" aria-label="Find a policy" /></label>
        </div>
        <div className="policy-list">
          {filtered.map((detector) => {
            const Icon = CATEGORY_ICONS[detector.category];
            const enabled = state.policies[detector.id] !== false;
            return (
              <div className={`policy-row ${!enabled ? 'policy-row--disabled' : ''}`} key={detector.id}>
                <span className={`policy-row__icon policy-row__icon--${detector.category.toLowerCase()}`}><Icon size={19} /></span>
                <div className="policy-row__copy"><div><strong>{detector.label}</strong><span className={`severity-badge severity-badge--${detector.severity}`}>{detector.severity}</span></div><p>{detector.description}</p><span className="validation-label"><Braces size={12} />{detector.validationLabel}</span></div>
                <Toggle checked={enabled} onChange={(value) => togglePolicy(detector.id, value)} label={`${enabled ? 'Disable' : 'Enable'} ${detector.label} policy`} />
              </div>
            );
          })}
          {filtered.length === 0 && <div className="policy-empty">No policies match “{query}”.</div>}
        </div>
        <footer className="policy-footer"><span>{enabledCount} active detectors</span><button className="text-button" type="button" onClick={() => {
          updateState((current) => ({ ...current, policies: Object.fromEntries(DETECTORS.map((detector) => [detector.id, true])) }));
          notify('All detection policies enabled.');
        }} disabled={enabledCount === DETECTORS.length}>Enable all</button></footer>
      </section>

      <section className="heuristics-card">
        <span className="heuristics-card__icon"><ScanSearch size={22} /></span>
        <div><h3>Pattern matching, with context.</h3><p>Hush combines regex with local heuristics: nearby field labels improve name detection, entropy filters generic secrets, and Luhn validation reduces payment-card false positives. No model calls or cloud analysis.</p></div>
      </section>
    </>
  );
}
