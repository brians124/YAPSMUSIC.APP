/* YAPS page guard. Add as the FIRST script in <head> of a page that only some account types may open:
     <script src="yaps-guard.js" data-allow="producer"></script>
   Anyone else is sent back to index.html. Works the same for yaps-ai.html etc. with their own data-allow. */
(function () {
  var s = document.currentScript, allow = (s && s.getAttribute('data-allow') || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  var URL_ = 'https://wnpqikufnwyiivrqfktk.supabase.co', KEY = 'sb_publishable_1Dc7Ag-ZqsqJsgETEkxi5Q_VcG1w0XJ';
  var st = document.createElement('style'); st.id = 'yg-hide'; st.textContent = 'html{visibility:hidden}'; document.head.appendChild(st);
  function ok() { var e = document.getElementById('yg-hide'); if (e) e.remove(); }
  function no() { location.replace('index.html'); }
  function cached() { try { return localStorage.getItem('yaps_role_cache'); } catch (e) { return null; } }
  var tok = null, uid = null;
  try { var k = Object.keys(localStorage).filter(function (x) { return /^sb-.*-auth-token$/.test(x); })[0];
    if (k) { var j = JSON.parse(localStorage.getItem(k)); tok = j && (j.access_token || (j.currentSession && j.currentSession.access_token)); uid = j && ((j.user && j.user.id) || (j.currentSession && j.currentSession.user && j.currentSession.user.id)); } } catch (e) {}
  if (!tok || !uid) return no();                       // not signed in
  var h = { apikey: KEY, Authorization: 'Bearer ' + tok };
  fetch(URL_ + '/rest/v1/yaps_profiles?id=eq.' + encodeURIComponent(uid) + '&select=account_type', { headers: h })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (rows) {
      var t = rows && rows[0] && rows[0].account_type || 'listener';
      try { localStorage.setItem('yaps_role_cache', t); } catch (e) {}
      if (allow.indexOf(t) >= 0) return ok();
      // the app owner may open everything
      return fetch(URL_ + '/rest/v1/app_owners?select=user_id&user_id=eq.' + encodeURIComponent(uid), { headers: h })
        .then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
        .then(function (o) { (o && o.length) ? ok() : no(); });
    })
    .catch(function () { var c = cached(); (c && allow.indexOf(c) >= 0) ? ok() : no(); });   // offline: trust the last known role
})();
