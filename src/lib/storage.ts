import {
  DEFAULT_POLICIES,
  type DetectionCategory,
  type MaskStyle,
  type ProtectionMode,
  type Severity,
} from './protection';

export const STORAGE_KEY = 'hush-state-v1';

export interface Settings {
  enabled: boolean;
  mode: ProtectionMode;
  maskStyle: MaskStyle;
  maskOnPaste: boolean;
  notifications: boolean;
}

export interface Destination {
  id: string;
  name: string;
  domain: string;
  color: string;
  softColor: string;
  description: string;
}

export interface ActivityEvent {
  id: string;
  destinationId: string;
  destinationName: string;
  domain: string;
  timestamp: number;
  action: 'masked' | 'blocked' | 'allowed';
  findings: number;
  categories: DetectionCategory[];
  severity: Severity | 'none';
}

export interface Stats {
  scanned: number;
  itemsProtected: number;
  blocked: number;
}

export interface DailyStat {
  date: string;
  scanned: number;
  protected: number;
}

export interface HushState {
  version: 1;
  settings: Settings;
  policies: Record<string, boolean>;
  destinations: Record<string, boolean>;
  activity: ActivityEvent[];
  stats: Stats;
  daily: DailyStat[];
  isDemo: boolean;
}

export const DESTINATIONS: Destination[] = [
  { id: 'chatgpt', name: 'ChatGPT', domain: 'chatgpt.com', color: '#0f8a6a', softColor: '#e6f5f0', description: 'chatgpt.com and chat.openai.com' },
  { id: 'claude', name: 'Claude', domain: 'claude.ai', color: '#b76543', softColor: '#f9eee8', description: 'claude.ai' },
  { id: 'gemini', name: 'Gemini', domain: 'gemini.google.com', color: '#5875c5', softColor: '#edf0fb', description: 'gemini.google.com' },
  { id: 'copilot', name: 'Microsoft Copilot', domain: 'copilot.microsoft.com', color: '#6d5bb8', softColor: '#f0edfa', description: 'copilot.microsoft.com' },
  { id: 'perplexity', name: 'Perplexity', domain: 'perplexity.ai', color: '#287b84', softColor: '#e8f4f4', description: 'www.perplexity.ai' },
  { id: 'poe', name: 'Poe', domain: 'poe.com', color: '#775aa5', softColor: '#f1ecf7', description: 'poe.com' },
  { id: 'grok', name: 'Grok', domain: 'grok.com', color: '#3f4945', softColor: '#edf0ee', description: 'grok.com' },
];

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  mode: 'mask',
  maskStyle: 'token',
  maskOnPaste: true,
  notifications: true,
};

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createDemoActivity(): ActivityEvent[] {
  const now = Date.now();
  const minutes = (value: number) => now - value * 60_000;
  return [
    { id: 'demo-1', destinationId: 'chatgpt', destinationName: 'ChatGPT', domain: 'chatgpt.com', timestamp: minutes(8), action: 'masked', findings: 4, categories: ['Secrets', 'PII'], severity: 'critical' },
    { id: 'demo-2', destinationId: 'claude', destinationName: 'Claude', domain: 'claude.ai', timestamp: minutes(24), action: 'masked', findings: 2, categories: ['PII'], severity: 'medium' },
    { id: 'demo-3', destinationId: 'gemini', destinationName: 'Gemini', domain: 'gemini.google.com', timestamp: minutes(47), action: 'allowed', findings: 0, categories: [], severity: 'none' },
    { id: 'demo-4', destinationId: 'copilot', destinationName: 'Microsoft Copilot', domain: 'copilot.microsoft.com', timestamp: minutes(73), action: 'blocked', findings: 1, categories: ['Secrets'], severity: 'critical' },
    { id: 'demo-5', destinationId: 'perplexity', destinationName: 'Perplexity', domain: 'perplexity.ai', timestamp: minutes(126), action: 'masked', findings: 1, categories: ['Financial'], severity: 'critical' },
    { id: 'demo-6', destinationId: 'chatgpt', destinationName: 'ChatGPT', domain: 'chatgpt.com', timestamp: minutes(189), action: 'masked', findings: 3, categories: ['PII'], severity: 'high' },
    { id: 'demo-7', destinationId: 'poe', destinationName: 'Poe', domain: 'poe.com', timestamp: minutes(264), action: 'allowed', findings: 0, categories: [], severity: 'none' },
    { id: 'demo-8', destinationId: 'claude', destinationName: 'Claude', domain: 'claude.ai', timestamp: minutes(338), action: 'masked', findings: 2, categories: ['Secrets'], severity: 'critical' },
    { id: 'demo-9', destinationId: 'grok', destinationName: 'Grok', domain: 'grok.com', timestamp: minutes(491), action: 'allowed', findings: 0, categories: [], severity: 'none' },
    { id: 'demo-10', destinationId: 'chatgpt', destinationName: 'ChatGPT', domain: 'chatgpt.com', timestamp: minutes(721), action: 'masked', findings: 1, categories: ['PII'], severity: 'medium' },
  ];
}

