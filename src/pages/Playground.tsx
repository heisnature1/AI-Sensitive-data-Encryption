import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  CreditCard,
  Eraser,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import {
  previewValue,
  protectText,
  type DetectionCategory,
  type MaskStyle,
  type ProtectionResult,
} from '../lib/protection';
import type { HushState } from '../lib/storage';
import type { Navigate, Notify, StateUpdater } from '../lib/ui';
import { PageIntro } from '../components/PageIntro';

const SAMPLES = {
  pii: {
    label: 'Customer PII',
    text: `Draft a thoughtful response to this customer escalation.\n\nCustomer: Maya Chen\nEmail: maya.chen@example.com\nPhone: +1 415 555 0198\n\nMaya was charged twice and needs a resolution before Friday.`,
  },
  secrets: {
    label: 'Developer secrets',
    text: `Explain why this deployment is failing.\n\nAPI key: sk-proj-9f8e7d6c5b4a39281726hdKs\nAWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nDatabase: postgresql://demo_user:demo_password_7f3c9a@db.example.com:5432/support\n\nOnly use synthetic example credentials for this test.`,
  },
  financial: {
    label: 'Payment record',
    text: `Summarize this synthetic refund record for support.\n\nCustomer: Jordan Lee\nCard: 4242 4242 4242 4242\nEmail: jordan.lee@example.com\n\nThe card number is the standard test number, not a real payment method.`,
  },
};

type SampleId = keyof typeof SAMPLES;
const CATEGORY_ICONS = { Secrets: KeyRound, PII: UserRound, Financial: CreditCard } as const;

