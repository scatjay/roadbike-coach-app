/* 左右滑動切換分頁（手寫檔）。順序＝底部導覽＋出發流程：今天→出發點→騎乘中→折返點→騎後→問教練。
 * 規則：水平位移 ≥70px 且明顯大於垂直位移才算；從螢幕邊緣 24px 內開始的不算（避免和 Android 返回手勢打架）；
 * 在輸入框、可橫向捲動的區塊上不觸發；保留網址參數（?scenario=、?bridge=）；只換頁，不動畫、不記錄任何資料。 */
(function () {
  var ORDER = ['index.html', 'start.html', 'ride.html', 'turn.html', 'post.html', 'coach.html'];
  var cur = (location.pathname.split('/').pop() || 'index.html');
  var i = ORDER.indexOf(cur);
  if (i < 0) return;
  var x0, y0, t0, ok = false;
  function blocked(el) {
    for (; el && el !== document.body; el = el.parentNode) {
      var tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.scrollWidth > el.clientWidth + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowX)) return true;
    }
    return false;
  }
  document.addEventListener('touchstart', function (e) {
    var t = e.changedTouches[0];
    ok = e.touches.length === 1 && t.clientX > 24 && t.clientX < innerWidth - 24 && !blocked(e.target);
    x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!ok) return; ok = false;
    var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8 || Date.now() - t0 > 700) return;
    var j = i + (dx < 0 ? 1 : -1);
    if (j < 0 || j >= ORDER.length) return;
    location.href = ORDER[j] + location.search;
  }, { passive: true });
})();
