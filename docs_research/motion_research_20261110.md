# 公路車教練 APP 動畫研究（2026-11-10）

> 目的：替 v2 六頁（今天、出發點、騎乘中、折返點、騎後、問教練）決定「哪些要動、怎麼動、動多久」。
> 本文件在公開倉庫，只放通用結論與公開出處，不含任何個人資料、座標或金鑰。
>
> 讀取程度說明：**全文**＝完整讀到該頁；**主要內容**＝以網頁擷取工具讀到該頁主體（較長的 MDN 頁面只讀到前約 10 萬字元，語法與範例都在其中，尾段的瀏覽器相容表未讀）；**只讀摘要**＝只看到摘要或標題；**推論**＝沒有直接出處，由其他結論推得，使用時要自行驗證。本輪沒有任何一項標為「全文」，因為擷取工具回傳的是摘要式整理，不是逐字原文。

## 使用情境（決定動畫能做多少）

手機多半在口袋、螢幕關著；只有出發點、折返點、騎完才拿出來看，而且是老花眼、短暫一瞥。手機曾有過熱疑慮。所以動畫的角色只有三個：**讓一瞥時知道「哪裡是新的／哪裡變了」**、**按下去有回饋**、**異常時抓一次注意力**。其餘（炫技、裝飾、持續循環）全部省掉。

## 結論前 5 點

1. **只動 `transform` 與 `opacity`**，其他屬性會觸發版面或繪製，難以維持流暢（主要內容）。
2. **`prefers-reduced-motion: reduce` 必須尊重**，且最簡單的做法是直接關掉動畫、顯示最終狀態（主要內容；「直接關掉」一項 MDN 範例是改成溫和動畫，直接關閉是本文的選擇，屬推論）。
3. **自動開始、超過 5 秒的動態要能暫停；閃爍每秒不得超過 3 次**。本專案所有動畫都在 1.2 秒內結束且沒有循環，所以不需要暫停鈕（主要內容）。
4. **時長 100–400ms**；回饋型約 100ms；超過 500ms 會顯得拖沓；進場用 ease-out（主要內容）。
5. **不用 View Transitions、不用函式庫、不用 `will-change`**：本專案換頁很少、跨頁轉場在 Firefox 沒有、`will-change` 官方說明是最後手段（主要內容）。

## 1. 效能與耗電

| 結論 | 出處等級 | 出處 |
|---|---|---|
| 動畫盡量限制在 `transform` 與 `opacity`，讓它停在合成階段；用 `translate`／`scale` 取代改 `top`／`left`。 | 主要內容 | https://web.dev/articles/animations-guide |
| 其他屬性要先評估對渲染管線的影響；會觸發 layout／paint 的屬性很難維持流暢。 | 主要內容 | 同上 |
| `will-change` 會強制建立圖層，圖層本身可能造成其他效能問題；只在已出現問題時才用，並於變化前後以腳本開關。 | 主要內容 | https://web.dev/articles/animations-guide ；https://developer.mozilla.org/en-US/docs/Web/CSS/will-change |
| `will-change` 不要套在大型區塊或 `<body>`，不要長期寫死在樣式表，也不要寫進 `@keyframes`。 | 主要內容 | MDN will-change（同上） |
| 頁面不可見時（切換分頁、螢幕關閉）瀏覽器通常停止對背景分頁發送 `requestAnimationFrame` 回呼並節流計時器；應在 `document.hidden` 時停止輪詢、輪播等工作。 | 主要內容 | https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API |
| 「無限循環動畫在手機上較耗電」。 | **推論**（未找到專門量測的出處；由「持續合成＋持續喚醒」推得）。對策：本專案不使用任何 `infinite`。 | — |
| 計數動畫（count-up）每幀改文字，是 layout 工作，不是合成層。 | **推論**（文字變動必然重排；寬度被鎖住後範圍很小）。對策：只對 1 個元素、600ms、只跑 1 次，並鎖定最小寬度。 | — |

