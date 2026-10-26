import { recordActivity, loadState, saveState, type ActivityEvent } from '../lib/storage';

chrome.runtime.onInstalled.addListener(() => {
  void loadState(false).then(saveState);
  void chrome.action.setBadgeBackgroundColor({ color: '#1c6f50' });
});

interface RecordMessage {
  type: 'HUSH_RECORD_ACTIVITY';
  event: ActivityEvent;
}

interface OpenMessage {
  type: 'HUSH_OPEN_DASHBOARD';
}

type ExtensionMessage = RecordMessage | OpenMessage;

function notify(event: ActivityEvent): void {
  void loadState(false).then((state) => {
    if (!state.settings.notifications || event.action === 'allowed') return;
    const title = event.action === 'blocked' ? 'Hush blocked a risky prompt' : 'Sensitive data masked by Hush';
    const message = event.action === 'blocked'
      ? `${event.findings} sensitive ${event.findings === 1 ? 'item' : 'items'} detected in ${event.destinationName}.`
      : `${event.findings} sensitive ${event.findings === 1 ? 'item was' : 'items were'} masked. Review your prompt before sending.`;
    chrome.notifications.create(event.id, {
      type: 'basic',
      iconUrl: 'icon-128.png',
      title,
      message,
      priority: event.action === 'blocked' ? 2 : 1,
    }, () => undefined);
  });
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message?.type === 'HUSH_RECORD_ACTIVITY' && message.event) {
    void recordActivity(message.event).then(() => {
      notify(message.event);
      sendResponse({ ok: true });
    }).catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (message?.type === 'HUSH_OPEN_DASHBOARD') {
    void chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    sendResponse({ ok: true });
    return false;
  }
  return false;
});
