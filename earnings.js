/* ── EARNINGS PAGE ── real data (Supabase) + Mobile Money withdrawals (MTN / Airtel)
   Reads:  earnings_ledger, payout_methods, withdrawals  (own rows only, via RLS)
   Writes: payout_methods (own), and withdrawals ONLY through the request_withdrawal() RPC.
   Setup (tables, RPC, payout function): see earnings-setup.md */
(function () {
  'use strict';
  const MIN = 50000, MAX = 5000000, CUR = 'UGX';
  const NET = { mtn: { name: 'MTN Mobile Money', pre: ['76', '77', '78'] }, airtel: { name: 'Airtel Money', pre: ['70', '74', '75'] } };
  const netOf = k => NET[k] || { name: 'Mobile Money', pre: [] };   // tolerate unknown/legacy network values
  const E = { balance: 0, pending: 0, lifetime: 0, method: null, split: [], periods: {}, tracks: [], tx: [], wd: {}, hasData: false, loading: false, error: '' };
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const S = { period: '30d', hide: false };
  const n = v => Math.abs(Math.round(v)).toLocaleString('en-US');
  const money = v => S.hide ? '••••••' : (v < 0 ? '−' : '') + n(v);
  const cnt = v => S.hide ? '•••' : Math.round(v).toLocaleString('en-US');
  const fmtD = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const icons = { tip: 'hand-holding-heart', stream: 'play', sub: 'user-plus', ad: 'rectangle-ad', payout: 'building-columns', payout_reversal: 'rotate-left' };
  const CREDIT = new Set(['tip', 'stream', 'sub', 'ad']);
  const signedIn = () => { try { return !!_demoUser; } catch (e) { return false; } };
  const toast = m => { if (typeof showToast === 'function') showToast(m); };

  /* ── phone helpers (Uganda) ── */
  function normPhone(raw) {
    let d = String(raw || '').replace(/\D/g, '');
    if (d.startsWith('256')) d = d.slice(3); else if (d.startsWith('0')) d = d.slice(1);
    return /^7\d{8}$/.test(d) ? '256' + d : null;
  }
  const showPhone = p => { if (!p) return ''; const d = p.slice(3); return '0' + d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6); };
  const maskPhone = p => { if (!p) return ''; const d = p.slice(3); return '0' + d.slice(0, 3) + ' ••• ' + d.slice(6); };

  /* ── data ── */
  async function load() {
    if (!signedIn() || !sb) { render(); return; }
    E.loading = true; E.error = ''; render();
    try {
      const uid = _demoUser.id;
      const [led, pm, wd] = await Promise.all([
        sb.from('earnings_ledger').select('id,kind,title,amount,qty,status,track_id,ref,created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(2000),
        sb.from('payout_methods').select('network,phone,account_name,changed_at').eq('user_id', uid).maybeSingle(),
        sb.from('withdrawals').select('id,amount,status,failure_reason,created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(20)
      ]);
      if (led.error) throw led.error;
      if (pm.error) throw pm.error;
      if (wd.error) throw wd.error;
      E.method = pm.data || null;
      E.wd = {}; (wd.data || []).forEach(w => { E.wd[w.id] = w; });
      aggregate(led.data || []);
    } catch (e) {
      console.warn('[YAPS] earnings load failed', e);
      const missing = e && (e.code === '42P01' || e.code === 'PGRST205' || /relation|schema cache/i.test(e.message || ''));
      E.error = missing ? 'Earnings is not set up yet. The database tables are missing.' : 'Could not load your earnings. Check your connection and try again.';
    }
    E.loading = false; render();
  }

  function aggregate(rows) {
    E.hasData = rows.length > 0;
    E.balance = E.pending = E.lifetime = 0;
    const credits = [];
    rows.forEach(r => {
      const a = +r.amount || 0;
      if (r.status === 'available') E.balance += a; else if (r.status === 'pending') E.pending += a;
      if (a > 0 && CREDIT.has(r.kind)) { E.lifetime += a; credits.push(r); }
    });
    // income split
    const by = { stream: 0, tip: 0, sub: 0, ad: 0 };
    credits.forEach(r => { by[r.kind] += +r.amount; });
    const tot = E.lifetime || 1;
    E.split = [['Streams', by.stream, '#e8c26a'], ['Tips', by.tip, '#2f8eff'], ['Subscriptions', by.sub, '#00e5ff'], ['Ads', by.ad, '#a78bfa']]
      .filter(s => s[1] > 0).map(s => [s[0], Math.max(1, Math.round(s[1] / tot * 100)), s[2]]);
    // periods
    const now = new Date(), day = 864e5, t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const ago = r => { const d = new Date(r.created_at); return Math.round((t0 - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / day); };
    const monthsAgo = r => { const d = new Date(r.created_at); return (now.getFullYear() * 12 + now.getMonth()) - (d.getFullYear() * 12 + d.getMonth()); };
    const wdLab = []; for (let i = 6; i >= 0; i--) wdLab.push(new Date(t0 - i * day).toLocaleDateString('en-GB', { weekday: 'short' }));
    const moLab = []; for (let i = 5; i >= 0; i--) moLab.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString('en-GB', { month: 'short' }));
    const P = {
      '7d':  { label: '7 days',   labels: wdLab, series: [0,0,0,0,0,0,0], test: r => ago(r) <= 6 },
      '30d': { label: '30 days',  labels: ['Wk 1','Wk 2','Wk 3','Wk 4'], series: [0,0,0,0], test: r => ago(r) <= 29 },
      'all': { label: 'All time', labels: moLab, series: [0,0,0,0,0,0], test: () => true }
    };
    Object.keys(P).forEach(k => { P[k].total = 0; P[k].streams = 0; P[k].tips = 0; P[k].subs = 0; });
    credits.forEach(r => {
      const a = +r.amount, q = +r.qty || 1, d = ago(r), m = monthsAgo(r);
      Object.keys(P).forEach(k => {
        if (!P[k].test(r)) return;
        P[k].total += a;
        if (r.kind === 'stream') P[k].streams += q; else if (r.kind === 'tip') P[k].tips += q; else if (r.kind === 'sub') P[k].subs += q;
      });
      if (d >= 0 && d <= 6) P['7d'].series[6 - d] += a;
      if (d >= 0 && d <= 29) P['30d'].series[3 - Math.min(3, Math.floor(d / 7.5))] += a;
      if (m >= 0 && m <= 5) P['all'].series[5 - m] += a;
    });
    E.periods = P;
    // top tracks
    const tk = {};
    credits.forEach(r => { if (r.track_id == null) return; const o = tk[r.track_id] || (tk[r.track_id] = { id: r.track_id, streams: 0, earned: 0 }); o.earned += +r.amount; if (r.kind === 'stream') o.streams += (+r.qty || 1); });
    E.tracks = Object.values(tk).sort((a, b) => b.earned - a.earned).slice(0, 4).map(o => {
      const t = (typeof tracks !== 'undefined') ? tracks.find(x => x.id === o.id) : null;
      return { title: t ? t.title : 'Track #' + o.id, streams: o.streams, earned: o.earned };
    });
    E.tx = rows.slice(0, 8);
  }

  /* ── page render ── */
  function chart(p) {
    const W = 320, H = 170, L = 8, B = 22, T = 10, max = Math.max.apply(null, p.series.concat([1])) * 1.15;
    const cw = (W - L * 2) / p.series.length, bw = Math.min(30, cw * .55);
    let g = '';
    for (let i = 0; i <= 3; i++) { const y = T + (H - B - T) * i / 3; g += `<line class="gl" x1="${L}" x2="${W - L}" y1="${y}" y2="${y}"/>`; }
    p.series.forEach((v, i) => {
      const h = Math.max(3, (H - B - T) * v / max), x = L + cw * i + (cw - bw) / 2, y = H - B - h;
      g += `<g><title>${esc(p.labels[i])}: ${S.hide ? '' : CUR + ' ' + n(v)}</title><rect class="b" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="5"/><text x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(p.labels[i])}</text></g>`;
    });
    return `<svg class="ern-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Earnings over ${esc(p.label)}"><defs><linearGradient id="ernGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dc94"/><stop offset="1" stop-color="#b8892b"/></linearGradient></defs>${g}</svg>`;
  }
  const wdPill = id => {
    const w = E.wd[id]; if (!w) return '';
    const map = { pending: ['Processing', ''], processing: ['Processing', ''], paid: ['Paid', ' ok'], failed: ['Failed, refunded', ' bad'] };
    const m = map[w.status] || [w.status, ''];
    return `<em class="ern-st${m[1]}">${m[0]}</em>`;
  };

  function render() {
    const body = $('ernBody'); if (!body) return;
    if (!signedIn()) {
      body.innerHTML = `<div class="ern-lock"><i class="fas fa-lock"></i><h2>Sign in to see your earnings</h2><p>Your income, payouts and top tracks are private to your account.</p><button type="button" class="ern-btn gold" data-act="signin"><i class="fas fa-right-to-bracket"></i> Sign in</button></div>`;
      return;
    }
    if (E.loading && !E.periods['30d']) { body.innerHTML = `<div class="ern-lock"><i class="fas fa-circle-notch fa-spin"></i><h2>Loading your earnings…</h2></div>`; return; }
    if (E.error) { body.innerHTML = `<div class="ern-lock"><i class="fas fa-triangle-exclamation"></i><h2>Something went wrong</h2><p>${esc(E.error)}</p><button type="button" class="ern-btn gold" data-act="retry"><i class="fas fa-rotate-right"></i> Try again</button></div>`; return; }
    const p = E.periods[S.period] || { label: '', labels: [], series: [0], total: 0, streams: 0, tips: 0, subs: 0 };
    const can = E.balance >= MIN, pct = Math.min(100, Math.round(Math.max(0, E.balance) / MIN * 100));
    const open = Object.values(E.wd).find(w => w.status === 'pending' || w.status === 'processing');
    body.innerHTML = `
      ${E.hasData ? '' : '<div class="ern-note"><i class="fas fa-circle-info"></i><span><b>No earnings yet.</b> Tips, streams and subscriptions will show up here as soon as you earn them.</span></div>'}
      ${open ? `<div class="ern-note"><i class="fas fa-hourglass-half"></i><span><b>Withdrawal in progress.</b> ${CUR} ${n(open.amount)} is being sent to your ${esc(E.method ? netOf(E.method.network).name : 'Mobile Money')}. Usually within 24 hours.</span></div>` : ''}
      <div class="ern-hero">
        <div class="ern-lab">Available balance <button type="button" class="ern-eye" data-act="eye" aria-label="${S.hide ? 'Show' : 'Hide'} amounts"><i class="fas fa-eye${S.hide ? '' : '-slash'}"></i></button></div>
        <div class="ern-bal"><small>${CUR}</small>${money(E.balance)}</div>
        <div class="ern-sub"><span>Pending <b>${CUR} ${money(E.pending)}</b></span><span>Lifetime <b>${CUR} ${money(E.lifetime)}</b></span></div>
        <div class="ern-prog" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
        <div class="ern-progt">${can ? 'You\u2019ve reached the minimum payout of ' + CUR + ' ' + n(MIN) : CUR + ' ' + n(Math.max(0, MIN - E.balance)) + ' more to reach the minimum payout'}</div>
        <button type="button" class="ern-btn gold" data-act="withdraw" ${can && !open ? '' : 'disabled'}><i class="fas fa-money-bill-transfer"></i> Withdraw</button>
      </div>
      <div class="ern-tabs" role="tablist" aria-label="Period">${['7d', '30d', 'all'].map(k => `<button type="button" class="ern-tab${k === S.period ? ' on' : ''}" role="tab" aria-selected="${k === S.period}" data-period="${k}">${k === 'all' ? 'All time' : k.toUpperCase()}</button>`).join('')}</div>
      <div class="ern-stats">
        <div class="ern-stat"><span><i class="fas fa-coins"></i>Earned</span><b>${CUR} ${money(p.total)}</b></div>
        <div class="ern-stat"><span><i class="fas fa-headphones"></i>Streams</span><b>${cnt(p.streams)}</b></div>
        <div class="ern-stat"><span><i class="fas fa-hand-holding-heart"></i>Tips</span><b>${cnt(p.tips)}</b></div>
        <div class="ern-stat"><span><i class="fas fa-user-plus"></i>Subscribers</span><b>${cnt(p.subs)}</b></div>
      </div>
      <div class="ern-card"><h2><i class="fas fa-chart-column"></i>Earnings · ${esc(p.label)}</h2>${chart(p)}</div>
      <div class="ern-card"><h2><i class="fas fa-chart-pie"></i>Where it comes from</h2>
        ${E.split.length ? `<div class="ern-split" role="img" aria-label="Income sources">${E.split.map(s => `<i style="width:${s[1]}%;background:${s[2]}"></i>`).join('')}</div>
        <div class="ern-leg">${E.split.map(s => `<div><u style="background:${s[2]}"></u>${esc(s[0])}<b>${s[1]}%</b></div>`).join('')}</div>` : '<div class="ern-empty">Nothing to show yet.</div>'}
      </div>
      <div class="ern-card"><h2><i class="fas fa-trophy"></i>Top earning tracks</h2>
        ${E.tracks.length ? E.tracks.map((t, i) => `<div class="ern-row"><div class="ern-rank">${i + 1}</div><div class="ern-rt"><b>${esc(t.title)}</b><span>${cnt(t.streams)} streams</span></div><div class="ern-amt">${CUR} ${money(t.earned)}</div></div>`).join('') : '<div class="ern-empty">Your best earning tracks will appear here.</div>'}
      </div>
      <div class="ern-card"><h2><i class="fas fa-clock-rotate-left"></i>Recent activity</h2>
        ${E.tx.length ? E.tx.map(t => `<div class="ern-row"><div class="ern-ic"><i class="fas fa-${icons[t.kind] || 'coins'}"></i></div><div class="ern-rt"><b>${esc(t.title)}</b><span>${fmtD(t.created_at)}${t.status === 'pending' ? ' · pending' : ''} ${t.kind === 'payout' ? wdPill(t.ref) : ''}</span></div><div class="ern-amt${t.amount < 0 ? ' out' : ''}">${t.amount < 0 ? '' : '+'}${money(t.amount)}<small>${CUR}</small></div></div>`).join('') : '<div class="ern-empty">No activity yet.</div>'}
      </div>
      <div class="ern-card"><h2><i class="fas fa-building-columns"></i>Payout method</h2>
        <div class="ern-row"><div class="ern-ic"><i class="fas fa-mobile-screen"></i></div><div class="ern-rt">${E.method ? `<b>${esc(netOf(E.method.network).name)}</b><span>${esc(showPhone(E.method.phone))} · ${esc(E.method.account_name)}</span>` : '<b>No payout number yet</b><span>Add your MTN or Airtel number to withdraw</span>'}</div><button type="button" class="ern-btn mini" data-act="method">${E.method ? 'Change' : 'Add'}</button></div>
        <div class="ern-fine">Minimum withdrawal ${CUR} ${n(MIN)} · Maximum ${CUR} ${n(MAX)} per request</div>
      </div>`;
  }

  /* ── modal ── */
  const page = $('page-earnings');
  const bg = document.createElement('div');
  bg.className = 'ern-mbg'; bg.id = 'ernModal'; bg.setAttribute('role', 'dialog'); bg.setAttribute('aria-modal', 'true');
  page.appendChild(bg);
  const M = { mode: '', net: 'mtn', amt: 0, busy: false };
  const close = () => { bg.classList.remove('open'); bg.innerHTML = ''; M.mode = ''; M.busy = false; };
  const open = () => bg.classList.add('open');

  function openMethod() {
    M.mode = 'method'; M.net = E.method ? E.method.network : 'mtn';
    const cool = E.method && E.method.changed_at && (Date.now() - new Date(E.method.changed_at).getTime()) < 864e5;
    bg.innerHTML = `<div class="ern-msheet">
      <div class="ern-mh"><h3>${E.method ? 'Change payout number' : 'Add payout number'}</h3><button type="button" class="ern-x" data-m="close" aria-label="Close"><i class="fas fa-times"></i></button></div>
      <div class="ern-lbl">Network</div>
      <div class="ern-nets">${Object.keys(NET).map(k => `<button type="button" class="ern-net${k === M.net ? ' on' : ''}" data-net="${k}"><i class="fas fa-mobile-screen"></i>${k === 'mtn' ? 'MTN MoMo' : 'Airtel Money'}</button>`).join('')}</div>
      <label class="ern-lbl" for="ernPhone">Mobile Money number</label>
      <input id="ernPhone" class="ern-in" type="tel" inputmode="tel" autocomplete="tel" placeholder="07XX XXX XXX" value="${E.method ? esc(showPhone(E.method.phone)) : ''}">
      <label class="ern-lbl" for="ernName">Name registered on this number</label>
      <input id="ernName" class="ern-in" type="text" autocomplete="name" placeholder="e.g. Nakato Sarah" value="${E.method ? esc(E.method.account_name) : ''}">
      <div class="ern-err" id="ernErr"></div>
      <div class="ern-fine">${E.method ? 'For your security, withdrawals pause for 24 hours after you change your payout number.' : 'Money is only ever sent to this number. Double-check it.'}</div>
      <button type="button" class="ern-btn gold ern-full" data-m="save-method">Save payout number</button>
    </div>`;
    open(); setTimeout(() => { const i = $('ernPhone'); if (i) i.focus(); }, 80);
  }

  function openWithdraw() {
    if (!E.method) { openMethod(); return; }
    M.mode = 'withdraw'; M.amt = Math.min(Math.max(0, Math.floor(E.balance)), MAX);
    const net = netOf(E.method.network);
    bg.innerHTML = `<div class="ern-msheet">
      <div class="ern-mh"><h3>Withdraw earnings</h3><button type="button" class="ern-x" data-m="close" aria-label="Close"><i class="fas fa-times"></i></button></div>
      <div class="ern-dest"><div class="ern-ic"><i class="fas fa-mobile-screen"></i></div><div class="ern-rt"><b>${esc(net.name)}</b><span>${esc(maskPhone(E.method.phone))} · ${esc(E.method.account_name)}</span></div><button type="button" class="ern-link" data-m="change">Change</button></div>
      <label class="ern-lbl" for="ernAmt">Amount (${CUR})</label>
      <input id="ernAmt" class="ern-in ern-big" type="text" inputmode="numeric" autocomplete="off" value="${M.amt ? n(M.amt) : ''}">
      <div class="ern-qk"><button type="button" data-m="min">Minimum</button><button type="button" data-m="half">Half</button><button type="button" data-m="all">All</button></div>
      <div class="ern-fine">Available: ${CUR} ${n(E.balance)} · Usually sent within 24 hours. Your mobile money network may charge a fee when you cash out.</div>
      <div class="ern-err" id="ernErr"></div>
      <button type="button" class="ern-btn gold ern-full" id="ernGo" data-m="go"></button>
    </div>`;
    open(); updateGo();
  }
  function updateGo() {
    const b = $('ernGo'); if (!b) return;
    const bad = M.amt < MIN || M.amt > MAX || M.amt > E.balance;
    b.disabled = bad || M.busy;
    b.innerHTML = M.busy ? '<i class="fas fa-circle-notch fa-spin"></i> Sending request…' : (M.amt >= MIN ? `Withdraw ${CUR} ${n(M.amt)}` : `Minimum ${CUR} ${n(MIN)}`);
  }
  const setErr = m => { const e = $('ernErr'); if (e) e.textContent = m || ''; };
  function setAmt(v) { M.amt = Math.max(0, Math.floor(v)); const i = $('ernAmt'); if (i) i.value = M.amt ? n(M.amt) : ''; setErr(''); updateGo(); }

  async function saveMethod() {
    if (M.busy) return;
    const phone = normPhone($('ernPhone').value), name = $('ernName').value.trim().replace(/\s+/g, ' ');
    if (!phone) { setErr('Enter a valid Ugandan mobile number, e.g. 0772 123 456.'); return; }
    if (name.length < 2) { setErr('Enter the name registered on this Mobile Money number.'); return; }
    if (!NET[M.net].pre.includes(phone.slice(3, 5))) {
      if (!M.warned) { M.warned = true; setErr(`That number doesn\u2019t look like an ${NET[M.net].name} number. Check the network, or tap Save again if you\u2019re sure.`); return; }
    }
    M.busy = true; M.warned = false;
    const btn = bg.querySelector('[data-m="save-method"]'); if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      const { error } = await sb.from('payout_methods').upsert({ user_id: _demoUser.id, network: M.net, phone: phone, account_name: name }, { onConflict: 'user_id' });
      if (error) throw error;
      toast('Payout number saved');
      close(); await load();
    } catch (e) {
      M.busy = false; if (btn) { btn.disabled = false; btn.textContent = 'Save payout number'; }
      setErr('Could not save. Please try again.');
    }
  }

  const RPC_ERR = {
    not_signed_in: 'Please sign in again.', below_minimum: `The minimum withdrawal is ${CUR} ${n(MIN)}.`, above_maximum: `The maximum per withdrawal is ${CUR} ${n(MAX)}.`,
    no_method: 'Add your payout number first.', method_recent: 'You changed your payout number recently. For your security, withdrawals resume 24 hours after the change.',
    withdrawal_open: 'You already have a withdrawal in progress. Wait for it to finish.', insufficient_balance: 'That is more than your available balance.'
  };
  async function submitWithdraw() {
    if (M.busy) return;
    M.busy = true; updateGo(); setErr('');
    try {
      const { error } = await sb.rpc('request_withdrawal', { p_amount: M.amt });
      if (error) { const k = Object.keys(RPC_ERR).find(c => (error.message || '').includes(c)); throw new Error(k ? RPC_ERR[k] : 'Could not send your request. Please try again.'); }
      toast('Withdrawal requested, it\u2019s on its way');
      close(); await load();
    } catch (e) {
      M.busy = false; updateGo(); setErr(e.message);
    }
  }

  bg.addEventListener('click', e => {
    if (e.target === bg) { close(); return; }
    const net = e.target.closest('[data-net]');
    if (net) { M.net = net.dataset.net; M.warned = false; bg.querySelectorAll('.ern-net').forEach(b => b.classList.toggle('on', b.dataset.net === M.net)); setErr(''); return; }
    const b = e.target.closest('[data-m]'); if (!b) return;
    const a = b.dataset.m;
    if (a === 'close') close();
    else if (a === 'save-method') saveMethod();
    else if (a === 'go') submitWithdraw();
    else if (a === 'change') openMethod();
    else if (a === 'min') setAmt(MIN);
    else if (a === 'half') setAmt(Math.min(MAX, Math.floor(E.balance / 2 / 500) * 500));
    else if (a === 'all') setAmt(Math.min(MAX, E.balance));
  });
  bg.addEventListener('input', e => {
    if (e.target.id === 'ernAmt') { M.amt = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0; e.target.value = M.amt ? n(M.amt) : ''; setErr(M.amt > E.balance ? 'That is more than your available balance.' : ''); updateGo(); }
    else M.warned = false;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && M.mode) close(); });

  /* ── page events ── */
  page.addEventListener('click', e => {
    const tab = e.target.closest('[data-period]'); if (tab) { S.period = tab.dataset.period; render(); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'eye') { S.hide = !S.hide; render(); }
    else if (a === 'withdraw') openWithdraw();
    else if (a === 'method') openMethod();
    else if (a === 'retry') load();
    else if (a === 'signin') { if (typeof requireAuth === 'function') requireAuth(() => navigate('earnings')); }
  });
  $('ernBack').addEventListener('click', () => { close(); navigate('home'); if (typeof updateBottomNav === 'function') updateBottomNav('home'); });
  window.renderEarningsPage = function () { S.period = '30d'; close(); render(); load(); };
})();
