import {
  maskFindings,
  scanText,
  SEVERITY_WEIGHT,
  type Finding,
  type Severity,
} from '../lib/protection';
import {
  createEmptyState,
  destinationForHostname,
  loadState,
  subscribeToState,
  type ActivityEvent,
  type HushState,
} from '../lib/storage';

type Editor = HTMLTextAreaElement | HTMLInputElement | HTMLElement;

let state: HushState = createEmptyState();
void loadState(false).then((stored) => { state = stored; });
subscribeToState((updated) => { state = updated; });

const recentScans = new WeakMap<HTMLElement, { text: string; time: number }>();
let toastTimer: number | undefined;

function isEditable(element: unknown): element is Editor {
  return element instanceof HTMLTextAreaElement
    || (element instanceof HTMLInputElement && ['text', 'search'].includes(element.type))
    || (element instanceof HTMLElement && (element.isContentEditable || element.getAttribute('role') === 'textbox'));
}

function visible(element: HTMLElement): boolean {
  return element.getClientRects().length > 0 && !element.hasAttribute('disabled');
}

function findEditor(origin?: Element | null): Editor | null {
  if (isEditable(origin) && visible(origin)) return origin;
  if (origin instanceof Element) {
    const nested = origin.querySelector('textarea, [contenteditable="true"], [role="textbox"]');
    if (isEditable(nested) && visible(nested)) return nested;
  }
  const candidates = Array.from(document.querySelectorAll(
    '#prompt-textarea, textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"], [role="textbox"]',
  ));
  return candidates.find((item): item is Editor => isEditable(item) && visible(item)) ?? null;
}

function editorText(editor: Editor): string {
  if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) return editor.value;
  return editor.innerText;
}

function dispatchInput(editor: Editor): void {
  editor.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertReplacementText',
  }));
}

function replaceEditorText(editor: Editor, value: string): void {
  if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
    const prototype = editor instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(editor, value);
    dispatchInput(editor);
    editor.focus();
    editor.setSelectionRange(value.length, value.length);
    return;
  }

  editor.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection?.removeAllRanges();
  selection?.addRange(range);
  const inserted = document.execCommand('insertText', false, value);
  if (!inserted) {
    editor.textContent = value;
    dispatchInput(editor);
  }
  const caret = document.createRange();
  caret.selectNodeContents(editor);
  caret.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(caret);
}

function insertPastedText(editor: Editor, value: string, savedRange?: Range): void {
  if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
    const start = editor.selectionStart ?? editor.value.length;
    const end = editor.selectionEnd ?? start;
    const next = `${editor.value.slice(0, start)}${value}${editor.value.slice(end)}`;
    replaceEditorText(editor, next);
    const caret = start + value.length;
    editor.setSelectionRange(caret, caret);
    return;
  }
  editor.focus();
  if (savedRange) {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(savedRange);
  }
  const inserted = document.execCommand('insertText', false, value);
  if (!inserted) {
    const range = savedRange ?? document.createRange();
    if (!savedRange) {
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    range.deleteContents();
    const textNode = document.createTextNode(value);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    dispatchInput(editor);
  }
}

function highestSeverity(findings: Finding[]): Severity | 'none' {
  return findings.reduce<Severity | 'none'>((highest, finding) => (
    highest === 'none' || SEVERITY_WEIGHT[finding.severity] > SEVERITY_WEIGHT[highest]
      ? finding.severity
      : highest
  ), 'none');
}

function report(action: ActivityEvent['action'], findings: Finding[]): void {
  const destination = destinationForHostname(window.location.hostname);
  if (!destination) return;
  const event: ActivityEvent = {
    id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    destinationId: destination.id,
    destinationName: destination.name,
    domain: destination.domain,
    timestamp: Date.now(),
    action,
    findings: findings.length,
    categories: [...new Set(findings.map((finding) => finding.category))],
    severity: highestSeverity(findings),
  };
  // Deliberately send metadata only: prompt text and finding values never enter the activity log.
  void chrome.runtime.sendMessage({ type: 'HUSH_RECORD_ACTIVITY', event }).catch(() => undefined);
}

