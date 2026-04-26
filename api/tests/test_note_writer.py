import base64
import os
import pytest
from note_writer import sanitize_filename, save_note, build_md_content


def test_sanitize_filename_removes_illegal_chars():
    assert sanitize_filename('hello/world:test') == 'helloworldtest'


def test_sanitize_filename_keeps_chinese():
    assert sanitize_filename('法規/勞動法規') == '法規勞動法規'


def test_sanitize_filename_keeps_unicode():
    assert sanitize_filename('café:test') == 'cafétest'


def test_sanitize_filename_removes_all_illegal():
    result = sanitize_filename('a\\b/c:d*e?f"g<h>i|j')
    assert result == 'abcdefghij'


def test_build_md_content_structure():
    content = build_md_content(
        title='Test Note',
        url='https://example.com',
        date='2026-04-25',
        folder='法規/勞動法規',
        tags=['法條', '重要'],
        key_paragraph='Some selected text',
        personal_note='My comment',
        screenshot_filename='2026-04-25_001.png',
        date_month='2026-04',
    )
    assert '---' in content
    assert '標題: Test Note' in content
    assert '來源網址: https://example.com' in content
    assert '擷取日期: 2026-04-25' in content
    assert '標籤: [法條, 重要]' in content
    assert '資料夾: 法規/勞動法規' in content
    assert '## 重要段落' in content
    assert '> Some selected text' in content
    assert '## 個人筆記' in content
    assert 'My comment' in content
    assert '## 截圖' in content
    assert '![[2026-04-25_001.png]]' in content
    assert '截圖路徑: _assets/screenshots/2026-04/2026-04-25_001.png' in content


def test_save_note_creates_md_file(tmp_path):
    vault_path = str(tmp_path)
    result = save_note(
        vault_path=vault_path,
        title='Test Note',
        url='https://example.com',
        date='2026-04-25',
        folder='法規/勞動法規',
        tags=['法條'],
        key_paragraph='Selected text',
        personal_note='My notes',
        screenshot_base64='',
    )
    assert os.path.exists(result['file_path'])
    with open(result['file_path'], encoding='utf-8') as f:
        content = f.read()
    assert '標題: Test Note' in content
    assert '來源網址: https://example.com' in content


def test_save_note_screenshot_saved(tmp_path):
    vault_path = str(tmp_path)
    # Create a minimal 1x1 PNG in base64
    import struct, zlib
    def create_minimal_png():
        sig = b'\x89PNG\r\n\x1a\n'
        ihdr_data = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
        ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
        ihdr = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
        idat_data = zlib.compress(b'\x00\xff\xff\xff')
        idat_crc = zlib.crc32(b'IDAT' + idat_data) & 0xffffffff
        idat = struct.pack('>I', len(idat_data)) + b'IDAT' + idat_data + struct.pack('>I', idat_crc)
        iend_crc = zlib.crc32(b'IEND') & 0xffffffff
        iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
        return sig + ihdr + idat + iend

    png_bytes = create_minimal_png()
    encoded = base64.b64encode(png_bytes).decode()

    result = save_note(
        vault_path=vault_path,
        title='Test Note',
        url='https://example.com',
        date='2026-04-25',
        folder='法規/勞動法規',
        tags=[],
        key_paragraph='',
        personal_note='',
        screenshot_base64=encoded,
    )
    assert os.path.exists(result['screenshot_path'])


def test_save_note_creates_folder_if_missing(tmp_path):
    vault_path = str(tmp_path)
    result = save_note(
        vault_path=vault_path,
        title='Note',
        url='https://example.com',
        date='2026-04-25',
        folder='新資料夾/子資料夾',
        tags=[],
        key_paragraph='',
        personal_note='',
        screenshot_base64='',
    )
    assert os.path.exists(os.path.dirname(result['file_path']))


def test_save_note_filename_sanitized(tmp_path):
    vault_path = str(tmp_path)
    result = save_note(
        vault_path=vault_path,
        title='Note:With/Illegal*Chars',
        url='https://example.com',
        date='2026-04-25',
        folder='_inbox',
        tags=[],
        key_paragraph='',
        personal_note='',
        screenshot_base64='',
    )
    basename = os.path.basename(result['file_path'])
    for ch in '\\/:*?"<>|':
        assert ch not in basename
