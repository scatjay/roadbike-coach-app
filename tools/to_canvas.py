"""把 design_v2/*.dc.html（獨立網頁）轉成 Claude Design 畫布能吃的 Design Component 格式，輸出到 canvas_v2/。
畫布規定：畫面全是 <x-dc> 標記、互動用 {{ }} 綁定與 onClick，不能用 getElementById。
用法：python tools/to_canvas.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "design_v2", ROOT / "canvas_v2"

FONT = ("https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,800;1,800&amp;"
        "family=Noto+Sans+TC:wght@400;500;700;900&amp;display=swap")
BTN5 = ("height:64px;border:3px solid #fff;background:transparent;color:#fff;font-size:28px;font-weight:900;"
        "font-family:'Barlow Condensed','Noto Sans TC',sans-serif")


def canvas_motion_css():
    """從 docs/motion.css 取出 CANVAS-SUBSET 標記之間的純 CSS（網頁版與畫布版共用同一來源）。"""
    t = (ROOT / "docs" / "motion.css").read_text(encoding="utf-8")
    a, b = t.index("/* CANVAS-SUBSET:START */"), t.index("/* CANVAS-SUBSET:END */")
    return t[a + len("/* CANVAS-SUBSET:START */"):b].strip()


# 畫布版的異常脈動：用行內 style 綁定（與網頁版 .m-pulse 同參數，只播 3 次）
PULSE_ON = "m-pulse 360ms cubic-bezier(.2,.8,.2,1) 3"


def sub(body, old, new):
    assert body.count(old) == 1, f"找不到或重複：{old[:60]}"
    return body.replace(old, new)


def wrap(title, body, script):
    return f"""<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="{FONT}">
