// 判讀邏輯測試：node tools/test_bridge.js   （不用瀏覽器；純函式 judge + 注入假 fetch 測錯誤處理）
'use strict';
const fs = require('fs'), path = require('path');
const B = require('../docs/bridge.js');
const FX = require('../docs/bridge_fixtures.js');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL ' + m); } else console.log('  ok   ' + m); };
const clone = o => JSON.parse(JSON.stringify(o));
const line = R => ['coach', 'sensor', 'band', 'headunit'].map(k => k + '=' + R.items[k].level).join(' ');

console.log('== 夾具一致：docs/fixtures/*.json 與 bridge_fixtures.js 相同');
for (const sc of B.SCENARIOS) {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'fixtures', 'status_' + sc + '.json'), 'utf8'));
  ok(JSON.stringify(j) === JSON.stringify(FX[sc]), sc);
}

console.log('\n== 五個情境（主訊息 / 四項燈號）');
const R = {};
for (const sc of B.SCENARIOS) {
  R[sc] = B.judge(FX[sc]);
  console.log(`[${sc}]\n  主訊息: ${R[sc].main}\n  燈號: ${line(R[sc])}\n  minimal=${R[sc].minimal} canPocket=${R[sc].canPocket}\n  detail: ${R[sc].detail}`);
  console.log(`  ageText: coach="${R[sc].items.coach.ageText}" sensor="${R[sc].items.sensor.ageText}" band="${R[sc].items.band.ageText}" headunit="${R[sc].items.headunit.ageText}"`);
  console.log(`  ride: ${R[sc].ride.title} / ${R[sc].ride.sub}   turn: ${R[sc].turn.lab} / ${R[sc].turn.msg.replace('\n', ' ')} / ${R[sc].turn.sub}`);
}

console.log('\n== 情境斷言');
ok(R.ok.main === '教練與感測器正常　手環請確認', 'ok 主訊息');
ok(line(R.ok) === 'coach=green sensor=green band=gray headunit=green', 'ok 燈號');
ok(R.ok.canPocket === true, 'ok 可以收進口袋');
ok(R.band_unconfirmed.items.band.level === 'gray' && /280 秒前送出/.test(R.band_unconfirmed.items.band.ageText), 'band_unconfirmed 手環維持灰且說 280 秒前送出');
ok(R.coach_silent.items.coach.level === 'red' && R.coach_silent.level === 'red' && !R.coach_silent.canPocket, 'coach_silent 教練紅、不能收口袋');
ok(R.riding.minimal === true && R.riding.main === '教練在線' && R.riding.detail === '' && R.riding.ride.sub === '', 'riding 只剩最小資訊');
ok(line(R.bridge_down) === 'coach=gray sensor=gray band=gray headunit=gray' && R.bridge_down.main === '讀不到橋接', 'bridge_down 四項全灰、讀不到橋接');
ok(!/\d/.test(['coach', 'sensor', 'band', 'headunit'].map(k => R.bridge_down.items[k].ageText).join('')) && !/\d/.test(R.bridge_down.ride.sub.replace(/8787|8790/g, '')), 'bridge_down 不顯示任何數字');
ok(B.SCENARIOS.every(s => !/全綠/.test(JSON.stringify(R[s]))), '任何情境都不出現「全綠」');

