/* 數字計數（count-up）。只處理 class="m-count" 的元素，最終值就是 HTML 裡原本的文字。
 * 規則：偏好減少動態就什麼都不做；登入閘門（html.locked）解鎖後才開始；頁面隱藏時不排程、直接顯示最終值；
 * 時長 600ms、只跑一次；任何例外都退回最終值。不使用任何函式庫。 */
(function () {
  'use strict';
  var els = [].slice.call(document.querySelectorAll('.m-count'));
  if (!els.length) return;
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduce || !window.requestAnimationFrame) return;

  var DUR = 600;
  var items = els.map(function (el) {
    var final = el.textContent.trim();
    var m = /^(\d+)(?:\.(\d+))?$/.exec(final);
    if (!m) return null;
    return { el: el, final: final, target: parseFloat(final), dec: m[2] ? m[2].length : 0 };
  }).filter(Boolean);
  if (!items.length) return;

  function restore() { items.forEach(function (it) { it.el.textContent = it.final; }); }
  function fmt(it, v) { return v.toFixed(it.dec); }

  // 先鎖寬度再改成起始值（避免數字寬度變動時推擠版面）；此時頁面仍被登入閘門遮住，看不到跳動
  try {
    items.forEach(function (it) {
      it.el.style.display = 'inline-block';
      it.el.style.minWidth = it.el.offsetWidth + 'px';
      it.start = Math.round(it.target * 0.6);
      it.el.textContent = fmt(it, it.start);
    });
  } catch (e) { restore(); return; }

  var started = false;
  function go() {
    if (started) return;
    if (document.documentElement.classList.contains('locked')) return;
    if (document.hidden) return;
    started = true;
    var t0 = null;
    function frame(t) {
      try {
        if (document.hidden) { restore(); return; }
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / DUR), e = 1 - Math.pow(1 - p, 3);
        items.forEach(function (it) { it.el.textContent = p >= 1 ? it.final : fmt(it, it.start + (it.target - it.start) * e); });
        if (p < 1) requestAnimationFrame(frame);
      } catch (err) { restore(); }
    }
    requestAnimationFrame(frame);
  }

  if (!document.documentElement.classList.contains('locked') && !document.hidden) { go(); return; }
  if (window.MutationObserver) {
    var mo = new MutationObserver(function () { go(); if (started) mo.disconnect(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  document.addEventListener('visibilitychange', function () { go(); });
  // 保險：最久 10 秒後若還沒開始（例如一直被隱藏），確保顯示最終值
  setTimeout(function () { if (!started) { started = true; restore(); } }, 10000);
})();
