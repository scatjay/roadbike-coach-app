# 公路車教練 APP（網頁版，可裝到手機桌面）

- 稱「楊老師」，一律繁體中文。
- `design/` 是 Claude Design 畫板原稿；`public/` 由 `python tools/build.py` 產生，不要手改。
- 這是 **v1 概念稿**：數字是 2026-11-09 的示意值，沒有接教練。其中「騎乘中」頁是車表式的設計，**與實際使用情境不符**（楊老師騎乘中不看手機，手機在後口袋，靠耳機語音＋手環，車表另有 Bryton），v2 要依實際使用情境重做。
- Firebase 登入一律隔離：`XDG_CONFIG_HOME=<本專案>/.firebase-config`，不碰使用者其他專案的登入；不執行 `firebase logout`。
- 憑證、金鑰、座標、家的位置不進版控。
