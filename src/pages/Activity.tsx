import { useMemo, useState } from 'react';
import { Download, Search, ShieldCheck, Trash2 } from 'lucide-react';
import type { ActivityEvent, HushState } from '../lib/storage';
import { downloadJson, type Notify, type StateUpdater } from '../lib/ui';
import { ActivityDetails, ActivityTable } from '../components/ActivityTable';
import { Modal } from '../components/Modal';
import { PageIntro } from '../components/PageIntro';

interface ActivityProps {
  state: HushState;
  updateState: StateUpdater;
  query: string;
  setQuery: (query: string) => void;
  notify: Notify;
}

export function Activity({ state, updateState, query, setQuery, notify }: ActivityProps) {
  const [action, setAction] = useState('all');
  const [category, setCategory] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const filtered = useMemo(() => state.activity.filter((event) => {
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || [event.destinationName, event.domain, event.action, ...event.categories]
      .some((value) => value.toLowerCase().includes(needle));
    return matchesQuery
      && (action === 'all' || event.action === action)
      && (category === 'all' || event.categories.includes(category as ActivityEvent['categories'][number]));
  }), [state.activity, query, action, category]);

  const exportActivity = () => {
    downloadJson(`hush-activity-${new Date().toISOString().slice(0, 10)}.json`, {
      exportedAt: new Date().toISOString(),
      format: 'Hush privacy-safe activity metadata v1',
      note: 'This export contains no prompt text or detected values.',
      events: filtered,
    });
    notify(`Exported ${filtered.length} privacy-safe ${filtered.length === 1 ? 'event' : 'events'}.`);
  };

  const clearActivity = () => {
    updateState((current) => ({
      ...current,
      activity: [],
      stats: { scanned: 0, itemsProtected: 0, blocked: 0 },
      daily: [],
      isDemo: false,
    }));
    setConfirmClear(false);
    setQuery('');
    notify('Local activity and counters cleared.');
  };

  return (
    <>
      <PageIntro
        eyebrow="ACTIVITY"
        title="Every intervention, accounted for."
        description="A transparent audit trail with none of the sensitive content."
        actions={<>
          <button className="button button--secondary" type="button" onClick={() => setConfirmClear(true)} disabled={state.activity.length === 0}><Trash2 size={16} />Clear</button>
          <button className="button button--primary" type="button" onClick={exportActivity} disabled={filtered.length === 0}><Download size={16} />Export JSON</button>
        </>}
      />
      <div className="activity-assurance"><ShieldCheck size={17} /><span><strong>Your audit trail cannot become a leak.</strong> Hush never stores prompts, detected values, or masked output.</span></div>
      <section className="panel activity-page-card">
        <div className="activity-filters">
          <label className="search-field activity-search"><Search size={17} /><input id="activity-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search destination or data type…" aria-label="Search activity" /></label>
          <label className="select-field"><span className="sr-only">Filter by status</span><select value={action} onChange={(event) => setAction(event.target.value)}><option value="all">All statuses</option><option value="masked">Masked</option><option value="blocked">Blocked</option><option value="allowed">No findings</option></select></label>
          <label className="select-field"><span className="sr-only">Filter by category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All data types</option><option value="Secrets">Secrets</option><option value="PII">PII</option><option value="Financial">Financial</option></select></label>
        </div>
        <ActivityTable events={filtered} onSelect={setSelectedEvent} />
        <footer className="table-footer"><span>Showing {filtered.length} of {state.activity.length} events</span><span>Stored locally · Last 100 events</span></footer>
      </section>

      {selectedEvent && <Modal title="Activity details" description="A privacy-safe record of this protection event." onClose={() => setSelectedEvent(null)}><ActivityDetails event={selectedEvent} /></Modal>}
      {confirmClear && (
        <Modal title="Clear local activity?" description="This resets your events, chart, and lifetime counters." onClose={() => setConfirmClear(false)} width="small">
          <p className="modal-copy">Your protection settings and policies will stay exactly as they are. This action cannot be undone.</p>
          <div className="modal-actions"><button className="button button--secondary" type="button" onClick={() => setConfirmClear(false)}>Cancel</button><button className="button button--danger" type="button" onClick={clearActivity}><Trash2 size={16} />Clear activity</button></div>
        </Modal>
      )}
    </>
  );
}
