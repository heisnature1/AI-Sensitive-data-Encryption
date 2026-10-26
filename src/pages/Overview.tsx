import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Ban,
  FlaskConical,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import { DETECTORS } from '../lib/protection';
import { DESTINATIONS, type ActivityEvent, type DailyStat, type HushState } from '../lib/storage';
import type { Navigate, StateUpdater } from '../lib/ui';
import { ActivityDetails, ActivityTable } from '../components/ActivityTable';
import { Modal } from '../components/Modal';
import { PageIntro } from '../components/PageIntro';
import { Toggle } from '../components/Toggle';

interface OverviewProps {
  state: HushState;
  updateState: StateUpdater;
  navigate: Navigate;
}

function chartData(state: HushState, range: number): DailyStat[] {
  return Array.from({ length: range }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (range - 1 - index));
    const key = date.toISOString().slice(0, 10);
    return state.daily.find((day) => day.date === key) ?? { date: key, scanned: 0, protected: 0 };
  });
}

function ActivityChart({ state }: { state: HushState }) {
  const [range, setRange] = useState(7);
  const data = useMemo(() => chartData(state, range), [state, range]);
  const width = 720;
  const height = 224;
  const padding = { top: 16, right: 14, bottom: 30, left: 38 };
  const rawMax = Math.max(...data.flatMap((day) => [day.scanned, day.protected]), 1);
  const roughStep = rawMax / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceStep = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) * magnitude;
  const max = niceStep * 4;
  const x = (index: number) => padding.left + index * ((width - padding.left - padding.right) / Math.max(1, data.length - 1));
  const y = (value: number) => padding.top + (height - padding.top - padding.bottom) * (1 - value / max);
  const scannedPoints = data.map((day, index) => ({ x: x(index), y: y(day.scanned) }));
  const protectedPoints = data.map((day, index) => ({ x: x(index), y: y(day.protected) }));
  const path = (points: { x: number; y: number }[]) => points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const area = `${path(scannedPoints)} L${scannedPoints.at(-1)?.x},${y(0)} L${scannedPoints[0]?.x},${y(0)} Z`;
  const hasActivity = data.some((day) => day.scanned > 0 || day.protected > 0);

  return (
    <section className="panel activity-chart-card">
      <header className="panel__header">
        <div><h2>Protection activity</h2><p>Prompts scanned and sensitive items protected</p></div>
        <div className="segmented-control" aria-label="Chart date range">
          <button type="button" className={range === 7 ? 'active' : ''} onClick={() => setRange(7)}>7 days</button>
          <button type="button" className={range === 14 ? 'active' : ''} onClick={() => setRange(14)}>14 days</button>
        </div>
      </header>
      <div className="chart-legend">
        <span><i className="legend-dot legend-dot--green" />Prompts scanned</span>
        <span><i className="legend-dot legend-dot--lime" />Items protected</span>
      </div>
      <div className="chart-wrap">
        <svg className="activity-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Protection activity over time">
          <defs>
            <linearGradient id="scan-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b8968" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b8968" stopOpacity="0" />
            </linearGradient>
          </defs>
          {Array.from({ length: 5 }, (_, index) => {
            const value = max - index * niceStep;
            return (
              <g key={index}>
                <line x1={padding.left} x2={width - padding.right} y1={y(value)} y2={y(value)} stroke="#e9eeeb" strokeDasharray={index === 4 ? undefined : '3 4'} />
                <text x={padding.left - 9} y={y(value) + 4} textAnchor="end" className="chart-axis-label">{value >= 1000 ? `${value / 1000}k` : value}</text>
              </g>
            );
          })}
          <path d={area} fill="url(#scan-area)" />
          <path d={path(scannedPoints)} fill="none" stroke="#2d7959" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={path(protectedPoints)} fill="none" stroke="#a4bf55" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          {scannedPoints.map((point, index) => (
            <g key={data[index].date}>
              <circle cx={point.x} cy={point.y} r="8" fill="transparent">
                <title>{`${data[index].date}: ${data[index].scanned} prompts scanned, ${data[index].protected} items protected`}</title>
              </circle>
              <circle cx={point.x} cy={point.y} r="3.25" fill="#fff" stroke="#2d7959" strokeWidth="2" />
              {(range === 7 || index % 2 === 0 || index === data.length - 1) && (
                <text x={point.x} y={height - 8} textAnchor="middle" className="chart-axis-label">
                  {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${data[index].date}T00:00:00Z`))}
                </text>
              )}
            </g>
          ))}
        </svg>
        {!hasActivity && <div className="chart-empty">Your protection activity will appear here.</div>}
      </div>
    </section>
  );
}

function DetectionMix({ state }: { state: HushState }) {
  const values = useMemo(() => {
    if (state.isDemo) return { Secrets: 146, PII: 121, Financial: 80 };
    const result = { Secrets: 0, PII: 0, Financial: 0 };
    state.activity.forEach((event) => event.categories.forEach((category) => { result[category] += 1; }));
    return result;
  }, [state]);
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  const secretPct = total ? values.Secrets / total * 100 : 0;
  const piiPct = total ? values.PII / total * 100 : 0;
  const background = total
    ? `conic-gradient(#2e7659 0 ${secretPct}%, #a5bf5b ${secretPct}% ${secretPct + piiPct}%, #dfa158 ${secretPct + piiPct}% 100%)`
    : 'conic-gradient(#edf1ee 0 100%)';
  const colors: Record<string, string> = { Secrets: '#2e7659', PII: '#a5bf5b', Financial: '#dfa158' };

  return (
    <section className="panel mix-card">
      <header className="panel__header"><div><h2>Detection mix</h2><p>{state.isDemo ? 'Protected items, all time' : 'From recent event history'}</p></div></header>
      <div className="mix-content">
        <div className="donut" style={{ background }}>
          <div><strong>{total}</strong><span>{state.isDemo ? 'items' : 'signals'}</span></div>
        </div>
        <div className="mix-legend">
          {Object.entries(values).map(([category, value]) => (
            <div key={category}><span><i style={{ background: colors[category] }} />{category}</span><strong>{total ? Math.round(value / total * 100) : 0}%</strong></div>
          ))}
        </div>
      </div>
      <p className="panel-footnote">Values stay in the browser. Only category metadata is counted.</p>
    </section>
  );
}

export function Overview({ state, updateState, navigate }: OverviewProps) {
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
  const enabledPolicies = DETECTORS.filter((detector) => state.policies[detector.id] !== false).length;
  const enabledDestinations = DESTINATIONS.filter((destination) => state.destinations[destination.id] !== false).length;
  const health = state.settings.enabled
    ? Math.round((enabledPolicies / DETECTORS.length * 0.6 + enabledDestinations / DESTINATIONS.length * 0.4) * 100)
    : 0;
  const metrics = [
    { label: 'Prompts scanned', value: state.stats.scanned.toLocaleString(), note: state.isDemo ? '+12.8%' : 'All time', icon: ScanLine, tone: 'green' },
    { label: 'Sensitive items protected', value: state.stats.itemsProtected.toLocaleString(), note: state.isDemo ? '+8.4%' : 'All time', icon: ShieldCheck, tone: 'lime' },
    { label: 'Prompts blocked', value: state.stats.blocked.toLocaleString(), note: state.isDemo ? '1.4% of scans' : 'All time', icon: Ban, tone: 'orange' },
    { label: 'Local processing', value: '100%', note: 'No prompt uploads', icon: LockKeyhole, tone: 'blue' },
  ];

  return (
    <>
      <PageIntro
        eyebrow="OVERVIEW"
        title={state.settings.enabled ? 'Your AI safety net is on.' : 'Your AI safety net is paused.'}
        description="Sensitive data stops here. Productivity doesn’t."
        actions={<button className="button button--primary" type="button" onClick={() => navigate('playground')}><FlaskConical size={17} />Test a prompt<ArrowRight size={16} /></button>}
      />

      <section className={`protection-status ${!state.settings.enabled ? 'protection-status--paused' : ''}`}>
        <span className="protection-status__icon"><ShieldCheck size={23} /></span>
        <div><strong>{state.settings.enabled ? 'Protection is active' : 'Protection is paused'}</strong><p>{enabledPolicies} policies watching {enabledDestinations} AI destinations. All analysis happens on this device.</p></div>
        <button className="text-button protection-status__link" type="button" onClick={() => navigate('policies')}>Manage policies<ArrowUpRight size={14} /></button>
        <Toggle checked={state.settings.enabled} onChange={(enabled) => updateState((current) => ({ ...current, settings: { ...current.settings, enabled } }))} label="Toggle prompt protection" />
      </section>

      <div className="metric-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <section className="metric-card" key={metric.label}>
              <div className={`metric-card__icon metric-card__icon--${metric.tone}`}><Icon size={19} /></div>
              <span className={`metric-note ${state.isDemo && metric.note.startsWith('+') ? 'metric-note--positive' : ''}`}>{metric.note}</span>
              <strong>{metric.value}</strong>
              <p>{metric.label}</p>
            </section>
          );
        })}
      </div>

      <div className="overview-chart-grid">
        <ActivityChart state={state} />
        <section className="panel health-card">
          <header className="panel__header"><div><h2>Protection health</h2><p>Your current coverage</p></div></header>
          <div className="health-score-wrap">
            <div className="health-ring" style={{ background: `conic-gradient(${health >= 80 ? '#2f7d5c' : '#d99a4e'} ${health}%, #e9eeeb 0)` }}>
              <div><strong>{health}</strong><span>/ 100</span></div>
            </div>
            <strong>{health >= 90 ? 'Excellent coverage' : health >= 70 ? 'Good coverage' : 'Needs attention'}</strong>
            <p>{health >= 90 ? 'Your core protections are in place.' : 'Enable more policies to improve coverage.'}</p>
          </div>
          <div className="health-checks">
            <div><span><LockKeyhole size={15} />Local-only scanning</span><strong>On</strong></div>
            <div><span><ShieldCheck size={15} />Active policies</span><strong>{enabledPolicies}/{DETECTORS.length}</strong></div>
            <div><span><ScanLine size={15} />AI destinations</span><strong>{enabledDestinations}/{DESTINATIONS.length}</strong></div>
          </div>
          <button className="button button--soft button--full" type="button" onClick={() => navigate('policies')}>Review coverage<ArrowRight size={15} /></button>
        </section>
      </div>

      <div className="overview-bottom-grid">
        <section className="panel recent-card">
          <header className="panel__header"><div><h2>Recent activity</h2><p>Metadata only. Never your prompt text.</p></div><button className="text-button" type="button" onClick={() => navigate('activity')}>View all<ArrowRight size={14} /></button></header>
          <ActivityTable events={state.activity.slice(0, 5)} compact onSelect={setSelectedEvent} />
        </section>
        <DetectionMix state={state} />
      </div>

      {selectedEvent && <Modal title="Activity details" description="A privacy-safe record of this protection event." onClose={() => setSelectedEvent(null)}><ActivityDetails event={selectedEvent} /></Modal>}
    </>
  );
}
