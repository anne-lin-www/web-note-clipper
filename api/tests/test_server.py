import os
import sys
import pytest

# Make the api package importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from fastapi.testclient import TestClient
import server as server_module
from server import app, init_app


@pytest.fixture
def vault(tmp_path):
    """Fixture that provides a temp vault path and configures the server."""
    config = {
        "vaults": [{"name": "測試筆記", "path": str(tmp_path)}],
        "active_vault": "測試筆記",
        "api_port": 8765,
        "allowed_origins": ["chrome-extension://"],
    }
    init_app(config)
    return tmp_path


@pytest.fixture
def client(vault):
    with TestClient(app) as c:
        yield c


def test_health_returns_running(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "running"
    assert data["active_vault"] == "測試筆記"


def test_get_folders_empty_vault(client):
    resp = client.get("/folders")
    assert resp.status_code == 200
    data = resp.json()
    assert "folders" in data
    assert isinstance(data["folders"], list)


def test_post_folders_creates_folder(client, vault):
    resp = client.post("/folders", json={"path": "新資料夾/子資料夾"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert (vault / "新資料夾" / "子資料夾").exists()


def test_save_note_returns_200(client, vault):
    resp = client.post("/save-note", json={
        "title": "測試筆記",
        "url": "https://example.com",
        "date": "2026-04-25",
        "folder": "法規/勞動法規",
        "tags": ["法條"],
        "key_paragraph": "一些選取的文字",
        "personal_note": "我的筆記",
        "screenshot_base64": "",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "file_path" in data
    assert os.path.exists(data["file_path"])


def test_save_note_file_content(client, vault):
    resp = client.post("/save-note", json={
        "title": "測試筆記2",
        "url": "https://example.com/2",
        "date": "2026-04-25",
        "folder": "_inbox",
        "tags": ["重要"],
        "key_paragraph": "文字段落",
        "personal_note": "個人筆記",
        "screenshot_base64": "",
    })
    assert resp.status_code == 200
    file_path = resp.json()["file_path"]
    with open(file_path, encoding='utf-8') as f:
        content = f.read()
    assert '標題: 測試筆記2' in content
    assert '標籤: [重要]' in content


def test_get_tags_returns_list(client, vault):
    resp = client.get("/tags")
    assert resp.status_code == 200
    assert "tags" in resp.json()


def test_get_vaults(client):
    resp = client.get("/vaults")
    assert resp.status_code == 200
    data = resp.json()
    assert "vaults" in data
    assert data["active_vault"] == "測試筆記"
