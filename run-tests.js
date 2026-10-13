// YAPS Music basic logic tests. Run from the folder that holds index.html:   node tests/run-tests.js
// They read the real code out of index.html, so they catch regressions without a browser.
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); } };
const between = (a, b, from = 0) => { const i = html.indexOf(a, from); const j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('marker not found: ' + a); return html.slice(i, j); };

// ── sandbox ──
global.window = global; global.localStorage = { getItem() { return null }, setItem() {} }; global.sessionStorage = global.localStorage;
global.document = { getElementById: () => null, querySelector: () => null, addEventListener() {} };
global.MutationObserver = class { observe() {} };
global.setTimeout = f => f; global.setInterval = () => {};
global.artists = [{ name: 'King Saha', img: 'k.jpg' }, { name: 'Bebe Cool', img: 'b.png' }];
global._likedTracks = new Set(); global._history = []; global._followedArtists = new Set();
global.isGospelWeekend = () => false; global.gospelWeekendPool = s => s; global.currentTrack = 0; global.audioEngine = { addEventListener() {} };
global._parsePlayCount = s => parseFloat(s) * (/M/i.test(s) ? 1e6 : /K/i.test(s) ? 1e3 : 1) || 0;

// tracks array
const arr = between('const tracks = [', '\n];') + '\n];';
(0, eval)(arr.replace('const tracks', 'global.tracks'));
global.curatedTrending = () => tracks.slice(0, 5);

// security helpers + upload rules
const sec = new Function(between('function _safeText', 'async function _apiUpload') + '; return { _safeText, _safeUrl, _validateUpload };')();
const { _safeText, _safeUrl, _validateUpload } = sec;

// discovery module
const di = html.indexOf('<script id="discovery-js">'); const dj = html.indexOf('</script>', di);
(0, eval)(html.slice(di + 26, dj));
const D = window.YAPSDiscovery;

console.log('Security');
test('safeText strips tags and quote breakouts', () => {
  const t = _safeText('<img src=x onerror=alert(1)>Don\'t "Stop"', 150);
  assert(!/[<>"']/.test(t), t);
});
test('safeUrl only allows clean https', () => {
  assert.strictEqual(_safeUrl('javascript:alert(1)'), ''); assert.strictEqual(_safeUrl('https://a.co/x"onerror="y'), '');
  assert.strictEqual(_safeUrl('https://a.co/ok.mp3'), 'https://a.co/ok.mp3');
});
const F = (n, t, sz) => ({ name: n, type: t, size: sz });
const rejects = (b, f, fn) => assert.throws(() => _validateUpload(b, f, fn));
test('upload accepts normal mp3 and jpg', () => { _validateUpload('audio', F('a.mp3', 'audio/mpeg', 3e6), 'a.mp3'); _validateUpload('artwork', F('c.jpg', 'image/jpeg', 2e6), 'c.jpg'); });
test('upload rejects svg, html, oversize, wrong type, unknown bucket', () => {
  rejects('artwork', F('x.svg', 'image/svg+xml', 1e3), 'x.svg'); rejects('artwork', F('x.html', 'image/png', 1e3), 'x.html');
  rejects('audio', F('a.mp3', 'audio/mpeg', 60e6), 'a.mp3'); rejects('avatars', F('p.jpg', 'text/html', 1e3), 'p.jpg'); rejects('secret', F('p.jpg', 'image/jpeg', 1e3), 'p.jpg');
});

console.log('Discovery');
test('catalogue is non-empty and every bundled track is playable', () => { assert(tracks.length > 50); assert(tracks.every(D.isCatalogue)); });
test('search ignores case and accents', () => { assert(D.search('KING SAHA').songs.length > 0); assert.strictEqual(D.search('Bébé').artists[0].name, 'Bebe Cool'); });
test('search needs every word to match', () => assert.strictEqual(D.search('king saha zzzzqq').songs.length, 0));
test('samples appear only for genres without catalogue and are flagged', () => {
  const r = D.search('amapiano'); assert(r.samples.length > 0 && r.samples.every(s => s.sample === true) && r.songs.length === 0);
});
test('Uganda genres have real tracks; Africa Amapiano has none', () => {
  const g = k => D.GENRES.find(x => x.key === k);
  assert(D.catalogueFor(g('uganda:Afrobeats')).length > 3); assert.strictEqual(D.catalogueFor(g('africa:Amapiano')).length, 0);
});
test('recommendations: cold start is non-personal, likes personalise, no repeats, max 2 per artist', () => {
  assert.strictEqual(D.recommendedList().personal, false);
  const i = tracks.findIndex(t => /King Saha/.test(t.artist)); _likedTracks.add(i);
  const r = D.recommendedList(); assert(r.personal && r.list.length > 0 && !r.list.includes(tracks[i]));
  const c = {}; r.list.forEach(t => c[t.artist] = (c[t.artist] || 0) + 1); assert(Math.max(...Object.values(c)) <= 2);
});
test('top-bar search output is escaped', () => {
  const h = D.topSearchHTML('"><img src=x onerror=alert(1)>'); assert(!/<img src=x/.test(h));
});

console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
