from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os

from config_loader import get_active_vault, switch_active_vault
from note_writer import save_note
from vault_manager import list_folders, extract_tags, initialize_vault_structure, create_folder

app = FastAPI(title="Web Note Clipper API")

# Load config once at module level (can be overridden in tests)
_config = {}
_middleware_added = False

# Add CORS middleware once at import time with permissive defaults
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://127.0.0.1"],
    allow_origin_regex=r'chrome-extension://.*',
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_config():
    return _config


def init_app(config: dict):
    global _config
    _config = config


# --- Request / Response models ---

class SaveNoteRequest(BaseModel):
    title: str
    url: str
    date: str
    folder: str
    tags: List[str] = []
    key_paragraph: str = ""
    personal_note: str = ""
    screenshot_base64: str = ""
    overwrite: bool = False
    new_version: bool = False


class CreateFolderRequest(BaseModel):
    path: str


class SwitchVaultRequest(BaseModel):
    name: str


class InitVaultRequest(BaseModel):
    vault_path: Optional[str] = None


# --- Routes ---

@app.post("/save-note")
def api_save_note(req: SaveNoteRequest):
    config = get_config()
    try:
        vault = get_active_vault(config)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    vault_path = vault['path']
    if not os.path.exists(vault_path):
        raise HTTPException(
            status_code=400,
            detail=f"Vault 路徑不存在：{vault_path}，請檢查 config.json 設定"
        )

    try:
        result = save_note(
            vault_path=vault_path,
            title=req.title,
            url=req.url,
            date=req.date,
            folder=req.folder,
            tags=req.tags,
            key_paragraph=req.key_paragraph,
            personal_note=req.personal_note,
            screenshot_base64=req.screenshot_base64,
            overwrite=req.overwrite,
            new_version=req.new_version,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"儲存失敗：{str(e)}")

    if result.get('conflict'):
        return {
            "success": False,
            "conflict": True,
            "existing_filename": result['existing_filename'],
        }

    return {
        "success": True,
        "file_path": result['file_path'],
        "screenshot_path": result['screenshot_path'],
    }


@app.get("/health")
def api_health():
    config = get_config()
    try:
        vault = get_active_vault(config)
        vault_path = vault.get('path', '')
        active_vault = vault.get('name', '')
    except Exception:
        vault_path = ''
        active_vault = ''
    return {
        "status": "running",
        "active_vault": active_vault,
        "vault_path": vault_path,
    }


@app.get("/folders")
def api_list_folders():
    config = get_config()
    try:
        vault = get_active_vault(config)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    vault_path = vault['path']
    if not os.path.exists(vault_path):
        return {"folders": []}
    folders = list_folders(vault_path)
    return {"folders": folders}


@app.post("/folders")
def api_create_folder(req: CreateFolderRequest):
    config = get_config()
    try:
        vault = get_active_vault(config)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    vault_path = vault['path']
    if not os.path.exists(vault_path):
        raise HTTPException(
            status_code=400,
            detail=f"Vault 路徑不存在：{vault_path}"
        )
    try:
        full_path = create_folder(vault_path, req.path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"建立資料夾失敗：{str(e)}")
    return {"success": True, "path": req.path, "full_path": full_path}


@app.get("/tags")
def api_list_tags():
    config = get_config()
    try:
        vault = get_active_vault(config)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    vault_path = vault['path']
    if not os.path.exists(vault_path):
        return {"tags": []}
    tags = extract_tags(vault_path)
    return {"tags": tags}


@app.get("/vaults")
def api_list_vaults():
    config = get_config()
    return {"vaults": config.get('vaults', []), "active_vault": config.get('active_vault', '')}


@app.post("/vaults/switch")
def api_switch_vault(req: SwitchVaultRequest):
    config = get_config()
    try:
        updated = switch_active_vault(config, req.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    global _config
    _config = updated
    return {"success": True, "active_vault": req.name}


@app.post("/initialize-vault")
def api_initialize_vault(req: InitVaultRequest):
    config = get_config()
    if req.vault_path:
        vault_path = req.vault_path
    else:
        try:
            vault = get_active_vault(config)
            vault_path = vault['path']
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    try:
        initialize_vault_structure(vault_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"初始化失敗：{str(e)}")
    return {"success": True, "vault_path": vault_path}
