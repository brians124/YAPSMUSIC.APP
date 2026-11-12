/* ══ YAPS CONNECT — communities + consent-based private chat ═══════════════════════════════
   Self-contained module. Talks to Supabase ONLY through the tables / RPCs created by supabase-connect.sql.
   All privacy and permission rules are enforced by Row Level Security in the database; this file only
   decides what to show. It never touches the audio player, so music keeps playing while you chat. */
(function () {
  'use strict';
  if (window.__yapsConnect) return;
  window.__yapsConnect = true;

  var PAGE = 30, BUCKET = 'connect-media', REACTIONS = ['👍', '❤️', '🔥', '😂', '👏', '🙏'];
  var TABS = [['communities', 'Communities'], ['artists', 'Artists'], ['djs', 'DJs'], ['events', 'Event Rooms'], ['private', 'Private'], ['invites', 'Invitations'], ['notifs', 'Notifications']];
  var ERR = {
    connect_rate_limited: 'You are going too fast. Wait a few seconds and try again.',
    connect_invite_limit: 'You have already invited this person several times this week.',
    connect_cannot_invite: 'This person cannot be invited right now.',
    connect_no_shared_room: 'You can only invite people who are in a community with you.',
    connect_forbidden: 'You do not have permission to do that.',
    connect_banned: 'You cannot join this community.',
    connect_not_found: 'That is no longer available.',
    connect_not_host: 'Only artists and DJs can create event rooms. Create a DJ profile or get your artist account verified first.',
    connect_too_many_rooms: 'You already have 5 active event rooms. Close one first.',
    connect_owner_cannot_leave: 'Owners cannot leave their own community.',
    connect_bad_name: 'Please enter a name (2 to 60 characters).',
    connect_edit_window: 'Messages can only be edited for 24 hours.',
    connect_bad_attachment: 'That attachment is not allowed.',
    connect_empty_message: 'Write a message first.',
    connect_already_verified: 'You are already verified.',
    connect_not_signed_in: 'Please sign in first.'
  };

  var S = {
    ready: false, uid: null, me: null, user: null, tab: 'communities', q: '', active: false, missing: false,
    myRooms: [], dir: {}, convs: [], invites: null, notifs: [], reports: null, requests: null,
    unread: { notifications: 0, invites: 0, private: 0 }, blocked: new Set(), people: new Map(),
    chat: null, ch: null, userCh: null, booted: false, poll: null, dirLoading: false
  };

  /* ───────── tiny helpers ───────── */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m) { try { window.showToast(m); } catch (e) { console.log(m); } }
  function sb() { return window.sb; }
  function curUser() { try { return typeof _demoUser !== 'undefined' ? _demoUser : null; } catch (e) { return null; } }
  function curArtist() { try { return typeof _currentArtistProfile !== 'undefined' ? _currentArtistProfile : null; } catch (e) { return null; } }
  function appArtists() { try { return typeof artists !== 'undefined' ? artists : []; } catch (e) { return []; } }
  function safeName(n) { n = String(n || '').trim(); return n && n.indexOf('@') === -1 ? n : ''; }
  function initials(n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function norm(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function isCoarse() { try { return window.matchMedia('(pointer:coarse)').matches; } catch (e) { return false; } }
  function mediaOk(u) { try { var b = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '') + '/storage/v1/object/public/' + BUCKET + '/'; return typeof u === 'string' && u.indexOf(b) === 0; } catch (e) { return false; } }
  function safeImg(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  function human(e) {
    var m = String((e && (e.message || e.details)) || e || '');
    for (var k in ERR) if (m.indexOf(k) !== -1) return ERR[k];
    if (e && (e.code === 'PGRST202' || e.code === '42883' || e.code === '42P01' || e.code === 'PGRST205' || /could not find the function|does not exist|schema cache/i.test(m))) { S.missing = true; return 'YAPS Connect is not set up in the database yet.'; }
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Network problem. Check your connection and try again.';
    if (/row-level security|permission denied/i.test(m)) return 'You do not have permission to do that.';
    return 'Something went wrong. Please try again.';
  }
  async function rpc(name, args) {
    var r = await sb().rpc(name, args || {});
    if (r.error) throw r.error;
    return r.data;
  }
  function timeStr(d) { d = new Date(d); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function dayKey(d) { d = new Date(d); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function dayLabel(d) {
    var x = new Date(d), n = new Date(), y = new Date(Date.now() - 864e5);
    if (dayKey(x) === dayKey(n)) return 'Today'; if (dayKey(x) === dayKey(y)) return 'Yesterday';
    return x.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: x.getFullYear() === n.getFullYear() ? undefined : 'numeric' });
  }
  function ago(d) {
    var s = Math.max(1, (Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h';
    if (s < 604800) return Math.floor(s / 86400) + 'd'; return new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' });
  }
  function av(card, cls, square) {
    var name = (card && (card.name || card.full_name)) || '?', url = safeImg(card && (card.avatar_url || card.image_url));
    return '<span class="cn-av ' + (cls || '') + (square ? ' sq' : '') + '" aria-hidden="true">' + esc(initials(name)) + (url ? '<img loading="lazy" decoding="async" alt="" src="' + esc(url) + '" onerror="this.remove()">' : '') + '</span>';
  }
  function body(text, myUser) {
    return String(text || '').split(/(https?:\/\/[^\s<>"']*[^\s<>"'.,!?)]|@[A-Za-z0-9_.]{2,30})/g).map(function (p, i) {
      if (i % 2 === 0) return esc(p);
      if (p[0] === '@') return '<span class="cn-men' + (myUser && p.slice(1).toLowerCase() === myUser ? ' me' : '') + '">' + esc(p) + '</span>';
      return '<a href="' + esc(p) + '" target="_blank" rel="noopener noreferrer nofollow">' + esc(p) + '</a>';
    }).join('');
  }
  function kindLabel(k) { return k === 'artist' ? 'Artist' : k === 'dj' ? 'DJ' : 'Event'; }
  function kindIcon(k) { return k === 'artist' ? 'fa-microphone-lines' : k === 'dj' ? 'fa-headphones' : 'fa-calendar-star'; }
  function myUsername() { return String((S.user && S.user.username) || (window._yapsProfile && window._yapsProfile.username) || '').toLowerCase(); }

  async function ensurePeople(ids) {
    var need = [], seen = {};
    ids.forEach(function (id) { if (id && !S.people.has(id) && !seen[id]) { seen[id] = 1; need.push(id); } });
    if (!need.length) return;
    try {
      var r = await sb().from('yaps_profiles').select('id,username,full_name,avatar_url').in('id', need);
      (r.data || []).forEach(function (p) { S.people.set(p.id, { id: p.id, username: p.username, name: safeName(p.full_name) || p.username || 'YAPS User', avatar_url: p.avatar_url }); });
    } catch (e) { }
    need.forEach(function (id) { if (!S.people.has(id)) S.people.set(id, { id: id, name: 'YAPS User' }); });
  }
  function cachePeople(c) { if (c && c.id) S.people.set(c.id, { id: c.id, username: c.username, name: c.name || 'YAPS User', avatar_url: c.avatar_url }); return c; }
  function person(id) { return S.people.get(id) || { id: id, name: 'YAPS User' }; }

  /* ───────── dialogs ───────── */
  function overlay(html, opts) {
    closeOverlay();
    var o = document.createElement('div'); o.className = 'cn-ov'; o.id = 'cnOv'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.innerHTML = '<div class="cn-sheet">' + html + '</div>';
    o.addEventListener('mousedown', function (e) { if (e.target === o) closeOverlay(); });
    document.body.appendChild(o);
    var f = o.querySelector('[autofocus]'); if (f && !isCoarse()) setTimeout(function () { f.focus(); }, 30);
    return o;
  }
  function closeOverlay() { var o = $('cnOv'); if (o) o.remove(); }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise(function (res) {
      var o = overlay('<h3>' + esc(title) + '</h3><p class="sub">' + esc(text) + '</p><div class="cn-btns"><button class="cn-btn ghost" data-x="0">Cancel</button><button class="cn-btn' + (danger ? ' danger' : '') + '" data-x="1">' + esc(okLabel || 'Confirm') + '</button></div>');
      o.addEventListener('click', function (e) { var b = e.target.closest('[data-x]'); if (b) { closeOverlay(); res(b.dataset.x === '1'); } });
      o.addEventListener('mousedown', function (e) { if (e.target === o) res(false); });
    });
  }
  function requireSignIn() {
    if (S.uid) return true;
    toast('Sign in to use YAPS Connect');
    try { window.goAuth('signin'); } catch (e) { }
    return false;
  }

  /* ───────── images ───────── */
  function shrink(file, maxDim) {
    return new Promise(function (res) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return res(file);
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, maxDim / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(url); res(b && b.size < file.size ? b : file); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); res(file); };
      img.src = url;
    });
  }
  async function upload(file, maxDim) {
    var allowed = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/;
    if (!allowed.test(file.type)) throw new Error('Only images (JPG, PNG, WebP, GIF) and PDF files are allowed.');
    if (file.size > 12 * 1024 * 1024) throw new Error('That file is too large (max 5 MB after compression).');
    var blob = await shrink(file, maxDim || 1280), type = blob.type || file.type;
    if (blob.size > 5 * 1024 * 1024) throw new Error('That file is too large (max 5 MB).');
    var ext = type === 'application/pdf' ? 'pdf' : type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : type === 'image/gif' ? 'gif' : 'jpg';
    var path = S.uid + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    var r = await sb().storage.from(BUCKET).upload(path, blob, { contentType: type, upsert: false, cacheControl: '31536000' });
    if (r.error) throw r.error;
    return { url: sb().storage.from(BUCKET).getPublicUrl(path).data.publicUrl, type: type === 'application/pdf' ? 'file' : 'image', name: file.name };
  }

  /* ───────── boot / auth ───────── */
  function root() {
    var r = $('cnRoot'); if (!r) return null;
    if (!r.dataset.built) {
      r.dataset.built = '1';
      r.innerHTML = '<div class="cn-shell" id="cnShell" data-view="list"><aside class="cn-side" id="cnSide"></aside><section class="cn-main" id="cnMain"></section></div>';
      $('cnShell').addEventListener('click', onClick);
      $('cnShell').addEventListener('input', onInput);
      $('cnShell').addEventListener('keydown', onKey);
      $('cnShell').addEventListener('change', onChange);
      fit(); if (window.visualViewport) { window.visualViewport.addEventListener('resize', fit); window.visualViewport.addEventListener('scroll', fit); }
      window.addEventListener('resize', fit);
    }
    return r;
  }
  // Keeps the composer above the on-screen keyboard (Android Chrome / iOS) without breaking the app layout.
  function fit() {
    var sh = $('cnShell'); if (!sh || !S.active) return;
    var vv = window.visualViewport; if (!vv) return;
    var kb = (window.innerHeight - vv.height) > 120;
    if (!kb) { sh.style.removeProperty('--cn-h'); return; }
    var top = sh.getBoundingClientRect().top - document.body.getBoundingClientRect().top;
    sh.style.setProperty('--cn-h', Math.max(220, vv.height - Math.max(0, top)) + 'px');
    var m = $('cnMsgs'); if (m && S.chat) m.scrollTop = m.scrollHeight;
  }
  function setView(v) { var s = $('cnShell'); if (s) s.dataset.view = v; }

  window.renderConnectPage = async function () {
    if (!root()) return;
    S.active = true;
    var user = curUser();
    if (!window.sb) { gate('fa-plug-circle-xmark', 'Offline', 'YAPS Connect needs a connection to the server.'); return; }
    if (!user) { S.uid = null; gate('fa-comments', 'Join the conversation', 'Sign in to join artist and DJ communities, chat with other listeners and join event rooms.', '<button class="cn-btn" data-act="signin"><i class="fas fa-right-to-bracket"></i> Sign in</button>'); return; }
    if (S.uid !== user.id) resetState();
    S.uid = user.id; S.user = user;
    if (!S.booted) { drawSide(); drawMainPlaceholder(); await boot(); } else { drawSide(); if (!S.chat) drawMainPlaceholder(); refreshCurrentTab(); refreshUnread(); }
    openFromUrl();
  };
  function resetState() {
    closeChat(); unsubUser();
    S.me = null; S.myRooms = []; S.dir = {}; S.convs = []; S.invites = null; S.notifs = []; S.booted = false; S.blocked = new Set(); S.unread = { notifications: 0, invites: 0, private: 0 };
  }
  function gate(icon, title, text, extra) {
    var sh = $('cnShell'); if (!sh) return;
    $('cnSide').innerHTML = '<div class="cn-head"><div class="cn-grow"><h1>YAPS Connect</h1><p>Communities for listeners, artists and DJs</p></div></div><div class="cn-state"><i class="fas ' + icon + '"></i><b style="color:var(--text);font-size:16px">' + esc(title) + '</b><p>' + esc(text) + '</p>' + (extra || '') + '</div>';
    $('cnMain').innerHTML = ''; setView('list');
  }
  async function boot() {
    S.booted = true;
    try {
      S.me = await rpc('connect_ensure_profile');
      var bl = await rpc('connect_my_blocks'); (bl || []).forEach(function (c) { cachePeople(c); S.blocked.add(c.id); });
    } catch (e) {
      S.booted = false;
      var msg = human(e);
      gate('fa-database', S.missing ? 'Almost ready' : 'Could not open YAPS Connect', S.missing ? 'The YAPS Connect database setup has not been run yet. If you are the site owner, run supabase-connect.sql in the Supabase SQL editor.' : msg, '<button class="cn-btn ghost" data-act="retry">Try again</button>');
      return;
    }
    subUser(); refreshUnread();
    if (!S.poll) S.poll = setInterval(function () { if (S.uid && !document.hidden) refreshUnread(); }, 60000);
    drawSide(); refreshCurrentTab();
  }
  window.connectOnLeave = function () { S.active = false; closeChat(); setView('list'); drawMainPlaceholder(); };

  /* ───────── side panel ───────── */
  function drawSide() {
    var side = $('cnSide'); if (!side) return;
    var u = S.unread, badge = { invites: u.invites, notifs: u.notifications, private: u.private };
    var tabs = TABS.slice(); if (S.me && S.me.is_admin) tabs.push(['admin', 'Admin']);
    side.innerHTML = '<div class="cn-head"><div class="cn-grow"><h1>YAPS Connect</h1><p>Communities for listeners, artists and DJs</p></div>'
      + '<button class="cn-ibtn" data-act="settings" aria-label="Connect settings" title="Settings"><i class="fas fa-sliders"></i></button></div>'
      + '<nav class="cn-tabs" role="tablist" aria-label="YAPS Connect sections">' + tabs.map(function (t) {
        return '<button role="tab" class="cn-tab' + (S.tab === t[0] ? ' on' : '') + '" aria-selected="' + (S.tab === t[0]) + '" data-tab="' + t[0] + '">' + t[1] + (badge[t[0]] ? '<span class="cn-dot">' + (badge[t[0]] > 99 ? '99+' : badge[t[0]]) + '</span>' : '') + '</button>';
      }).join('') + '</nav>'
      + '<div class="cn-search" id="cnSearchWrap" hidden><i class="fas fa-search"></i><input id="cnSearch" type="search" autocomplete="off" enterkeyhint="search" placeholder="Search" aria-label="Search" value="' + esc(S.q) + '"></div>'
      + '<div class="cn-list" id="cnList" role="tabpanel"></div>';
    var showSearch = ['artists', 'djs', 'events'].indexOf(S.tab) !== -1; $('cnSearchWrap').hidden = !showSearch;
    if (showSearch) $('cnSearch').placeholder = S.tab === 'artists' ? 'Search artist communities' : S.tab === 'djs' ? 'Search DJ communities' : 'Search event rooms';
    updateBadges();
  }
  function updateBadges() {
    var total = (S.unread.notifications || 0) + (S.unread.invites || 0) + (S.unread.private || 0);
    ['nav-connect'].forEach(function (id) {
      var el = $(id); if (!el) return; var b = el.querySelector('.badge'); if (!b) return;
      b.textContent = total > 99 ? '99+' : total; b.style.display = total ? '' : 'none';
    });
    var t = $('cnTopBadge'); if (t) { t.textContent = total > 99 ? '99+' : total; t.style.display = total ? '' : 'none'; }
  }
  function setTab(t) {
    S.tab = t; S.q = ''; drawSide(); refreshCurrentTab();
    var tb = document.querySelector('.cn-tab.on'); if (tb && tb.scrollIntoView) tb.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function listHost() { return $('cnList'); }
  function loading() { var l = listHost(); if (l) l.innerHTML = '<div class="cn-skel"></div><div class="cn-skel"></div><div class="cn-skel"></div>'; }
  function failed(msg, act) { var l = listHost(); if (l) l.innerHTML = '<div class="cn-state"><i class="fas fa-triangle-exclamation"></i><p>' + esc(msg) + '</p><button class="cn-btn ghost" data-act="' + (act || 'reload') + '">Try again</button></div>'; }

  async function refreshCurrentTab() {
    var t = S.tab;
    try {
      if (t === 'communities') return await tabCommunities();
      if (t === 'artists' || t === 'djs' || t === 'events') return await tabDirectory(t === 'artists' ? 'artist' : t === 'djs' ? 'dj' : 'event');
      if (t === 'private') return await tabPrivate();
      if (t === 'invites') return await tabInvites();
      if (t === 'notifs') return await tabNotifs();
      if (t === 'admin') return await tabAdmin();
    } catch (e) { if (S.tab === t) failed(human(e)); }
  }

  function roomRow(r, opts) {
    opts = opts || {};
    var on = S.chat && S.chat.type === 'room' && S.chat.id === r.id;
    var sub = r.kind === 'event' && r.starts_at ? new Date(r.starts_at).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : (r.member_count || 0) + ' member' + (r.member_count === 1 ? '' : 's');
    return '<div class="cn-row' + (on ? ' on' : '') + '" role="button" tabindex="0" data-room="' + r.id + '">' + av({ name: r.name, avatar_url: r.image_url }, '', true)
      + '<div class="cn-info"><div class="cn-t"><span class="n">' + esc(r.name) + '</span><span class="cn-chip' + (r.kind === 'event' ? ' y' : '') + '">' + kindLabel(r.kind) + '</span>' + (r.status !== 'active' ? '<span class="cn-chip r">' + esc(r.status) + '</span>' : '') + '</div>'
      + '<div class="cn-s">' + esc(opts.preview || sub) + '</div></div>'
      + '<div class="cn-end">' + (opts.showJoin ? (r.is_member ? '<span class="cn-chip g">Joined</span>' : '<button class="cn-btn sm" data-join="' + r.id + '">Join</button>') : (r.last_message_at ? '<span>' + ago(r.last_message_at) + '</span>' : '') + (r.unread ? '<span class="cn-dot">' + (r.unread > 99 ? '99+' : r.unread) + '</span>' : '')) + '</div></div>';
  }

  async function tabCommunities() {
    loading();
    S.myRooms = (await rpc('connect_my_rooms')) || [];
    if (S.tab !== 'communities') return;
    var l = listHost(); if (!l) return;
    if (!S.myRooms.length) {
      l.innerHTML = '<div class="cn-empty"><i class="fas fa-people-group"></i><b style="color:var(--text)">No communities yet</b><p>Join an artist or DJ community to chat with their fans, or open an event room.</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="cn-btn sm" data-tab="artists">Browse artists</button><button class="cn-btn sm ghost" data-tab="djs">Browse DJs</button><button class="cn-btn sm ghost" data-tab="events">Event rooms</button></div></div>';
      return;
    }
    l.innerHTML = S.myRooms.map(function (r) { return roomRow(r); }).join('');
  }

  async function tabDirectory(kind, more) {
    var d = S.dir[kind] = S.dir[kind] || { rows: [], done: false };
    if (!more) { d.rows = []; d.done = false; loading(); }
    if (S.dirLoading) return; S.dirLoading = true;
    var rows;
    try { rows = (await rpc('connect_list_rooms', { p_kind: kind, p_q: S.q || null, p_limit: PAGE, p_offset: d.rows.length })) || []; }
    finally { S.dirLoading = false; }
    if ((kind === 'artist' ? 'artists' : kind === 'dj' ? 'djs' : 'events') !== S.tab) return;
    d.rows = d.rows.concat(rows); d.done = rows.length < PAGE;
    var l = listHost(); if (!l) return;
    var top = '';
    if (!S.q) {
      if (kind === 'dj') {
        top = S.me && S.me.dj_enabled ? '<div class="cn-card"><h3><i class="fas fa-headphones"></i> Your DJ profile</h3><p>' + esc(S.me.dj_stage_name || 'DJ') + ' · you own and moderate your DJ community.</p><button class="cn-btn sm" data-act="djprofile">Edit DJ profile</button> <button class="cn-btn sm ghost" data-act="mydjroom">Open my community</button></div>'
          : '<div class="cn-card"><h3><i class="fas fa-headphones"></i> Are you a DJ?</h3><p>Create your DJ profile (separate from any artist account) and get your own community where listeners can join and talk to you.</p><button class="cn-btn sm" data-act="djprofile">Create DJ profile</button></div>';
      } else if (kind === 'artist') {
        var acct = S.user && S.user.accountType === 'artist';
        if (S.me && S.me.artist_verified) top = '<div class="cn-card"><h3><i class="fas fa-badge-check"></i> Verified artist</h3><p>Your artist community is open. You moderate it.</p><button class="cn-btn sm" data-act="myartistroom">Open my community</button></div>';
        else if (S.me && S.me.pending_artist_request) top = '<div class="cn-card"><h3>Verification pending</h3><p>The YAPS team is reviewing your artist verification request. Your community opens as soon as it is approved.</p></div>';
        else if (acct) top = '<div class="cn-card"><h3><i class="fas fa-microphone-lines"></i> Open your artist community</h3><p>Verified artists get a permanent community for their fans. Send a verification request to the YAPS team.</p><button class="cn-btn sm" data-act="artistverify">Request verification</button></div>';
      } else {
        top = '<div class="cn-card"><h3><i class="fas fa-calendar-star"></i> Event rooms</h3><p>Temporary chat rooms for shows, concerts and listening parties. They are separate from the public Events listing.</p>'
          + '<div style="display:flex;gap:8px;flex-wrap:wrap">' + ((S.me && (S.me.artist_verified || S.me.dj_enabled || S.me.is_admin)) ? '<button class="cn-btn sm" data-act="newevent">Create event room</button>' : '<button class="cn-btn sm ghost" data-act="needhost">Create event room</button>') + '<button class="cn-btn sm ghost" data-act="joincode">Join with a code</button></div></div>';
      }
    }
    var emptyMsg = S.q ? 'No communities match “' + esc(S.q) + '”.' : kind === 'artist' ? 'No artist communities are open yet.' : kind === 'dj' ? 'No DJ communities yet. Be the first!' : 'No public event rooms right now.';
    l.innerHTML = top + (d.rows.length ? d.rows.map(function (r) { return roomRow(r, { showJoin: true }); }).join('') : '<div class="cn-empty"><i class="fas fa-' + (kind === 'event' ? 'calendar' : 'compact-disc') + '"></i>' + emptyMsg + '</div>')
      + (!d.done ? '<div style="text-align:center;padding:10px"><button class="cn-btn ghost sm" data-act="more">Load more</button></div>' : '');
  }

  async function tabPrivate() {
    loading();
    S.convs = (await rpc('connect_my_conversations')) || [];
    await ensurePeople(S.convs.map(function (c) { return c.other && c.other.id; })); S.convs.forEach(function (c) { cachePeople(c.other); });
    if (S.tab !== 'private') return;
    var l = listHost(); if (!l) return;
    if (!S.convs.length) { l.innerHTML = '<div class="cn-empty"><i class="fas fa-lock"></i><b style="color:var(--text)">No private chats</b><p>Private chats open only after the other person accepts your invitation. Tap a message in a community and choose <b>Chat Privately</b>.</p></div>'; return; }
    l.innerHTML = S.convs.map(function (c) {
      var on = S.chat && S.chat.type === 'private' && S.chat.id === c.id;
      return '<div class="cn-row' + (on ? ' on' : '') + '" role="button" tabindex="0" data-conv="' + c.id + '">' + av(c.other) + '<div class="cn-info"><div class="cn-t"><span class="n">' + esc(c.other.name) + '</span></div><div class="cn-s">' + (c.last_body ? (c.last_sender === S.uid ? 'You: ' : '') + esc(c.last_body) : 'Say hello') + '</div></div><div class="cn-end"><span>' + ago(c.last_at) + '</span>' + (c.unread ? '<span class="cn-dot">' + c.unread + '</span>' : '') + '</div></div>';
    }).join('');
  }

  async function tabInvites() {
    loading();
    S.invites = await rpc('connect_my_invites');
    var iv = S.invites || {}; (iv.private_in || []).forEach(function (i) { cachePeople(i.from); }); (iv.private_out || []).forEach(function (i) { cachePeople(i.to); }); (iv.room_in || []).forEach(function (i) { cachePeople(i.from); });
    if (S.tab !== 'invites') return;
    var l = listHost(), h = ''; if (!l) return;
    var pin = iv.private_in || [], rin = iv.room_in || [], out = iv.private_out || [];
    if (!pin.length && !rin.length && !out.length) { l.innerHTML = '<div class="cn-empty"><i class="fas fa-envelope-open"></i>No invitations right now.<p>Private chat requests and event room invites show up here.</p></div>'; return; }
    if (pin.length) h += '<div class="cn-sec">Private chat requests</div>' + pin.map(function (i) {
      return '<div class="cn-rep"><div style="display:flex;gap:10px;align-items:center">' + av(i.from) + '<div style="flex:1;min-width:0"><b>' + esc(i.from.name) + '</b><div class="cn-s" style="font-size:12.5px;color:var(--muted)">wants to chat privately' + (i.room_name ? ' · met in ' + esc(i.room_name) : '') + ' · ' + ago(i.created_at) + '</div></div></div><div class="cn-btns" style="margin-top:10px"><button class="cn-btn sm ghost" data-inv-no="' + i.id + '">Decline</button><button class="cn-btn sm" data-inv-yes="' + i.id + '">Accept</button></div></div>';
    }).join('');
    if (rin.length) h += '<div class="cn-sec">Event room invitations</div>' + rin.map(function (i) {
      return '<div class="cn-rep"><div style="display:flex;gap:10px;align-items:center">' + av({ name: i.room.name, avatar_url: i.room.image_url }, '', true) + '<div style="flex:1;min-width:0"><b>' + esc(i.room.name) + '</b><div style="font-size:12.5px;color:var(--muted)">invited by ' + esc(i.from.name) + ' · ' + esc(i.room.visibility) + (i.room.starts_at ? ' · ' + new Date(i.room.starts_at).toLocaleDateString() : '') + '</div></div></div><div class="cn-btns" style="margin-top:10px"><button class="cn-btn sm ghost" data-rinv-no="' + i.id + '">Decline</button><button class="cn-btn sm" data-rinv-yes="' + i.id + '" data-room-id="' + i.room.id + '">Join room</button></div></div>';
    }).join('');
    if (out.length) h += '<div class="cn-sec">Sent by you</div>' + out.map(function (i) {
      return '<div class="cn-row" style="cursor:default">' + av(i.to) + '<div class="cn-info"><div class="cn-t"><span class="n">' + esc(i.to.name) + '</span></div><div class="cn-s">' + (i.status === 'pending' ? 'Waiting for a reply' : i.status === 'accepted' ? 'Accepted' : i.status === 'declined' ? 'Not accepted' : 'Cancelled') + ' · ' + ago(i.created_at) + '</div></div>' + (i.status === 'pending' ? '<button class="cn-btn sm ghost" data-inv-cancel="' + i.id + '">Cancel</button>' : '') + '</div>';
    }).join('');
    l.innerHTML = h;
  }

  var NOTIF_ICON = { reply: 'fa-reply', mention: 'fa-at', message: 'fa-comment', invite_received: 'fa-user-plus', invite_accepted: 'fa-circle-check', invite_declined: 'fa-circle-xmark', private_message: 'fa-lock', moderation: 'fa-shield-halved', event_invite: 'fa-calendar-star', role: 'fa-badge-check' };
  async function tabNotifs() {
    loading();
    S.notifs = (await rpc('connect_my_notifications', { p_limit: 50 })) || [];
    S.notifs.forEach(function (n) { if (n.actor) cachePeople(n.actor); });
    if (S.tab !== 'notifs') return;
    var l = listHost(); if (!l) return;
    if (!S.notifs.length) { l.innerHTML = '<div class="cn-empty"><i class="fas fa-bell-slash"></i>You are all caught up.</div>'; return; }
    l.innerHTML = '<div style="text-align:right;padding:2px 8px"><button class="cn-btn sm ghost" data-act="readall">Mark all read</button></div>' + S.notifs.map(function (n) {
      return '<div class="cn-row" role="button" tabindex="0" data-notif="' + n.id + '" style="' + (n.read_at ? 'opacity:.7' : '') + '"><span class="cn-av"><i class="fas ' + (NOTIF_ICON[n.kind] || 'fa-bell') + '"></i></span><div class="cn-info"><div class="cn-t"><span class="n" style="white-space:normal">' + esc(n.body || n.kind) + '</span></div><div class="cn-s">' + (n.room_name ? esc(n.room_name) + ' · ' : '') + ago(n.created_at) + '</div></div>' + (n.read_at ? '' : '<span class="cn-dot" style="width:10px;min-width:10px;height:10px;padding:0"></span>') + '</div>';
    }).join('');
  }

  async function tabAdmin() {
    loading();
    var res = await Promise.all([rpc('connect_admin_list_reports', { p_status: 'open', p_limit: 50 }), rpc('connect_admin_list_role_requests')]);
    S.reports = res[0] || []; S.requests = res[1] || [];
    if (S.tab !== 'admin') return;
    var l = listHost(); if (!l) return;
    var h = '<div class="cn-card"><h3>Open a community</h3><p>Create a permanent community for an artist or DJ that has no YAPS account yet.</p><button class="cn-btn sm" data-act="adminopen">Open community</button> <button class="cn-btn sm ghost" data-act="adminall">Open for all listed artists</button></div>';
    h += '<div class="cn-sec">Artist verification requests (' + S.requests.length + ')</div>' + (S.requests.length ? S.requests.map(function (r) {
      return '<div class="cn-rep"><div style="display:flex;gap:10px;align-items:center">' + av(r.user) + '<div style="flex:1;min-width:0"><b>' + esc(r.user.name) + '</b> <span style="color:var(--dim)">@' + esc(r.user.username || '') + '</span><blockquote>' + esc(r.note || 'No note') + '</blockquote></div></div><div class="cn-btns" style="margin-top:4px"><button class="cn-btn sm ghost" data-rq-no="' + r.id + '">Reject</button><button class="cn-btn sm" data-rq-yes="' + r.id + '">Approve</button></div></div>';
    }).join('') : '<div class="cn-empty" style="padding:14px">None pending.</div>');
    h += '<div class="cn-sec">Open reports (' + S.reports.length + ')</div>' + (S.reports.length ? S.reports.map(function (r) {
      var sn = r.snapshot || {}, ctx = r.kind === 'private_message' ? (sn.context || []).map(function (m) { return (m.sender_id === (r.reported && r.reported.id) ? '⚠ ' : '') + m.body; }).join('\n') : (sn.body || '');
      return '<div class="cn-rep"><div><span class="cn-chip r">' + esc(r.reason) + '</span> <span class="cn-chip">' + esc(r.kind.replace('_', ' ')) + '</span> <span style="color:var(--dim);font-size:12px">' + ago(r.created_at) + '</span></div>'
        + '<div style="margin-top:6px">Reported: <b>' + esc(r.reported ? r.reported.name : 'unknown') + '</b> · by ' + esc(r.reporter.name) + (r.room_name ? ' · in ' + esc(r.room_name) : '') + '</div>'
        + (r.details ? '<div style="color:var(--muted);margin-top:4px">“' + esc(r.details) + '”</div>' : '') + (ctx ? '<blockquote>' + esc(ctx) + '</blockquote>' : '')
        + '<div class="cn-btns"><button class="cn-btn sm ghost" data-rep="' + r.id + '" data-st="dismissed">Dismiss</button>' + (r.kind === 'message' && r.message_id ? '<button class="cn-btn sm danger" data-rep="' + r.id + '" data-st="resolved" data-del="1">Delete message</button>' : '') + '<button class="cn-btn sm" data-rep="' + r.id + '" data-st="resolved">Mark resolved</button></div></div>';
    }).join('') : '<div class="cn-empty" style="padding:14px">No open reports.</div>');
    l.innerHTML = h;
  }

  /* ───────── chat: open / close ───────── */
  function drawMainPlaceholder() {
    var m = $('cnMain'); if (!m || S.chat) return;
    m.innerHTML = '<div class="cn-ph"><i class="fas fa-comments"></i><h2>Pick a conversation</h2><p>Choose a community on the left, or discover artists, DJs and event rooms. Your music keeps playing while you chat.</p></div>';
  }
  function closeChat() {
    if (S.ch) { try { sb().removeChannel(S.ch); } catch (e) { } S.ch = null; }
    S.chat = null;
  }
  async function openRoom(id, code) {
    if (!requireSignIn()) return;
    closeChat();
    var c = S.chat = { type: 'room', id: id, room: null, msgs: [], byId: new Map(), hasMore: true, busy: false, err: null, pending: [], replyTo: null, attach: null, members: null, token: Date.now() };
    setView('chat'); chatFrame(); drawMsgsState('loading');
    try {
      c.room = await rpc('connect_get_room', { p_room: id });
      if (!c.room && code) { c.room = await rpc('connect_find_room_by_code', { p_code: code }); }
      if (S.chat !== c) return;
      if (!c.room) { drawMsgsState('error', 'This community is private or no longer available.'); chatHead(); return; }
      chatHead(); chatComposer();
      await loadMsgs(true);
      if (S.chat !== c) return;
      subRoom(c); markRead();
      if (c.room.is_member) loadMembers();
    } catch (e) { if (S.chat === c) { c.err = human(e); drawMsgsState('error', c.err); chatHead(); } }
    highlightRows();
  }
  async function openConv(id) {
    if (!requireSignIn()) return;
    closeChat();
    var c = S.chat = { type: 'private', id: id, other: null, msgs: [], byId: new Map(), hasMore: true, busy: false, pending: [], token: Date.now() };
    setView('chat'); chatFrame(); drawMsgsState('loading');
    try {
      var conv = (S.convs || []).find(function (x) { return x.id === id; });
      if (!conv) { S.convs = (await rpc('connect_my_conversations')) || []; conv = S.convs.find(function (x) { return x.id === id; }); }
      if (S.chat !== c) return;
      if (!conv) { drawMsgsState('error', 'This conversation is not available.'); return; }
      c.other = cachePeople(conv.other); chatHead(); chatComposer();
      await loadMsgs(true);
      if (S.chat !== c) return;
      subConv(c); markRead();
    } catch (e) { if (S.chat === c) drawMsgsState('error', human(e)); }
    highlightRows();
  }
  function highlightRows() {
    document.querySelectorAll('#cnList .cn-row').forEach(function (r) {
      r.classList.toggle('on', !!S.chat && ((S.chat.type === 'room' && r.dataset.room === S.chat.id) || (S.chat.type === 'private' && r.dataset.conv === S.chat.id)));
    });
  }
  function chatFrame() {
    $('cnMain').innerHTML = '<header class="cn-chead" id="cnHead"></header><div id="cnBanner"></div><div class="cn-msgs" id="cnMsgs" aria-live="polite"></div><footer class="cn-comp" id="cnComp"></footer>';
    $('cnMsgs').addEventListener('scroll', onScroll, { passive: true });
  }
  function chatHead() {
    var c = S.chat, h = $('cnHead'); if (!c || !h) return;
    var back = '<button class="cn-ibtn cn-back" data-act="back" aria-label="Back to list"><i class="fas fa-arrow-left"></i></button>';
    if (c.type === 'room') {
      var r = c.room;
      if (!r) { h.innerHTML = back + '<div class="cn-info"><div class="cn-t">Community</div></div>'; return; }
      h.innerHTML = back + av({ name: r.name, avatar_url: r.image_url }, '', true) + '<div class="cn-info" data-act="roominfo" role="button" tabindex="0"><div class="cn-t">' + esc(r.name) + '</div><div class="cn-s">' + kindLabel(r.kind) + ' community · ' + (r.member_count || 0) + ' members' + (r.visibility !== 'public' ? ' · ' + r.visibility : '') + '</div></div>'
        + (r.is_member ? '<button class="cn-btn sm ghost" data-act="leave">Leave</button>' : (r.banned ? '' : '<button class="cn-btn sm" data-act="joinhere">Join</button>'))
        + '<button class="cn-ibtn" data-act="roominfo" aria-label="Community info"><i class="fas fa-circle-info"></i></button>';
      var b = '';
      if (r.status === 'closed') b = 'This room is closed. You can read messages but not post.'; else if (r.status === 'archived') b = 'This room is archived.';
      $('cnBanner').innerHTML = b ? '<div class="cn-banner">' + b + '</div>' : '';
    } else {
      h.innerHTML = back + av(c.other) + '<div class="cn-info" data-user="' + c.other.id + '" role="button" tabindex="0"><div class="cn-t">' + esc(c.other.name) + '</div><div class="cn-s"><i class="fas fa-lock" style="font-size:10px"></i> Private chat · only you two can see this</div></div><button class="cn-ibtn" data-user="' + c.other.id + '" aria-label="Options"><i class="fas fa-ellipsis"></i></button>';
    }
  }
  function drawMsgsState(kind, msg) {
    var m = $('cnMsgs'); if (!m) return;
    if (kind === 'loading') m.innerHTML = '<div class="cn-state"><div class="cn-spin"></div>Loading messages…</div>';
    else if (kind === 'error') m.innerHTML = '<div class="cn-state"><i class="fas fa-triangle-exclamation"></i><p>' + esc(msg) + '</p><button class="cn-btn ghost" data-act="reloadchat">Try again</button></div>';
  }

  /* ───────── chat: messages ───────── */
  function normRow(r) {   // realtime / insert rows have no joined sender → fill from cache
    return { id: r.id, room_id: r.room_id, sender_id: r.sender_id, body: r.body || '', reply_to: r.reply_to, attachment_url: r.attachment_url, attachment_type: r.attachment_type, attachment_name: r.attachment_name, edited_at: r.edited_at, deleted_at: r.deleted_at, created_at: r.created_at, reactions: r.reactions || [], reply: r.reply || null, sender_role: r.sender_role };
  }
  async function loadMsgs(first) {
    var c = S.chat; if (!c || c.busy) return; c.busy = true;
    try {
      var before = first || !c.msgs.length ? null : c.msgs[0].created_at;
      var rows = c.type === 'room'
        ? await rpc('connect_get_messages', { p_room: c.id, p_before: before, p_limit: PAGE })
        : await rpc('connect_get_private_messages', { p_conv: c.id, p_before: before, p_limit: PAGE });
      if (S.chat !== c) return;
      rows = (rows || []).slice().reverse();
      c.hasMore = (rows.length === PAGE);
      var prevTop = first ? 0 : 1;
      rows.forEach(function (m) { if (m.sender) cachePeople(m.sender); });
      await ensurePeople(rows.map(function (m) { return m.sender_id; }));
      rows.forEach(function (m) { if (!c.byId.has(m.id)) { c.byId.set(m.id, m); } });
      c.msgs = Array.from(c.byId.values()).sort(function (a, b) { return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0; });
      paint(first ? { bottom: true } : { preserve: prevTop });
    } catch (e) {
      if (first) drawMsgsState('error', human(e)); else toast(human(e));
    } finally { if (S.chat === c) c.busy = false; }
  }
  function onScroll() {
    var c = S.chat, m = $('cnMsgs'); if (!c || !m) return;
    if (m.scrollTop < 70 && c.hasMore && !c.busy) loadMsgs(false);
    if (m.scrollHeight - m.scrollTop - m.clientHeight < 80) markRead();
  }
  function paint(o) {
    var c = S.chat, box = $('cnMsgs'); if (!c || !box) return;
    o = o || {};
    var near = box.scrollHeight - box.scrollTop - box.clientHeight < 140, oldH = box.scrollHeight, oldTop = box.scrollTop;
    var list = c.msgs.filter(function (m) { return !(S.blocked.has(m.sender_id) && m.sender_id !== S.uid); });
    var all = list.concat(c.pending.map(function (p) { return p; }));
    var h = c.hasMore ? '<button class="cn-more-old" data-act="older">Load older messages</button>' : '';
    if (!all.length) h += '<div class="cn-ph" style="margin-top:12vh"><i class="fas fa-comment-dots"></i><h2>' + (c.type === 'room' ? 'No messages yet' : 'Say hello') + '</h2><p>' + (c.type === 'room' ? 'Be the first to say something to this community.' : 'Your conversation with ' + esc(c.other.name) + ' starts here.') + '</p></div>';
    var prev = null, mu = myUsername();
    all.forEach(function (m) {
      if (!prev || dayKey(prev.created_at) !== dayKey(m.created_at)) h += '<div class="cn-day"><span>' + dayLabel(m.created_at) + '</span></div>';
      var grp = prev && prev.sender_id === m.sender_id && dayKey(prev.created_at) === dayKey(m.created_at) && (new Date(m.created_at) - new Date(prev.created_at)) < 300000 && !m.reply && !prev.deleted_at;
      h += msgHtml(m, grp, mu); prev = m;
    });
    box.innerHTML = h;
    if (o.preserve) box.scrollTop = box.scrollHeight - oldH + oldTop;
    else if (o.bottom || near) box.scrollTop = box.scrollHeight;
    else box.scrollTop = oldTop;
  }
  var ROLE_CHIP = { owner: '<span class="cn-chip y">Owner</span>', host: '<span class="cn-chip y">Host</span>', moderator: '<span class="cn-chip g">Mod</span>' };
  function msgHtml(m, grp, mu) {
    var c = S.chat, mine = m.sender_id === S.uid, p = c.type === 'room' && m.sender ? m.sender : person(m.sender_id);
    if (m.sender) { var cp = person(m.sender_id); if (cp && cp.name) p = cp; }
    var pend = m.__pending, cls = 'cn-msg' + (mine ? ' mine' : '') + (grp ? ' grp' : '') + (pend ? ' cn-pend' : '') + (m.__failed ? ' cn-fail' : '');
    var inner = '';
    if (m.deleted_at) inner = '<div class="cn-gone"><i class="fas fa-ban"></i> Message removed</div>';
    else {
      if (m.reply || m.reply_to) {
        var rp = m.reply || { sender_name: 'message', snippet: '…' };
        inner += '<div class="cn-quote" data-jump="' + (m.reply_to || '') + '"><b>' + esc(rp.sender_name || '') + '</b> ' + (rp.deleted ? '<i>removed message</i>' : esc(rp.snippet || '')) + '</div>';
      }
      if (m.body) inner += '<div class="cn-body">' + body(m.body, mu) + '</div>';
      if (m.attachment_url && mediaOk(m.attachment_url)) {
        inner += m.attachment_type === 'image' ? '<img class="cn-img" loading="lazy" decoding="async" alt="' + esc(m.attachment_name || 'image') + '" src="' + esc(m.attachment_url) + '" data-lb="' + esc(m.attachment_url) + '">'
          : '<a class="cn-file" href="' + esc(m.attachment_url) + '" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-pdf"></i> ' + esc(m.attachment_name || 'Attachment') + '</a>';
      }
      if (m.reactions && m.reactions.length) inner += '<div class="cn-rxs">' + m.reactions.map(function (r) { return '<button class="cn-rx' + (r.mine ? ' mine' : '') + '" data-rx="' + esc(r.emoji) + '" data-mid="' + m.id + '" aria-label="' + esc(r.emoji) + ' ' + r.count + '">' + esc(r.emoji) + ' ' + r.count + '</button>'; }).join('') + '</div>';
    }
    var tick = c.type === 'private' && mine && !pend ? (m.read_at ? '<i class="fas fa-check-double" title="Seen"></i>' : '<i class="fas fa-check" title="Sent"></i>') : '';
    return '<div class="' + cls + '" data-id="' + esc(m.id) + '">' + (mine ? '' : '<span data-user="' + esc(m.sender_id) + '" role="button" tabindex="0">' + av(p, 'sm') + '</span>')
      + '<div class="cn-bub" ' + (pend ? '' : 'data-bub="1"') + '><div class="cn-meta"><b data-user="' + esc(m.sender_id) + '">' + esc(p.name) + '</b>' + (ROLE_CHIP[m.sender_role] || '') + '<time>' + timeStr(m.created_at) + '</time></div>' + inner
      + '<div class="cn-foot">' + (m.edited_at && !m.deleted_at ? '<span>edited</span>' : '') + (m.__failed ? '<span style="color:#ff7a8c">Not sent · tap to retry</span>' : pend ? '<span>sending…</span>' : '') + (mine ? '<time>' + timeStr(m.created_at) + '</time>' : '') + tick + '</div></div></div>';
  }
  function addMsg(m, o) {
    var c = S.chat; if (!c) return;
    if (c.byId.has(m.id)) { var old = c.byId.get(m.id); Object.assign(old, m, { reactions: m.reactions && m.reactions.length ? m.reactions : old.reactions, reply: m.reply || old.reply }); }
    else c.byId.set(m.id, m);
    c.msgs = Array.from(c.byId.values()).sort(function (a, b) { return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0; });
    paint(o);
  }

  /* ───────── chat: composer ───────── */
  function chatComposer() {
    var c = S.chat, f = $('cnComp'); if (!c || !f) return;
    var note = '';
    if (c.type === 'room') {
      var r = c.room;
      if (!r.is_member) { f.innerHTML = r.banned ? '<div class="cn-join">You cannot join this community.</div>' : '<div class="cn-join"><span>Join ' + esc(r.name) + ' to take part in the chat.</span><button class="cn-btn" data-act="joinhere"><i class="fas fa-plus"></i> Join community</button></div>'; return; }
      if (r.status !== 'active') { f.innerHTML = '<div class="cn-join">This room is ' + esc(r.status) + '.</div>'; return; }
      if (r.restricted) { f.innerHTML = '<div class="cn-join"><i class="fas fa-shield-halved"></i> You can read this community but you are not allowed to post right now.</div>'; return; }
      if (r.muted_until && new Date(r.muted_until) > new Date()) { f.innerHTML = '<div class="cn-join"><i class="fas fa-volume-xmark"></i> You are muted until ' + new Date(r.muted_until).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) + '.</div>'; return; }
    }
    f.innerHTML = '<div id="cnReplyBar"></div><div id="cnAttBar"></div><div class="cn-crow">'
      + (c.type === 'room' ? '<button class="cn-ibtn" data-act="attach" aria-label="Attach image or PDF"><i class="fas fa-paperclip"></i></button><input type="file" id="cnFile" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" hidden>' : '')
      + '<textarea id="cnInput" rows="1" maxlength="2000" placeholder="' + (c.type === 'room' ? 'Message the community' : 'Message ' + esc(c.other.name)) + '" enterkeyhint="send" aria-label="Message" autocomplete="off" autocapitalize="sentences"></textarea>'
      + '<button class="cn-send" data-act="send" aria-label="Send message"><i class="fas fa-paper-plane"></i></button></div>';
  }
  function growInput() { var t = $('cnInput'); if (!t) return; t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; }
  function onInput(e) {
    if (e.target.id === 'cnInput') { growInput(); mentionCheck(e.target); }
    else if (e.target.id === 'cnSearch') { clearTimeout(onInput.t); var v = e.target.value; onInput.t = setTimeout(function () { S.q = v.trim(); refreshCurrentTab(); }, 280); }
  }
  function onKey(e) {
    if (e.target.id === 'cnInput') {
      var pop = $('cnMention');
      if (pop && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); var bs = [].slice.call(pop.querySelectorAll('button')), i = bs.findIndex(function (b) { return b.classList.contains('on'); }); bs.forEach(function (b) { b.classList.remove('on'); }); bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].classList.add('on'); return; }
      if (pop && (e.key === 'Enter' || e.key === 'Tab')) { var on = pop.querySelector('button.on') || pop.querySelector('button'); if (on) { e.preventDefault(); pickMention(on.dataset.un); return; } }
      if (e.key === 'Escape' && pop) { pop.remove(); return; }
      if (e.key === 'Enter' && !e.shiftKey && !isCoarse()) { e.preventDefault(); send(); }
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('role') === 'button' && e.target.tagName !== 'BUTTON') { e.preventDefault(); e.target.click(); }
  }
  function onChange(e) {
    if (e.target.id === 'cnFile' && e.target.files[0]) pickFile(e.target.files[0]);
  }
  async function pickFile(f) {
    var c = S.chat; if (!c) return;
    try {
      var bar = $('cnAttBar'); if (bar) bar.innerHTML = '<div class="cn-chipf"><span class="cn-spin" style="width:16px;height:16px;margin:0;border-width:2px"></span> Preparing ' + esc(f.name) + '…</div>';
      c.attach = await upload(f, 1280);
      showAttach();
    } catch (e) { c.attach = null; var b = $('cnAttBar'); if (b) b.innerHTML = ''; toast(e && e.message && !/row-level|permission|Bucket/i.test(e.message) ? e.message : 'Could not upload that file. Check that the community storage is set up.'); }
    var fi = $('cnFile'); if (fi) fi.value = '';
  }
  function showAttach() {
    var c = S.chat, bar = $('cnAttBar'); if (!bar) return;
    bar.innerHTML = c && c.attach ? '<div class="cn-chipf"><i class="fas ' + (c.attach.type === 'image' ? 'fa-image' : 'fa-file-pdf') + '"></i><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.attach.name) + '</span><button data-act="rmattach" aria-label="Remove attachment"><i class="fas fa-xmark"></i></button></div>' : '';
  }
  function showReply() {
    var c = S.chat, bar = $('cnReplyBar'); if (!bar) return;
    if (!c || !c.replyTo) { bar.innerHTML = ''; return; }
    var m = c.replyTo;
    bar.innerHTML = '<div class="cn-reply"><i class="fas fa-reply"></i><div class="g"><b>' + esc(person(m.sender_id).name) + '</b> ' + esc(m.deleted_at ? 'removed message' : (m.body || (m.attachment_url ? 'Attachment' : ''))) + '</div><button data-act="cancelreply" aria-label="Cancel reply"><i class="fas fa-xmark"></i></button></div>';
  }

  // @mention autocomplete (suggestions come from this community's members; tagging never opens a private chat)
  async function loadMembers() {
    var c = S.chat; if (!c || c.type !== 'room' || c.members) return;
    try { var rows = (await rpc('connect_room_members', { p_room: c.id, p_limit: 200 })) || []; if (S.chat === c) { c.members = rows; rows.forEach(cachePeople); } } catch (e) { }
  }
  function mentionCheck(t) {
    var c = S.chat; var old = $('cnMention'); if (old) old.remove();
    if (!c || c.type !== 'room' || !c.members) return;
    var pre = t.value.slice(0, t.selectionStart), m = pre.match(/(?:^|\s)@([A-Za-z0-9_.]{0,30})$/); if (!m) return;
    var q = m[1].toLowerCase();
    var hits = c.members.filter(function (u) { return u.username && u.id !== S.uid && !S.blocked.has(u.id) && (u.username.toLowerCase().indexOf(q) === 0 || (u.name || '').toLowerCase().indexOf(q) === 0); }).slice(0, 6);
    if (!hits.length) return;
    var d = document.createElement('div'); d.className = 'cn-mention-pop'; d.id = 'cnMention';
    d.innerHTML = hits.map(function (u, i) { return '<button type="button" class="' + (i === 0 ? 'on' : '') + '" data-un="' + esc(u.username) + '">' + av(u, 'sm') + '<span><b>' + esc(u.name) + '</b> <span style="color:var(--dim)">@' + esc(u.username) + '</span></span></button>'; }).join('');
    $('cnComp').appendChild(d);
  }
  function pickMention(un) {
    var t = $('cnInput'); if (!t) return;
    var pre = t.value.slice(0, t.selectionStart), post = t.value.slice(t.selectionStart);
    pre = pre.replace(/@([A-Za-z0-9_.]{0,30})$/, '@' + un + ' ');
    t.value = pre + post; t.selectionStart = t.selectionEnd = pre.length; t.focus();
    var p = $('cnMention'); if (p) p.remove(); growInput();
  }

  async function send(retry) {
    var c = S.chat, t = $('cnInput'); if (!c || (!t && !retry)) return;
    var text = retry ? retry.body : t.value.trim(), att = retry ? retry.attach : c.attach, reply = retry ? retry.replyTo : c.replyTo;
    if (!text && !att) return;
    var tmp = { id: 'tmp-' + Date.now() + Math.random().toString(36).slice(2, 5), sender_id: S.uid, body: text, created_at: new Date().toISOString(), reactions: [], __pending: true, attach: att, replyTo: reply, reply: reply ? { id: reply.id, sender_name: person(reply.sender_id).name, snippet: (reply.body || '').slice(0, 90) } : null, reply_to: reply ? reply.id : null, attachment_url: att && att.url, attachment_type: att && att.type, attachment_name: att && att.name };
    if (!retry) { t.value = ''; growInput(); c.attach = null; c.replyTo = null; showAttach(); showReply(); }
    else c.pending = c.pending.filter(function (p) { return p !== retry.__tmp; });
    c.pending.push(tmp); paint({ bottom: true });
    try {
      var row;
      if (c.type === 'room') {
        var ins = { room_id: c.id, sender_id: S.uid, body: text, reply_to: reply ? reply.id : null };
        if (att) { ins.attachment_url = att.url; ins.attachment_type = att.type; ins.attachment_name = att.name; }
        var r = await sb().from('community_messages').insert(ins).select('*').single(); if (r.error) throw r.error; row = normRow(r.data);
        row.sender = person(S.uid); row.reply = tmp.reply;
      } else {
        var r2 = await sb().from('private_messages').insert({ conversation_id: c.id, sender_id: S.uid, body: text }).select('*').single(); if (r2.error) throw r2.error; row = r2.data;
      }
      if (S.chat !== c) return;
      c.pending = c.pending.filter(function (p) { return p !== tmp; });
      addMsg(row, { bottom: true });
      if (c.type === 'room') { var mr = S.myRooms.find(function (x) { return x.id === c.id; }); if (mr) mr.last_message_at = row.created_at; }
    } catch (e) {
      if (S.chat !== c) return;
      tmp.__pending = false; tmp.__failed = true; tmp.__retry = { body: text, attach: att, replyTo: reply, __tmp: tmp }; paint({ bottom: true });
      toast(human(e));
    }
  }

  /* ───────── chat: realtime (one channel per open chat, removed on close) ───────── */
  function subRoom(c) {
    var ch = sb().channel('cn-room-' + c.id + '-' + c.token);
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: 'room_id=eq.' + c.id }, async function (p) {
      if (S.chat !== c || c.byId.has(p.new.id)) return;
      var m = normRow(p.new); await ensurePeople([m.sender_id]); if (S.chat !== c) return;
      if (m.reply_to) { var rm = c.byId.get(m.reply_to); m.reply = rm ? { id: rm.id, sender_name: person(rm.sender_id).name, snippet: rm.deleted_at ? null : (rm.body || '').slice(0, 90), deleted: !!rm.deleted_at } : { sender_name: '', snippet: '…' }; }
      m.sender_role = (c.members || []).reduce(function (a, u) { return u.id === m.sender_id ? u.role : a; }, null);
      addMsg(m, {});
      if (m.sender_id !== S.uid) { var box = $('cnMsgs'); if (box && box.scrollHeight - box.scrollTop - box.clientHeight < 140 && !document.hidden) markRead(); }
    });
    ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_messages', filter: 'room_id=eq.' + c.id }, function (p) {
      if (S.chat !== c) return; var o = c.byId.get(p.new.id); if (!o) return;
      o.body = p.new.body; o.edited_at = p.new.edited_at; o.deleted_at = p.new.deleted_at; o.attachment_url = p.new.attachment_url; if (o.deleted_at) o.reactions = [];
      paint({});
    });
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions', filter: 'room_id=eq.' + c.id }, function (p) {
      if (S.chat !== c) return; var rec = p.eventType === 'DELETE' ? p.old : p.new; if (!rec || !rec.message_id) return;
      var o = c.byId.get(rec.message_id); if (!o) return; if (rec.user_id === S.uid) return;   // my own taps are applied optimistically
      applyReaction(o, rec.emoji, p.eventType === 'DELETE' ? -1 : 1, false); paint({});
    });
    ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_members', filter: 'user_id=eq.' + S.uid }, async function (p) {
      if (S.chat !== c || p.new.room_id !== c.id) return;
      try { c.room = await rpc('connect_get_room', { p_room: c.id }); chatHead(); chatComposer(); } catch (e) { }
    });
    ch.subscribe(); S.ch = ch;
  }
  function subConv(c) {
    var ch = sb().channel('cn-conv-' + c.id + '-' + c.token);
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages', filter: 'conversation_id=eq.' + c.id }, function (p) {
      if (S.chat !== c || c.byId.has(p.new.id)) return;
      addMsg(p.new, {}); if (p.new.sender_id !== S.uid) markRead();
    });
    ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_messages', filter: 'conversation_id=eq.' + c.id }, function (p) {
      var o = c.byId.get(p.new.id); if (o) { o.read_at = p.new.read_at; paint({}); }
    });
    ch.subscribe(); S.ch = ch;
  }
  var markT;
  function markRead() {
    clearTimeout(markT);
    markT = setTimeout(async function () {
      var c = S.chat; if (!c || document.hidden || !S.active) return;
      try {
        if (c.type === 'room') { if (c.room && c.room.is_member) { await rpc('connect_mark_room_read', { p_room: c.id }); var r = S.myRooms.find(function (x) { return x.id === c.id; }); if (r && r.unread) { r.unread = 0; if (S.tab === 'communities') refreshRowOnly(); } } }
        else { await rpc('connect_mark_conversation_read', { p_conv: c.id }); var cv = S.convs.find(function (x) { return x.id === c.id; }); if (cv) cv.unread = 0; refreshUnread(); }
      } catch (e) { }
    }, 400);
  }
  function refreshRowOnly() { if (S.tab === 'communities' && S.myRooms.length) { var l = listHost(); if (l) l.innerHTML = S.myRooms.map(function (r) { return roomRow(r); }).join(''); } }

  // user-level channel: notifications, invitations and unread private messages. One channel, deduplicated.
  function subUser() {
    if (S.userCh || !S.uid) return;
    var uid = S.uid, ch = sb().channel('cn-user-' + uid);
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_notifications', filter: 'user_id=eq.' + uid }, function (p) {
      var n = p.new; if (n.kind !== 'message') { try { toast(n.body || 'New notification'); } catch (e) { } }
      refreshUnread(); if (S.active && S.tab === 'notifs') tabNotifs().catch(function () { });
      if (S.active && (n.kind === 'moderation') && S.chat && S.chat.type === 'room' && S.chat.id === n.room_id) rpc('connect_get_room', { p_room: n.room_id }).then(function (r) { if (S.chat && S.chat.id === n.room_id) { S.chat.room = r; chatHead(); chatComposer(); } }).catch(function () { });
    });
    ['to_user', 'from_user'].forEach(function (col) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'private_chat_invites', filter: col + '=eq.' + uid }, function () {
        refreshUnread(); if (S.active && (S.tab === 'invites' || S.tab === 'private')) refreshCurrentTab();
      });
    });
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_invites', filter: 'invitee_id=eq.' + uid }, function () { refreshUnread(); if (S.active && S.tab === 'invites') tabInvites().catch(function () { }); });
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, function (p) {   // RLS only delivers messages from my own conversations
      if (p.new.sender_id === uid) return;
      refreshUnread(); if (S.active && S.tab === 'private' && !(S.chat && S.chat.id === p.new.conversation_id)) tabPrivate().catch(function () { });
    });
    ch.subscribe(); S.userCh = ch;
  }
  function unsubUser() { if (S.userCh) { try { sb().removeChannel(S.userCh); } catch (e) { } S.userCh = null; } if (S.poll) { clearInterval(S.poll); S.poll = null; } }
  async function refreshUnread() {
    if (!S.uid || !window.sb) return;
    try { var u = await rpc('connect_unread_summary'); if (u) { S.unread = { notifications: +u.notifications || 0, invites: +u.invites || 0, private: +u.private || 0 }; if (S.active) drawSideBadgesOnly(); updateBadges(); } } catch (e) { }
  }
  function drawSideBadgesOnly() {
    var map = { invites: S.unread.invites, notifs: S.unread.notifications, private: S.unread.private };
    document.querySelectorAll('.cn-tab').forEach(function (b) {
      var n = map[b.dataset.tab] || 0, d = b.querySelector('.cn-dot');
      if (n) { if (!d) { d = document.createElement('span'); d.className = 'cn-dot'; b.appendChild(d); } d.textContent = n > 99 ? '99+' : n; } else if (d) d.remove();
    });
  }

  /* ───────── reactions ───────── */
  function applyReaction(m, emoji, delta, mine) {
    m.reactions = m.reactions || [];
    var r = m.reactions.find(function (x) { return x.emoji === emoji; });
    if (!r) { if (delta < 0) return; r = { emoji: emoji, count: 0, mine: false }; m.reactions.push(r); }
    r.count += delta; if (mine !== null && mine !== undefined) r.mine = delta > 0 ? true : false;
    if (r.count <= 0) m.reactions = m.reactions.filter(function (x) { return x !== r; });
  }
  async function toggleReaction(mid, emoji) {
    var c = S.chat; if (!c || c.type !== 'room') return; var m = c.byId.get(mid); if (!m || m.deleted_at) return;
    if (!c.room.is_member) { toast('Join the community to react'); return; }
    var has = (m.reactions || []).some(function (r) { return r.emoji === emoji && r.mine; });
    applyReaction(m, emoji, has ? -1 : 1, true); paint({});
    try {
      if (has) { var d = await sb().from('message_reactions').delete().eq('message_id', mid).eq('user_id', S.uid).eq('emoji', emoji); if (d.error) throw d.error; }
      else { var i = await sb().from('message_reactions').insert({ message_id: mid, user_id: S.uid, room_id: c.id, emoji: emoji }); if (i.error) throw i.error; }
    } catch (e) { applyReaction(m, emoji, has ? 1 : -1, true); if (has) { var rr = (m.reactions || []).find(function (x) { return x.emoji === emoji; }); if (rr) rr.mine = true; } paint({}); toast(human(e)); }
  }

  /* ───────── sheets: message actions, user actions ───────── */
  function msgSheet(mid) {
    var c = S.chat; if (!c) return; var m = c.byId.get(mid); if (!m) return;
    var mine = m.sender_id === S.uid, p = person(m.sender_id), room = c.room, canMod = false, rank = 0;
    var myRole = room && room.my_role, isAdmin = S.me && S.me.is_admin;
    if (c.type === 'room' && room) {
      var R = { member: 0, moderator: 1, host: 3, owner: 3 };
      var my = isAdmin ? 9 : (myRole ? R[myRole] : -1), their = R[m.sender_role] || 0; canMod = !mine && my >= 1 && my > their;
    }
    var h = '';
    if (c.type === 'room' && !m.deleted_at && room.is_member && room.status === 'active') h += '<div class="cn-rxbar">' + REACTIONS.map(function (e) { return '<button data-x-rx="' + e + '" aria-label="React ' + e + '">' + e + '</button>'; }).join('') + '</div>';
    if (!m.deleted_at) {
      if (c.type === 'room' && room.is_member && room.status === 'active' && !room.restricted) h += '<button class="cn-act" data-x="reply"><i class="fas fa-reply"></i> Reply</button>';
      if (m.body) h += '<button class="cn-act" data-x="copy"><i class="fas fa-copy"></i> Copy text</button>';
      if (!mine && c.type === 'room' && room.is_member && room.status === 'active') h += '<button class="cn-act" data-x="private"><i class="fas fa-lock"></i> Chat Privately</button>';
      if (mine && c.type === 'room' && m.body && !m.attachment_url) h += '<button class="cn-act" data-x="edit"><i class="fas fa-pen"></i> Edit</button>';
    }
    if (c.type === 'room' && (mine || canMod) && !m.deleted_at) h += '<button class="cn-act warn" data-x="delete"><i class="fas fa-trash"></i> ' + (mine ? 'Delete message' : 'Remove message') + '</button>';
    if (!mine && !m.deleted_at) {
      h += '<hr><button class="cn-act" data-x="user"><i class="fas fa-user"></i> View ' + esc(p.name) + '</button><button class="cn-act warn" data-x="report"><i class="fas fa-flag"></i> Report message</button>';
    }
    var o = overlay('<h3>' + esc(mine ? 'Your message' : p.name) + '</h3><p class="sub">' + esc((m.body || '').slice(0, 120)) + '</p>' + h);
    o.addEventListener('click', async function (e) {
      var rx = e.target.closest('[data-x-rx]'); if (rx) { closeOverlay(); toggleReaction(mid, rx.dataset.xRx); return; }
      var b = e.target.closest('[data-x]'); if (!b) return; var a = b.dataset.x; closeOverlay();
      if (a === 'reply') { c.replyTo = m; showReply(); var t = $('cnInput'); if (t) t.focus(); }
      else if (a === 'copy') { try { await navigator.clipboard.writeText(m.body); toast('Copied'); } catch (er) { toast('Could not copy'); } }
      else if (a === 'private') requestPrivate(m.sender_id, c.id, m.id);
      else if (a === 'edit') editSheet(m);
      else if (a === 'delete') deleteMsg(m, mine);
      else if (a === 'user') userSheet(m.sender_id);
      else if (a === 'report') reportSheet('message', m.id, m.sender_id);
    });
  }
  function editSheet(m) {
    var o = overlay('<h3>Edit message</h3><div class="cn-field"><textarea id="cnEdit" maxlength="2000" autofocus>' + esc(m.body) + '</textarea></div><div class="cn-btns"><button class="cn-btn ghost" data-x="0">Cancel</button><button class="cn-btn" data-x="1">Save</button></div>');
    o.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === '0') return closeOverlay();
      var v = $('cnEdit').value.trim(); if (!v) return toast('Message cannot be empty');
      try { await rpc('connect_edit_message', { p_id: m.id, p_body: v }); m.body = v; m.edited_at = new Date().toISOString(); closeOverlay(); paint({}); } catch (er) { toast(human(er)); }
    });
  }
  async function deleteMsg(m, mine) {
    var ok = await confirmBox(mine ? 'Delete this message?' : 'Remove this message?', mine ? 'It will be removed for everyone in the community.' : 'The member will be told a moderator removed it.', mine ? 'Delete' : 'Remove', true);
    if (!ok) return;
    try { await rpc('connect_delete_message', { p_id: m.id, p_reason: null }); m.deleted_at = new Date().toISOString(); m.body = ''; m.attachment_url = null; m.reactions = []; paint({}); } catch (e) { toast(human(e)); }
  }
  async function userSheet(uid) {
    var c = S.chat; await ensurePeople([uid]); var p = person(uid), me = uid === S.uid, blocked = S.blocked.has(uid);
    var room = c && c.type === 'room' ? c.room : null, h = '';
    var member = room && (c.members || []).find(function (u) { return u.id === uid; });
    var role = member ? member.role : null;
    var isAdmin = S.me && S.me.is_admin, R = { member: 0, moderator: 1, host: 3, owner: 3 };
    var my = room ? (isAdmin ? 9 : (room.my_role ? R[room.my_role] : -1)) : -1, their = role ? R[role] : 0;
    var canMod = room && !me && my >= 1 && my > their && member;
    if (!me) {
      if (room && room.is_member && room.status === 'active') h += '<button class="cn-act" data-x="private"><i class="fas fa-lock"></i> Chat Privately</button>';
      if (room && room.is_member && p.username) h += '<button class="cn-act" data-x="mention"><i class="fas fa-at"></i> Mention in chat</button>';
      if (canMod) {
        h += '<hr>';
        if (member.muted_until && new Date(member.muted_until) > new Date()) h += '<button class="cn-act" data-m="unmute"><i class="fas fa-volume-high"></i> Unmute</button>'; else h += '<button class="cn-act" data-m="mute" data-min="60"><i class="fas fa-volume-xmark"></i> Mute for 1 hour</button><button class="cn-act" data-m="mute" data-min="1440"><i class="fas fa-volume-xmark"></i> Mute for 24 hours</button>';
        h += member.restricted ? '<button class="cn-act" data-m="unrestrict"><i class="fas fa-unlock"></i> Lift restriction</button>' : '<button class="cn-act" data-m="restrict"><i class="fas fa-hand"></i> Restrict from posting</button>';
        h += '<button class="cn-act warn" data-m="remove"><i class="fas fa-user-minus"></i> Remove from community</button>';
        if (my >= 3) { h += '<button class="cn-act warn" data-m="ban"><i class="fas fa-ban"></i> Ban from community</button>'; h += role === 'moderator' ? '<button class="cn-act" data-m="remove_moderator"><i class="fas fa-user-shield"></i> Remove as moderator</button>' : '<button class="cn-act" data-m="make_moderator"><i class="fas fa-user-shield"></i> Make moderator</button>'; }
      }
      h += '<hr>' + (blocked ? '<button class="cn-act" data-x="unblock"><i class="fas fa-circle-check"></i> Unblock</button>' : '<button class="cn-act warn" data-x="block"><i class="fas fa-user-slash"></i> Block</button>') + '<button class="cn-act warn" data-x="report"><i class="fas fa-flag"></i> Report user</button>';
    }
    var o = overlay('<div style="display:flex;gap:14px;align-items:center;margin-bottom:10px">' + av(p, 'lg') + '<div style="min-width:0"><h3 style="margin:0">' + esc(p.name) + '</h3><div class="sub" style="margin:2px 0">' + (p.username ? '@' + esc(p.username) : '') + (role && role !== 'member' ? ' ' + (ROLE_CHIP[role] || '') : '') + '</div></div></div>' + (h || '<p class="sub">This is you.</p>'));
    o.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-x],[data-m]'); if (!b) return;
      if (b.dataset.m) {
        var act = b.dataset.m, destructive = (act === 'remove' || act === 'ban');
        closeOverlay();
        if (destructive) { var ok = await confirmBox(act === 'ban' ? 'Ban ' + p.name + '?' : 'Remove ' + p.name + '?', act === 'ban' ? 'They will not be able to rejoin this community.' : 'They will be removed from this community. They can rejoin if the community is public.', act === 'ban' ? 'Ban' : 'Remove', true); if (!ok) return; }
        try { await rpc('connect_moderate', { p_room: room.id, p_target: uid, p_action: act, p_reason: null, p_minutes: b.dataset.min ? +b.dataset.min : null }); toast('Done'); c.members = null; loadMembers(); } catch (er) { toast(human(er)); }
        return;
      }
      var x = b.dataset.x; closeOverlay();
      if (x === 'private') requestPrivate(uid, room && room.id, null);
      else if (x === 'mention') { var t = $('cnInput'); if (t) { t.value += (t.value && !/\s$/.test(t.value) ? ' ' : '') + '@' + p.username + ' '; t.focus(); growInput(); } }
      else if (x === 'block') { if (await confirmBox('Block ' + p.name + '?', 'You will no longer see their messages and neither of you can send the other a private chat invitation or message.', 'Block', true)) blockUser(uid, true); }
      else if (x === 'unblock') blockUser(uid, false);
      else if (x === 'report') reportSheet('user', null, uid);
    });
  }
  async function blockUser(uid, on) {
    try { await rpc(on ? 'connect_block_user' : 'connect_unblock_user', { p_user: uid }); if (on) S.blocked.add(uid); else S.blocked.delete(uid); toast(on ? 'User blocked' : 'User unblocked'); if (S.chat) { if (S.chat.type === 'private' && on) { closeChat(); setView('list'); drawMainPlaceholder(); } else paint({}); } if (S.tab === 'private') tabPrivate().catch(function () { }); refreshUnread(); } catch (e) { toast(human(e)); }
  }
  function reportSheet(kind, mid, uid) {
    var reasons = [['spam', 'Spam'], ['harassment', 'Harassment or bullying'], ['hate', 'Hate speech'], ['sexual', 'Sexual content'], ['violence', 'Violence or threats'], ['scam', 'Scam or fraud'], ['other', 'Something else']];
    var o = overlay('<h3>Report ' + (kind === 'user' ? 'user' : 'message') + '</h3><p class="sub">Reports go to the YAPS moderators. The person is not told who reported them.</p><div class="cn-field"><label for="cnRsn">Reason</label><select id="cnRsn">' + reasons.map(function (r) { return '<option value="' + r[0] + '">' + r[1] + '</option>'; }).join('') + '</select></div><div class="cn-field"><label for="cnRd">Details (optional)</label><textarea id="cnRd" maxlength="1000"></textarea></div><div class="cn-btns"><button class="cn-btn ghost" data-x="0">Cancel</button><button class="cn-btn danger" data-x="1">Send report</button></div>');
    o.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === '0') return closeOverlay();
      try { await rpc('connect_report', { p_kind: kind, p_message: mid, p_user: uid, p_reason: $('cnRsn').value, p_details: $('cnRd').value.trim() || null }); closeOverlay(); toast('Report sent. Thank you.'); } catch (er) { toast(human(er)); }
    });
  }

  /* ───────── private chat invitation flow ───────── */
  async function requestPrivate(uid, roomId, mid) {
    if (!requireSignIn()) return;
    await ensurePeople([uid]); var p = person(uid);
    var ok = await confirmBox('Chat privately with ' + p.name + '?', 'We will send ' + p.name + ' a private chat invitation. A private conversation only opens if they accept.', 'Send invitation');
    if (!ok) return;
    try {
      var r = await rpc('connect_request_private_chat', { p_to: uid, p_room: roomId || null, p_message: mid || null });
      if (r.status === 'sent') toast('Invitation sent. You can chat once ' + p.name + ' accepts.');
      else if (r.status === 'already_pending') toast('You already invited ' + p.name + '. Waiting for a reply.');
      else if (r.status === 'incoming_pending') { toast(p.name + ' already invited you. Check Invitations.'); setTab('invites'); }
      else if (r.status === 'exists') { toast('You already have a private chat.'); setTab('private'); openConv(r.conversation_id); }
      refreshUnread();
    } catch (e) { toast(human(e)); }
  }

  /* ───────── join / leave / room info ───────── */
  async function joinRoom(id, code) {
    if (!requireSignIn()) return false;
    try {
      var r = await rpc('connect_join_room', { p_room: id, p_code: code || null });
      toast('Joined ' + (r && r.name ? r.name : 'community'));
      if (S.chat && S.chat.id === id) { S.chat.room = r; chatHead(); chatComposer(); loadMembers(); if (!S.ch) subRoom(S.chat); }
      var d = S.dir; Object.keys(d).forEach(function (k) { (d[k].rows || []).forEach(function (x) { if (x.id === id) { x.is_member = true; x.member_count = r.member_count; } }); });
      if (S.active && ['artists', 'djs', 'events'].indexOf(S.tab) !== -1) tabDirectory(S.tab === 'artists' ? 'artist' : S.tab === 'djs' ? 'dj' : 'event').catch(function () { });
      cnDecorateProfiles();
      return true;
    } catch (e) { toast(human(e)); return false; }
  }
  async function leaveRoom() {
    var c = S.chat; if (!c || c.type !== 'room') return;
    if (!await confirmBox('Leave ' + c.room.name + '?', 'You can join again later if the community is public.', 'Leave', true)) return;
    try { await rpc('connect_leave_room', { p_room: c.id }); toast('You left the community'); closeChat(); setView('list'); drawMainPlaceholder(); S.myRooms = S.myRooms.filter(function (r) { return r.id !== c.id; }); refreshCurrentTab(); cnDecorateProfiles(); } catch (e) { toast(human(e)); }
  }
  async function roomInfo() {
    var c = S.chat; if (!c || c.type !== 'room' || !c.room) return; var r = c.room;
    var boss = r.my_role === 'owner' || r.my_role === 'host' || (S.me && S.me.is_admin), mod = boss || r.my_role === 'moderator';
    var h = '<div style="display:flex;gap:14px;align-items:center;margin-bottom:8px">' + av({ name: r.name, avatar_url: r.image_url }, 'lg', true) + '<div style="min-width:0"><h3 style="margin:0">' + esc(r.name) + '</h3><div class="sub" style="margin:2px 0">' + kindLabel(r.kind) + ' community · ' + (r.member_count || 0) + ' members</div></div></div>';
    if (r.description) h += '<p class="sub" style="color:var(--text)">' + esc(r.description) + '</p>';
    if (r.kind === 'event') h += '<p class="sub">Visibility: <b>' + esc(r.visibility) + '</b>' + (r.starts_at ? ' · starts ' + new Date(r.starts_at).toLocaleString() : '') + '. Event rooms are not listed in the public Events section.</p>';
    if (r.is_member) {
      h += '<div class="cn-field"><label>Notifications for this community</label><div class="cn-seg" id="cnNotify">' + [['all', 'All messages'], ['mentions', 'Mentions only'], ['none', 'Off']].map(function (x) { return '<button class="' + (r.notify === x[0] ? 'on' : '') + '" data-nf="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>';
    }
    if (mod && r.kind === 'event') h += '<button class="cn-act" data-x="invite"><i class="fas fa-user-plus"></i> Invite people</button>';
    if (boss && r.visibility !== 'private' && r.kind === 'event') h += '<button class="cn-act" data-x="share"><i class="fas fa-link"></i> Copy invite link</button>';
    if (boss) h += '<button class="cn-act" data-x="edit"><i class="fas fa-pen"></i> Edit community</button>';
    if (boss && r.kind === 'event') h += r.status === 'active' ? '<button class="cn-act warn" data-x="close"><i class="fas fa-lock"></i> Close room (read-only)</button>' : '<button class="cn-act" data-x="reopen"><i class="fas fa-lock-open"></i> Reopen room</button>';
    if (boss && r.kind === 'event' && r.status !== 'archived') h += '<button class="cn-act warn" data-x="archive"><i class="fas fa-box-archive"></i> Archive room</button>';
    if (r.is_member && r.my_role !== 'owner' && r.my_role !== 'host') h += '<button class="cn-act warn" data-x="leave"><i class="fas fa-right-from-bracket"></i> Leave community</button>';
    h += '<hr><div class="cn-sec" style="padding-left:0">Members</div><div id="cnMembers"><div class="cn-state" style="padding:12px"><div class="cn-spin"></div></div></div>';
    var o = overlay(h);
    o.addEventListener('click', async function (e) {
      var nf = e.target.closest('[data-nf]');
      if (nf) { try { await rpc('connect_set_room_notify', { p_room: r.id, p_notify: nf.dataset.nf }); r.notify = nf.dataset.nf; o.querySelectorAll('[data-nf]').forEach(function (b) { b.classList.toggle('on', b === nf); }); toast('Saved'); } catch (er) { toast(human(er)); } return; }
      var mem = e.target.closest('[data-member]'); if (mem) { closeOverlay(); userSheet(mem.dataset.member); return; }
      var b = e.target.closest('[data-x]'); if (!b) return; var x = b.dataset.x; closeOverlay();
      if (x === 'leave') leaveRoom();
      else if (x === 'edit') roomForm(r);
      else if (x === 'invite') inviteSheet(r);
      else if (x === 'share') { try { var code = await rpc('connect_room_code', { p_room: r.id }); var u = location.origin + location.pathname + '?room=' + r.id + (code && r.visibility === 'unlisted' ? '&code=' + code : ''); await navigator.clipboard.writeText(u); toast('Invite link copied'); } catch (er) { toast('Could not copy the link'); } }
      else if (x === 'close' || x === 'archive') { if (await confirmBox(x === 'close' ? 'Close this room?' : 'Archive this room?', x === 'close' ? 'Members can still read it but nobody can post.' : 'The room disappears from members\' lists.', x === 'close' ? 'Close room' : 'Archive', true)) setStatus(r, x === 'close' ? 'closed' : 'archived'); }
      else if (x === 'reopen') setStatus(r, 'active');
    });
    try {
      var members = (await rpc('connect_room_members', { p_room: r.id, p_limit: 200 })) || []; c.members = members; members.forEach(cachePeople);
      var box = $('cnMembers'); if (box) box.innerHTML = members.map(function (u) { return '<div class="cn-row" role="button" tabindex="0" data-member="' + u.id + '">' + av(u, 'sm') + '<div class="cn-info"><div class="cn-t"><span class="n">' + esc(u.name) + '</span>' + (ROLE_CHIP[u.role] || '') + (u.status !== 'active' ? '<span class="cn-chip r">' + esc(u.status) + '</span>' : '') + (u.muted_until && new Date(u.muted_until) > new Date() ? '<span class="cn-chip">muted</span>' : '') + '</div></div></div>'; }).join('') || '<div class="cn-state">No members to show.</div>';
    } catch (e) { var bx = $('cnMembers'); if (bx) bx.innerHTML = '<div class="cn-state" style="padding:12px">Members are only visible to members.</div>'; }
  }
  async function setStatus(r, st) {
    try { await rpc('connect_set_room_status', { p_room: r.id, p_status: st }); toast(st === 'active' ? 'Room reopened' : st === 'closed' ? 'Room closed' : 'Room archived'); var rr = await rpc('connect_get_room', { p_room: r.id }); if (S.chat && S.chat.id === r.id) { S.chat.room = rr; chatHead(); chatComposer(); } refreshCurrentTab(); } catch (e) { toast(human(e)); }
  }
  function inviteSheet(r) {
    var o = overlay('<h3>Invite to ' + esc(r.name) + '</h3><p class="sub">Search for artists, DJs or listeners by name or username.</p><div class="cn-field"><input id="cnIq" type="search" placeholder="Search people" autofocus autocomplete="off"></div><div id="cnIres"></div>');
    var t;
    o.addEventListener('input', function (e) {
      if (e.target.id !== 'cnIq') return; clearTimeout(t); var v = e.target.value.trim();
      t = setTimeout(async function () {
        if (v.length < 2) { $('cnIres').innerHTML = ''; return; }
        try { var rows = (await rpc('connect_search_users', { p_q: v })) || []; rows.forEach(cachePeople); $('cnIres').innerHTML = rows.length ? rows.map(function (u) { return '<div class="cn-row" style="cursor:default">' + av(u, 'sm') + '<div class="cn-info"><div class="cn-t"><span class="n">' + esc(u.name) + '</span></div><div class="cn-s">@' + esc(u.username || '') + '</div></div><button class="cn-btn sm" data-inv="' + u.id + '">Invite</button></div>'; }).join('') : '<div class="cn-state" style="padding:14px">Nobody found.</div>'; } catch (er) { $('cnIres').innerHTML = '<div class="cn-state" style="padding:14px">' + esc(human(er)) + '</div>'; }
      }, 300);
    });
    o.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-inv]'); if (!b) return; b.disabled = true;
      try { await rpc('connect_invite_to_room', { p_room: r.id, p_invitee: b.dataset.inv }); b.textContent = 'Invited'; } catch (er) { b.disabled = false; toast(human(er)); }
    });
  }

  /* ───────── forms: event room, edit room, DJ profile, artist verification, code, admin ───────── */
  function imageField(id, current) {
    return '<div class="cn-field"><label>Cover image (optional)</label><div style="display:flex;gap:10px;align-items:center"><span id="' + id + 'Prev">' + (current ? av({ name: '?', avatar_url: current }, '', true) : '') + '</span><input type="file" id="' + id + '" accept="image/jpeg,image/png,image/webp" style="font-size:13px;color:var(--muted)"></div></div>';
  }
  function roomForm(room) {
    var edit = !!room, vis = room ? room.visibility : 'public';
    var o = overlay('<h3>' + (edit ? 'Edit community' : 'Create event room') + '</h3><p class="sub">' + (edit ? '' : 'Event rooms are temporary chat rooms for shows and listening parties. Creating one does <b>not</b> publish anything in the public Events section.') + '</p>'
      + '<div class="cn-field"><label for="cnFn">Name</label><input id="cnFn" maxlength="80" value="' + esc(room ? room.name : '') + '" autofocus></div>'
      + '<div class="cn-field"><label for="cnFd">Description</label><textarea id="cnFd" maxlength="500">' + esc(room ? room.description || '' : '') + '</textarea></div>'
      + ((!edit || room.kind === 'event') ? '<div class="cn-field"><label>Who can join</label><div class="cn-seg" id="cnVis"><button data-v="public" class="' + (vis === 'public' ? 'on' : '') + '">Public<small>Listed for everyone</small></button><button data-v="unlisted" class="' + (vis === 'unlisted' ? 'on' : '') + '">Unlisted<small>Link or code</small></button><button data-v="private" class="' + (vis === 'private' ? 'on' : '') + '">Private<small>Invite only</small></button></div></div>' : '')
      + (!edit ? '<div class="cn-field"><label for="cnFs">Starts (optional)</label><input type="datetime-local" id="cnFs"></div>' : '')
      + imageField('cnFi', room && room.image_url)
      + '<div class="cn-btns"><button class="cn-btn ghost" data-x="0">Cancel</button><button class="cn-btn" data-x="1">' + (edit ? 'Save' : 'Create room') + '</button></div>');
    var chosen = vis, file = null;
    o.addEventListener('click', async function (e) {
      var v = e.target.closest('[data-v]'); if (v) { chosen = v.dataset.v; o.querySelectorAll('[data-v]').forEach(function (b) { b.classList.toggle('on', b === v); }); return; }
      var b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === '0') return closeOverlay();
      var name = $('cnFn').value.trim(); if (name.length < 2) return toast('Please enter a name');
      b.disabled = true; b.textContent = 'Saving…';
      try {
        var img = room ? room.image_url : null; var f = $('cnFi').files[0]; if (f) img = (await upload(f, 800)).url;
        if (edit) { await rpc('connect_update_room', { p_room: room.id, p_name: name, p_desc: $('cnFd').value.trim(), p_image: img, p_visibility: chosen }); closeOverlay(); toast('Saved'); var rr = await rpc('connect_get_room', { p_room: room.id }); if (S.chat && S.chat.id === room.id) { S.chat.room = rr; chatHead(); } refreshCurrentTab(); }
        else {
          var st = $('cnFs').value ? new Date($('cnFs').value).toISOString() : null;
          var res = await rpc('connect_create_event_room', { p_name: name, p_desc: $('cnFd').value.trim(), p_image: img, p_visibility: chosen, p_starts: st, p_ends: null });
          closeOverlay(); toast('Event room created'); setTab('communities'); setTimeout(function () { openRoom(res.room_id); }, 200);
        }
      } catch (er) { b.disabled = false; b.textContent = edit ? 'Save' : 'Create room'; toast(er && er.message && !er.code && !/connect_/.test(er.message) ? er.message : human(er)); }
    });
  }
  function djForm() {
    var me = S.me || {};
    var o = overlay('<h3>' + (me.dj_enabled ? 'Edit DJ profile' : 'Create your DJ profile') + '</h3><p class="sub">Your DJ profile is separate from any artist account. It gives you your own community that you manage and moderate.</p>'
      + '<div class="cn-field"><label for="cnDn">DJ name</label><input id="cnDn" maxlength="60" value="' + esc(me.dj_stage_name || '') + '" autofocus></div>'
      + '<div class="cn-field"><label for="cnDc">City</label><input id="cnDc" maxlength="60" value="' + esc(me.dj_city || '') + '" placeholder="Kampala"></div>'
      + '<div class="cn-field"><label for="cnDb">About you</label><textarea id="cnDb" maxlength="500">' + esc(me.dj_bio || '') + '</textarea></div>' + imageField('cnDi', me.dj_image_url)
      + '<div class="cn-btns"><button class="cn-btn ghost" data-x="0">Cancel</button><button class="cn-btn" data-x="1">' + (me.dj_enabled ? 'Save' : 'Create DJ profile') + '</button></div>');
    o.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === '0') return closeOverlay();
      var name = $('cnDn').value.trim(); if (name.length < 2) return toast('Please enter your DJ name');
      b.disabled = true; b.textContent = 'Saving…';
      try {
        var img = me.dj_image_url || null; var f = $('cnDi').files[0]; if (f) img = (await upload(f, 800)).url;
        var r = await rpc('connect_save_dj_profile', { p_name: name, p_bio: $('cnDb').value.trim(), p_city: $('cnDc').value.trim(), p_image: img });
        S.me = await rpc('connect_ensure_profile'); closeOverlay(); toast('DJ profile saved'); S.dir.dj = null; setTab('djs'); cnDecorateProfiles();
      } catch (er) { b.disabled = false; b.textContent = 'Save'; toast(er && er.message && !er.code && !/connect_/.test(er.message) ? er.message : human(er)); }
    });
  }
  function artistVerifyForm() {
    var o = overlay('<h3>Request artist verification</h3><p class="sub">Tell the YAPS team who you are (stage name, links to your music or socials). Once approved, your permanent community opens and you can create event rooms.</p><div class="cn-field"><textarea id="cnAn" maxlength="500" autofocus placeholder="Stage name, links, anything that helps us verify you"></textarea></div><div class="cn-btns"><button class="cn-btn ghost" data-x="0">Cancel</button><button class="cn-btn" data-x="1">Send request</button></div>');
    o.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === '0') return closeOverlay();
      try { await rpc('connect_request_artist_verification', { p_note: $('cnAn').value.trim() }); S.me = await rpc('connect_ensure_profile'); closeOverlay(); toast('Request sent'); refreshCurrentTab(); } catch (er) { toast(human(er)); }
    });
  }
  function codeForm() {
    var o = overlay('<h3>Join with a code</h3><p class="sub">Enter the code (or paste the invite link) an event host shared with you.</p><div class="cn-field"><input id="cnCode" autofocus autocomplete="off" placeholder="e.g. 3fa85f64"></div><div class="cn-btns"><button class="cn-btn ghost" data-x="0">Cancel</button><button class="cn-btn" data-x="1">Find room</button></div>');
    o.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === '0') return closeOverlay();
      var v = $('cnCode').value.trim(); var m = v.match(/[?&]code=([A-Za-z0-9]+)/); if (m) v = m[1];
      if (!v) return;
      try { var r = await rpc('connect_find_room_by_code', { p_code: v }); closeOverlay(); setTab('communities'); openRoom(r.id, v); } catch (er) { toast('No room found for that code'); }
    });
  }
  function settingsSheet() {
    var me = S.me || {};
    var tog = function (k, label) { return '<label class="cn-tog"><span>' + label + '</span><input type="checkbox" data-pref="' + k + '"' + (me[k] ? ' checked' : '') + '></label>'; };
    var o = overlay('<h3>Connect settings</h3><p class="sub">Choose which Connect activity notifies you.</p>' + tog('allow_private_invites', 'Allow private chat invitations') + tog('notify_invites', 'Notify me about invitations') + tog('notify_mentions', 'Notify me when I am @mentioned') + tog('notify_replies', 'Notify me about replies') + tog('notify_private', 'Notify me about private messages')
      + '<hr><div class="cn-sec" style="padding-left:0">Blocked people</div><div id="cnBlocks"></div>');
    var drawB = function () { var ids = Array.from(S.blocked); $('cnBlocks').innerHTML = ids.length ? ids.map(function (id) { var p = person(id); return '<div class="cn-row" style="cursor:default">' + av(p, 'sm') + '<div class="cn-info"><div class="cn-t"><span class="n">' + esc(p.name) + '</span></div></div><button class="cn-btn sm ghost" data-unb="' + id + '">Unblock</button></div>'; }).join('') : '<p class="sub">You have not blocked anyone.</p>'; };
    ensurePeople(Array.from(S.blocked)).then(drawB);
    o.addEventListener('change', async function (e) {
      var k = e.target.dataset.pref; if (!k) return; var patch = {}; patch[k] = e.target.checked;
      var r = await sb().from('connect_profiles').update(patch).eq('user_id', S.uid); if (r.error) { e.target.checked = !e.target.checked; toast(human(r.error)); } else { me[k] = e.target.checked; toast('Saved'); }
    });
    o.addEventListener('click', async function (e) { var b = e.target.closest('[data-unb]'); if (b) { await blockUser(b.dataset.unb, false); drawB(); } });
  }
  function adminOpenForm() {
    var o = overlay('<h3>Open a community</h3><p class="sub">For an artist or DJ that has no YAPS account yet. The name must match how it appears in the app so it shows on their profile page. You (and other admins) moderate it.</p><div class="cn-field"><label>Type</label><div class="cn-seg" id="cnAk"><button data-k="artist" class="on">Artist</button><button data-k="dj">DJ</button></div></div><div class="cn-field"><label for="cnAn2">Name (exactly as shown in the app)</label><input id="cnAn2" maxlength="80" autofocus></div><div class="cn-field"><label for="cnAd">Description (optional)</label><textarea id="cnAd" maxlength="500"></textarea></div><div class="cn-btns"><button class="cn-btn ghost" data-x="0">Cancel</button><button class="cn-btn" data-x="1">Open community</button></div>');
    var kind = 'artist';
    o.addEventListener('click', async function (e) {
      var k = e.target.closest('[data-k]'); if (k) { kind = k.dataset.k; o.querySelectorAll('[data-k]').forEach(function (b) { b.classList.toggle('on', b === k); }); return; }
      var b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === '0') return closeOverlay();
      var n = $('cnAn2').value.trim(); if (n.length < 2) return toast('Enter a name');
      var img = null; try { img = adminImageFor(kind, n); } catch (er) { }
      try { var r = await rpc('connect_admin_open_room', { p_kind: kind, p_key: n, p_name: n, p_image: img, p_desc: $('cnAd').value.trim() }); closeOverlay(); toast('Community opened'); cnDecorateProfiles(); openRoom(r.room_id); } catch (er) { toast(human(er)); }
    });
  }
  function adminImageFor(kind, name) {   // reuse the app's own artist photo when we can
    if (kind === 'artist') { var a = appArtists().find(function (x) { return norm(x.name) === norm(name); }); return a && /^https?:/.test(a.img) ? a.img : null; }
    return null;
  }

  /* ───────── click router ───────── */
  async function onClick(e) {
    var t = e.target;
    var el;
    if ((el = t.closest('[data-tab]')) && !t.closest('#cnOv')) { setTab(el.dataset.tab); return; }
    if ((el = t.closest('[data-join]'))) { e.stopPropagation(); el.disabled = true; var ok = await joinRoom(el.dataset.join); if (ok) openRoom(el.dataset.join); else el.disabled = false; return; }
    if ((el = t.closest('[data-rx]'))) { toggleReaction(el.dataset.mid, el.dataset.rx); return; }
    if ((el = t.closest('[data-lb]'))) { var lb = document.createElement('div'); lb.className = 'cn-lb'; lb.innerHTML = '<img alt="" src="' + esc(el.dataset.lb) + '">'; lb.onclick = function () { lb.remove(); }; document.body.appendChild(lb); return; }
    if ((el = t.closest('[data-jump]'))) { var tg = document.querySelector('.cn-msg[data-id="' + el.dataset.jump + '"]'); if (tg) { tg.scrollIntoView({ block: 'center', behavior: 'smooth' }); tg.style.outline = '2px solid var(--accent-light)'; setTimeout(function () { tg.style.outline = ''; }, 1400); } else toast('That message is further up. Scroll up to load more.'); return; }
    if ((el = t.closest('[data-un]')) && $('cnMention')) { pickMention(el.dataset.un); return; }
    if ((el = t.closest('[data-user]'))) { userSheet(el.dataset.user); return; }
    if ((el = t.closest('[data-room]'))) { openRoom(el.dataset.room); return; }
    if ((el = t.closest('[data-conv]'))) { openConv(el.dataset.conv); return; }
    if ((el = t.closest('[data-inv-yes]'))) {
      el.disabled = true; try { var r = await rpc('connect_respond_private_invite', { p_invite: el.dataset.invYes, p_accept: true }); toast('Private chat opened'); refreshUnread(); setTab('private'); if (r && r.conversation_id) { await tabPrivate(); openConv(r.conversation_id); } } catch (er) { el.disabled = false; toast(human(er)); } return;
    }
    if ((el = t.closest('[data-inv-no]'))) { el.disabled = true; try { await rpc('connect_respond_private_invite', { p_invite: el.dataset.invNo, p_accept: false }); toast('Invitation declined'); refreshUnread(); tabInvites(); } catch (er) { el.disabled = false; toast(human(er)); } return; }
    if ((el = t.closest('[data-inv-cancel]'))) { try { await rpc('connect_cancel_private_invite', { p_invite: el.dataset.invCancel }); tabInvites(); } catch (er) { toast(human(er)); } return; }
    if ((el = t.closest('[data-rinv-yes]'))) { el.disabled = true; try { var rr = await rpc('connect_respond_room_invite', { p_invite: el.dataset.rinvYes, p_accept: true }); refreshUnread(); setTab('communities'); openRoom(rr.room_id); } catch (er) { el.disabled = false; toast(human(er)); } return; }
    if ((el = t.closest('[data-rinv-no]'))) { try { await rpc('connect_respond_room_invite', { p_invite: el.dataset.rinvNo, p_accept: false }); refreshUnread(); tabInvites(); } catch (er) { toast(human(er)); } return; }
    if ((el = t.closest('[data-notif]'))) { openNotif(el.dataset.notif); return; }
    if ((el = t.closest('[data-rq-yes],[data-rq-no]'))) {
      var yes = !!el.dataset.rqYes, id = el.dataset.rqYes || el.dataset.rqNo, key = null;
      if (yes) { key = window.prompt('Optional: if this artist already appears in the app\'s artist list, type their name exactly as shown there so their existing community is linked. Leave blank otherwise.', ''); if (key === null) return; }
      try { await rpc('connect_admin_review_role_request', { p_request: id, p_approve: yes, p_curated_key: key || null }); toast(yes ? 'Artist approved' : 'Request rejected'); tabAdmin(); } catch (er) { toast(human(er)); } return;
    }
    if ((el = t.closest('[data-rep]'))) {
      if (el.dataset.del && !await confirmBox('Delete the reported message?', 'It will be removed for everyone and the report marked resolved.', 'Delete', true)) return;
      try { await rpc('connect_admin_resolve_report', { p_report: el.dataset.rep, p_status: el.dataset.st, p_resolution: el.dataset.del ? 'Message removed' : el.dataset.st, p_delete_message: !!el.dataset.del }); toast('Report updated'); tabAdmin(); } catch (er) { toast(human(er)); } return;
    }
    if ((el = t.closest('[data-bub]')) && !t.closest('a,img,button')) { var row = el.closest('.cn-msg'); if (row) { if (row.classList.contains('cn-fail')) { var fm = S.chat.pending.find(function (p) { return p.id === row.dataset.id; }); if (fm && fm.__retry) { send(fm.__retry); return; } } msgSheet(row.dataset.id); } return; }
    if ((el = t.closest('.cn-msg.cn-fail'))) { var fm2 = S.chat && S.chat.pending.find(function (p) { return p.id === el.dataset.id; }); if (fm2 && fm2.__retry) send(fm2.__retry); return; }
    if ((el = t.closest('[data-act]'))) {
      var a = el.dataset.act;
      if (a === 'signin') { try { window.goAuth('signin'); } catch (er) { } }
      else if (a === 'retry') { S.booted = false; window.renderConnectPage(); }
      else if (a === 'reload') refreshCurrentTab();
      else if (a === 'more') { el.disabled = true; var k = S.tab === 'artists' ? 'artist' : S.tab === 'djs' ? 'dj' : 'event'; tabDirectory(k, true).catch(function (er) { toast(human(er)); }); }
      else if (a === 'back') { closeChat(); setView('list'); drawMainPlaceholder(); highlightRows(); refreshCurrentTab(); }
      else if (a === 'send') send();
      else if (a === 'attach') { var fi = $('cnFile'); if (fi) fi.click(); }
      else if (a === 'rmattach') { S.chat.attach = null; showAttach(); }
      else if (a === 'cancelreply') { S.chat.replyTo = null; showReply(); }
      else if (a === 'older') loadMsgs(false);
      else if (a === 'reloadchat') { var c = S.chat; if (c) { if (c.type === 'room') openRoom(c.id); else openConv(c.id); } }
      else if (a === 'joinhere') { if (S.chat) { var rid = S.chat.id, rm = S.chat.room; el.disabled = true; var ok2 = await joinRoom(rid, null); if (!ok2) { el.disabled = false; if (rm && rm.visibility === 'unlisted') toast('This room needs an invite code.'); } else { markRead(); } } }
      else if (a === 'leave') leaveRoom();
      else if (a === 'roominfo') roomInfo();
      else if (a === 'settings') settingsSheet();
      else if (a === 'djprofile') djForm();
      else if (a === 'mydjroom') { var mr = (await rpc('connect_find_rooms', { p_kind: 'dj', p_keys: ['u:' + S.uid], p_owner: S.uid })) || []; if (mr[0]) openRoom(mr[0].id); }
      else if (a === 'myartistroom') { var ar = (await rpc('connect_find_rooms', { p_kind: 'artist', p_keys: ['u:' + S.uid], p_owner: S.uid })) || []; if (ar[0]) openRoom(ar[0].id); }
      else if (a === 'artistverify') artistVerifyForm();
      else if (a === 'newevent') roomForm(null);
      else if (a === 'needhost') toast('Only artists and DJs can create event rooms. Create a DJ profile or get your artist account verified.');
      else if (a === 'joincode') codeForm();
      else if (a === 'readall') { try { await rpc('connect_mark_notifications_read', { p_ids: null }); refreshUnread(); tabNotifs(); } catch (er) { toast(human(er)); } }
      else if (a === 'adminopen') adminOpenForm();
      else if (a === 'adminall') {
        var list = appArtists(); if (!list.length) return toast('No artists found in the app');
        if (!await confirmBox('Open communities for ' + list.length + ' artists?', 'Creates a permanent community for every artist in the app that does not have one yet. Admins moderate them until the artist is verified.', 'Open all')) return;
        el.disabled = true; var made = 0;
        for (var i = 0; i < list.length; i++) { try { await rpc('connect_admin_open_room', { p_kind: 'artist', p_key: list[i].name, p_name: list[i].name, p_image: /^https?:/.test(list[i].img || '') ? list[i].img : null, p_desc: '' }); made++; } catch (er) { } }
        el.disabled = false; toast(made + ' communities are open'); S.dir.artist = null;
      }
    }
  }
  async function openNotif(id) {
    var n = S.notifs.find(function (x) { return x.id === id; }); if (!n) return;
    if (!n.read_at) { n.read_at = new Date().toISOString(); rpc('connect_mark_notifications_read', { p_ids: [id] }).then(refreshUnread).catch(function () { }); }
    if (n.kind === 'invite_received' || n.kind === 'event_invite') { setTab('invites'); }
    else if (n.kind === 'invite_accepted' && n.conversation_id) { setTab('private'); await tabPrivate(); openConv(n.conversation_id); }
    else if (n.kind === 'invite_declined') { setTab('invites'); }
    else if (n.kind === 'private_message' && n.conversation_id) { setTab('private'); await tabPrivate(); openConv(n.conversation_id); }
    else if (n.room_id) { openRoom(n.room_id); }
    else tabNotifs();
  }

  /* ───────── deep links & profile-page buttons ───────── */
  function openFromUrl() {
    try {
      var p = new URLSearchParams(location.search), room = p.get('room'), code = p.get('code');
      if (!room || S.__urlDone === room) return; S.__urlDone = room;
      openRoom(room, code).then(function () { if (S.chat && S.chat.room && !S.chat.room.is_member && code) joinRoom(S.chat.id, code); });
      history.replaceState(null, '', location.pathname);
    } catch (e) { }
  }
  window.cnOpenRoom = function (id) { try { window.navigate('connect'); } catch (e) { } setTimeout(function () { setTab('communities'); openRoom(id); }, 80); };

  // "Message" on every artist: direct message when the artist has a YAPS account, otherwise their community
  window.cnMessageArtist = async function (name) {
    var u = curUser();
    if (!u) { toast('Sign in to message artists'); try { window.goAuth('signin'); } catch (e) { } return; }
    try {
      if (typeof _profilesSearch === 'function') {
        var found = await _profilesSearch(name);
        var acct = (found || []).find(function (x) { return norm(x.full_name) === norm(name) || norm(x.username) === norm(name); });
        if (acct && acct.id !== u.id) { navigate('messages'); setTimeout(function () { openChatView(_convId(u.id, acct.id), acct.id, acct.full_name || name); }, 80); return; }
        if (acct && acct.id === u.id) { toast('This is your own profile'); return; }
      }
    } catch (e) { }
    S.uid = u.id;
    try {
      if (!S.me) S.me = await rpc('connect_ensure_profile');
      var room = await lookupRoom('artist', ['a:' + norm(name)], null);
      if (!room) { var r = await rpc('connect_open_artist_room', { p_name: name, p_image: adminImageFor('artist', name) }); room = { id: r.room_id, is_member: false }; }
      if (!room.is_member && !(await joinRoom(room.id))) return;
      window.cnOpenRoom(room.id);
    } catch (e) { toast(human(e)); }
  };

  var profBusy = {};
  async function lookupRoom(kind, keys, owner) {
    if (!S.uid) return null;
    var rows = (await rpc('connect_find_rooms', { p_kind: kind, p_keys: keys, p_owner: owner || null })) || []; return rows[0] || null;
  }
  async function decorate(btn, kind, keys, owner, name) {
    if (!btn) return;
    btn.hidden = false;
    if (!curUser()) { btn.innerHTML = '<i class="fas fa-people-group"></i> Join Community'; btn.dataset.cnroom = ''; return; }
    if (!S.uid) S.uid = curUser().id;
    try {
      var room = await lookupRoom(kind, keys, owner);
      if (room) { btn.dataset.cnroom = room.id; btn.dataset.cnmember = room.is_member ? '1' : ''; btn.innerHTML = room.is_member ? '<i class="fas fa-comments"></i> Open Community' : '<i class="fas fa-people-group"></i> Join Community'; btn.hidden = false; }
      else {
        var admin = false; try { admin = !!((await rpc('connect_ensure_profile')) || {}).is_admin; } catch (e) { }
        if (admin) { btn.dataset.cnroom = ''; btn.dataset.cnadmin = '1'; btn.innerHTML = '<i class="fas fa-plus"></i> Open Community'; btn.hidden = false; }
        else if (owner) { btn.dataset.cnroom = ''; btn.dataset.cnpage = 'community.html?artist=' + encodeURIComponent(owner) + '&join=1'; btn.innerHTML = '<i class="fas fa-people-group"></i> Join Community'; btn.hidden = false; }
        else if (kind === 'artist') { btn.dataset.cnroom = ''; btn.dataset.cnopen = '1'; btn.innerHTML = '<i class="fas fa-people-group"></i> Join Community'; btn.hidden = false; }
        else { btn.dataset.cnroom = ''; btn.innerHTML = '<i class="fas fa-people-group"></i> Join Community'; btn.hidden = false; }   // no room yet: the click handler still opens/creates it by name
      }
    } catch (e) { btn.dataset.cnroom = ''; btn.innerHTML = '<i class="fas fa-people-group"></i> Join Community'; btn.hidden = false; }   // lookup failed (offline, RPC missing): keep the button, the click handler does not need the lookup
  }
  function artistKeys(a) { return ['a:' + norm(a.name)]; }
  window.cnArtistProfileShown = function (a) {
    var btn = $('apJoinBtn'); if (!btn || !a) return; btn.hidden = true; delete btn.dataset.cnopen; delete btn.dataset.cnadmin; delete btn.dataset.cnpage; btn.dataset.cnkind = 'artist'; btn.dataset.cnname = a.name;
    var run = function () { var owner = a._account && a._account.id; btn.dataset.cnuid = owner || ''; decorate(btn, 'artist', artistKeys(a).concat(owner ? ['u:' + owner] : []), owner, a.name); };
    run(); setTimeout(function () { if (curArtist() === a && a._account) run(); }, 1500);
  };
  function cnDecorateProfiles() {
    var ab = $('apJoinBtn'); if (ab && !ab.hidden && curArtist()) window.cnArtistProfileShown(curArtist());
    document.querySelectorAll('[data-cnjoin]').forEach(function (b) { decorateDj(b); });
  }
  function decorateDj(b) {
    var keys = []; if (b.dataset.cnuid) keys.push('u:' + b.dataset.cnuid); keys.push('n:' + norm(b.dataset.cnname));
    b.dataset.cnkind = 'dj'; decorate(b, 'dj', keys, b.dataset.cnuid || null, b.dataset.cnname);
  }
  document.addEventListener('click', async function (e) {
    var b = e.target.closest('#apJoinBtn,[data-cnjoin]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (typeof window.openCommunity === 'function') {   // Join Community on artist / DJ profiles opens the Community Chat page
      var _nm = b.dataset.cnname || '', _k = String(_nm).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60), _u = String(b.dataset.cnuid || '').toLowerCase().replace(/[^a-z0-9-]/g, ''), _p = b.dataset.cnkind === 'dj' ? 'dj-' : 'artist-';
      window.openCommunity((_u || _k) ? { c: _u ? _p + 'u-' + _u : _p + _k, name: _nm, join: true } : { join: true });   // account id first (the DJ Studio uses the same room), name otherwise
      return;
    }
    if (b.dataset.cnpage) { if (/^community\.html/.test(b.dataset.cnpage) && typeof window.openCommunity === 'function') window.openCommunity(b.dataset.cnpage); else location.href = b.dataset.cnpage; return; }
    if (!curUser()) { try { window.showToast('Sign in to join communities'); window.goAuth('signin'); } catch (er) { } return; }
    S.uid = curUser().id; if (!S.me) { try { S.me = await rpc('connect_ensure_profile'); } catch (er) { toast(human(er)); return; } }
    var kind = b.dataset.cnkind, id = b.dataset.cnroom;
    if (!id && b.dataset.cnadmin) {
      var nm = b.dataset.cnname; if (!await confirmBox('Open a community for ' + nm + '?', 'This creates a permanent community that admins moderate until the artist or DJ is verified.', 'Open community')) return;
      try { var r = await rpc('connect_admin_open_room', { p_kind: kind, p_key: nm, p_name: nm, p_image: kind === 'artist' ? adminImageFor('artist', nm) : null, p_desc: '' }); id = r.room_id; } catch (er) { toast(human(er)); return; }
    }
    if (!id && b.dataset.cnopen) {
      var nm2 = b.dataset.cnname; b.disabled = true;
      try { var r2 = await rpc('connect_open_artist_room', { p_name: nm2, p_image: adminImageFor('artist', nm2) }); id = r2.room_id; b.dataset.cnroom = id; delete b.dataset.cnopen; }
      catch (er) { b.disabled = false; toast(human(er)); return; }
      b.disabled = false;
    }
    if (!id) return;
    if (!b.dataset.cnmember) { b.disabled = true; var ok = await joinRoom(id); b.disabled = false; if (!ok) return; }
    window.cnOpenRoom(id);
  }, true);
  (function watchDj() {
    var done = false;
    function attach() {
      var host = $('djx-profile'); if (!host || done) return done;
      done = true; new MutationObserver(function () { host.querySelectorAll('[data-cnjoin]').forEach(function (b) { if (!b.dataset.cnok) { b.dataset.cnok = '1'; decorateDj(b); } }); }).observe(host, { childList: true, subtree: true });
      return true;
    }
    if (!attach()) { document.addEventListener('DOMContentLoaded', attach); setTimeout(attach, 2500); }
  })();

  // sign-in / sign-out: clean everything that belongs to the previous account
  function hookAuth() {
    if (!window.sb || hookAuth.done) return; hookAuth.done = true;
    window.sb.auth.onAuthStateChange(function (ev, session) {
      var uid = session && session.user && session.user.id;
      if (!uid || uid !== S.uid) { if (S.uid) { resetState(); S.uid = null; updateBadges(); } }
      if (uid && S.active) window.renderConnectPage();
      if (uid && !S.active) { S.uid = uid; setTimeout(function () { if (!S.booted && !S.userCh) { rpc('connect_ensure_profile').then(function (m) { S.me = m; S.booted = true; subUser(); refreshUnread(); }).catch(function () { }); } }, 1500); }
    });
  }
  (function (f) { if (document.readyState === 'complete') f(); else window.addEventListener('load', f); })(function () { hookAuth(); setTimeout(function () { if (curUser() && !S.booted) { S.uid = curUser().id; S.user = curUser(); rpc('connect_ensure_profile').then(function (m) { S.me = m; S.booted = true; subUser(); refreshUnread(); if (!S.poll) S.poll = setInterval(function () { if (S.uid && !document.hidden) refreshUnread(); }, 60000); }).catch(function () { }); } }, 2500); });
  window.__cn = S;   // for debugging in the console
})();
