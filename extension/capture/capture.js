const API_BASE = 'http://localhost:8765';
let currentTags = [];
let screenshotBase64 = '';

// ── Helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast-${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function addTagChip(tag) {
  if (!tag || currentTags.includes(tag)) return;
  currentTags.push(tag);
  const container = document.getElementById('tagsContainer');
  const chip = document.createElement('span');
  chip.className = 'tag-chip';
  const tagText = document.createTextNode(tag + ' ');
  const removeBtn = document.createElement('button');
  removeBtn.setAttribute('data-tag', tag);
  removeBtn.setAttribute('title', '移除');
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => {
    currentTags = currentTags.filter(t => t !== tag);
    chip.remove();
  });
  chip.appendChild(tagText);
  chip.appendChild(removeBtn);
  container.appendChild(chip);
}

function setScreenshot(dataUrl) {
  const img = document.getElementById('screenshotImg');
  const placeholder = document.getElementById('screenshotPlaceholder');
  if (dataUrl) {
    img.src = dataUrl;
    img.style.display = 'block';
    placeholder.style.display = 'none';
    // Strip the data:image/png;base64, prefix
    screenshotBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  } else {
    img.style.display = 'none';
    placeholder.style.display = 'block';
    screenshotBase64 = '';
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function checkHealth() {
  const dot = document.getElementById('footerDot');
  const status = document.getElementById('footerStatus');
  try {
    const resp = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await resp.json();
    dot.className = 'dot dot-ok';
    status.textContent = `已連線到 ${data.active_vault}`;
  } catch {
    dot.className = 'dot dot-error';
    status.textContent = '未連線 — 請啟動本機服務';
  }
}

async function loadFolders() {
  const select = document.getElementById('selectFolder');
  try {
    const resp = await fetch(`${API_BASE}/folders`);
    const { folders } = await resp.json();
    select.innerHTML = '';
    folders.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f.replace(/\//g, ' / ');
      select.appendChild(opt);
    });
    if (folders.length === 0) {
      const opt = document.createElement('option');
      opt.value = '_inbox';
      opt.textContent = '_inbox';
      select.appendChild(opt);
    }
  } catch {
    const opt = document.createElement('option');
    opt.value = '_inbox';
    opt.textContent = '_inbox';
    select.innerHTML = '';
    select.appendChild(opt);
  }
}

async function loadTags() {
  const datalist = document.getElementById('tagSuggestions');
  try {
    const resp = await fetch(`${API_BASE}/tags`);
    const { tags } = await resp.json();
    datalist.innerHTML = '';
    tags.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      datalist.appendChild(opt);
    });
  } catch {
    // ignore
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  document.getElementById('inputDate').value = today();

  const { pendingNote } = await chrome.storage.local.get('pendingNote');
  if (pendingNote) {
    document.getElementById('inputUrl').value = pendingNote.url || '';
    document.getElementById('inputTitle').value = pendingNote.title || '';
    document.getElementById('inputParagraph').value = pendingNote.selectedText || '';
    if (pendingNote.screenshotDataUrl) {
      setScreenshot(pendingNote.screenshotDataUrl);
    }
    await chrome.storage.local.remove('pendingNote');
  }

  await Promise.all([checkHealth(), loadFolders(), loadTags()]);
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('btnClose').addEventListener('click', () => window.close());
document.getElementById('btnCancel').addEventListener('click', () => window.close());

document.getElementById('inputTag').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = e.target.value.trim();
    if (val) { addTagChip(val); e.target.value = ''; }
  }
});

document.getElementById('btnAddFolder').addEventListener('click', () => {
  document.getElementById('newFolderRow').classList.remove('hidden');
  document.getElementById('inputNewFolder').focus();
});
document.getElementById('btnCancelFolder').addEventListener('click', () => {
  document.getElementById('newFolderRow').classList.add('hidden');
  document.getElementById('inputNewFolder').value = '';
});
document.getElementById('btnConfirmFolder').addEventListener('click', async () => {
  const path = document.getElementById('inputNewFolder').value.trim();
  if (!path) return;
  try {
    await fetch(`${API_BASE}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    await loadFolders();
    document.getElementById('selectFolder').value = path;
  } catch {
    showToast('建立資料夾失敗', 'error');
  }
  document.getElementById('newFolderRow').classList.add('hidden');
  document.getElementById('inputNewFolder').value = '';
});

document.getElementById('btnRetake').addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: false });
    const target = tabs.find(t => !t.url.startsWith('chrome-extension://'));
    if (!target) return;
    const dataUrl = await chrome.tabs.captureVisibleTab(target.windowId, { format: 'png' });
    setScreenshot(dataUrl);
  } catch (e) {
    showToast('截圖失敗：' + e.message, 'error');
  }
});

document.getElementById('btnCrop').addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: false });
    const target = tabs.find(t => !t.url.startsWith('chrome-extension://'));
    if (!target) return;
    const response = await chrome.tabs.sendMessage(target.id, { action: 'startCrop' });
    if (response && response.rect) {
      showToast('裁切座標已取得（完整裁切功能需 Canvas 支援）', 'success');
    }
  } catch (e) {
    showToast('裁切失敗：' + e.message, 'error');
  }
});

document.getElementById('btnSave').addEventListener('click', async () => {
  const title = document.getElementById('inputTitle').value.trim();
  const url = document.getElementById('inputUrl').value.trim();
  const date = document.getElementById('inputDate').value;
  const folder = document.getElementById('selectFolder').value;
  const keyParagraph = document.getElementById('inputParagraph').value.trim();
  const personalNote = document.getElementById('inputNotes').value.trim();

  if (!title) { showToast('請輸入筆記標題', 'error'); return; }
  if (!url) { showToast('請輸入來源網址', 'error'); return; }

  const payload = {
    title, url, date, folder,
    tags: currentTags,
    key_paragraph: keyParagraph,
    personal_note: personalNote,
    screenshot_base64: screenshotBase64,
  };

  try {
    const resp = await fetch(`${API_BASE}/save-note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (data.success) {
      showToast('✓ 已儲存！', 'success');
      setTimeout(() => window.close(), 3000);
    } else {
      showToast('儲存失敗：' + (data.detail || '未知錯誤'), 'error');
    }
  } catch (e) {
    showToast('網路錯誤：' + e.message, 'error');
  }
});

init();
