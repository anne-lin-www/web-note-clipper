import os
import re


def list_folders(vault_path: str) -> list:
    """Return all sub-folder paths relative to vault_path, excluding hidden folders."""
    result = []
    for root, dirs, _ in os.walk(vault_path):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for d in dirs:
            full = os.path.join(root, d)
            rel = os.path.relpath(full, vault_path).replace('\\', '/')
            result.append(rel)
    result.sort()
    return result


def extract_tags(vault_path: str) -> list:
    """Scan all .md files and extract unique tags from YAML frontmatter."""
    tags = set()
    tag_pattern = re.compile(r'^tags:\s*\[(.+)\]', re.MULTILINE)
    for root, dirs, files in os.walk(vault_path):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for filename in files:
            if not filename.endswith('.md'):
                continue
            filepath = os.path.join(root, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception:
                continue
            match = tag_pattern.search(content)
            if match:
                raw = match.group(1)
                for tag in raw.split(','):
                    t = tag.strip()
                    if t:
                        tags.add(t)
    return sorted(tags)


def initialize_vault_structure(vault_path: str) -> None:
    """Create the default Obsidian vault folder structure."""
    folders = [
        '法規/勞動法規',
        '法規/稅務法規',
        '法規/建築法規',
        '政府公告/中央',
        '政府公告/地方',
        '專業文章',
        '_assets/screenshots',
        '_inbox',
    ]
    for folder in folders:
        os.makedirs(os.path.join(vault_path, folder), exist_ok=True)


def create_folder(vault_path: str, folder_path: str) -> str:
    """Create a new folder inside vault_path. Returns the full path."""
    full_path = os.path.join(vault_path, folder_path)
    os.makedirs(full_path, exist_ok=True)
    return full_path