console.log('\n== 換一個值，結果要跟著變（對照 ok 夾具）');
const mut = (fn) => { const s = clone(FX.ok); fn(s); return B.judge(s); };
let r;
r = mut(s => s.bridge.health.coach.silent_s = 400); ok(r.items.coach.level === 'red' && r.main === '教練沒回應', 'silent_s 12→400：教練變紅');
r = mut(s => s.bridge.health.coach.silent_s = 90); ok(r.items.coach.level === 'green', 'silent_s=90 邊界：仍綠');
r = mut(s => s.bridge.health.coach.silent_s = 91); ok(r.items.coach.level === 'red', 'silent_s=91：紅');
r = mut(s => s.bridge.health.coach.silent_s = -1); ok(r.items.coach.level === 'red' && /從沒來過/.test(r.items.coach.ageText), 'silent_s=-1：紅（從沒來過）');
r = mut(s => s.bridge.health.coach.silent_s = null); ok(r.items.coach.level === 'gray', 'silent_s=null：灰（不是 0）');
r = mut(s => s.coach.pid_alive = false); ok(r.items.coach.level === 'gray', '行程不在卻剛有動靜：灰（矛盾不當綠）');
r = mut(s => s.bridge.health.sensors.hr_age = 61); ok(r.items.sensor.level === 'gray' && r.canPocket === false, 'hr_age=61：感測器灰、不能收口袋');
r = mut(s => s.bridge.health.sensors.hr_age = null); ok(r.items.sensor.level === 'gray', 'hr_age=null：灰');
r = mut(s => s.bridge.health.sensors.conn_age = 6000); ok(r.items.sensor.level === 'red', 'conn_age=6000：紅（橋接聾了）');
r = mut(s => s.bridge.health.sensors.conn_age = 100); ok(r.items.sensor.level === 'gray', 'conn_age=100：灰');
r = mut(s => s.bridge.health.sensors.conn_age = null); ok(r.items.sensor.level === 'gray', 'conn_age=null：灰');
r = mut(s => s.bridge.health.headunit.dev_age = 20); ok(r.items.headunit.level === 'gray' && r.main === '教練與感測器正常　手環與車表請確認', 'dev_age=20：車表灰，主訊息改成手環與車表請確認');
r = mut(s => { s.bridge.health.headunit.dev_age = null; s.bridge.health.headunit.dev_n = 0; }); ok(r.items.headunit.level === 'gray', 'dev_n=0：車表灰');
r = mut(s => { s.bridge.health.headunit.dev_age = 20; s.bridge.health.headunit.tx_age = 10; }); ok(r.items.headunit.level === 'gray' && /不代表已顯示/.test(r.items.headunit.ageText), '只有剛送出（弱證據）：灰且說不代表已顯示');
r = mut(s => s.bridge.health.headunit.tx = '逾時，斷開'); ok(r.items.headunit.level === 'red' && r.main === '車表送出失敗', 'tx=逾時，斷開：車表紅');
r = mut(s => s.riding = true); ok(r.minimal && r.main === '教練在線', 'riding false→true：最小資訊');

console.log('\n== 手環永遠不會變綠（掃過各種 tx_age 與 tx）');
let bandNotGray = 0, n = 0;
for (const ta of [null, 0, 0.1, 1, 5, 41, 95, 280, 599, 600, 601, 5000, -3]) for (const tx of [null, 0, 1, 2, 3, 'ok']) {
  const s = clone(FX.ok); s.bridge.health.band = { tx, tx_age: ta }; n++;
  if (B.judge(s).items.band.level !== 'gray') bandNotGray++;
}
ok(bandNotGray === 0, `手環 ${n} 種組合全部是灰`);
r = mut(s => s.bridge.health.band = { tx: 1, tx_age: 0.5 }); ok(r.items.band.level === 'gray' && /秒前送出，你有感覺到嗎？$/.test(r.items.band.ageText), '剛震完（0.5 秒前）也只是灰：' + r.items.band.ageText);
r = mut(s => s.bridge.health.band = { tx: 1, tx_age: 5000 }); ok(r.items.band.label === '尚未驗證' && r.items.band.ageText === '', 'tx_age 很大：尚未驗證，不顯示數字');
r = mut(s => s.bridge.health.band = null); ok(r.items.band.level === 'gray', 'band=null：灰，不報錯');

console.log('\n== 資料過舊與格式不對');
r = B.judge(FX.ok, { nowS: FX.ok.t + 100 }); ok(r.main === '資料過舊' && line(r) === 'coach=gray sensor=gray band=gray headunit=gray' && !/\d/.test(r.items.coach.ageText), '回應已 100 秒前：四項全灰，不顯示數字');
r = B.judge(FX.ok, { nowS: FX.ok.t + 10 }); ok(r.items.coach.level === 'green' && /^22 秒/.test(r.items.coach.ageText), '回應 10 秒前：仍綠且年齡加上 10 秒（' + r.items.coach.ageText + '）');
r = B.judge(Object.assign(clone(FX.ok), { schema: 2 })); ok(r.main === '讀不到橋接' && /schema/.test(r.detail), 'schema≠1：灰');
r = B.judge(null, { error: 'x' }); ok(r.main === '讀不到橋接' && r.detail === 'x', 'null：讀不到橋接');

