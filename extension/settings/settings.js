const DEFAULT_API_URL = 'http://localhost:8765';

async function loadSettings() {
  const { apiBaseUrl } = await chrome.storage.sync.get({ apiBaseUrl: DEFAULT_API_URL });
  document.getElementById('inputApiUrl').value = apiBaseUrl;
  await loadVaults(apiBaseUrl);
}

async function loadVaults(apiUrl) {
  const select = document.getElementById('selectVault');
  try {
    const resp = await fetch(`${apiUrl}/vaults`, { signal: AbortSignal.timeout(3000) });
    const data = await resp.json();
    select.innerHTML = '';
    data.vaults.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = v.name;
      if (v.name === data.active_vault) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (e) {
    console.error('[WebNoteClipper] Failed to load vaults:', e);
    select.innerHTML = '<option value="">（無法取得 Vault 列表）</option>';
  }
}

document.getElementById('btnTest').addEventListener('click', async () => {
  const apiUrl = document.getElementById('inputApiUrl').value.trim();
  const result = document.getElementById('testResult');
  try {
    const resp = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await resp.json();
    result.textContent = `✓ 連線成功 — ${data.active_vault}`;
    result.className = 'test-result test-ok';
    result.classList.remove('hidden');
    await loadVaults(apiUrl);
  } catch (e) {
    console.error('[WebNoteClipper] Connection test failed:', e);
    result.textContent = '✗ 連線失敗 — 請確認服務是否已啟動';
    result.className = 'test-result test-fail';
    result.classList.remove('hidden');
  }
});

document.getElementById('btnSave').addEventListener('click', async () => {
  const apiUrl = document.getElementById('inputApiUrl').value.trim();
  const vaultName = document.getElementById('selectVault').value;
  await chrome.storage.sync.set({ apiBaseUrl: apiUrl });

  if (vaultName) {
    try {
      await fetch(`${apiUrl}/vaults/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: vaultName }),
      });
    } catch (e) { console.error('[WebNoteClipper] Vault switch failed:', e); }
  }
  window.close();
});

loadSettings();