## 2. 無障礙

| 結論 | 出處等級 | 出處 |
|---|---|---|
| `prefers-reduced-motion` 有 `no-preference`／`reduce` 兩值；`reduce` 表示使用者要求移除、減少或替換以動態為主的動畫。2020 年 1 月起廣泛支援。 | 主要內容 | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion |
| 縮放或平移大型物件是常見的前庭不適誘因；建議以淡入淡出取代。 | 主要內容 | 同上 |
| WCAG 2.2.2（A）：自動開始、超過 5 秒、與其他內容並存的移動／閃爍，需提供暫停、停止或隱藏；5 秒內結束可免。 | 主要內容 | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html |
| WCAG 2.3.1（A）：每秒閃爍不得超過 3 次，或低於一般閃爍與紅色閃爍的門檻。 | 主要內容 | https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html |
| WCAG 2.3.3（AAA）：由互動觸發的非必要動態動畫應可關閉；單純的顏色或透明度變化（不改變大小、形狀、位置）不算動態動畫；建議尊重 `prefers-reduced-motion`。 | 主要內容 | https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html |

**本專案的落實**：所有動畫類別在 `reduce` 下一律 `animation: none`，元素的基底樣式就是最終狀態，所以不需要額外的「跳到結尾」程式；計數腳本偵測到 `reduce` 時完全不介入。異常脈動只用縮放 6%、3 次、1.08 秒，遠低於閃爍門檻；也沒有紅色大面積閃爍（警示色是橘 #ff8a5c，且只縮放、不明滅）。

## 3. 技法與適不適合「口袋裡偶爾拿出來看」

| 技法 | 判斷 | 理由 | 出處等級 |
|---|---|---|---|
| 頁面進場（stagger，淡入＋上移 12px，每級延遲 60ms） | **用**，每頁最多 3 級 | 拿出手機那一刻，眼睛需要被引導到主要資訊；總長 < 0.5 秒。 | 推論（時長依第 4 節出處） |
| 數字計數（count-up） | **只用在 2 個主數字**（今天的心率、騎後的同心率） | 一瞥時能感覺「這是剛算出來的」；但計數中途讀到的數字不是真值，所以從最終值的 60% 起算、只跑 0.6 秒。畫布版沒有腳本，直接顯示最終值。 | 推論 |
| 色塊掃入（斜切色塊 scaleX） | **只用在騎後的「持平」徽章** | 呼應運動風斜切語彙，且是結論詞，值得一次強調。 | 推論 |
| 異常強調（脈動） | **用，但有限次數**：3 次後靜止 | 綠→橘是最需要被注意到的狀態變化；循環會耗電且違反 2.2.2 的精神。 | 推論；次數上限依 WCAG 2.2.2 的 5 秒、2.3.1 的 3 次/秒 |
| 按鈕按壓回饋（scale .97、90ms） | **用** | 手指在老花眼下容易不確定有沒有按到；90ms 屬回饋型。 | 主要內容（NN/g 回饋型約 100ms） |
| 成功回饋（「已送出」淡入） | **用**（同 m-in） | 送出類按鈕唯一的確認方式。 | 推論 |
| 骨架／載入動畫 | **不用** | 頁面是靜態、離線快取，沒有載入等待可以遮。 | 推論 |
| View Transitions（跨頁 MPA） | **不用** | 需兩頁都加 `@view-transition { navigation: auto }`，同源才行；Chrome 126、Safari 18.2 起支援，Firefox 不支援；導覽超過 4 秒會被跳過；MDN 標為非 Baseline。本專案是六頁、換頁頻率低，再加進場動畫會變成「兩層動態疊在一起」，且要與登入閘門（解鎖前整頁隱藏）互相配合，風險大於收益。 | 主要內容 |
| 視差、背景循環、持續閃爍的「連線中」小點 | **不用** | 裝飾性；耗電；WCAG 2.3.3 明列視差為典型違反。 | 主要內容 |

