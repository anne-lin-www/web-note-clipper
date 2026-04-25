chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSelectedText') {
    sendResponse({ text: window.getSelection().toString() });
    return true;
  }

  if (message.action === 'startCrop') {
    startCropMode(sendResponse);
    return true;
  }
});

function startCropMode(sendResponse) {
  const overlay = document.createElement('div');
  overlay.id = '__wncCropOverlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.4); cursor: crosshair; z-index: 2147483647;
  `;
  document.body.appendChild(overlay);

  const selection = document.createElement('div');
  selection.id = '__wncCropSelection';
  selection.style.cssText = `
    position: fixed; border: 2px solid #3498db; background: rgba(52,152,219,0.1);
    pointer-events: none; z-index: 2147483648; display: none;
  `;
  document.body.appendChild(selection);

  let startX, startY, isDragging = false;

  function onMouseDown(e) {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    selection.style.display = 'block';
    selection.style.left = startX + 'px';
    selection.style.top = startY + 'px';
    selection.style.width = '0';
    selection.style.height = '0';
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    selection.style.left = x + 'px';
    selection.style.top = y + 'px';
    selection.style.width = w + 'px';
    selection.style.height = h + 'px';
  }

  function onMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;
    const rect = {
      x: Math.min(e.clientX, startX),
      y: Math.min(e.clientY, startY),
      width: Math.abs(e.clientX - startX),
      height: Math.abs(e.clientY - startY),
    };
    cleanup();
    sendResponse({ rect });
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
      sendResponse({ rect: null });
    }
  }

  function cleanup() {
    overlay.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('keydown', onKeyDown);
    overlay.remove();
    selection.remove();
  }

  overlay.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('keydown', onKeyDown);
}
