import json
import os
import shutil
import subprocess
import sys


def get_base_dir() -> str:
    """Return the directory where config.json should live."""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def load_config() -> dict:
    """Load config.json, creating it from example if missing."""
    base_dir = get_base_dir()
    config_path = os.path.join(base_dir, 'config.json')
    example_path = os.path.join(base_dir, 'config.example.json')

    if not os.path.exists(config_path):
        if os.path.exists(example_path):
            shutil.copy(example_path, config_path)
        else:
            _write_default_config(config_path)
        try:
            subprocess.Popen(['notepad.exe', config_path])
        except Exception:
            pass

    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    return config


def _write_default_config(path: str) -> None:
    default = {
        "vaults": [
            {
                "name": "主要筆記",
                "path": "C:/Users/YourName/Documents/ObsidianVault"
            }
        ],
        "active_vault": "主要筆記",
        "api_port": 8765,
        "allowed_origins": ["chrome-extension://"]
    }
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(default, f, ensure_ascii=False, indent=2)


def get_active_vault(config: dict) -> dict:
    """Return the active vault dict from config."""
    name = config.get('active_vault')
    for vault in config.get('vaults', []):
        if vault['name'] == name:
            return vault
    if config.get('vaults'):
        return config['vaults'][0]
    raise ValueError("設定檔中找不到任何 vault 設定")


def switch_active_vault(config: dict, name: str) -> dict:
    """Switch the active vault by name and persist to config.json."""
    names = [v['name'] for v in config.get('vaults', [])]
    if name not in names:
        raise ValueError(f"找不到名稱為 '{name}' 的 vault")
    config['active_vault'] = name
    base_dir = get_base_dir()
    config_path = os.path.join(base_dir, 'config.json')
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    return config
