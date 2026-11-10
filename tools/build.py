"""把 design/*.dc.html（Claude Design 畫板）轉成 docs/ 的獨立網頁（GitHub Pages 發布資料夾）（可裝成手機 APP）。
用法：python tools/build.py   （只用標準函式庫，結果可重跑、同輸入同輸出）
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "design", ROOT / "docs"
NAMES = {  # 畫板檔 → 網頁檔
    "Home": "index", "Home_light": "index_light", "Ride": "ride",
    "Post": "post", "Trainer": "trainer", "Coach": "coach",
}
FRAME = "width: 390px; height: 844px;"
FRAME_NEW = "width: 100%; max-width: 430px; min-height: 100dvh; margin: 0 auto;"

RIDE_JS = """<script>
(function(){var f=false,b=document.getElementById('follow');
b.addEventListener('click',function(){f=!f;
b.textContent=f?'跟車靜音中（再按取消）':'我在跟車（靜音）';
b.style.background=f?'#c6ff00':'transparent';b.style.color=f?'#0b0b0c':'#ffffff';
b.style.borderColor=f?'#c6ff00':'#ffffff';});})();
</script>"""

POST_JS = """<script>
(function(){var A=document.getElementById('stepA'),B=document.getElementById('stepB'),C=document.getElementById('stepC');
function go(n){A.style.display=n==0?'flex':'none';B.style.display=n==1?'flex':'none';C.style.display=n==2?'block':'none';}
document.querySelectorAll('[data-go]').forEach(function(e){e.addEventListener('click',function(){go(+e.dataset.go);});});
go(0);})();
</script>"""

BTN = ("height: 64px; border: 3px solid #ffffff; background: transparent; color: #ffffff; font-size: 28px; "
       "font-weight: 900; font-family: 'Barlow Condensed', 'Noto Sans TC', system-ui, sans-serif")


def convert(stem: str, up: str = "") -> str:
    t = (SRC / f"{stem}.dc.html").read_text(encoding="utf-8")
    title = re.search(r"<title>(.*?)</title>", t).group(1)
    helmet = re.search(r"<helmet>(.*?)</helmet>", t, re.S).group(1)
    body = re.search(r"</helmet>\s*(.*?)\s*</x-dc>", t, re.S).group(1)
    body = body.replace(FRAME, FRAME_NEW)
    for k, v in NAMES.items():
        body = body.replace(f'href="{k}.dc.html"', f'href="{v}.html"')
    extra = ""
    if stem == "Ride":
        body = re.sub(r'<button type="button" onClick="\{\{ toggleFollow \}\}".*?</button>',
                      '<button type="button" id="follow" style="height: 64px; border: 3px solid #ffffff; background: '
                      'transparent; color: #ffffff; font-size: 24px; font-weight: 900; font-family: inherit">'
                      '我在跟車（靜音）</button>', body, flags=re.S)
        extra = RIDE_JS
    if stem == "Post":
        body = body.replace('<div style="display: {{ showA }}; flex-direction: column; gap: 10px">',
                            '<div id="stepA" style="display: flex; flex-direction: column; gap: 10px">')
        body = body.replace('<div style="display: {{ showB }}; flex-direction: column; gap: 10px">',
                            '<div id="stepB" style="display: none; flex-direction: column; gap: 10px">')
        body = body.replace('<div style="display: {{ showC }}; font-size: 28px;',
                            '<div id="stepC" style="display: none; font-size: 28px;')
        scores = "".join(f'<button type="button" data-go="1" style="{BTN}">{n}</button>' for n in range(1, 6))
        hints = "".join(f'<button type="button" data-go="2" style="{BTN}">{h}</button>' for h in ("太多", "剛好", "太少"))
        body = re.sub(r'<sc-for list="\{\{ scores \}\}".*?</sc-for>', scores, body, flags=re.S)
        body = re.sub(r'<sc-for list="\{\{ hints \}\}".*?</sc-for>', hints, body, flags=re.S)
        body = re.sub(r'<button type="button" onClick="\{\{ skip \}\}"',
                      '<button type="button" data-go="SKIP"', body)
        # 略過：A→B（略過第一題）、B→C；以所在區塊決定
        body = body.replace('id="stepA" style="display: flex; flex-direction: column; gap: 10px">',
                            'id="stepA" style="display: flex; flex-direction: column; gap: 10px" data-skip="1">', 1)
        parts = body.split('data-go="SKIP"')
        assert len(parts) == 3, "略過按鈕應有兩個"
        body = parts[0] + 'data-go="1"' + parts[1] + 'data-go="2"' + parts[2]
        extra = POST_JS
    assert "{{" not in body and "sc-for" not in body and "x-dc" not in body, f"{stem} 還有未轉換的標記"
    return f"""<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b0b0c">
