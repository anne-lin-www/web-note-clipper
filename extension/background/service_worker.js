const API_BASE = 'http://localhost:8765';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-note-clipper',
    title: '儲存到 Web Note Clipper',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-note-clipper') return;

  const selectedText = info.selectionText || '';

  let screenshotDataUrl = '';
  try {
    screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  } catch (e) {
    console.warn('Screenshot capture failed:', e);
  }

  await chrome.storage.local.set({
    pendingNote: {
      url: tab.url,
      title: tab.title,
      selectedText,
      screenshotDataUrl,
      timestamp: Date.now(),
    },
  });

  chrome.tabs.create({ url: chrome.runtime.getURL('capture/capture.html') });
});

chrome.action.onClicked.addListener(async (tab) => {
  const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('capture/capture.html') });
  if (tabs.length > 0) {
    chrome.tabs.update(tabs[0].id, { active: true });
    return;
  }

  let screenshotDataUrl = '';
  try {
    screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  } catch (e) {
    console.warn('Screenshot capture failed:', e);
  }

  await chrome.storage.local.set({
    pendingNote: {
      url: tab.url,
      title: tab.title,
      selectedText: '',
      screenshotDataUrl,
      timestamp: Date.now(),
    },
  });

  chrome.tabs.create({ url: chrome.runtime.getURL('capture/capture.html') });
});
