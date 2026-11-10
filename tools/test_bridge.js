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
  console.log(fails ? `\n失敗 ${fails} 項` : '\n全部通過'); process.exit(fails ? 1 : 0);
})();