<link rel="manifest" href="{up}manifest.webmanifest">
<link rel="icon" href="{up}icon.svg">
<title>{title}</title>
{helmet.strip()}
<style>html,body{{background:#0b0b0c}}html.locked body>*:not(#gate){{visibility:hidden}}</style>
<script>document.documentElement.classList.add("locked")</script>
</head>
<body>
{body}
{extra}
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="{up}gate.js"></script>
<script>if('serviceWorker' in navigator)navigator.serviceWorker.register('{up}sw.js').catch(function(){{}});</script>
</body>
</html>
"""


V2 = {"Home": "index", "Start": "start", "Ride": "ride", "Turn": "turn", "Post": "post", "Coach": "coach"}

V2_HEAD = (
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    '<meta name="theme-color" content="#0b0b0c">\n'
    '<link rel="manifest" href="manifest.webmanifest">\n'
    '<link rel="icon" href="icon.svg">\n'
    '<link rel="stylesheet" href="motion.css">\n'
    '<link rel="stylesheet" href="layout.css">\n'
    '<style>html,body{background:#0b0b0c}html.locked body>*:not(#gate){visibility:hidden}</style>\n'
    '<script>(function(){var h=document.documentElement;try{if(localStorage.getItem("rbc_in")!=="1")h.classList.add("locked");'
    'var d=sessionStorage.getItem("rbc_dir");if(d){h.style.setProperty("--vt-x-in",d==="next"?"28px":"-28px");sessionStorage.removeItem("rbc_dir")}}'
    'catch(e){h.classList.add("locked")}})()</script>'
)
V2_TAIL = (
    '<script src="motion.js"></script>\n'
    '<script src="swipe.js"></script>\n'
    '<script src="bridge_fixtures.js"></script>\n'
    '<script src="bridge.js"></script>\n'
    '<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>\n'
    '<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>\n'
    '<script src="gate.js"></script>\n'
    "<script>if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(function(){});</script>\n"
    "</body>"
)


def convert_v2(stem: str) -> str:
    """v2 畫板本來就是獨立 HTML（不是 Design Component）：只需響應式外框、連結、登入閘門、離線快取。"""
    t = (ROOT / "design_v2" / f"{stem}.dc.html").read_text(encoding="utf-8")
    assert '<meta name="viewport" content="width=390">' in t, f"{stem} 找不到 viewport"
    t = t.replace('<meta name="viewport" content="width=390">', V2_HEAD)
    t = t.replace("width:390px;height:844px;", "width:100%;max-width:430px;min-height:100dvh;margin:0 auto;")
    # 字型樣式表會擋住首次繪製（換頁黑屏的主因）：改成不擋，字型載好再換；fallback 字型本來就在字型串裡
    def _font(m):
        u = m.group(1)
        return ("<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">" + chr(10)
                + "<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>" + chr(10)
                + "<link rel=\"stylesheet\" href=\"" + u + "\" media=\"print\" onload=\"this.media='all'\">" + chr(10)
                + "<noscript><link rel=\"stylesheet\" href=\"" + u + "\"></noscript>")
    t, nf = re.subn(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com[^"]+)">', _font, t)
    assert nf == 1, f"{stem} 字型連結數量不對：{nf}"
    for k, v in V2.items():
        t = t.replace(f'href="{k}.dc.html"', f'href="{v}.html"')
    assert "dc.html" not in t and "width:390px" not in t, f"{stem} v2 還有未轉換的標記"
    if stem in BRIDGE_PAGES:  # 這四頁由 bridge.js 填入真資料（或示意夾具）；「畫板用：切換異常」鈕只給畫板，網頁版拿掉
        assert 'data-b="' in t, f"{stem} 沒有 data-b 綁定點"
        t, n = re.subn(r'<button id="t" type="button"[^>]*>（畫板用：切換異常）</button>\n?', "", t)
        assert n == (0 if stem == "Home" else 1), f"{stem} 切換異常鈕數量不對：{n}"
    t = t.replace('<body>', '<body data-page="' + V2[stem] + '">', 1)
    assert t.count("</body>") == 1
    return t.replace("</body>", V2_TAIL)


BRIDGE_PAGES = ("Home", "Start", "Ride", "Turn")
FIXTURE_JS = """/* 由 tools/build.py 從 design_v2/fixtures/status_*.json 產生，不要手改。示意資料：沒有任何座標、位置或金鑰。
 * 契約來源：公路車專案 phone-agent/hub_fixtures（schema:1）。 */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data; else root.BRIDGE_FIXTURES = data;
})(typeof self !== 'undefined' ? self : this, %s);
"""


def build_fixtures():
    """夾具：JSON 逐檔複製到 docs/fixtures/，並合成 docs/bridge_fixtures.js（bridge.js 的示意來源，離線也能用）。"""
    (OUT / "fixtures").mkdir(parents=True, exist_ok=True)
    data = {}
    for p in sorted((ROOT / "design_v2" / "fixtures").glob("status_*.json")):
        obj = json.loads(p.read_text(encoding="utf-8"))
        assert obj.get("schema") == 1, f"{p.name} schema 不是 1"
        blob = json.dumps(obj, ensure_ascii=False)
        assert not re.search(r'"(lat|lon|lng|latitude|longitude|token|key|secret)"', blob, re.I), f"{p.name} 含座標或金鑰欄位"
        data[p.stem[len("status_"):]] = obj
        (OUT / "fixtures" / p.name).write_text(json.dumps(obj, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    assert len(data) == 5, f"夾具應有 5 個，實際 {len(data)}"
    (OUT / "bridge_fixtures.js").write_text(FIXTURE_JS % json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
    print("寫出 bridge_fixtures.js 與 fixtures/", len(data), "個")


def main():
    build_fixtures()
    (OUT / "v1").mkdir(parents=True, exist_ok=True)
    for stem, name in NAMES.items():  # v1：保留在 /v1/
        (OUT / "v1" / f"{name}.html").write_text(convert(stem, up="../"), encoding="utf-8", newline="\n")
        print("寫出 v1/", f"{name}.html")
    for stem, name in V2.items():  # v2：網站首頁
        (OUT / f"{name}.html").write_text(convert_v2(stem), encoding="utf-8", newline="\n")
        print("寫出", f"{name}.html")


if __name__ == "__main__":
    main()
