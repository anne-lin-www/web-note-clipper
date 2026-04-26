import os
import pytest
from vault_manager import list_folders, extract_tags, initialize_vault_structure, create_folder


def test_list_folders_empty(tmp_path):
    folders = list_folders(str(tmp_path))
    assert folders == []


def test_list_folders_with_structure(tmp_path):
    (tmp_path / '法規' / '勞動法規').mkdir(parents=True)
    (tmp_path / '法規' / '稅務法規').mkdir(parents=True)
    (tmp_path / '_inbox').mkdir()
    folders = list_folders(str(tmp_path))
    assert '法規' in folders
    assert '法規/勞動法規' in folders
    assert '法規/稅務法規' in folders
    assert '_inbox' not in folders


def test_list_folders_excludes_hidden(tmp_path):
    (tmp_path / '.hidden').mkdir()
    (tmp_path / 'visible').mkdir()
    folders = list_folders(str(tmp_path))
    assert 'visible' in folders
    assert '.hidden' not in folders


def test_extract_tags_empty_vault(tmp_path):
    tags = extract_tags(str(tmp_path))
    assert tags == []


def test_extract_tags_from_notes(tmp_path):
    note_dir = tmp_path / '法規'
    note_dir.mkdir()
    (note_dir / 'note1.md').write_text(
        '---\ntitle: Test\ntags: [法條, 重要]\n---\n# Test\n',
        encoding='utf-8'
    )
    (note_dir / 'note2.md').write_text(
        '---\ntitle: Test2\ntags: [政府公告, 重要]\n---\n# Test2\n',
        encoding='utf-8'
    )
    tags = extract_tags(str(tmp_path))
    assert '法條' in tags
    assert '重要' in tags
    assert '政府公告' in tags
    # No duplicates
    assert len(tags) == len(set(tags))


def test_extract_tags_sorted(tmp_path):
    (tmp_path / 'note.md').write_text(
        '---\ntags: [Z標籤, A標籤, M標籤]\n---\n',
        encoding='utf-8'
    )
    tags = extract_tags(str(tmp_path))
    assert tags == sorted(tags)


def test_initialize_vault_structure(tmp_path):
    initialize_vault_structure(str(tmp_path))
    assert (tmp_path / '法規' / '勞動法規').exists()
    assert (tmp_path / '法規' / '稅務法規').exists()
    assert (tmp_path / '法規' / '建築法規').exists()
    assert (tmp_path / '政府公告' / '中央').exists()
    assert (tmp_path / '政府公告' / '地方').exists()
    assert (tmp_path / '專業文章').exists()
    assert (tmp_path / '_assets' / 'screenshots').exists()
    assert (tmp_path / '_inbox').exists()


def test_create_folder(tmp_path):
    result = create_folder(str(tmp_path), '新資料夾/子資料夾')
    assert os.path.exists(result)
    assert os.path.isdir(result)
