const DEFAULT_API_BASE = 'http://localhost:8765';
let currentTags = [];
let screenshotBase64 = '';
let anchorUrl = '';

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
  } catch (e) {
    console.error('[WebNoteClipper] Health check failed:', e);
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
  } catch (e) {
    console.error('[WebNoteClipper] Failed to load folders:', e);
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
  } catch (e) {
    console.error('[WebNoteClipper] Failed to load tags:', e);
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

// ── Anchor-support hint ───────────────────────────────────────────────────────

// 已知透過 JavaScript 動態載入內文的副檔名與網域，瀏覽器的 Text Fragment
// (#:~:text=) 在這類頁面上無法正常反白，因為內文在 fragment 觸發時尚未存在於 DOM。
// 新增已知不支援的網域時，只需在 KNOWN_NO_FRAGMENT_DOMAINS 加入 hostname 即可。
const DYNAMIC_PAGE_EXTENSIONS = ['.aspx', '.jsp'];
const KNOWN_NO_FRAGMENT_DOMAINS = ['law-out.mof.gov.tw'];

function mightLackTextFragmentSupport(url) {
  if (!url) return false;
  try {
    const { hostname, pathname } = new URL(url);
    const lower = pathname.toLowerCase();
    return (
      KNOWN_NO_FRAGMENT_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d)) ||
      DYNAMIC_PAGE_EXTENSIONS.some(ext => lower.endsWith(ext))
    );
  } catch { return false; }
}

function updateAnchorHint(url) {
  document.getElementById('anchorHint')
    ?.classList.toggle('hidden', !mightLackTextFragmentSupport(url));
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  document.getElementById('inputDate').value = today();

  const { pendingNote } = await chrome.storage.local.get('pendingNote');
  if (pendingNote) {
    document.getElementById('inputUrl').value = pendingNote.url || '';
    updateAnchorHint(pendingNote.url || '');
    document.getElementById('inputTitle').value = pendingNote.title || '';
    document.getElementById('inputParagraph').value = pendingNote.selectedText || '';
    anchorUrl = pendingNote.anchorUrl || '';
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
document.getElementById('inputUrl').addEventListener('input', e => updateAnchorHint(e.target.value));

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

// ── Folder Builder ────────────────────────────────────────
//
// 【層數上限調整方式】
// 只需修改 MAX_FOLDER_LEVELS 這一個常數，其餘邏輯會自動適應：
//   - refreshAddLevelBtn()  → 決定何時隱藏「新增子層」按鈕列
//   - appendFolderLevelRow() → guard 條件防止超過上限
// 例如：將 5 改為 8，即可支援最多 8 層資料夾。

const MAX_FOLDER_LEVELS = 5;

function escHtml(s) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function getFolderLevelInputs() {
  return [...document.querySelectorAll('#folderLevels .folder-level-row input')];
}

function updateFolderPreview() {
  const names = getFolderLevelInputs().map(i => i.value.trim()).filter(Boolean);
  const el = document.getElementById('folderPreviewText');
  if (!names.length) { el.textContent = '—'; return; }
  el.innerHTML = names
    .map((n, i) => (i > 0 ? '<span class="preview-sep">›</span>' : '') + escHtml(n))
    .join('');
}

function refreshAddLevelBtn() {
  const inputs = getFolderLevelInputs();
  const count = inputs.length;
  const lastFilled = inputs.at(-1)?.value.trim().length > 0;
  const addRow = document.getElementById('folderAddLevelRow');
  const btn = document.getElementById('btnAddLevel');
  if (count >= MAX_FOLDER_LEVELS) {
    addRow.classList.add('hidden'); // 達上限時整列隱藏，不留空白佔位
  } else {
    addRow.classList.remove('hidden');
    btn.disabled = !lastFilled;
  }
}

function renumberLevelLabels() {
  document.querySelectorAll('#folderLevels .folder-level-row').forEach((row, i) => {
    row.querySelector('.level-label').textContent = `第 ${i + 1} 層`;
    row.querySelector('input').placeholder = i === 0 ? '頂層資料夾名稱' : '子資料夾名稱';
  });
}

// prefillValue: 預填文字（從現有下拉選取繼承的層級名稱）
// autoFocus: 是否自動 focus 此列；預填列傳 false，只有最後新空白列傳 true
function appendFolderLevelRow(prefillValue = '', autoFocus = true) {
  const container = document.getElementById('folderLevels');
  const n = container.querySelectorAll('.folder-level-row').length + 1;
  if (n > MAX_FOLDER_LEVELS) return; // 防禦性 guard，避免 Enter 鍵等快捷路徑繞過按鈕停用狀態

  const row = document.createElement('div');
  row.className = 'folder-level-row';

  const label = document.createElement('span');
  label.className = 'level-label';
  label.textContent = `第 ${n} 層`;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = n === 1 ? '頂層資料夾名稱' : '子資料夾名稱';
  input.maxLength = 60;

  if (prefillValue) {
    input.value = prefillValue;
    input.classList.add('level-inherited'); // 淺藍底色提示使用者此層來自現有路徑
  }

  input.addEventListener('input', () => {
    input.classList.remove('level-inherited'); // 使用者開始編輯即移除繼承樣式
    updateFolderPreview();
    refreshAddLevelBtn();
  });
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const addBtn = document.getElementById('btnAddLevel');
    if (addBtn && !addBtn.disabled && !addBtn.closest('.hidden')) {
      addBtn.click();
    } else {
      document.getElementById('btnConfirmFolder').focus();
    }
  });

  row.appendChild(label);
  row.appendChild(input);

  if (n > 1) {
    const rm = document.createElement('button');
    rm.className = 'btn btn-sm btn-remove-level';
    rm.title = '移除此層';
    rm.textContent = '× 移除';
    rm.addEventListener('click', () => {
      row.remove();
      renumberLevelLabels();
      updateFolderPreview();
      refreshAddLevelBtn();
    });
    row.appendChild(rm);
  }

  container.appendChild(row);
  if (autoFocus) input.focus();
  refreshAddLevelBtn();
}

