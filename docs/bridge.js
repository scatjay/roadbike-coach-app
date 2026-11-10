/* bridge.js：把「手機樞紐」GET /v1/status 讀成教練／感測器／手環／車表四項判讀（綠＝有證據、灰＝不確定、紅＝有反證）。
 * 判讀規則出處：公路車專案 knowledge/coach_renewal_20261109/29_app_ridebridge.md §4.1；欄位以 phone-agent/hub_fixtures 契約為準。
 * 三種資料來源（用網址參數切）：
 *   預設            示意（內建夾具；?scenario=ok|band_unconfirmed|coach_silent|riding|bridge_down）
 *   ?bridge=local   本機樞紐 http://127.0.0.1:8790/v1/status，每 5 秒輪詢、逾時 2 秒、頁面不可見時暫停
 *   ?bridge=relay   遠端中繼（介面先留，尚未實作）
 * judge() 是純函式，node 也能直接 require 跑（見 tools/test_bridge.js）。
 * 原則：算不出來的不顯示；手環沒有任何讀值能證明「震了」，所以永遠不會是綠；公開倉庫，這裡沒有任何座標或金鑰。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RBBridge = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  /* 門檻：除了標「假設」的兩個，全部沿用現有程式（見 29 §4.1 的門檻來源欄） */
  var T = {
    COACH_DEAD_S: 90,      // COACH_DEAD_SEC
    CONN_OK_S: 5,          // 假設：conn_age 每秒刷新，<=5 視為「連著」（29 §4.1 標為推論）
    HR_OK_S: 60,           // sensor_health.py
    DEAF_S: 5400,          // BRIDGE_DEAF_MIN=90 分
    DEV_OK_S: 15,          // DEV_FIX_MAX_AGE
    TX_RECENT_S: 35,       // preflight.py（wait_s+5）
    BAND_RECENT_S: 600,    // 假設：文件沒給手環 age 門檻，超過 10 分鐘就說「尚未驗證」
    HU_FAIL_RECENT_S: 600, // 假設：車表失敗字樣超過 10 分鐘就不算反證
    STALE_S: 30            // 假設：本機輪詢的回應超過 30 秒就視為過舊
  };
  var COLORS = { green: '#c6ff00', gray: '#bdbdbd', red: '#ff8a5c' };
  var SYM = { green: '✓', gray: '？', red: '✕' };
  var SEP = '　'; // 全形空白：主訊息兩段的分隔

  function num(v) { return typeof v === 'number' && isFinite(v); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function fmtAge(s) {
    if (!num(s)) return '';
    if (s < 0) s = 0;
    if (s < 60) return Math.round(s) + ' 秒';
    if (s < 3600) return Math.floor(s / 60) + ' 分鐘';
    return Math.floor(s / 3600) + ' 小時';
  }
  function mk(level, label, ageText) { return { level: level, label: label, ageText: ageText || '' }; }

  var BRIDGE_ERR = {
    connect_refused: '樞紐連不上 RideBridge（8787 拒絕連線）：RideBridge App 可能沒開，請先打開它。',
    timeout: '樞紐讀 RideBridge 逾時：RideBridge 可能卡住了。'
  };

  function downResult(detail, st, main) {
    var g = function () { return mk('gray', '不確定', ''); };
    var m = main || '讀不到橋接';
    return {
      main: m, mainLines: [m], level: 'gray', detail: detail || '', canPocket: false,
      riding: !!(st && st.riding === true), minimal: !!(st && st.riding === true), stale: main === '資料過舊', loading: main === '讀取中…',
      items: { coach: g(), sensor: g(), band: g(), headunit: g() },
      cadence: mk('gray', '不確定', ''),
      ride: { title: m, level: 'gray', sub: detail || '' },
      turn: { lab: '先確認', msg: m, level: 'gray', sub: detail || '', needAct: false }
    };
  }

  /** 把 /v1/status 的內容讀成判讀物件。st=null 表示根本沒拿到；opts.nowS（秒）有給才做「過舊」判斷。 */
  function judge(st, opts) {
    opts = opts || {};
    if (!st || typeof st !== 'object') return downResult(opts.error || '沒有拿到樞紐回應。', null, opts.loading ? '讀取中…' : undefined);
    if (st.schema !== 1) return downResult('樞紐回應格式不對（schema 不是 1），這個頁面讀不了。', st);

    var drift = (num(opts.nowS) && num(st.t)) ? Math.max(0, opts.nowS - st.t) : 0;
    if (drift > T.STALE_S) {
      return downResult('最後一筆資料已經是 ' + fmtAge(drift) + '前，過舊，不顯示數字。', st, '資料過舊');
    }
    var age = function (v) { return num(v) ? v + drift : null; };

    var br = st.bridge || {};
    var h = (br.ok === true && br.health && typeof br.health === 'object') ? br.health : null;
    if (!h) {
      var why = br.error && BRIDGE_ERR[br.error] ? BRIDGE_ERR[br.error]
        : (br.error ? '樞紐讀不到 RideBridge（' + br.error + '）。' : '樞紐讀不到 RideBridge。');
      return downResult(why, st);
    }

    /* 教練 */
    var coach;
    var silent = h.coach && num(h.coach.silent_s) ? h.coach.silent_s : null;
    var pidAlive = st.coach ? st.coach.pid_alive : undefined;
    if (silent === null) coach = mk('gray', '不確定', '沒有教練資料');
    else if (silent < 0) coach = mk('red', '沒回應', '教練從沒來過');
    else if (silent + drift > T.COACH_DEAD_S) coach = mk('red', '沒回應', '已靜默 ' + fmtAge(silent + drift));
    else if (pidAlive === false) coach = mk('gray', '不確定', '行程不在，卻剛有動靜（矛盾）');
    else coach = mk('green', '在線', fmtAge(silent + drift) + '前有回應');

    /* 感測器 */
    var sensor;
    var sn = h.sensors;
    var conn = sn ? age(sn.conn_age) : null;
    var hr = sn ? age(sn.hr_age) : null;
    if (!sn || conn === null) sensor = mk('gray', '不確定', '感測器沒連過');
    else if (conn > T.DEAF_S) sensor = mk('red', '橋接沒反應', '感測器 ' + fmtAge(conn) + '沒資料');
    else if (conn <= T.CONN_OK_S && hr !== null && hr < T.HR_OK_S) sensor = mk('green', '已連線', '心率 ' + fmtAge(hr) + '前');
    else if (conn <= T.CONN_OK_S) sensor = mk('gray', '不確定', '連著，但心率資料過舊或沒有');
    else sensor = mk('gray', '不確定', '連線資料過舊');

    /* 手環：沒有任何讀值能證明「震了」，所以沒有綠；紅只能來自人說沒震 */
    var band;
    var bt = h.band ? age(h.band.tx_age) : null;
    if (bt !== null && bt <= T.BAND_RECENT_S) band = mk('gray', '請確認', Math.round(bt) + ' 秒前送出，你有感覺到嗎？');
    else band = mk('gray', '尚未驗證', '');

    /* 車表 */
    var hu = h.headunit || {};
    var txs = typeof hu.tx === 'string' ? hu.tx : '';
    var txAge = age(hu.tx_age);
    var devAge = age(hu.dev_age);
    var headunit;
    if (/逾時，斷開|找不到已配對/.test(txs) && txAge !== null && txAge <= T.HU_FAIL_RECENT_S) {
      headunit = mk('red', '送出失敗', txs);
    } else if (devAge !== null && devAge < T.DEV_OK_S && num(hu.dev_n) && hu.dev_n > 0) {
      headunit = mk('green', '有收到遙測', '車表遙測 ' + fmtAge(devAge) + '前');
    } else if (/送第\s*\d+\s*\/\s*\d+\s*段/.test(txs) && txAge !== null && txAge < T.TX_RECENT_S) {
      headunit = mk('gray', '請確認', '剛送出（' + fmtAge(txAge) + '前），不代表已顯示');
    } else if (!num(hu.dev_n) || hu.dev_n === 0 || devAge === null) {
      headunit = mk('gray', '請確認', '沒收到車表遙測（可能休眠或沒開）');
    } else {
      headunit = mk('gray', '請確認', '遙測資料過舊');
    }

    /* 踏頻器（今天頁用） */
    var cad = sn ? age(sn.cad_age) : null;
    var cadence;
    if (cad === null) cadence = mk('gray', '待喚醒', '出門前轉一下曲柄');
    else if (cad < T.HR_OK_S) cadence = mk('green', '有資料', fmtAge(cad) + '前');
    else cadence = mk('gray', '資料過舊', '');

    var items = { coach: coach, sensor: sensor, band: band, headunit: headunit };
    var riding = st.riding === true;
    var out = {
      riding: riding, minimal: riding, stale: false, canPocket: false,
      items: items, cadence: cadence, detail: ''
    };

    /* 主訊息 */
    var main, level, detail = '';
    var coachTitle = coach.level === 'green' ? '教練在線' : coach.level === 'red' ? '教練沒回應' : '教練不確定';
    if (riding) {
      main = coachTitle; level = coach.level; // 騎乘中只留最小資訊
    } else if (coach.level === 'red') {
      main = '教練沒回應'; level = 'red';
      detail = (pidAlive === false ? '教練行程不在，' : '教練行程還在，可能卡住，') + coach.ageText + '。先叫醒教練。';
    } else if (sensor.level === 'red') {
      main = '感測器橋接沒反應'; level = 'red'; detail = sensor.ageText + '。重開 RideBridge。';
    } else if (headunit.level === 'red') {
      main = '車表送出失敗'; level = 'red'; detail = '先叫醒車表，再震一下確認。';
    } else if (coach.level !== 'green' || sensor.level !== 'green') {
      main = '教練或感測器還不能確定'; level = 'gray';
      detail = '教練：' + coach.ageText + '；感測器：' + sensor.ageText + '。';
    } else {
      main = '教練與感測器正常' + SEP + (headunit.level === 'green' ? '手環請確認' : '手環與車表請確認');
      level = 'green'; out.canPocket = true;
      detail = '手環沒有讀值能證明，請震一下確認。';
    }
    out.main = main; out.mainLines = main.split(SEP); out.level = level; out.detail = riding ? '' : detail;

    /* 路上·騎乘中 */
    out.ride = {
      title: coachTitle, level: coach.level,
      sub: riding ? '' : (hu.tx_age === null || !num(hu.tx_age) ? '車表還沒推送' : '車表最後推送 ' + fmtAge(txAge) + '前')
    };

    /* 路上·折返點：回程那一句是教練內容，樞紐給不了，所以不放數字 */
    var sub = '回程建議請看車表／語音';
    if (riding) out.turn = { lab: '回程', msg: coachTitle, level: coach.level, sub: '', needAct: false };
    else if (coach.level === 'red') out.turn = { lab: '先處理', msg: '教練沒回應', level: 'red', sub: '回程建議可能不會來；先叫醒教練', needAct: true };
    else if (headunit.level === 'red') out.turn = { lab: '先處理', msg: '車表送出失敗', level: 'red', sub: '回程建議請看語音；先叫醒車表', needAct: true };
    else if (coach.level === 'green' && headunit.level === 'green') out.turn = { lab: '回程', msg: '教練與車表\n在線', level: 'green', sub: sub, needAct: false };
    else out.turn = { lab: '先確認', msg: coach.level === 'green' ? '教練在線\n車表請確認' : '教練還不能確定', level: 'gray', sub: sub, needAct: true };
    return out;
  }

  /* ---------- 讀取：錯誤要說人話，不吞 ---------- */
  function bridgeError(code, human) { var e = new Error(human); e.code = code; e.human = human; return e; }

  function classifyError(e, url, timeoutMs) {
    if (e && e.code && e.human) return e;
    var where = url || '本機樞紐';
    if (e && e.name === 'AbortError') {
      return bridgeError('timeout', '樞紐 ' + Math.round((timeoutMs || 2000) / 1000) + ' 秒內沒回應。請確認手機上的樞紐有在跑，而且這個頁面是開在同一支手機上。');
    }
    if (e && e.name === 'SyntaxError') {
      return bridgeError('badjson', '樞紐回的不是 JSON，可能是別的程式占了這個埠。');
    }
    if (e && e.name === 'TypeError') { // 連不上、被瀏覽器擋（含 Chrome 本機網路權限被拒）都是 TypeError，瀏覽器不告訴我們是哪一種
      return bridgeError('blocked', '連不到 ' + where + '。可能是樞紐沒啟動，或瀏覽器擋了「存取本機網路」：' +
        '若有跳出詢問請按允許，或到網站設定把本機網路存取改成允許，再重新整理。');
    }
    return bridgeError('unknown', '讀取失敗：' + (e && e.message ? e.message : String(e)));
  }

  /** 讀一次 /v1/status；fetchImpl 可注入（測試用）。 */
  function fetchStatus(url, timeoutMs, fetchImpl) {
    var f = fetchImpl || (root.fetch && root.fetch.bind(root));
    if (!f) return Promise.reject(bridgeError('nofetch', '這個瀏覽器不支援 fetch。'));
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    return new Promise(function (resolve, reject) {
      var done = false, timer = setTimeout(function () {
        if (done) return; done = true;
        if (ctl) { try { ctl.abort(); } catch (e) {} }
        reject(classifyError({ name: 'AbortError' }, url, timeoutMs));
      }, timeoutMs);
      var finish = function (fn, v) { if (done) return; done = true; clearTimeout(timer); fn(v); };
      var p;
      try { p = f(url, { cache: 'no-store', credentials: 'omit', signal: ctl ? ctl.signal : undefined }); }
      catch (e) { finish(reject, classifyError(e, url, timeoutMs)); return; }
      p.then(function (r) {
        if (!r.ok) throw bridgeError('http', '樞紐回應 HTTP ' + r.status + '，這個網址可能不是樞紐。');
        return r.json();
      }).then(function (j) { finish(resolve, j); }, function (e) { finish(reject, classifyError(e, url, timeoutMs)); });
    });
  }

  var LOCAL_URL = 'http://127.0.0.1:8790/v1/status';
  var SCENARIOS = ['ok', 'band_unconfirmed', 'coach_silent', 'riding', 'bridge_down'];

  var providers = {
    demo: function (o) {
      var fx = o.fixtures || root.BRIDGE_FIXTURES || {};
      var sc = SCENARIOS.indexOf(o.scenario) >= 0 && fx[o.scenario] ? o.scenario : 'ok';
      return {
        name: 'demo', poll: false, scenario: sc, scenarioNote: sc !== o.scenario ? '（沒有「' + o.scenario + '」這個情境，改用 ok）' : '',
        fetch: function () { return Promise.resolve(fx[sc] ? clone(fx[sc]) : null); }
      };
    },
    local: function (o) {
      var url = o.url || LOCAL_URL, tmo = o.timeoutMs || 2000;
      return { name: 'local', poll: true, intervalMs: o.intervalMs || 5000, fetch: function () { return fetchStatus(url, tmo, o.fetchImpl); } };
    },
    relay: function () {
      return { name: 'relay', poll: false, fetch: function () { return Promise.reject(bridgeError('not_implemented', '遠端中繼（relay）尚未實作，請改用示意或本機。')); } };
    }
  };

  /* ---------- 畫面綁定 ---------- */
  function renderLines(el, lines, color, mode) {
    el.textContent = '';
    lines.forEach(function (ln, i) {
      if (i) el.appendChild(root.document.createElement('br'));
      var sp = root.document.createElement('span');
      sp.textContent = ln;
      sp.style.color = (mode === 'tail' && i === 0 && lines.length > 1) ? '#ffffff' : color;
      el.appendChild(sp);
    });
    el.style.color = color;
  }

  function renderRow(el, it) {
    el.textContent = '';
    el.style.color = COLORS[it.level];
    el.style.textAlign = 'right';
    el.style.whiteSpace = 'nowrap';
    el.appendChild(root.document.createTextNode(SYM[it.level] + ' ' + it.label));
    // 時間說明放在左邊項目名稱底下（省一行高度，一屏看得完）
    var lab = el.previousElementSibling;
    if (lab) {
      var old = lab.querySelector('.rb-age'); if (old) old.remove();
      if (it.ageText) {
        var s = root.document.createElement('span');
        s.className = 'rb-age';
        s.textContent = it.ageText;
        s.style.cssText = 'display:block;font-size:20px;font-weight:500;color:#bdbdbd;line-height:1.25';
        lab.appendChild(s);
      }
    }
  }

  function bindPage(R, ctx) {
    var d = root.document;
    var q = function (k) { return d.querySelector('[data-b="' + k + '"]'); };
    var show = function (el, on, disp) { if (el) el.style.display = on ? (disp || '') : 'none'; };
    var m;

    if ((m = q('main'))) {
      renderLines(m, R.mainLines, COLORS[R.level], 'all');
      if (R.level === 'red' && ctx.lastMainKey !== R.main) { // 異常強調：CSS 只播 3 次，換了訊息才重播
        m.classList.remove('m-pulse'); void m.offsetWidth; m.classList.add('m-pulse');
      } else if (R.level !== 'red') m.classList.remove('m-pulse');
      ctx.lastMainKey = R.main;
    }
    if ((m = q('detail'))) { m.textContent = R.detail; show(m, !!R.detail && !R.minimal); }
    ['coach', 'sensor', 'band', 'headunit'].forEach(function (k) { var el = q('row-' + k); if (el) renderRow(el, R.items[k]); });
    if ((m = q('details'))) {
      var attention = ['coach', 'sensor', 'headunit'].some(function (k) { return R.items[k].level !== 'green'; });
      if (attention) m.open = true;
    }
    if ((m = q('ride-title'))) { m.textContent = R.ride.title; m.style.color = COLORS[R.ride.level]; }
    if ((m = q('ride-sub'))) { m.textContent = R.ride.sub; show(m, !!R.ride.sub); }
    if ((m = q('turn-lab'))) m.textContent = R.turn.lab;
    if ((m = q('turn-msg'))) renderLines(m, R.turn.msg.split('\n'), COLORS[R.turn.level], 'tail');
    if ((m = q('turn-sub'))) { m.textContent = R.turn.sub; show(m, !!R.turn.sub); }
    if ((m = q('turn-act'))) show(m, R.turn.needAct && !R.minimal, 'flex');
    if ((m = q('home-strip'))) {
      var l1 = R.loading ? '橋接：讀取中' : R.stale ? '橋接：資料過舊' : R.main === '讀不到橋接' ? '橋接：讀不到' : R.riding ? '騎乘中 · ' + R.ride.title : '橋接：連著';
      m.textContent = '';
      var a = d.createElement('span'); a.textContent = l1; a.style.color = COLORS[R.level === 'green' ? 'green' : R.level];
      m.appendChild(a);
      if (!R.minimal) {
        m.appendChild(d.createElement('br'));
        var b = d.createElement('span'); b.textContent = '踏頻器：' + R.cadence.label + (R.cadence.ageText ? '（' + R.cadence.ageText + '）' : '');
        b.style.color = COLORS[R.cadence.level];
        m.appendChild(b);
      }
    }
    var full = d.querySelectorAll('[data-b-full]');
    for (var i = 0; i < full.length; i++) show(full[i], !R.minimal, full[i].getAttribute('data-b-display') || '');
    if ((m = q('source'))) m.textContent = (m.getAttribute('data-b-prefix') || '') + ctx.sourceText;
  }

  function hhmmss(d) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  /** 啟動（頁面載入後呼叫）。沒有 data-b 元素的頁面什麼都不做，也不會去連樞紐。 */
  function start(opts) {
    var d = root.document;
    if (!d || !d.querySelectorAll('[data-b]').length) return null;
    opts = opts || {};
    var qs = new URLSearchParams(root.location ? root.location.search : '');
    var mode = qs.get('bridge') || 'demo';
    var note = '';
    if (!providers[mode]) { note = '（不認得 bridge=' + mode + '，改用示意）'; mode = 'demo'; }
    var prov = providers[mode]({ scenario: qs.get('scenario') || 'ok', fixtures: opts.fixtures, fetchImpl: opts.fetchImpl, url: opts.url });
    var ctx = { sourceText: '', lastMainKey: null };
    var label = mode === 'demo' ? '示意' : mode === 'local' ? '本機樞紐' : '遠端中繼';

    // 把來源參數帶進站內連結，換頁不會掉回示意
    var carry = new URLSearchParams();
    if (qs.get('bridge')) carry.set('bridge', qs.get('bridge'));
    if (qs.get('scenario')) carry.set('scenario', qs.get('scenario'));
    var cs = carry.toString();
    if (cs) {
      [].forEach.call(d.querySelectorAll('a[href]'), function (a) {
        var h = a.getAttribute('href');
        if (/^[A-Za-z_]+\.html$/.test(h)) a.setAttribute('href', h + '?' + cs);
      });
    }
    // 「震一下」目前沒有接線：不能說「已送出」
    [].forEach.call(d.querySelectorAll('[data-b="ok"]'), function (el) {
      el.textContent = mode === 'demo' ? '示意：不會真的震動手環' : '這個頁面目前只讀狀態，這顆鈕還沒接上，不會震動手環';
    });

    var timer = null, inflight = false, stopped = false;
    function paint(R, srcText) { ctx.sourceText = srcText; bindPage(R, ctx); }
    paint(judge(null, { loading: true }), '資料來源：' + label + ' · 讀取中…' + note);

    function tick() {
      if (stopped || inflight) return;
      inflight = true;
      prov.fetch().then(function (st) {
        var R = judge(st, { nowS: prov.name === 'local' ? Date.now() / 1000 : undefined });
        paint(R, '資料來源：' + label + (prov.scenario ? '（情境 ' + prov.scenario + '）' : '') + (prov.scenarioNote || '') +
          (prov.name === 'local' ? ' · 更新於 ' + hhmmss(new Date()) : '') + note);
      }, function (e) {
        var human = e && e.human ? e.human : '讀取失敗：' + (e && e.message ? e.message : e);
        paint(judge(null, { error: human }), '資料來源：' + label + ' · 讀取失敗 ' + hhmmss(new Date()) + note);
      }).then(function () {
        inflight = false;
        if (prov.poll && !stopped && !d.hidden) timer = setTimeout(tick, prov.intervalMs);
      });
    }
    if (prov.poll) {
      d.addEventListener('visibilitychange', function () {
        if (d.hidden) { clearTimeout(timer); timer = null; }
        else if (!timer && !inflight) tick();
        else if (!inflight) { clearTimeout(timer); tick(); }
      });
    }
    tick();
    return { stop: function () { stopped = true; clearTimeout(timer); } };
  }

  if (root.document && root.document.addEventListener) {
    var go = function () { try { start(); } catch (e) { if (root.console) root.console.error('bridge.js', e); } };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', go); else go();
  }

  return { judge: judge, fmtAge: fmtAge, fetchStatus: fetchStatus, classifyError: classifyError, providers: providers, start: start, SCENARIOS: SCENARIOS, T: T, LOCAL_URL: LOCAL_URL };
});