出處：https://developer.chrome.com/docs/web-platform/view-transitions/cross-document ；https://developer.mozilla.org/en-US/docs/Web/CSS/@view-transition ；https://www.nngroup.com/articles/animation-duration/ 。

## 4. 運動風的動態語彙

| 項目 | 取值 | 出處等級 |
|---|---|---|
| 回饋型（按壓） | 90ms | 主要內容（NN/g：簡單回饋約 100ms） |
| 一般進場／狀態變化 | 280–360ms | 主要內容（NN/g：多數落在 100–500ms，100–400ms 常見，大幅變化 200–300ms，超過 500ms 拖沓） |
| 單次整體上限 | 1.2 秒內靜止 | 本專案自訂；推論 |
| 進場曲線 | `cubic-bezier(.2,.8,.2,1)`（快速起步、尾端減速，有「衝刺後收腳」的感覺） | 進場用 ease-out 的原則來自 NN/g（主要內容）；具體四個數值是本專案選的，推論 |
| 斜切 | 沿用既有的 `skewX(-20deg)` 與 `clip-path`；掃入時只動 `scaleX`，不動 clip-path | 推論 |
| 位移量 | 進場上移 12px；大幅位移容易引起前庭不適，故不做整頁滑動 | 主要內容（MDN：縮放、平移大型物件是誘因）＋推論 |

**未取得**：Material 3 的 easing／duration token 數值（該頁擷取不到內容），因此沒有引用。

## 5. 函式庫

不引入。理由：需求只有淡入、位移、縮放、一個 600ms 計數；原生 CSS `@keyframes` 加約 60 行 JS 就夠。引入函式庫會增加離線快取體積與公開倉庫的相依風險。若日後真的需要，只能用 cdnjs 並固定版本。

## 6. 實作對照

| 檔案 | 角色 |
|---|---|
| `docs/motion.css` | 所有 keyframes 與 `@media (prefers-reduced-motion: reduce)`；`CANVAS-SUBSET` 標記之間是畫布版共用的純 CSS 子集 |
| `docs/motion.js` | 只做 count-up；解鎖後才開始、`document.hidden` 時直接顯示最終值、任何例外退回最終值 |
| `tools/build.py` | 把 motion.css（head）與 motion.js（尾端、在登入腳本之前）注入每一個 v2 頁 |
| `tools/to_canvas.py` | 讀 `docs/motion.css` 的子集注入 `<helmet><style>`；不使用腳本；異常脈動用行內 `animation:` 綁定 |
| `docs/sw.js` | 快取清單加入兩個檔，版本號 v4 → v5 |
| `design_v2/*.dc.html` | 只加 class（`m-in`／`m-count`／`m-sweep`／`m-press`）、`--i` 次序變數，以及異常切換時 `classList.toggle('m-pulse', …)` |

登入閘門：`gate.js` 顯示時，`<html>` 帶 `locked` 且頁面內容被隱藏。動畫選擇器都寫成 `html:not(.locked) …`，所以解鎖那一刻才開始播，不會在看不見時白播；`gate.js` 本身未修改。

## 7. 已知限制

- 本輪**沒有在真實瀏覽器或手機上實測**（沒有幀率、耗電、視覺驗收）；只做了結構檢查與 count-up 的腳本邏輯模擬（假 DOM）。
- 畫布版的「異常脈動」依賴畫布引擎接受行內 `animation:{{ }}` 綁定；行內 `style="display:{{ … }}"` 已知可用，`animation` 同理但**未在 Claude Design 畫布中實測**。
- 畫布版沒有計數動畫（沒有腳本）。
- iOS 的「減少動態」會對應到 `prefers-reduced-motion`；Android 的「移除動畫」是否總是對應，未逐機型驗證。
