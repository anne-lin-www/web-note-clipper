# Web Note Clipper

一個將網頁內容快速儲存為 Obsidian Markdown 筆記的工具，由 Chrome 擴充功能與本機 Python API 服務組成。

## 功能特色

- 🖱️ **右鍵選單**：選取文字後右鍵儲存為筆記
- 📸 **自動截圖**：自動擷取當前頁面截圖並存入 Vault
- 🗂️ **資料夾管理**：動態列出並新增 Obsidian Vault 資料夾
- 🏷️ **標籤系統**：自動讀取 Vault 中已使用的標籤
- 🔄 **多 Vault 支援**：可在設定頁面切換不同的 Obsidian Vault
- 🖥️ **系統匣圖示**：Windows 系統匣常駐服務

## 系統需求

- Python 3.11+
- Google Chrome
- Windows（系統匣功能）/ macOS / Linux（僅 API 模式）

## 安裝與使用

### 1. 設定 API 服務

\`\`\`bash
cd api
pip install -r requirements.txt
cp config.example.json config.json
# 編輯 config.json，填入您的 Obsidian Vault 路徑
python main.py
\`\`\`

### 2. 安裝 Chrome 擴充功能

1. 開啟 Chrome，前往 \`chrome://extensions/\`
2. 啟用「開發人員模式」
3. 點選「載入未封裝項目」，選擇 \`extension/\` 資料夾

### 3. 開始使用

- 在任意網頁選取文字 → 右鍵 → **儲存到 Web Note Clipper**
- 或點選工具列圖示直接開啟截圖儲存介面

## 設定檔說明（config.json）

\`\`\`json
{
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
\`\`\`

> ⚠️ \`config.json\` 包含本機路徑，已加入 \`.gitignore\`，不會被提交至版本庫。

## 專案結構

\`\`\`
web-note-clipper/
├── api/
│   ├── config.example.json   # 設定範本
│   ├── config_loader.py      # 設定載入與管理
│   ├── note_writer.py        # Markdown 筆記產生與儲存
│   ├── vault_manager.py      # Vault 資料夾與標籤管理
│   ├── server.py             # FastAPI 服務端點
│   ├── tray.py               # Windows 系統匣圖示
│   ├── main.py               # 程式進入點
│   └── tests/                # 單元測試
├── extension/
│   ├── manifest.json
│   ├── background/           # Service Worker
│   ├── content/              # Content Script
│   ├── popup/                # 工具列彈出視窗
│   ├── capture/              # 筆記儲存介面
│   └── settings/             # 設定頁面
└── .github/workflows/        # CI/CD
\`\`\`

## 開發

\`\`\`bash
# 執行測試
pytest api/tests/ -v

# 程式碼風格檢查
flake8 api/ --max-line-length=100 --exclude=__pycache__,api/tests
\`\`\`

## CI/CD

- **CI**：每次 push/PR 到 \`main\` 分支時自動執行 flake8 與 pytest
- **Release**：推送 \`v*\` tag 時自動使用 PyInstaller 建置 Windows EXE 並上傳至 GitHub Releases

## 授權

MIT License
