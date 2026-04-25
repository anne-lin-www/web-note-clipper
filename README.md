# Web Note Clipper

將網頁內容快速儲存為 Obsidian Markdown 筆記的工具，由 **Chrome 擴充功能** 與**本機 Python API 服務**組成。

---

## 功能特色

- **右鍵選單**：選取網頁文字後右鍵，一鍵儲存為筆記
- **自動截圖**：自動擷取當前頁面截圖並存入 Vault
- **資料夾管理**：動態列出並新增 Obsidian Vault 資料夾
- **標籤系統**：自動讀取 Vault 中已使用的標籤供選擇
- **多 Vault 支援**：可在設定頁面切換不同的 Obsidian Vault
- **系統匣常駐**：Windows 右下角系統匣圖示，隨時啟動／停止服務

---

## 系統需求

- Windows 10 / 11
- Google Chrome 瀏覽器
- [Obsidian](https://obsidian.md/)（免費下載，建立好 Vault 資料夾即可）

---

## 安裝說明

> 依照使用方式選擇其中一種安裝方式。

### 方式一：下載 .exe（一般使用者，推薦）

1. 前往 [Releases 頁面](../../releases/latest)，下載 `web-note-clipper.exe`
2. 將 `web-note-clipper.exe` 放到一個固定的資料夾，例如 `C:\Tools\web-note-clipper\`
3. 在同一個資料夾中，建立 `config.json`（參考下方[設定檔說明](#設定檔說明)）
4. 雙擊執行 `web-note-clipper.exe`，右下角系統匣會出現圖示
5. 繼續進行 [Chrome 擴充功能安裝](#安裝-chrome-擴充功能)

**設定開機自動啟動（可選）**

1. 按 `Win + R`，輸入 `shell:startup`，按 Enter
2. 將 `web-note-clipper.exe` 的捷徑貼入開啟的資料夾
3. 下次開機時服務會自動啟動

### 方式二：從原始碼執行（開發者）

需要先安裝 Python 3.11+。

```bash
cd api
pip install -r requirements.txt
cp config.example.json config.json
# 編輯 config.json，填入您的 Obsidian Vault 路徑
python main.py
```

---

## 設定檔說明

第一次執行時，程式會自動開啟 `config.json` 供您編輯。請將 `path` 改為您的 Obsidian Vault 實際路徑。

```json
{
  "vaults": [
    {
      "name": "主要筆記",
      "path": "C:/Users/您的使用者名稱/Documents/ObsidianVault"
    }
  ],
  "active_vault": "主要筆記",
  "api_port": 8765
}
```

> `config.json` 包含本機路徑，已加入 `.gitignore`，不會上傳至 GitHub。

**多個 Vault 設定範例**

```json
{
  "vaults": [
    { "name": "主要筆記", "path": "C:/Users/Anne/Documents/MainVault" },
    { "name": "工作筆記", "path": "C:/Users/Anne/Documents/WorkVault" }
  ],
  "active_vault": "主要筆記",
  "api_port": 8765
}
```

切換 Vault 可透過 Chrome 擴充功能的**設定頁面**操作。

---

## 安裝 Chrome 擴充功能

1. 開啟 Chrome，網址列輸入 `chrome://extensions/` 並前往
2. 右上角開啟「**開發人員模式**」
3. 點選「**載入未封裝項目**」
4. 選擇本專案的 `extension/` 資料夾
5. 擴充功能圖示會出現在工具列

---

## 初始化 Vault 資料夾結構（首次使用）

第一次使用前，建議讓程式在 Obsidian Vault 建立預設資料夾結構。在 API 服務啟動後，開啟瀏覽器前往：

```
http://localhost:8765/docs
```

找到 `POST /initialize-vault`，點擊「Try it out」→「Execute」，程式會自動建立以下結構：

```
ObsidianVault/
├── 法規/
│   ├── 勞動法規/
│   ├── 稅務法規/
│   └── 建築法規/
├── 政府公告/
│   ├── 中央/
│   └── 地方/
├── 專業文章/
├── _assets/screenshots/    ← 截圖自動存放於此
└── _inbox/                 ← 尚未分類的筆記暫放區
```

---

## 使用方式

**方式一：右鍵選單（選取文字）**

1. 在網頁上選取想保存的文字段落
2. 右鍵 → 點選「**儲存到 Web Note Clipper**」
3. 新分頁開啟，確認標題、截圖、選取文字
4. 選擇儲存的資料夾與標籤
5. 點擊「**儲存**」

**方式二：工具列圖示**

1. 點選 Chrome 工具列的擴充功能圖示
2. 點選「**儲存目前頁面**」
3. 後續步驟同上

---

## 資料夾與標籤使用建議

**資料夾 = 主題分類**（這份資料屬於哪個領域）

| 資料夾 | 適合存放 |
|--------|---------|
| `法規/勞動法規` | 勞基法、勞動契約相關 |
| `法規/稅務法規` | 報稅、稅率相關 |
| `政府公告/中央` | 各部會公告 |
| `政府公告/地方` | 縣市政府公告 |
| `專業文章` | 非政府來源的專業資訊 |
| `_inbox` | 還沒決定要放哪裡，先存起來 |

**標籤 = 狀態或跨領域屬性**（這份資料的性質）

| 標籤 | 用途 |
|------|------|
| `待確認` | 內容需要再查證 |
| `重要` | 需要特別注意 |
| `已處理` | 已依此資料採取行動 |
| `法條` | 明確的法律條文 |
| `公告` | 政府公告性質 |
| `期限` | 有時效性，注意截止日期 |

---

## 系統匣操作

API 服務執行中時，右下角系統匣會顯示圖示。**右鍵**圖示可以：

- **啟動服務**：重新啟動 HTTP 服務
- **停止服務**：停止 HTTP 服務（擴充功能暫時無法儲存）
- **結束**：完全關閉程式

---

## 常見問題

**Q：擴充功能顯示「未連線 — 請啟動本機服務」**

請確認 `web-note-clipper.exe` 正在執行（右下角系統匣應有圖示）。若沒有，雙擊 exe 重新啟動。

**Q：第一次執行 exe 時自動開了 Notepad**

這是正常行為。程式找不到 `config.json`，所以自動開啟讓您填寫設定。填入 Vault 路徑後儲存，再重新執行 exe。

**Q：截圖是空白或黑色的**

部分網站（如銀行、政府特定頁面）有防截圖保護，這是 Chrome 的限制，無法繞過。可以改用手動貼上文字方式記錄。

**Q：儲存後 Obsidian 裡找不到筆記**

確認 `config.json` 裡的 `path` 和 Obsidian 開啟的 Vault 路徑完全一致（包含大小寫）。

**Q：如何新增自己的資料夾類別？**

在儲存筆記的介面，資料夾下拉選單下方有「**+ 新增資料夾**」，輸入路徑（例如 `醫療/保險`）後確認即可。

---

## 專案結構

```
web-note-clipper/
├── api/
│   ├── main.py                # 程式進入點：啟動系統匣 + API 服務
│   ├── server.py              # FastAPI 路由定義
│   ├── note_writer.py         # 產生 Markdown 筆記、儲存截圖
│   ├── vault_manager.py       # 資料夾列出、標籤掃描、Vault 初始化
│   ├── path_utils.py          # 路徑安全工具（防止路徑穿越攻擊）
│   ├── config_loader.py       # 載入與管理 config.json
│   ├── tray.py                # Windows 系統匣圖示
│   ├── requirements.txt       # 生產依賴（PyInstaller 使用）
│   ├── requirements-dev.txt   # 開發依賴（包含 pytest、flake8）
│   ├── config.example.json    # 設定範本
│   └── tests/                 # 單元測試
├── extension/
│   ├── manifest.json          # 擴充功能設定（Manifest V3）
│   ├── background/            # Service Worker（右鍵選單邏輯）
│   ├── content/               # Content Script（頁面文字擷取）
│   ├── popup/                 # 工具列彈出視窗
│   ├── capture/               # 筆記編輯儲存介面
│   └── settings/              # 擴充功能設定頁面
├── docs/
│   ├── PLANNING.md            # 系統規劃文件
│   └── github-actions-cicd.md # CI/CD 學習筆記
└── .github/workflows/
    ├── ci.yml                 # 自動測試（push/PR 觸發）
    └── release.yml            # 自動打包 .exe（tag 觸發）
```

---

## 開發者指南

```bash
# 安裝開發依賴
pip install -r api/requirements-dev.txt

# 執行單元測試
pytest api/tests/ -v

# 程式碼風格檢查
flake8 api/ --max-line-length=100 --exclude=__pycache__,api/tests
```

### CI/CD 流程

| 觸發條件 | 執行內容 |
|---------|---------|
| push / PR 到 `main` | flake8 語法檢查 + pytest 單元測試 |
| 推送 `v*` tag（例如 `v1.0.0`）| PyInstaller 打包 .exe，上傳至 GitHub Releases |

```bash
# 發布新版本
git tag v1.0.0
git push origin v1.0.0
```

---

## 授權

[MIT License](LICENSE)
