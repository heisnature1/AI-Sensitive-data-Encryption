import { describe, expect, it } from 'vitest';
import { createDemoState, createEmptyState, destinationForHostname, recordActivity, toActivityMetadata, type ActivityEvent } from './storage';

describe('privacy-safe local state', () => {
  it('starts real workspaces empty and explicitly labels demo data', () => {
    expect(createEmptyState().activity).toHaveLength(0);
    expect(createEmptyState().isDemo).toBe(false);
    expect(createDemoState().activity.length).toBeGreaterThan(0);
    expect(createDemoState().isDemo).toBe(true);
  });

  it('maps only supported AI hostnames', () => {
    expect(destinationForHostname('chatgpt.com')?.id).toBe('chatgpt');
    expect(destinationForHostname('chat.openai.com')?.id).toBe('chatgpt');
    expect(destinationForHostname('www.perplexity.ai')?.id).toBe('perplexity');
    expect(destinationForHostname('example.com')).toBeUndefined();
  });

  it('records counts and categories without storing prompt values', async () => {
    const event: ActivityEvent = {
      id: 'test-event', destinationId: 'chatgpt', destinationName: 'ChatGPT', domain: 'chatgpt.com',
      timestamp: Date.now(), action: 'masked', findings: 2, categories: ['Secrets', 'PII'], severity: 'critical',
    };
    const unsafeEvent = Object.assign(event, { promptText: 'sensitive prompt body', value: 'raw-secret-value' });
    const state = await recordActivity(unsafeEvent);
    expect(state.stats.scanned).toBe(1);
    expect(state.stats.itemsProtected).toBe(2);
    expect(state.activity[0]).toEqual(toActivityMetadata(event));
    expect(JSON.stringify(state)).not.toContain('promptText');
    expect(JSON.stringify(state)).not.toContain('sensitive prompt body');
    expect(JSON.stringify(state)).not.toContain('raw-secret-value');
  });
});