console.log('\n== 教練改了什麼（/v1/rsi）：夾具一致');
const RX = {};
for (const sc of B.RSI_SCENARIOS) {
  const a = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'fixtures', 'rsi_' + sc + '.json'), 'utf8'));
  const b = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'design_v2', 'fixtures', 'rsi_' + sc + '.json'), 'utf8'));
  ok(JSON.stringify(a) === JSON.stringify(b), 'rsi_' + sc + '.json：docs 與 design_v2 相同');
  ok(!/"(lat|lon|lng|latitude|longitude|token|key|secret)"/i.test(JSON.stringify(a)), 'rsi_' + sc + '.json：沒有座標或金鑰欄位');
  RX[sc] = a;
}
console.log('\n== 教練改了什麼：五種判讀（有資料／空／全部待審／過舊／hub 不通）');
const rs = o => B.judgeRsi(o.d, o.opts);
let q = B.judgeRsi(RX.ok);
console.log('  [ok] ' + q.summary + ' | 項目 ' + q.items.map(i => i.statusLabel + ':' + i.title).join(' / '));
ok(q.state === 'ok' && q.items.length === 4, 'ok：3 筆提案＋1 筆自動分支＝4 項');
ok(q.pending === 2 && q.mergedWeek === 1 && q.summary === '待你審 2 筆 · 本週自動合併 1 筆', 'ok：待審 2（1 提案＋1 分支）、本週自動合併 1：' + q.summary);
ok(q.items[0].status === 'pending' && q.items[1].status === 'pending' && q.items[2].status !== 'pending', '待審排在最前面');
ok(q.items.find(i => i.isBranch).rows.some(r => r[0] === '版本碼' && r[1] === '0123456'), '分支只顯示版本碼前 7 碼');
ok(q.items.find(i => i.status === 'rejected').statusLabel === '被退回' && q.items.find(i => i.status === 'merged').statusLabel === '已合併', '三種狀態文字：待審／已合併／被退回');
ok(q.items.map(i => i.source).sort().join() === '手機 CLI,迴圈,迴圈,迴圈', '來源：1 筆手機 CLI、3 筆迴圈');
ok(q.loopAct.label === '自動改碼：運作中', 'loop_act_off=false → 運作中');
ok(!/spend|用量|candidates/.test(JSON.stringify(q)), 'candidates／spend 是 null：畫面資料裡沒有這兩項');

q = B.judgeRsi(RX.empty);
ok(q.state === 'empty' && q.items.length === 0 && q.summary === '沒有新改動' && /沒有提案/.test(q.notice), '空：沒有新改動，說人話');
q = B.judgeRsi(RX.unavailable);
ok(q.state === 'unavailable' && q.items.length === 0 && !/\d/.test(q.summary) && /讀不到提案清單/.test(q.notice), 'unavailable 夾具（proposals=null）：讀不到，不顯示任何數字');

const allPending = clone(RX.ok); allPending.proposals.forEach(p => p.status = 'pending');
q = B.judgeRsi(allPending);
ok(q.pending === 4 && q.mergedWeek === 0 && q.summary === '待你審 4 筆 · 本週自動合併 0 筆', '全部待審：3 提案＋1 分支＝4；換了狀態，合併數跟著歸 0：' + q.summary);

