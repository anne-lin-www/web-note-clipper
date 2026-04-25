import base64
import os
import re
from datetime import datetime


# Characters illegal on Windows filenames
_ILLEGAL_CHARS = re.compile(r'[\\/:*?"<>|]')


def sanitize_filename(title: str) -> str:
    """Remove Windows-illegal filename characters; keep Chinese/Unicode."""
    return _ILLEGAL_CHARS.sub('', title).strip()


def build_md_content(
    title: str,
    url: str,
    date: str,
    folder: str,
    tags: list,
    key_paragraph: str,
    personal_note: str,
    safe_title: str,
    date_month: str,
) -> str:
    tags_yaml = ', '.join(tags) if tags else ''
    screenshot_rel = f"_assets/screenshots/{date_month}/{date}_{safe_title}.png"
    lines = [
        '---',
        f'title: {title}',
        f'url: {url}',
        f'date: {date}',
        f'tags: [{tags_yaml}]',
        f'folder: {folder}',
        f'screenshot: {screenshot_rel}',
        '---',
        '',
        f'# {title}',
        '',
        f'**Source**: [{title}]({url})',
        f'**Captured**: {date}',
        '',
        '## Screenshot',
        f'![[{date}_{safe_title}.png]]',
        '',
        '## Key Paragraph',
        f'> {key_paragraph}',
        '',
        '## Personal Notes',
        personal_note,
        '',
    ]
    return '\n'.join(lines)


def _safe_join(base: str, *parts: str) -> str:
    """Join paths and raise ValueError if the result escapes base directory."""
    result = os.path.realpath(os.path.join(base, *parts))
    base_real = os.path.realpath(base)
    if not result.startswith(base_real + os.sep) and result != base_real:
        raise ValueError(f"Path traversal detected: {result!r} is outside {base_real!r}")
    return result


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
) -> dict:
    """Create the .md file and save the screenshot PNG. Returns file paths."""
    safe_title = sanitize_filename(title)
    date_month = date[:7]  # YYYY-MM

    # Paths — validate that folder stays inside the vault
    note_dir = _safe_join(vault_path, folder)
    os.makedirs(note_dir, exist_ok=True)

    md_filename = f"{date}_{safe_title}.md"
    md_path = _safe_join(note_dir, md_filename)

    screenshot_dir = _safe_join(vault_path, '_assets', 'screenshots', date_month)
    os.makedirs(screenshot_dir, exist_ok=True)

    screenshot_filename = f"{date}_{safe_title}.png"
    screenshot_path = _safe_join(screenshot_dir, screenshot_filename)

    # Write markdown
    md_content = build_md_content(
        title=title,
        url=url,
        date=date,
        folder=folder,
        tags=tags,
        key_paragraph=key_paragraph,
        personal_note=personal_note,
        safe_title=safe_title,
        date_month=date_month,
    )
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(md_content)

    # Write screenshot
    if screenshot_base64:
        img_data = base64.b64decode(screenshot_base64)
        with open(screenshot_path, 'wb') as f:
            f.write(img_data)

    return {
        'file_path': md_path,
        'screenshot_path': screenshot_path,
    }
