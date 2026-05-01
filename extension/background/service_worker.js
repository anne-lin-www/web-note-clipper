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
    console.error('[WebNoteClipper] Screenshot capture failed:', e);
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


