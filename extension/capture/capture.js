const DEFAULT_API_BASE = 'http://localhost:8765';
let currentTags = [];
let screenshotBase64 = '';

async function getApiBase() {
  try {
    const { apiBaseUrl } = await chrome.storage.sync.get({ apiBaseUrl: DEFAULT_API_BASE });
    return apiBaseUrl || DEFAULT_API_BASE;
  } catch {
    return DEFAULT_API_BASE;
  }
}

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
  const apiBase = await getApiBase();
  try {
    const resp = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(3000) });
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
  const apiBase = await getApiBase();

  const buildOptions = (folders) => {
    const fragment = document.createDocumentFragment();
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '_inbox';
    defaultOpt.textContent = '未分類（預設）';
    fragment.appendChild(defaultOpt);
    folders.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f.replace(/\//g, ' / ');
      fragment.appendChild(opt);
    });
    return fragment;
  };

  try {
    const resp = await fetch(`${apiBase}/folders`);
    const { folders } = await resp.json();
    const prev = select.value;
    select.replaceChildren(buildOptions(folders));
    if (prev && [...select.options].some(o => o.value === prev)) {
      select.value = prev;
    }
  } catch {
    select.replaceChildren(buildOptions([]));
  }
}

let allTags = [];

async function loadTags() {
  const apiBase = await getApiBase();
  try {
    const resp = await fetch(`${apiBase}/tags`);
    const { tags } = await resp.json();
    allTags = tags;
  } catch {
    // ignore
  }
}

function renderTagDropdown(query) {
  const dropdown = document.getElementById('tagDropdown');
  if (!dropdown) return false;
  const q = query.trim().toLowerCase();
  const matches = q ? allTags.filter(t => t.toLowerCase().includes(q) && !currentTags.includes(t))
                     : allTags.filter(t => !currentTags.includes(t));
  dropdown.innerHTML = '';

  if (q) {
    const createLi = document.createElement('li');
    createLi.className = 'tag-create';
    createLi.textContent = `建立新標籤：${query.trim()}`;
    createLi.dataset.value = query.trim();
    dropdown.appendChild(createLi);
  }

  matches.slice(0, 20).forEach(t => {
    const li = document.createElement('li');
    li.textContent = t;
    li.dataset.value = t;
    dropdown.appendChild(li);
  });

  const hasItems = dropdown.children.length > 0;
  dropdown.classList.toggle('hidden', !hasItems);
  return hasItems;
}

function closeTagDropdown() {
  document.getElementById('tagDropdown')?.classList.add('hidden');
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

// ── Init ─────────────────────────────────────────────────────────────────────
// Called before event listeners so it always runs even if listener setup throws

init();

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('btnClose').addEventListener('click', () => window.close());
document.getElementById('btnCancel').addEventListener('click', () => window.close());

const inputTag = document.getElementById('inputTag');
const tagDropdown = document.getElementById('tagDropdown');

if (inputTag) {
  inputTag.addEventListener('input', () => {
    renderTagDropdown(inputTag.value);
  });

  inputTag.addEventListener('focus', () => {
    renderTagDropdown(inputTag.value);
  });

  inputTag.addEventListener('keydown', e => {
    const items = [...(tagDropdown?.querySelectorAll('li') ?? [])];
    const activeIdx = items.findIndex(li => li.classList.contains('active'));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[activeIdx]?.classList.remove('active');
      const next = items[(activeIdx + 1) % items.length];
      next?.classList.add('active');
      next?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[activeIdx]?.classList.remove('active');
      const prev = items[(activeIdx - 1 + items.length) % items.length];
      prev?.classList.add('active');
      prev?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const active = tagDropdown?.querySelector('li.active');
      if (active) {
        addTagChip(active.dataset.value);
        inputTag.value = '';
        closeTagDropdown();
      } else {
        const val = inputTag.value.trim();
        if (val) { addTagChip(val); inputTag.value = ''; closeTagDropdown(); }
      }
    } else if (e.key === 'Escape') {
      closeTagDropdown();
    }
  });
}

