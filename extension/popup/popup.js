const DEFAULT_API_BASE = 'http://localhost:8765';

async function getApiBase() {
  try {
    const { apiBaseUrl } = await chrome.storage.sync.get({ apiBaseUrl: DEFAULT_API_BASE });
    return apiBaseUrl || DEFAULT_API_BASE;
  } catch {
    return DEFAULT_API_BASE;
  }
}

async function checkHealth() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const vaultInfo = document.getElementById('vaultInfo');
  const warningBox = document.getElementById('warningBox');
  const btnSave = document.getElementById('btnSave');
  const apiBase = await getApiBase();

  try {
    const resp = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(3000) });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    statusDot.className = 'dot dot-ok';
    statusText.textContent = '已連線';
    vaultInfo.textContent = `目前 Vault：${data.active_vault}`;
    vaultInfo.classList.remove('hidden');
    warningBox.classList.add('hidden');
    btnSave.disabled = false;
  } catch (e) {
    console.error('[WebNoteClipper] Health check failed:', e);
    statusDot.className = 'dot dot-error';
    statusText.textContent = '未連線';
    warningBox.classList.remove('hidden');
    vaultInfo.classList.add('hidden');
    btnSave.disabled = true;
  }
}

function buildTextFragment(text) {
  const t = text?.trim();
  if (!t) return '';
  // Only encode chars special to text-fragment syntax; leave CJK/Unicode raw so
  // Obsidian doesn't double-encode the % signs when opening YAML property links.
  const enc = s => s.replace(/[%,&#\r\n]/g, c => encodeURIComponent(c));
  return '#:~:text=' + enc(t.slice(0, 20).trim());
}

document.getElementById('btnSave').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  let selectedText = '';
  let fragmentUrl = '';
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' });
    selectedText = response?.text || '';
    // Fallback: compute locally if content script is an older version without fragmentUrl
    fragmentUrl = response?.fragmentUrl || buildTextFragment(selectedText);
  } catch (e) {
    console.error('[WebNoteClipper] Content script unavailable, falling back to scripting API:', e);
    // Content script unavailable or orphaned after extension reload — fallback to scripting API
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() ?? '',
      });
      selectedText = result || '';
      fragmentUrl = buildTextFragment(selectedText);
    } catch {
      // Restricted page (chrome://, extension pages, etc.)
    }
  }

  // Strip existing hash then append text fragment so the anchor URL is always clean
  const anchorUrl = fragmentUrl ? tab.url.split('#')[0] + fragmentUrl : '';

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
      anchorUrl,
      screenshotDataUrl,
      timestamp: Date.now(),
    },
  });
  chrome.tabs.create({ url: chrome.runtime.getURL('../capture/capture.html') });
  window.close();
});

document.getElementById('btnSettings').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('../settings/settings.html') });
  window.close();
});

checkHealth();