document.getElementById('btnAddFolder').addEventListener('click', () => {
  const panel = document.getElementById('folderBuilderPanel');
  if (!panel.classList.contains('hidden')) return;
  panel.classList.remove('hidden');
  document.getElementById('folderLevels').innerHTML = '';

  // 繼承下拉選單的當前選取作為父層脈絡，讓使用者只需輸入新的子層名稱
  const selected = document.getElementById('selectFolder').value;
  const hasParent = selected && selected !== '_inbox';
  if (hasParent) {
    selected.split('/').forEach(part => appendFolderLevelRow(part, false));
  }

  appendFolderLevelRow('', true); // 新子層輸入列，自動 focus
  updateFolderPreview();
});

document.getElementById('btnCancelFolder').addEventListener('click', () => {
  document.getElementById('folderBuilderPanel').classList.add('hidden');
});

document.getElementById('btnAddLevel').addEventListener('click', () => {
  appendFolderLevelRow();
});

document.getElementById('btnConfirmFolder').addEventListener('click', async () => {
  const names = getFolderLevelInputs().map(i => i.value.trim());

  const emptyIdx = names.findIndex(n => !n);
  if (emptyIdx !== -1) {
    getFolderLevelInputs()[emptyIdx].focus();
    showToast('請填寫所有層級的資料夾名稱', 'error');
    return;
  }
  if (names.some(n => /[/\\:*?"<>|]/.test(n))) {
    showToast('資料夾名稱不能包含特殊符號（/ \\ : * ? " < > |）', 'error');
    return;
  }

  const path = names.join('/');
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
    document.getElementById('folderBuilderPanel').classList.add('hidden');
    showToast(`✓ 已建立：${path.replace(/\//g, ' › ')}`, 'success');
  } catch (e) {
    console.error('[WebNoteClipper] Create folder error:', e);
    showToast(created ? '載入資料夾列表失敗' : '建立資料夾失敗', 'error');
  }
});

// ── Preview Modal ─────────────────────────────────────────

let previewScale = 1;
let previewPan = { x: 0, y: 0 };
let previewDragging = false;
let previewDragStart = { mx: 0, my: 0, px: 0, py: 0 };

function openPreviewModal() {
  const src = document.getElementById('screenshotImg').src;
  if (!screenshotBase64 || !src) { showToast('尚無截圖可預覽', 'error'); return; }
  document.getElementById('previewImg').src = src;
  previewScale = 1;
  previewPan = { x: 0, y: 0 };
  applyPreviewTransform();
  document.getElementById('previewModal').classList.remove('hidden');
}

function closePreviewModal() {
  document.getElementById('previewModal').classList.add('hidden');
}

function applyPreviewTransform() {
  const img = document.getElementById('previewImg');
  img.style.transform = `translate(${previewPan.x}px, ${previewPan.y}px) scale(${previewScale})`;
  document.getElementById('zoomLevel').textContent = Math.round(previewScale * 100) + '%';
  img.style.cursor = previewScale > 1 ? 'grab' : 'default';
}

function zoomPreview(delta) {
  previewScale = Math.max(0.25, Math.min(6, previewScale + delta));
  if (previewScale <= 1) previewPan = { x: 0, y: 0 };
  applyPreviewTransform();
}

document.getElementById('screenshotPreviewBox').addEventListener('click', openPreviewModal);
document.getElementById('btnPreview').addEventListener('click', openPreviewModal);
document.getElementById('btnClosePreview').addEventListener('click', closePreviewModal);
document.getElementById('previewModal').addEventListener('click', e => {
  if (e.target === document.getElementById('previewModal')) closePreviewModal();
});
document.getElementById('btnZoomIn').addEventListener('click', () => zoomPreview(0.25));
document.getElementById('btnZoomOut').addEventListener('click', () => zoomPreview(-0.25));
document.getElementById('btnZoomReset').addEventListener('click', () => {
  previewScale = 1; previewPan = { x: 0, y: 0 }; applyPreviewTransform();
});

const previewViewport = document.getElementById('previewViewport');
previewViewport.addEventListener('wheel', e => {
  e.preventDefault();
  zoomPreview(e.deltaY < 0 ? 0.15 : -0.15);
}, { passive: false });

previewViewport.addEventListener('mousedown', e => {
  if (previewScale <= 1) return;
  previewDragging = true;
  previewDragStart = { mx: e.clientX, my: e.clientY, px: previewPan.x, py: previewPan.y };
  previewViewport.classList.add('grabbing');
  e.preventDefault();
});

// ── Crop Modal ────────────────────────────────────────────

const cropState = {
  sel: { x: 0, y: 0, w: 0, h: 0 },
  action: null,
  start: { mx: 0, my: 0, sel: null },
  imgRect: null,
};

function getCropImgRect() {
  const img = document.getElementById('cropImg');
  const vp  = document.getElementById('cropViewport');
  const ir  = img.getBoundingClientRect();
  const vr  = vp.getBoundingClientRect();
  return { x: ir.left - vr.left, y: ir.top - vr.top, w: ir.width, h: ir.height };
}

function clampCropSel({ x, y, w, h }, ir) {
  const minPx = 20;
  w = Math.max(w, minPx);
  h = Math.max(h, minPx);
  x = Math.max(ir.x, Math.min(x, ir.x + ir.w - w));
  y = Math.max(ir.y, Math.min(y, ir.y + ir.h - h));
  w = Math.min(w, ir.x + ir.w - x);
  h = Math.min(h, ir.y + ir.h - y);
  return { x, y, w, h };
}

function updateCropUI() {
  const { x, y, w, h } = cropState.sel;
  const vp = document.getElementById('cropViewport');
  const vw = vp.clientWidth;
  const vh = vp.clientHeight;

  document.getElementById('cropShadeTop').style.cssText    = `top:0;left:0;right:0;height:${y}px`;
  document.getElementById('cropShadeBottom').style.cssText = `top:${y+h}px;left:0;right:0;bottom:0`;
  document.getElementById('cropShadeLeft').style.cssText   = `top:${y}px;left:0;width:${x}px;height:${h}px`;
  document.getElementById('cropShadeRight').style.cssText  = `top:${y}px;left:${x+w}px;right:0;height:${h}px`;

  const sel = document.getElementById('cropSelection');
  sel.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  sel.classList.remove('hidden');

  // Show selection size in actual image pixels
  const ir = cropState.imgRect;
  if (ir && ir.w > 0) {
    const scaleX = document.getElementById('cropImg').naturalWidth  / ir.w;
    const scaleY = document.getElementById('cropImg').naturalHeight / ir.h;
    const pw = Math.round((x + w > ir.x + ir.w ? ir.x + ir.w - x : w) * scaleX);
    const ph = Math.round((y + h > ir.y + ir.h ? ir.y + ir.h - y : h) * scaleY);
    document.getElementById('cropSizeLabel').textContent = `選取範圍：${pw} × ${ph} px`;
  }
}

function openCropModal() {
  if (!screenshotBase64) { showToast('尚無截圖可裁切', 'error'); return; }
  const modal = document.getElementById('cropModal');
  const img   = document.getElementById('cropImg');
  img.src = 'data:image/png;base64,' + screenshotBase64;
  modal.classList.remove('hidden');
  document.getElementById('cropSelection').classList.add('hidden');

  const init = () => {
    requestAnimationFrame(() => {
      cropState.imgRect = getCropImgRect();
      const ir = cropState.imgRect;
      cropState.sel = { x: ir.x, y: ir.y, w: ir.w, h: ir.h };
      updateCropUI();
    });
  };
  if (img.complete && img.naturalWidth) init();
  else img.onload = init;
}

function closeCropModal() {
  document.getElementById('cropModal').classList.add('hidden');
  cropState.action = null;
}

function applyCrop() {
  const img = document.getElementById('cropImg');
  const ir  = cropState.imgRect || getCropImgRect();
  const { x, y, w, h } = cropState.sel;

  const ix = Math.max(x - ir.x, 0);
  const iy = Math.max(y - ir.y, 0);
  const iw = Math.min(w, ir.w - ix);
  const ih = Math.min(h, ir.h - iy);

  const scaleX = img.naturalWidth  / ir.w;
  const scaleY = img.naturalHeight / ir.h;

  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(iw * scaleX);
  canvas.height = Math.round(ih * scaleY);
  canvas.getContext('2d').drawImage(
    img,
    Math.round(ix * scaleX), Math.round(iy * scaleY),
    canvas.width, canvas.height,
    0, 0, canvas.width, canvas.height
  );

  setScreenshot(canvas.toDataURL('image/png'));
  closeCropModal();
  showToast('截圖已裁切完成', 'success');
}

document.getElementById('btnCrop').addEventListener('click', openCropModal);
document.getElementById('btnCancelCrop').addEventListener('click', closeCropModal);
document.getElementById('btnApplyCrop').addEventListener('click', applyCrop);
document.getElementById('cropModal').addEventListener('click', e => {
  if (e.target === document.getElementById('cropModal')) closeCropModal();
});

// Crop interactions: handles + move + draw
const cropSelEl   = document.getElementById('cropSelection');
const cropVp      = document.getElementById('cropViewport');

cropSelEl.addEventListener('mousedown', e => {
  e.stopPropagation();
  e.preventDefault();
  const dir = e.target.dataset?.dir;
  cropState.action = dir || 'move';
  cropState.start  = { mx: e.clientX, my: e.clientY, sel: { ...cropState.sel } };
});

cropVp.addEventListener('mousedown', e => {
  if (e.target === cropSelEl || e.target.closest('#cropSelection')) return;
  e.preventDefault();
  const vr = cropVp.getBoundingClientRect();
  const mx = e.clientX - vr.left;
  const my = e.clientY - vr.top;
  cropState.action = 'draw';
  cropState.sel    = { x: mx, y: my, w: 1, h: 1 };
  cropState.start  = { mx: e.clientX, my: e.clientY, sel: { ...cropState.sel } };
  updateCropUI();
});

// Shared mousemove / mouseup (global, covers both preview and crop)
document.addEventListener('mousemove', e => {
  // Preview pan
  if (previewDragging) {
    previewPan.x = previewDragStart.px + (e.clientX - previewDragStart.mx);
    previewPan.y = previewDragStart.py + (e.clientY - previewDragStart.my);
    applyPreviewTransform();
  }

  // Crop resize / move / draw
  if (!cropState.action) return;
  const vr  = cropVp.getBoundingClientRect();
  const ir  = cropState.imgRect || getCropImgRect();
  const dx  = e.clientX - cropState.start.mx;
  const dy  = e.clientY - cropState.start.my;
  const s   = cropState.start.sel;
  let { x, y, w, h } = s;

  switch (cropState.action) {
    case 'draw': {
      const mx = Math.min(Math.max(e.clientX - vr.left, ir.x), ir.x + ir.w);
      const my = Math.min(Math.max(e.clientY - vr.top,  ir.y), ir.y + ir.h);
      x = Math.min(mx, s.x); y = Math.min(my, s.y);
      w = Math.abs(mx - s.x); h = Math.abs(my - s.y);
      break;
    }
    case 'move': x = s.x + dx; y = s.y + dy; break;
    case 'nw':   x = s.x+dx; y = s.y+dy; w = s.w-dx; h = s.h-dy; break;
    case 'n':    y = s.y+dy; h = s.h-dy; break;
    case 'ne':   y = s.y+dy; w = s.w+dx; h = s.h-dy; break;
    case 'e':    w = s.w+dx; break;
    case 'se':   w = s.w+dx; h = s.h+dy; break;
    case 's':    h = s.h+dy; break;
    case 'sw':   x = s.x+dx; w = s.w-dx; h = s.h+dy; break;
    case 'w':    x = s.x+dx; w = s.w-dx; break;
  }

  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  cropState.sel = clampCropSel({ x, y, w, h }, ir);
  updateCropUI();
});

document.addEventListener('mouseup', () => {
  if (previewDragging) {
    previewDragging = false;
    previewViewport.classList.remove('grabbing');
  }
  if (cropState.action) {
    cropState.action  = null;
    cropState.imgRect = getCropImgRect();
  }
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closePreviewModal();
  closeCropModal();
  document.getElementById('conflictModal')?.classList.add('hidden');
});

function buildAnchorUrl(url, text) {
  const t = text?.trim();
  if (!url || !t) return '';
  // Only encode chars special to text-fragment syntax; leave CJK/Unicode raw so
  // Obsidian doesn't double-encode the % signs when opening YAML property links.
  const enc = s => s.replace(/[%,&#\r\n]/g, c => encodeURIComponent(c));
  return url.split('#')[0] + '#:~:text=' + enc(t.slice(0, 20).trim());
}

function buildPayload() {
  const url = document.getElementById('inputUrl').value.trim();
  const keyParagraph = document.getElementById('inputParagraph').value.trim();
  return {
    title:            document.getElementById('inputTitle').value.trim(),
    url,
    date:             document.getElementById('inputDate').value,
    folder:           document.getElementById('selectFolder').value,
    tags:             currentTags,
    key_paragraph:    keyParagraph,
    personal_note:    document.getElementById('inputNotes').value.trim(),
    screenshot_base64: screenshotBase64,
    anchor_url:       anchorUrl || buildAnchorUrl(url, keyParagraph),
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
    console.error('[WebNoteClipper] Save note failed:', e);
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