q = B.judgeRsi(RX.ok, { nowS: RX.ok.t + 500 });
ok(q.state === 'stale' && q.items.length === 0 && q.summary === '資料過舊' && !/\d/.test(q.summary), '過舊（t 之後 500 秒）：不列提案、摘要不含數字');
q = B.judgeRsi(RX.ok, { nowS: RX.ok.t + 60 });
ok(q.state === 'ok' && q.items.length === 4, '60 秒前的資料：仍顯示');
q = B.judgeRsi(RX.ok, { nowS: RX.ok.t + 7200 + 60 + 86400 - 7200 });
console.log('  （一天後的資料被擋：' + q.state + '）');
ok(q.state === 'stale', '一天前的資料：過舊');
q = B.judgeRsi(null, { error: '樞紐 2 秒內沒回應。' });
ok(q.state === 'unavailable' && q.notice === '樞紐 2 秒內沒回應。' && q.items.length === 0 && q.summary === '讀不到改動資料', 'hub 不通：灰色、原因一句話、沒有舊數字');
q = B.judgeRsi(null, { loading: true }); ok(q.summary === '讀取中…', 'loading：讀取中');
q = B.judgeRsi(Object.assign(clone(RX.ok), { schema: 2 })); ok(q.state === 'unavailable' && /schema/.test(q.notice), 'schema≠1：灰');

console.log('\n== 教練改了什麼：換一個值，結果要跟著變（對照 ok 夾具）');
const mr = fn => { const s = clone(RX.ok); fn(s); return B.judgeRsi(s); };
q = mr(s => s.auto_branches = null);
ok(q.pending === 1 && /至少 1 筆/.test(q.summary) && /分支清單讀不到/.test(q.notice) && q.state === 'ok', 'auto_branches=null：待審改說「至少」，並註明分支讀不到（不少算還說得很肯定）');
q = mr(s => { s.proposals = []; s.auto_branches = null; });
ok(q.state === 'ok' && q.summary === '提案清單是空的' && /讀不到/.test(q.notice), '提案空＋分支讀不到：不說「沒有新改動」');
q = mr(s => s.auto_branches = []); ok(q.pending === 1 && q.items.length === 3, 'auto_branches=[]：少 1 筆待審');
q = mr(s => s.proposals[1].age = 8 * 86400); ok(q.mergedWeek === 0, '已合併的提案超過 7 天：不算本週');
q = mr(s => s.proposals[1].age = null); ok(q.mergedWeek === 0 && q.items.find(i => i.id === 'demo-p2').ageText === '時間不明', 'age=null：不算本週，且說時間不明（不是 0）');
q = mr(s => s.proposals[1].kind = 'cli_change'); ok(q.mergedWeek === 0 && q.items.find(i => i.id === 'demo-p2').source === '手機 CLI', '合併的來源改成手機 CLI：不算「自動合併」');
q = mr(s => s.proposals[1].kind = null); ok(q.mergedWeek === 0 && q.items.find(i => i.id === 'demo-p2').source === '來源不明', 'kind=null：來源不明，不猜');
q = mr(s => s.proposals[0].status = 'weird'); ok(q.items.find(i => i.id === 'demo-p3').statusLabel === '狀態不明' && q.pending === 1, '不認得的狀態：狀態不明，不算待審');
q = mr(s => s.proposals[0].summary = null); ok(q.items.find(i => i.id === 'demo-p3').impact === '影響未說明', 'summary=null：影響未說明');
q = mr(s => s.switches.loop_act_off = true); ok(q.loopAct.label === '自動改碼：已關閉', 'loop_act_off=true：已關閉');
q = mr(s => s.switches.loop_act_off = null); ok(q.loopAct.label === '自動改碼：不明', 'loop_act_off=null：不明（不當成運作中）');
q = mr(s => { s.proposals[0].age = 30; }); ok(q.items.find(i => i.id === 'demo-p3').ageText === '30 秒前', 'age 30 → 30 秒前');
q = mr(s => { s.proposals.push(null, 5, 'x'); }); ok(q.items.length === 4, '清單裡混進不是物件的東西：略過，不報錯');
q = mr(s => { s.proposals = {}; }); ok(q.state === 'unavailable', 'proposals 不是陣列：讀不到');
const sameSum = (a, b) => a.summary === b.summary;
ok(!sameSum(B.judgeRsi(RX.ok), B.judgeRsi(allPending)) && !sameSum(B.judgeRsi(RX.ok), B.judgeRsi(RX.empty)), '三種夾具的摘要彼此不同（不是寫死的字串）');