function showToast(count: number, action: 'masked' | 'blocked'): void {
  const existing = document.getElementById('hush-local-toast');
  existing?.remove();
  if (toastTimer) window.clearTimeout(toastTimer);

  const host = document.createElement('div');
  host.id = 'hush-local-toast';
  host.style.cssText = 'all:initial;position:fixed;right:22px;bottom:22px;z-index:2147483647;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const container = document.createElement('div');
  container.style.cssText = `
    display:flex;align-items:flex-start;gap:12px;width:340px;box-sizing:border-box;
    padding:16px;border:1px solid ${action === 'blocked' ? '#efc4bd' : '#d6e5dc'};
    border-radius:14px;background:#ffffff;color:#18352b;
    box-shadow:0 16px 50px rgba(18,45,35,.18);font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  `;
  const icon = document.createElement('div');
  icon.textContent = action === 'blocked' ? '!' : '✓';
  icon.style.cssText = `display:grid;place-items:center;flex:0 0 30px;height:30px;border-radius:9px;
    background:${action === 'blocked' ? '#fff0ed' : '#e8f5ed'};color:${action === 'blocked' ? '#a44034' : '#1c6f50'};font-weight:800;`;
  const copy = document.createElement('div');
  copy.style.cssText = 'flex:1;min-width:0;';
  const title = document.createElement('div');
  title.style.cssText = 'font-weight:750;margin-bottom:3px;';
  title.textContent = action === 'blocked' ? 'Prompt held by Hush' : `${count} sensitive ${count === 1 ? 'item' : 'items'} masked`;
  const body = document.createElement('div');
  body.style.cssText = 'color:#66776f;font-size:12px;';
  body.textContent = action === 'blocked'
    ? 'Your block policy stopped this prompt. Nothing was sent.'
    : 'Protected locally. Review the prompt, then send when ready.';
  const close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label', 'Dismiss Hush notification');
  close.textContent = '×';
  close.style.cssText = 'all:unset;cursor:pointer;color:#73827b;font:20px/1 sans-serif;padding:0 2px;';
  close.addEventListener('click', () => host.remove());
  copy.append(title, body);
  container.append(icon, copy, close);
  shadow.append(container);
  document.documentElement.append(host);
  toastTimer = window.setTimeout(() => host.remove(), 7000);
}

function protectionAllowed(): boolean {
  const destination = destinationForHostname(window.location.hostname);
  return Boolean(
    state.settings.enabled
    && destination
    && state.destinations[destination.id] !== false,
  );
}

function guardSend(event: Event, editor: Editor | null): void {
  if (!editor || !protectionAllowed()) return;
  const text = editorText(editor);
  if (!text.trim()) return;
  const previous = recentScans.get(editor);
  if (previous && previous.text === text && Date.now() - previous.time < 500) return;
  recentScans.set(editor, { text, time: Date.now() });

  const findings = scanText(text, state.policies);
  if (findings.length === 0) {
    report('allowed', []);
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  if (state.settings.mode === 'block') {
    report('blocked', findings);
    showToast(findings.length, 'blocked');
    return;
  }

  const style = state.settings.maskStyle;
  void maskFindings(text, findings, style).then((masked) => {
    if (editorText(editor) !== text) {
      showToast(findings.length, 'blocked');
      return;
    }
    replaceEditorText(editor, masked);
    report('masked', findings);
    showToast(findings.length, 'masked');
  }).catch(() => showToast(findings.length, 'blocked'));
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
  guardSend(event, findEditor(event.target as Element));
}, true);

document.addEventListener('click', (event) => {
  const origin = event.target as Element;
  const button = origin.closest?.('button[data-testid*="send" i], button[aria-label*="send" i], [role="button"][aria-label*="send" i]');
  if (button) guardSend(event, findEditor(button.closest('form')));
}, true);

document.addEventListener('submit', (event) => {
  guardSend(event, findEditor(event.target as Element));
}, true);

document.addEventListener('paste', (event) => {
  if (!state.settings.maskOnPaste || !protectionAllowed()) return;
  const editor = findEditor(event.target as Element);
  const clipboard = event.clipboardData?.getData('text/plain');
  if (!editor || !clipboard) return;
  const findings = scanText(clipboard, state.policies);
  if (findings.length === 0) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (state.settings.mode === 'block') {
    showToast(findings.length, 'blocked');
    return;
  }
  const selection = window.getSelection();
  const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : undefined;
  void maskFindings(clipboard, findings, state.settings.maskStyle).then((masked) => {
    insertPastedText(editor, masked, savedRange);
    showToast(findings.length, 'masked');
  }).catch(() => showToast(findings.length, 'blocked'));
}, true);
