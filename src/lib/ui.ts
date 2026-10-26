import type { HushState } from './storage';

export type PageId = 'overview' | 'activity' | 'policies' | 'destinations' | 'playground' | 'settings';
export type StateUpdater = (updater: (state: HushState) => HushState) => void;
export type Navigate = (page: PageId) => void;
export type Notify = (message: string) => void;

export function formatRelativeTime(timestamp: number): string {
  const difference = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(difference / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export function formatFullTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(timestamp));
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