export function Playground({ state, updateState, navigate, notify }: {
  state: HushState;
  updateState: StateUpdater;
  navigate: Navigate;
  notify: Notify;
}) {
  const [sample, setSample] = useState<SampleId>('pii');
  const [input, setInput] = useState(SAMPLES.pii.text);
  const [result, setResult] = useState<ProtectionResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const scanSequence = useRef(0);

  const runScan = useCallback(async () => {
    const sequence = ++scanSequence.current;
    setScanning(true);
    setCopied(false);
    try {
      const protectedResult = await protectText(input, state.policies, state.settings.maskStyle);
      if (sequence === scanSequence.current) setResult(protectedResult);
    } finally {
      if (sequence === scanSequence.current) setScanning(false);
    }
  }, [input, state.policies, state.settings.maskStyle]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void runScan(); }, 220);
    return () => window.clearTimeout(timer);
  }, [runScan]);

  const selectSample = (id: SampleId) => {
    setSample(id);
    setInput(SAMPLES[id].text);
    setResult(null);
  };

  const copyProtected = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = result.text;
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopied(true);
    notify('Protected prompt copied. The original was not copied.');
    window.setTimeout(() => setCopied(false), 2200);
  };

  const findings = result?.findings ?? [];
  const enabledCount = Object.values(state.policies).filter(Boolean).length;

  return (
    <>
      <PageIntro
        eyebrow="LOCAL PLAYGROUND"
        title="See what Hush sees."
        description="Paste a prompt, inspect the findings, and take the protected version with you."
        actions={<span className="local-processing-pill"><LockKeyhole size={15} />Processed on this device</span>}
      />

      <div className="sample-bar">
        <span>Try a safe example</span>
        {(Object.keys(SAMPLES) as SampleId[]).map((id) => <button type="button" key={id} className={sample === id ? 'active' : ''} onClick={() => selectSample(id)}>{SAMPLES[id].label}</button>)}
        <span className="synthetic-label">Synthetic data only</span>
      </div>

      <div className="playground-grid">
        <section className="panel prompt-editor-card">
          <header className="prompt-panel-header"><div><span className="step-number">01</span><h2>Your prompt</h2></div><button className="icon-button" type="button" aria-label="Clear prompt" title="Clear prompt" onClick={() => { setInput(''); setResult(null); }}><Eraser size={17} /></button></header>
          <textarea className="prompt-input" value={input} onChange={(event) => { setInput(event.target.value); setCopied(false); }} placeholder="Paste the prompt you want to test…" spellCheck="false" aria-label="Prompt to scan" />
          <footer className="prompt-editor-footer"><span>{input.length.toLocaleString()} characters · {enabledCount} detectors on</span><button className="button button--primary" type="button" onClick={() => void runScan()} disabled={!input.trim() || scanning}>{scanning ? <LoaderCircle className="spin" size={16} /> : <ScanSearch size={16} />}{scanning ? 'Scanning…' : 'Scan & protect'}</button></footer>
        </section>

        <section className={`panel protected-output-card ${findings.length > 0 ? 'protected-output-card--found' : ''}`}>
          <header className="prompt-panel-header"><div><span className="step-number">02</span><h2>Protected version</h2></div><div className="output-controls">{result && <span className={`scan-result-badge ${findings.length ? 'scan-result-badge--found' : ''}`}>{findings.length ? `${findings.length} protected` : 'No findings'}</span>}<select aria-label="Preview replacement format" value={state.settings.maskStyle} onChange={(event) => updateState((current) => ({ ...current, settings: { ...current.settings, maskStyle: event.target.value as MaskStyle } }))}><option value="token">Tokens</option><option value="redact">Redact</option><option value="hash">SHA-256</option></select></div></header>
          <div className="protected-output">
            {scanning && !result ? <div className="output-loading"><LoaderCircle className="spin" size={24} /><span>Scanning locally…</span></div> : result ? <pre>{result.text || 'Your protected prompt will appear here.'}</pre> : <div className="output-loading"><ShieldCheck size={24} /><span>Ready for a local scan.</span></div>}
          </div>
          <footer className="prompt-editor-footer"><span>{result?.changed ? 'Original values replaced' : 'Nothing sensitive to replace'}</span><button className="button button--secondary" type="button" onClick={() => void copyProtected()} disabled={!result || !input.trim()}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy protected'}</button></footer>
        </section>
      </div>

      {state.settings.mode === 'block' && <div className="inline-notice"><LockKeyhole size={16} /><span>Your send-time policy is <strong>Block</strong>. This playground still shows a masking preview so you can test replacement formats.</span><button className="text-button" onClick={() => navigate('policies')}>Change response</button></div>}

      <section className="panel findings-panel">
        <header className="panel__header"><div><h2>Detection details</h2><p>Local validation and contextual confidence for every finding</p></div>{result && <span className={`risk-summary risk-summary--${result.risk}`}>{result.risk === 'none' ? 'No elevated risk' : `${result.risk} risk`}</span>}</header>
        {findings.length > 0 ? (
          <div className="findings-list">
            {findings.map((finding) => {
              const Icon = CATEGORY_ICONS[finding.category as DetectionCategory];
              return (
                <div className="finding-row" key={finding.id}>
                  <span className={`finding-icon finding-icon--${finding.category.toLowerCase()}`}><Icon size={18} /></span>
                  <div className="finding-copy"><strong>{finding.label}</strong><span>{finding.validationLabel}</span></div>
                  <code>{previewValue(finding.value)}</code>
                  <span className="confidence-label"><span><i style={{ width: `${finding.confidence * 100}%` }} /></span>{Math.round(finding.confidence * 100)}% confidence</span>
                  <span className={`severity-badge severity-badge--${finding.severity}`}>{finding.severity}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-findings"><span><ShieldCheck size={25} /></span><div><h3>{result ? 'No sensitive patterns found' : 'Your findings will appear here'}</h3><p>{result ? 'This prompt passes the currently enabled policies. No detection system is perfect—review before sharing.' : 'Run a scan to inspect local detections and their replacements.'}</p></div></div>
        )}
      </section>

      <div className="playground-privacy"><LockKeyhole size={16} /><span><strong>This test leaves no trace.</strong> Prompt text and detected values are held in memory only and are not added to your activity history.</span><ArrowRight size={15} /></div>
    </>
  );
}
