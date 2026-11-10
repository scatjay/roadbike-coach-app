# 公路車教練 APP（v1 概念稿）

運動風、深色底、一頁一個主訊息。五頁：今天、騎乘中、騎後、訓練台、問教練（另有亮色版對照 `index_light.html`）。
網址：https://scatjay.github.io/roadbike-coach-app/ （GitHub Pages，發布資料夾是 `docs/`）

- **登入**：每一頁都要先用 Google 登入（Firebase Auth），白名單在 `docs/gate.js` 的 `ALLOW`。
  ⚠ 這是前端閘門，倉庫是公開的：**公開倉庫裡只能放示意資料**；真實騎乘資料要放在受 Firebase 規則保護的資料庫，登入後才讀。
- 本機預覽：`python -m http.server -d docs 8765`（本機網址需先加入 Firebase 授權網域才能登入）
- 重新產生網頁：`python tools/build.py`（`design/` → `docs/`；`docs/bridge.js` 是手寫的，不會被覆蓋）
- 資料來源（v2 的出發點／騎乘中／折返點／今天四頁）：預設示意（`?scenario=ok|band_unconfirmed|coach_silent|riding|bridge_down`）；`?bridge=local` 讀本機樞紐 `http://127.0.0.1:8790/v1/status`（頁面要開在手機本機）；`?bridge=relay` 尚未實作。判讀測試：`node tools/test_bridge.js`。夾具在 `design_v2/fixtures/`（契約來源是公路車專案 `phone-agent/hub_fixtures`，只能是示意資料）。
- 數字為 2026-11-09 示意值，尚未接教練；v2 會依實際使用情境重做（騎乘中手機在口袋）。
