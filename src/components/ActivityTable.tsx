import { ArrowUpRight, Ban, Check, ShieldCheck } from 'lucide-react';
import type { ActivityEvent } from '../lib/storage';
import { formatFullTime, formatRelativeTime } from '../lib/ui';
import { DestinationIcon } from './DestinationIcon';
import { EmptyState } from './EmptyState';

export function ActionBadge({ action }: { action: ActivityEvent['action'] }) {
  const config = {
    masked: { label: 'Masked', icon: ShieldCheck },
    blocked: { label: 'Blocked', icon: Ban },
    allowed: { label: 'No findings', icon: Check },
  }[action];
  const Icon = config.icon;
  return <span className={`action-badge action-badge--${action}`}><Icon size={13} />{config.label}</span>;
}

export function ActivityTable({ events, onSelect, compact = false }: {
  events: ActivityEvent[];
  onSelect?: (event: ActivityEvent) => void;
  compact?: boolean;
}) {
  if (events.length === 0) {
    return <EmptyState title="No activity to show" description="Protected AI interactions will appear here. Prompt text is never included." />;
  }
  return (
    <div className="table-scroll">
      <table className={`activity-table ${compact ? 'activity-table--compact' : ''}`}>
        <thead>
          <tr>
            <th>Destination</th>
            <th>Status</th>
            <th>Detected</th>
            {!compact && <th>Data type</th>}
            <th>Time</th>
            {onSelect && <th><span className="sr-only">Details</span></th>}
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.id}
              onClick={() => onSelect?.(event)}
              onKeyDown={(keyboardEvent) => {
                if (onSelect && (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ')) onSelect(event);
              }}
              tabIndex={onSelect ? 0 : undefined}
              className={onSelect ? 'activity-row--interactive' : ''}
            >
              <td>
                <div className="destination-cell">
                  <DestinationIcon id={event.destinationId} size="small" />
                  <div><strong>{event.destinationName}</strong><span>{event.domain}</span></div>
                </div>
              </td>
              <td><ActionBadge action={event.action} /></td>
              <td>{event.findings > 0 ? <strong>{event.findings} {event.findings === 1 ? 'item' : 'items'}</strong> : <span className="muted">—</span>}</td>
              {!compact && <td><div className="category-list">{event.categories.length > 0 ? event.categories.map((category) => <span className="category-chip" key={category}>{category}</span>) : <span className="muted">None</span>}</div></td>}
              <td><span className="time-cell" title={formatFullTime(event.timestamp)}>{formatRelativeTime(event.timestamp)}</span></td>
              {onSelect && <td><ArrowUpRight size={16} className="row-arrow" /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ActivityDetails({ event }: { event: ActivityEvent }) {
  return (
    <div className="activity-details">
      <div className="activity-details__summary">
        <DestinationIcon id={event.destinationId} size="large" />
        <div><strong>{event.destinationName}</strong><span>{formatFullTime(event.timestamp)}</span></div>
        <ActionBadge action={event.action} />
      </div>
      <dl className="details-grid">
        <div><dt>Sensitive items</dt><dd>{event.findings}</dd></div>
        <div><dt>Risk level</dt><dd className={`risk-text risk-text--${event.severity}`}>{event.severity === 'none' ? 'None' : event.severity}</dd></div>
        <div><dt>Data categories</dt><dd>{event.categories.join(', ') || 'None'}</dd></div>
        <div><dt>Domain</dt><dd>{event.domain}</dd></div>
      </dl>
      <div className="privacy-note"><ShieldCheck size={18} /><p><strong>Privacy-safe by design.</strong> Hush stores this event metadata only. Prompt contents and detected values were never written to the activity log.</p></div>
    </div>
  );
}
