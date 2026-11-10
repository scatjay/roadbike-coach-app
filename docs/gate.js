/* 登入閘門：Google 登入（Firebase Auth）＋白名單 email。
 * 沿用文化遊戲松後台的做法（見 課程管理與備課/CLAUDE.md「Firebase Auth」一節）：
 *   - 彈窗優先，被擋或被關才退回轉頁（手機 Chrome 只走轉頁會「登入完還是登入畫面」，2026-10-28 實測）
 *   - 錯誤訊息一律顯示，絕不吞掉
 * ⚠ 這是前端閘門：網頁檔本身在公開倉庫，擋得住隨手點進來的人，擋不住會看原始碼的人。
 *   所以公開倉庫裡只能放示意資料；真實騎乘資料要放在受 Firebase 規則保護的資料庫，登入後才讀。
 * Firebase 網頁設定（apiKey 等）是公開識別碼，不是密碼，本來就會出現在網頁原始碼裡。 */
(function () {
  var ALLOW = ['scatjay@gmail.com'];
  var CFG = {
    apiKey: 'AIzaSyBwPR0oE5VK0eBlqq8JY1B56UXy3R9cyng',
    authDomain: 'gen-lang-client-0929530380.firebaseapp.com',
    projectId: 'gen-lang-client-0929530380'
  };
  var root = document.documentElement;

  function el(html) {
    var d = document.createElement('div');
    d.id = 'gate';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0b0b0c;color:#fff;' +
      "font-family:'Noto Sans TC',system-ui,sans-serif;display:flex;flex-direction:column;" +
      'justify-content:center;gap:18px;padding:28px 24px;box-sizing:border-box;max-width:430px;margin:0 auto';
    d.innerHTML = html;
    return d;
  }

  var gate = el(
    '<div style="width:56px;height:8px;background:#c6ff00;transform:skewX(-20deg)"></div>' +
    "<div style=\"font-family:'Barlow Condensed','Noto Sans TC',system-ui,sans-serif;font-weight:800;font-style:italic;font-size:64px;line-height:1\">公路車教練</div>" +
    '<div style="color:#bdbdbd;font-size:20px">請先登入</div>' +
    '<button id="gLogin" type="button" style="height:64px;border:0;background:#c6ff00;color:#0b0b0c;font-size:26px;font-weight:900;' +
    'font-family:inherit;clip-path:polygon(14px 0,100% 0,calc(100% - 14px) 100%,0 100%)">用 Google 登入</button>' +
    '<div id="gMsg" role="status" style="font-size:18px;line-height:1.6;color:#ffd0c0;min-height:56px"></div>'
  );

  function say(html) { var m = document.getElementById('gMsg'); if (m) m.innerHTML = html; }
  function showGate() {
    if (!document.getElementById('gate')) document.body.appendChild(gate);
    root.classList.add('locked');
  }
  function unlock() {
    var g = document.getElementById('gate'); if (g) g.remove();
    root.classList.remove('locked');
  }

  function ready() {
    if (!window.firebase || !firebase.auth) {
      showGate();
      say('載不到登入元件，請確認網路後重新整理。');
      return;
    }
    firebase.initializeApp(CFG);
    var auth = firebase.auth();

    // 登出鈕：登入後固定在右上角（每頁都有）。
    // 登入狀態是整個 scatjay.github.io 共用的（含文化遊戲松後台），所以這裡一定要能登出。
    function addLogout(email) {
      if (document.getElementById('gOut')) return;
      var b = document.createElement('button');
      b.id = 'gOut'; b.type = 'button';
      b.title = '目前登入：' + email;
      b.textContent = '登出';
      b.style.cssText = 'position:fixed;top:6px;right:6px;z-index:99998;min-width:56px;height:44px;padding:0 12px;' +
        "border:2px solid #bdbdbd;background:rgba(11,11,12,.85);color:#bdbdbd;font-size:16px;font-weight:700;font-family:'Noto Sans TC',system-ui,sans-serif";
      b.addEventListener('click', function () {
        b.disabled = true;
        auth.signOut().catch(function (err) { b.disabled = false; explain(err); });
      });
      document.body.appendChild(b);
    }
    function removeLogout() { var b = document.getElementById('gOut'); if (b) b.remove(); }

    function accept(user) {
      var email = ((user && user.email) || '').toLowerCase();
      if (ALLOW.indexOf(email) >= 0) { unlock(); addLogout(email); return true; }
      try { auth.signOut(); } catch (e) {}
      showGate();
      say('這個帳號（' + email + '）不在名單內。要加人請改 docs/gate.js 的 ALLOW。');
      return false;
    }

    function explain(err) {
      var c = (err && err.code) || '';
      showGate();
      if (c === 'auth/unauthorized-domain') {
        say('🔴 這個網域還沒被 Firebase 授權（Authentication → Settings → Authorized domains 加上 ' + location.hostname + '）。');
      } else if (c === 'auth/operation-not-allowed') {
        say('🔴 Firebase 專案還沒啟用 Google 登入（Authentication → Sign-in method）。');
      } else {
        say('登入沒完成（' + (c || 'unknown') + '）。請再按一次。');
      }
    }

    function provider() {
      var p = new firebase.auth.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      return p;
    }

    auth.getRedirectResult().catch(explain);          // 轉頁回來的那一次接住結果
    var wasIn = false;
    auth.onAuthStateChanged(function (u) {
      if (u) { wasIn = true; accept(u); return; }
      removeLogout(); showGate();
      if (wasIn) say('已登出。');
      wasIn = false;
    });

    document.addEventListener('click', function (e) {
      if (!e.target || e.target.id !== 'gLogin') return;
      say('開啟 Google 登入視窗…');
      auth.signInWithPopup(provider()).then(function (r) { accept(r.user); }).catch(function (err) {
        var c = (err && err.code) || '';
        if (c === 'auth/popup-blocked' || c === 'auth/popup-closed-by-user' ||
            c === 'auth/cancelled-popup-request' || c === 'auth/operation-not-supported-in-this-environment') {
          say('視窗被擋掉了，改用轉頁登入…');
          auth.signInWithRedirect(provider()).catch(explain);
          return;
        }
        explain(err);
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
