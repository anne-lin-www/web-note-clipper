# -*- coding: utf-8 -*-
import base64
import os
import re

from path_utils import _safe_join


# Characters illegal on Windows filenames
_ILLEGAL_CHARS = re.compile(r'[\\/:*?"<>|]')

# Frontmatter key map — internal English key → Traditional Chinese display label.
# Code logic always references the English key; only the output label is localised.
_FM = {
    'title':      '標題',
    'url':        '來源網址',
    'anchor_url': '錨點連結',
    'date':       '擷取日期',
    'tags':       '標籤',
    'folder':     '資料夾',
    'screenshot': '截圖路徑',
}


def sanitize_filename(title: str) -> str:
    """Remove Windows-illegal filename characters; keep Chinese/Unicode."""
    return _ILLEGAL_CHARS.sub('', title).strip()


def _next_versioned_path(note_dir: str, base_name: str) -> str:
    """Return the first non-existing path for base_name_2.md, _3.md, …"""
    v = 2
    while True:
        candidate = _safe_join(note_dir, f"{base_name}_{v}.md")
        if not os.path.exists(candidate):
            return candidate
        v += 1


def _extract_screenshot_filename(md_path: str) -> str | None:
    """Return the screenshot filename stored in an existing note's frontmatter, or None."""
    try:
        with open(md_path, encoding='utf-8') as f:
            content = f.read()
        m = re.search(r'截圖路徑:\s*_assets/screenshots/[^/\s]+/([^\s]+\.png)', content)
        return m.group(1) if m else None
    except OSError:
        return None


def _next_screenshot_filename(screenshot_dir: str, date: str) -> str:
    """Return the next available sequential screenshot filename: YYYY-MM-DD_001.png
    Sequential numbering avoids title-length and illegal-character issues, and
    ensures every save (including new-version notes) gets its own unique file.
    """
    n = 1
    while True:
        filename = f"{date}_{n:03d}.png"
        if not os.path.exists(_safe_join(screenshot_dir, filename)):
            return filename
        n += 1


def build_md_content(
    title: str,
    url: str,
    date: str,
    folder: str,
    tags: list,
    key_paragraph: str,
    personal_note: str,
    screenshot_filename: str,
    date_month: str,
    anchor_url: str = '',
) -> str:
    tags_yaml = ', '.join(tags) if tags else ''
    screenshot_rel = f"_assets/screenshots/{date_month}/{screenshot_filename}"

    frontmatter = [
        '---',
        f'{_FM["title"]}: {title}',
        f'{_FM["url"]}: {url}',
    ]
    if anchor_url:
        frontmatter.append(f'{_FM["anchor_url"]}: {anchor_url}')
    frontmatter += [
        f'{_FM["date"]}: {date}',
        f'{_FM["tags"]}: [{tags_yaml}]',
        f'{_FM["folder"]}: {folder}',
        f'{_FM["screenshot"]}: {screenshot_rel}',
        '---',
    ]

    body = [
        '',
        '## 截圖',
        f'![[{screenshot_filename}]]',
        '',
        '## 重要段落',
        f'> {key_paragraph}',
        '',
        '## 個人筆記',
        personal_note,
        '',
    ]
    return '\n'.join(frontmatter + body)


def save_note(
    vault_path: str,
    title: str,
    url: str,
    date: str,
    folder: str,
    tags: list,
    key_paragraph: str,
    personal_note: str,
    screenshot_base64: str,
    anchor_url: str = '',
    overwrite: bool = False,
    new_version: bool = False,
) -> dict:
    """
    Create the .md file and save the screenshot PNG.

    Returns:
      {'conflict': True, 'existing_filename': str}  — file exists, no resolution flag set
      {'file_path': str, 'screenshot_path': str}    — written successfully

    Screenshot naming: YYYY-MM-DD_001.png sequential, independent of note title.
    Each save always claims the next available number so new-version notes never
    overwrite an existing screenshot.
    """
    safe_title = sanitize_filename(title)
    date_month = date[:7]  # YYYY-MM

    note_dir = _safe_join(vault_path, folder)
    os.makedirs(note_dir, exist_ok=True)

    base_name = f"{date}_{safe_title}"
    md_filename = f"{base_name}.md"
    md_path = _safe_join(note_dir, md_filename)

    # ── Conflict detection ────────────────────────────────────
    if os.path.exists(md_path) and not overwrite and not new_version:
        return {'conflict': True, 'existing_filename': md_filename}

    if new_version and os.path.exists(md_path):
        md_path = _next_versioned_path(note_dir, base_name)

    # ── Resolve screenshot filename before building MD ────────
    screenshot_dir = _safe_join(vault_path, '_assets', 'screenshots', date_month)
    os.makedirs(screenshot_dir, exist_ok=True)
    if overwrite and os.path.exists(_safe_join(note_dir, md_filename)):
        screenshot_filename = (
            _extract_screenshot_filename(_safe_join(note_dir, md_filename))
            or _next_screenshot_filename(screenshot_dir, date)
        )
    else:
        screenshot_filename = _next_screenshot_filename(screenshot_dir, date)
    screenshot_path = _safe_join(screenshot_dir, screenshot_filename)

    # ── Write markdown ────────────────────────────────────────
    md_content = build_md_content(
        title=title,
        url=url,
        date=date,
        folder=folder,
        tags=tags,
        key_paragraph=key_paragraph,
        personal_note=personal_note,
        screenshot_filename=screenshot_filename,
        date_month=date_month,
        anchor_url=anchor_url,
    )
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(md_content)

    # ── Write screenshot ──────────────────────────────────────
    if screenshot_base64:
        img_data = base64.b64decode(screenshot_base64)
        with open(screenshot_path, 'wb') as f:
            f.write(img_data)

    return {
        'file_path': md_path,
        'screenshot_path': screenshot_path,
    }