console.log('\n== 錯誤要說人話（注入假 fetch）');
(async () => {
  const get = async (fetchImpl, tmo) => { try { await B.fetchStatus('http://127.0.0.1:8790/v1/status', tmo || 50, fetchImpl); return null; } catch (e) { return e; } };
  let e = await get(() => Promise.reject(new TypeError('Failed to fetch')));
  ok(e && e.code === 'blocked' && /本機網路/.test(e.human) && /127\.0\.0\.1/.test(e.human), 'TypeError（連不上或本機網路權限被拒）→ 一句人話：' + (e && e.human));
  e = await get((u, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' })))), 40);
  ok(e && e.code === 'timeout' && /沒回應/.test(e.human), '逾時（會真的中止請求）→ ' + (e && e.human));
  e = await get(() => new Promise(() => {}), 40); ok(e && e.code === 'timeout', 'fetch 永遠不回也會逾時');
  e = await get(() => Promise.resolve({ ok: false, status: 404, json: async () => ({}) })); ok(e && e.code === 'http' && /404/.test(e.human), 'HTTP 404');
  e = await get(() => Promise.resolve({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } })); ok(e && e.code === 'badjson', '不是 JSON');
  const j = await B.fetchStatus('u', 50, () => Promise.resolve({ ok: true, json: async () => FX.ok })); ok(j.schema === 1, '正常回應可讀');
  const rel = B.providers.relay({}); let re = null; try { await rel.fetch(); } catch (x) { re = x; } ok(re && re.code === 'not_implemented', 'relay：尚未實作');
  const demo = B.providers.demo({ scenario: 'nope' }); ok(demo.scenario === 'ok' && demo.scenarioNote !== '', '未知情境：改用 ok 並註明');
  console.log('\n== 教練改了什麼：讀取來源（注入假 fetch）');
  const seen = [];
  const mkF = body => (u, o) => { seen.push(u); return Promise.resolve({ ok: true, status: 200, json: async () => body }); };
  const dm = B.rsiProviders.demo({ scenario: 'empty', fetchImpl: mkF(RX.empty) });
  const dj = await dm.fetch();
  ok(dm.poll === false && seen[0] === 'fixtures/rsi_empty.json' && dj.proposals.length === 0, 'demo：讀 fixtures/rsi_empty.json，不輪詢');
  const dm2 = B.rsiProviders.demo({ scenario: 'nope', fetchImpl: mkF(RX.ok) }); ok(dm2.scenario === 'ok' && dm2.scenarioNote !== '', '未知 ?rsi= 情境：改用 ok 並註明');
  const lc = B.rsiProviders.local({ fetchImpl: mkF(RX.ok) });
  await lc.fetch();
  ok(lc.poll === true && lc.intervalMs === 15000 && seen[seen.length - 1] === 'http://127.0.0.1:8790/v1/rsi', 'local：打 127.0.0.1:8790/v1/rsi，每 15 秒輪詢');
  const lt = B.rsiProviders.local({ timeoutMs: 40, fetchImpl: () => new Promise(() => {}) });
  let le = null; try { await lt.fetch(); } catch (x) { le = x; } ok(le && le.code === 'timeout', 'local：fetch 不回就逾時（預設 2000 毫秒，這裡改 40）');
  ok(B.rsiProviders.local({}).fetch !== undefined && /127\.0\.0\.1:8790\/v1\/rsi$/.test(B.RSI_LOCAL_URL), 'RSI_LOCAL_URL 正確');
  const lb = B.rsiProviders.local({ fetchImpl: () => Promise.reject(new TypeError('Failed to fetch')) });
  let be = null; try { await lb.fetch(); } catch (x) { be = x; }
  ok(be && be.code === 'blocked' && /本機網路/.test(be.human), 'local 連不上：與 status 同一套人話（' + (be && be.human).slice(0, 18) + '…）');
  q = B.judgeRsi(null, { error: be.human }); ok(q.state === 'unavailable' && q.notice === be.human && q.items.length === 0, '連不上 → 灰色讀不到，不留舊提案');
  const rl = B.rsiProviders.relay({}); let re2 = null; try { await rl.fetch(); } catch (x) { re2 = x; } ok(re2 && re2.code === 'not_implemented', 'rsi relay：尚未實作');

  console.log(fails ? `\n失敗 ${fails} 項` : '\n全部通過'); process.exit(fails ? 1 : 0);
})();
