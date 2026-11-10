# 公路車教練 APP（網頁版，可裝到手機桌面）

- 稱「楊老師」，一律繁體中文。
- `design/` 是 Claude Design 畫板原稿；`docs/` 由 `python tools/build.py` 產生（GitHub Pages 發布資料夾），不要手改，`docs/gate.js`、`docs/bridge.js`、`docs/bridge_fixtures.js`、`docs/fixtures/`、`docs/layout.css`、`docs/swipe.js`、`docs/icon-192.png`、`docs/icon-512.png`、`docs/sw.js`、`docs/manifest.webmanifest`、`docs/icon.svg` 除外。
- 這是 **v1 概念稿**：數字是 2026-11-09 的示意值，沒有接教練。其中「騎乘中」頁是車表式的設計，**與實際使用情境不符**（楊老師騎乘中不看手機，手機在後口袋，靠耳機語音＋手環，車表另有 Bryton），v2 要依實際使用情境重做。
- **倉庫是公開的**：只能放示意資料與公開識別碼（Firebase 網頁 apiKey 是公開識別碼）。真實騎乘資料、座標、家的位置、金鑰、token 一律不進這個倉庫。
- 登入沿用文化遊戲松後台的做法（`課程管理與備課/CLAUDE.md` Firebase Auth 一節）：Firebase 專案 `gen-lang-client-0929530380`（`scatjay.github.io` 已在授權網域、Google 登入已啟用）；彈窗優先、被擋才轉頁；錯誤訊息不吞掉。該專案的 RTDB 規則是多個專案共用，**要用資料庫先用 `_firebase-deploy/rules_guard.py add` 加自己的區塊，不要直接改規則檔**。
- Firebase CLI 登入一律隔離：`XDG_CONFIG_HOME=<本專案>/.firebase-config`（已 gitignore），不碰使用者其他登入；不執行 `firebase logout`。南台帳號下有一個空的 GCP 專案 `roadbike-coach`（沒啟用 Firebase），之後 Vertex Gemini 後端預計放那裡；Vertex 呼叫一律走 `llm-ops/vertex_cap.py`。
9. **服務工作者的快取清單只要有一個檔案不存在，`cache.addAll` 整批失敗、服務工作者永遠裝不起來**（2026-11-10 實測：舊清單有不存在的 `index_light.html`，症狀是改了網頁手機要等 10 分鐘才更新）。現在逐檔快取；改清單後用除錯介面查 `navigator.serviceWorker.getRegistrations()` 確認有註冊。
10. Chrome 要有 192／512 的 PNG 圖示才提供「安裝應用程式」，只有 SVG 只會做捷徑（開啟仍有網址列）。裝成 App 後，adb 開的本站網址會被 App 接走；同一網址再開只是叫到前景、不會重新載入，要換頁用底部導覽。
11. 版面以「出發點一屏看完（標題＋四項狀態＋動作鈕）」為準；改字級或文案後，要在實機 App 內各頁往下捲到底都看一次。