<style>
body{{margin:0}}
a{{color:inherit;text-decoration:none}}
button{{font-family:inherit;cursor:pointer}}
{canvas_motion_css()}
</style>
</helmet>
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":390,"height":844}}}}'>
{script}
</script>
</body>
</html>
"""


OK_DIV = '<div id="ok" class="m-in" style="display:none;'
SEND_BTN = '<button id="b" type="button" class="m-press" style="'
TOGGLE = '<button id="t" type="button" style="'


def conv(stem):
    t = (SRC / f"{stem}.dc.html").read_text(encoding="utf-8")
    title = re.search(r"<title>(.*?)</title>", t).group(1)
    body = t[t.index("<body>") + 6:t.index("<script>")].strip()
    # data-b* 是網頁版 bridge.js 的綁定點；畫布版不跑 bridge.js（畫布不能用 getElementById/fetch），一律拿掉，內容維持示意
    body = re.sub(r' data-b[\w-]*="[^"]*"', "", body)
    if stem == "Home":
        body = sub(body, OK_DIV, '<div class="m-in" style="display:{{ okShow }};')
        body = sub(body, SEND_BTN, '<button type="button" class="m-press" onClick="{{ send }}" style="display:{{ bShow }};')
        js = """class Component extends DCLogic {
  constructor(props) { super(props); this.state = { sent: false }; }
  renderVals() {
    const s = this.state.sent;
    return { okShow: s ? 'block' : 'none', bShow: s ? 'none' : 'block', send: () => this.setState({ sent: true }) };
  }
}"""
    elif stem in ("Start", "Ride"):
        body = sub(body, OK_DIV, '<div style="display:{{ okShow }};')
        body = sub(body, SEND_BTN, '<button type="button" onClick="{{ send }}" style="')
        body = sub(body, TOGGLE, '<button type="button" onClick="{{ flip }}" style="')
        if stem == "Start":
            body = sub(body, '<div id="msg" style="font-size:56px;font-weight:900;line-height:1.15;color:#c6ff00">教練與感測器正常<br>手環請確認</div>',
                       '<div style="font-size:56px;font-weight:900;line-height:1.15;white-space:pre-line;color:{{ msgColor }};transform-origin:left center;animation:{{ msgAnim }}">{{ msgText }}</div>')
            texts = "msgText: b ? '車表沒回應\\n先叫醒它' : '教練與感測器正常\\n手環請確認',"
        else:
            body = sub(body, '<div id="msg" style="font-size:56px;font-weight:900;line-height:1.15;color:#c6ff00">教練在線</div>',
                       '<div style="font-size:56px;font-weight:900;line-height:1.15;color:{{ msgColor }};transform-origin:left center;animation:{{ msgAnim }}">{{ msgText }}</div>')
            body = sub(body, '<div id="sub" style="font-size:28px;color:#bdbdbd;font-weight:700">車表最後推送 41 秒前</div>',
                       '<div style="font-size:28px;color:#bdbdbd;font-weight:700">{{ subText }}</div>')
            texts = ("msgText: b ? '教練沒回應' : '教練在線',\n"
                     "      subText: b ? '已靜默 6 分鐘' : '車表最後推送 41 秒前',")
        js = f"""class Component extends DCLogic {{
  constructor(props) {{ super(props); this.state = {{ bad: false, sent: false }}; }}
  renderVals() {{
    const b = this.state.bad;
    return {{
      {texts}
      msgColor: b ? '#ff8a5c' : '#c6ff00',
      msgAnim: b ? '{PULSE_ON}' : 'none',
      okShow: this.state.sent ? 'block' : 'none',
      send: () => this.setState({{ sent: true }}),
      flip: () => this.setState({{ bad: !b }})
    }};
  }}
}}"""
    elif stem == "Turn":
        body = sub(body, OK_DIV, '<div style="display:{{ okShow }};')
        body = sub(body, SEND_BTN, '<button type="button" onClick="{{ send }}" style="')
        body = sub(body, TOGGLE, '<button type="button" onClick="{{ flip }}" style="')
        body = sub(body, '<div id="lab" style="color:#bdbdbd;font-size:28px;font-weight:700">回程</div>',
                   '<div style="color:#bdbdbd;font-size:28px;font-weight:700">{{ labText }}</div>')
        body = sub(body, '<div id="msg" style="font-size:56px;font-weight:900;line-height:1.15">教練與車表<br><span style="color:#c6ff00">在線</span></div>',
                   '<div style="display:{{ goodShow }};font-size:56px;font-weight:900;line-height:1.15;white-space:pre-line">教練與車表\n<span style="color:#c6ff00">在線</span></div>'
                   '\n<div style="display:{{ badShow }};font-size:56px;font-weight:900;line-height:1.15;transform-origin:left center;animation:' + PULSE_ON + '"><span style="color:#ff8a5c">教練沒回應</span></div>')
        body = sub(body, '<div id="sub" style="font-size:24px;color:#bdbdbd;line-height:1.6">回程建議請看車表／語音</div>',
                   '<div style="font-size:24px;color:#bdbdbd;line-height:1.6;white-space:pre-line">{{ subText }}</div>')
        body = sub(body, '<div id="act" style="display:none;flex-direction:column;gap:8px">',
                   '<div style="display:{{ actShow }};flex-direction:column;gap:8px">')
        js = """class Component extends DCLogic {
  constructor(props) { super(props); this.state = { bad: false, sent: false }; }
  renderVals() {
    const b = this.state.bad;
    return {
      labText: b ? '先處理' : '回程',
      goodShow: b ? 'none' : 'block',
      badShow: b ? 'block' : 'none',
      subText: b ? '回程提示會先走車表與語音' : '回程建議請看車表／語音',
      actShow: b ? 'flex' : 'none',
      okShow: this.state.sent ? 'block' : 'none',
      send: () => this.setState({ sent: true }),
      flip: () => this.setState({ bad: !b })
    };
  }
}"""
    elif stem == "Post":
        body = sub(body, '<div id="q" class="m-in" style="--i:2;display:flex;flex-direction:column;gap:10px">',
                   '<div class="m-in" style="--i:2;display:{{ qShow }};flex-direction:column;gap:10px">')
        five = "".join(f'<button type="button" class="m-press" onClick="{{{{ done }}}}" style="{BTN5}">{n}</button>' for n in range(1, 6))
        body = sub(body, '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px" id="s"></div>',
                   f'<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px">{five}</div>')
        body = sub(body, '<button id="skip" type="button" class="m-press" style="', '<button type="button" class="m-press" onClick="{{ done }}" style="')
        body = sub(body, '<div id="done" class="m-in" style="display:none;', '<div class="m-in" style="display:{{ doneShow }};')
        js = """class Component extends DCLogic {
  constructor(props) { super(props); this.state = { done: false }; }
  renderVals() {
    const d = this.state.done;
    return { qShow: d ? 'none' : 'flex', doneShow: d ? 'block' : 'none', done: () => this.setState({ done: true }) };
  }
}"""
    elif stem == "Coach":
        body = sub(body, '<div id="heard" class="m-in" style="display:none;', '<div class="m-in" style="display:{{ heardShow }};')
        body = sub(body, SEND_BTN, '<button type="button" class="m-press" onClick="{{ talk }}" style="')
        js = """class Component extends DCLogic {
  constructor(props) { super(props); this.state = { heard: false }; }
  renderVals() {
    return { heardShow: this.state.heard ? 'block' : 'none', talk: () => this.setState({ heard: true }) };
  }
}"""
    else:
        raise SystemExit(f"沒有 {stem} 的轉換規則")
    for k in ("id=\"ok\"", "id=\"b\"", "id=\"t\"", "id=\"msg\"", "id=\"sub\"", "id=\"lab\"", "id=\"act\"", "id=\"q\"", "id=\"s\"",
              "id=\"skip\"", "id=\"done\"", "id=\"heard\""):
        assert k not in body, f"{stem} 還有 {k}"
    return wrap(title, body, js)


def main():
    OUT.mkdir(exist_ok=True)
    for stem in ("Home", "Start", "Ride", "Turn", "Post", "Coach"):
        (OUT / f"{stem}.dc.html").write_text(conv(stem), encoding="utf-8", newline="\n")
        print("寫出 canvas_v2/", f"{stem}.dc.html")


if __name__ == "__main__":
    main()
