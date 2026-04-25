const API_BASE = 'http://localhost:8765';

async function checkHealth() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const vaultInfo = document.getElementById('vaultInfo');
  const warningBox = document.getElementById('warningBox');
  const btnSave = document.getElementById('btnSave');

  try {
    const resp = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    statusDot.className = 'dot dot-ok';
    statusText.textContent = '已連線';
    vaultInfo.textContent = `目前 Vault：${data.active_vault}`;
    vaultInfo.classList.remove('hidden');
    warningBox.classList.add('hidden');
    btnSave.disabled = false;
  } catch {
    statusDot.className = 'dot dot-error';
    statusText.textContent = '未連線';
    warningBox.classList.remove('hidden');
    vaultInfo.classList.add('hidden');
    btnSave.disabled = true;
  }
}

document.getElementById('btnSave').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

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
  chrome.tabs.create({ url: chrome.runtime.getURL('../capture/capture.html') });
  window.close();
});

document.getElementById('btnSettings').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('../settings/settings.html') });
  window.close();
});

checkHealth();