if (tagDropdown) {
  tagDropdown.addEventListener('mousedown', e => {
    const li = e.target.closest('li');
    if (!li) return;
    e.preventDefault();
    addTagChip(li.dataset.value);
    inputTag.value = '';
    closeTagDropdown();
  });
}

document.addEventListener('click', e => {
  if (!e.target.closest('.tag-autocomplete')) closeTagDropdown();
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
  const apiBase = await getApiBase();
  let created = false;
  try {
    const resp = await fetch(`${apiBase}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      showToast('建立資料夾失敗：' + (err.detail || resp.status), 'error');
      document.getElementById('newFolderRow').classList.add('hidden');
      document.getElementById('inputNewFolder').value = '';
      return;
    }
    created = true;
    await loadFolders();
    const sel = document.getElementById('selectFolder');
    if (![...sel.options].some(o => o.value === path)) {
      const opt = document.createElement('option');
      opt.value = path;
      opt.textContent = path.replace(/\//g, ' / ');
      sel.appendChild(opt);
    }
    sel.value = path;
    showToast(`✓ 資料夾已建立：${path}`, 'success');
  } catch {
    showToast(created ? '載入資料夾列表失敗' : '建立資料夾失敗', 'error');
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

function buildPayload() {
  return {
    title:            document.getElementById('inputTitle').value.trim(),
    url:              document.getElementById('inputUrl').value.trim(),
    date:             document.getElementById('inputDate').value,
    folder:           document.getElementById('selectFolder').value,
    tags:             currentTags,
    key_paragraph:    document.getElementById('inputParagraph').value.trim(),
    personal_note:    document.getElementById('inputNotes').value.trim(),
    screenshot_base64: screenshotBase64,
  };
}

function showSaveSuccess() {
  let countdown = 3;
  const toast = document.getElementById('toast');
  toast.textContent = `✓ 已儲存！${countdown} 秒後關閉…`;
  toast.className = 'toast toast-success';
  toast.classList.remove('hidden');
  const timer = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      toast.textContent = `✓ 已儲存！${countdown} 秒後關閉…`;
    } else {
      clearInterval(timer);
      window.close();
    }
  }, 1000);
}

async function performSave(payload) {
  const apiBase = await getApiBase();
  try {
    const resp = await fetch(`${apiBase}/save-note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();

    if (data.conflict) {
      showConflictModal(data.existing_filename, payload);
      return;
    }
    if (data.success) {
      showSaveSuccess();
    } else {
      showToast('儲存失敗：' + (data.detail || '未知錯誤'), 'error');
    }
  } catch (e) {
    showToast('網路錯誤：' + e.message, 'error');
  }
}

function showConflictModal(filename, originalPayload) {
  document.getElementById('conflictFilename').textContent = filename;
  document.getElementById('conflictModal').classList.remove('hidden');

  // One-time listeners — cloned nodes discard previous listeners
  const btnOverwrite = document.getElementById('btnOverwrite');
  const btnNewVersion = document.getElementById('btnNewVersion');
  const btnConflictCancel = document.getElementById('btnConflictCancel');

  const fresh = (el) => { const c = el.cloneNode(true); el.replaceWith(c); return c; };
  const ow = fresh(btnOverwrite);
  const nv = fresh(btnNewVersion);
  const cc = fresh(btnConflictCancel);

  const closeModal = () => document.getElementById('conflictModal').classList.add('hidden');

  ow.addEventListener('click', () => {
    closeModal();
    performSave({ ...originalPayload, overwrite: true });
  });
  nv.addEventListener('click', () => {
    closeModal();
    performSave({ ...originalPayload, new_version: true });
  });
  cc.addEventListener('click', closeModal);
}

document.getElementById('btnSave').addEventListener('click', async () => {
  const payload = buildPayload();
  if (!payload.title) { showToast('請輸入筆記標題', 'error'); return; }
  if (!payload.url)   { showToast('請輸入來源網址', 'error'); return; }
  await performSave(payload);
});