function createDemoDaily(): DailyStat[] {
  const scanned = [58, 64, 71, 69, 78, 74, 83, 88, 94, 102, 98, 111, 119, 135];
  const protectedItems = [11, 14, 16, 13, 19, 17, 22, 21, 25, 27, 24, 29, 31, 34];
  return scanned.map((value, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (scanned.length - 1 - index));
    return { date: dateKey(date), scanned: value, protected: protectedItems[index] };
  });
}

export function createEmptyState(): HushState {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    policies: { ...DEFAULT_POLICIES },
    destinations: Object.fromEntries(DESTINATIONS.map((destination) => [destination.id, true])),
    activity: [],
    stats: { scanned: 0, itemsProtected: 0, blocked: 0 },
    daily: [],
    isDemo: false,
  };
}

export function createDemoState(): HushState {
  return {
    ...createEmptyState(),
    activity: createDemoActivity(),
    stats: { scanned: 1284, itemsProtected: 347, blocked: 18 },
    daily: createDemoDaily(),
    isDemo: true,
  };
}

export function toActivityMetadata(event: ActivityEvent): ActivityEvent {
  // Runtime whitelisting prevents future callers from accidentally persisting prompt text
  // or finding values as extra properties on an otherwise well-formed event object.
  return {
    id: event.id,
    destinationId: event.destinationId,
    destinationName: event.destinationName,
    domain: event.domain,
    timestamp: event.timestamp,
    action: event.action,
    findings: event.findings,
    categories: [...event.categories],
    severity: event.severity,
  };
}

function normalizeState(value: unknown, demoFallback = false): HushState {
  const fallback = demoFallback ? createDemoState() : createEmptyState();
  if (!value || typeof value !== 'object') return fallback;
  const stored = value as Partial<HushState>;
  return {
    version: 1,
    settings: { ...fallback.settings, ...stored.settings },
    policies: { ...fallback.policies, ...stored.policies },
    destinations: { ...fallback.destinations, ...stored.destinations },
    activity: Array.isArray(stored.activity) ? stored.activity.map(toActivityMetadata) : fallback.activity,
    stats: { ...fallback.stats, ...stored.stats },
    daily: Array.isArray(stored.daily) ? stored.daily : fallback.daily,
    isDemo: typeof stored.isDemo === 'boolean' ? stored.isDemo : fallback.isDemo,
  };
}

export function isExtensionEnvironment(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id) && Boolean(chrome.storage?.local);
}

export async function loadState(demoFallback = false): Promise<HushState> {
  try {
    if (isExtensionEnvironment()) {
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      return normalizeState(stored[STORAGE_KEY], false);
    }
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return normalizeState(raw ? JSON.parse(raw) : null, demoFallback);
    }
  } catch {
    // A fresh in-memory state is safer than preventing the control center from loading.
  }
  return demoFallback ? createDemoState() : createEmptyState();
}

export async function saveState(state: HushState): Promise<void> {
  if (isExtensionEnvironment()) {
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    return;
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function subscribeToState(callback: (state: HushState) => void): () => void {
  if (isExtensionEnvironment()) {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[STORAGE_KEY]?.newValue) {
        callback(normalizeState(changes[STORAGE_KEY].newValue));
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }
  if (typeof window !== 'undefined') {
    const listener = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try { callback(normalizeState(JSON.parse(event.newValue))); } catch { /* ignore malformed external data */ }
      }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }
  return () => undefined;
}

export async function recordActivity(event: ActivityEvent): Promise<HushState> {
  const metadata = toActivityMetadata(event);
  const state = await loadState(false);
  const today = dateKey(new Date());
  const daily = state.daily.filter((day) => day.date !== today);
  const previous = state.daily.find((day) => day.date === today);
  daily.push({
    date: today,
    scanned: (previous?.scanned ?? 0) + 1,
    protected: (previous?.protected ?? 0) + (metadata.action === 'masked' ? metadata.findings : 0),
  });
  daily.sort((a, b) => a.date.localeCompare(b.date));

  const next: HushState = {
    ...state,
    isDemo: false,
    activity: [metadata, ...state.activity].slice(0, 100),
    stats: {
      scanned: state.stats.scanned + 1,
      itemsProtected: state.stats.itemsProtected + (metadata.action === 'masked' ? metadata.findings : 0),
      blocked: state.stats.blocked + (metadata.action === 'blocked' ? 1 : 0),
    },
    daily: daily.slice(-30),
  };
  await saveState(next);
  return next;
}

export function destinationForHostname(hostname: string): Destination | undefined {
  const normalized = hostname.toLowerCase().replace(/^www\./, '');
  if (normalized === 'chat.openai.com') return DESTINATIONS.find((item) => item.id === 'chatgpt');
  return DESTINATIONS.find((item) => normalized === item.domain.replace(/^www\./, ''));
}
