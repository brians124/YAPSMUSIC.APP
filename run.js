// YAPS regression tests. Run from this folder:  npm install && npm test
// Pages are loaded in jsdom with a RECORDING Supabase mock: this proves wiring and absence of JS errors,
// NOT real backend behaviour, audio playback or layout (see MANUAL_TEST_GUIDE.md for those).
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const U = { id: '00000000-0000-0000-0000-000000000001', email: 't@example.com', user_metadata: { full_name: 'Audit Tester' }, app_metadata: {} };
const SESSION = { access_token: 'mock', user: U };
const rd = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
function run(file, opts, ms = 6000) {
  const r = spawnSync('node', [path.join(__dirname, 'harness.js'), file, String(ms), JSON.stringify(opts)], { encoding: 'utf8', maxBuffer: 1 << 26, timeout: 280000 });
  const out = r.stdout || ''; const i = out.indexOf('{\n "file"');
  if (i < 0) throw new Error('harness failed: ' + (r.stderr || out).slice(0, 300));
  return JSON.parse(out.slice(i));
}
const real = a => a.filter(e => !/^jsdomError/.test(e));
let pass = 0, fail = 0;
const t = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + detail)); ok ? pass++ : fail++; };

// hostile profile row (markup + attribute breakout) for XSS tests
const P = 'x"><span class="xssprobe"></span><i x="', A = 'a" data-pwn="1" x="';
const row = { id: 'u2', user_id: '00000000-0000-0000-0000-000000000009', sender_id: '00000000-0000-0000-0000-000000000009', receiver_id: U.id, conversation_id: 'conv1', account_type: 'listener', avatar_url: '', created_at: new Date().toISOString() };
['full_name', 'username', 'name', 'sender_name', 'receiver_name', 'body', 'title', 'artist'].forEach((k, i) => row[k] = (i % 2 ? P : A + P));

let r = run('index.html', {});
t('index.html boots with no uncaught errors / rejections', !real(r.uncaughtErrors).length && !r.unhandledRejections.length, JSON.stringify(real(r.uncaughtErrors)));
for (const [label, extra] of [['signed out', {}], ['signed in', { session: SESSION }]]) {
  r = run('index.html', { script: rd('sweep.js'), ...extra });
  const s = r.scriptResult; t(`index.html click-sweep (${label}): ${s.clicked} controls, none throw`, s.failing.length === 0, JSON.stringify(s.failing.slice(0, 3)));
}
r = run('studio.html', { script: rd('sweep.js'), session: SESSION }, 7000);
t(`studio.html click-sweep: ${r.scriptResult.clicked} controls, none throw`, r.scriptResult.failing.length === 0, JSON.stringify(r.scriptResult.failing.slice(0, 3)));

r = run('index.html', { session: SESSION, rows: [row], script: rd('exploit.js') });
const us = r.scriptResult.userSearch, tl = r.scriptResult.threadList;
t('SECURITY: user-search results escape hostile profile names', us.injectedElements === 0 && us.attributeBreakouts === 0, JSON.stringify(us));
t('SECURITY: chat thread list escapes hostile names', tl.injectedElements === 0 && tl.attributeBreakouts === 0, JSON.stringify(tl));

r = run('index.html', { session: SESSION, script: `(async()=>{const o={};
  try{ const d=Object.getOwnPropertyDescriptor(navigator,'clipboard'); Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}); Object.defineProperty(navigator,'share',{value:undefined,configurable:true});
       nativeShare('T','A',1); o.share='no throw' }catch(e){ o.share='THREW '+e.message }
  try{ const bar=document.createElement('div'); setVolume({clientX:5},bar); o.volume='no throw' }catch(e){ o.volume='THREW '+e.message }
  try{ await api('/api/videos/vid1/like',{method:'POST'}); await api('/api/videos/vid1/comments',{method:'POST',body:{body:'hi'}}); await api('/api/videos/vid1/comments?limit=5'); o.routes=Object.keys(window.__log.sbCalls).filter(k=>/video_(likes|comments)|increment_video/.test(k)) }catch(e){ o.routes='THREW '+e.message }
  try{ _renderCommentsList([{name:'<img src=x onerror=1>',text:'<b id=pwn1>x</b>',avatar:'javascript:alert(1)',time:'now'}]); o.commentsXss=document.getElementById('pwn1')?'INJECTED':'escaped' }catch(e){ o.commentsXss='THREW '+e.message }
  return o})()` });
const o = r.scriptResult;
t('nativeShare does not throw without navigator.clipboard/share', o.share === 'no throw', o.share);
t('setVolume ignores zero-width bar (no NaN volume)', o.volume === 'no throw', o.volume);
t('video like + comment API calls reach yaps_video_likes / yaps_video_comments / increment RPCs', Array.isArray(o.routes) && ['from:yaps_video_likes', 'from:yaps_video_comments', 'rpc:increment_video_likes', 'rpc:increment_video_comments'].every(k => o.routes.includes(k)), JSON.stringify(o.routes));
t('comments drawer escapes name/text/avatar', o.commentsXss === 'escaped', o.commentsXss);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
