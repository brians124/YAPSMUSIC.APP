const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);/* longer messages stay longer so they can be read; tap the message to dismiss */toast.t=setTimeout(()=>t.classList.remove('show'),Math.min(9000,Math.max(2600,1500+String(m).length*55)))};
$('#toast').addEventListener('click',()=>{clearTimeout(toast.t);$('#toast').classList.remove('show')});
addEventListener('offline',()=>toast('You’re offline. Songs you saved for offline still work.'));addEventListener('online',()=>toast('Back online'));
const D=[
 {L:'A',id:'a',t:'Empty deck',ar:'Load a track from YAPS Library',g:'',bpm:null,dur:0,key:55,art:'var(--s3)',ini:'A',seed:3},
 {L:'B',id:'b',t:'Empty deck',ar:'Load a track from YAPS Library',g:'',bpm:null,dur:0,key:49,art:'var(--s3)',ini:'B',seed:9}];
D.forEach(d=>{d.pitch=0;d.pos=0;d.on=false;d.hc=[null,null,null,null];d.loop=0;d.ang=0;d.c=d.id=='a'?'#19c3ff':'#8b5cf6';d.dm=d.id=='a'?'rgba(25,195,255,.3)':'rgba(139,92,246,.38)';d.volv=.8;d.eq={lo:0,mi:0,hi:0};
 let s=d.seed*997;d.pk=Array.from({length:240},(_,i)=>{s=(s*16807)%2147483647;return Math.min(1,.14+(s/2147483647)*.55*(.55+.45*Math.sin(i*.06+d.seed))+.2*Math.abs(Math.sin(i*.31)))})});
function applyThemeColors(){const cs=getComputedStyle(document.documentElement),g=n=>cs.getPropertyValue(n).trim();const lt=document.documentElement.getAttribute('data-mode')==='light';D.forEach(d=>{const a=d.id=='a';d.c=lt?(a?'#19c3ff':'#a98bff'):(g(a?'--cy':'--pu')||(a?'#19c3ff':'#8b5cf6'));d.dm=lt?(a?'rgba(25,195,255,.34)':'rgba(169,139,255,.4)'):'rgba('+(g(a?'--cy-rgb':'--pu-rgb')||(a?'25,195,255':'139,92,246'))+','+(a?.3:.38)+')'})}
applyThemeColors();window.__themeChanged=applyThemeColors;
const deckHTML=d=>`<section class="pn deck ${d.id}" id="deck${d.L}"><div class="wfw"><div class="tag">${d.L}</div><canvas id="wf${d.L}"></canvas></div><div class="info"><div class="art" id="art${d.L}"></div><div class="meta"><b id="t${d.L}"></b><span id="ar${d.L}"></span><i id="g${d.L}"></i></div><div class="tm"><span id="tm${d.L}"></span><em id="bp${d.L}"></em></div></div>
<div class="ctl"><div class="btns"><button class="k" data-a="cue">CUE</button><button class="k pl" data-a="play" aria-label="Play or pause">▶ / ❚❚</button><button class="k" data-a="sync">SYNC</button></div>
<div class="jog"><div class="disc" id="jog${d.L}"><div class="hub">YAPS</div></div></div>
<div class="sl">+<input type="range" class="v" min="-16" max="16" step=".1" value="0" data-a="pitch" aria-label="Pitch deck ${d.L}"><output id="pt${d.L}">0.0%</output>PITCH<button class="sm" data-a="rp" aria-label="Reset pitch" style="min-width:0;padding:6px 8px;font-size:11px">RESET</button></div>
<div class="sl"><i class="fas fa-volume-high"></i><input type="range" class="v" min="0" max="100" value="80" data-a="vol" aria-label="Volume deck ${d.L}">VOLUME</div></div></section>`;
D.forEach(d=>$('#slot'+d.L).innerHTML=deckHTML(d));
const eqHTML=(d)=>['hi','mi','lo'].map(b=>`<div class="kn">${{hi:'HIGH',mi:'MID',lo:'LOW'}[b]}<div class="knob" data-d="${d.L}" data-b="${b}" role="slider" aria-label="${b} EQ deck ${d.L}" style="--kc:var(${d.id=='a'?'--cy':'--pu'})"></div></div>`).join('');
$('#eqA').innerHTML=eqHTML(D[0]);$('#eqB').innerHTML=eqHTML(D[1]);
$('#hc').innerHTML=D.map(d=>(d.L=='B'?'<b class="p" style="margin-left:14px">B</b>':'<b>A</b>')+[1,2,3,4].map(n=>`<button class="sm ${d.id=='b'?'pu':''}" data-hc="${d.L}${n-1}">${n}</button>`).join('')).join('');
const dk=L=>D[L=='A'?0:1],fmt=s=>{s=Math.max(0,s|0);return String(s/60|0).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
function ui0(d){const L=d.L;$('#t'+L).textContent=d.t;$('#ar'+L).textContent=d.ar;$('#g'+L).textContent=d.g;$('#bp'+L).textContent='BPM  '+(d.bpm?(d.bpm*(1+d.pitch/100)).toFixed(1):'n/a');const a=$('#art'+L);a.style.background=d.art;a.textContent=d.ini;$('#deck'+L).querySelector('.pl').classList.toggle('on',d.on)}
D.forEach(d=>d.pk=new Array(240).fill(.06));D.forEach(ui);
/* ---------- audio engine ---------- */
let C,master,an,recDest,nb;
const bq=(t,f)=>{const n=C.createBiquadFilter();n.type=t;n.frequency.value=f;return n};
function init(){if(C){C.resume();return}
 const AC=window.AudioContext||window.webkitAudioContext;try{C=new AC({latencyHint:'playback'})}catch(e){C=new AC()}
 if(!window.__acResume){window.__acResume=1;addEventListener('pointerdown',()=>{if(C&&C.state!=='running')C.resume()},true)}
 master=C.createGain();master.gain.value=.85;an=C.createAnalyser();recDest=C.createMediaStreamDestination();
 window.lim=C.createDynamicsCompressor();lim.threshold.value=-3;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.003;lim.release.value=.12;master.connect(lim);lim.connect(an);an.connect(C.destination);lim.connect(recDest);window.ma=C.createAnalyser();ma.fftSize=256;lim.connect(ma);
 nb=C.createBuffer(1,C.sampleRate,C.sampleRate);nb.getChannelData(0).forEach((_,i,a)=>a[i]=Math.random()*2-1);
 const ir=C.createBuffer(2,C.sampleRate*1.6,C.sampleRate);for(let c=0;c<2;c++)ir.getChannelData(c).forEach((_,i,a)=>a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,2.5));
 D.forEach(d=>{d.in=C.createGain();d.lo=bq('lowshelf',200);d.mi=bq('peaking',1200);d.hi=bq('highshelf',4000);d.fl=bq('lowpass',22000);d.vg=C.createGain();d.xg=C.createGain();
  d.dl=C.createDelay(1);d.dl.delayTime.value=.32;d.fb=C.createGain();d.fb.gain.value=.4;d.ew=C.createGain();d.ew.gain.value=0;d.cv=C.createConvolver();d.cv.buffer=ir;d.rw=C.createGain();d.rw.gain.value=0;
  d.in.connect(d.lo);d.lo.connect(d.mi);d.mi.connect(d.hi);d.hi.connect(d.fl);d.fl.connect(d.vg);d.vg.connect(d.xg);d.xg.connect(master);
  d.dl.connect(d.fb);d.fb.connect(d.dl);d.dl.connect(d.ew);d.ew.connect(master);d.cv.connect(d.rw);d.rw.connect(master);
  d.an=C.createAnalyser();d.an.fftSize=256;d.vg.connect(d.an);d.buf2=new Uint8Array(256)});
 D.forEach(applyEq);D.forEach(d=>d.vg.gain.value=d.volv);xfade();fx();if(typeof proInit==='function')proInit()}
const db=v=>v<=-.98?-40:v*12;
function applyEq(d){if(!C)return;d.lo.gain.value=db(d.eq.lo);d.mi.gain.value=db(d.eq.mi);d.hi.gain.value=db(d.eq.hi)}
let xv=.5;function xfade(){if(!C)return;const X=window.proXf||{},x=X.rev?1-xv:xv;let a,b;/* curves: smooth (equal power), blend (both full in the middle), cut (scratch) — set from the Pro Console MIXER+ tab */
 if(X.curve=='blend'){a=Math.min(1,2*(1-x));b=Math.min(1,2*x)}else if(X.curve=='cut'){a=x>.96?(1-x)/.04:1;b=x<.04?x/.04:1}else{a=Math.cos(x*Math.PI/2);b=Math.sin(x*Math.PI/2)}
 D[0].xg.gain.value=a;D[1].xg.gain.value=b}
const eff=d=>d.bpm?d.bpm*(1+d.pitch/100):null;
function osc(d,type,f0,f1,dur,g,t){const o=C.createOscillator(),e=C.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);e.gain.setValueAtTime(g,t);e.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(e);e.connect(d.in);o.start(t);o.stop(t+dur+.02)}
function noise(d,dur,g,t,f){const s=C.createBufferSource(),h=bq('highpass',f),e=C.createGain();s.buffer=nb;e.gain.setValueAtTime(g,t);e.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(h);h.connect(e);e.connect(d.in);s.start(t);s.stop(t+dur+.02)}
function hit(d,st,t){const a=d.id=='a',kick=a?[0,4,8,12]:[0,6,8,14],bass=a?[0,6,10]:[0,3,10,13];
 if(kick.includes(st))osc(d,'sine',150,45,.28,.9,t);
 if(st==4||st==12)noise(d,.16,.35,t,1800);
 if(st%2==0)noise(d,.04,.12,t,7000);
 if(bass.includes(st))osc(d,'sawtooth',d.key*(st==10?1.5:1),d.key*(st==10?1.5:1),.22,.22,t);
 if(a&&st==14)osc(d,'triangle',d.key*4,d.key*4,.18,.12,t)}
function sched(d){const s16=60/(d.bpm*(1+d.pitch/100))/4;while(d.next<C.currentTime+.15){hit(d,d.step,d.next);d.next+=s16;d.step=(d.step+1)%16}}
function play(d){init();if(d.on)return;if(!d.buf){toast('Load a track into Deck '+d.L+' first');return}d.on=true;
 if(d.buf){const s=C.createBufferSource(),rs=d.rsOn&&d.buf8&&d.buf8of===d.buf&&d.rsSplit;s.buffer=rs?d.buf8:d.buf;s.playbackRate.value=1+d.pitch/100;s.connect(rs?d.rsSplit:d.in);s.start(0,d.pos);d.src=s;applyLoop(d)}
 else{d.next=C.currentTime+.05;d.step=0;d.iv=setInterval(()=>sched(d),25)}ui(d)}
function stopD(d){if(!d.on)return;d.on=false;if(d.src){try{d.src.stop()}catch(e){}d.src=null}clearInterval(d.iv);ui(d)}
function applyLoop(d){if(!d.src)return;if(d.loop&&d.bpm){const spb=60/d.bpm;d.src.loopStart=d.pos;d.src.loopEnd=Math.min(d.dur,d.pos+d.loop*spb);d.src.loop=true}else d.src.loop=false}
/* ---------- controls ---------- */
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b&&b.tagName=='BUTTON'){const d=dk(b.closest('.deck').id.slice(-1)),a=b.dataset.a;
  if(a=='play'){d.on?stopD(d):play(d)}
  else if(a=='cue'){init();const was=d.on;stopD(d);d.pos=d.hc[0]??0;if(was)ui(d)}
  else if(a=='sync')doSync(d);else if(a=='rp'){d.pitch=0;setPitch(d)}}
 const f=e.target.closest('[data-fx]');if(f){f.classList.toggle('on');fx()}
 const h=e.target.closest('[data-hc]');if(h){const d=dk(h.dataset.hc[0]),i=+h.dataset.hc[1];if(d.hc[i]==null){d.hc[i]=d.pos;h.classList.add('on');toast('Hot cue '+(i+1)+' set at '+fmt(d.pos))}else{d.pos=d.hc[i];if(d.src){stopD(d);play(d)}}}
 const s=e.target.closest('[data-src]');if(s)srcPick(s.dataset.src,s)});
document.addEventListener('contextmenu',e=>{const h=e.target.closest('[data-hc]');if(h){e.preventDefault();dk(h.dataset.hc[0]).hc[+h.dataset.hc[1]]=null;h.classList.remove('on')}});
function setPitch0(d){const L=d.L,v=$('#deck'+L).querySelector('[data-a=pitch]');v.value=d.pitch;$('#pt'+L).textContent=d.pitch.toFixed(1)+'%';if(d.src)d.src.playbackRate.value=1+d.pitch/100;ui(d)}
document.addEventListener('input',e=>{const r=e.target;if(r.dataset.a=='pitch'){const d=dk(r.closest('.deck').id.slice(-1));d.pitch=+r.value;setPitch(d)}
 else if(r.dataset.a=='vol'){const d=dk(r.closest('.deck').id.slice(-1));d.volv=r.value/100;if(C)d.vg.gain.value=d.volv}
 else if(r.id=='xf'){xv=r.value/100;xfade()}else if(r.id=='mvol'&&C)master.gain.value=r.value/100});
function fx(){if(!C)init();const on=k=>$(`[data-fx=${k}]`).classList.contains('on');const eo=on('echo'),ro=on('rev');D.forEach(d=>{d.ew.gain.value=eo?.5:0;d.rw.gain.value=ro?.7:0;
  try{if(eo!==!!d._e){eo?d.vg.connect(d.dl):d.vg.disconnect(d.dl);d._e=eo}if(ro!==!!d._r){ro?d.vg.connect(d.cv):d.vg.disconnect(d.cv);d._r=ro}}catch(e){}d.fl.frequency.setTargetAtTime(on('fil')?700:22000,C.currentTime,.05)})}
$$('.knob').forEach(k=>{const d=dk(k.dataset.d),b=k.dataset.b;const set=v=>{d.eq[b]=Math.max(-1,Math.min(1,v));k.style.setProperty('--r',d.eq[b]*135+'deg');k.setAttribute('aria-valuenow',Math.round(d.eq[b]*100));applyEq(d)};
 k.addEventListener('pointerdown',e=>{k.setPointerCapture(e.pointerId);const y0=e.clientY,v0=d.eq[b];k.onpointermove=m=>set(v0+(y0-m.clientY)/80)});k.addEventListener('pointerup',()=>k.onpointermove=null);k.addEventListener('dblclick',()=>set(0))});
/* ---------- local files ---------- */
let tgt=0;
$('#file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;if(f.size>80e6){toast('That file is very large (over 80 MB). Try a shorter or compressed track.');e.target.value='';return}init();const d=D[tgt];tgt^=1;
 try{const ab=await C.decodeAudioData(await f.arrayBuffer());stopD(d);d.buf=ab;d.dur=ab.duration;d.pos=0;d.t=f.name.replace(/\.[^.]+$/,'');d.ar='Local file';d.g='Loaded from device';d.bpm=null;d.ini='♪';d.art='linear-gradient(135deg,var(--ma-d),var(--cy))';d.tid=null;d.cover='';
  const raw=ab.getChannelData(0),n=240,step=Math.floor(raw.length/n);d.pk=Array.from({length:n},(_,i)=>{let m=0;for(let j=0;j<step;j+=40)m=Math.max(m,Math.abs(raw[i*step+j]||0));return Math.max(.08,Math.min(1,m))});ui(d);postLoad(d);toast('Loaded into Deck '+d.L)}
 catch(err){toast('Couldn\u2019t read that audio file')}e.target.value=''});
/* ---------- AI DJ ---------- */

/* ══════ YAPS integration (real library, recording, save, publish) ══════
   Reused from index.html: catalogue shape (tracks[]), Supabase project/session, FastAPI /api/* endpoints. */
const LOC=(()=>{try{return self!==top?top.location:location}catch(e){return location}})();
/* ===== DEVELOPER CONFIG: edit only this block =====
   API_URL: your FastAPI base URL (empty = server features off; localhost uses :8000).
   SUPABASE_URL / SUPABASE_ANON_KEY: public client values. Safe in the browser ONLY with RLS enabled. NEVER put a service_role key here.
   AI_API_URL: optional future backend for server-side analysis (unused today). */
const YAPS_CONFIG={API_URL:'',AI_API_URL:'',SUPABASE_URL:'https://wnpqikufnwyiivrqfktk.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_1Dc7Ag-ZqsqJsgETEkxi5Q_VcG1w0XJ',BUCKETS:{public:'audio',private:'mixes-private',cover:'artwork'}};
const YAPS_API_URL=(LOC.hostname==='localhost'||LOC.hostname==='127.0.0.1')?'http://localhost:8000':(YAPS_CONFIG.API_URL||(()=>{try{return localStorage.getItem('yaps_shared_api')||''}catch(e){return ''}})());
const CATALOGUE=[{"id":201,"title":"Yoyo","artist":"Joshua Baraka","cover":"images/Joshua_Baraka.png","audio":"audio/Joshua Baraka - Yoyo.mp3","genre":"Afrobeats","duration":"2:25","tags":["Uganda","Trending","New","Afrobeats"]},{"id":200,"title":"Sissa","artist":"Dax Vibez","cover":"images/yaps-music-cover.jpg","audio":"audio/Dax Vibez - Sissa.mp3","genre":"Afrobeats","duration":"3:37","tags":["Uganda","Trending","New","Afrobeats"]},{"id":199,"title":"Sikiwa","artist":"Fik Fameica","cover":"images/Fik_Fameica.png","audio":"audio/Fik Fameica - Sikiwa.mp3","genre":"Afrobeats","duration":"3:13","tags":["Uganda","Trending","New","Afrobeats"]},{"id":198,"title":"Yeffe","artist":"Jose Chameleone ft. Jeff Kiwa","cover":"images/Jose Chameleon.jpg","audio":"audio/Jose Chameleone Ft Jeff Kiwa - Yeffe.mp3","genre":"Luganda Pop","duration":"2:57","tags":["Uganda","Trending","New","Luganda","Collab"]},{"id":197,"title":"Finally","artist":"Spice Diana","cover":"images/Spice_Diana.png","audio":"audio/Spice Diana - Finally.mp3","genre":"Afrobeats","duration":"2:51","tags":["Uganda","Trending","New","Afrobeats"]},{"id":196,"title":"Grave Into Gardens","artist":"Elevation Worship ft. Brandon Lake","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Elevation_Worship_-_Grave_Into_Gardens.mp3","genre":"Gospel","duration":"7:32","tags":["Weekend","New","Worship","Gospel"]},{"id":195,"title":"Here Again (Worthy)","artist":"Elevation Worship","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Elevation_Worship_-_Here_Again_Worthy.mp3","genre":"Gospel","duration":"9:03","tags":["Weekend","New","Worship","Gospel"]},{"id":194,"title":"10,000 Reasons (Bless the Lord)","artist":"Matt Redman","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Matt_Redman_-_10000_Reasons_Bless_The_Lord.mp3","genre":"Gospel","duration":"4:20","tags":["Weekend","New","Worship","Gospel"]},{"id":193,"title":"Oceans (Where Feet May Fail)","artist":"Hillsong UNITED","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Hillsong_UNITED_-_Oceans_Where_Feet_May_Fail.mp3","genre":"Gospel","duration":"9:00","tags":["Weekend","New","Worship","Gospel"]},{"id":192,"title":"Build My Life","artist":"Pat Barrett","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Pat_Barrett_-_Build_My_Life.mp3","genre":"Gospel","duration":"4:06","tags":["Weekend","New","Worship","Gospel"]},{"id":190,"title":"Battle Belongs","artist":"Phil Wickham","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Phil_Wickham_-_Battle_Belongs.mp3","genre":"Gospel","duration":"4:47","tags":["Weekend","New","Worship","Gospel"]},{"id":189,"title":"This Is Amazing Grace","artist":"Phil Wickham","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Phil_Wickham_-_This_Is_Amazing_Grace.mp3","genre":"Gospel","duration":"4:38","tags":["Weekend","New","Worship","Gospel"]},{"id":188,"title":"Reckless Love","artist":"Cory Asbury","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Cory_Asbury_-_Reckless_Love.mp3","genre":"Gospel","duration":"5:31","tags":["Weekend","New","Worship","Gospel"]},{"id":187,"title":"King of Heaven","artist":"Ryan Ofei","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Ryan_Ofei_-_King_Of_Heaven.mp3","genre":"Gospel","duration":"7:50","tags":["Weekend","New","Worship","Gospel"]},{"id":186,"title":"I Know Who I Am","artist":"Sinach","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Sinach_-_I_Know_Who_I_Am.mp3","genre":"Gospel","duration":"6:10","tags":["Weekend","New","Worship","Gospel"]},{"id":185,"title":"Way Maker","artist":"Sinach","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Sinach_-_Way_Maker.mp3","genre":"Gospel","duration":"5:05","tags":["Weekend","New","Worship","Gospel"]},{"id":184,"title":"What A Beautiful Name","artist":"Hillsong Worship","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Hillsong_Worship_-_What_A_Beautiful_Name.mp3","genre":"Gospel","duration":"5:42","tags":["Weekend","New","Worship","Gospel"]},{"id":183,"title":"House of the Lord","artist":"Vertical Worship","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Vertical_Worship_-_House_Of_The_Lord.mp3","genre":"Gospel","duration":"4:50","tags":["Weekend","New","Worship","Gospel"]},{"id":182,"title":"Yesu Beera Nange","artist":"Judith Babirye","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Judith_Babirye_-_Yesu_Beera_Nange.mp3","genre":"Gospel","duration":"6:17","tags":["Weekend","New","Worship","Gospel","Uganda"]},{"id":181,"title":"Wambatira","artist":"Judith Babirye","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Judith_Babirye_-_Wambatira.mp3","genre":"Gospel","duration":"5:22","tags":["Weekend","New","Worship","Gospel","Uganda"]},{"id":180,"title":"Omukisa Gwa Mukama","artist":"Judith Babirye","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Judith_Babirye_-_Omukisa_Gwa_Mukama.mp3","genre":"Gospel","duration":"4:36","tags":["Weekend","New","Worship","Gospel","Uganda"]},{"id":179,"title":"Katonda Tageya (Lopela Katonda)","artist":"Gabie Ntaate","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Gabie_Ntaate_-_Katonda_Tageya.mp3","genre":"Gospel","duration":"2:29","tags":["Weekend","New","Worship","Gospel","Uganda"]},{"id":178,"title":"Gwasembayo","artist":"Gabie Ntaate","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Gabie_Ntaate_-_Gwasembayo.mp3","genre":"Gospel","duration":"3:45","tags":["Weekend","New","Worship","Gospel","Uganda"]},{"id":177,"title":"Brag About God","artist":"Gabie Ntaate","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Gabie_Ntaate_-_Brag_About_God.mp3","genre":"Gospel","duration":"3:50","tags":["Weekend","New","Worship","Gospel","Uganda"]},{"id":176,"title":"What A Friend We Have In Jesus","artist":"Traditional Hymn","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Christian_Hymn_-_What_A_Friend_We_Have_In_Jesus.mp3","genre":"Gospel","duration":"4:16","tags":["Weekend","New","Worship","Gospel","Hymn"]},{"id":175,"title":"Do It Again (Live)","artist":"Elevation Worship","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Do-It-Again-Live-Elevation-Worship.mp3","genre":"Gospel","duration":"10:15","tags":["Weekend","New","Worship","Gospel"]},{"id":174,"title":"King Of My Heart","artist":"David Funk","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/David_Funk_-_King_Of_My_Heart.mp3","genre":"Gospel","duration":"9:01","tags":["Weekend","New","Worship","Gospel"]},{"id":173,"title":"Raise A Hallelujah","artist":"Dante Bowe & Jenn Johnson","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Dante_Bowe_Jenn_Johnson_-_Raise_A_Hallelujah.mp3","genre":"Gospel","duration":"6:14","tags":["Weekend","New","Worship","Gospel"]},{"id":172,"title":"Firm Foundation (He Won't)","artist":"Cody Carnes","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Cody_Carnes_-_Firm_Foundation_He_Wont.mp3","genre":"Gospel","duration":"6:22","tags":["Weekend","New","Worship","Gospel"]},{"id":171,"title":"Jesus Keep Me Near The Cross","artist":"Traditional Hymn","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Christian_Hymn_-_Jesus_Keep_Me_Near_The_Cross.mp3","genre":"Gospel","duration":"3:05","tags":["Weekend","New","Worship","Gospel","Hymn"]},{"id":170,"title":"Calm Down","artist":"Vyroota","cover":"images/Vyroota.png","audio":"audio/Vyroota - Calm Down.mp3","genre":"Luganda Pop","duration":"2:40","tags":["Uganda","New","Luganda"]},{"id":169,"title":"Dangerous","artist":"Ceaserous","cover":"images/Ceaserous - Dangerous.jpg","audio":"audio/Ceaserous - Dangerous.mp3","genre":"Afrobeats","duration":"3:27","tags":["Uganda","Trending","New","Afrobeats"]},{"id":168,"title":"Ndi Omu","artist":"Ava Peace","cover":"images/Ava peace.png","audio":"audio/Ava Peace - Ndi Omu.mp3","genre":"Afrobeats","duration":"2:55","tags":["Uganda","Popular","Afrobeats"]},{"id":167,"title":"Onzise","artist":"Dax Vibez & Rema Namakula","cover":"images/Rema_Namakula.png","audio":"audio/Dax Vibez & Rema Namakula - Onzise.mp3","genre":"Afropop","duration":"2:52","tags":["Uganda","Popular","Afropop","Collab"]},{"id":166,"title":"Middle","artist":"Vinka","cover":"images/Vinka.png","audio":"audio/Middle - Vinka.mp3","genre":"Afropop","duration":"2:47","tags":["Uganda","Popular","Afropop"]},{"id":165,"title":"Miracles (Extended)","artist":"James Ploh ft. A Pass & Kiboo","cover":"images/Apass.png","audio":"audio/James_Ploh_Official_-_Miracles_Extended_-_A_Pass___Kiboo.mp3","genre":"Dancehall","duration":"2:56","tags":["Uganda","Trending","New","Dancehall","Collab"]},{"id":164,"title":"Bikyaganye","artist":"Dokta Brain","cover":"images/Dokta_Brain.png","audio":"audio/Dokta Brain - Bikyaganye.mp3","genre":"Afrobeats","duration":"3:29","tags":["Uganda","Trending","New","Afrobeats"]},{"id":163,"title":"Moni Ami","artist":"Gloria Bugie","cover":"images/Gloria_Bugie.png","audio":"audio/Gloria Bugie - Moni Ami.mp3","genre":"Afropop","duration":"3:58","tags":["Uganda","Trending","New","Afropop"]},{"id":162,"title":"Chap Chap","artist":"Lutty Neika","cover":"images/Anaconda_Lutty_Neika_Bravion_Emcee.png","audio":"audio/Lutty Neika - Chap Chap.mp3","genre":"Afropop","duration":"2:57","tags":["Uganda","Trending","New","Afropop"]},{"id":161,"title":"Stress Killer","artist":"Sheebah Karungi","cover":"images/Sheebah.jpg","audio":"audio/Sheebah Karungi - Stress Killer.mp3","genre":"Afrobeats","duration":"2:50","tags":["Uganda","Trending","New","Afrobeats"]},{"id":160,"title":"Nebirungi Byogere","artist":"Sqoop Larma","cover":"images/Sqoop_Larma_Temutuloga.webp","audio":"audio/Sqoop Larma - Nebirungi Byogere.mp3","genre":"Afrobeats","duration":"2:41","tags":["Uganda","Trending","New","Afrobeats"]},{"id":159,"title":"Nassanga (Remix)","artist":"Kalifah AgaNaga ft. Eddy Kenzo, Winnie Nwagi, Lil Pazo & Weasel","cover":"images/nassanga_remix.jpg","audio":"audio/Kalifah AgaNaga ft. Eddy Kenzo, Winnie Nwagi, Lil Pazo & Weasel - Nassanga (Remix).mp3","genre":"Afrobeats","duration":"3:44","tags":["Uganda","Trending","New","Collab","Remix"]},{"id":158,"title":"Nigina","artist":"Hoozambe D.Star","cover":"images/1000014852.png","audio":"audio/Hoozambe-DStar-Nigina.mp3","genre":"Afrobeats","duration":"2:25","tags":["Uganda","Trending","New","Afrobeats"]},{"id":156,"title":"Daddy","artist":"Da Agent","cover":"images/Da_Agent.png","audio":"audio/Da_Agent_Daddy.mp3","genre":"Afrobeats","duration":"3:30","tags":["Uganda","Trending","Afrobeats"]},{"id":1,"title":"P2","artist":"King Saha","cover":"images/King_Saha_-_P2.jpg","audio":"audio/King_Saha_-_P2.mp3","genre":"Luganda Pop","duration":"3:52","tags":["Uganda","Trending","Luganda"]},{"id":2,"title":"Wano Wano","artist":"Rema Namakula","cover":"images/Rema_Namakula.png","audio":"audio/Rema - Wano Wano.mp3","genre":"Afropop","duration":"4:05","tags":["Uganda","Trending","Afropop"]},{"id":3,"title":"Kunsi","artist":"Vyroota","cover":"images/Vyroota.png","audio":"audio/Vyroota - Kunsi.mp3","genre":"Luganda Pop","duration":"3:28","tags":["Uganda","Trending","Luganda"]},{"id":4,"title":"Toma","artist":"Vyroota","cover":"images/Vyroota.png","audio":"audio/Vyroota - Toma.mp3","genre":"Luganda Pop","duration":"3:24","tags":["Uganda","Trending","Luganda"]},{"id":5,"title":"Champion Gal","artist":"Fik Fameica","cover":"images/Fik_Fameica.png","audio":"audio/Fik Fameica - Champion Gal.mp3","genre":"Afrobeats","duration":"3:29","tags":["Uganda","Trending","New","Afrobeats"]},{"id":6,"title":"Angella","artist":"John Blaq","cover":"images/John blaq.png","audio":"audio/John Blaq - Angella.mp3","genre":"Afropop","duration":"3:41","tags":["Uganda","Trending","New","Afropop"]},{"id":7,"title":"Mine","artist":"Vinka","cover":"images/Vinka.png","audio":"audio/Mine - Vinka (erycom)_1775090955.mp3","genre":"Afropop","duration":"3:33","tags":["Uganda","Trending","Afropop"]},{"id":8,"title":"Ngezaako","artist":"John Blaq","cover":"images/John blaq.png","audio":"audio/John Blaq - Ngezaako.mp3","genre":"Luganda Pop","duration":"3:58","tags":["Uganda","Trending","Luganda","TikTok"]},{"id":9,"title":"Nsi Namba","artist":"TPaul ft. Sheebah","cover":"images/Sheebah.jpg","audio":"audio/Sheebah Ft Tpaul 256 - Nsi Namba.mp3","genre":"Afrobeats","duration":"3:35","tags":["Uganda","Trending","TikTok"]},{"id":10,"title":"Daily Bundle","artist":"Elijah Kitaka","cover":"images/Eliaja Kitaka.png","audio":"audio/Elijah Kitaka - Daily bundle.mp3","genre":"Afropop","duration":"3:18","tags":["Uganda","Trending"]},{"id":11,"title":"See You Tonight","artist":"Omega 256 ft. Cindy Sanyu","cover":"images/see you tonight.jpg","audio":"audio/See You Tonight - Omega 256 & Cindy Sanyu (erycom)_1755435655.mp3","genre":"R&B","duration":"3:44","tags":["Uganda","Trending","RnB"]},{"id":12,"title":"Wrong Places","artist":"Joshua Baraka & JAE5","cover":"images/Joshua Baraka.png","audio":"audio/Joshua Baraka - Wrong Places.mp3","genre":"Afrobeats","duration":"3:37","tags":["Uganda","Trending","Afrobeats"]},{"id":13,"title":"This Time","artist":"Joshua Baraka","cover":"images/Joshua_Baraka.png","audio":"audio/Joshua Baraka - This Time.mp3","genre":"R&B","duration":"3:47","tags":["Uganda","Trending","TikTok"]},{"id":14,"title":"Siaka","artist":"Fik Fameica & Mejja","cover":"images/Fik_Fameica.png","audio":"audio/Fik Fameica, Mejja - Siaka.mp3","genre":"Afrobeats","duration":"3:31","tags":["Uganda","Trending","Collab"]},{"id":15,"title":"London","artist":"Kapeke","cover":"images/Kapeke.png","audio":"audio/Kapeke - London.mp3","genre":"Afropop","duration":"3:22","tags":["Uganda","Trending","Afropop"]},{"id":16,"title":"Ntwala","artist":"Pawaboy & Jowy Landa","cover":"images/Pawaboy.jpg","audio":"audio/Pawaboy, Jowy Landa - Ntwala.mp3","genre":"Luganda Pop","duration":"3:41","tags":["Uganda","Trending","Luganda"]},{"id":17,"title":"Nalokinga","artist":"Pawaboy","cover":"images/Pawaboy.jpg","audio":"audio/Pawaboy - Nalokinga.mp3","genre":"Luganda Pop","duration":"3:36","tags":["Uganda","Trending","Luganda"]},{"id":18,"title":"Oyaya","artist":"Lutty Neika","cover":"images/Neika Oyaya.jpg","audio":"audio/Lutty Neika - Oyaya.mp3","genre":"Afropop","duration":"3:19","tags":["Uganda","Trending"]},{"id":19,"title":"Yandalula","artist":"Pawaboy","cover":"images/Pawaboy.jpg","audio":"audio/Pawaboy - Yandalula.mp3","genre":"Afropop","duration":"3:19","tags":["Uganda","Trending"]},{"id":21,"title":"Addict","artist":"Azawi","cover":"images/Azawi.png","audio":"audio/Addict - Azawi (erycom)_1774696906.mp3","genre":"Afrobeats","duration":"3:45","tags":["Uganda","Trending","Afrobeats"]},{"id":22,"title":"Number Mojja","artist":"Levixone ft. Winnie Nwagi","cover":"images/g2w-gospel-to-the-world.png","audio":"audio/Number Moja - Levixone & Winnie Nwagi (erycom)_1777669338.mp3","genre":"Gospel","duration":"4:02","tags":["Uganda","Gospel","Collab"]},{"id":23,"title":"Go","artist":"Karole Kasita","cover":"images/Karole kasita.jpg","audio":"audio/Karole Kasita ft Elijah Kitaka - Go (Remix).mp3","genre":"Afropop","duration":"3:27","tags":["Uganda","Trending","New","Afropop"]},{"id":25,"title":"Nzalina","artist":"Feffe Bussi ft. Winnie Nwagi, Spice Diana, Kapeke & Dax Vibez","cover":"images/Nzalina.jpg","audio":"audio/Feffe Bussi Ft Winnie Nwagi, Spice Diana, Dax Vibez, Kapeke - Nzalina.mp3","genre":"Afrobeats","duration":"4:01","tags":["Uganda","Collab","TikTok"]},{"id":26,"title":"Tema Ensingo Kaba","artist":"Kapeke","cover":"images/Kapeke.png","audio":"audio/Kapeke - Kaba.mp3","genre":"Luganda Pop","duration":"3:29","tags":["Uganda","Luganda"]},{"id":28,"title":"Wewe","artist":"King Saha","cover":"images/king saha.jpg","audio":"audio/King_Saha_-_Wewe.mp3","genre":"Luganda Pop","duration":"3:54","tags":["Uganda","Luganda"]},{"id":32,"title":"Biggwa","artist":"Liam Voice & Fik Fameica","cover":"images/Fik_Fameica.png","audio":"audio/Liam Voice & Fik Fameica - Biggwa.mp3","genre":"Afropop","duration":"3:42","tags":["Uganda","Collab","Afropop"]},{"id":37,"title":"Anaconda","artist":"Lutty Neika & Bravion Emcee","cover":"images/Anaconda_Lutty_Neika_Bravion_Emcee.png","audio":"audio/Anaconda.mp3","genre":"Afrobeats","duration":"3:26","tags":["Uganda","Trending","Collab"]},{"id":51,"title":"Baddie Remix","artist":"Shannon ft. Fik Fameica, AaronX, Tojo & DJ Lito","cover":"images/Fik_Fameica.png","audio":"audio/Shannon ft. Fik Fameica, AaronX, Tojo & DJ Lito - Baddie Remix.mp3","genre":"Afropop","duration":"3:45","tags":["Uganda","Remix","Collab","TikTok"]},{"id":52,"title":"Tobingamba","artist":"Acidic Vokoz & Ava Peace","cover":"images/Ava peace.png","audio":"audio/Acidic Vokoz, Ava Peace - Tobingamba.mp3","genre":"Afrobeats","duration":"3:22","tags":["Uganda","Afrobeats"]},{"id":54,"title":"Gundi (Remix)","artist":"Kapeke & Mimi Kampala","cover":"images/Kapeke.png","audio":"audio/Kapeke & Mimi Kampala - Gundi (Remix).mp3","genre":"Afrobeats","duration":"3:28","tags":["Uganda","Remix","Collab"]},{"id":55,"title":"Nze Nakiriza","artist":"Spice Diana & Vyroota","cover":"images/Spice_Diana.png","audio":"audio/Spice Diana & Vyroota - Nze Nakiriza.mp3","genre":"Afrobeats","duration":"3:38","tags":["Uganda","Collab","New","Afrobeats"]},{"id":58,"title":"Valu Valu","artist":"Jose Chameleone","cover":"images/yaps-music-cover.jpg","audio":"audio/Jose_Chameleone_Valu_Valu.mp3","genre":"Luganda Pop","duration":"4:02","tags":["Uganda","Classic","AllTime","Luganda"]},{"id":83,"title":"Love You Everyday","artist":"Bebe Cool","cover":"images/Bebe Cool.png","audio":"audio/Love_you_everyday.mp3","genre":"Afropop","duration":"3:59","tags":["Uganda","AllTime","Classic"]},{"id":117,"title":"Kampala","artist":"Pallaso","cover":"images/pallaso","audio":"audio/Pallaso_Kampala.mp3","genre":"Afropop","duration":"3:58","tags":["Uganda","AllTime","Classic"]},{"id":150,"title":"Sirubala","artist":"Vinka","cover":"images/Vinka.png","audio":"audio/Vinka_Sirubala.mp3","genre":"Afropop","duration":"3:35","tags":["Uganda","AllTime","Classic"]},{"id":157,"title":"Temutuloga","artist":"Sqoop Larma","cover":"images/Sqoop_Larma_Temutuloga.webp","audio":"audio/Sqoop Larma - Temutuloga.mp3","genre":"Afrobeats","duration":"3:00","tags":["Uganda","Trending","Afrobeats"]}];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const src=u=>/^(https?:|blob:|data:)/.test(u)?u:encodeURI(u);
let library=CATALOGUE.slice(),mode='lib';
const load=(L,t)=>loadTrack(L,t);

/* ── Connect to index.html: same songs as the YAPSMusic app ──
   1) yaps_shared_catalogue (localStorage) = live song list that index.html keeps up to date.
   2) IndexedDB 'YapsMusicDB' = songs the user uploaded on this device (same origin as index.html).
   3) /api/tracks = shared uploads from the server (see loadRemote). Built-in CATALOGUE stays as fallback. */
function addTracks(rows){rows.forEach(x=>{if(!x||!x.audio)return;const i=library.findIndex(t=>String(t.id)===String(x.id));if(i<0)library.push(x);else library[i]=Object.assign({},library[i],x)})}
function readShared(){try{const a=JSON.parse(localStorage.getItem('yaps_shared_catalogue')||'[]');if(Array.isArray(a))addTracks(a)}catch(e){console.warn('Shared catalogue unavailable',e)}}
/* Songs downloaded for offline in YAPSMusic (IndexedDB 'YapsMusicDB' / store 'downloads', keyed by the song's audio path).
   They play from the saved copy, so Studio works with no internet. */
const dlBlobs=new Map(),dlIds=new Set();
const nk=u=>{try{return decodeURIComponent(String(u))}catch(e){return String(u)}};
const isOff=id=>offIds.has(String(id))||dlIds.has(String(id));
function addDownloads(rows){(rows||[]).forEach(r=>{if(!r||!r.blob||r.id==null)return;const key=String(r.id),fresh=!dlBlobs.has(key);
  dlBlobs.set(key,r.blob);dlBlobs.set(nk(key),r.blob);
  const hit=library.find(t=>t.audio&&(String(t.audio)===key||nk(t.audio)===nk(key)));
  if(hit){dlIds.add(String(hit.id));return}
  const id='dl:'+key;dlIds.add(id);
  if(fresh)addTracks([{id,title:r.title||'Saved song',artist:r.artist||'Unknown Artist',cover:r.img||'',audio:URL.createObjectURL(r.blob),genre:r.genre||'',duration:r.duration||'',tags:[],local:true,dl:true}])})}
async function readDownloads(){
 try{const db=await new Promise((res,rej)=>{const r=indexedDB.open('YapsMusicDB');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onupgradeneeded=()=>{r.transaction.abort()}});
  if(!db.objectStoreNames.contains('downloads')){db.close();return}
  const rows=await new Promise((res,rej)=>{const q=db.transaction('downloads','readonly').objectStore('downloads').getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error)});db.close();addDownloads(rows)}
 catch(e){console.warn('Downloads unavailable:',e&&e.message)}}
async function readDeviceUploads(){
 try{const db=await new Promise((res,rej)=>{const r=indexedDB.open('YapsMusicDB');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onupgradeneeded=()=>{r.transaction.abort()}});
  const names=db.objectStoreNames;
  const all=s=>new Promise((res,rej)=>{const q=db.transaction(s,'readonly').objectStore(s).getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error)});
  if(names.contains('downloads')){try{addDownloads(await all('downloads'))}catch(e){console.warn('Downloads unavailable',e)}}
  if(!names.contains('tracks')||!names.contains('audio')){db.close();return}
  const meta=await all('tracks'),au=await all('audio'),ar=names.contains('artwork')?await all('artwork'):[];db.close();
  const A={},C={};au.forEach(r=>A[r.id]=r.blob);ar.forEach(r=>C[r.id]=r.blob);
  addTracks(meta.filter(m=>A[m.id]).map(m=>({id:String(m.id),title:m.title,artist:m.artist,cover:C[m.id]?URL.createObjectURL(C[m.id]):'',audio:URL.createObjectURL(A[m.id]),genre:m.genre||'',duration:m.duration||'',tags:m.tags||[],local:true,up:true})))}
 catch(e){console.warn('Device uploads unavailable:',e&&e.message)}}
readShared();
/* ══════ Stay inside the YAPSMusic app: on phones Studio runs in a rotated frame, so links to the app must open in the whole window ══════ */
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(!a||self===top)return;const h=a.getAttribute('href')||'';if(/^song-creator\.html/.test(h)&&top.openSongCreator){e.preventDefault();try{top.openSongCreator();return}catch(x){}}
 if(!/^index\.html/.test(h))return;
 e.preventDefault();try{if(top.__closeStudio){top.__closeStudio(h);return}top.location.href=new URL(h,top.location.href).href}catch(x){location.href=h}},true);
/* ══════ Offline songs: audio saved in this browser (IndexedDB 'yaps_offline_v1'), details in localStorage ══════ */
const offIds=new Set(),offBusy=new Set();
const offMeta=()=>{try{return JSON.parse(localStorage.getItem('yaps_offline_meta')||'{}')||{}}catch(e){return{}}};
const setMeta=m=>{try{localStorage.setItem('yaps_offline_meta',JSON.stringify(m))}catch(e){}};
const offDB=()=>new Promise((res,rej)=>{const r=indexedDB.open('yaps_offline_v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('songs',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function offTx(m,fn){const db=await offDB();return new Promise((res,rej)=>{const tx=db.transaction('songs',m);const q=fn(tx.objectStore('songs'));tx.oncomplete=()=>{db.close();res(q&&q.result)};tx.onerror=tx.onabort=()=>{db.close();rej(tx.error||(q&&q.error))}})}
try{const m=offMeta();Object.keys(m).forEach(k=>offIds.add(k));addTracks(Object.values(m))}catch(e){}
async function netBuf(url,onP){let lastErr;
 for(let n=0;n<3;n++){const ac=new AbortController();let stall;const bump=()=>{clearTimeout(stall);stall=setTimeout(()=>ac.abort(),20000)};
  try{bump();const r=await fetch(url,{signal:ac.signal});
   if(!r.ok){const e=new Error('HTTP '+r.status);e.fatal=r.status>=400&&r.status<500;throw e}
   const total=+r.headers.get('content-length')||0;
   if(!r.body||!r.body.getReader){const b=await r.arrayBuffer();clearTimeout(stall);return b}
   const rd=r.body.getReader(),parts=[];let got=0;
   for(;;){const x=await rd.read();if(x.done)break;parts.push(x.value);got+=x.value.length;bump();if(onP)onP(got,total)}
   clearTimeout(stall);return await new Blob(parts).arrayBuffer()}
  catch(e){clearTimeout(stall);lastErr=e;if(e&&e.fatal)break;if(!navigator.onLine){lastErr=new Error('OFFLINE');break}
   if(e&&e.name==='AbortError')lastErr=new Error('TIMEOUT');if(n<2)await new Promise(r=>setTimeout(r,800*(n+1)))}}
 throw lastErr||new Error('Network')}
async function getBuf(t,onP){const id=String(t.id),au=String(t.audio||'');
 if(/^(blob:|data:)/.test(au)){try{return await (await fetch(au)).arrayBuffer()}catch(e){throw new Error('This song could not be read from your device. Add it again in My Device.')}}
 const dlb=dlBlobs.get(au)||dlBlobs.get(nk(au));if(dlb){try{return await dlb.arrayBuffer()}catch(e){console.warn('Downloaded copy unreadable, using network',e)}}
 if(offIds.has(id)){try{const r=await offTx('readonly',s=>s.get(id));if(r&&r.blob)return await r.blob.arrayBuffer()}catch(e){console.warn('Offline copy unreadable, using network',e)}}
 if(!navigator.onLine)throw new Error('OFFLINE');
 return await netBuf(src(t.audio),onP)}
async function toggleOff(id){const t=library.find(x=>String(x.id)===String(id));if(!t)return;id=String(t.id);
 if(dlIds.has(id)&&!offIds.has(id)){toast('Saved offline from YAPSMusic. Remove it there under Downloads.');return}
 if(offIds.has(id)){try{await offTx('readwrite',s=>s.delete(id))}catch(e){}offIds.delete(id);const m=offMeta();delete m[id];setMeta(m);toast('Removed from offline: '+t.title);if($('#libd').open)render();return}
 if(t.local||/^blob:/.test(t.audio||'')){toast('This song is already on your device');return}
 if(!navigator.onLine){toast('Go online to save this song for offline');return}
 offBusy.add(id);if($('#libd').open)render();toast('Saving “'+t.title+'” for offline…');
 try{const r=await fetch(src(t.audio));if(!r.ok)throw new Error('HTTP '+r.status);const blob=await r.blob();
  await offTx('readwrite',s=>s.put({id,blob,saved:Date.now()}));
  offIds.add(id);const m=offMeta();m[id]={id:t.id,title:t.title,artist:t.artist,genre:t.genre||'',duration:t.duration||'',bpm:t.bpm||null,cover:t.cover||'',audio:t.audio};setMeta(m);
  toast('Saved offline: '+t.title);try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}}
 catch(e){console.warn(e);toast(/Quota/i.test(String(e&&e.name))?'Phone storage is full. Remove some offline songs first.':'Couldn’t save “'+t.title+'”. Check your connection and try again.')}
 offBusy.delete(id);if($('#libd').open)render()}
const libReady=readDeviceUploads().then(()=>{if($('#libd').open)render()});

/* Load a real track into a deck: fetch + decode so loops, hot cues, EQ and effects all work */
async function loadTrack0(L,t){const d=dk(L);
 if(t.duration){const p=String(t.duration).split(':').map(Number);if((p[0]||0)*60+(p[1]||0)> (matchMedia('(pointer:coarse)').matches?360:600)){toast('“'+t.title+'” is too long to mix two decks on a phone (max 6 min). Pick a shorter track.');return}}
 init();toast('Loading '+t.title+'…');
 try{const tok=d.lt=(d.lt||0)+1;let lastP=-1;
  const onP=(g,tot)=>{if(d.lt!==tok)return;const p=tot?Math.min(99,Math.round(g/tot*100)):-1,k=tot?p:Math.floor(g/262144);if(k===lastP)return;lastP=k;toast('Loading '+t.title+'… '+(tot?p+'%':(g/1048576).toFixed(1)+' MB'))};
  const raw0=await getBuf(t,onP);if(d.lt!==tok)return;toast('Preparing “'+t.title+'”…');
  const ab=await C.decodeAudioData(raw0);if(d.lt!==tok)return;
  stopD(d);d.buf=ab;d.dur=ab.duration;d.pos=0;d.pitch=0;d.hc=[null,null,null,null];d.loop=0;
  d.t=t.title;d.ar=t.artist;d.g=t.genre||'';d.bpm=t.bpm||null;d.art=t.cover?'url("'+src(t.cover)+'") center/cover':'linear-gradient(135deg,var(--ma-d),var(--cy))';d.ini='';d.tid=t.local?null:String(t.id);d.cover=t.cover||'';
  const raw=ab.getChannelData(0),n=240,step=Math.floor(raw.length/n);d.pk=Array.from({length:n},(_,i)=>{let m=0;for(let j=0;j<step;j+=40)m=Math.max(m,Math.abs(raw[i*step+j]||0));return Math.max(.08,Math.min(1,m))});
  setPitch(d);$$('[data-hc^="'+L+'"]').forEach(x=>x.classList.remove('on'));ui(d);toast('Loaded into Deck '+L)}
 catch(e){console.warn(e);toast(loadErr(e,t.title))}}

/* ══════ My Device — songs and videos picked once, kept in this browser, shared with index.html ══════
   Same IndexedDB as the YAPSMusic "On This Device" page: 'yaps_device_v1' / store 'tracks'. */
const DEV_AUDIO_RE=/\.(mp3|aac|ogg|oga|opus|flac|wav|m4a|wma|amr)$/i,DEV_VIDEO_RE=/\.(mp4|m4v|mov|webm|mkv|3gp|3g2|avi)$/i;
const devKind=f=>/^video\//.test(f.type)||DEV_VIDEO_RE.test(f.name)?'video':(/^audio\//.test(f.type)||DEV_AUDIO_RE.test(f.name)?'audio':null);
const devIsVid=r=>(r.kind||(r.blob&&/^video\//.test(r.blob.type)?'video':'audio'))==='video';
let devRows=[],devFresh=false;
function devOpen(){return new Promise((res,rej)=>{const r=indexedDB.open('yaps_device_v1',1);r.onupgradeneeded=()=>{const st=r.result.createObjectStore('tracks',{keyPath:'id',autoIncrement:true});st.createIndex('name','name',{unique:false})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function devTx(m,fn){const db=await devOpen();return new Promise((res,rej)=>{const tx=db.transaction('tracks',m);const q=fn(tx.objectStore('tracks'));tx.oncomplete=()=>{db.close();res(q&&q.result)};tx.onerror=tx.onabort=()=>{db.close();rej(tx.error||(q&&q.error))}})}
const devAll=()=>devTx('readonly',s=>s.getAll()),devAdd=r=>devTx('readwrite',s=>s.add(r)),devDel=id=>devTx('readwrite',s=>s.delete(id));
async function devRefresh(){try{devRows=await devAll()||[]}catch(e){devRows=[];console.warn('Device library unavailable',e)}devFresh=true}
const devParse=n=>{const b=n.replace(/\.[^.]+$/,'').replace(/_/g,' '),m=b.match(/^(.+?)\s*[-–—]\s*(.+)$/);return m?{artist:m[1].trim(),name:m[2].trim()}:{artist:'Unknown Artist',name:b}};
const devFmt=s=>{if(!isFinite(s)||s<0)return '—';return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')};
function devProbe(f,k){return new Promise(res=>{const el=document.createElement(k==='video'?'video':'audio'),u=URL.createObjectURL(f),done=v=>{URL.revokeObjectURL(u);res(v)};el.preload='metadata';el.onloadedmetadata=()=>done(devFmt(el.duration));el.onerror=()=>done('—');setTimeout(()=>done('—'),8000);el.src=u})}
async function devImport(files){
 const media=files.filter(f=>devKind(f));
 if(!media.length){if(files.length)toast('Pick songs or videos (MP3, M4A, WAV, MP4, WEBM).');return}
 if(!devFresh)await devRefresh();
 toast('Adding '+media.length+' file'+(media.length>1?'s':'')+'…');
 const seen=new Set(devRows.map(r=>r.name+'|'+(r.size||(r.blob&&r.blob.size)||0)));let added=0,dup=0,full=false;
 for(const f of media){const k=devKind(f),m=devParse(f.name);if(seen.has(m.name+'|'+f.size)){dup++;continue}
  const dur=await devProbe(f,k);
  try{await devAdd({name:m.name,artist:m.artist,duration:dur,kind:k,size:f.size,added:Date.now(),blob:f});seen.add(m.name+'|'+f.size);added++}
  catch(e){if(e&&e.name==='QuotaExceededError'){full=true;break}console.warn(e)}}
 try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
 devFresh=false;if($('#libd').open&&mode==='device')render();
 toast(full?'Phone storage is full. '+added+' added. Remove some files and try again.':added?added+' file'+(added>1?'s':'')+' added'+(dup?' ('+dup+' already saved)':''):dup?'Those files are already saved':'Could not save those files. Try again.')}
async function devWalk(dir,out,depth){if(depth>4)return;for await(const [n,h] of dir.entries()){if(h.kind==='file'){if(DEV_AUDIO_RE.test(n)||DEV_VIDEO_RE.test(n))out.push(await h.getFile())}else await devWalk(h,out,depth+1)}}
async function devFolder(){try{const d=await window.showDirectoryPicker({mode:'read'}),out=[];await devWalk(d,out,0);if(!out.length)return toast('No songs or videos found in that folder.');await devImport(out)}catch(e){if(!e||e.name!=='AbortError')toast('Could not read that folder. Use Add songs and videos instead.')}}
async function devLoad(L,r){const v=devIsVid(r);
 if(r.blob.size>(v?300e6:80e6)){toast('“'+r.name+'” is too large to mix on a phone. Try a shorter or smaller file.');return}
 const u=URL.createObjectURL(r.blob);
 await loadTrack(L,{id:'dev'+r.id,title:r.name,artist:r.artist,cover:'',audio:u,genre:v?'Video · audio track':'',duration:r.duration,local:true});
 setTimeout(()=>URL.revokeObjectURL(u),120000)}
function renderDevice(){
 const head='<div class="drow" style="margin-bottom:8px"><button class="k pl" data-dev="add">Add songs and videos</button>'+(window.showDirectoryPicker?'<button class="k" data-dev="dir">Add a folder</button>':'')+'</div>';
 if(!devFresh){$('#list').innerHTML=head+'<div class="empty">Loading your device library…</div>';devRefresh().then(()=>{if($('#libd').open&&mode==='device')renderDevice()});return}
 const q=$('#q').value.trim().toLowerCase(),rows=devRows.filter(r=>!q||[r.name,r.artist].join(' ').toLowerCase().includes(q));
 $('#list').innerHTML=head+(rows.length?rows.map(r=>{const v=devIsVid(r);return `<div class="it" style="grid-template-columns:44px 1fr auto auto auto"><div class="dv${v?' v':''}" aria-hidden="true">${v?'▶':'♪'}</div><div><b>${esc(r.name)}</b><span>${esc(r.artist)}${r.duration&&r.duration!=='—'?' · '+esc(r.duration):''}${v?' · video':''}</span></div>
  <button class="ld" data-did="${r.id}" data-d="A" aria-label="Load ${esc(r.name)} into Deck A">A</button><button class="ld b" data-did="${r.id}" data-d="B" aria-label="Load ${esc(r.name)} into Deck B">B</button><button class="dx" data-del="${r.id}" aria-label="Remove ${esc(r.name)} from My Device">✕</button></div>`}).join(''):'<div class="empty">'+(q?'No files match “'+esc(q)+'”. Try a different search.':'Nothing here yet. Tap “Add songs and videos” and pick files from your phone. They stay saved in this browser and also show in YAPSMusic.')+'</div>')}
$('#list').addEventListener('click',async e=>{
 const a=e.target.closest('[data-dev]');if(a){if(a.dataset.dev==='add')$('#devFile').click();else devFolder();return}
 const l=e.target.closest('.ld[data-did]');if(l){const r=devRows.find(x=>String(x.id)===l.dataset.did);if(r)devLoad(l.dataset.d,r);return}
 const x=e.target.closest('[data-del]');if(x){try{await devDel(Number(x.dataset.del));toast('Removed from My Device')}catch(err){toast('Could not remove that file.')}devFresh=false;render()}});
$('#devFile').addEventListener('change',async e=>{const fs=Array.from(e.target.files||[]);e.target.value='';await devImport(fs)});

/* Library dialog */
let libAnchor=null;
function openLib(a){const d=$('#libd');
 if(a&&d.open&&libAnchor===a){closeLib();return}               /* tap the same button again = fold it away */
 libAnchor=a||libAnchor;
 const dock=document.getElementById('vdock');
 if(dock){dock.insertAdjacentElement('afterend',d);d.classList.add('inl');   /* shows in the open field under the tool tabs */
  if(document.body.dataset.vp){delete document.body.dataset.vp;dock.querySelectorAll('.on').forEach(x=>x.classList.remove('on'))}}
 else if(libAnchor&&libAnchor.isConnected){libAnchor.insertAdjacentElement('afterend',d);d.classList.add('inl')}
 $$('.tabs button').forEach(x=>x.classList.toggle('on',x.dataset.s===mode));
 if(!d.open){try{d.show()}catch(e){d.setAttribute('open','')}}
 render();readDownloads().then(()=>{if($('#libd').open)render()});
 try{const r=d.getBoundingClientRect();const seen=Math.min(r.bottom,innerHeight)-Math.max(r.top,0),need=Math.min(340,r.height);if(seen<need)scrollBy({top:r.top>0?need-seen:r.top-8,behavior:'smooth'})}catch(e){}}   /* keep the decks in view; only scroll when the panel is off screen */
function closeLib(){const d=$('#libd');try{d.close()}catch(e){d.removeAttribute('open')}}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#libd').open&&$('#libd').classList.contains('inl'))closeLib()});
/* opening one of the tool tabs (Loop, Sampler, AI DJ, Record...) replaces the song list in the same field */
let libDismissed=false;
try{new MutationObserver(()=>{const d=$('#libd');
 if(document.body.dataset.vp){libDismissed=false;if(d.open)closeLib()}
 else if(!d.open&&!libDismissed)openLib()}).observe(document.body,{attributes:true,attributeFilter:['data-vp']})}catch(e){}
/* The field under the tool tabs is never empty: the song library shows there by default, on the last source you used */
try{const m=localStorage.getItem('yapsLibMode');if(m)mode=m}catch(e){}
const _open0=openLib;openLib=function(a){try{localStorage.setItem('yapsLibMode',mode)}catch(e){}return _open0(a)};
setTimeout(()=>{if(!window.__phoneHost&&!matchMedia('(pointer:coarse) and (max-width:820px)').matches&&!document.body.dataset.vp&&!$('#libd').open)openLib()},900);
/* L = show / hide the song library */
addEventListener('keydown',e=>{if(e.key.toLowerCase()!=='l'||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test((e.target.tagName||'')))return;
 if(document.querySelector('dialog[open]:not(#libd)'))return;e.preventDefault();$('#libd').open?(libDismissed=true,closeLib()):openLib()});
function srcPick(k,a){if(k==='file'){mode='device'}else if(k==='lib'){mode='lib'}else if(k==='saved'){mode='saved'}else{mode='uploads'}openLib(a)}
$('#libx').onclick=()=>{libDismissed=true;closeLib()};
function render(){if(mode==='device')return renderDevice();if(mode==='saved')return renderSaved();const q=$('#q').value.trim().toLowerCase();
 let rows=library.filter(t=>(mode!=='uploads'||t.up)&&(mode!=='offline'||isOff(t.id))&&(!q||[t.title,t.artist,t.genre].join(' ').toLowerCase().includes(q)));if(typeof libRank==='function')rows=libRank(rows);
 $('#list').innerHTML=rows.length?rows.map(t=>`<div class="it"><img loading="lazy" alt="" src="${esc(src(t.cover||''))}" onerror="this.removeAttribute('src')"><div><b>${esc(t.title)}</b><span>${esc(t.artist)}${t.genre?' · '+esc(t.genre):''}${t.duration?' · '+esc(t.duration):''}</span>${typeof libBadge==='function'?libBadge(t):''}</div>
  <button class="ld" data-d="A" data-id="${esc(t.id)}" aria-label="Load ${esc(t.title)} into Deck A">A</button><button class="ld b" data-d="B" data-id="${esc(t.id)}" aria-label="Load ${esc(t.title)} into Deck B">B</button>${t.local&&!t.dl?'':`<button class="ld sv${isOff(t.id)?' on':''}" data-save="${esc(t.id)}" aria-label="${isOff(t.id)?'Remove offline copy of ':'Save offline: '}${esc(t.title)}"${offBusy.has(String(t.id))?' disabled':''}>${offBusy.has(String(t.id))?'…':isOff(t.id)?'<i class="fas fa-check"></i>':'<i class="fas fa-download"></i>'}</button>`}</div>`).join('')
 :'<div class="empty">'+(mode==='offline'&&!q?'No offline songs yet. Download songs in YAPSMusic, or tap the download icon next to a song here while online.':mode==='uploads'&&!q?'No uploads yet. Upload a song in YAPSMusic and it shows up here.':library.length?'No tracks match “'+esc(q)+'”. Try a different search.':'The library is empty.')+'</div>'}
$('#list').addEventListener('click',e=>{const sv=e.target.closest('[data-save]');if(sv){toggleOff(sv.dataset.save);return}const b=e.target.closest('.ld[data-id]');if(!b)return;const t=library.find(x=>String(x.id)===b.dataset.id);if(t)loadTrack(b.dataset.d,t)});
{let qt;$('#q').addEventListener('input',()=>{clearTimeout(qt);qt=setTimeout(render,120)})}
async function loadRemote(){if(!YAPS_API_URL)return;
 try{(await api('/api/tracks?limit=100')).forEach(x=>{if(library.some(t=>String(t.id)===String(x.id))||!x.audio_url)return;
  library.push({id:String(x.id),title:x.title,artist:x.artist,cover:x.artwork_url||'',audio:x.audio_url,genre:x.genre||'',duration:x.duration||'',tags:x.tags||[]})})}catch(e){console.warn('Uploads unavailable:',e&&e.message)}}


/* ===== PLAN LIMITS (edit here) ===== */
const isPrem=()=>{try{return localStorage.getItem('yaps_premium')==='true'}catch(e){return false}};
function showUp(msg){$('#upMsg').textContent=msg;const d=$('#upDlg');if(d.open)return;try{d.showModal()}catch(e){d.setAttribute('open','')}}
$('#upLater').onclick=()=>$('#upDlg').close();
function planNote(){const n=$('#planNote');if(!n)return;
 n.innerHTML=isPrem()?'<i class="fas fa-crown" style="color:var(--au)"></i> <span><b>Premium</b> · Ad-free listening</span>'
 :'<i class="fas fa-star" style="color:var(--au)"></i> <span>Free plan · Unlimited recording · <b>Go ad-free with Premium</b></span><a href="index.html?go=subscription">Upgrade</a>'}
planNote();
['focus','pageshow','storage'].forEach(ev=>addEventListener(ev,planNote));
/* Recording: master mix (both decks combined) → MediaRecorder */
const R={rec:null,chunks:[],blob:null,url:'',t0:0,iv:0,peak:0,mime:'',dur:0,tracks:[],cover:''};
const setSt=(m,e)=>{const s=$('#rst');s.textContent=m;s.style.color=e?'#ff8da1':''};
const pickMime=()=>['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'].find(m=>MediaRecorder.isTypeSupported(m))||'';
const extOf=m=>/mp4/.test(m)?'m4a':/ogg/.test(m)?'ogg':'webm';
const mixName=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return 'YAPS-Mix-'+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes())+'.'+extOf(R.mime)};
function recUi(s){$('#rec').classList.toggle('rec',s==='rec');$('#rec').disabled=s==='proc';$('#recT').textContent={rec:'Stop Recording',proc:'Processing…',done:'Record again'}[s]||'Start Recording';$('#done').hidden=s!=='done'}
$('#rec').onclick=()=>{
 if(R.rec&&R.rec.state==='recording'){recUi('proc');setSt('Processing your mix…');R.rec.stop();return}
 if(!window.MediaRecorder||!(window.AudioContext||window.webkitAudioContext)){setSt('Recording isn’t supported in this browser. Try the latest Chrome, Edge, Firefox or Safari.',1);return}
 try{init()}catch(e){setSt('Couldn’t start the audio engine: '+e.message,1);return}
 if(R.url)URL.revokeObjectURL(R.url);R.url='';R.blob=null;R.chunks=[];R.peak=0;R.mime=pickMime();
 try{R.rec=new MediaRecorder(recDest.stream,R.mime?{mimeType:R.mime}:{})}catch(e){setSt('Couldn’t start recording: '+e.message,1);return}
 R.mime=R.rec.mimeType||R.mime;R.rec.ondataavailable=e=>{if(e.data&&e.data.size)R.chunks.push(e.data)};
 R.rec.onerror=e=>{clearInterval(R.iv);R.rec.onstop=null;recUi('idle');setSt('Recording failed ('+((e.error&&e.error.message)||'unknown error')+'). Your decks are unaffected.',1)};
 R.rec.onstop=finish;R.rec.start(1000);R.t0=Date.now();recUi('rec');
 R.iv=setInterval(()=>{const b=new Uint8Array(ma.fftSize);ma.getByteTimeDomainData(b);b.forEach(v=>{R.peak=Math.max(R.peak,Math.abs(v-128))});
  const el=(Date.now()-R.t0)/1000;
    $('#recT').textContent='Stop Recording · '+fmt(el);
  setSt(R.peak<2?'No sound yet. Press play on a deck.':'')},250)};
function finish(){clearInterval(R.iv);R.dur=(Date.now()-R.t0)/1000;
 if(R.peak<2||!R.chunks.length){recUi('idle');setSt('Nothing was recorded. Play at least one deck while recording, then stop.',1);return}
 R.tracks=D.map(d=>d.tid||null);R.cover=D[0].cover||D[1].cover||'';
 R.blob=new Blob(R.chunks,{type:R.mime||'audio/webm'});R.url=URL.createObjectURL(R.blob);$('#mixAudio').src=R.url;recUi('done');
 setSt(fmt(R.dur)+' · '+extOf(R.mime).toUpperCase()+' · '+(R.blob.size/1048576).toFixed(1)+' MB. Preview it, then download, share, save or publish.')}
$('#mixAudio').onplay=()=>D.forEach(stopD); /* preview never overlaps the decks */
addEventListener('beforeunload',e=>{if(R.blob||(R.rec&&R.rec.state==='recording')){e.preventDefault();e.returnValue=''}}); /* don't silently lose an unsaved mix */
const need=()=>R.blob?true:(toast('Record a mix first'),false);
$('#exD').onclick=()=>{if(!need())return;const a=document.createElement('a');a.href=R.url;a.download=mixName();document.body.appendChild(a);a.click();a.remove()};
$('#exH').onclick=async()=>{if(!need())return;const f=new File([R.blob],mixName(),{type:R.blob.type});
 try{if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],title:'My YAPS Mix',text:'Made in YAPSMusic DJ Studio'});
  else{$('#exD').click();setSt('This browser can’t share files, so the mix was downloaded. Share the file from your device.')}}
 catch(e){e.name==='AbortError'?setSt('Share cancelled. Your mix is still here.'):setSt('Couldn’t share ('+e.message+'). Use Download instead.',1)}};
$('#exS').onclick=()=>{if(need())saveMix()};
$('#svd').onclick=function(){mode='saved';openLib(this)};
async function updSaved(){try{$('#svn').textContent=(await idbDo('readonly',s=>s.count()))+' ›'}catch(e){}}

/* ── Phase 4: Save (this device) + Publish (account) ──
   Save = IndexedDB on this device, no sign-in needed, never lost on upload failure.
   Publish = Supabase sign-in (same project/session as index.html) + FastAPI POST /api/mixes. See BACKEND NEEDS below. */
const SB_URL=YAPS_CONFIG.SUPABASE_URL,SB_KEY=YAPS_CONFIG.SUPABASE_ANON_KEY;
const BUCKETS=YAPS_CONFIG.BUCKETS; // BACKEND NEEDS: 'mixes-private' bucket, table `mixes` with RLS, POST/GET /api/mixes
let sb=null,user=null;
function initSb(){if(sb||!window.supabase)return;try{sb=supabase.createClient(SB_URL,SB_KEY);sb.auth.getSession().then(({data})=>{user=data.session&&data.session.user;pubAuth()});sb.auth.onAuthStateChange((_e,s)=>{user=s&&s.user;pubAuth()})}catch(e){sb=null;console.warn('Supabase unavailable',e)}}
initSb();if(!sb){const sl=document.getElementById('sbLib');if(sl)sl.addEventListener('load',initSb);else{let k=0;const iv=setInterval(()=>{initSb();if(sb||++k>40)clearInterval(iv)},250)}}
function pubAuth(){const a=$('#pauth');a.innerHTML=user?'Signed in as '+esc(user.email||'your YAPS account'):(sb?'You need a free account to publish. <a href="auth.html?mode=signup&type=dj&next=studio.html" style="color:var(--cy);font-weight:700">Create account</a> or <a href="auth.html?next=studio.html" style="color:var(--cy)">Sign in</a>, then come back. Your mix stays here.':'Sign-in is unavailable right now. Check your connection and reload.');$('#pgo').disabled=!user}
async function api(path,o={}){if(!YAPS_API_URL)throw Object.assign(new Error('The YAPS API URL isn’t set up yet.'),{status:0});
 const h={'Content-Type':'application/json'},{data}=await sb.auth.getSession();if(data.session)h.Authorization='Bearer '+data.session.access_token;
 const r=await fetch(YAPS_API_URL+path,{method:o.method||'GET',headers:h,body:o.body&&JSON.stringify(o.body)});
 if(!r.ok){let m=r.statusText;try{const j=await r.json();m=typeof j.detail==='string'?j.detail:JSON.stringify(j.detail||j)}catch(e){}throw Object.assign(new Error(m||'HTTP '+r.status),{status:r.status})}return r.status===204?null:r.json()}
async function upload(bucket,file,name){ /* same two-step pattern as index.html _apiUpload */
 try{const s=await api('/api/uploads/sign',{method:'POST',body:{bucket,filename:name}});const {error}=await sb.storage.from(bucket).uploadToSignedUrl(s.path,s.token,file,{contentType:file.type,cacheControl:'3600'});if(error)throw error;return{path:s.path,url:s.public_url}}
 catch(e){console.warn('Signed upload unavailable:',e&&e.message);const path=user.id+'/'+Date.now()+'_'+name.replace(/[^\w.-]/g,'_');
  const {error}=await sb.storage.from(bucket).upload(path,file,{contentType:file.type,cacheControl:'3600'});if(error)throw error;return{path,url:sb.storage.from(bucket).getPublicUrl(path).data.publicUrl}}}
const abs=u=>u?new URL(u,document.baseURI).href:'';

/* Save to this device */
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('yaps-studio',1);r.onupgradeneeded=()=>r.result.createObjectStore('mixes',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const idbDo=async(mode,fn)=>{const db=await idb();return new Promise((res,rej)=>{const t=db.transaction('mixes',mode),q=fn(t.objectStore('mixes'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})};
window.saveMix=async()=>{if(!R.blob)return;const title='My YAPS Mix '+new Date().toLocaleDateString();
 try{await idbDo('readwrite',s=>s.put({id:'m'+Date.now(),title,blob:R.blob,mime:R.mime,dur:R.dur,created:Date.now(),tracks:R.tracks}));setSt('Saved on this device in Saved Mixes. Publish it to keep a copy in your YAPS account.')}
 catch(e){setSt('Couldn’t save on this device (storage is full or blocked). Use Download so you don’t lose it.',1)}};
async function renderSaved(){updSaved();let rows=[];try{rows=await idbDo('readonly',s=>s.getAll())}catch(e){$('#list').innerHTML='<div class="empty">Saved mixes aren’t available in this browser (private mode or storage blocked).</div>';return}
 const q=$('#q').value.trim().toLowerCase();rows=rows.filter(m=>!q||m.title.toLowerCase().includes(q)).sort((a,b)=>b.created-a.created);
 $('#list').innerHTML=rows.length?rows.map(m=>`<div class="it" style="grid-template-columns:1fr auto auto auto auto"><div><b>${esc(m.title)}</b><span>${fmt(m.dur)} · ${new Date(m.created).toLocaleDateString()} · on this device</span></div>
  <button class="ld" data-sid="${m.id}" data-act="A" aria-label="Load into Deck A">A</button><button class="ld b" data-sid="${m.id}" data-act="B" aria-label="Load into Deck B">B</button><button class="ld" data-sid="${m.id}" data-act="dl" aria-label="Download"><i class="fas fa-download"></i></button><button class="ld" data-sid="${m.id}" data-act="del" aria-label="Delete"><i class="fas fa-trash"></i></button></div>`).join(''):'<div class="empty">No saved mixes yet. Record a mix, then tap Save.</div>'}
$('#list').addEventListener('click',async e=>{const b=e.target.closest('[data-sid]');if(!b)return;const m=(await idbDo('readonly',s=>s.get(b.dataset.sid)));if(!m)return renderSaved();const a=b.dataset.act;
 if(a==='del'){if(confirm('Delete “'+m.title+'” from this device?')){await idbDo('readwrite',s=>s.delete(m.id));renderSaved();try{window.__yapsPost&&__yapsPost('mix-saved')}catch(e){}}}
 else if(a==='dl'){const l=document.createElement('a');l.href=URL.createObjectURL(m.blob);l.download=m.title.replace(/[^\w -]/g,'')+'.'+extOf(m.mime);l.click()}
 else load(a,{id:m.id,title:m.title,artist:'My mix',cover:'',audio:URL.createObjectURL(m.blob),local:true})});
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{if(b.disabled)return;mode=b.dataset.s;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));render()});

/* Publish */
/* ── Setlist: tracks actually played while recording, with timestamps (attached to Publish) ── */
R.log=[];R.logT0=0;
const slKey=d=>d.tid?'c:'+d.tid:'f:'+(d.t||'')+'|'+Math.round(d.dur||0);
function slAdd(d){const k=slKey(d),last=[...R.log].reverse().find(x=>x.d===d.L);if(last&&last.k===k)return;
 R.log.push({k,d:d.L,t:Math.max(0,Math.round((Date.now()-R.t0)/1000)),title:d.t||'Untitled',artist:d.ar&&d.ar!=='Local file'&&d.ar!=='My mix'?d.ar:''})}
function slSync(){if(!(R.rec&&R.rec.state==='recording'))return false;if(R.logT0!==R.t0){R.logT0=R.t0;R.log=[];D.forEach(d=>{if(d.on&&d.buf)slAdd(d)})}return true}
{const _play=play;play=function(d){const was=d.on;_play(d);if(!was&&d.on&&slSync())slAdd(d)}}
setInterval(slSync,250);
const slLines=()=>R.log.slice().sort((a,b)=>a.t-b.t).map(x=>fmt(x.t)+'  '+(x.artist?x.artist+' – ':'')+x.title);
function withTracklist(desc,force){desc=String(desc||'');const inc=document.getElementById('plInc');
 if(!R.log.length||(!force&&inc&&!inc.checked))return desc.slice(0,500);
 const head='Tracklist:\n',all=slLines();let n=all.length,tl;
 for(;n>0;n--){tl=head+all.slice(0,n).join('\n')+(n<all.length?'\n+'+(all.length-n)+' more':'');if(tl.length<=500)break}
 if(n<=0)tl=head.trim();
 const room=500-tl.length-2;return (room>8&&desc?desc.slice(0,room)+'\n\n':'')+tl}
const setlistJson=()=>R.log.length?R.log.slice().sort((a,b)=>a.t-b.t).map(x=>({t:x.t,deck:x.d,title:x.title,artist:x.artist})):undefined;
/* If your mixes table has no `setlist` column yet, publish still works (the tracklist stays in the description). */
{const _smr=saveMixRow;saveMixRow=async function(row){if(!row||!row.setlist)return _smr(row);
 try{return await _smr(row)}catch(e){if(e&&(e.code==='PGRST204'||e.code==='42703'||/setlist/i.test(String(e.message||''))||e.status===400||e.status===422)){const r2=Object.assign({},row);delete r2.setlist;return _smr(r2)}throw e}}}
(function(){const pst=$('#pst');if(!pst)return;const w=document.createElement('div');
 w.innerHTML='<label class="ck"><input type="checkbox" id="plInc" checked><span>Add the tracklist with timestamps to the description</span></label><pre id="plPrev" class="sc-pre" style="max-height:120px;margin:6px 0"></pre>';
 pst.parentNode.insertBefore(w,pst);
 const prev=()=>{const e=$('#plPrev');if(!e)return;e.textContent=!R.log.length?'No tracks were played while recording, so no tracklist will be added.':$('#plInc').checked?withTracklist('',true):'Tracklist will not be added.'};
 $('#plInc').addEventListener('change',prev);$('#exP').addEventListener('click',prev)})();

$('#exP').onclick=()=>{if(!R.blob){toast('Record a mix first');return}const g=$('#pg');g.innerHTML=['DJ Mix',...new Set(library.map(t=>t.genre).filter(Boolean))].map(x=>`<option>${esc(x)}</option>`).join('');
 $('#pt_').value='';$('#pst').textContent='';pubAuth();$('#pub').showModal()};
$('#pcx').onclick=()=>$('#pub').close();
$('#pgo').onclick=async()=>{const st=m=>{$('#pst').textContent=m;$('#pst').style.color='var(--mu)'},er=m=>{$('#pst').textContent=m;$('#pst').style.color='#ff8da1'};
 const title=$('#pt_').value.trim(),cf=$('#pc').files[0],priv=$('#pv_').value==='private';
 if(!user)return er('Sign in first. Your mix stays here while you do.');
 if(!title)return er('Add a title for your mix.');
 if(cf&&(!/^image\//.test(cf.type)||cf.size>2097152))return er('Cover must be an image under 2 MB.');
 if(!$('#pr').checked)return er('Confirm you have the right to share this mix.');
 const tags=$('#ptg').value.split(',').map(s=>s.trim()).filter(Boolean).slice(0,10).map(s=>s.slice(0,30));
 $('#pgo').disabled=true;
 try{const ext=extOf(R.mime),ft=(R.blob.type||'audio/webm').split(';')[0];
  st('Uploading audio…');const au=await upload(priv?BUCKETS.private:BUCKETS.public,new File([R.blob],mixName(),{type:ft}),mixName());
  let cover=abs(R.cover);if(cf){st('Uploading cover…');cover=(await upload(BUCKETS.cover,cf,cf.name)).url}
  st('Saving mix…');
  await saveMixRow({title:title.slice(0,150),description:withTracklist($('#pd').value.trim()),setlist:setlistJson(),genre:$('#pg').value,tags,visibility:priv?'private':'public',
   audio_url:priv?null:au.url,audio_path:au.path,cover_url:cover||null,duration:Math.round(R.dur),format:ext,track_a_id:R.tracks[0],track_b_id:R.tracks[1]}); /* creator comes from the auth token server-side */
  $('#pub').close();setSt(priv?'Saved privately to your YAPS account.':'Published to YAPS. It now appears under DJ Mixes in YAPSMusic.')}
 catch(e){const m=e.code==='42P01'?'The mixes table isn’t set up in Supabase yet. Run yaps-mixes-setup.sql once. Your mix is safe here: Save or Download it.':e.status===404?'The server has no mixes endpoint yet (POST /api/mixes), so nothing was published. Your mix is safe here: Save or Download it.':e.status===0?e.message+' Your mix is safe here: Save or Download it.':'Couldn’t publish: '+e.message+'. Your mix is still here. Try again, or Save/Download it.';er(m)}
 $('#pgo').disabled=!user};
pubAuth();


/* ── Cloud mixes: FastAPI if configured, otherwise straight to Supabase (table `mixes`, see yaps-mixes-setup.sql) ── */
/* Credit the DJ by name: index.html's DJ Mixes row shows `creator_name`. If the table has no such column yet, publish retries without it. */
{const _cn=saveMixRow;saveMixRow=async function(row){
 if(!row||row.creator_name||!user)return _cn(row);
 const m=user.user_metadata||{},nm=(m.username||m.full_name||m.name||(user.email?user.email.split('@')[0]:'')||'').toString().slice(0,60);
 if(!nm)return _cn(row);
 try{return await _cn(Object.assign({},row,{creator_name:nm}))}
 catch(e){if(e&&(e.code==='PGRST204'||e.code==='42703'||/creator_name/i.test(String(e.message||'')))){return _cn(row)}throw e}}}
async function saveMixRow(row){
 if(YAPS_API_URL){try{return await api('/api/mixes',{method:'POST',body:row})}catch(e){if(e.status!==404&&e.status!==0)throw e}}
 const {error}=await sb.from('mixes').insert({...row,user_id:user.id});if(error)throw error}
const _rs0=renderSaved;
renderSaved=async function(){await _rs0();
 if(!user||!sb)return;let rows=[];
 try{const r=await sb.from('mixes').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);if(r.error)throw r.error;rows=r.data||[]}catch(e){return}
 const q=$('#q').value.trim().toLowerCase();rows=rows.filter(m=>!q||String(m.title||'').toLowerCase().includes(q));if(!rows.length)return;
 const L=$('#list');L.querySelectorAll('.empty').forEach(x=>x.remove());
 L.insertAdjacentHTML('beforeend','<div class="cloud-hd"><i class="fas fa-cloud"></i> My account mixes</div>'+rows.map(m=>`<div class="it" style="grid-template-columns:1fr auto auto auto auto"><div><b>${esc(m.title||'Mix')}</b><span>${fmt(m.duration||0)} · ${new Date(m.created_at).toLocaleDateString()} · ${m.visibility==='public'?'public':'private'}</span></div>
 <button class="ld" data-cid="${m.id}" data-act="A" aria-label="Load into Deck A">A</button><button class="ld b" data-cid="${m.id}" data-act="B" aria-label="Load into Deck B">B</button><button class="ld" data-cid="${m.id}" data-act="dl" aria-label="Download"><i class="fas fa-download"></i></button><button class="ld" data-cid="${m.id}" data-act="del" aria-label="Delete"><i class="fas fa-trash"></i></button></div>`).join(''));
 L.__cloud=rows}
async function cloudUrl(m){if(m.visibility==='public'&&m.audio_url)return m.audio_url;
 const {data,error}=await sb.storage.from(BUCKETS.private).createSignedUrl(m.audio_path,3600);if(error)throw error;return data.signedUrl}
$('#list').addEventListener('click',async e=>{const b=e.target.closest('[data-cid]');if(!b)return;
 const m=($('#list').__cloud||[]).find(x=>String(x.id)===b.dataset.cid);if(!m)return;const a=b.dataset.act;
 try{
  if(a==='del'){if(!confirm('Delete “'+m.title+'” from your account? This can’t be undone.'))return;
   const bk=m.visibility==='public'?BUCKETS.public:BUCKETS.private;if(m.audio_path)await sb.storage.from(bk).remove([m.audio_path]);
   const {error}=await sb.from('mixes').delete().eq('id',m.id).eq('user_id',user.id);if(error)throw error;renderSaved()}
  else{const u=await cloudUrl(m);
   if(a==='dl'){const l=document.createElement('a');l.href=u;l.download=(m.title||'mix').replace(/[^\w -]/g,'')+'.'+(m.format||'webm');l.target='_blank';l.rel='noopener';l.click()}
   else load(a,{id:'c'+m.id,title:m.title,artist:'My mix',cover:m.cover_url||'',audio:u})}}
 catch(err){toast('Couldn’t complete that: '+(err.message||'try again'))}});

const _sv=window.saveMix;window.saveMix=async()=>{await _sv();updSaved();try{window.__yapsPost&&__yapsPost('mix-saved')}catch(e){}};updSaved();
/* URL entry: studio.html?deck=A&track=ID (deck defaults to A; no track = empty decks) */
(async function(){const A=window.__yapsStudioArgs||{},p=new URLSearchParams(A.track?'':LOC.search),id=A.track||p.get('track');if(!id)return;
 const L=String(A.deck||p.get('deck')||'A').toUpperCase()==='B'?'B':'A',find=()=>library.find(x=>String(x.id)===id);
 await libReady;readShared();
 if(!find())await loadRemote();const t=find();t?loadTrack(L,t):toast('Track “'+id+'” wasn’t found in the YAPS library. Choose one from YAPS Library.')})();
loadRemote();

/* ---------- render loop ---------- */
/* Perf: DOM refs + canvas size are cached, DOM/canvas writes only happen when a value changed, meters use transform
   (no layout), and a waveform repaints only when something visible changed (the playhead moves ~1px/s, not 20x/s). */
const V=D.map(d=>{const L=d.L,c=$('#wf'+L);return{d,c,x:c.getContext('2d'),jog:$('#jog'+L),tm:$('#tm'+L),m1:$('#m'+L),m2:$('#m'+L+'2'),w:0,h:0,r:1,sig:'',pk:null,a:NaN,tms:'',l1:-1,l2:-1}});
const measure=v=>{const w=v.c.clientWidth,h=v.c.clientHeight,r=devicePixelRatio||1;if(w!==v.w||h!==v.h||r!==v.r){v.w=w;v.h=h;v.r=r;v.c.width=Math.round(w*r);v.c.height=Math.round(h*r);v.sig=''}},measureAll=()=>V.forEach(measure);
if(self.ResizeObserver){const ro=new ResizeObserver(measureAll);V.forEach(v=>ro.observe(v.c))}
addEventListener('resize',measureAll);measureAll();
function draw(v){const d=v.d,w=v.w,h=v.h,r=v.r;if(!w||!h)return;
  const n=d.pk.length,p=d.pos/d.dur,kp=p>0?Math.min(n,Math.ceil(p*n)):0,lp=!!(d.src&&d.src.loop&&d.dur),ls=lp?d.src.loopStart/d.dur:-1,le=lp?d.src.loopEnd/d.dur:-1;
  const sig=Math.round(p*w*r)+'|'+kp+'|'+w+'|'+h+'|'+r+'|'+d.bpm+'|'+d.beat0+'|'+d.dur+'|'+ls+'|'+le+'|'+d.hc.join()+'|'+d.c+'|'+d.dm;
  if(sig===v.sig&&d.pk===v.pk)return;v.sig=sig;v.pk=d.pk;
  const x=v.x,bw=w/n,bwf=Math.max(1,bw-1),hh=h*.92;x.setTransform(r,0,0,r,0,0);x.clearRect(0,0,w,h);
  x.fillStyle=d.c;x.beginPath();for(let i=0;i<kp;i++){const a=d.pk[i]*hh;x.rect(i*bw+.4,(h-a)/2,bwf,a)}x.fill();
  x.fillStyle=d.dm;x.beginPath();for(let i=kp;i<n;i++){const a=d.pk[i]*hh;x.rect(i*bw+.4,(h-a)/2,bwf,a)}x.fill();
  if(d.bpm&&d.dur){const sp=60/d.bpm,b0=d.beat0||0;if(sp/d.dur*w>=5){x.fillStyle='rgba(255,255,255,.22)';x.beginPath();for(let t=b0,k=0;t<d.dur;t+=sp,k++)x.rect(t/d.dur*w,0,1,k%4?h*.2:h*.5);x.fill()}}
  if(lp){x.fillStyle='rgba(255,211,92,.2)';x.fillRect(ls*w,0,(le-ls)*w,h)}
  d.hc.forEach((t,i)=>{if(t!=null&&d.dur){x.fillStyle='#ffd35c';x.fillRect(t/d.dur*w,0,2,h);x.fillText(i+1,t/d.dur*w+3,10)}});
  x.fillStyle='#fff';x.fillRect(p*w,0,2,h)}
const lv=(d)=>{if(!C||!d.an)return 0;d.an.getByteTimeDomainData(d.buf2);let m=0;for(const v of d.buf2)m+=(v-128)*(v-128);return Math.min(1,Math.sqrt(m/d.buf2.length)/45)};
const LITE=document.documentElement.classList;let last=performance.now(),fr=0;
(function tick(n){requestAnimationFrame(tick);const dt=Math.min(.1,(n-last)/1e3);last=n;fr++;
  for(const v of V){const d=v.d;
   if(d.on){d.pos+=dt*(d.src?d.src.playbackRate.value:1+d.pitch/100);if(d.pos>=d.dur){d.pos=0;if(d.buf)stopD(d)}d.ang+=dt*200*(1+d.pitch/100)}
   const a=d.ang%360;if(a!==v.a){v.a=a;v.jog.style.transform='rotate('+a+'deg)'}
   const ts=fmt(d.pos)+' / '+fmt(d.dur);if(ts!==v.tms){v.tms=ts;v.tm.textContent=ts}
   const l=d.on?lv(d)*100:0,q1=Math.round(l)/100,q2=Math.round(Math.max(0,l*.9))/100;
   if(q1!==v.l1){v.l1=q1;v.m1.style.transform='scaleY('+q1+')'}
   if(q2!==v.l2){v.l2=q2;v.m2.style.transform='scaleY('+q2+')'}
   if(fr%(LITE.contains('cmf-lite')?6:3)==0)draw(v)}})(last);

/* ---------- DJ console helpers (landscape mode) ---------- */
const bodyC=document.body.classList,setTools=on=>bodyC.toggle('tools',on);
$('#toolsBtn').onclick=()=>setTools(!bodyC.contains('tools'));
$('#scrim').onclick=$('#toolsX').onclick=()=>setTools(false);
/* sidebar drawer */
/* keep the sidebar footer (Settings / Logout) inside the visible screen while the page scrolls */
(()=>{const nav=$('#mainNav'),w=nav.querySelector('.sbw');let q=0;
 const fit=()=>{q=0;const r=nav.getBoundingClientRect();w.style.setProperty('--sbh',Math.max(200,Math.min(innerHeight-Math.max(r.top,0),r.height))+'px')};
 const req=()=>{if(!q)q=requestAnimationFrame(fit)};
 addEventListener('scroll',req,{passive:true});addEventListener('resize',req);addEventListener('load',req);fit();})();
/* sidebar header: same guest/user + plan as index.html (read-only, from the saved Supabase session) */
(()=>{try{
 let u=null;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^sb-.*-auth-token$/.test(k)){const v=JSON.parse(localStorage.getItem(k)||'null');u=(v&&(v.user||(v.currentSession&&v.currentSession.user)))||null;if(u)break}}
 const prem=localStorage.getItem('yaps_premium')==='true';
 if(u){const m=u.user_metadata||{},nm=m.full_name||m.name||(u.email?u.email.split('@')[0]:'YAPS User');
  $('#sbName').textContent=nm;
  $('#sbArt').textContent=(nm[0]||'Y').toUpperCase()}
 $('#sbPlan').innerHTML=prem?'<i class="fas fa-crown"></i> Premium':'<i class="fas fa-star"></i> Free plan';
 const b=$('#subNavBadge');if(b)b.textContent=prem?'Premium':'Free';
}catch(e){}})();
/* account panel: signed-in users see their details here (tap the sidebar header). Guests still go to index.html to sign in. */
(()=>{try{
 let u=null;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^sb-.*-auth-token$/.test(k)){const v=JSON.parse(localStorage.getItem(k)||'null');u=(v&&(v.user||(v.currentSession&&v.currentSession.user)))||null;if(u)break}}
 if(!u)return;
 const m=u.user_metadata||{},A={
  name:m.full_name||m.name||(u.email?u.email.split('@')[0]:'YAPS User'),username:m.username||'',bio:m.bio||'',
  email:u.email||'',avatar:m.avatar_url||m.picture||'',joined:u.created_at||'',type:'',
  provider:(u.app_metadata&&u.app_metadata.provider)||''};
 document.body.insertAdjacentHTML('beforeend','<dialog id="acctDlg" aria-label="My account"><div class="ac-top"><div class="ac-av" id="acAv"></div><div style="min-width:0"><div class="ac-nm" id="acNm"></div><div class="ac-un" id="acUn"></div><div class="ac-plan" id="acPlan"></div></div></div><div class="ac-body" id="acBody"></div><div class="ac-act"><a class="pri" href="index.html?go=editprofile">Edit profile</a><a href="index.html?go=subscription">Subscription</a><button type="button" id="acClose">Close</button></div></dialog>');
 const dlg=document.getElementById('acctDlg'),safe=x=>/^https?:\/\//i.test(x||'');
 const fmt=d=>{try{const t=new Date(d);return isNaN(t)?'':t.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}catch(e){return ''}};
 const avatarInto=el=>{el.textContent='';if(safe(A.avatar)){const im=document.createElement('img');im.alt='';im.src=A.avatar;im.onerror=()=>{el.textContent=(A.name[0]||'Y').toUpperCase()};el.appendChild(im)}else el.textContent=(A.name[0]||'Y').toUpperCase()};
 function render(){
  const prem=localStorage.getItem('yaps_premium')==='true';
  window.__yapsAvatar=A.avatar;if(window.__deckPhotos)window.__deckPhotos();
  avatarInto(document.getElementById('acAv'));avatarInto(document.getElementById('sbArt'));
  document.getElementById('sbName').textContent=A.name;
  document.getElementById('acNm').textContent=A.name;
  document.getElementById('acUn').textContent=A.username?'@'+A.username.replace(/^@/,''):'';
  document.getElementById('acPlan').innerHTML=prem?'<i class="fas fa-crown"></i> Premium':'<i class="fas fa-star"></i> Free plan';
  const rows=[['Email',A.email],['Account type',A.type?A.type.charAt(0).toUpperCase()+A.type.slice(1):''],['Member since',fmt(A.joined)],['Sign-in',A.provider?A.provider.charAt(0).toUpperCase()+A.provider.slice(1):''],['Plan',prem?'Premium (ad-free)':'Free']].filter(r=>r[1]);
  const b=document.getElementById('acBody');b.textContent='';
  rows.forEach(r=>{const d=document.createElement('div');d.className='ac-row';const a=document.createElement('span'),c=document.createElement('span');a.textContent=r[0];c.textContent=r[1];d.append(a,c);b.appendChild(d)});
  if(A.bio){const d=document.createElement('div');d.className='ac-row';const a=document.createElement('span'),c=document.createElement('span');a.textContent='Bio';c.className='ac-bio';c.textContent=A.bio;d.append(a,c);b.appendChild(d)}
 }
 render();
 document.getElementById('acClose').onclick=()=>dlg.close();
 dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
 document.getElementById('sbHead').addEventListener('click',e=>{e.preventDefault();render();if(typeof dlg.showModal==='function')dlg.showModal();else location.href='index.html?page=profile'});
 /* enrich with the saved profile row (username, bio, picture, account type, join date) once Supabase is ready */
 let tries=0;const iv=setInterval(async()=>{
  if(++tries>40){clearInterval(iv);return}
  if(typeof sb==='undefined'||!sb)return;clearInterval(iv);
  try{const {data,error}=await sb.from('yaps_profiles').select('*').eq('id',u.id).maybeSingle();if(error||!data)return;
   A.name=data.full_name||A.name;A.username=data.username||A.username;A.bio=data.bio||A.bio;A.avatar=data.avatar_url||A.avatar;A.type=data.account_type||A.type;A.joined=data.created_at||A.joined;render()}catch(e){}
 },250);
}catch(e){}})();
$$('#mainNav [data-share]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();
 const d={title:'YAPSMusic',text:'Check out YAPSMusic — Your Audio Playlist Station',url:new URL('index.html',(()=>{try{return top.location.href}catch(e){return location.href}})()).href};
 if(navigator.share)navigator.share(d).catch(()=>{});else if(navigator.clipboard)navigator.clipboard.writeText(d.url);}));
$('#mainNav .sidebar-item.active').addEventListener('click',e=>e.preventDefault());
(()=>{const nav=$('#mainNav'),btn=$('#navBtn'),sc=$('#navScrim');
 const set=o=>{nav.classList.toggle('open',o);sc.classList.toggle('show',o);btn.setAttribute('aria-expanded',o)};
 btn.onclick=()=>set(!nav.classList.contains('open'));sc.onclick=()=>set(false);
 nav.addEventListener('click',e=>{if(e.target.closest('a'))set(false)});
 addEventListener('keydown',e=>{if(e.key==='Escape')set(false)});
 addEventListener('resize',()=>{if(innerWidth>1180)set(false)});
})();
addEventListener('keydown',e=>{if(e.key==='Escape')setTools(false)});
$$('.src').forEach(b=>b.addEventListener('click',()=>setTools(false)));
async function goLandscape(){if(self!==top){try{if(parent.__hostFS){parent.__hostFS();return}}catch(e){}}
 try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'})}catch(e){}
 try{await screen.orientation.lock('landscape');$('#rot').hidden=true}catch(e){toast('Turn your phone sideways to open the DJ console')}}
if(self!==top){const b=document.createElement('base');b.target='_top';document.head.append(b);addEventListener('pointerup',()=>{try{parent.__hostTap&&parent.__hostTap()}catch(e){}},{once:true})}
$('#rotGo').onclick=goLandscape;$('#rotX').onclick=()=>{$('#rot').hidden=true};
$('#fsBtn').onclick=()=>document.fullscreenElement?document.exitFullscreen():goLandscape();
/* keep the screen awake while DJing */
let wl=null;async function keepAwake(){try{if(navigator.wakeLock&&!wl)wl=await navigator.wakeLock.request('screen');if(wl)wl.addEventListener('release',()=>{wl=null})}catch(e){}}
addEventListener('pointerdown',keepAwake,{once:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden&&wl===null&&bodyC)keepAwake()});
/* ===== v3 UPGRADE: analysis, SYNC, seek, jog, AI DJ, modes, tutorial ===== */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const loadErr=(e,t)=>{const m=String(e&&(e.message||e.name)||e);return /TIMEOUT/.test(m)?'Loading “'+t+'” is taking too long. Your connection is slow. Try again, or save it offline with the download icon while on Wi‑Fi.':/OFFLINE/.test(m)?'You’re offline and “'+t+'” isn’t saved for offline. While online, tap the download icon next to a song to save it.':/decode|EncodingError/i.test(m)?'YAPS couldn’t play “'+t+'”. This audio format isn’t supported. Try an MP3, M4A or WAV.':/HTTP 4/.test(m)?'YAPS couldn’t find “'+t+'”. Try another track.':/fetch|Network|Load failed/i.test(m)?'YAPS couldn’t reach “'+t+'”. Check your connection, or the file may block access (CORS).':'YAPS couldn’t load “'+t+'”. Try another audio file.'};
addEventListener('unhandledrejection',e=>{console.warn(e.reason);e.preventDefault();toast('Something went wrong, but your decks are unaffected.')});
/* Browser-only analysis: energy envelope -> onset autocorrelation (BPM), beat phase, intro/outro, loudness */
const YL_CONF=2.2; /* detection is accepted only when the tempo peak is at least this many times the average autocorrelation level */
function analyse(buf,fb){const sr=buf.sampleRate,x=buf.getChannelData(0),hop=Math.round(sr*.01),n=Math.floor(x.length/hop),e=new Float32Array(n);
 for(let i=0;i<n;i++){let s=0;for(let j=0;j<hop;j+=4){const v=x[i*hop+j]||0;s+=v*v}e[i]=Math.sqrt(s/(hop/4))}
 let tot=0;for(const v of e)tot+=v;const avg=tot/n||1e-6;let mi=0,mo=n-1;while(mi<n-1&&e[mi]<avg*.5)mi++;while(mo>0&&e[mo]<avg*.5)mo--;
 const o=new Float32Array(n);for(let i=1;i<n;i++)o[i]=Math.max(0,e[i]-e[i-1]);
 const N=Math.min(n,6000),st=Math.max(0,Math.floor(n/2-N/2)),sc={};let best=0,bl=0;
 for(let lag=32;lag<=101;lag++){let s=0;for(let i=st+lag;i<st+N;i++)s+=o[i]*o[i-lag];sc[lag]=s;if(s>best){best=s;bl=lag}}
 let bpm=null,beat0=null,conf=0;{let sm=0,cn=0;for(let l=32;l<=101;l++){sm+=sc[l]||0;cn++}conf=sm>0?best/(sm/cn):0}
 if(fb||(best>0&&bl>32&&bl<101)){if(fb)bpm=fb;else{const a=sc[bl-1],c=sc[bl+1],dn=a-2*best+c,dl=dn?.5*(a-c)/dn:0;bpm=6000/(bl+clamp(dl,-.5,.5));while(bpm<80)bpm*=2;while(bpm>175)bpm/=2;bpm=Math.round(bpm*10)/10}
  const sp=6000/bpm;let bp=0,bs=-1;for(let p=0;p<sp;p+=.5){let s=0;for(let k=st+p;k<st+N;k+=sp)s+=o[Math.round(k)]||0;if(s>bs){bs=s;bp=p}}beat0=(((st+bp)*.01)%(60/bpm))}
 return{bpm,beat0,conf,mixIn:mi*.01,mixOut:mo*.01,norm:clamp(.14/avg,.5,1.6)}}
function postLoad(d){if(!d.buf)return;try{const r=analyse(d.buf);d.beat0=r.beat0;d.mixIn=r.mixIn;d.mixOut=r.mixOut;d.detected=false;d.bpmNote=null;d.bpmSrc=d.bpm?'library':null;if(!d.bpm){if(r.bpm&&r.conf>=YL_CONF){d.bpm=r.bpm;d.detected=true;d.bpmSrc='detected'}else{d.beat0=null;d.bpmNote='Deck '+d.L+': no reliable BPM found'+(r.bpm?' (low confidence)':'')+'. Use SET BPM or tap tempo. Loops, roll, stutter and SYNC need a BPM.';setTimeout(()=>{if(!d.bpm)toast(d.bpmNote)},1800)}}if(d.in)d.in.gain.value=r.norm}catch(e){console.warn(e)}d.sync=false;try{proAnalyse(d)}catch(e){console.warn(e)}ui(d)}
async function loadTrack(L,t){const d=dk(L),prev=d.buf;await loadTrack0(L,t);if(d.buf&&d.buf!==prev){postLoad(d);return true}return false}
function bpmTxt(d){return d.bpm?(d.sync?'SYNC ':'BPM ')+(d.detected?'~':'')+d.bpm.toFixed(1)+' → '+(d.bpm*(1+d.pitch/100)).toFixed(1)+(d.bpmSrc==='manual'?' ✎manual':d.bpmSrc==='tap'?' ✎tap':d.detected?' auto':''):'BPM n/a (tap to set)'}
function ui(d){ui0(d);const b=$('#bp'+d.L);if(b){b.textContent=bpmTxt(d);b.title='Tap to enter BPM manually';b.style.cursor='pointer'}const s=$('#deck'+d.L).querySelector('[data-a=sync]');if(s)s.classList.toggle('on',!!d.sync)}
function setPitch(d){setPitch0(d);const o=D[1-D.indexOf(d)];if(o.sync&&!setPitch.b&&d.bpm&&o.bpm){setPitch.b=1;let r=eff(d)/o.bpm;if(r>1.5)r/=2;else if(r<.67)r*=2;o.pitch=clamp((r-1)*100,-16,16);setPitch0(o);setPitch.b=0}}
function alignBeat(d,o){if(d.beat0==null||o.beat0==null||!o.on)return;const so=60/o.bpm,sd=60/d.bpm,ph=(((o.pos-o.beat0)/so)%1+1)%1,cu=(((d.pos-d.beat0)/sd)%1+1)%1;let dl=(ph-cu)*sd;if(dl>sd/2)dl-=sd;if(dl<-sd/2)dl+=sd;d.pos=clamp(d.pos+dl,0,d.dur);if(d.src){stopD(d);play(d)}}
function doSync(d,keep){const o=D[1-D.indexOf(d)];if(!keep&&d.sync){d.sync=false;ui(d);toast('Sync off');return}
 const t=eff(o);if(!t||!d.bpm){toast('SYNC needs a BPM on both decks. Tap the BPM badge to enter one.');return}
 let r=t/d.bpm;if(r>1.5)r/=2;else if(r<.67)r*=2;const p=(r-1)*100;if(Math.abs(p)>16){toast('Those tempos are too far apart to sync within ±16% pitch.');return}
 o.sync=false;d.sync=true;d.pitch=p;setPitch(d);alignBeat(d,o);ui(d);ui(o);toast('Deck '+d.L+' synced to '+t.toFixed(1)+' BPM')}
document.addEventListener('click',e=>{const b=e.target.closest('em[id^=bp]');if(!b)return;const d=dk(b.id.slice(-1)),v=parseFloat(prompt('Original BPM of Deck '+d.L+' (60–200):',d.bpm||''));if(v>=60&&v<=200){if(window.__ylSetBpm)__ylSetBpm(d,v,'manual');else{d.bpm=v;d.detected=false;if(d.sync)doSync(d,1);ui(d)}}else if(!isNaN(v))toast('Enter a BPM between 60 and 200.')});
/* Waveform: click / drag to seek */
D.forEach(d=>{const c=$('#wf'+d.L);let on=0,was=0;const at=e=>{const r=c.getBoundingClientRect();d.pos=clamp((e.clientX-r.left)/r.width,0,1)*d.dur};
 c.addEventListener('pointerdown',e=>{if(!d.buf)return;c.setPointerCapture(e.pointerId);on=1;was=d.on;if(was)stopD(d);at(e)});c.addEventListener('pointermove',e=>{if(on)at(e)});
 const up=()=>{if(!on)return;on=0;if(was)play(d)};c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up)});
/* Jog wheel: drag to pitch-bend while playing, scrub when stopped */
D.forEach(d=>{const j=$('#jog'+d.L);let act=0,a0=0;const ang=e=>{const r=j.getBoundingClientRect();return Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2)};
 j.addEventListener('pointerdown',e=>{j.setPointerCapture(e.pointerId);act=1;a0=ang(e)});
 j.addEventListener('pointermove',e=>{if(!act)return;const a=ang(e);let da=a-a0;a0=a;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;d.ang+=da*57.3;
  if(d.on&&d.src){d.src.playbackRate.value=clamp((1+d.pitch/100)*(1+da*3),.5,1.6);clearTimeout(j.t);j.t=setTimeout(()=>{if(d.src)d.src.playbackRate.value=1+d.pitch/100},80)}else if(d.dur)d.pos=clamp(d.pos+da*.9,0,d.dur)});
 const up=()=>{act=0;if(d.src)d.src.playbackRate.value=1+d.pitch/100};j.addEventListener('pointerup',up);j.addEventListener('pointercancel',up)});
/* Beginner / Pro mode */
const mb=$('#modeBtn');function setMode(b){document.body.classList.toggle('beginner',b);mb.textContent=b?'BEGINNER':'PRO';try{localStorage.setItem('yapsMode',b?'b':'p')}catch(e){}}
mb.onclick=()=>setMode(!document.body.classList.contains('beginner'));try{setMode(localStorage.getItem('yapsMode')==='b')}catch(e){setMode(false)}
/* Tutorial */
const TUT=[
{h:'Welcome',b:'Mix two songs like a DJ. It takes about a minute to learn, and nothing is saved or published until you choose to.',n:'You start in BEGINNER mode with fewer controls. Switch to PRO any time with the button at the top.'},
{h:'Load a song into Deck A',b:'Tap your music sources and pick a song from the YAPS Library, your phone or your saved mixes.',t:['#deckA .info','[data-src=lib]','#toolsBtn']},
{h:'Load a song into Deck B',b:'Pick a second song. Deck B is the other side of your mix.',t:['#deckB .info','[data-src=lib]','#toolsBtn']},
{h:'Press play',b:'Tap the play button on Deck A. It plays and pauses the song.',t:['#deckA [data-a=play]']},
{h:'Match the tempo',b:'Press SYNC on Deck B so both songs run at the same speed.',t:['#deckB [data-a=sync]']},
{h:'Blend with the crossfader',b:'Slide it from A to B to fade one song into the other. Start in the middle and move slowly.',t:['#xf']},
{h:'Add effects (optional)',b:'Echo, Reverb and Filter change the sound. Tap one again to turn it off.',t:['[data-fx=echo]'],n:'Not visible? Effects live in PRO mode.'},
{h:'Record your mix',b:'Press Start Recording, mix, then stop to capture your set. You can listen before you save.',t:['#rec']},
{h:'Share it',b:'Save, download or publish your mix to YAPS when you are happy with it. You can replay this tour any time with the ? button.',t:['#exP','#exS']}];
let ti=0;const td=$('#tut'),tr=$('#tutRing');
const vis=q=>{const e=document.querySelector(q);if(!e)return null;const r=e.getBoundingClientRect();return(r.width>2&&r.height>2&&getComputedStyle(e).visibility!=='hidden')?e:null};
function tutRing(){const st=TUT[ti],el=td.open&&st&&st.t?st.t.map(vis).find(Boolean):null;if(!el){tr.classList.remove('on');return}
 const r=el.getBoundingClientRect(),pad=6;tr.style.cssText='left:'+(r.left-pad)+'px;top:'+(r.top-pad)+'px;width:'+(r.width+pad*2)+'px;height:'+(r.height+pad*2)+'px';tr.classList.add('on')}
const tutShow=()=>{const st=TUT[ti];$('#tutT').textContent='Step '+(ti+1)+' of '+TUT.length+' · '+st.h;$('#tutB').textContent=st.b;$('#tutNote').textContent=st.n||'';$('#tutNote').style.display=st.n?'':'none';
 $('#tutN').textContent=ti==TUT.length-1?'Done':'Next';$('#tutP').style.visibility=ti?'visible':'hidden';$('#tutS').textContent=ti==TUT.length-1?'Close':'Skip tour';
 $('#tutDots').innerHTML=TUT.map((_,i)=>'<i class="'+(i==ti?'on':i<ti?'done':'')+'"></i>').join('');
 const el=st.t?st.t.map(vis).find(Boolean):null;if(el){try{el.scrollIntoView({block:'center',inline:'nearest',behavior:'smooth'})}catch(e){}}
 tr.classList.remove('on');setTimeout(tutRing,380)};
const tutEnd=()=>{td.close();tr.classList.remove('on');try{localStorage.setItem('yapsTut','1')}catch(e){}};
const tutOpen=()=>{ti=0;tutShow();if(!td.open)td.show();td.focus()};
$('#tutN').onclick=()=>{if(ti>=TUT.length-1)tutEnd();else{ti++;tutShow()}};
$('#tutP').onclick=()=>{if(ti>0){ti--;tutShow()}};
$('#tutS').onclick=tutEnd;$('#helpBtn').onclick=tutOpen;
td.addEventListener('cancel',e=>{e.preventDefault();tutEnd()});
addEventListener('resize',tutRing);addEventListener('scroll',tutRing,true);
/* First visit: start in BEGINNER mode (fewer controls) and open the friendly tour. */
let seen=null,modeSet=null;try{seen=localStorage.getItem('yapsTut');modeSet=localStorage.getItem('yapsModeSet')}catch(e){}
if(!modeSet&&!seen){setMode(true);try{localStorage.setItem('yapsModeSet','1')}catch(e){}}
mb.addEventListener('click',()=>{try{localStorage.setItem('yapsModeSet','1')}catch(e){}});
if(!seen)setTimeout(tutOpen,400);
/* Empty-deck hints: dashed outline + "Tap to choose a song"; tapping an empty deck opens the library. */
D.forEach(d=>{const m=$('#deck'+d.L+' .meta');if(m&&!m.querySelector('.dhint')){const h=document.createElement('div');h.className='dhint';h.textContent='Tap here to choose a song';m.appendChild(h)}});
const emptyChk=()=>D.forEach(d=>{const e=$('#deck'+d.L);if(e)e.classList.toggle('empty',!d.buf)});emptyChk();setInterval(emptyChk,500);
$('#decks').addEventListener('click',e=>{const dc=e.target.closest('.deck.empty .info');if(dc&&!e.target.closest('canvas'))srcPick('lib',dc.closest('.deck')||dc)});
/* Plain-language tooltips (hover on desktop, long-press on phones) */
const TIPS={'[data-a=cue]':'Cue: jump back to the start point','[data-a=play]':'Play or pause (Q = Deck A, P = Deck B)','[data-a=sync]':'Match this deck to the speed of the other deck','[data-a=rp]':'Put the speed back to normal','[data-a=pitch]':'Speed the song up or slow it down','[data-a=vol]':'Volume of this deck','#xf':'Crossfader: slide between Deck A and Deck B','#mvol':'Master volume: the overall loudness','#sgv':'Volume of the sampler pads','#tapB':'Tap to the beat to find a song\u2019s tempo (key T)','#limB':'Limiter: protects your ears and speakers from sudden loud peaks','#keyB':'See keyboard shortcuts (or press ?)','#rec':'Record everything you play','#aiGo':'Let AI DJ mix the two decks for you. Tap again to stop','#aiTop':'AI DJ: automatic mixing','#modeBtn':'BEGINNER shows fewer controls. PRO shows everything','#helpBtn':'Replay the quick tour','#fsBtn':'Fullscreen and landscape','#toolsBtn':'Music sources, AI DJ, recording and export','#navBtn':'Open the menu','#scTop':'Create a brand-new song with AI','[data-fx=echo]':'Echo: repeats the sound','[data-fx=rev]':'Reverb: adds room ambience','[data-fx=fil]':'Filter: muffles or brightens the sound','[data-loop]':'Loop a few beats. Tap the \u27f2 button to exit','[data-hc]':'Hot cue: tap to jump to a saved spot (tap again on an empty one to save it)','#exS':'Save this mix on your device','#exH':'Share this mix','#exD':'Download this mix','#exP':'Publish this mix to YAPS (sign in required)'};
Object.keys(TIPS).forEach(q=>$$(q).forEach(e=>{if(!e.title)e.title=TIPS[q]}));

/* Comfort settings: remembered between visits */
[['cmfBig','cmf-big','yapsBig'],['cmfCalm','cmf-calm','yapsCalm'],['cmfLite','cmf-lite','yapsLite']].forEach(([id,cls,key])=>{const b=$('#'+id),h=document.documentElement;
 const set=on=>{h.classList.toggle(cls,on);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.textContent=on?'ON':'OFF';try{localStorage.setItem(key,on?'1':'0')}catch(e){}};
 let v=null;try{v=localStorage.getItem(key)}catch(e){}
 if(v===null&&id==='cmfCalm'){try{v=matchMedia('(prefers-reduced-motion:reduce)').matches?'1':'0'}catch(e){}}
 if(v===null&&id==='cmfLite'){try{v=((navigator.deviceMemory&&navigator.deviceMemory<=2)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4))?'1':'0'}catch(e){}}
 set(v==='1');b.onclick=()=>set(!h.classList.contains(cls))});
/* Remember AI DJ choices between visits */
['aiStyle','aiEnergy'].forEach(id=>{const e=$('#'+id);try{const v=localStorage.getItem('yaps_'+id);if(v&&[...e.options].some(o=>o.value===v))e.value=v}catch(x){}e.addEventListener('change',()=>{try{localStorage.setItem('yaps_'+id,e.value)}catch(x){}})});
/* AI DJ: analysed beat-aligned transitions, bass swap, styles, energy modes, manual override */
const AI_STYLES={smooth:{b:16,n:'Smooth'},club:{b:8,n:'Club'},fast:{b:4,n:'Fast'},creative:{b:8,n:'Creative'},long:{b:32,n:'Long Mix'}},AI_EN={chill:{m:1.3,v:.7},normal:{m:1,v:.85},party:{m:.8,v:.92},high:{m:.65,v:.95}};
let ai=null;const aiMsg=m=>{$('#aiSt').textContent=m},smooth=p=>p*p*(3-2*p);
const aiLen=a=>clamp(AI_STYLES[$('#aiStyle').value].b*AI_EN[$('#aiEnergy').value].m*60/(eff(a)||120),3,45);
/* ===== PARTY AUTOPILOT: chooses songs by genre + tempo match, avoids repeats, recovers by itself, keeps the screen awake ===== */
const AP={on:()=>{const e=$('#apOn');return !!(e&&e.checked)},lock:()=>{const e=$('#apLock');return !!(e&&e.checked)},src:()=>($('#apSrc')||{}).value||'all',wl:null,busy:false};
['apOn','apLock'].forEach(id=>{const e=$('#'+id);try{const v=localStorage.getItem('yaps_'+id);if(v!==null)e.checked=v==='1'}catch(x){}e.addEventListener('change',()=>{try{localStorage.setItem('yaps_'+id,e.checked?'1':'0')}catch(x){}})});
{const e=$('#apSrc');try{const v=localStorage.getItem('yaps_apSrc');if(v&&[...e.options].some(o=>o.value===v))e.value=v}catch(x){}e.addEventListener('change',()=>{try{localStorage.setItem('yaps_apSrc',e.value)}catch(x){}})}
const apMax=()=>matchMedia('(pointer:coarse)').matches?360:600;
const apDur=t=>{const p=String(t.duration||'').split(':').map(Number);return p.length>1?(p[0]||0)*60+(p[1]||0):0};
const apPool=()=>{const off=AP.src()==='offline';return library.filter(t=>t.audio&&(!apDur(t)||apDur(t)<=apMax())&&(!off||t.local||t.dl||isOff(t.id)))};
function nextTrack(a){
 if(!AP.on()){const pool0=library.filter(t=>t.audio&&!ai.used.has(String(t.id)));if(!pool0.length){ai.used.clear();return library.find(t=>t.audio)}const g=(a.g||'').toLowerCase(),s=pool0.filter(t=>(t.genre||'').toLowerCase()===g),p=s.length?s:pool0;return p[Math.random()*p.length|0]}
 const base=apPool();if(!base.length)return null;
 let pool=base.filter(t=>!ai.used.has(String(t.id)));
 if(!pool.length){const keep=[...ai.used].slice(-Math.min(5,Math.floor(base.length/2)));ai.used=new Set(keep);pool=base.filter(t=>!ai.used.has(String(t.id)));if(!pool.length)pool=base}
 const g=(a.g||'').toLowerCase(),ob=eff(a);let best=pool[0],bs=-1;
 for(const t of pool){let s=Math.random()*2;if(g&&(t.genre||'').toLowerCase()===g)s+=2;
  if(ob&&t.bpm){let r=ob/t.bpm;if(r>1.4)r/=2;else if(r<.7)r*=2;const d=Math.abs(r-1);s+=d<.04?4:d<.08?3:d<.16?1.5:0}
  if(s>bs){bs=s;best=t}}
 return best}
async function aiTick(){if(!ai||ai.busy||ai.loading)return;const a=D[ai.cur],b=D[1-ai.cur];if(!a.on||!a.buf)return;
 const len=aiLen(a),start=Math.max(a.pos+1,Math.min(Math.min(a.mixOut||a.dur,a.dur)-len,a.dur-len-2)),left=start-a.pos;
 if(!ai.ready&&left<len+25){ai.loading=true;aiMsg('Preparing next track…');const t=nextTrack(a);if(!t){ai.loading=false;aiMsg(AP.src()==='offline'?'No downloaded or device songs left. Switch Songs from to whole library.':'No tracks available');return}
  ai.used.add(String(t.id));const ok=await loadTrack(b.L,t);if(!ai)return;ai.loading=false;if(ok){ai.ready=true;ai.fail=0;aiMsg('Next up: '+b.t)}else if(++ai.fail>=(AP.on()?12:3)){aiToggle();toast('AI DJ stopped: tracks couldn’t be loaded. Try another source.')}return}
 if(ai.ready&&left<=.25){ai.busy=true;await aiTransition(a,b,len);if(ai)ai.busy=false}}
function aiTransition(A,B,len){return new Promise(res=>{const o=eff(A),tr=Math.min(len,Math.max(2,A.dur-A.pos-.5));let r=1;if(o&&B.bpm){r=o/B.bpm;if(r>1.4)r/=2;else if(r<.7)r*=2}
 B.pitch=Math.abs(r-1)<=.16?(r-1)*100:0;setPitch(B);B.pos=clamp(B.mixIn||0,0,B.dur-1);
 if(B.beat0!=null&&B.bpm){const sb=60/B.bpm;B.pos=B.beat0+Math.ceil(Math.max(0,B.pos-B.beat0)/sb)*sb}
 const spa=60/(o||120),wait=A.beat0!=null&&A.bpm?spa-((((A.pos-A.beat0)%spa)+spa)%spa):0,from=xv,to=ai.cur?0:1;
 B.eq.lo=-1;applyEq(B);ai.tr={x:0};aiMsg('AI Transition: '+A.L+' → '+B.L+' ('+AI_STYLES[$('#aiStyle').value].n+')');$('#aiSt').classList.add('live');
 function fin(c){A.fl.frequency.setTargetAtTime(22000,C.currentTime,.05);A.eq.lo=0;B.eq.lo=0;applyEq(A);applyEq(B);$('#aiSt').classList.remove('live');
  if(!c){stopD(A);ai.cur=1-ai.cur;ai.ready=false;ai.tr=null;aiMsg('Now playing: '+B.t)}else if(ai){aiToggle();toast('Manual override: AI DJ stopped. You’re in control.')}res()}
 setTimeout(()=>{if(!ai){res();return}play(B);const t0=performance.now();(function s(n){if(!ai||ai.tr.x){fin(true);return}
  const p=Math.min(1,(n-t0)/(tr*1000));xv=from+(to-from)*smooth(p);$('#xf').value=xv*100;xfade();
  B.eq.lo=p<.5?-1:-1+(p-.5)*2;A.eq.lo=p<.5?0:-(p-.5)*2;applyEq(A);applyEq(B);
  if($('#aiStyle').value==='creative')A.fl.frequency.setTargetAtTime(22000*Math.pow(.03,p),C.currentTime,.05);
  if(p<1)requestAnimationFrame(s);else fin(false)})(t0)},wait*1000)})}
function aiToggle(){if(ai){clearInterval(ai.iv);ai=null;$('#aiGo').textContent='▶ Start AI DJ';$('#aiGo').classList.remove('live');$('#aiSt').classList.remove('live');aiMsg('AI DJ is off');return}
 if(!D[0].buf&&!D[1].buf){toast('Load at least one track first');return}init();const cur=D[0].buf?0:1,a=D[cur],b=D[1-cur];
 master.gain.value=Math.min(master.gain.value,AI_EN[$('#aiEnergy').value].v);$('#mvol').value=master.gain.value*100;xv=cur;$('#xf').value=xv*100;xfade();if(!a.on)play(a);
 ai={cur,used:new Set(a.tid?[a.tid]:[]),ready:!!b.buf,fail:0,iv:setInterval(aiTick,500)};$('#aiGo').textContent='■ Stop AI DJ';$('#aiGo').classList.add('live');aiMsg('AI DJ is mixing')}
/* MIX NOW: one tap blends the playing deck into the other one (tempo-matched, beat-aligned, bass swap), using the AI DJ style + energy. */
const MN={busy:false,stop:false};
$('#xf').addEventListener('input',()=>{if(MN.busy)MN.stop=true});
$('#mixNow').onclick=()=>{
 if(MN.busy){MN.stop=true;return}
 if(ai){toast('The AI DJ is already mixing. Stop it to use Mix Now.');return}
 const loaded=D.filter(d=>d.buf);
 if(!loaded.length){toast('Load a song into Deck A and Deck B first');return}
 init();
 let A=D.find(d=>d.on),B;
 if(!A){const d=D[0].buf?D[0]:D[1];xv=d===D[0]?0:1;$('#xf').value=xv*100;xfade();play(d);
  toast(D[1-D.indexOf(d)].buf?'Playing Deck '+d.L+'. Tap MIX NOW to blend into the other song.':'Playing Deck '+d.L+'. Load a song into the other deck, then tap MIX NOW.');return}
 B=D[1-D.indexOf(A)];
 if(D[0].on&&D[1].on){A=xv<.5?D[0]:D[1];B=D[1-D.indexOf(A)]}
 if(!B.buf){toast('Load a song into Deck '+B.L+' first');return}
 const bothOn=B.on,len=aiLen(A),tr=Math.min(len,Math.max(2,A.dur-A.pos-.5)),to=B===D[1]?1:0,from=xv;
 if(!bothOn){const o=eff(A);let r=1;if(o&&B.bpm){r=o/B.bpm;if(r>1.4)r/=2;else if(r<.7)r*=2}
  B.pitch=Math.abs(r-1)<=.16?(r-1)*100:0;setPitch(B);B.pos=clamp(B.mixIn||0,0,B.dur-1);
  if(B.beat0!=null&&B.bpm){const sb=60/B.bpm;B.pos=B.beat0+Math.ceil(Math.max(0,B.pos-B.beat0)/sb)*sb}}
 const spa=60/(eff(A)||120),wait=!bothOn&&A.beat0!=null&&A.bpm?spa-((((A.pos-A.beat0)%spa)+spa)%spa):0;
 MN.busy=true;MN.stop=false;const btn=$('#mixNow');btn.textContent='■ MIXING…';aiMsg('Mix Now: '+A.L+' → '+B.L);$('#aiSt').classList.add('live');
 const done=ok=>{A.fl.frequency.setTargetAtTime(22000,C.currentTime,.05);A.eq.lo=0;B.eq.lo=0;applyEq(A);applyEq(B);
  if(ok)stopD(A);$('#aiSt').classList.remove('live');aiMsg(ok?'Now playing: '+B.t:'Mix stopped. You’re in control.');btn.textContent='⇄ MIX NOW';MN.busy=false;MN.stop=false};
 if(!bothOn){B.eq.lo=-1;applyEq(B)}
 setTimeout(()=>{if(MN.stop){done(false);return}
  if(!B.on)play(B);const t0=performance.now();
  (function st(n){if(MN.stop){done(false);return}
   const p=Math.min(1,(n-t0)/(tr*1000));xv=from+(to-from)*smooth(p);$('#xf').value=xv*100;xfade();
   B.eq.lo=p<.5?-1:-1+(p-.5)*2;A.eq.lo=p<.5?0:-(p-.5)*2;applyEq(A);applyEq(B);
   if(p<1)requestAnimationFrame(st);else done(true)})(t0)},wait*1000)};
async function apWake(on){try{if(on){if(!AP.wl&&navigator.wakeLock){AP.wl=await navigator.wakeLock.request('screen');AP.wl.addEventListener('release',()=>{AP.wl=null})}}else if(AP.wl){const w=AP.wl;AP.wl=null;await w.release()}}catch(e){AP.wl=null}}
async function apStart(){if(AP.busy)return;
 if(ai){aiToggle();apWake(false);return}
 if(AP.on()&&!D[0].buf&&!D[1].buf){AP.busy=true;try{init();const pool=apPool();
   if(!pool.length){toast(AP.src()==='offline'?'No downloaded or device songs yet. Switch Songs from to whole library.':'No songs in the library yet');return}
   aiMsg('Autopilot: picking the first song…');
   for(let n=0;n<6&&!D[0].buf;n++)await loadTrack('A',pool[Math.random()*pool.length|0]);
   if(!D[0].buf){aiMsg('Autopilot could not load a song. Check your connection.');return}}
  finally{AP.busy=false}}
 aiToggle();if(ai)apWake(true)}
$('#aiGo').onclick=apStart;$('#aiTop').onclick=apStart;
/* watchdog: keeps the party going if a song ends early or fails, wakes a sleeping audio engine, frees the screen lock when stopped */
let apWatching=false;
setInterval(async()=>{if(apWatching)return;
 if(!ai){if(AP.wl)apWake(false);return}
 try{if(C&&C.state==='suspended')C.resume()}catch(e){}
 if(ai.busy||ai.loading||ai.tr||AP.busy||D[0].on||D[1].on)return;
 apWatching=true;
 try{const cur=D[ai.cur],oth=D[1-ai.cur];
  if(!(ai.ready&&oth.buf)){ai.loading=true;aiMsg('Autopilot: finding the next song…');const t=nextTrack(cur);
   if(t){ai.used.add(String(t.id));const ok=await loadTrack(oth.L,t);ai.fail=ok?0:ai.fail+1;if(ok)ai.ready=true}
   ai.loading=false}
  if(ai&&ai.ready&&oth.buf){ai.cur=1-ai.cur;xv=ai.cur;$('#xf').value=xv*100;xfade();oth.eq.lo=0;applyEq(oth);play(oth);ai.ready=false;aiMsg('Now playing: '+oth.t)}
  else if(ai&&cur.buf){cur.pos=0;play(cur)}}
 catch(e){console.warn('Autopilot watchdog',e)}
 if(ai)ai.loading=false;apWatching=false},2500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ai)apWake(true)});
/* ===== PARTY MODE (hands-free): the system runs the whole night =====
   Uses the autopilot above and adds: energy arc, automatic style changes, air horn / riser effects, full-screen lock screen,
   set length with a fade-out, hold-to-exit. */
const PM={on:false,t0:0,len:0,arc:'build',ending:false,lastReady:false,lastTr:false,iv:0,fade:0,retry:0,hold:0};
['pmLen','pmArc'].forEach(id=>{const e=$('#'+id);try{const v=localStorage.getItem('yaps_'+id);if(v&&[...e.options].some(o=>o.value===v))e.value=v}catch(x){}e.addEventListener('change',()=>{try{localStorage.setItem('yaps_'+id,e.value)}catch(x){}})});
const pmEnergy=()=>{const el=Date.now()-PM.t0,f=PM.len?Math.min(1,el/PM.len):(el/72e5)%1;
 if(PM.arc==='high')return f<.05?'party':'high';
 if(PM.arc==='chill')return f>.4&&f<.7?'normal':'chill';
 return f<.1?'chill':f<.3?'normal':f<.7?'party':f<.9?'high':'party'};
const pmPad=i=>{try{const p=$('#pads').children[i];if(p)p.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}))}catch(e){}};
const pmClock=ms=>{const s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?h+'h '+String(m).padStart(2,'0')+'m':m+' min'};
function pmOverlay(){let o=$('#pmOv');if(o)return o;o=document.createElement('div');o.id='pmOv';
 o.style.cssText='position:fixed;inset:0;z-index:99999;display:grid;place-items:center;text-align:center;padding:24px;background:radial-gradient(900px 600px at 50% 20%,var(--ma-dd),transparent 65%),var(--bg);color:var(--tx);touch-action:none';
 o.innerHTML='<div style="max-width:640px;width:100%;display:grid;gap:14px"><div style="font:700 14px Archivo Narrow;letter-spacing:.2em;color:var(--cy)">PARTY MODE · SYSTEM IS DJING</div><div id="pmNow" style="font:800 clamp(26px,6vw,52px)/1.1 Archivo Narrow">Starting…</div><div id="pmArt" style="font-size:clamp(16px,3vw,24px);color:var(--mu)"></div><div id="pmNext" style="font-size:14px;color:var(--mu)"></div><div id="pmInfo" style="font-size:13px;color:var(--mu)"></div><button id="pmExit" class="sm" style="justify-self:center;min-height:48px;padding:0 22px;margin-top:18px;position:relative;overflow:hidden">Hold 2 seconds to exit<span id="pmBar" style="position:absolute;left:0;bottom:0;height:3px;width:0;background:var(--cy)"></span></button></div>';
 document.body.appendChild(o);const b=o.querySelector('#pmExit'),bar=o.querySelector('#pmBar');let t=0,raf=0;
 const stop=()=>{clearTimeout(PM.hold);cancelAnimationFrame(raf);bar.style.width='0'};
 b.addEventListener('pointerdown',e=>{e.preventDefault();const s=performance.now();(function f(n){bar.style.width=Math.min(100,(n-s)/20)+'%';raf=requestAnimationFrame(f)})(s);PM.hold=setTimeout(()=>{stop();pmStop()},2000)});
 ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,stop));
 b.addEventListener('contextmenu',e=>e.preventDefault());return o}
function pmDraw(){const o=$('#pmOv');if(!o)return;const cur=ai?D[ai.cur]:null,oth=ai?D[1-ai.cur]:null,e=pmEnergy();
 $('#pmNow').textContent=cur&&cur.buf?cur.t:'Getting the music ready…';$('#pmArt').textContent=cur&&cur.buf?(cur.ar||''):'';
 $('#pmNext').textContent=ai&&ai.ready&&oth.buf?'Next up: '+oth.t:(ai?'Choosing the next song…':'');
 const el=Date.now()-PM.t0;$('#pmInfo').textContent='Energy: '+({chill:'Relaxed',normal:'Warm',party:'Party',high:'Peak'})[e]+' · Running '+pmClock(el)+(PM.len?' · '+pmClock(PM.len-el)+' left':'')+(PM.ending?' · Fading out':'')}
function pmTick(){if(!PM.on)return;
 if(!ai&&!PM.ending&&!AP.busy&&Date.now()>PM.retry){PM.retry=Date.now()+15000;apStart().catch(()=>{})}   /* it stopped by itself (e.g. no songs loaded): try again */
 if(ai&&!PM.ending){const e=pmEnergy(),sel=$('#aiEnergy');
  if(sel.value!==e){sel.value=e;sel.dispatchEvent(new Event('change',{bubbles:true}));if(typeof master!=='undefined'&&master){master.gain.value=AI_EN[e].v;$('#mvol').value=AI_EN[e].v*100}}
  if(ai.ready&&!PM.lastReady){const st={chill:['smooth','long'],normal:['smooth','club','creative'],party:['club','fast','creative','smooth'],high:['fast','club','creative']}[e];
   const s=$('#aiStyle');s.value=st[Math.random()*st.length|0];s.dispatchEvent(new Event('change',{bubbles:true}))}
  if(ai.tr&&!PM.lastTr&&(e==='party'||e==='high')&&Math.random()<.35)pmPad(Math.random()<.5?0:6)}
 PM.lastReady=!!(ai&&ai.ready);PM.lastTr=!!(ai&&ai.tr);
 if(PM.len&&!PM.ending&&Date.now()-PM.t0>=PM.len){PM.ending=true;aiMsg('Party Mode: fading out');PM.fade=setInterval(()=>{if(typeof master==='undefined'||!master)return pmStop();master.gain.value*=.92;if(master.gain.value<.02)pmStop()},500)}
 pmDraw()}
async function pmStart(){if(PM.on)return;
 PM.len=(+$('#pmLen').value||0)*3600e3;PM.arc=$('#pmArc').value;PM.t0=Date.now();PM.ending=false;PM.lastReady=false;PM.lastTr=false;PM.retry=Date.now()+15000;
 $('#apOn').checked=true;$('#apLock').checked=true;
 try{if(document.documentElement.requestFullscreen&&!document.fullscreenElement)document.documentElement.requestFullscreen({navigationUI:'hide'}).catch(()=>{})}catch(e){}
 PM.on=true;pmOverlay();$('#pmGo').textContent='PARTY MODE IS RUNNING';
 const sel=$('#aiEnergy');sel.value=pmEnergy();
 PM.iv=setInterval(pmTick,1000);pmTick();
 if(!ai)await apStart()}
function pmStop(){if(!PM.on)return;PM.on=false;clearInterval(PM.iv);clearInterval(PM.fade);clearTimeout(PM.hold);
 try{if(ai)aiToggle()}catch(e){}try{D.forEach(stopD)}catch(e){}
 try{if(typeof master!=='undefined'&&master){master.gain.value=.85;$('#mvol').value=85}}catch(e){}
 apWake(false);const o=$('#pmOv');if(o)o.remove();$('#pmGo').textContent='START PARTY MODE';
 try{if(document.fullscreenElement)document.exitFullscreen()}catch(e){}toast('Party Mode ended')}
$('#pmGo').onclick=pmStart;
/* while Party Mode runs, keyboard shortcuts are ignored too */
addEventListener('keydown',e=>{if(PM.on){e.stopImmediatePropagation();e.preventDefault()}},true);

document.addEventListener('input',e=>{if(ai&&ai.tr&&!AP.lock()&&(e.target.id==='xf'||e.target.dataset.a==='vol'))ai.tr.x=1});


/* ===== PRO UPGRADE: sampler pads, tap tempo, master meter + limiter, keyboard shortcuts ===== */
(function(){
 let sg=null;const sgv=$('#sgv');
 function bus(){init();if(!sg){sg=C.createGain();sg.connect(master)}sg.gain.value=sgv.value/100;return sg}
 const env=(o,t,a,pk,dur)=>{const g=C.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(bus());return g};
 const nz=(t,dur,type,f0,f1,pk,lp)=>{const s=C.createBufferSource(),b=bq(type,f0);s.buffer=nb;s.loop=true;b.frequency.setValueAtTime(f0,t);b.frequency.exponentialRampToValueAtTime(f1,t+dur);s.connect(b);env(b,t,Math.min(.02,dur/4),pk,dur);s.start(t);s.stop(t+dur+.05)};
 const os=(type,f0,f1,t,dur,pk)=>{const o=C.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);env(o,t,.01,pk,dur);o.start(t);o.stop(t+dur+.05)};
 const P=[
  ['AIRHORN',t=>[466,622,740].forEach(f=>{os('sawtooth',f,f*.98,t,.9,.18)})],
  ['SIREN',t=>{const o=C.createOscillator();o.type='sine';[0,.3,.6,.9].forEach((k,i)=>o.frequency.linearRampToValueAtTime(i%2?600:1200,t+k+.3));o.frequency.setValueAtTime(600,t);env(o,t,.02,.25,1.3);o.start(t);o.stop(t+1.35)}],
  ['LASER',t=>os('sawtooth',2400,90,t,.28,.3)],
  ['IMPACT',t=>{os('sine',130,28,t,.7,.9);nz(t,.5,'lowpass',2500,80,.6)}],
  ['CLAP',t=>[0,.012,.026].forEach(k=>nz(t+k,.12,'bandpass',1500,1400,.5))],
  ['REWIND',t=>nz(t,.9,'bandpass',5000,180,.5)],
  ['RISER',t=>nz(t,2,'highpass',200,7000,.5)],
  ['SCRATCH',t=>[0,.09,.18].forEach((k,i)=>nz(t+k,.09,'bandpass',i%2?900:2600,i%2?2600:900,.55))]];
 const pads=$('#pads');P.forEach((p,i)=>{const b=document.createElement('button');b.className='pad';b.innerHTML='<kbd>'+(i+1)+'</kbd>'+p[0];b.setAttribute('aria-label','Sampler '+p[0]);b.onpointerdown=e=>{e.preventDefault();fire(i)};pads.appendChild(b)});
 function fire(i){bus();P[i][1](C.currentTime+.005);const b=pads.children[i];b.classList.add('hit');setTimeout(()=>b.classList.remove('hit'),140)}
 sgv.oninput=()=>{if(sg)sg.gain.value=sgv.value/100};
 /* tap tempo */
 let taps=[],tl=0;const tO=$('#tapO');
 [$('#tapA'),$('#tapBd')].forEach(b=>b.onclick=()=>{tl=+b.dataset.tl;$('#tapA').classList.toggle('on',!tl);$('#tapBd').classList.toggle('on',!!tl)});
 function tap(){const n=performance.now();if(taps.length&&n-taps[taps.length-1]>2000)taps=[];taps.push(n);taps=taps.slice(-8);
  if(taps.length<2){tO.textContent='tap…';return}
  const iv=[];for(let i=1;i<taps.length;i++)iv.push(taps[i]-taps[i-1]);const bpm=Math.max(60,Math.min(200,Math.round(60000/(iv.reduce((a,b)=>a+b)/iv.length)*10)/10));
  tO.textContent=bpm.toFixed(1)+' BPM';if(taps.length>=4){const d=D[tl];if(window.__ylSetBpm)__ylSetBpm(d,bpm,'tap');else{d.bpm=bpm;d.detected=false;ui(d)}}}
 $('#tapB').onpointerdown=e=>{e.preventDefault();tap()};
 /* master meter + clip LED + limiter switch */
 const bar=$('#mbar'),rd=$('#mdb'),cl=$('#mclip');let mb=null,ct=0,bw=-1,rt='',rn=0,clipOn=false;
 (function m(n){requestAnimationFrame(m);n=n||performance.now();if(!window.ma)return;
  if(!mb)mb=new Uint8Array(ma.fftSize);ma.getByteTimeDomainData(mb);let pk=0;for(let i=0;i<mb.length;i++){const v=Math.abs(mb[i]-128)/128;if(v>pk)pk=v}
  const dbv=pk>0?20*Math.log10(pk):-90,w=Math.round(Math.max(0,Math.min(100,(dbv+48)/48*100)))/100;
  if(w!==bw){bw=w;bar.style.transform='scaleX('+w+')'}
  if(n-rn>100){rn=n;const t=pk>.002?dbv.toFixed(1)+' dB':'-\u221e dB';if(t!==rt){rt=t;rd.textContent=t}}
  if(pk>=.985){ct=performance.now()+1200;if(!clipOn){clipOn=true;cl.classList.add('on')}}else if(clipOn&&performance.now()>ct){clipOn=false;cl.classList.remove('on')}})();
 const lb=$('#limB');lb.onclick=()=>{init();const on=!lb.classList.contains('on');lb.classList.toggle('on',on);lb.setAttribute('aria-pressed',on);lim.ratio.value=on?20:1;toast('Master limiter '+(on?'on':'off'))};
 /* keyboard shortcuts */
 const kd=document.createElement('dialog');kd.id='keys';kd.setAttribute('aria-label','Keyboard shortcuts');
 kd.innerHTML='<h2>Keyboard shortcuts</h2><table><tr><td>Q / P</td><td>Play / pause Deck A / Deck B</td></tr><tr><td>A · S · D</td><td>Crossfader to A · centre · B</td></tr><tr><td>1 – 8</td><td>Fire sampler pads</td></tr><tr><td>Z X C V B N M ,</td><td>Fire Sampler+ slots 1–8 (Pro Console)</td></tr><tr><td>T</td><td>Tap tempo</td></tr><tr><td>?</td><td>Show this list</td></tr></table><div class="drow"><button class="k pl" id="keysX">Close</button></div>';
 document.body.appendChild(kd);$('#keysX').onclick=()=>kd.close();$('#keyB').onclick=()=>kd.showModal();
 const xs=v=>{const x=$('#xf');x.value=v;x.dispatchEvent(new Event('input',{bubbles:true}))};
 addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;const t=e.target;if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)&&t.type!=='range')return;
  if(e.key==='?'){kd.open?kd.close():kd.showModal();return}if(document.querySelector('dialog[open]'))return;
  const c=e.code;if(/^Digit[1-8]$/.test(c))fire(+c.slice(5)-1);
  else if(c==='KeyQ'||c==='KeyP'){const d=D[c==='KeyQ'?0:1];d.on?stopD(d):play(d)}
  else if(c==='KeyA')xs(0);else if(c==='KeyS')xs(50);else if(c==='KeyD')xs(100);else if(c==='KeyT')tap();else return;
  e.preventDefault()});
})();

/* ===== DJ PERFORMANCE PADS: 16 one-shot pads on the studio's own Web Audio engine =====
   Audio path: pad voice -> voice gain -> pad bus (VOL slider) -> master -> limiter -> speakers + recorder,
   so pads are heard, metered and recorded exactly like the decks. Nothing here replaces existing code.
   Built-in sounds are synthesized live (no audio files needed). Pads without a built-in sound (DJ shout-outs)
   stay EMPTY until the user loads their own audio; optional files in samples/ are used if they exist.
   Safety: one-shot only (never loops) / one voice per pad / max 8 voices / hard length cap / retrigger guard /
   LOCK / STOP ALL / auto-stop when the page is hidden. */
(function(){
 const MAXV=8,MAXS=20,MAXB=10*1048576,GUARD=40;
 const el=id=>document.getElementById(id);
 const grid=el('dpGrid'),statEl=el('dpStat');
 if(!grid||!statEl)return;
 let bus=null,vol=.75,mode='play',locked=false,nbuf=null,nbufC=null,cbuf=null,cbufC=null;
 const act=[];
 const gain=v=>Math.pow(v,1.6)*1.1;

 /* ---------- small synth toolkit (every source is registered on its voice so it can always be stopped) ---------- */
 function getBus(){init();if(!bus||bus.context!==C){bus=C.createGain();bus.gain.value=gain(vol);bus.connect(master)}return bus}
 function getNoise(){if(nbuf&&nbufC===C)return nbuf;const n=C.sampleRate*2,b=C.createBuffer(1,n,C.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;nbuf=b;nbufC=C;return b}
 function getCrackle(){if(cbuf&&cbufC===C)return cbuf;const n=C.sampleRate*3,b=C.createBuffer(1,n,C.sampleRate),d=b.getChannelData(0);let e=0;for(let i=0;i<n;i++){if(Math.random()<.004)e=Math.random()*2-1;d[i]=e;e*=.85}cbuf=b;cbufC=C;return b}
 function mkVoice(i,t,maxDur,grp){
  const g=C.createGain();g.connect(getBus());
  const v={i,g,grp,n:0,dead:false,maxDur,kill:0};
  v.stop=fade=>{if(v.dead)return;v.dead=true;fade=fade||.02;try{const n=C.currentTime;g.gain.cancelScheduledValues(n);g.gain.setValueAtTime(g.gain.value,n);g.gain.linearRampToValueAtTime(0,n+fade);v.src.forEach(s=>{try{s.stop(n+fade+.01)}catch(e){}})}catch(e){}setTimeout(()=>finish(v),(fade+.06)*1000)};
  v.src=[];
  v.kill=setTimeout(()=>v.stop(.03),(maxDur+.4)*1000);
  return v}
 function reg(v,s){v.src.push(s);v.n++;s.onended=()=>{if(--v.n<=0)finish(v)}}
 function finish(v){if(v.done)return;v.done=true;v.dead=true;clearTimeout(v.kill);const k=act.indexOf(v);if(k>=0)act.splice(k,1);try{v.g.disconnect()}catch(e){}
  if(!act.some(x=>x.i===v.i)){const b=grid.children[v.i];if(b)b.classList.remove('playing')}}
 function env(v,node,t,a,pk,dur){const g=C.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+dur);node.connect(g);g.connect(v.g);return g}
 function osc(v,type,f0,f1,pd,t,dur,pk,a){const o=C.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+pd);env(v,o,t,a||.003,pk,dur);o.start(t);o.stop(t+dur+.02);reg(v,o);return o}
 function noise(v,type,f0,f1,q,t,dur,pk,a){const s=C.createBufferSource();s.buffer=getNoise();s.loop=true;const b=C.createBiquadFilter();b.type=type;b.Q.value=q;b.frequency.setValueAtTime(f0,t);if(f1!==f0)b.frequency.exponentialRampToValueAtTime(f1,t+dur);s.connect(b);env(v,b,t,a||.002,pk,dur);s.start(t,Math.random()*1.5);s.stop(t+dur+.02);reg(v,s);return s}

 /* ---------- built-in sounds ---------- */
 const clap=(v,t)=>{[0,.011,.023].forEach(o=>noise(v,'bandpass',1300,1300,1.4,t+o,.026,2.2));noise(v,'bandpass',1250,1000,1.1,t+.034,.22,2.0)};
 const SYN={
  kick:(v,t)=>{osc(v,'sine',150,45,.12,t,.5,1.3);noise(v,'highpass',4000,4000,.7,t,.014,.5)},
  kick808:(v,t)=>{osc(v,'sine',110,40,.25,t,1.1,1.25);osc(v,'triangle',240,80,.05,t,.09,.4)},
  snare:(v,t)=>{osc(v,'triangle',230,170,.08,t,.16,.8);noise(v,'highpass',1500,1500,.7,t,.22,1)},
  snare2:(v,t)=>{noise(v,'bandpass',3200,3200,1.2,t,.11,1.2);osc(v,'sine',380,240,.04,t,.09,.6)},
  clap:(v,t)=>clap(v,t),
  clap2:(v,t)=>{clap(v,t);clap(v,t+.09)},
  hat:(v,t)=>{noise(v,'highpass',7500,7500,.8,t,.06,1.3);noise(v,'bandpass',10000,10000,3,t,.05,.9)},
  ohat:(v,t)=>{noise(v,'highpass',7500,7500,.8,t,.4,.8);noise(v,'bandpass',10000,10000,3,t,.34,.5)},
  shaker:(v,t)=>{noise(v,'bandpass',7000,7000,.9,t,.17,1.1,.045)},
  tomhi:(v,t)=>{osc(v,'sine',260,150,.1,t,.32,1.1);noise(v,'highpass',3000,3000,.7,t,.015,.3)},
  tomlo:(v,t)=>{osc(v,'sine',150,80,.15,t,.5,1.2);noise(v,'highpass',2500,2500,.7,t,.015,.3)},
  whistle:(v,t)=>{const o=C.createOscillator();o.type='sine';o.frequency.setValueAtTime(2100,t);o.frequency.exponentialRampToValueAtTime(2800,t+.09);
   const l=C.createOscillator(),ld=C.createGain();l.frequency.value=7;ld.gain.value=45;l.connect(ld);ld.connect(o.frequency);
   const g=C.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.55,t+.03);g.gain.setValueAtTime(.55,t+.45);g.gain.exponentialRampToValueAtTime(.0001,t+.72);
   o.connect(g);g.connect(v.g);o.start(t);o.stop(t+.74);l.start(t);l.stop(t+.74);reg(v,o);reg(v,l);
   noise(v,'bandpass',3200,3200,8,t,.7,.07,.03)},
  cheer:(v,t)=>{const s=C.createBufferSource();s.buffer=getNoise();s.loop=true;const mix=C.createGain();
   mix.gain.setValueAtTime(.0001,t);mix.gain.linearRampToValueAtTime(2.6,t+.35);mix.gain.setValueAtTime(2.6,t+1.3);mix.gain.exponentialRampToValueAtTime(.0001,t+2.4);mix.connect(v.g);
   [[650,1.3,4.7],[1700,1.1,6.1],[3100,.9,7.7]].forEach(a=>{const b=C.createBiquadFilter();b.type='bandpass';b.frequency.value=a[0];b.Q.value=a[1];const bg=C.createGain();bg.gain.value=.55;
    const l=C.createOscillator(),ld=C.createGain();l.frequency.value=a[2];ld.gain.value=.3;l.connect(ld);ld.connect(bg.gain);s.connect(b);b.connect(bg);bg.connect(mix);l.start(t);l.stop(t+2.45);reg(v,l)});
   s.start(t,Math.random());s.stop(t+2.45);reg(v,s)},
  applause:(v,t)=>{const s=C.createBufferSource();s.buffer=getCrackle();const b=C.createBiquadFilter();b.type='bandpass';b.frequency.value=2200;b.Q.value=.5;
   const g=C.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(2.2,t+.15);g.gain.setValueAtTime(2.2,t+1.2);g.gain.exponentialRampToValueAtTime(.0001,t+2.8);
   s.connect(b);b.connect(g);g.connect(v.g);s.start(t);s.stop(t+2.85);reg(v,s)}};

 /* ---------- pad definitions (shout-outs have no built-in sound on purpose: they need a real recording) ---------- */
 const DEFS=[
  {n:'KICK',c:'KICK',g:'drum',s:'kick',d:.55},{n:'808 KICK',c:'KICK',g:'drum',s:'kick808',d:1.15},
  {n:'SNARE',c:'SNARE',g:'drum',s:'snare',d:.3},{n:'SNARE 2',c:'SNARE',g:'drum',s:'snare2',d:.2},
  {n:'CLAP',c:'CLAP',g:'drum',s:'clap',d:.3},{n:'DBL CLAP',c:'CLAP',g:'drum',s:'clap2',d:.4},
  {n:'HAT',c:'HI-HAT',g:'perc',s:'hat',d:.12,grp:'hat',choke:'hat'},{n:'OPEN HAT',c:'HI-HAT',g:'perc',s:'ohat',d:.45,grp:'hat'},
  {n:'SHAKER',c:'SHAKER',g:'perc',s:'shaker',d:.25},{n:'TOM HI',c:'TOM',g:'drum',s:'tomhi',d:.4},
  {n:'TOM LOW',c:'TOM',g:'drum',s:'tomlo',d:.55},{n:'WHISTLE',c:'WHISTLE',g:'fx',s:'whistle',d:.8},
  {n:'CHEER',c:'CROWD',g:'fx',s:'cheer',d:2.5},{n:'APPLAUSE',c:'CROWD',g:'fx',s:'applause',d:2.9},
  {n:'SHOUT 1',c:'DJ VOICE',g:'shout',url:'samples/shout-1.mp3'},{n:'SHOUT 2',c:'DJ VOICE',g:'shout',url:'samples/shout-2.mp3'}];
 const pads=DEFS.map(def=>({def,user:null,miss:false,last:0,sid:0}));

 /* ---------- status line ---------- */
 function stat(m,err){statEl.textContent=m;statEl.classList.toggle('err',!!err);if(err)try{toast(m)}catch(e){}}

 /* ---------- rendering ---------- */
 pads.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.className='pad dpp';b.dataset.g=p.def.g;b.dataset.i=i;b.innerHTML='<kbd></kbd><b></b><i></i>';grid.appendChild(b)});
 function render(i){const p=pads[i],b=grid.children[i],d=p.def,u=p.pack||p.user,empty=!u&&!d.s;
  b.children[0].textContent=d.c;b.children[1].textContent=d.n;
  b.children[2].textContent=u?(u.url?'FILE':u.name):d.s?'BUILT-IN':(p.miss?'NO FILE · LOAD':'EMPTY · LOAD');
  b.classList.toggle('empty',empty);
  b.setAttribute('aria-label',d.n+' pad, '+d.c.toLowerCase()+', '+(u?'your sample '+u.name:d.s?'built-in sound':'empty, no sound loaded yet'));
  b.title=u?'Your sample: '+u.name:d.s?'Built-in synthesized sound':'No sound yet. Use LOAD mode to add your own audio file.'}
 pads.forEach((_,i)=>render(i));

 /* ---------- audio decode + storage ---------- */
 const decode=ab=>new Promise((res,rej)=>{const OC=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!OC)return rej(new Error('no audio decoder'));
  const p=new OC(1,1,48000).decodeAudioData(ab,res,rej);if(p&&p.catch)p.catch(()=>{})});
 const DBN='yaps_dpads_v1';
 const dbo=()=>new Promise((res,rej)=>{if(!window.indexedDB)return rej(new Error('no storage'));const r=indexedDB.open(DBN,1);r.onupgradeneeded=()=>{r.result.createObjectStore('u',{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
 async function dbx(m,fn){const db=await dbo();return new Promise((res,rej)=>{const tx=db.transaction('u',m),q=fn(tx.objectStore('u'));tx.oncomplete=()=>{db.close();res(q&&q.result)};tx.onerror=tx.onabort=()=>{db.close();rej(tx.error)}})}
 async function ensure(p){if(!p.user||p.user.buf)return;try{p.user.buf=await decode(p.user.bytes.slice(0))}catch(e){throw e}}

 /* ---------- loading the user's own audio ---------- */
 const fin=document.createElement('input');fin.type='file';fin.accept='audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.flac';fin.hidden=true;document.body.appendChild(fin);
 let target=-1;
 fin.onchange=()=>{const f=fin.files[0];fin.value='';if(f&&target>=0)loadFile(target,f)};
 async function loadFile(i,f){const p=pads[i],nm=p.def.n;if(p.pack){stat(nm+' is set by your active sound pack. Open PACKS to change it.',1);setMode('play');return}
  if(!/^audio\//.test(f.type)&&!/\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|webm|mp4)$/i.test(f.name)){stat('“'+f.name.slice(0,30)+'” is not an audio file. Use WAV, MP3, M4A, OGG or FLAC.',1);return}
  if(f.size>MAXB){stat('“'+f.name.slice(0,30)+'” is '+(f.size/1048576).toFixed(1)+' MB. Pads hold files up to '+(MAXB/1048576)+' MB.',1);return}
  try{const bytes=await f.arrayBuffer(),buf=await decode(bytes.slice(0));
   if(buf.duration>MAXS){stat('“'+f.name.slice(0,30)+'” is '+buf.duration.toFixed(1)+' s long. Pads are one-shots up to '+MAXS+' s. Trim it and try again.',1);return}
   if(buf.duration<.02){stat('That file is almost empty, so nothing was loaded.',1);return}
   const name=f.name.replace(/\.[^.]+$/,'').slice(0,16)||'sample';
   p.user={name,bytes,buf};p.miss=false;p.sid++;render(i);
   stat('Loaded “'+name+'” ('+buf.duration.toFixed(1)+' s) into '+nm+'. Tap the pad to play it. It plays once per tap.');
   try{await dbx('readwrite',s=>s.put({id:i,name,bytes}))}catch(e){stat('Loaded into '+nm+' for this session, but this device could not save it, so it will be gone after a reload.')}
  }catch(e){stat('Couldn’t read “'+f.name.slice(0,30)+'”. The file may be damaged or in a format this browser can’t decode.',1)}
  setMode('play')}
 async function clearPad(i){const p=pads[i],nm=p.def.n;if(p.pack){stat(nm+' is set by your active sound pack. Open PACKS to change it.',1);setMode('play');return}
  if(!p.user){stat(nm+' has no sample of yours to clear'+(p.def.s?'. It uses its built-in sound.':'.'));setMode('play');return}
  stopPad(i);p.user=null;p.sid++;render(i);try{await dbx('readwrite',s=>s.delete(i))}catch(e){}
  stat('Cleared your sample from '+nm+(p.def.s?'. The built-in sound is back.':'. The pad is empty again.'));setMode('play')}

 /* optional bundled files + restore saved samples (runs once, the first time the tab is opened) */
 let warmed=false;
 async function warm(){if(warmed)return;warmed=true;
  try{const rows=await dbx('readonly',s=>s.getAll());(rows||[]).forEach(r=>{const p=pads[r.id];if(p&&r.bytes&&!p.user)p.user={name:r.name||'sample',bytes:r.bytes,buf:null}})}catch(e){}
  const missing=[];
  await Promise.all(pads.map(async(p,i)=>{
   if(p.user){try{await ensure(p)}catch(e){p.user=null;try{await dbx('readwrite',s=>s.delete(i))}catch(x){}stat('A saved sample for '+p.def.n+' could not be decoded and was removed.',1)}render(i);return}
   if(!p.def.url||location.protocol==='file:')return;   /* optional bundled files can only be probed when served over http(s) */
   try{const r=await fetch(p.def.url,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const buf=await decode(await r.arrayBuffer());if(buf.duration>MAXS||buf.duration<.02)throw new Error('bad length');p.user={name:p.def.url.split('/').pop(),url:1,bytes:null,buf}}
   catch(e){p.miss=true;missing.push(p.def.url)}
   render(i)}));
  if(missing.length)stat('No sound on '+pads.filter(p=>p.miss).map(p=>p.def.n).join(' and ')+' yet: the optional file'+(missing.length>1?'s ':' ')+missing.join(', ')+(missing.length>1?' were':' was')+' not found. Use LOAD to add your own audio.')}
 try{new MutationObserver(()=>{if(document.body.dataset.vp==='dpads')warm()}).observe(document.body,{attributes:true,attributeFilter:['data-vp']});if(document.body.dataset.vp==='dpads')warm()}catch(e){}

 /* ---------- playback ---------- */
 function flash(i){const b=grid.children[i];b.classList.add('hit');setTimeout(()=>b.classList.remove('hit'),130)}
 function stopPad(i){act.filter(v=>v.i===i).forEach(v=>v.stop(.015))}
 function stopAll(quiet){const n=act.length;act.slice().forEach(v=>v.stop(.03));if(!quiet)stat(n?'Stopped all pad sounds.':'Nothing is playing.')}
 function go(i){
  const p=pads[i],d=p.def,t=C.currentTime+.004;
  if(d.choke)act.filter(v=>v.grp===d.choke).forEach(v=>v.stop(.012));
  stopPad(i);
  while(act.length>=MAXV)act[0].stop(.01),act.shift();
  let v;
  const U=p.pack||p.user;if(U){const b=U.buf,len=Math.min(b.duration,MAXS);v=mkVoice(i,t,len,d.grp);
   const s=C.createBufferSource();s.buffer=b;s.loop=false;s.connect(v.g);
   if(b.duration>MAXS){v.g.gain.setValueAtTime(1,t+len-.04);v.g.gain.linearRampToValueAtTime(0,t+len)}
   s.start(t);s.stop(t+len);reg(v,s)}
  else{v=mkVoice(i,t,d.d,d.grp);SYN[d.s](v,t)}
  act.push(v);grid.children[i].classList.add('playing')}
 function hit(i){
  if(locked){stat('Pads are locked. Tap UNLOCK to play.');return}
  const p=pads[i];
  if(mode==='load'){target=i;stat('Choose an audio file for '+p.def.n+' (WAV, MP3, M4A, OGG or FLAC, up to '+MAXS+' s).');fin.click();return}
  if(mode==='clear'){clearPad(i);return}
  if(!p.pack&&!p.user&&!p.def.s){flash(i);stat(p.def.n+' has no sound yet'+(p.miss?' (the optional file '+p.def.url+' was not found)':'')+'. Switch to LOAD, tap this pad and choose your own audio file.',1);return}
  const n=performance.now();if(n-p.last<GUARD)return;p.last=n;
  try{init()}catch(e){stat('Audio could not start in this browser: '+e.message,1);return}
  flash(i);
  const run=()=>{try{if(!p.pack&&p.user&&!p.user.buf){ensure(p).then(()=>go(i)).catch(()=>stat('Couldn’t decode the sample on '+p.def.n+'.',1));return}go(i)}catch(e){stat('Couldn’t play '+p.def.n+': '+e.message,1)}};
  if(C.state==='running')run();
  else{let ok=false;const w=C.resume();Promise.race([w,new Promise(r=>setTimeout(r,600))]).then(()=>{if(C.state==='running'){if(!ok){ok=true;run()}}else stat('The browser is blocking audio. Tap a pad again to allow sound.',1)}).catch(()=>stat('The browser is blocking audio. Tap a pad again to allow sound.',1))}}

 /* ---------- input: pointer (instant, multi-touch) + keyboard activation + drag & drop ---------- */
 grid.addEventListener('pointerdown',e=>{const b=e.target.closest('.dpp');if(!b||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();hit(+b.dataset.i)});
 grid.addEventListener('click',e=>{const b=e.target.closest('.dpp');if(b&&e.detail===0)hit(+b.dataset.i)});   /* detail 0 = keyboard (Enter / Space) */
 grid.addEventListener('contextmenu',e=>e.preventDefault());
 grid.addEventListener('dragover',e=>{const b=e.target.closest('.dpp');if(!b)return;e.preventDefault();grid.classList.add('over');[...grid.children].forEach(x=>x.classList.toggle('drop',x===b))});
 grid.addEventListener('dragleave',e=>{if(!grid.contains(e.relatedTarget)){grid.classList.remove('over')}});
 grid.addEventListener('drop',e=>{const b=e.target.closest('.dpp');grid.classList.remove('over');if(!b)return;e.preventDefault();const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f&&!locked)loadFile(+b.dataset.i,f);else if(locked)stat('Pads are locked. Tap UNLOCK first.')});

 /* ---------- controls ---------- */
 function setMode(m){mode=m;grid.dataset.m=m;document.querySelectorAll('#dpads [data-dm]').forEach(b=>{const on=b.dataset.dm===m;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})}
 document.querySelectorAll('#dpads [data-dm]').forEach(b=>b.onclick=()=>{setMode(b.dataset.dm);if(b.dataset.dm==='load')stat('LOAD mode: tap the pad you want to fill, then choose your own audio file. Or drag a file onto a pad.');else if(b.dataset.dm==='clear')stat('CLEAR mode: tap a pad to remove your own sample from it.');else stat('PLAY mode: tap a pad to play it once.')});
 const vin=el('dpv'),vout=el('dpvo');
 vin.oninput=()=>{vol=vin.value/100;vout.textContent=vin.value;if(bus&&bus.context===C)bus.gain.setTargetAtTime(gain(vol),C.currentTime,.015)};
 el('dpStop').onpointerdown=e=>{e.preventDefault();stopAll()};
 el('dpStop').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();stopAll()}};
 const lk=el('dpLock');lk.onclick=()=>{locked=!locked;grid.classList.toggle('locked',locked);lk.classList.toggle('on',locked);lk.setAttribute('aria-pressed',locked);lk.textContent=locked?'LOCKED':'LOCK';if(locked)stopAll(true);stat(locked?'Pads locked. Nothing can be triggered until you unlock.':'Pads unlocked.')};
 /* never leave sound running when the page goes to the background */
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll(true)});
 addEventListener('pagehide',()=>stopAll(true));
 window.yapsPads={stopAll:()=>stopAll(true),active:()=>act.length,
 info:()=>pads.map(p=>({n:p.def.n,c:p.def.c})),
 setPackPad(i,s){const p=pads[i];if(!p)return;stopPad(i);p.pack=s?{name:s.name,buf:s.buf}:null;p.sid++;render(i)},
 preview(buf){init();stopPad(-1);const t=C.currentTime+.004,len=Math.min(buf.duration,MAXS),v=mkVoice(-1,t,len,'prev'),s=C.createBufferSource();s.buffer=buf;s.loop=false;s.connect(v.g);s.start(t);s.stop(t+len);reg(v,s);act.push(v)}};
})();

/* ===== SOUND PACK MANAGER =====
   Custom sound packs for the DJ PADS. Opens from DJ PADS > PACKS. Everything is stored on THIS device:
   IndexedDB "yaps_soundpacks_v1" (packs, sound metadata, audio bytes) + one small localStorage key (active pack id).
   No account or server is needed. Nothing is ever deleted without a confirmation. Names are shown with textContent (never HTML). */
(function(){
 const P=window.yapsPads;if(!P||!P.setPackPad)return;
 const CATS=[['perc','Percussion'],['vox','Vocals'],['trans','Transitions'],['fx','Celebration FX'],['other','Other']],CN=Object.fromEntries(CATS);
 const L={packs:20,sounds:64,file:10485760,sec:20,total:125829120,name:24,imp:83886080};
 const AK='yaps_active_pack_v1',DB='yaps_soundpacks_v1',MB=n=>(n/1048576).toFixed(1)+' MB';
 const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,9);
 const h=(t,c,x,a)=>{const n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;if(a)for(const k in a)n.setAttribute(k,a[k]);return n};
 const btn=(x,c,f,a)=>{const b=h('button','spm-b'+(c?' '+c:''),x,a);b.type='button';if(f)b.onclick=f;return b};
 const clean=(s,n)=>String(s==null?'':s).replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,n);
 const errMsg=e=>e&&e.name==='QuotaExceededError'?'browser storage is full':(e&&e.message)||'unknown error';

 /* ---------- storage ---------- */
 const open=()=>new Promise((ok,no)=>{if(!window.indexedDB)return no(new Error('this browser has no local database (private mode?)'));let r;try{r=indexedDB.open(DB,1)}catch(e){return no(e)}
  r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('packs',{keyPath:'id'});d.createObjectStore('sounds',{keyPath:'id'}).createIndex('pid','pid');d.createObjectStore('audio',{keyPath:'id'})};
  r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
 async function run(names,mode,fn){const d=await open();return new Promise((ok,no)=>{let out;const t=d.transaction(names,mode);t.oncomplete=()=>{d.close();ok(out)};t.onabort=()=>{d.close();no(t.error||new Error('storage failed'))};
  try{fn(t,v=>out=v)}catch(e){try{t.abort()}catch(x){}}})}
 const rd=(s,q)=>run(s,'readonly',(t,o)=>{q(t.objectStore(s)).onsuccess=e=>o(e.target.result)});
 const getPacks=()=>rd('packs',s=>s.getAll()),allSounds=()=>rd('sounds',s=>s.getAll()),getSounds=pid=>rd('sounds',s=>s.index('pid').getAll(pid));
 const getAudio=id=>rd('audio',s=>s.get(id)).then(r=>r&&r.b);
 const putPack=p=>{p.updated=Date.now();return run('packs','readwrite',t=>{t.objectStore('packs').put(p)})};
 const putSound=(m,b)=>run(['sounds','audio'],'readwrite',t=>{t.objectStore('sounds').put(m);if(b)t.objectStore('audio').put({id:m.id,b})});
 const delPack=id=>run(['packs','sounds','audio'],'readwrite',t=>{t.objectStore('packs').delete(id);const c=t.objectStore('sounds').index('pid').openKeyCursor(IDBKeyRange.only(id));
  c.onsuccess=()=>{const k=c.result;if(k){t.objectStore('sounds').delete(k.primaryKey);t.objectStore('audio').delete(k.primaryKey);k.continue()}}});
 const delSound=(id,pk)=>run(['packs','sounds','audio'],'readwrite',t=>{t.objectStore('sounds').delete(id);t.objectStore('audio').delete(id);pk.pads=pk.pads.map(x=>x===id?null:x);pk.updated=Date.now();t.objectStore('packs').put(pk)});

 /* ---------- audio checks ---------- */
 const dec=ab=>new Promise((ok,no)=>{const O=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!O)return no(new Error('no decoder'));try{const p=new O(1,1,48000).decodeAudioData(ab,ok,no);if(p&&p.catch)p.catch(()=>{})}catch(e){no(e)}});
 async function vet(b){let x;try{x=await dec(b.slice(0))}catch(e){throw new Error('this browser can’t decode it (damaged or unsupported format)')}
  if(x.duration>L.sec)throw new Error('it is '+x.duration.toFixed(1)+' s long (max '+L.sec+' s)');if(x.duration<.02)throw new Error('it is almost empty');return{dur:x.duration,x}}
 const bufs=new Map();
 async function buf(id){if(bufs.has(id))return bufs.get(id);const b=await getAudio(id);if(!b)throw new Error('missing');const x=await dec(b.slice(0));bufs.set(id,x);return x}
 const b64=ab=>{const u=new Uint8Array(ab);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)};
 const unb64=s=>{const r=atob(s),u=new Uint8Array(r.length);for(let i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return u.buffer};
 async function room(n){const u=(await allSounds()).reduce((a,s)=>a+(s.size||0),0);
  if(u+n>L.total)throw new Error('sound-pack limit reached ('+MB(L.total)+' in total). Delete sounds or packs first');
  try{const e=await navigator.storage.estimate();if(e.quota&&e.quota-e.usage<n*1.5)throw new Error('this device is almost out of browser storage')}catch(x){if(/almost/.test(x.message))throw x}}

 /* ---------- active pack -> pads ---------- */
 const act=()=>{try{return localStorage.getItem(AK)||''}catch(e){return ''}};
 const setAct=id=>{try{id?localStorage.setItem(AK,id):localStorage.removeItem(AK)}catch(e){msg('Couldn’t remember the active pack on this device.',1)}};
 async function applyActive(){let pk=null,ss=[];const id=act();
  try{if(id){pk=(await getPacks()).find(p=>p.id===id);if(pk)ss=await getSounds(id)}}catch(e){msg('Couldn’t read your sound packs: '+errMsg(e),1)}
  if(id&&!pk)setAct('');
  for(let i=0;i<16;i++){const m=pk&&pk.pads[i]&&ss.find(s=>s.id===pk.pads[i]);let v=null;
   if(m&&!m.missing){try{v={name:m.name.slice(0,16),buf:await buf(m.id)}}catch(e){v=null}}
   P.setPackPad(i,v)}}
 let applied=false;const first=()=>{if(applied||document.body.dataset.vp!=='dpads')return;applied=true;applyActive()};
 try{new MutationObserver(first).observe(document.body,{attributes:true,attributeFilter:['data-vp']});first()}catch(e){}

 /* ---------- UI state ---------- */
 const S={packs:[],pid:null,sounds:[],all:[],cat:'all',slot:-1,addCat:'perc',est:''};
 let root,box,body,stat,back,dlgCancel=null;
 const cur=()=>S.packs.find(p=>p.id===S.pid);
 function msg(m,err){if(stat){stat.textContent=m;stat.classList.toggle('spm-err',!!err)}if(!root||root.hidden)try{toast(m)}catch(e){}}
 function uniq(n,ex){let b=clean(n,L.name)||'My Pack',x=b,k=2;const used=s=>S.packs.some(p=>p.id!==ex&&p.name.toLowerCase()===s.toLowerCase());
  while(used(x))x=b.slice(0,L.name-4)+' ('+k++ +')';return x}
 function dlg(title,text,btns,input){return new Promise(res=>{const o=h('div','spm-dlg'),c=h('div','spm-card',null,{role:'alertdialog','aria-label':title});c.append(h('h3',null,title));if(text)c.append(h('p',null,text));
  let inp;if(input!=null){inp=h('input','spm-in',null,{maxlength:L.name,'aria-label':title});inp.value=input;c.append(inp)}
  const r=h('div','spm-row'),end=v=>{dlgCancel=null;o.remove();res(v)};
  btns.forEach(b=>r.append(btn(b[1],b[2],()=>end(b[0]==='no'?(inp?null:'no'):inp?inp.value:b[0]))));
  c.append(r);o.append(c);box.append(o);dlgCancel=()=>end(inp?null:'no');
  if(inp){inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();end(inp.value)}};inp.focus();inp.select()}else r.lastChild.focus()})}

 async function refresh(){try{S.packs=await getPacks();S.all=await allSounds();S.sounds=S.pid?S.all.filter(s=>s.pid===S.pid):[]}catch(e){msg('Couldn’t open your sound packs: '+errMsg(e),1)}
  if(S.pid&&!cur()){S.pid=null;S.sounds=[]}
  draw();try{const e=await navigator.storage.estimate(),p=navigator.storage.persisted&&await navigator.storage.persisted();S.est='Browser storage: '+MB(e.usage)+' used of about '+MB(e.quota)+(p?' · protected':' · may be cleared by the browser if space runs low');paint()}catch(e){}}
 function paint(){const f=body&&body.querySelector('.spm-es');if(f)f.textContent=S.est}

 function build(){if(root)return;root=h('div','spm');root.hidden=true;box=h('div','spm-box',null,{role:'dialog','aria-modal':'true','aria-label':'Sound Pack Manager',tabindex:'-1'});root.append(box);document.body.append(root);
  root.addEventListener('pointerdown',e=>{if(e.target===root&&!dlgCancel)close()});
  box.addEventListener('keyup',e=>e.stopPropagation());
  box.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();dlgCancel?dlgCancel():close();return}
   if(e.key==='Tab'){const f=[...box.querySelectorAll('button:not([disabled]),input,select')].filter(x=>x.offsetParent&&(!dlgCancel||x.closest('.spm-dlg')));if(!f.length)return;
    if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus()}}})}
 function openMgr(){build();back=document.activeElement;root.hidden=false;S.pid=null;S.slot=-1;refresh().then(()=>box.focus())}
 function close(){if(!root)return;root.hidden=true;P.stopAll();try{back&&back.focus()}catch(e){}}

 /* ---------- drawing ---------- */
 function draw(){if(!box)return;box.textContent='';
  const hd=h('div','spm-hd');hd.append(h('b',null,'SOUND PACKS'),btn('✕','spm-x',close,{'aria-label':'Close sound packs'}));
  body=h('div','spm-sc');stat=h('p','spm-st',stat?stat.textContent:'Everything you add is saved on this device only.',{role:'status','aria-live':'polite'});
  const used=S.all.reduce((a,s)=>a+(s.size||0),0),bar=h('div','spm-bar'+(used>L.total*.85?' hot':''));bar.append(h('i'));bar.firstChild.style.width=Math.min(100,used/L.total*100)+'%';
  const sr=h('div','spm-row');sr.append(h('span','spm-m','Pack storage: '+MB(used)+' of '+MB(L.total)+' · max '+L.packs+' packs, '+L.sounds+' sounds each, '+MB(L.file)+' and '+L.sec+' s per sound.'));
  const es=h('div','spm-m spm-es',S.est);
  const pb=btn('PROTECT STORAGE','',async()=>{try{const ok=await navigator.storage.persist();msg(ok?'Your browser will keep your sound packs unless you clear site data.':'The browser declined. Export a backup file to be safe.',!ok);refresh()}catch(e){msg('This browser can’t protect storage. Export a backup file to be safe.',1)}});
  body.append(stat,bar,sr,es);if(navigator.storage&&navigator.storage.persist)body.append(pb);
  S.pid&&cur()?drawPack():drawList();box.append(hd,body)}

 function drawList(){const r=h('div','spm-row');
  r.append(btn('+ NEW PACK','primary',newPack),btn('IMPORT PACK FILE','',()=>pick('.json,application/json',false,fs=>importCfg(fs[0]))));body.append(r);
  if(!S.packs.length)body.append(h('p','spm-m','No packs yet. Create one, add audio files, then assign them to the 16 performance pads.'));
  S.packs.forEach(p=>{const ss=S.all.filter(s=>s.pid===p.id),c=h('div','spm-card'+(act()===p.id?' act':'')),t=h('h3',null,p.name);
   if(act()===p.id)t.append(h('span','spm-tag','ON PADS'));c.append(t,h('div','spm-m',ss.length+' sounds · '+MB(ss.reduce((a,s)=>a+(s.size||0),0))+' · '+p.pads.filter(Boolean).length+' pads assigned'));
   const rr=h('div','spm-row');rr.append(btn('OPEN','primary',()=>{S.pid=p.id;S.slot=-1;S.cat='all';refresh()}));c.append(rr);body.append(c)})}

 function drawPack(){const pk=cur(),on=act()===pk.id,info=P.info(),top=h('div','spm-row');
  top.append(btn('← PACKS','',()=>{S.pid=null;refresh()}),h('b',null,pk.name));body.append(top);
  const r=h('div','spm-row');
  r.append(btn(on?'✓ ON PADS (tap to turn off)':'USE ON PADS',on?'on':'primary',async()=>{setAct(on?'':pk.id);await applyActive();msg(on?'Pads are back to their normal sounds.':'“'+pk.name+'” is now on your pads. Open DJ PADS and tap them.');draw()}),
   btn('RENAME','',renamePack),btn('EXPORT','',exportPack),btn('DELETE','danger',deletePack));body.append(r);
  body.append(h('div','spm-m',S.slot>=0?'Pad '+(S.slot+1)+' ('+info[S.slot].n+') selected. Tap ASSIGN on a sound below.':'Tap a pad slot, then ASSIGN a sound to it.'));
  const g=h('div','spm-slots',null,{role:'group','aria-label':'Pad assignments'});
  for(let i=0;i<16;i++){const m=S.sounds.find(s=>s.id===pk.pads[i]),s=h('button','spm-slot'+(m?' has':'')+(S.slot===i?' sel':''),null,{type:'button','aria-pressed':S.slot===i,'aria-label':'Pad '+(i+1)+' '+info[i].n+': '+(m?m.name+(m.missing?' (file missing)':''):'empty')});
   s.append(h('b',null,(i+1)+' '+info[i].n),h('span',null,m?(m.missing?'⚠ '+m.name:m.name):'empty'));s.onclick=()=>{S.slot=S.slot===i?-1:i;draw()};g.append(s)}
  body.append(g);
  if(S.slot>=0&&pk.pads[S.slot])body.append(btn('UNASSIGN PAD '+(S.slot+1),'',()=>assign(S.slot,null)));
  const fr=h('div','spm-row');fr.append(btn('ALL ('+S.sounds.length+')',S.cat==='all'?'on':'',()=>{S.cat='all';draw()}));
  CATS.forEach(c=>fr.append(btn(c[1]+' ('+S.sounds.filter(s=>s.cat===c[0]).length+')',S.cat===c[0]?'on':'',()=>{S.cat=c[0];draw()})));body.append(fr);
  const ar=h('div','spm-row'),sel=h('select',null,null,{'aria-label':'Category for new sounds'});CATS.forEach(c=>sel.append(new Option(c[1],c[0])));sel.value=S.addCat;sel.onchange=()=>{S.addCat=sel.value};
  ar.append(h('span','spm-m','Add as'),sel,btn('+ ADD AUDIO FILES','primary',()=>pick('audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.flac',true,addFiles)));body.append(ar);
  const list=S.sounds.filter(s=>S.cat==='all'||s.cat===S.cat);
  if(!list.length)body.append(h('p','spm-m',S.sounds.length?'No sounds in this category.':'No sounds yet. Add WAV, MP3, M4A, OGG or FLAC files (your own or ones you may use).'));
  list.forEach(m=>{const row=h('div','spm-snd'),nm=h('span','nm',m.name);if(m.missing)nm.append(h('span','spm-tag w','FILE MISSING'));
   const cs=h('select',null,null,{'aria-label':'Category of '+m.name});CATS.forEach(c=>cs.append(new Option(c[1],c[0])));cs.value=m.cat;cs.onchange=async()=>{m.cat=cs.value;try{await putSound(m);draw()}catch(e){msg('Couldn’t save: '+errMsg(e),1)}};
   row.append(nm,h('span','spm-m',m.missing?'—':m.dur.toFixed(1)+' s · '+MB(m.size)),cs);
   if(m.missing)row.append(btn('ATTACH FILE','',()=>pick('audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.flac',false,fs=>attach(m,fs[0]))));
   else row.append(btn('▶','',async()=>{try{P.preview(await buf(m.id))}catch(e){msg('Couldn’t play “'+m.name+'”: the saved audio is missing or damaged. Attach the file again.',1)}},{'aria-label':'Preview '+m.name}),
    btn('ASSIGN','primary',()=>assign(S.slot,m.id),S.slot<0?{disabled:'',title:'Select a pad slot first'}:{}));
   row.append(btn('RENAME','',()=>renameSound(m)),btn('✕','danger',()=>deleteSound(m),{'aria-label':'Delete '+m.name}));body.append(row)})}

 /* ---------- actions ---------- */
 function pick(accept,multi,fn){const i=h('input',null,null,{type:'file',accept});i.multiple=!!multi;i.hidden=true;box.append(i);i.onchange=()=>{const f=[...i.files];i.remove();if(f.length)fn(f)};i.oncancel=()=>i.remove();i.click()}
 async function newPack(){if(S.packs.length>=L.packs)return msg('You have '+L.packs+' packs, the maximum. Delete or export one first.',1);
  const n=await dlg('New sound pack','Give your pack a name (up to '+L.name+' letters).',[['no','Cancel'],['ok','Create','primary']],'My Pack');if(n==null)return;
  const nm=clean(n,L.name);if(!nm)return msg('A pack needs a name.',1);
  const pk={id:uid(),name:uniq(nm),created:Date.now(),updated:Date.now(),pads:Array(16).fill(null)};
  try{await putPack(pk);S.pid=pk.id;msg('Created “'+pk.name+'”. Add some audio files.');refresh()}catch(e){msg('Couldn’t save the pack: '+errMsg(e),1)}}
 async function renamePack(){const pk=cur(),n=await dlg('Rename pack',null,[['no','Cancel'],['ok','Save','primary']],pk.name);if(n==null)return;const nm=clean(n,L.name);
  if(!nm)return msg('A pack needs a name.',1);if(S.packs.some(p=>p.id!==pk.id&&p.name.toLowerCase()===nm.toLowerCase()))return msg('You already have a pack called “'+nm+'”.',1);
  const old=pk.name;pk.name=nm;try{await putPack(pk);msg('Renamed to “'+nm+'”.');draw()}catch(e){pk.name=old;msg('Couldn’t rename: '+errMsg(e),1)}}
 async function renameSound(m){const n=await dlg('Rename sound',null,[['no','Cancel'],['ok','Save','primary']],m.name);if(n==null)return;const nm=clean(n,L.name);if(!nm)return msg('A sound needs a name.',1);
  const old=m.name;m.name=nm;try{await putSound(m);if(act()===S.pid)applyActive();draw()}catch(e){m.name=old;msg('Couldn’t rename: '+errMsg(e),1)}}
 async function deletePack(){const pk=cur(),n=S.sounds.length;
  for(;;){const a=await dlg('Delete “'+pk.name+'”?','This permanently deletes the pack and its '+n+' sound'+(n===1?'':'s')+' from this device. It can’t be undone. Export a backup first if you might want it back.',[['no','Cancel'],['exp','Export backup first'],['del','Delete pack','danger']]);
   if(a==='exp'){await exportPack();continue}if(a!=='del')return;break}
  try{await delPack(pk.id);S.sounds.forEach(s=>bufs.delete(s.id));if(act()===pk.id){setAct('');await applyActive()}S.pid=null;msg('Deleted “'+pk.name+'”.');refresh()}catch(e){msg('Couldn’t delete: '+errMsg(e),1)}}
 async function deleteSound(m){const a=await dlg('Delete “'+m.name+'”?','It will be removed from this pack and from any pad it is assigned to. This can’t be undone.',[['no','Cancel'],['del','Delete sound','danger']]);if(a!=='del')return;
  try{await delSound(m.id,cur());bufs.delete(m.id);if(act()===S.pid)await applyActive();msg('Deleted “'+m.name+'”.');refresh()}catch(e){msg('Couldn’t delete: '+errMsg(e),1)}}
 async function assign(i,sid){const pk=cur();if(i<0||!pk)return;const old=pk.pads[i];pk.pads[i]=sid;
  try{await putPack(pk);if(act()===pk.id)await applyActive();msg(sid?'Assigned to pad '+(i+1)+'.':'Pad '+(i+1)+' is empty again.');draw()}catch(e){pk.pads[i]=old;msg('Couldn’t save the assignment: '+errMsg(e),1)}}
 async function addFiles(fl){const pk=cur();if(!pk)return;let ok=0;const bad=[];
  for(const f of fl){const nm=f.name.slice(0,28);
   try{if(S.sounds.length>=L.sounds)throw new Error('this pack is full ('+L.sounds+' sounds)');
    if(!/^audio\//.test(f.type)&&!/\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|webm|mp4)$/i.test(f.name))throw new Error('not an audio file (use WAV, MP3, M4A, OGG or FLAC)');
    if(f.size>L.file)throw new Error(MB(f.size)+' is over the '+MB(L.file)+' limit');
    const b=await f.arrayBuffer(),v=await vet(b);await room(b.byteLength);
    const m={id:uid(),pid:pk.id,name:clean(f.name.replace(/\.[^.]+$/,''),L.name)||'sound',cat:S.addCat,mime:f.type||'',size:b.byteLength,dur:v.dur};
    await putSound(m,b);S.sounds.push(m);S.all.push(m);bufs.set(m.id,v.x);ok++}
   catch(e){bad.push(nm+': '+errMsg(e))}}
  msg((ok?'Added '+ok+' sound'+(ok>1?'s':'')+'. ':'')+(bad.length?'Skipped '+bad.length+': '+bad.slice(0,3).join('; ')+(bad.length>3?'…':''):''),!ok);refresh()}
 async function attach(m,f){try{if(f.size>L.file)throw new Error(MB(f.size)+' is over the '+MB(L.file)+' limit');const b=await f.arrayBuffer(),v=await vet(b);await room(b.byteLength);
  m.size=b.byteLength;m.dur=v.dur;m.mime=f.type||m.mime;m.missing=false;await putSound(m,b);bufs.set(m.id,v.x);if(act()===S.pid)await applyActive();msg('Attached “'+f.name.slice(0,28)+'” to “'+m.name+'”.');refresh()}
  catch(e){m.missing=true;msg('Couldn’t attach that file: '+errMsg(e),1)}}

 /* ---------- export / import ---------- */
 async function exportPack(){const pk=cur();if(!pk)return;
  const a=await dlg('Export “'+pk.name+'”','“With audio” makes one self-contained backup file (about '+MB(S.sounds.reduce((x,s)=>x+(s.size||0)*1.34,0))+'). “Settings only” is tiny, but the audio files must be attached again after importing.',[['no','Cancel'],['set','Settings only'],['full','With audio','primary']]);if(a==='no')return;
  try{const parts=['{"format":"yaps-soundpack","version":1,"app":"YAPS DJ Studio","exported":'+Date.now()+',"packs":[{"name":'+JSON.stringify(pk.name)+',"pads":'+JSON.stringify(pk.pads)+',"sounds":['];let n=0;
   for(const s of S.sounds){let data=null;if(a==='full'&&!s.missing){try{data=b64(await getAudio(s.id))}catch(e){}}
    parts.push((n++?',':'')+JSON.stringify({id:s.id,name:s.name,cat:s.cat,mime:s.mime,dur:s.dur,size:s.size,data}))}
   parts.push(']}]}');const url=URL.createObjectURL(new Blob(parts,{type:'application/json'})),l=h('a',null,null,{href:url,download:(pk.name.replace(/[^\w.-]+/g,'_')||'pack')+'.yapspack.json'});
   document.body.append(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);msg('Exported “'+pk.name+'”'+(a==='full'?' with audio.':' (settings only).'))}
  catch(e){msg('Couldn’t export: '+errMsg(e),1)}}
 async function importOne(q){if(!q||typeof q!=='object')throw new Error('not a pack');
  const pk={id:uid(),name:uniq(clean(q.name,L.name)||'Imported pack'),created:Date.now(),updated:Date.now(),pads:Array(16).fill(null)},map=Object.create(null),items=[];let need=0,tot=0;
  for(const s of(Array.isArray(q.sounds)?q.sounds:[]).slice(0,L.sounds)){if(!s||typeof s!=='object')continue;
   const m={id:uid(),pid:pk.id,name:clean(s.name,L.name)||'sound',cat:CN[s.cat]?s.cat:'other',mime:clean(s.mime,60),size:0,dur:Math.min(Math.max(+s.dur||0,0),L.sec),missing:true};let b=null;
   if(typeof s.data==='string'&&s.data){try{b=unb64(s.data);if(b.byteLength>L.file)throw 0;m.dur=(await vet(b)).dur;m.size=b.byteLength;m.missing=false}catch(e){b=null}}
   if(m.missing)need++;else tot+=m.size;if(typeof s.id==='string')map[s.id]=m.id;items.push([m,b])}
  if(Array.isArray(q.pads))for(let i=0;i<16;i++){const k=q.pads[i];if(typeof k==='string'&&map[k])pk.pads[i]=map[k]}
  await room(tot);
  await run(['packs','sounds','audio'],'readwrite',t=>{t.objectStore('packs').put(pk);items.forEach(([m,b])=>{t.objectStore('sounds').put(m);if(b)t.objectStore('audio').put({id:m.id,b})})});
  S.packs.push(pk);return{pk,n:items.length,need}}
 async function importCfg(f){if(!f)return;if(f.size>L.imp)return msg('That file is '+MB(f.size)+'. Pack files up to '+MB(L.imp)+' can be imported.',1);
  let o;try{o=JSON.parse(await f.text())}catch(e){return msg('That file isn’t valid, so nothing was imported.',1)}
  if(!o||o.format!=='yaps-soundpack'||!Array.isArray(o.packs))return msg('That isn’t a YAPS sound-pack file, so nothing was imported.',1);
  if(o.version!==1)return msg('That pack file comes from a different version of YAPS DJ Studio, so nothing was imported.',1);
  const out=[];for(const q of o.packs.slice(0,L.packs)){if(S.packs.length>=L.packs){out.push('pack limit reached');break}
   try{const r=await importOne(q);out.push('“'+r.pk.name+'” ('+r.n+' sounds'+(r.need?', '+r.need+' need their audio attached':'')+')')}catch(e){out.push('one pack failed: '+errMsg(e))}}
  msg(out.length?'Imported '+out.join('; ')+'. Your existing packs were not changed.':'That file has no packs.',!out.length);refresh()}

 const pb=document.getElementById('dpPacks');if(pb)pb.onclick=openMgr;
 window.yapsPacks={open:openMgr,active:act};
})();

/* ===== UGANDAN CELEBRATION MODE =====
   Pads are synthesized live (no files). Library tracks + voice clips are the DJ's own audio, kept on this device in IndexedDB
   "yaps_celebration_v1". Everything plays through the studio master (metered + recorded) except text-to-speech, which the browser
   speaks directly. Texts are shown with textContent only. */
(function(){
 const R=document.getElementById('celeb');if(!R)return;
 const $=id=>document.getElementById(id),body=$('ceBody'),st=$('ceSt'),box=$('ceBox'),onB=$('ceOn');
 const h=(t,c,x,a)=>{const n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;if(a)for(const k in a)n.setAttribute(k,a[k]);return n};
 const btn=(x,c,f,a)=>{const b=h('button','sm'+(c?' '+c:''),x,a);b.type='button';b.onclick=f;return b};
 const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}};
 const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8),MB=n=>(n/1048576).toFixed(1)+' MB';
 const err=e=>e&&e.name==='QuotaExceededError'?'browser storage is full':(e&&e.message)||'unknown error';
 const say=(m,bad)=>{st.textContent=m;st.classList.toggle('err',!!bad)};
 const L={file:83886080,total:419430400,rec:30};
 let on=ls('yaps_celeb_on')==='1',tab='pads',cat='all',vol=.8,bus,act=[],nb;
 /* ---------- audio core ---------- */
 const ctx=()=>{init();if(!bus||bus.context!==C){bus=C.createGain();bus.connect(master)}bus.gain.value=vol*vol*1.2;return C};
 const noiseB=()=>{if(nb&&nb.c===C)return nb.b;const n=C.sampleRate*2,b=C.createBuffer(1,n,C.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;nb={c:C,b};return b};
 function voice(d){const g=C.createGain();g.connect(bus);const v={g,s:[]};act.push(v);setTimeout(()=>{try{g.disconnect()}catch(e){}act=act.filter(x=>x!==v)},(d+.6)*1e3);return v}
 const T=(v,ty,f0,f1,d,pk,t,a)=>{const o=C.createOscillator(),e=C.createGain();o.type=ty;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+d*.6);e.gain.setValueAtTime(.0001,t);e.gain.linearRampToValueAtTime(pk,t+(a||.004));e.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(e);e.connect(v.g);o.start(t);o.stop(t+d+.02);v.s.push(o);return o};
 const N=(v,ty,f,f1,q,d,pk,t,a)=>{const s=C.createBufferSource(),b=C.createBiquadFilter(),e=C.createGain();s.buffer=noiseB();s.loop=true;b.type=ty;b.Q.value=q;b.frequency.setValueAtTime(f,t);if(f1!==f)b.frequency.exponentialRampToValueAtTime(f1,t+d);e.gain.setValueAtTime(.0001,t);e.gain.linearRampToValueAtTime(pk,t+(a||.003));e.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(b);b.connect(e);e.connect(v.g);s.start(t,Math.random()*1.5);s.stop(t+d+.02);v.s.push(s)};
 const drum=(v,t,f,d,pk)=>{T(v,'sine',f*1.5,f,d,pk||1.2,t);T(v,'triangle',f*3,f*1.6,.1,.45,t);N(v,'bandpass',900,900,1,.03,.4,t)};
 const clap=(v,t)=>{[0,.011,.023].forEach(o=>N(v,'bandpass',1300,1300,1.4,.026,2,t+o));N(v,'bandpass',1250,1000,1.1,.2,1.8,t+.034)};
 const whistle=(v,t,d,vib)=>{const o=T(v,'sine',2100,2800,d,.6,t,.04),l=C.createOscillator(),lg=C.createGain();l.frequency.value=vib;lg.gain.value=60;l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+d+.05);v.s.push(l)};
 const rnd=(a,b)=>a+Math.random()*(b-a);
 const PADS=[
  ['drum','DRUM LOW',(v,t)=>drum(v,t,95,.8)],['drum','DRUM MID',(v,t)=>drum(v,t,150,.55)],['drum','DRUM HIGH',(v,t)=>drum(v,t,240,.35)],
  ['drum','DRUM ROLL',(v,t)=>{for(let i=0;i<16;i++)drum(v,t+i*(.13-i*.004),150+i*6,.25,.5+i*.04)}],
  ['drum','DRUM PATTERN',(v,t)=>[[0,95],[.25,240],[.375,240],[.625,150],[.75,95],[1,240],[1.125,150],[1.375,95]].forEach(a=>drum(v,t+a[0]*.7,a[1],.4))],
  ['perc','AGOGO BELL',(v,t)=>{T(v,'sine',540,540,.4,.7,t);T(v,'sine',812,812,.3,.5,t);T(v,'square',1600,1600,.03,.2,t)}],
  ['perc','RATTLE',(v,t)=>{for(let i=0;i<7;i++)N(v,'highpass',6000,6000,.8,.06,.9,t+i*.055)}],
  ['perc','WOOD TICK',(v,t)=>{T(v,'square',1800,1500,.05,.5,t);T(v,'sine',900,700,.08,.5,t)}],
  ['shk','SHAKER',(v,t)=>N(v,'bandpass',7000,7000,.9,.18,1.1,t,.045)],
  ['shk','LONG SHAKE',(v,t)=>{for(let i=0;i<6;i++)N(v,'bandpass',7000,7000,.9,.14,1,t+i*.16,.04)}],
  ['clap','CLAP',clap],['clap','DOUBLE CLAP',(v,t)=>{clap(v,t);clap(v,t+.1)}],
  ['clap','CROWD CLAP',(v,t)=>{for(let i=0;i<30;i++)N(v,'bandpass',rnd(1000,2200),1200,1.2,.05,rnd(.6,1.6),t+i*.07+rnd(0,.05))}],
  ['whs','WHISTLE',(v,t)=>whistle(v,t,.8,7)],['whs','LONG WHISTLE',(v,t)=>whistle(v,t,1.6,6)],['whs','TRILL WHISTLE',(v,t)=>whistle(v,t,1,26)],
  ['crowd','ULULATION',(v,t)=>{const o=T(v,'sine',1150,1250,1.7,.5,t,.12),l=C.createOscillator(),lg=C.createGain();l.frequency.value=8;lg.gain.value=380;l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+1.8);v.s.push(l);T(v,'sine',2300,2500,1.5,.15,t,.12)}],
  ['crowd','CHEER',(v,t)=>{N(v,'bandpass',900,1600,1.1,2.2,2.4,t,.4);N(v,'bandpass',2200,2200,.9,2,1.2,t,.4)}],
  ['crowd','APPLAUSE',(v,t)=>{for(let i=0;i<70;i++)N(v,'bandpass',rnd(1500,3200),2000,.8,.06,rnd(.5,1.2),t+i*.04+rnd(0,.04))}],
  ['fx','AIR HORN',(v,t)=>{[440,554,659].forEach(f=>T(v,'sawtooth',f,f,1,.28,t,.02))}],
  ['fx','RISER',(v,t)=>N(v,'bandpass',300,6000,3,2,1.6,t,1.6)],
  ['fx','IMPACT',(v,t)=>{drum(v,t,60,1.2,1.6);N(v,'lowpass',2500,200,.8,.9,1.2,t)}],
  ['fx','CHIME',(v,t)=>{[1319,1760,2349].forEach((f,i)=>T(v,'sine',f,f,1.3,.4,t+i*.06))}]];
 /* ---------- pad layout: your own samples, custom categories, saved arrangements ---------- */
 const PK='yaps_celeb_pads_v1',SK='yaps_celeb_samples_v1',LK='yaps_celeb_layouts_v1';
 const DEFC=[['drum','Drums'],['perc','Percussion'],['shk','Shakers'],['clap','Claps'],['whs','Whistles'],['crowd','Crowd'],['fx','Effects']],PAL=['255,150,60','170,120,255','120,220,140','255,196,77','80,200,255','255,79,163','190,150,255','255,120,120'];
 const jp=(k,d)=>{try{const v=JSON.parse(ls(k));return v==null?d:v}catch(e){return d}};
 const defCfg=()=>({cats:DEFC.map(c=>c.slice()),pads:PADS.map((p,i)=>({id:'b'+i,bi:i,name:p[1],cat:p[0],s:null}))});
 const okCfg=c=>c&&Array.isArray(c.cats)&&c.cats.length&&Array.isArray(c.pads)&&c.pads.every(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&c.cats.some(k=>k[0]===p.cat));
 let pc=jp(PK,null);if(!okCfg(pc))pc=defCfg();let smp=jp(SK,[]),lay=jp(LK,[]),edit=false,ep='';
 const sv=(k,v)=>{if(ls(k,JSON.stringify(v))===null)say('Couldn’t save to this device (storage full or blocked).',1)};
 const sb=new Map(),clone=o=>JSON.parse(JSON.stringify(o));
 async function sbuf(id){if(sb.has(id))return sb.get(id);const ab=await getA('s_'+id);if(!ab)throw new Error('the saved sample is missing, so assign audio to this pad again');const b=await ctx().decodeAudioData(ab.slice(0));sb.set(id,b);return b}
 function hit(p,b){if(!on)return say('Turn Celebration Mode on first.',1);
  try{ctx();const fl=()=>{if(b){b.classList.add('hit');setTimeout(()=>b.classList.remove('hit'),130)}};
   const go=async()=>{if(p.s){try{const bf=await sbuf(p.s),v=voice(bf.duration),s=C.createBufferSource();s.buffer=bf;s.connect(v.g);v.s.push(s);s.start();fl()}catch(e){say('“'+p.name+'”: '+err(e),1)}}
    else if(p.bi!=null&&PADS[p.bi]){PADS[p.bi][2](voice(3),C.currentTime+.004);fl()}
    else say('“'+p.name+'” has no sound yet. Tap EDIT PADS, tap this pad, then assign your own audio.',1)};
   C.state==='running'?go():C.resume().then(go)}catch(e){say('Audio could not start: '+err(e),1)}}
 async function addSample(f){if(smp.length>=60)throw new Error('you have 60 samples, the maximum. Delete some first');if(!AUD.test(f.type)&&!AUD.test(f.name))throw new Error('not an audio file (use WAV, MP3, M4A, OGG or FLAC)');if(f.size>10485760)throw new Error(MB(f.size)+' is over the 10 MB limit');
  const ab=await f.arrayBuffer();let d;try{d=await ctx().decodeAudioData(ab.slice(0))}catch(e){throw new Error('this browser can’t decode that file')}if(d.duration>20)throw new Error('it is '+d.duration.toFixed(1)+' s long (pads allow up to 20 s)');
  const m={id:uid(),name:f.name.replace(/\.[^.]+$/,'').slice(0,24),size:ab.byteLength,dur:d.duration};await putA('s_'+m.id,ab);smp.push(m);sb.set(m.id,d);sv(SK,smp);return m}
 function drawPads(){const cs=pc.cats,r=h('div','ce-tabs');[['all','ALL']].concat(cs).forEach(c=>r.append(btn(c[1],cat===c[0]?'on':'',()=>{cat=c[0];draw()})));body.append(r);
  const g=h('div','ce-g'),tg=p=>{if(edit){ep=ep===p.id?'':p.id;draw()}};
  pc.pads.forEach(p=>{if(cat!=='all'&&p.cat!==cat)return;const b=h('button','cp'+(edit&&ep===p.id?' sel':''),p.name+(p.s?' ♪':''),{type:'button','aria-label':p.name+' pad'});b.style.setProperty('--dc',PAL[Math.max(0,cs.findIndex(c=>c[0]===p.cat))%8]);
   b.onpointerdown=e=>{e.preventDefault();edit?tg(p):hit(p,b)};b.onclick=e=>{if(e.detail===0)edit?tg(p):hit(p,b)};g.append(b)});body.append(g);
  const t=h('div','ce-row');t.append(btn(edit?'✓ DONE EDITING':'✎ EDIT PADS',edit?'on':'',()=>{edit=!edit;ep='';draw()}));
  if(edit)t.append(btn('+ PAD','',()=>{const p={id:'c'+uid(),bi:null,name:'NEW PAD',cat:cat!=='all'?cat:cs[0][0],s:null};pc.pads.push(p);ep=p.id;sv(PK,pc);draw()}),btn('+ CATEGORY','',()=>{const n=(prompt('Category name (e.g. Choir, Dance calls, Village drums)')||'').trim().slice(0,20);if(!n)return;cs.push(['k'+uid(),n]);sv(PK,pc);draw()}));
  body.append(t);
  if(edit){const cr=h('div','ce-row');cr.append(h('span','ce-m','Categories:'));cs.forEach(c=>cr.append(btn('✎ '+c[1],'',()=>{const n=(prompt('Rename category',c[1])||'').trim().slice(0,20);if(!n)return;c[1]=n;sv(PK,pc);draw()}),
    btn('✕','',()=>{if(cs.length<2)return say('Keep at least one category.',1);const to=cs.find(x=>x!==c);if(!confirm('Delete category “'+c[1]+'”? Its pads move to “'+to[1]+'”.'))return;pc.pads.forEach(p=>{if(p.cat===c[0])p.cat=to[0]});pc.cats=cs.filter(x=>x!==c);if(cat===c[0])cat='all';sv(PK,pc);draw()},{'aria-label':'Delete category '+c[1]})));body.append(cr);
   const sp=pc.pads.find(x=>x.id===ep);if(sp)drawEd(sp)}
  drawLay();body.append(h('p','ce-m','Starter sounds are generic and made in your browser. Every community has its own music: rename, regroup or replace any pad with your own audio. Only use audio you own, have licensed or have permission to play.'))}
 function drawEd(p){const e=h('div','ce-ed'),n=h('input',null,null,{type:'text',maxlength:16,'aria-label':'Pad name'}),cs=h('select',null,null,{'aria-label':'Pad category'}),ss=h('select',null,null,{'aria-label':'My samples'});
  n.value=p.name;n.onchange=()=>{p.name=n.value.trim().slice(0,16)||p.name;sv(PK,pc);draw()};pc.cats.forEach(c=>cs.append(new Option(c[1],c[0])));cs.value=p.cat;cs.onchange=()=>{p.cat=cs.value;sv(PK,pc);draw()};
  ss.append(new Option('My samples…',''));smp.forEach(m=>ss.append(new Option(m.name+' ('+m.dur.toFixed(1)+' s)',m.id)));ss.value=p.s||'';ss.onchange=()=>{p.s=ss.value||null;sv(PK,pc);draw()};
  const r=h('div','ce-row');r.append(n,cs,ss);const r2=h('div','ce-row');
  r2.append(btn('⬆ ASSIGN MY AUDIO','on',()=>pick(false,async f=>{try{const m=await addSample(f[0]);p.s=m.id;sv(PK,pc);say('Assigned “'+m.name+'” to “'+p.name+'”.');draw()}catch(x){say('Couldn’t add that file: '+err(x),1)}})),btn('▶ TEST','',()=>hit(p)));
  if(p.s)r2.append(btn(p.bi!=null?'USE STARTER SOUND':'REMOVE AUDIO','',()=>{p.s=null;sv(PK,pc);draw()}),btn('DELETE SAMPLE','',async()=>{if(!confirm('Delete this sample from your device? Pads and saved arrangements using it will go quiet.'))return;const id=p.s;
   try{await run('audio','readwrite',t=>{t.objectStore('audio').delete('s_'+id)});smp=smp.filter(m=>m.id!==id);sb.delete(id);pc.pads.forEach(x=>{if(x.s===id)x.s=null});sv(SK,smp);sv(PK,pc);draw()}catch(x){say('Couldn’t delete: '+err(x),1)}}));
  r2.append(btn('DELETE PAD','',()=>{if(!confirm('Delete the pad “'+p.name+'”? Its audio sample is kept.'))return;pc.pads=pc.pads.filter(x=>x!==p);ep='';sv(PK,pc);draw()}));e.append(r,r2);body.append(e)}
 function drawLay(){const r=h('div','ce-row'),s=h('select',null,null,{'aria-label':'Saved pad arrangements'});s.append(new Option('Saved arrangements…',''));lay.forEach(l=>s.append(new Option(l.name,l.id)));const cur=()=>lay.find(l=>l.id===s.value);
  r.append(s,btn('LOAD','',()=>{const l=cur();if(!l)return say('Choose a saved arrangement first.',1);if(!okCfg(l.cfg))return say('That saved arrangement is damaged.',1);pc=clone(l.cfg);const miss=pc.pads.filter(p=>p.s&&!smp.some(m=>m.id===p.s));miss.forEach(p=>p.s=null);cat='all';ep='';sv(PK,pc);say('Loaded “'+l.name+'”.'+(miss.length?' '+miss.length+' pad(s) lost a deleted sample.':''));draw()}),
   btn('SAVE AS NEW','on',()=>{if(lay.length>=12)return say('You have 12 saved arrangements, the maximum. Delete one first.',1);const n=(prompt('Name this arrangement (e.g. Wedding, Introduction, Club night)')||'').trim().slice(0,30);if(!n)return;lay.push({id:uid(),name:n,cfg:clone(pc)});sv(LK,lay);say('Saved arrangement “'+n+'”.');draw()}),
   btn('UPDATE','',()=>{const l=cur();if(!l)return say('Choose an arrangement to overwrite first.',1);if(!confirm('Overwrite “'+l.name+'” with the pads as they are now?'))return;l.cfg=clone(pc);sv(LK,lay);say('Updated “'+l.name+'”.')}),
   btn('DELETE','',()=>{const l=cur();if(!l)return say('Choose an arrangement first.',1);if(!confirm('Delete the saved arrangement “'+l.name+'”? Your pads and samples are kept.'))return;lay=lay.filter(x=>x!==l);sv(LK,lay);draw()}),
   btn('RESET STARTER PADS','',()=>{if(!confirm('Reset all pads to the starter set? The current arrangement is replaced (saved arrangements and samples are kept).'))return;pc=defCfg();cat='all';ep='';sv(PK,pc);draw()}));body.append(r)}
 function stopAll(){act.forEach(v=>{try{const n=C.currentTime;v.g.gain.cancelScheduledValues(n);v.g.gain.setValueAtTime(v.g.gain.value,n);v.g.gain.linearRampToValueAtTime(0,n+.03);v.s.forEach(s=>{try{s.stop(n+.05)}catch(e){}})}catch(e){}});act=[];try{speechSynthesis.cancel()}catch(e){}if(rec)recStop();EL.forEach(a=>a.pause());clearTimeout(fadeT);duck(0)}
 /* ---------- storage ---------- */
 const open=()=>new Promise((ok,no)=>{if(!window.indexedDB)return no(new Error('this browser has no local database'));let r;try{r=indexedDB.open('yaps_celebration_v1',1)}catch(e){return no(e)}r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('tracks',{keyPath:'id'});d.createObjectStore('audio',{keyPath:'id'});d.createObjectStore('lists',{keyPath:'id'})};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
 async function run(names,mode,fn){const d=await open();return new Promise((ok,no)=>{let out;const t=d.transaction(names,mode);t.oncomplete=()=>{d.close();ok(out)};t.onabort=()=>{d.close();no(t.error||new Error('storage failed'))};try{fn(t,v=>out=v)}catch(e){try{t.abort()}catch(x){}}})}
 const all=s=>run(s,'readonly',(t,o)=>{t.objectStore(s).getAll().onsuccess=e=>o(e.target.result)});
 const getA=id=>run('audio','readonly',(t,o)=>{t.objectStore('audio').get(id).onsuccess=e=>o(e.target.result&&e.target.result.b)});
 const putA=(id,b)=>run('audio','readwrite',t=>{t.objectStore('audio').put({id,b})});
 const putL=l=>run('lists','readwrite',t=>{t.objectStore('lists').put(l)});
 let tracks=[],lists=[],pl='',q=[],qi=-1;
 /* ---------- library player: two decks so tracks can crossfade (through the studio master) ---------- */
 const EL=[new Audio(),new Audio()],gn=[null,null],urls=['',''];EL.forEach(a=>a.preload='auto');let au=EL[0],ci=0,dg,fadeT=0,fadeS=4,riser=false;
 function route(){ctx();if(dg)return;dg=C.createGain();dg.connect(master);EL.forEach((a,k)=>{const s=C.createMediaElementSource(a);gn[k]=C.createGain();s.connect(gn[k]);gn[k].connect(dg)})}
 function duck(on){try{if(dg)dg.gain.setTargetAtTime(on?.25:1,C.currentTime,.08)}catch(e){}}
 async function playT(i,fade){if(!on)return say('Turn Celebration Mode on first.',1);const m=tracks.find(x=>x.id===q[i]);if(!m)return say('That track is no longer in your library.',1);
  try{const b=await getA(m.id);if(!b)throw new Error('the saved audio file is missing. Delete it and import it again');route();await C.resume();
   const x=fade&&!au.paused&&au.currentTime>0?1-ci:ci,o=EL[x],n=C.currentTime;if(urls[x])URL.revokeObjectURL(urls[x]);urls[x]=URL.createObjectURL(new Blob([b],{type:m.mime||'audio/mpeg'}));o.src=urls[x];
   gn[x].gain.cancelScheduledValues(n);
   if(x!==ci){const od=ci,oe=EL[od];gn[x].gain.setValueAtTime(0,n);gn[x].gain.linearRampToValueAtTime(1,n+fade);gn[od].gain.cancelScheduledValues(n);gn[od].gain.setValueAtTime(gn[od].gain.value,n);gn[od].gain.linearRampToValueAtTime(0,n+fade);clearTimeout(fadeT);fadeT=setTimeout(()=>oe.pause(),fade*1e3+150)}
   else gn[x].gain.setValueAtTime(1,n);
   ci=x;au=o;qi=i;await o.play();say((x!==ci||fade?'Crossfading to “':'Playing “')+m.name+'”.');drawNow()}
  catch(e){say('Couldn’t play “'+m.name+'”: '+err(e),1)}}
 EL.forEach(a=>{a.onended=()=>{if(a!==au)return;if(qi+1<q.length)playT(qi+1);else{qi=-1;drawNow()}};a.onerror=()=>{if(a===au&&a.src&&a.src!==location.href)say('That file couldn’t be played. It may be damaged or in a format this browser can’t decode.',1)}});
 const rise=()=>{try{ctx();const i=PADS.findIndex(p=>p[1]==='RISER');PADS[i][2](voice(3),C.currentTime+.004)}catch(e){}};
 function xfade(k){if(!on)return say('Turn Celebration Mode on first.',1);
  if(k==='next'){if(qi<0||qi+1>=q.length)return say('There is no next track in the queue.',1);if(riser)rise();return playT(qi+1,fadeS)}
  const lst=lists.find(l=>l.id===pl),base=lst?lst.ids.map(id=>tracks.find(t=>t.id===id)).filter(Boolean):tracks,cur=q[qi],nm=(kinds.find(x=>x[0]===k)||[0,k])[1];
  let pool=base.filter(t=>t.kind===k&&t.id!==cur);if(!pool.length)pool=tracks.filter(t=>t.kind===k&&t.id!==cur);
  if(!pool.length)return say('No “'+nm+'” tracks yet. Import some in MY MUSIC.',1);
  q=pool.sort(()=>Math.random()-.5).map(t=>t.id);if(riser)rise();playT(0,fadeS);say('Fading to '+nm+' over '+fadeS+' s.')}
 function drawBar(){const b=$('ceBar');b.textContent='';const r=h('div','ce-row');r.append(h('span','ce-m','PLAYLISTS:'));if(!lists.length)r.append(h('span','ce-m','none yet (make one in MY MUSIC)'));
  lists.forEach(l=>r.append(btn('▶ '+l.name,'',()=>{q=l.ids.filter(id=>tracks.some(t=>t.id===id));if(!q.length)return say('“'+l.name+'” is empty.',1);playT(0,fadeS)})));
  const r2=h('div','ce-row'),fs=h('select',null,null,{'aria-label':'Crossfade length'});[2,4,8,12].forEach(s=>fs.append(new Option('Fade '+s+' s',s)));fs.value=fadeS;fs.onchange=()=>fadeS=+fs.value;
  const rs=h('label','ce-m'),ck=h('input',null,null,{type:'checkbox'});ck.checked=riser;ck.onchange=()=>riser=ck.checked;rs.append(ck,' riser sweep');
  r2.append(h('span','ce-m','FADE TO:'),fs);kinds.forEach(k=>r2.append(btn('→ '+k[1],'',()=>xfade(k[0]))));r2.append(btn('→ NEXT','',()=>xfade('next')),rs);b.append(r,r2)}
 const fmt=s=>isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
 const probe=f=>new Promise((ok,no)=>{const a=new Audio(),u=URL.createObjectURL(f),d=()=>URL.revokeObjectURL(u);a.preload='metadata';a.onloadedmetadata=()=>{d();a.duration>0?ok(a.duration):no(new Error('no audio found'))};a.onerror=()=>{d();no(new Error('unsupported or damaged audio'))};a.src=u});
 const AUD=/^audio\/|\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|webm)$/i;
 function pick(multi,fn){const i=h('input',null,null,{type:'file',accept:'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.flac'});i.multiple=!!multi;i.hidden=true;R.append(i);i.onchange=()=>{const f=[...i.files];i.remove();if(f.length)fn(f)};i.click()}
 async function addTracks(fs,kind){let ok=0;const bad=[];let used=tracks.reduce((a,t)=>a+t.size,0);
  for(const f of fs){try{if(!AUD.test(f.type)&&!AUD.test(f.name))throw new Error('not an audio file');if(f.size>L.file)throw new Error(MB(f.size)+' is over the '+MB(L.file)+' limit');if(used+f.size>L.total)throw new Error('library limit of '+MB(L.total)+' reached');
   const dur=await probe(f),b=await f.arrayBuffer(),m={id:uid(),name:f.name.replace(/\.[^.]+$/,'').slice(0,60),kind,mime:f.type,size:f.size,dur};
   await run(['tracks','audio'],'readwrite',t=>{t.objectStore('tracks').put(m);t.objectStore('audio').put({id:m.id,b})});tracks.push(m);used+=f.size;ok++}catch(e){bad.push(f.name.slice(0,24)+': '+err(e))}}
  say((ok?'Added '+ok+' track'+(ok>1?'s':'')+'. ':'')+(bad.length?'Skipped '+bad.length+' ('+bad.slice(0,2).join('; ')+').':''),!ok);draw()}
 async function delTrack(m){if(!confirm('Delete “'+m.name+'” from your library? This can’t be undone.'))return;
  try{await run(['tracks','audio','lists'],'readwrite',t=>{t.objectStore('tracks').delete(m.id);t.objectStore('audio').delete(m.id);lists.forEach(l=>{l.ids=l.ids.filter(x=>x!==m.id);t.objectStore('lists').put(l)})});tracks=tracks.filter(x=>x.id!==m.id);if(q[qi]===m.id){au.pause();qi=-1}say('Deleted “'+m.name+'”.');draw()}catch(e){say('Couldn’t delete: '+err(e),1)}}
 /* ---------- announcements ---------- */
 const ACATS=[['intro','Introductions'],['welcome','Welcome guests'],['congrats','Congratulations'],['crowd','Encourage the crowd']];
 const DEF=[['intro','Ladies and gentlemen, please give a big welcome to {name}!'],['intro','Good evening everyone, I am your DJ for {event}. Let us celebrate together!'],['welcome','Welcome, welcome, everyone, to {event}. Our guests are most welcome!'],['welcome','To our elders and all our guests, you are warmly welcome. Please enjoy the day.'],['congrats','Congratulations {name}! May you be blessed with joy and many happy years.'],['congrats','A big round of applause for {name}!'],['crowd','Make some noise, everyone! Are you ready to dance?'],['crowd','Stand up, clap your hands and let us celebrate {event}!']];
 let anns;try{anns=JSON.parse(ls('yaps_celeb_ann_v1'))}catch(e){}if(!Array.isArray(anns))anns=DEF.map(d=>({id:uid(),cat:d[0],text:d[1],clip:false}));
 let ev=ls('yaps_celeb_event')||'',who='';
 const saveAnn=()=>{if(ls('yaps_celeb_ann_v1',JSON.stringify(anns))===null&&!ls('yaps_celeb_ann_v1'))say('Couldn’t save your announcements on this device.',1)};
 const fill=t=>t.replace(/\{event\}/gi,ev||'our celebration').replace(/\{name\}/gi,who||'our guest of honour');
 const clips=new Map();
 async function playClip(a){const id='v_'+a.id;let b=clips.get(id);if(!b){const ab=await getA(id);if(!ab)throw new Error('your recording is missing');b=await ctx().decodeAudioData(ab.slice(0));clips.set(id,b)}
  const v=voice(b.duration),s=C.createBufferSource();s.buffer=b;s.connect(v.g);v.s.push(s);duck(1);s.onended=()=>duck(0);s.start()}
 async function speak(a){if(!window.speechSynthesis)throw new Error('this browser has no text-to-speech. Record or import your own voice instead');
  const u=new SpeechSynthesisUtterance(fill(a.text));u.rate=.95;u.onend=u.onerror=()=>duck(0);duck(1);speechSynthesis.cancel();speechSynthesis.speak(u)}
 async function playAnn(a){if(!on)return say('Turn Celebration Mode on first.',1);try{ctx();await C.resume();if(a.clip){await playClip(a);say('Playing your voice announcement.')}else{await speak(a);say('Speaking the text. (Text-to-speech is played by the browser, so it isn’t in the studio recording. Record your own voice to include it.)')}}catch(e){duck(0);say('Couldn’t play the announcement: '+err(e),1)}}
 let rec=null;
 async function recStart(a){if(rec)return recStop();if(!navigator.mediaDevices||!window.MediaRecorder)return say('Recording isn’t supported in this browser. Import a voice file instead.',1);
  try{const ms=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}),mr=new MediaRecorder(ms),ch=[];
   rec={mr,ms,a,t:setTimeout(recStop,L.rec*1e3)};mr.ondataavailable=e=>e.data.size&&ch.push(e.data);
   mr.onstop=async()=>{ms.getTracks().forEach(x=>x.stop());clearTimeout(rec&&rec.t);rec=null;try{const b=await new Blob(ch,{type:mr.mimeType}).arrayBuffer();await saveClip(a,b)}catch(e){say('Couldn’t save the recording: '+err(e),1)}draw()};
   mr.start();say('Recording… speak now (max '+L.rec+' s). Tap STOP when done.');draw()}
  catch(e){rec=null;say(e&&e.name==='NotAllowedError'?'Microphone permission was denied. Allow it in your browser settings and try again.':e&&e.name==='NotFoundError'?'No microphone was found.':'Couldn’t start recording: '+err(e),1)}}
 function recStop(){if(rec&&rec.mr.state!=='inactive')rec.mr.stop()}
 async function saveClip(a,ab){if(ab.byteLength<500)throw new Error('the recording is empty');ctx();let d;try{d=await C.decodeAudioData(ab.slice(0))}catch(e){throw new Error('that audio can’t be decoded by this browser')}
  if(d.duration>L.rec+2)throw new Error('it is longer than '+L.rec+' s');await putA('v_'+a.id,ab);clips.set('v_'+a.id,d);a.clip=true;saveAnn();say('Saved your voice for this announcement ('+d.duration.toFixed(1)+' s). Tap PLAY to hear it.')}
 async function dropClip(a){if(!confirm('Remove your voice recording from this announcement? The text stays.'))return;try{await run('audio','readwrite',t=>{t.objectStore('audio').delete('v_'+a.id)});clips.delete('v_'+a.id);a.clip=false;saveAnn();draw()}catch(e){say('Couldn’t remove it: '+err(e),1)}}
 /* ---------- drawing ---------- */
 let nowEl;function drawNow(){if(tab==='lib')draw()}
 function draw(){body.textContent='';nowEl=null;drawBar();
  if(tab==='pads')drawPads();
  else if(tab==='lib')drawLib();else drawAnn()}
 let kindSel='trad',fk='all',kinds=jp('yaps_celeb_kinds_v1',null);if(!Array.isArray(kinds)||!kinds.length)kinds=[['trad','Traditional music'],['dance','Cultural dance'],['modern','Modern dance / party'],['other','Celebration / other']];
 function drawLib(){const ar=h('div','ce-row'),ks=h('select',null,null,{'aria-label':'Type of music to add'});kinds.forEach(k=>ks.append(new Option(k[1],k[0])));ks.value=kindSel;ks.onchange=()=>kindSel=ks.value;
  ar.append(h('span','ce-m','Add as'),ks,btn('+ TYPE','',()=>{const n=(prompt('New music type (e.g. Gospel, Choir, Afrobeat)')||'').trim().slice(0,24);if(!n||kinds.length>=12)return;kinds.push(['k'+uid(),n]);ls('yaps_celeb_kinds_v1',JSON.stringify(kinds));draw()}),btn('+ IMPORT MUSIC','on',()=>pick(true,f=>addTracks(f,kindSel))),h('span','ce-m','Use only music you own or may play. '+MB(tracks.reduce((a,t)=>a+t.size,0))+' of '+MB(L.total)+' used.'));body.append(ar);
  const cur=tracks.find(t=>t.id===q[qi]),pr=h('div','ce-row');
  pr.append(btn('⏮','',()=>qi>0&&playT(qi-1),{'aria-label':'Previous'}),btn(au.paused?'▶':'⏸','on',()=>{if(qi<0&&q.length)playT(0);else if(au.paused){if(!on)return say('Turn Celebration Mode on first.',1);route();C.resume();au.play()}else au.pause();setTimeout(draw,60)},{'aria-label':'Play or pause'}),btn('⏭','',()=>qi+1<q.length&&playT(qi+1),{'aria-label':'Next'}));
  const sk=h('input',null,null,{type:'range',min:0,max:1000,value:0,'aria-label':'Seek'});sk.oninput=()=>{if(au.duration)au.currentTime=au.duration*sk.value/1000};
  nowEl=h('span','ce-m',cur?cur.name:'Nothing playing');EL.forEach(a=>a.ontimeupdate=()=>{if(a!==au||!sk.isConnected)return;if(document.activeElement!==sk&&au.duration)sk.value=au.currentTime/au.duration*1000;nowEl.textContent=(cur?cur.name:'')+' '+fmt(au.currentTime)+' / '+fmt(au.duration)});
  pr.append(sk,nowEl);body.append(pr);
  const lr=h('div','ce-row'),ps=h('select',null,null,{'aria-label':'Playlist'});ps.append(new Option('All my music (no playlist)',''));lists.forEach(l=>ps.append(new Option(l.name+' ('+l.ids.length+')',l.id)));ps.value=pl;ps.onchange=()=>{pl=ps.value;draw()};
  lr.append(ps,btn('+ NEW','',async()=>{const n=(prompt('Playlist name (e.g. Wedding Introduction)')||'').trim().slice(0,40);if(!n)return;const l={id:uid(),name:n,ids:[]};try{await putL(l);lists.push(l);pl=l.id;draw()}catch(e){say('Couldn’t save the playlist: '+err(e),1)}}));
  const L2=lists.find(l=>l.id===pl);
  if(L2){lr.append(btn('▶ PLAY LIST','on',()=>{q=L2.ids.filter(id=>tracks.some(t=>t.id===id));q.length?playT(0):say('This playlist is empty. Add tracks with “+ LIST”.',1)}),btn('RENAME','',async()=>{const n=(prompt('New name',L2.name)||'').trim().slice(0,40);if(!n)return;L2.name=n;try{await putL(L2);draw()}catch(e){say('Couldn’t rename: '+err(e),1)}}),
   btn('DELETE LIST','',async()=>{if(!confirm('Delete the playlist “'+L2.name+'”? Your tracks are kept.'))return;try{await run('lists','readwrite',t=>{t.objectStore('lists').delete(L2.id)});lists=lists.filter(l=>l!==L2);pl='';draw()}catch(e){say('Couldn’t delete: '+err(e),1)}}))}
  body.append(lr);const fr=h('div','ce-tabs');[['all','All']].concat(kinds).forEach(k=>fr.append(btn(k[1],fk===k[0]?'on':'',()=>{fk=k[0];draw()})));body.append(fr);
  let rows=L2?L2.ids.map(id=>tracks.find(t=>t.id===id)).filter(Boolean):tracks.filter(t=>fk==='all'||t.kind===fk);
  if(!rows.length)body.append(h('p','ce-m',tracks.length?'Nothing here yet.':'Your library is empty. Import your traditional music, cultural dance tracks and celebration songs.'));
  rows.forEach((m,i)=>{const r=h('div','ce-it'),nm=h('span','nm',m.name);r.append(nm,h('span','ce-tag',(kinds.find(k=>k[0]===m.kind)||kinds[kinds.length-1])[1]),h('span','ce-m',fmt(m.dur)),
   btn('▶','',()=>{q=rows.map(x=>x.id);playT(i)},{'aria-label':'Play '+m.name}));
   if(L2)r.append(btn('✕ LIST','',async()=>{L2.ids=L2.ids.filter(x=>x!==m.id);try{await putL(L2);draw()}catch(e){say('Couldn’t save: '+err(e),1)}}));
   else if(lists.length)r.append(btn('+ LIST','',async()=>{const l=lists.find(x=>x.id===(pl||lists[lists.length-1].id));if(!l||l.ids.includes(m.id))return say('Already in “'+l.name+'”.');l.ids.push(m.id);try{await putL(l);say('Added to “'+l.name+'”. Pick the playlist above to see it.')}catch(e){l.ids.pop();say('Couldn’t save: '+err(e),1)}}));
   r.append(btn('DELETE','',()=>delTrack(m)));body.append(r)})}
 function drawAnn(){const r=h('div','ce-row'),e1=h('input',null,null,{type:'text',placeholder:'Event, e.g. Kasozi–Namata Wedding',maxlength:60,'aria-label':'Event name'}),n1=h('input',null,null,{type:'text',placeholder:'Name to congratulate or introduce',maxlength:40,'aria-label':'Guest name'});
  e1.value=ev;n1.value=who;e1.oninput=()=>{ev=e1.value;ls('yaps_celeb_event',ev)};n1.oninput=()=>who=n1.value;r.append(e1,n1);body.append(r,h('p','ce-m','Use {event} and {name} in a script and they are filled in from these boxes when it is spoken. Record or import your own voice to play it through the studio.'));
  const ar=h('div','ce-row'),cs=h('select',null,null,{'aria-label':'Category'});ACATS.forEach(c=>cs.append(new Option(c[1],c[0])));const ti=h('input',null,null,{type:'text',placeholder:'Write a new announcement…',maxlength:300,'aria-label':'New announcement text'});
  ar.append(cs,ti,btn('+ ADD','on',()=>{const t=ti.value.trim();if(!t)return say('Type the announcement first.',1);anns.push({id:uid(),cat:cs.value,text:t.slice(0,300),clip:false});saveAnn();draw()}));body.append(ar);
  ACATS.forEach(c=>{body.append(h('div','ce-h',c[1].toUpperCase()));anns.filter(a=>a.cat===c[0]).forEach(a=>{const it=h('div','ce-it'),t=h('input',null,null,{type:'text',maxlength:300,'aria-label':'Announcement text'});t.value=a.text;t.onchange=()=>{a.text=t.value.trim().slice(0,300)||a.text;t.value=a.text;saveAnn()};
   it.append(t);if(a.clip)it.append(h('span','ce-tag','MY VOICE'));
   it.append(btn('▶ PLAY','on',()=>playAnn(a)),btn(rec&&rec.a===a?'■ STOP':'● REC',rec&&rec.a===a?'rec':'',()=>recStart(a),{'aria-label':'Record your voice'}),btn('⬆ VOICE','',()=>pick(false,async f=>{try{if(!AUD.test(f[0].type)&&!AUD.test(f[0].name))throw new Error('not an audio file');if(f[0].size>L.file)throw new Error('file too large');await saveClip(a,await f[0].arrayBuffer());draw()}catch(e){say('Couldn’t import that voice file: '+err(e),1)}})));
   if(a.clip)it.append(btn('REMOVE VOICE','',()=>dropClip(a)));
   it.append(btn('✕','',()=>{if(!confirm('Delete this announcement'+(a.clip?' and its voice recording':'')+'?'))return;anns=anns.filter(x=>x!==a);saveAnn();if(a.clip)run('audio','readwrite',t=>{t.objectStore('audio').delete('v_'+a.id)}).catch(()=>{});draw()},{'aria-label':'Delete announcement'}));body.append(it)})})}
 /* ---------- controls ---------- */
 function setOn(v,quiet){on=v;ls('yaps_celeb_on',v?'1':'0');onB.textContent=v?'ON':'OFF';onB.classList.toggle('on',v);onB.setAttribute('aria-checked',v);box.classList.toggle('off',!v);if(!v)stopAll();if(!quiet)say(v?'Celebration Mode is ON. Pads, your music and announcements are ready.':'Celebration Mode is OFF. Everything is stopped.')}
 onB.onclick=()=>setOn(!on);$('ceStop').onpointerdown=e=>{e.preventDefault();stopAll();say('Stopped everything.')};
 $('ceVol').oninput=e=>{vol=e.target.value/100;$('ceVo').textContent=e.target.value;if(bus&&bus.context===C)bus.gain.setTargetAtTime(vol*vol*1.2,C.currentTime,.015);EL.forEach(a=>a.volume=Math.min(1,vol*1.1))};EL.forEach(a=>a.volume=.88);
 R.querySelectorAll('[data-ct]').forEach(b=>b.onclick=()=>{tab=b.dataset.ct;R.querySelectorAll('[data-ct]').forEach(x=>x.classList.toggle('on',x===b));draw()});
 R.addEventListener('keydown',e=>e.stopPropagation());R.addEventListener('keyup',e=>e.stopPropagation());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)act.forEach(v=>{try{v.g.gain.value=0}catch(e){}})});
 (async()=>{try{tracks=await all('tracks');lists=await all('lists')}catch(e){say('Your saved library couldn’t be opened: '+err(e),1)}setOn(on,true);if(on)say('Celebration Mode is ON.');draw()})();
 window.yapsCelebration={stopAll};
 /* opening the CELEBRATE tab switches Celebration Mode on, so the pads are live straight away */
 try{new MutationObserver(()=>{if(document.body.dataset.vp==='celeb'&&!on)setOn(true)}).observe(document.body,{attributes:true,attributeFilter:['data-vp']});if(document.body.dataset.vp==='celeb')setOn(true)}catch(e){}
})();




const AI_STEMS_API_URL  = "";   /* stem separation endpoint (your backend); can also be set in the STEMS tab */

/* ══════════════════════════════════════════════════════════════════════════
   PRO CONSOLE — VirtualDJ-style features (added block, self-contained)
   Stems · Key detect/Key lock/Key sync · Scrolling 3-band waveforms · Beat grid tools · Quantize/Slip
   Performance pads (8 cues, loop roll, beat jump, slicer) · Per-deck loops · Beat FX rack + Brake/Spin/Echo-out
   Mixer+ (gain, dual filter, kills, crossfader curves) · Sampler+ (load / capture) · MIDI learn · Setlist
   Hooks into the existing code: init() calls proInit(); postLoad() calls proAnalyse(d); xfade() reads window.proXf.
   ══════════════════════════════════════════════════════════════════════════ */
(function(){
const P={q:true,slip:true,sel:0,pad:'cue',del:false,zoom:8,tab:'wave',sm:Array(8).fill(null),smAct:'play',smMode:'one',smV:.8,map:{},ml:{},learn:0,set:[],t0:0,
 fx:{id:'echo',tg:'M',div:.5,p:.5,m:.5,on:false,cur:'off',nodes:[],oscs:[]}};
const S=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},G=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const L2D=L=>D[L=='A'?0:1],root=$('#pro');
if(!root)return;
D.forEach(d=>{d.stem={voc:1,mel:1,bas:1,hat:1};d.kl=false;d.ks=0;d.gainDb=0;d.flt=0;d.key2=null;d.kill={lo:0,mi:0,hi:0};d.keep={};d.xl=null;d.slipRun=false;d.sp=0;d.rollOn=false;d.bands=null});
window.proXf={curve:'smooth',rev:false};
const snap=(d,t)=>{if(!P.q||!d.bpm)return t;const sp=60/d.bpm,b0=d.beat0||0;return b0+Math.round((t-b0)/sp)*sp};
const rate=d=>d.src?d.src.playbackRate.value:1+d.pitch/100;
function seek(d,t){t=clamp(t,0,Math.max(0,d.dur-.05));d.xl=null;if(d.on&&d.buf){stopD(d);d.pos=t;play(d)}else d.pos=t}
function needBpm(d){if(d.bpm)return false;toast('Tap the BPM badge on Deck '+d.L+' to enter a BPM first');return true}

/* ---------- loops, rolls, slip ---------- */
function loopSet(d,s,e){if(!d.src||!d.on){toast('Start Deck '+d.L+' first');return false}e=Math.min(e,d.dur);if(e-s<.02)return false;
 if((P.slip||d.rollOn)&&!d.slipRun){d.slipRun=true;d.sp=d.pos}
 d.src.loopStart=s;d.src.loopEnd=e;d.src.loop=true;d.xl=[s,e];d.xlast=[s,e];return true}
function loopOff(d){const was=d.slipRun;if(d.src)d.src.loop=false;d.xl=null;d.slipRun=false;if(was&&d.on)seek(d,d.sp)}
function autoLoop(d,beats){if(needBpm(d))return;const len=beats*60/d.bpm;
 if(d.xl&&Math.abs(d.xl[1]-d.xl[0]-len)<.002){loopOff(d);return}
 const s=snap(d,d.pos);loopSet(d,s,s+len)}
function rollStart(d,beats,from){if(!d.on){toast('Start Deck '+d.L+' first');return}if(needBpm(d))return;d.rollOn=true;const s=from!=null?from:snap(d,d.pos);loopSet(d,s,s+beats*60/d.bpm)}
function rollEnd(d){if(!d.rollOn)return;d.rollOn=false;loopOff(d)}
window.YAPS_PRO={loopSet,loopOff,autoLoop,rollStart,rollEnd,snap,needBpm,brake,spin,echoOut};
function jump(d,beats){if(needBpm(d))return;seek(d,snap(d,d.pos+beats*60/d.bpm))}
function cuePad(d,i){if(P.del){d.hc[i]=null;hcBtn(d,i);return}
 if(d.hc[i]==null){d.hc[i]=snap(d,d.pos);hcBtn(d,i);toast('Cue '+(i+1)+' set on Deck '+d.L)}else seek(d,d.hc[i])}
function hcBtn(d,i){if(i<4){const b=$('[data-hc="'+d.L+i+'"]');if(b)b.classList.toggle('on',d.hc[i]!=null)}refresh()}

/* ---------- one-shot transitions ---------- */
function deckLive(d){if(d.buf&&d.on)return true;toast(d.buf?'Start Deck '+d.L+' first, then use this effect.':'Load a track into Deck '+d.L+' first.');return false}
function brake(d){if(!d.on||!d.src)return;const s=d.src,t=C.currentTime;s.playbackRate.cancelScheduledValues(t);s.playbackRate.setValueAtTime(s.playbackRate.value,t);s.playbackRate.linearRampToValueAtTime(.03,t+1.3);
 setTimeout(()=>{if(d.src===s)stopD(d)},1350)}
function revPlay(d){if(!d.on||!d.buf)return;init();const sr=d.buf.sampleRate,rt=1+d.pitch/100,Ls=Math.min(d.bpm?4*60/d.bpm:2,d.pos),n=Math.floor(Ls*sr);if(n<1000)return;
 const bf=C.createBuffer(d.buf.numberOfChannels,n,sr),st=Math.floor((d.pos-Ls)*sr);
 for(let c=0;c<bf.numberOfChannels;c++){const s=d.buf.getChannelData(c),o=bf.getChannelData(c);for(let i=0;i<n;i++)o[i]=s[st+n-1-i]||0}
 const dur=Ls/rt,back=P.slip?d.pos+Ls:Math.max(0,d.pos-Ls);stopD(d);
 const s=C.createBufferSource(),t=C.currentTime;s.buffer=bf;s.playbackRate.value=rt;s.connect(d.in);s.start(t);s.stop(t+dur);
 setTimeout(()=>{d.pos=clamp(back,0,d.dur-.1);play(d)},dur*1000)}
function spin(d){if(!d.on||!d.buf)return;init();const sr=d.buf.sampleRate,L=Math.min(1.2,d.pos),n=Math.floor(L*sr);if(n<1000)return;
 const b=C.createBuffer(d.buf.numberOfChannels,n,sr),st=Math.floor((d.pos-L)*sr);
 for(let c=0;c<b.numberOfChannels;c++){const s=d.buf.getChannelData(c),o=b.getChannelData(c);for(let i=0;i<n;i++)o[i]=s[st+n-1-i]||0}
 const back=P.slip?d.pos+.9*rate(d):Math.max(0,d.pos-L*.9);stopD(d);
 const s=C.createBufferSource(),t=C.currentTime;s.buffer=b;s.playbackRate.setValueAtTime(2.2,t);s.playbackRate.exponentialRampToValueAtTime(.35,t+.9);s.connect(d.in);s.start(t);s.stop(t+.9);
 setTimeout(()=>{d.pos=clamp(back,0,d.dur-.1);play(d)},900)}
function echoOut(d){if(!d.on||!d.src)return;init();const bs=d.bpm?60/eff(d):.5,dl=C.createDelay(2),fb=C.createGain(),og=C.createGain(),t=C.currentTime;
 dl.delayTime.value=Math.min(1.9,bs*.75);fb.gain.value=.6;og.gain.value=.8;d.vg.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(og);og.connect(master);
 d.vg.gain.setTargetAtTime(0,t,.04);
 setTimeout(()=>{stopD(d);d.vg.gain.value=d.volv;try{d.vg.disconnect(dl)}catch(e){}[dl,fb,og].forEach(n=>{try{n.disconnect()}catch(e){}})},bs*8*1000)}

/* ---------- stems (frequency + stereo-position split) ---------- */
function buildStems(d){
 const F1=180,F2=5500,fl=(t,f)=>{const n=C.createBiquadFilter();n.type=t;n.frequency.value=f;n.Q.value=.7071;return n},
 lr=(t,f,from)=>{const a=fl(t,f),b=fl(t,f);from.connect(a);a.connect(b);return b},
 g=v=>{const n=C.createGain();n.gain.value=v;return n},mono=v=>{const n=C.createGain();n.channelCount=1;n.channelCountMode='explicit';n.gain.value=v;return n};
 const low=lr('lowpass',F1,d.sIn),rest=lr('highpass',F1,d.sIn),mid=lr('lowpass',F2,rest),hi=lr('highpass',F2,rest);
 d.sg={bas:g(1),hat:g(1),voc:g(1),mel:g(1)};low.connect(d.sg.bas);hi.connect(d.sg.hat);
 const sp=C.createChannelSplitter(2);mid.connect(sp);
 const cM=mono(.5);sp.connect(cM,0);sp.connect(cM,1);cM.connect(d.sg.voc);
 const sL=mono(.5),sR=mono(-.5),ss=mono(1),inv=mono(-1),mg=C.createChannelMerger(2);
 sp.connect(sL,0);sp.connect(sR,1);sL.connect(ss);sR.connect(ss);ss.connect(mg,0,0);ss.connect(inv);inv.connect(mg,0,1);mg.connect(d.sg.mel);
 ['bas','hat','voc','mel'].forEach(k=>d.sg[k].connect(d.sSt));d.sSt.connect(d.sOut)}
const rsAct=d=>!!(d.rsOn&&d.buf8&&d.buf8of===d.buf);
function applyStems(d){if(!d.sg)return;const t=C.currentTime,ra=rsAct(d),all=ra||Object.values(d.stem).every(v=>v);
 for(const k in d.stem)d.sg[k].gain.setTargetAtTime(ra?1:d.stem[k],t,.02);
 if(d.rsg){const M={vocals:'voc',drums:'hat',bass:'bas',other:'mel'};['vocals','drums','bass','other'].forEach((k,i)=>d.rsg[i].gain.setTargetAtTime(ra?d.stem[M[k]]:1,t,.02))}
 d.sDir.gain.setTargetAtTime(all?1:0,t,.02);d.sSt.gain.setTargetAtTime(all?0:1,t,.02)}
function stemSet(d,o){init();Object.assign(d.stem,o);applyStems(d);refresh()}

/* ---------- key lock / key shift (granular pitch shifter in an AudioWorklet) ---------- */
function psProc(){class PS extends AudioWorkletProcessor{
 static get parameterDescriptors(){return[{name:'ratio',defaultValue:1,minValue:.25,maxValue:4,automationRate:'k-rate'}]}
 constructor(){super();this.N=16384;this.b=[new Float32Array(this.N),new Float32Array(this.N)];this.w=0;this.ph=0;this.W=2205}
 rd(buf,x){const N=this.N;x=((x%N)+N)%N;const i0=Math.floor(x),f=x-i0;const a=buf[i0],b=buf[(i0+1)&(N-1)];return a+(b-a)*f}
 process(ins,outs,pr){const i=ins[0],o=outs[0];if(!i||!i.length||!o||!o.length)return true;
  const r=pr.ratio[0],n=o[0].length,W=this.W,m=this.N-1,dp=(1-r)/W;
  for(let k=0;k<n;k++){const p1=this.ph,p2=(p1+.5)%1,d1=p1*W+2,d2=p2*W+2,w1=.5-.5*Math.cos(6.283185307*p1),w2=1-w1;
   for(let c=0;c<o.length;c++){const inp=i[c]||i[0],buf=this.b[c];buf[this.w]=inp[k];o[c][k]=this.rd(buf,this.w-d1)*w1+this.rd(buf,this.w-d2)*w2}
   this.w=(this.w+1)&m;this.ph+=dp;this.ph-=Math.floor(this.ph)}
  return true}}
 registerProcessor('yaps-ps',PS)}
async function loadWorklet(){
 if(!C.audioWorklet||typeof AudioWorkletNode==='undefined'){P.nowk=true;refresh();return}
 const url=URL.createObjectURL(new Blob(['('+psProc.toString()+')()'],{type:'application/javascript'}));
 try{await C.audioWorklet.addModule(url);
  D.forEach(d=>{const n=new AudioWorkletNode(C,'yaps-ps',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});
   d.kn=n;d.sOut.connect(n);n.connect(d.kPs);d.kPs.connect(d.kOut);applyKey(d)});P.wk=true}
 catch(e){P.nowk=true;console.warn('Key lock unavailable',e)}
 URL.revokeObjectURL(url);refresh()}
function applyKey(d){if(!C||!d.kn)return;const eng=d.kl||d.ks!==0,t=C.currentTime;
 d.kDir.gain.setTargetAtTime(eng?0:1,t,.02);d.kPs.gain.setTargetAtTime(eng?1:0,t,.02);d._kr=0}
function keyTick(d){if(!d.kn||!(d.kl||d.ks))return;const r=Math.pow(2,d.ks/12)/(d.kl?rate(d):1);
 if(Math.abs(r-(d._kr||0))>.0005){d._kr=r;d.kn.parameters.get('ratio').setTargetAtTime(r,C.currentTime,.03)}}
function needWk(){if(P.wk)return false;toast(P.nowk?'Key lock needs a newer browser (AudioWorklet).':'Start a deck first, then try again.');return true}

/* ---------- key detection (chroma + Krumhansl profiles) ---------- */
const KMAJ=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88],KMIN=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
 for(let len=2;len<=n;len<<=1){const ang=-2*Math.PI/len,wr=Math.cos(ang),wi=Math.sin(ang),h=len>>1;
  for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let j=0;j<h;j++){const a=i+j,b=a+h,vr=re[b]*cr-im[b]*ci,vi=re[b]*ci+im[b]*cr;re[b]=re[a]-vr;im[b]=im[a]-vi;re[a]+=vr;im[a]+=vi;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr}}}}
function corr(a,b){let ma=0,mb=0;for(let i=0;i<12;i++){ma+=a[i];mb+=b[i]}ma/=12;mb/=12;let n=0,da=0,db=0;for(let i=0;i<12;i++){n+=(a[i]-ma)*(b[i]-mb);da+=(a[i]-ma)**2;db+=(b[i]-mb)**2}return n/Math.sqrt(da*db||1)}
function detectKey(buf){const N=16384,sr=buf.sampleRate,x=buf.getChannelData(0),span=x.length-N;if(span<=0)return null;
 const ch=new Float64Array(12),re=new Float64Array(N),im=new Float64Array(N),lo=Math.floor(65*N/sr),hi=Math.min(N/2-2,Math.floor(2100*N/sr)),W=8;
 for(let w=0;w<W;w++){const st=Math.floor(span*(.1+.8*w/(W-1)));for(let i=0;i<N;i++){re[i]=(x[st+i]||0)*(.5-.5*Math.cos(2*Math.PI*i/N));im[i]=0}fft(re,im);
  for(let k=Math.max(1,lo);k<=hi;k++){const m=Math.hypot(re[k],im[k]);if(m>Math.hypot(re[k-1],im[k-1])&&m>=Math.hypot(re[k+1],im[k+1])){const midi=69+12*Math.log2(k*sr/N/440);ch[((Math.round(midi)%12)+12)%12]+=Math.sqrt(m)}}}
 let best=-2,bk=null;for(let t=0;t<12;t++){const rm=[],rn=[];for(let i=0;i<12;i++){rm.push(KMAJ[(i-t+12)%12]);rn.push(KMIN[(i-t+12)%12])}
  const a=corr(ch,rm),b=corr(ch,rn);if(a>best){best=a;bk={t,minor:false}}if(b>best){best=b;bk={t,minor:true}}}
 return bk}
const camelot=k=>{const m=k.minor?(k.t+3)%12:k.t;return(((8+((m*7)%12)-1)%12)+1)+(k.minor?'A':'B')};
function parseCam(s){const m=/^(\d{1,2})([AB])$/i.exec(String(s).trim());if(!m)return null;const n=+m[1];if(n<1||n>12)return null;
 for(let p=0;p<12;p++){if((((8+((p*7)%12)-1)%12)+1)===n){const minor=m[2].toUpperCase()=='A';return{t:minor?(p+9)%12:p,minor}}}return null}
const NOTE=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
function effKey(d){if(!d.key2)return null;const sh=Math.round(d.ks+(d.kl?0:12*Math.log2(rate(d)))),k={t:((d.key2.t+sh)%12+12)%12,minor:d.key2.minor};return{k,code:camelot(k),name:NOTE[k.t]+(k.minor?'m':'')}}
function compat(a,b){if(!a||!b)return null;const pa=/(\d+)([AB])/.exec(a),pb=/(\d+)([AB])/.exec(b),na=+pa[1],nb=+pb[1];let df=Math.abs(na-nb);df=Math.min(df,12-df);
 if(df===0&&pa[2]===pb[2])return['PERFECT','ok'];if(df===0)return['GOOD · relative key','ok'];if(df===1&&pa[2]===pb[2])return['GOOD · +/-1 step','ok'];if(df===1)return['OK · diagonal','mid'];if(df===2&&pa[2]===pb[2])return['ENERGY BOOST','mid'];return['KEY CLASH · use KEY SYNC','bad']}
function keySync(d){const o=D[1-D.indexOf(d)];if(!d.key2||!o.key2){toast('Both decks need a detected key first');return}if(needWk())return;
 const bm=k=>k.minor?(k.t+3)%12:k.t,rs=x=>d.kl&&x===d?0:Math.round(12*Math.log2(rate(x))),
  m2=(bm(o.key2)+Math.round(o.ks+(o.kl?0:12*Math.log2(rate(o)))))%12,m1=bm(d.key2)+(d.kl?0:Math.round(12*Math.log2(rate(d))));
 let s=(((m2-m1)%12)+12)%12;if(s>6)s-=12;if(!s){toast('Already in harmonic match');return}d.ks=s;applyKey(d);refresh();toast('Deck '+d.L+' shifted '+(s>0?'+':'')+s+' semitone'+(Math.abs(s)>1?'s':'')+' to match Deck '+o.L)}

/* ---------- analysis on load: 3-band waveform, key, setlist ---------- */
function bands(d,buf){const sr=buf.sampleRate,x=buf.getChannelData(0),bin=Math.floor(sr/100),n=Math.floor(x.length/bin);if(n<10)return;
 const lo=new Float32Array(n),mi=new Float32Array(n),hi=new Float32Array(n),a1=1-Math.exp(-2*Math.PI*220/sr),a2=1-Math.exp(-2*Math.PI*2800/sr);let l1=0,l2=0;
 for(let i=0;i<n;i++){let sl=0,sm=0,sh=0;const o=i*bin;for(let j=0;j<bin;j++){const v=x[o+j]||0;l1+=a1*(v-l1);l2+=a2*(v-l2);const md=l2-l1,hg=v-l2;sl+=l1*l1;sm+=md*md;sh+=hg*hg}lo[i]=Math.sqrt(sl/bin);mi[i]=Math.sqrt(sm/bin);hi[i]=Math.sqrt(sh/bin)}
 const tot=new Float32Array(n);for(let i=0;i<n;i++)tot[i]=lo[i]+mi[i]+hi[i];tot.sort();const p=tot[Math.floor(n*.98)]||1e-3;
 if(d.buf===buf)d.bands={lo,mi,hi,n,sc:1/p}}
window.proAnalyse=function(d){const buf=d.buf;if(!buf)return;d.bands=null;d.key2=null;
 setTimeout(()=>{try{bands(d,buf)}catch(e){console.warn(e)}},40);
 setTimeout(()=>{try{if(d.buf!==buf)return;const k=detectKey(buf);if(k){d.key2={t:k.t,minor:k.minor,est:true};refresh();if(window.libStore)libStore(d)}}catch(e){console.warn(e)}},300);
 const last=P.set[P.set.length-1];if(!last||last.t!==d.t||last.d!==d.L){if(!P.t0)P.t0=Date.now();P.set.push({at:Date.now(),d:d.L,t:d.t,a:d.ar,bpm:d.bpm});refreshSet()}};

/* ---------- Beat FX rack ---------- */
const FXN={echo:'Echo',rev:'Reverb',flg:'Flanger',pha:'Phaser',gat:'Gater',crs:'Crusher',afl:'Auto Filter',noi:'Noise sweep'};
function fxBeat(){const R=P.fx,o=R.tg=='B'?[D[1],D[0]]:R.tg=='A'?[D[0],D[1]]:(D[0].on?[D[0],D[1]]:[D[1],D[0]]);for(const d of o){const b=eff(d);if(b)return 60/b}return .5}
function irBuf(sec){const n=Math.floor(C.sampleRate*sec),b=C.createBuffer(2,n,C.sampleRate);for(let c=0;c<2;c++){const a=b.getChannelData(c);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.6)}return b}
function fxInit(){const R=P.fx;R.in=C.createGain();R.out=C.createGain();R.dry=C.createGain();R.wet=C.createGain();R.in.connect(R.dry);R.dry.connect(R.out);R.wet.connect(R.out);
 P.nz=C.createBuffer(1,C.sampleRate*2,C.sampleRate);P.nz.getChannelData(0).forEach((_,i,a)=>a[i]=Math.random()*2-1);fxBuild()}
function fxBuild(){const R=P.fx;if(R.fxIn){try{R.in.disconnect(R.fxIn)}catch(e){}}
 R.nodes.forEach(n=>{try{n.disconnect()}catch(e){}});R.oscs.forEach(o=>{try{o.stop()}catch(e){}});R.nodes=[];R.oscs=[];R.upd=null;
 const N=n=>{R.nodes.push(n);return n},O=o=>{R.oscs.push(o);R.nodes.push(o);o.start();return o},T=()=>C.currentTime,g=v=>{const n=N(C.createGain());n.gain.value=v;return n};
 const fi=R.fxIn=N(C.createGain());R.in.connect(fi);const id=R.id,cyc=m=>1/Math.max(.05,fxBeat()*R.div*m);
 const lfo=(type,m,amt,dest)=>{const o=O(C.createOscillator());o.type=type;o.frequency.value=cyc(m);const a=g(amt);o.connect(a);a.connect(dest);return o};
 R.add=true;
 if(id=='echo'){const dl=N(C.createDelay(2)),fb=g(.4);fi.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(R.wet);R.upd=()=>{dl.delayTime.setTargetAtTime(Math.min(1.95,fxBeat()*R.div),T(),.05);fb.gain.setTargetAtTime(.2+.65*R.p,T(),.05)}}
 else if(id=='rev'){const lp=N(C.createBiquadFilter()),cv=N(C.createConvolver());lp.type='lowpass';cv.buffer=irBuf(2.4);fi.connect(lp);lp.connect(cv);cv.connect(R.wet);R.upd=()=>lp.frequency.setTargetAtTime(700+11000*R.p,T(),.05)}
 else if(id=='flg'){const dl=N(C.createDelay(.05)),fb=g(.5);dl.delayTime.value=.003;fi.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(R.wet);const o=lfo('sine',4,.0025,dl.delayTime);R.upd=()=>{o.frequency.setTargetAtTime(cyc(4),T(),.1);fb.gain.setTargetAtTime(.2+.7*R.p,T(),.05)}}
 else if(id=='pha'){const aps=[0,1,2,3].map(()=>{const f=N(C.createBiquadFilter());f.type='allpass';f.frequency.value=700;f.Q.value=2;return f});fi.connect(aps[0]);aps.forEach((f,i)=>{if(i)aps[i-1].connect(f)});aps[3].connect(R.wet);
  const o=O(C.createOscillator());o.type='sine';o.frequency.value=cyc(4);const a=g(1800);o.connect(a);aps.forEach(f=>a.connect(f.detune));R.upd=()=>{o.frequency.setTargetAtTime(cyc(4),T(),.1);a.gain.setTargetAtTime(600+2400*R.p,T(),.05)}}
 else if(id=='gat'){R.add=false;const gt=N(C.createGain());gt.gain.value=0;fi.connect(gt);gt.connect(R.wet);const o=O(C.createOscillator());o.type='square';o.frequency.value=cyc(1);const sm=N(C.createBiquadFilter());sm.type='lowpass';sm.frequency.value=400;const a=g(.5);o.connect(sm);sm.connect(a);a.connect(gt.gain);
  const cs=O(C.createConstantSource());cs.offset.value=.5;cs.connect(gt.gain);R.upd=()=>{o.frequency.setTargetAtTime(cyc(1),T(),.02);a.gain.setTargetAtTime(.25+.25*R.p,T(),.05);cs.offset.setTargetAtTime(.75-.25*R.p,T(),.05)}}
 else if(id=='crs'){R.add=false;const ws=N(C.createWaveShaper());fi.connect(ws);ws.connect(R.wet);R.upd=()=>{const L=Math.pow(2,Math.round(12-R.p*9)-1),c=new Float32Array(8193);for(let i=0;i<8193;i++)c[i]=Math.round((i/4096-1)*L)/L;ws.curve=c}}
 else if(id=='afl'){R.add=false;const bq2=N(C.createBiquadFilter());bq2.type='lowpass';bq2.frequency.value=900;fi.connect(bq2);bq2.connect(R.wet);const o=lfo('sine',4,2400,bq2.detune);R.upd=()=>{o.frequency.setTargetAtTime(cyc(4),T(),.1);bq2.Q.setTargetAtTime(2+12*R.p,T(),.05)}}
 else if(id=='noi'){const s=O(C.createBufferSource());s.buffer=P.nz;s.loop=true;const bp=N(C.createBiquadFilter());bp.type='bandpass';bp.frequency.value=1200;bp.Q.value=1.5;const ng=g(.3);s.connect(bp);bp.connect(ng);ng.connect(R.wet);const o=lfo('sine',8,2400,bp.detune);R.upd=()=>{o.frequency.setTargetAtTime(cyc(8),T(),.1);ng.gain.setTargetAtTime(.1+.4*R.p,T(),.05)}}
 fxMix();if(R.upd)R.upd()}
function fxMix(){const R=P.fx;if(!R.dry)return;const t=C.currentTime;R.dry.gain.setTargetAtTime(R.add?1:1-R.m,t,.02);R.wet.gain.setTargetAtTime(R.m,t,.02)}
function fxWire(){const R=P.fx;if(!R.in)return;const want=R.on?R.tg:'off';if(R.cur===want)return;
 const tgt=k=>k=='M'?{a:master,b:lim}:{a:L2D(k).pj,b:L2D(k).vg};
 if(R.cur!=='off'){const t=tgt(R.cur);try{t.a.disconnect(R.in)}catch(e){}try{R.out.disconnect(t.b)}catch(e){}t.a.connect(t.b)}
 if(want!=='off'){const t=tgt(want);try{t.a.disconnect(t.b)}catch(e){}t.a.connect(R.in);R.out.connect(t.b)}
 R.cur=want}
function fxOn(v){init();const R=P.fx;if(R.tg=='off'){R.tg='M'}R.on=v;fxWire();refresh()}

/* ---------- mixer+ ---------- */
function applyMixer(d){if(!C||!d.tg)return;const t=C.currentTime;d.tg.gain.setTargetAtTime(Math.pow(10,d.gainDb/20),t,.02);
 const v=d.flt;d.lp2.frequency.setTargetAtTime(v<0?22000*Math.pow(120/22000,-v):22000,t,.03);d.hp2.frequency.setTargetAtTime(v>0?20*Math.pow(400,v):20,t,.03)}
function setKnob(L,b,v){const d=L2D(L);if(Math.abs(v)<.04)v=0;d.eq[b]=clamp(v,-1,1);const k=$('.knob[data-d="'+L+'"][data-b="'+b+'"]');if(k){k.style.setProperty('--r',d.eq[b]*135+'deg');k.setAttribute('aria-valuenow',Math.round(d.eq[b]*100))}init();applyEq(d)}
function kill(d,b){const on=!d.kill[b];d.kill[b]=on?1:0;if(on){d.keep[b]=d.eq[b];setKnob(d.L,b,-1)}else setKnob(d.L,b,d.keep[b]||0);refresh()}

/* ---------- sampler+ ---------- */
function smFire(i,down){const s=P.sm[i];if(!s){if(down)toast('Empty slot. Use LOAD or CAPTURE first.');return}init();const m=P.smMode;
 if(down){if(m=='loop'){if(s.src)smStop(s);else smPlay(s,true)}else smPlay(s,m=='hold')}else if(m=='hold')smStop(s);refresh()}
function smStop(s){if(s.src){try{s.src.stop()}catch(e){}s.src=null}}
function smPlay(s,loop){smStop(s);hydSm(s);if(!s.buf)return;const b=C.createBufferSource();b.buffer=s.buf;b.loop=loop;b.connect(P.smG);b.start();s.src=b;b.onended=()=>{if(s.src===b){s.src=null;refresh()}}}
function smCap(i,d){if(!d.buf){toast('Load a track into Deck '+d.L+' first');return}init();const sp=d.bpm?60/d.bpm:.5,len=d.xl?d.xl[1]-d.xl[0]:4*sp,end=d.pos,st=Math.max(0,end-len),b=d.buf,sr=b.sampleRate,a=Math.floor(st*sr),n=Math.floor((end-st)*sr);if(n<400){toast('Play the deck a little first');return}
 const nb=C.createBuffer(b.numberOfChannels,n,sr);for(let c=0;c<b.numberOfChannels;c++)nb.getChannelData(c).set(b.getChannelData(c).subarray(a,a+n));
 P.sm[i]={buf:nb,name:'Deck '+d.L+' · '+(n/sr).toFixed(1)+'s'};refresh();toast('Captured into slot '+(i+1))}
const smFile=document.createElement('input');smFile.type='file';smFile.accept='audio/*';smFile.hidden=true;document.body.appendChild(smFile);
smFile.onchange=async()=>{const f=smFile.files[0];if(!f)return;init();try{const ab=await C.decodeAudioData(await f.arrayBuffer());
 if(ab.duration>60){toast('Sampler slots hold up to 60 seconds. Pick a shorter clip.');return}P.sm[P.smT]={buf:ab,name:f.name.replace(/\.[^.]+$/,'').slice(0,18)};refresh()}catch(e){toast('Couldn’t read that audio file')}smFile.value=''};
const SMK=['KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','Comma'];
function smPad(i,down){const a=P.smAct;
 if(a=='play')return smFire(i,down);if(!down)return;
 if(a=='load'){P.smT=i;smFile.click()}else if(a=='capA')smCap(i,D[0]);else if(a=='capB')smCap(i,D[1]);else if(a=='clear'){if(P.sm[i])smStop(P.sm[i]);P.sm[i]=null;refresh()}}

/* ---------- MIDI learn ---------- */
try{P.map=JSON.parse(G('yaps_midi_map')||'{}')}catch(e){P.map={}}
function elKey(el){if(el.classList.contains('knob'))return'kn:'+el.dataset.d+':'+el.dataset.b;if(el.id)return'#'+el.id;if(el.dataset.k)return'k:'+el.dataset.k;
 if(el.dataset.hc)return'hc:'+el.dataset.hc;if(el.hasAttribute('data-loop'))return'lp:'+el.dataset.loop;if(el.dataset.fx)return'fx:'+el.dataset.fx;const dk2=el.closest('.deck');if(dk2&&el.dataset.a)return'da:'+dk2.id+':'+el.dataset.a;return null}
function elFind(k){if(k[0]=='#')return $(k);if(k.startsWith('k:'))return $('[data-k="'+k.slice(2)+'"]');if(k.startsWith('kn:')){const p=k.split(':');return $('.knob[data-d="'+p[1]+'"][data-b="'+p[2]+'"]')}
 if(k.startsWith('da:')){const p=k.split(':');return $('#'+p[1]+' [data-a="'+p[2]+'"]')}if(k.startsWith('hc:'))return $('[data-hc="'+k.slice(3)+'"]');if(k.startsWith('lp:'))return $('[data-loop="'+k.slice(3)+'"]');if(k.startsWith('fx:'))return $('[data-fx="'+k.slice(3)+'"]');return null}
function midiApply(k,v,on){const el=elFind(k);if(!el)return;
 if(el.type=='range'){el.value=+el.min+(+el.max-+el.min)*v/127;el.dispatchEvent(new Event('input',{bubbles:true}));return}
 if(el.classList.contains('knob')){setKnob(el.dataset.d,el.dataset.b,v/127*2-1);return}
 if(el.hasAttribute('data-pad')){el.dispatchEvent(new Event(on?'pointerdown':'pointerup',{bubbles:true}));return}
 if(on)el.click()}
function onMidi(m){const s=m.data[0],a=m.data[1],b=m.data[2],t=s&0xf0,ch=s&15;if(s>=0xf0)return;let key,note=false,on;
 if(t==0x90||t==0x80){key='n:'+ch+':'+a;note=true;on=t==0x90&&b>0}else if(t==0xB0){key='c:'+ch+':'+a;on=b>63}else return;
 if(P.learn==2){P.map[key]=P.learnEl;P.learn=0;S('yaps_midi_map',JSON.stringify(P.map));toast('Mapped. Tap LEARN again to map another control.');refresh();return}
 const tk=P.map[key];if(!tk)return;const el=elFind(tk);if(!el)return;
 if(note){midiApply(tk,b,on)}else if(el.type=='range'||el.classList.contains('knob'))midiApply(tk,b,on);else if(P.ml[key]!==on){P.ml[key]=on;midiApply(tk,b,on)}}
function midiOn(){if(!navigator.requestMIDIAccess){toast('This browser has no MIDI support. Try Chrome or Edge on Android or desktop.');return}
 navigator.requestMIDIAccess().then(a=>{P.midi=a;const w=()=>{a.inputs.forEach(i=>{i.onmidimessage=onMidi});refresh()};a.onstatechange=w;w();toast('MIDI on')}).catch(()=>toast('MIDI permission was refused'))}
document.addEventListener('pointerdown',e=>{if(P.learn!==1)return;const el=e.target.closest('button,input[type=range],.knob');
 if(!el||el.closest('header,nav,dialog,[data-nolearn]'))return;const k=elKey(el);if(!k){toast('That control can’t be mapped');return}
 e.preventDefault();e.stopPropagation();P.learnEl=k;P.learn=2;P.swallow=true;setTimeout(()=>{P.swallow=false},700);toast('Now press or move a control on your MIDI device');refresh()},true);
document.addEventListener('click',e=>{if(P.swallow&&e.target.closest('button,input[type=range],.knob')&&!e.target.closest('[data-nolearn]')){e.preventDefault();e.stopPropagation();P.swallow=false}},true);

/* ---------- UI ---------- */
const PAD_COL=['#ff3b5c','#ff8a3b','#ffd35c','#7bf05a','#19e6c3','#19a8ff','#8b5cf6','#e040fb'];
const ROLL=[.0625,.125,.25,.5,1,2,4,8],RL=['1/16','1/8','1/4','1/2','1','2','4','8'],JMP=[-32,-16,-8,-4,4,8,16,32];
const deckRow=(L,inner)=>'<div class="prow"><b class="'+(L=='B'?'p':'')+'">'+L+'</b>'+inner+'</div>';
const both=f=>f('A')+f('B');
root.innerHTML='<div class="pro-bar"><button class="pro-t" id="proTgl" aria-expanded="true">PRO CONSOLE <span id="proTglS">▾</span></button><div class="pro-tabs" role="tablist">'+
 [['wave','WAVE'],['stems','STEMS'],['pads','PADS'],['fx','FX'],['mix','MIXER+'],['smp','SAMPLER'],['live','MIDI · SET']].map(t=>'<button class="sm" role="tab" data-tab="'+t[0]+'" data-k="tab-'+t[0]+'">'+t[1]+'</button>').join('')+
 '</div><button class="sm" id="proX" aria-label="Close pro console" data-nolearn>✕</button></div><div class="pro-body">'+
/* WAVE */
'<div class="pro-pane" data-p="wave"><div class="pz"><canvas id="pzc" aria-label="Scrolling waveforms for both decks"></canvas></div>'+
 '<div class="prow"><span class="pl">ZOOM</span><input type="range" id="pzoom" min="2" max="30" value="8" aria-label="Waveform zoom" style="flex:0 1 150px"><output id="pzo">8 s</output><span class="pl">PHASE</span><div class="phm" aria-hidden="true"><b></b><i id="phi"></i></div><output id="pph">—</output></div>'+
 '<div class="pgrid"><div class="pcard"><div class="hd">KEY &amp; TEMPO</div>'+both(L=>deckRow(L,'<button class="sm" data-act="kbadge" data-d="'+L+'" id="kb'+L+'">KEY —</button><button class="sm" data-act="kl" data-d="'+L+'" id="kl'+L+'">KEY LOCK</button><button class="sm" data-act="ks" data-d="'+L+'" data-v="-1" aria-label="Key down">−</button><output id="ks'+L+'">0</output><button class="sm" data-act="ks" data-d="'+L+'" data-v="1" aria-label="Key up">+</button><button class="sm" data-act="ksync" data-d="'+L+'">KEY SYNC</button>'))+'<div class="pnote" id="kcomp">Load two tracks to see harmonic compatibility.</div></div>'+
 '<div class="pcard"><div class="hd">BEAT JUMP &amp; PITCH RANGE</div>'+both(L=>deckRow(L,[-16,-4,-1,1,4,16].map(n=>'<button class="sm" data-act="bj" data-d="'+L+'" data-v="'+n+'" aria-label="Jump '+n+' beats">'+(n>0?'+':'')+n+'</button>').join('')+'<button class="sm" data-act="rev" data-d="'+L+'">⟲ REVERSE</button>'))+'<div class="prow"><span class="pl">PITCH RANGE</span>'+[8,16,50].map(n=>'<button class="sm" data-act="prange" data-v="'+n+'" id="pr'+n+'" aria-pressed="'+(n==16)+'">±'+n+'%</button>').join('')+'</div><div class="pnote">Beat jump moves the playhead by whole beats. Pitch range sets how far the tempo fader can go, from fine ±8% up to ±50% for big tempo changes.</div></div>'+'<div class="pcard"><div class="hd">BEAT GRID &amp; MODES</div>'+both(L=>deckRow(L,'<button class="sm" data-act="grid" data-d="'+L+'" data-v="half">½</button><button class="sm" data-act="grid" data-d="'+L+'" data-v="dbl">×2</button><button class="sm" data-act="grid" data-d="'+L+'" data-v="l" aria-label="Nudge grid earlier">◂ GRID</button><button class="sm" data-act="grid" data-d="'+L+'" data-v="r" aria-label="Nudge grid later">GRID ▸</button><button class="sm" data-act="grid" data-d="'+L+'" data-v="set">SET 1</button>'))+
  '<div class="prow"><button class="sm" id="pQ" data-act="q" aria-pressed="true">QUANTIZE</button><button class="sm" id="pSl" data-act="slip" aria-pressed="true">SLIP</button></div><div class="pnote">SET 1 puts the first beat at the playhead. Quantize snaps cues, loops and jumps to the beat grid. Slip lets the track carry on underneath loops and spins.</div></div></div></div>'+
/* STEMS */
'<div class="pro-pane" data-p="stems"><div class="pgrid"><div class="pcard"><div class="hd">STEMS · LIVE SPLIT</div>'+
 both(L=>deckRow(L,['voc|VOCAL','mel|MELODY','bas|BASS','hat|HI-END'].map(s=>{s=s.split('|');return'<button class="sm '+(L=='B'?'pu':'')+'" data-act="stem" data-d="'+L+'" data-s="'+s[0]+'" id="st'+L+s[0]+'" aria-pressed="true">'+s[1]+'</button>'}).join('')+'<button class="sm" data-act="acap" data-d="'+L+'">ACAPELLA</button><button class="sm" data-act="inst" data-d="'+L+'">INSTRUMENTAL</button><button class="sm" data-act="stall" data-d="'+L+'">ALL</button>'))+
 '<div class="prow"><button class="k pl" data-act="mash" style="width:auto;padding:10px 16px">MASHUP · A beat + B vocal</button><button class="k" data-act="mash2" style="width:auto;padding:10px 16px">MASHUP · B beat + A vocal</button></div>'+
 '<div class="pnote">Stems are estimated in your browser from frequency and stereo position (vocal and centre vs. sides, bass, highs), so some bleed is normal. Tap a stem to mute it. For studio-grade stems, use REAL STEMS below.</div></div>'+
 '<div class="pcard"><div class="hd">REAL STEMS · AI BACKEND</div><div class="prow"><input type="text" id="rsUrl" inputmode="url" autocomplete="off" aria-label="Stems API URL" placeholder="https://your-backend.example.com/api/ai/stems" style="flex:1;min-width:0;min-height:38px;padding:0 10px;border-radius:10px;border:1px solid var(--bd);background:var(--s1);color:var(--tx);font:inherit"><button class="sm" data-act="rsurl">SAVE</button></div>'+
 both(L=>deckRow(L,'<button class="k" data-act="rssep" data-d="'+L+'" id="rsS'+L+'" style="width:auto;padding:8px 12px">SEPARATE</button><button class="sm" data-act="rson" data-d="'+L+'" id="rsO'+L+'" aria-pressed="false">REAL STEMS</button>'))+
 '<div class="pnote" id="rsNote">Sends the track to your own backend, which returns clean vocals, drums, bass and other. Results are saved on this device, so each track is separated once. Uses about 4× the track&rsquo;s memory, so very long tracks are refused. The four buttons above then control the real stems (HI-END becomes DRUMS, MELODY becomes OTHER).</div></div></div></div>'+
/* PADS */
'<div class="pro-pane" data-p="pads"><div class="prow"><span class="pl">DECK</span><button class="sm" data-act="psel" data-v="0" id="psA">A</button><button class="sm pu" data-act="psel" data-v="1" id="psB">B</button><span class="pl">MODE</span>'+
 [['cue','CUES'],['roll','ROLL'],['jump','JUMP'],['slice','SLICER']].map(m=>'<button class="sm" data-act="pmode" data-v="'+m[0]+'" id="pm-'+m[0]+'">'+m[1]+'</button>').join('')+'<button class="sm" data-act="pdel" id="pdel">DELETE</button></div>'+
 '<div class="ppads" id="ppads">'+PAD_COL.map((c,i)=>'<button class="pp" data-pad="'+i+'" data-k="pad'+i+'" style="--pc:'+c+'"></button>').join('')+'</div>'+
 '<div class="pcard" style="margin-top:10px"><div class="hd">LOOP · SELECTED DECK</div><div class="prow">'+[['.25','1/4'],['.5','1/2'],['1','1'],['2','2'],['4','4'],['8','8'],['16','16'],['32','32']].map(l=>'<button class="sm" data-act="aloop" data-v="'+l[0]+'" id="al'+l[0].replace('.','_')+'">'+l[1]+'</button>').join('')+'</div>'+
 '<div class="prow"><button class="sm" data-act="lin">IN</button><button class="sm" data-act="lout">OUT</button><button class="sm" data-act="lhalf">½</button><button class="sm" data-act="ldbl">×2</button><button class="sm" data-act="lre">RELOOP</button><button class="sm" data-act="loff">EXIT</button><output id="pLoopO"></output></div></div></div>'+
/* FX */
'<div class="pro-pane" data-p="fx"><div class="pgrid"><div class="pcard"><div class="hd">BEAT FX RACK</div><div class="prow"><select id="fxSel" class="sm" aria-label="Effect" style="flex:1">'+Object.keys(FXN).map(k=>'<option value="'+k+'">'+FXN[k]+'</option>').join('')+'</select>'+
 '<select id="fxDiv" class="sm" aria-label="Beat length"><option value=".25">1/4 beat</option><option value=".5" selected>1/2 beat</option><option value=".75">3/4 beat</option><option value="1">1 beat</option><option value="2">2 beats</option><option value="4">4 beats</option></select></div>'+
 '<div class="prow"><span class="pl">ON</span>'+[['A','DECK A'],['B','DECK B'],['M','MASTER']].map(t=>'<button class="sm" data-act="fxt" data-v="'+t[0]+'" id="fxt'+t[0]+'">'+t[1]+'</button>').join('')+'</div>'+
 '<div class="prow"><span class="pl">PARAM</span><input type="range" id="fxP" min="0" max="100" value="50" aria-label="Effect parameter" style="flex:1"></div><div class="prow"><span class="pl">MIX</span><input type="range" id="fxM" min="0" max="100" value="50" aria-label="Effect mix" style="flex:1"></div>'+
 '<div class="prow"><button class="k pl" id="fxGo" data-act="fxgo" style="flex:1;width:auto;padding:12px">FX OFF</button><button class="k" id="fxHold" data-pad="x" data-hold="1" style="flex:1;width:auto;padding:12px">HOLD</button></div></div>'+
 '<div class="pcard"><div class="hd">TRANSITIONS · SELECTED DECK</div><div class="prow"><span class="pl">DECK</span><button class="sm" id="psA2" data-act="psel" data-v="0" aria-pressed="true">DECK A</button><button class="sm" id="psB2" data-act="psel" data-v="1" aria-pressed="false">DECK B</button></div><div class="prow"><button class="k" data-act="brake">BRAKE</button><button class="k" data-act="spin">BACKSPIN</button><button class="k" data-act="eout">ECHO OUT</button></div><div class="hd" style="margin-top:10px">SWITCH SONG · SELECTED DECK → OTHER DECK</div><div class="prow"><button class="k" data-act="swap" data-v="cut">CUT</button><button class="k" data-act="swap" data-v="fade">CROSSFADE</button><button class="k" data-act="swap" data-v="slow">SLOW BLEND</button><button class="k" data-act="swap" data-v="echo">ECHO SWAP</button><button class="k" data-act="swap" data-v="spin">BACKSPIN SWAP</button><button class="k" data-act="swap" data-v="brake">BRAKE SWAP</button></div><div class="pnote" id="swapNote">Starts the other deck and hands the music over. Cut is instant, Crossfade takes 4s, Slow blend 12s. Echo, Backspin and Brake swaps use the effect on the outgoing song while the next one comes in.</div><div class="pnote">Brake slows the deck to a stop. Backspin rewinds the last second and drops back in (with Slip on, in time). Echo out cuts the deck into an echo tail, then stops it. Pick the deck with the DECK A / DECK B buttons above.</div></div></div></div>'+
/* MIXER */
'<div class="pro-pane" data-p="mix"><div class="pgrid"><div class="pcard"><div class="hd">CHANNELS</div>'+
 both(L=>'<div class="prow"><b class="'+(L=='B'?'p':'')+'">'+L+'</b><span class="pl">GAIN</span><input type="range" data-in="gain" data-d="'+L+'" min="-12" max="12" step=".5" value="0" aria-label="Gain deck '+L+'" style="flex:1"><output id="mg'+L+'">0 dB</output></div>'+
  '<div class="prow"><b class="'+(L=='B'?'p':'')+'" style="visibility:hidden">'+L+'</b><span class="pl">FILTER</span><input type="range" data-in="flt" data-d="'+L+'" min="-100" max="100" value="0" aria-label="Filter deck '+L+'" style="flex:1"><button class="sm" data-act="fltc" data-d="'+L+'">0</button></div>'+
  '<div class="prow"><b class="'+(L=='B'?'p':'')+'" style="visibility:hidden">'+L+'</b><span class="pl">KILL</span>'+['lo|LOW','mi|MID','hi|HIGH'].map(k=>{k=k.split('|');return'<button class="sm" data-act="kill" data-d="'+L+'" data-b="'+k[0]+'" id="kl'+L+k[0]+'">'+k[1]+'</button>'}).join('')+'</div>')+
 '<div class="pnote">Filter: left of centre is a low-pass sweep, right of centre a high-pass sweep. Tap the number to centre it.</div></div>'+
 '<div class="pcard"><div class="hd">CROSSFADER CURVE</div><div class="prow">'+[['smooth','SMOOTH'],['blend','BLEND'],['cut','CUT']].map(c=>'<button class="sm" data-act="xc" data-v="'+c[0]+'" id="xc-'+c[0]+'">'+c[1]+'</button>').join('')+'<button class="sm" data-act="xrev" id="xrev" aria-pressed="false">REVERSE</button></div><div class="pnote">Smooth is an equal-power blend. Blend keeps both decks at full level through the middle. Cut opens each deck almost instantly, for scratching and fast mixing.</div></div></div></div>'+
/* SAMPLER */
'<div class="pro-pane" data-p="smp"><div class="prow"><span class="pl">TAP A SLOT TO</span>'+[['play','PLAY'],['load','LOAD FILE'],['capA','CAPTURE A'],['capB','CAPTURE B'],['clear','CLEAR']].map(a=>'<button class="sm" data-act="smact" data-v="'+a[0]+'" id="sa-'+a[0]+'">'+a[1]+'</button>').join('')+'</div>'+
 '<div class="prow"><span class="pl">PLAY MODE</span>'+[['one','ONE-SHOT'],['loop','LOOP'],['hold','HOLD']].map(a=>'<button class="sm" data-act="smmode" data-v="'+a[0]+'" id="sm-'+a[0]+'">'+a[1]+'</button>').join('')+'<span class="pl">VOL</span><input type="range" id="smV" min="0" max="100" value="80" aria-label="Sample volume" style="flex:1 1 90px"></div>'+
 '<div class="ppads" id="smpads">'+PAD_COL.map((c,i)=>'<button class="pp" data-sp="'+i+'" data-pad="s'+i+'" data-k="smp'+i+'" style="--pc:'+c+'"></button>').join('')+'</div><div class="pnote">Keys Z X C V B N M , fire slots 1–8. Capture grabs the last 4 beats (or the active loop) from a deck. Samples live in memory until you leave the page.</div></div>'+
/* LIVE */
'<div class="pro-pane" data-p="live"><div class="pgrid"><div class="pcard" data-nolearn><div class="hd">MIDI CONTROLLER</div><div class="prow"><button class="sm" id="midiEn" data-act="midi" data-nolearn>ENABLE MIDI</button><button class="sm" id="midiLn" data-act="learn" data-nolearn>LEARN</button><button class="sm" id="midiCl" data-act="mclear" data-nolearn>CLEAR MAPS</button></div><div class="pnote" id="midiSt">Plug in a DJ controller or MIDI keyboard, enable MIDI, tap LEARN, tap any on-screen control, then press or move the control on your device.</div></div>'+
 '<div class="pcard" data-nolearn><div class="hd">SETLIST · THIS SESSION</div><div class="setl" id="setl">No tracks loaded yet.</div><div class="prow"><button class="sm" data-act="setcopy" data-nolearn>COPY</button><button class="sm" data-act="setpub" data-nolearn>TO PUBLISH NOTES</button><button class="sm" data-act="setclr" data-nolearn>CLEAR</button></div></div></div></div></div>';

const $p=s=>root.querySelector(s),$$p=s=>[...root.querySelectorAll(s)],tabs=$$p('[data-tab]'),panes=$$p('[data-p]');
function setTab(t){P.tab=t;tabs.forEach(b=>b.classList.toggle('on',b.dataset.tab==t));panes.forEach(p=>p.classList.toggle('on',p.dataset.p==t));S('yapsProTab',t);refreshPads()}

/* pads */
function padLabel(i){const d=D[P.sel];if(P.pad=='cue'){const t=d.hc[i];return(i+1)+'<small>'+(t==null?'empty':fmt(t))+'</small>'}
 if(P.pad=='roll')return RL[i]+'<small>beat roll</small>';if(P.pad=='jump')return(JMP[i]>0?'+':'')+JMP[i]+'<small>beats</small>';return(i+1)+'<small>slice</small>'}
function refreshPads(){const d=D[P.sel];$$p('#ppads .pp').forEach((b,i)=>{b.innerHTML=padLabel(i);b.classList.toggle('on',P.pad=='cue'&&d.hc[i]!=null)})}
const padHeld={};
function padDown(i){const d=D[P.sel];init();
 if(P.pad=='cue')cuePad(d,i);else if(P.pad=='roll')rollStart(d,ROLL[i]);else if(P.pad=='jump')jump(d,JMP[i]);
 else{if(needBpm(d))return;if(!d.rollOn)d.sb=snap(d,d.pos);rollStart(d,1,d.sb+i*60/d.bpm)}
 padHeld[i]=d;refreshPads()}
function padUp(i){const d=padHeld[i];delete padHeld[i];if(d&&(P.pad=='roll'||P.pad=='slice'))rollEnd(d)}
root.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-pad]');if(!b)return;e.preventDefault();
 if(b.dataset.sp!=null){padHeld['s'+b.dataset.sp]=1;smPad(+b.dataset.sp,true)}else if(b.id=='fxHold'){P.fxPrev=P.fx.on;b.classList.add('on');fxOn(true)}else padDown(+b.dataset.pad)});
const upAll=e=>{const b=e.target.closest&&e.target.closest('[data-pad]');if(!b)return;
 if(b.dataset.sp!=null){if(padHeld['s'+b.dataset.sp]){delete padHeld['s'+b.dataset.sp];smPad(+b.dataset.sp,false)}}else if(b.id=='fxHold'){b.classList.remove('on');if(P.fxPrev!==undefined){fxOn(P.fxPrev);P.fxPrev=undefined}}else padUp(+b.dataset.pad)};
root.addEventListener('pointerup',upAll);root.addEventListener('pointercancel',upAll);root.addEventListener('pointerleave',e=>{if(e.target.closest&&e.target.closest('.pp,#fxHold'))upAll(e)},true);

/* delegated clicks */
root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.tab){setTab(b.dataset.tab);return}
 if(b.id=='proTgl'){const c=root.classList.toggle('collapsed');b.setAttribute('aria-expanded',!c);$('#proTglS').textContent=c?'▸':'▾';return}
 if(b.id=='proX'){document.body.classList.remove('proOn');return}
 const a=b.dataset.act;if(!a)return;const d=b.dataset.d?L2D(b.dataset.d):D[P.sel],v=b.dataset.v;
 switch(a){
  case'kbadge':{const c=prompt('Key of Deck '+d.L+' in Camelot code (e.g. 8A, 11B). Leave empty to re-detect:',d.key2?camelot(d.key2):'');if(c===null)break;
   if(c.trim()===''&&d.buf){const k=detectKey(d.buf);if(k)d.key2={t:k.t,minor:k.minor,est:true}}else{const k=parseCam(c);if(k)d.key2={t:k.t,minor:k.minor,est:false};else toast('Use a code like 8A or 11B')}if(window.libStore)libStore(d);break}
  case'bj':{if(needBpm(d))break;const was=d.on,np=clamp(d.pos+ +v*60/d.bpm,0,Math.max(0,d.dur-.1));if(was)stopD(d);d.pos=np;if(was)play(d);else ui(d);break}
  case'prange':{const r=+v;D.forEach(k=>{const el=$('#deck'+k.L).querySelector('[data-a=pitch]');el.min=-r;el.max=r;k.pitch=clamp(k.pitch,-r,r);setPitch(k)});[8,16,50].forEach(n=>{const e=$('#pr'+n);if(e)e.setAttribute('aria-pressed',n==r)});toast('Pitch range ±'+r+'%');break}
  case'kl':if(needWk())break;d.kl=!d.kl;applyKey(d);break;
  case'ks':if(needWk())break;d.ks=clamp(d.ks+ +v,-6,6);applyKey(d);break;
  case'ksync':keySync(d);break;
  case'grid':if(needBpm(d))break;{const sp=60/d.bpm;if(v=='half')d.bpm=clamp(d.bpm/2,40,250);else if(v=='dbl')d.bpm=clamp(d.bpm*2,40,250);else if(v=='l'||v=='r')d.beat0=(((d.beat0||0)+(v=='l'?-.01:.01))%sp+sp)%sp;else{d.beat0=((d.pos%sp)+sp)%sp;toast('Beat 1 set on Deck '+d.L)}
   d.detected=false;if(d.sync)doSync(d,1);ui(d)}break;
  case'q':P.q=!P.q;break;case'slip':P.slip=!P.slip;break;
  case'stem':stemSet(d,{[b.dataset.s]:d.stem[b.dataset.s]?0:1});break;
  case'rsurl':{const u=$p('#rsUrl').value.trim();if(u&&!okUrl(u)){toast('That URL isn’t valid. Use https:// (http:// only for localhost).');break}S('yaps_ai_stems_url',u);toast(u?'Stems API URL saved':'Stems API URL cleared');break}
  case'rssep':rsSeparate(d);break;
  case'rson':if(rsAct(d))rsSet(d,false);else if(d.buf8&&d.buf8of===d.buf)rsSet(d,true);else rsSeparate(d);break;
  case'acap':stemSet(d,{voc:1,mel:0,bas:0,hat:0});break;case'inst':stemSet(d,{voc:0,mel:1,bas:1,hat:1});break;case'stall':stemSet(d,{voc:1,mel:1,bas:1,hat:1});break;
  case'mash':case'mash2':{const bt=a=='mash'?D[0]:D[1],vo=a=='mash'?D[1]:D[0];stemSet(bt,{voc:0,mel:1,bas:1,hat:1});stemSet(vo,{voc:1,mel:0,bas:0,hat:0});
   if(bt.bpm&&vo.bpm&&!vo.sync)doSync(vo);const x=$('#xf');x.value=50;x.dispatchEvent(new Event('input',{bubbles:true}));toast('Mashup: Deck '+bt.L+' beat + Deck '+vo.L+' vocal');break}
  case'psel':P.sel=+v;break;case'pmode':P.pad=v;break;case'pdel':P.del=!P.del;break;
  case'aloop':autoLoop(d,+v);break;
  case'lin':d.lin=snap(d,d.pos);toast('Loop IN set');break;
  case'lout':if(d.lin==null){toast('Set a loop IN first');break}if(!loopSet(d,d.lin,Math.max(d.lin+.05,snap(d,d.pos))))toast('Start the deck and move past the IN point');break;
  case'lhalf':if(d.xl)loopSet(d,d.xl[0],d.xl[0]+(d.xl[1]-d.xl[0])/2);break;
  case'ldbl':if(d.xl)loopSet(d,d.xl[0],d.xl[0]+(d.xl[1]-d.xl[0])*2);break;
  case'lre':if(d.xlast){if(!d.xl)loopSet(d,d.xlast[0],d.xlast[1])}else toast('No loop yet. Pick a size or set IN/OUT.');break;
  case'loff':loopOff(d);break;
  case'fxt':init();P.fx.tg=v;if(P.fx.on)fxWire();break;
  case'fxgo':fxOn(!P.fx.on);break;
  case'swap':if(typeof window.trSwap==='function')window.trSwap(v,d);else toast('Switch song is not ready yet. Reload the page and try again.');break;
  case'brake':if(!deckLive(d))break;brake(d);break;case'rev':if(!deckLive(d))break;revPlay(d);break;case'spin':if(!deckLive(d))break;spin(d);break;case'eout':if(!deckLive(d))break;echoOut(d);break;
  case'fltc':d.flt=0;{const r=$p('[data-in=flt][data-d="'+d.L+'"]');r.value=0}applyMixer(d);break;
  case'kill':init();kill(d,b.dataset.b);break;
  case'xc':window.proXf.curve=v;xfade();break;
  case'xrev':window.proXf.rev=!window.proXf.rev;xfade();break;
  case'smact':P.smAct=v;break;case'smmode':P.smMode=v;break;
  case'midi':midiOn();break;
  case'learn':P.learn=P.learn?0:1;if(P.learn){if(!P.midi)midiOn();toast('Tap the on-screen control you want to map')}break;
  case'mclear':P.map={};S('yaps_midi_map','{}');toast('MIDI mappings cleared');break;
  case'setcopy':{const t=setText();(navigator.clipboard?navigator.clipboard.writeText(t).then(()=>toast('Setlist copied'),()=>prompt('Copy your setlist:',t)):Promise.resolve(prompt('Copy your setlist:',t)));break}
  case'setpub':{const pd=$('#pd');if(pd){pd.value=R.log&&R.log.length?withTracklist('',true):('Tracklist:\n'+setText()).slice(0,500);toast('Added to the Publish description')}break}
  case'setclr':P.set=[];P.t0=0;break;
 }refresh()});
root.addEventListener('input',e=>{const r=e.target;
 if(r.id=='pzoom'){P.zoom=+r.value;$('#pzo').textContent=P.zoom+' s';S('yapsZoom',P.zoom)}
 else if(r.dataset.in){const d=L2D(r.dataset.d);init();if(r.dataset.in=='gain'){d.gainDb=+r.value;$('#mg'+d.L).textContent=(d.gainDb>0?'+':'')+d.gainDb+' dB'}else d.flt=+r.value/100;applyMixer(d)}
 else if(r.id=='fxP'){init();P.fx.p=r.value/100;if(P.fx.upd)P.fx.upd()}
 else if(r.id=='fxM'){init();P.fx.m=r.value/100;fxMix()}
 else if(r.id=='smV'){P.smV=r.value/100;if(P.smG)P.smG.gain.value=P.smV}});
root.addEventListener('change',e=>{const r=e.target;if(r.id=='fxSel'){init();P.fx.id=r.value;fxBuild()}else if(r.id=='fxDiv'){P.fx.div=+r.value;if(P.fx.upd)P.fx.upd()}});

/* scrolling waveform: drag to seek */
const zc=$p('#pzc'),zx=zc.getContext('2d');let zd=null;
zc.addEventListener('pointerdown',e=>{const r=zc.getBoundingClientRect(),li=(e.clientY-r.top)<r.height/2?0:1,d=D[li];if(!d.buf)return;zc.setPointerCapture(e.pointerId);
 zd={d,x:e.clientX,p:d.pos,was:d.on};if(zd.was)stopD(d)});
zc.addEventListener('pointermove',e=>{if(!zd)return;const w=zc.clientWidth;zd.d.pos=clamp(zd.p-(e.clientX-zd.x)*P.zoom/w,0,zd.d.dur)});
const zup=()=>{if(!zd)return;const z=zd;zd=null;if(z.was)play(z.d)};zc.addEventListener('pointerup',zup);zc.addEventListener('pointercancel',zup);
function drawZ(){const w=zc.clientWidth,h=zc.clientHeight,r=devicePixelRatio||1;if(!w||!h)return;if(zc.width!==Math.round(w*r)||zc.height!==Math.round(h*r)){zc.width=Math.round(w*r);zc.height=Math.round(h*r)}
 zx.setTransform(r,0,0,r,0,0);zx.clearRect(0,0,w,h);const spx=P.zoom/w;
 D.forEach((d,li)=>{const y0=li*h/2,lh=h/2,mid=y0+lh/2;zx.fillStyle='rgba(255,255,255,.04)';zx.fillRect(0,y0+(li?1:0),w,lh-1);
  if(d.dur){const tl=d.pos-w/2*spx,B=d.bands,bw=2;
   for(let px=0;px<w;px+=bw){const t=tl+px*spx;if(t<0||t>d.dur)continue;
    if(B){const i=Math.min(B.n-1,Math.floor(t*100)),sc=B.sc;
     zx.fillStyle=d.c;let a=Math.min(1,B.lo[i]*sc)*lh*.46;zx.fillRect(px,mid-a,bw,a*2);
     zx.fillStyle='rgba(255,255,255,.78)';a=Math.min(1,B.mi[i]*sc*1.5)*lh*.34;zx.fillRect(px,mid-a,bw,a*2);
     zx.fillStyle='rgba(255,211,92,.95)';a=Math.min(1,B.hi[i]*sc*2.2)*lh*.22;zx.fillRect(px,mid-a,bw,a*2)}
    else{zx.fillStyle=d.dm;const a=d.pk[Math.min(d.pk.length-1,Math.floor(t/d.dur*d.pk.length))]*lh*.8;zx.fillRect(px,mid-a/2,bw,a)}}
   if(d.bpm){const sp=60/d.bpm,b0=d.beat0||0,tr=tl+w*spx;for(let k=Math.ceil((tl-b0)/sp);b0+k*sp<=tr;k++){const x=(b0+k*sp-tl)/spx,bar=((k%4)+4)%4==0;zx.fillStyle=bar?'rgba(255,255,255,.7)':'rgba(255,255,255,.25)';zx.fillRect(x,y0+(bar?0:lh*.3),1,bar?lh:lh*.4)}}
   if(d.xl){const x1=(d.xl[0]-tl)/spx,x2=(d.xl[1]-tl)/spx;zx.fillStyle='rgba(255,211,92,.22)';zx.fillRect(x1,y0,x2-x1,lh)}
   zx.font='700 10px Archivo Narrow, sans-serif';d.hc.forEach((t,i)=>{if(t==null)return;const x=(t-tl)/spx;if(x<-4||x>w+4)return;zx.fillStyle=PAD_COL[i%8];zx.fillRect(x,y0,2,lh);zx.fillRect(x,y0,12,11);zx.fillStyle='#000';zx.fillText(i+1,x+3,y0+9)})}
  zx.fillStyle='#fff';zx.fillRect(w/2-1,y0,2,lh);zx.font='800 12px Archivo Narrow, sans-serif';zx.fillStyle=d.c;zx.fillText(d.L+(d.t&&d.t!=='Empty deck'?'  '+d.t.slice(0,28):''),6,y0+13)})}

/* refresh: state → classes/text */
function refresh(){if(!root)return;
 const on=(sel,v)=>{const e=$p(sel);if(e)e.classList.toggle('on',!!v)},ap=(sel,v)=>{const e=$p(sel);if(e){e.classList.toggle('on',!!v);e.setAttribute('aria-pressed',!!v)}};
 ap('#pQ',P.q);ap('#pSl',P.slip);
 D.forEach(d=>{const L=d.L,ek=effKey(d),kb=$p('#kb'+L);if(kb){kb.textContent=ek?'KEY '+ek.code+' · '+ek.name+(d.key2.est?' ~':''):(d.buf?'KEY …':'KEY —');kb.title='Tap to enter the key manually'}
  on('#kl'+L,d.kl);const ks=$p('#ks'+L);if(ks)ks.textContent=(d.ks>0?'+':'')+d.ks;
  for(const k in d.stem)ap('#st'+L+k,d.stem[k]);['lo','mi','hi'].forEach(b=>on('#kl'+L+b,d.kill[b]))});
 const c=compat(effKey(D[0])&&effKey(D[0]).code,effKey(D[1])&&effKey(D[1]).code),ce=$p('#kcomp');if(ce){ce.textContent=c?'Harmonic match: '+c[0]:'Load two tracks to see harmonic compatibility.';ce.className='pnote '+(c?c[1]:'')}
 ap('#psA',P.sel==0);ap('#psB',P.sel==1);ap('#psA2',P.sel==0);ap('#psB2',P.sel==1);['cue','roll','jump','slice'].forEach(m=>on('#pm-'+m,P.pad==m));on('#pdel',P.del);
 const d=D[P.sel];[.25,.5,1,2,4,8,16,32].forEach(b=>on('#al'+String(b).replace('.','_'),d.xl&&d.bpm&&Math.abs(d.xl[1]-d.xl[0]-b*60/d.bpm)<.002));
 const lo=$p('#pLoopO');if(lo)lo.textContent=d.xl?((d.xl[1]-d.xl[0])*(d.bpm?d.bpm/60:1)).toFixed(d.bpm?2:0)+(d.bpm?' beats':' s'):'';
 refreshPads();
 const R=P.fx;['A','B','M'].forEach(t=>on('#fxt'+t,R.tg==t));const g=$p('#fxGo');if(g){g.textContent=R.on?'FX ON':'FX OFF';g.classList.toggle('on',R.on)}
 ['play','load','capA','capB','clear'].forEach(a=>on('#sa-'+a,P.smAct==a));['one','loop','hold'].forEach(a=>on('#sm-'+a,P.smMode==a));
 $$p('#smpads .pp').forEach((b,i)=>{const s=P.sm[i];b.innerHTML=(i+1)+'<small>'+(s?s.name:'empty')+'</small>';b.classList.toggle('on',!!(s&&s.src))});
 ['smooth','blend','cut'].forEach(k=>on('#xc-'+k,window.proXf.curve==k));ap('#xrev',window.proXf.rev);
 on('#midiLn',P.learn);const ms=$p('#midiSt');if(ms){const n=P.midi?[...P.midi.inputs.values()].map(i=>i.name):[];
  ms.textContent=P.learn==1?'Learn: tap the on-screen control to map.':P.learn==2?'Learn: now press or move the control on your device.':(P.midi?(n.length?'Connected: '+n.join(', ')+' · '+Object.keys(P.map).length+' mapped':'MIDI on. No device found yet. Plug one in.'):'Plug in a DJ controller or MIDI keyboard, enable MIDI, tap LEARN, tap any on-screen control, then press or move the control on your device.')}
 if(P.wk===undefined&&P.nowk)$$p('#klA,#klB').forEach(e=>e.title='Needs a browser with AudioWorklet')}
const setText=()=>P.set.map((s,i)=>{const t=Math.max(0,Math.round((s.at-P.t0)/1000));return String(i+1).padStart(2,'0')+'. '+fmt(t)+'  '+(s.a&&s.a!=='Local file'?s.a+' – ':'')+s.t}).join('\n');
function refreshSet(){const e=$p('#setl');if(e)e.textContent=P.set.length?setText():'No tracks loaded yet.'}

/* main loop */
let lt=performance.now(),fn=0,vis=false;
(function lp(n){requestAnimationFrame(lp);const dt=Math.min(.1,(n-lt)/1e3);lt=n;fn++;
 D.forEach(d=>{if(d.on){if(d.slipRun)d.sp+=dt*rate(d);const s=d.src;if(s&&s.loop&&s.loopEnd>s.loopStart&&d.pos>=s.loopEnd)d.pos=s.loopStart+((d.pos-s.loopStart)%(s.loopEnd-s.loopStart));keyTick(d)}else{d.slipRun=false;d.xl=null}});
 if(fn%15==0){vis=!document.hidden&&root.getClientRects().length>0&&!root.classList.contains('collapsed')}
 if(vis){if(P.tab=='wave'&&fn%2==0){drawZ();
   if(fn%6==0){const A=D[0],B=D[1],o=$p('#pph'),i=$p('#phi');if(A.bpm&&B.bpm&&A.beat0!=null&&B.beat0!=null&&A.on&&B.on){const pa=((A.pos-A.beat0)/(60/A.bpm))%1,pb=((B.pos-B.beat0)/(60/B.bpm))%1;let df=(((pa-pb)%1)+1.5)%1-.5;const ms=df*60/eff(A)*1000;i.style.left=(50+df*100)+'%';o.textContent=(ms>0?'+':'')+Math.round(ms)+' ms';i.style.background=Math.abs(ms)<25?'#22e08a':'var(--rd)'}else{i.style.left='50%';o.textContent='—'}}}
  if(fn%10==0&&P.fx.on&&P.fx.upd)P.fx.upd();
  if(fn%20==0)refresh()}})(lt);

/* keyboard: sampler slots */
addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;const t=e.target;if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)&&t.type!=='range')return;if(document.querySelector('dialog[open]'))return;
 const i=SMK.indexOf(e.code);if(i<0)return;e.preventDefault();smFire(i,true)});
addEventListener('keyup',e=>{const i=SMK.indexOf(e.code);if(i>=0)smFire(i,false)});

/* open / close (sheet on phones in landscape) */
const po=$('#proOpen');if(po)po.onclick=()=>document.body.classList.toggle('proOn');
const ps=$('#proScrim');if(ps)ps.onclick=()=>document.body.classList.remove('proOn');
addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('proOn')});

/* audio graph, called from init() */
window.proInit=function(){if(P.inited||!C)return;P.inited=true;
 D.forEach(d=>{const g=()=>C.createGain();
  d.in.disconnect(d.lo);d.sIn=g();d.sDir=g();d.sSt=g();d.sOut=g();d.sSt.gain.value=0;d.kDir=g();d.kPs=g();d.kPs.gain.value=0;d.kOut=g();d.tg=g();
  d.in.connect(d.sIn);d.sIn.connect(d.sDir);d.sDir.connect(d.sOut);buildStems(d);d.sOut.connect(d.kDir);d.kDir.connect(d.kOut);d.kOut.connect(d.tg);d.tg.connect(d.lo);
  d.fl.disconnect(d.vg);d.hp2=bq('highpass',20);d.lp2=bq('lowpass',22000);d.pj=g();d.fl.connect(d.hp2);d.hp2.connect(d.lp2);d.lp2.connect(d.pj);d.pj.connect(d.vg);
  applyStems(d);applyMixer(d)});
 P.smG=C.createGain();P.smG.gain.value=P.smV;P.smG.connect(master);fxInit();loadWorklet()};
try{const z=+G('yapsZoom');if(z>=2&&z<=30){P.zoom=z;$p('#pzoom').value=z;$p('#pzo').textContent=z+' s'}}catch(e){}
/* ══════ PERSISTENCE · CLOUD PREP · REAL STEMS (added block) ══════ */
const RS_KEYS=['vocals','drums','bass','other'];
const okUrl=u=>{try{const x=new URL(u);return x.protocol==='https:'||(x.protocol==='http:'&&/^(localhost|127\.0\.0\.1)$/.test(x.hostname))}catch(e){return false}};
const fname=s=>String(s||'track').replace(/[^\w -]/g,'').trim().replace(/\s+/g,'-').slice(0,60)||'track';
/* --- IndexedDB: settings, sampler slots, per-track prep, cached stems --- */
const kvOpen=()=>new Promise((res,rej)=>{const r=indexedDB.open('yaps_studio_state_v1',1);r.onupgradeneeded=()=>{const db=r.result;['kv','prep','stems'].forEach(n=>{if(!db.objectStoreNames.contains(n))db.createObjectStore(n,{keyPath:'key'})})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function kvTx(store,mode,fn){const db=await kvOpen();return new Promise((res,rej)=>{const tx=db.transaction(store,mode),q=fn(tx.objectStore(store));tx.oncomplete=()=>{db.close();res(q&&q.result)};tx.onerror=tx.onabort=()=>{db.close();rej(tx.error||(q&&q.error))}})}
const kvGet=(s,k)=>kvTx(s,'readonly',o=>o.get(k)),kvPut=(s,v)=>kvTx(s,'readwrite',o=>o.put(v));
/* settings: quantize/slip, pad mode, FX choice, crossfader curve, sampler options */
const stSnap=()=>JSON.stringify({q:P.q,slip:P.slip,pad:P.pad,sel:P.sel,smAct:P.smAct,smMode:P.smMode,smV:P.smV,fx:{id:P.fx.id,tg:P.fx.tg,div:P.fx.div,p:P.fx.p,m:P.fx.m},xc:window.proXf.curve,xr:window.proXf.rev});
let stLast='',smLast='',ready=false;
async function stRestore(){try{const r=await kvGet('kv','settings');if(!r||!r.v)return;const v=r.v,f=v.fx||{};
 P.q=v.q!==false;P.slip=v.slip!==false;if(['cue','roll','jump','slice'].includes(v.pad))P.pad=v.pad;if(v.sel===0||v.sel===1)P.sel=v.sel;
 if(['play','load','capA','capB','clear'].includes(v.smAct))P.smAct=v.smAct;if(['one','loop','hold'].includes(v.smMode))P.smMode=v.smMode;if(isFinite(v.smV))P.smV=clamp(v.smV,0,1);
 if(FXN[f.id])P.fx.id=f.id;if(['off','A','B','M'].includes(f.tg))P.fx.tg=f.tg;if(isFinite(f.div))P.fx.div=f.div;if(isFinite(f.p))P.fx.p=clamp(f.p,0,1);if(isFinite(f.m))P.fx.m=clamp(f.m,0,1);
 if(['smooth','blend','cut'].includes(v.xc))window.proXf.curve=v.xc;window.proXf.rev=!!v.xr;
 $p('#fxSel').value=P.fx.id;const dv=[...$p('#fxDiv').options].find(o=>+o.value===P.fx.div);if(dv)$p('#fxDiv').value=dv.value;
 $p('#fxP').value=P.fx.p*100;$p('#fxM').value=P.fx.m*100;$p('#smV').value=P.smV*100;
 if(P.smG)P.smG.gain.value=P.smV;if(P.fx.in){fxBuild()}if(C)xfade()}catch(e){console.warn('Settings restore failed',e)}}
/* sampler slots (raw samples; rebuilt into AudioBuffers the first time they play) */
const smSig=()=>P.sm.map(s=>s?s.name+':'+(s.buf?s.buf.length:s.raw.ch[0].length):'-').join('|');
function hydSm(s){if(!s||s.buf||!s.raw||!C)return;try{const ch=s.raw.ch,b=C.createBuffer(ch.length,ch[0].length,s.raw.sr);ch.forEach((a,c)=>b.getChannelData(c).set(a));s.buf=b}catch(e){console.warn('Sampler slot unreadable',e)}}
async function smRestore(){try{const r=await kvGet('kv','sampler');if(!r||!Array.isArray(r.slots))return;
 r.slots.forEach((s,i)=>{if(s&&s.ch&&s.ch.length&&!P.sm[i])P.sm[i]={name:s.name,raw:{ch:s.ch,sr:s.sr},buf:null}})}catch(e){console.warn('Sampler restore failed',e)}}
function smSave(){const slots=P.sm.map(s=>s?{name:s.name,sr:s.raw?s.raw.sr:s.buf.sampleRate,ch:s.raw?s.raw.ch:Array.from({length:s.buf.numberOfChannels},(_,c)=>s.buf.getChannelData(c).slice())}:null);
 kvPut('kv',{key:'sampler',slots}).catch(e=>{if(e&&e.name==='QuotaExceededError')toast('Phone storage is full: sampler slots weren’t saved')})}
/* --- per-track prep: BPM, beat grid, cues. Local always; Supabase table track_prep when signed in --- */
const pkey=d=>d.tid?'c:'+d.tid:'f:'+(d.t||'')+'|'+Math.round(d.dur||0);
const pSig=d=>JSON.stringify({h:d.hc.map(x=>x==null?null:Math.round(x*1000)/1000),b:d.bpm?Math.round(d.bpm*10)/10:null,g:d.beat0!=null?Math.round(d.beat0*1000)/1000:null});
let cloudOff=false;
const cloudDead=e=>e&&(e.code==='42P01'||e.code==='PGRST205');
async function cloudGet(key){if(cloudOff||!sb||!user)return null;try{const r=await sb.from('track_prep').select('bpm,beat0,cues,updated_at').eq('user_id',user.id).eq('track_key',key).maybeSingle();if(r.error)throw r.error;return r.data}catch(e){if(cloudDead(e))cloudOff=true;else console.warn('Cloud prep read failed',e&&e.message);return null}}
async function cloudPut(rec){if(cloudOff||!sb||!user)return;try{const {error}=await sb.from('track_prep').upsert({user_id:user.id,track_key:rec.key,bpm:rec.bpm,beat0:rec.beat0,cues:rec.cues,updated_at:new Date(rec.t).toISOString()},{onConflict:'user_id,track_key'});if(error)throw error}catch(e){if(cloudDead(e))cloudOff=true;else console.warn('Cloud prep save failed',e&&e.message)}}
function applyPrep(d,r){const c=Array.isArray(r.cues)?r.cues:[];d.hc=Array.from({length:8},(_,i)=>c[i]!=null&&isFinite(c[i])?+c[i]:null);
 for(let i=0;i<4;i++){const b=$('[data-hc="'+d.L+i+'"]');if(b)b.classList.toggle('on',d.hc[i]!=null)}
 if(r.bpm>=40&&r.bpm<=250){d.bpm=+r.bpm;d.detected=false}if(r.beat0!=null&&isFinite(r.beat0))d.beat0=+r.beat0;ui(d);refresh()}
async function prepLoad(d,buf){const key=pkey(d);let loc=null;try{loc=await kvGet('prep',key)}catch(e){}
 const cl=await cloudGet(key),ct=cl?Date.parse(cl.updated_at)||0:0;let rec=loc;
 if(cl&&(!rec||ct>(rec.t||0))){rec={key,bpm:cl.bpm,beat0:cl.beat0,cues:cl.cues,t:ct};kvPut('prep',rec).catch(()=>{})}
 if(d.buf!==buf)return;
 if(rec){applyPrep(d,rec);if(rec.cues&&rec.cues.some(x=>x!=null)||rec.beat0!=null)toast('“'+d.t+'”: loaded your saved grid and cues')}
 if(loc&&(loc.t||0)>ct)cloudPut(loc);
 d._prepKey=key;d._prepSig=pSig(d);d._prepOK=true;
 kvGet('stems',key).then(c=>{if(c&&c.files&&d.buf===buf){d.rsCached=true;rsNote('Deck '+d.L+': saved stems found. Tap REAL STEMS to use them.')}}).catch(()=>{})}
setInterval(()=>{if(!ready)return;
 D.forEach(d=>{if(d.buf!==d._pb){d._pb=d.buf;d._prepOK=false;d.rsCached=false;if(d.rsOn||d.buf8){d.rsOn=false;d.buf8=null;d.buf8of=null;if(C)applyStems(d);refresh()}if(d.buf)prepLoad(d,d.buf);return}
  if(!d._prepOK||!d.buf)return;const s=pSig(d);if(s===d._prepSig)return;d._prepSig=s;
  const rec={key:d._prepKey,bpm:d.bpm||null,beat0:d.beat0!=null?d.beat0:null,cues:d.hc.map(x=>x==null?null:x),t:Date.now()};
  kvPut('prep',rec).catch(()=>{});cloudPut(rec)});
 const s1=stSnap();if(s1!==stLast){stLast=s1;kvPut('kv',{key:'settings',v:JSON.parse(s1)}).catch(()=>{})}
 const s2=smSig();if(s2!==smLast){smLast=s2;smSave()}},1500);
/* --- REAL STEMS: your backend separates the track once; the four stems are cached on this device --- */
const rsUrl=()=>(G('yaps_ai_stems_url')||AI_STEMS_API_URL||'').trim();
const rsBusy={};let rsMsg='';
function rsNote(m){rsMsg=m;const e=$p('#rsNote');if(e)e.textContent=m}
function rsGraph(d){if(d.rsSplit)return;d.rsSplit=C.createChannelSplitter(8);d.rsg=RS_KEYS.map((k,i)=>{const m=C.createChannelMerger(2),g=C.createGain();d.rsSplit.connect(m,i*2,0);d.rsSplit.connect(m,i*2+1,1);m.connect(g);g.connect(d.in);return g})}
function rsSet(d,on){if(on){if(!d.buf8||d.buf8of!==d.buf){toast('No real stems for this track yet. Tap SEPARATE.');return}init();rsGraph(d)}d.rsOn=!!on;applyStems(d);if(d.on)seek(d,d.pos);refresh()}
async function rsAuth(url){try{if(!sb)return{};const h=new URL(url);let ok=/\.supabase\.co$/.test(h.hostname);if(YAPS_API_URL)ok=ok||h.origin===new URL(YAPS_API_URL).origin;if(!ok)return{};const r=await sb.auth.getSession();return r.data&&r.data.session?{Authorization:'Bearer '+r.data.session.access_token}:{}}catch(e){return{}}}
async function tf(u,o,ms){const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);try{return await fetch(u,Object.assign({credentials:'omit',signal:ac.signal},o))}finally{clearTimeout(t)}}
async function errTxt(r){try{const j=await r.clone().json(),v=j.detail||j.error||j.message;if(v)return typeof v==='string'?v:JSON.stringify(v)}catch(e){}return'HTTP '+r.status}
function stemsOf(j){const s=j&&typeof j==='object'&&(j.stems||(j.result&&j.result.stems));if(!s)return null;const A={vocals:['vocals','vocal'],drums:['drums','drum'],bass:['bass'],other:['other','melody']},o={};
 for(const k of RS_KEYS){const f=A[k].find(n=>s[n]);if(!f)return null;const v=s[f];o[k]=typeof v==='string'?v:(v&&(v.url||v.audio_url));if(!o[k])return null}return o}
function wavBlob(b){const ch=Math.min(2,b.numberOfChannels),n=b.length,sr=b.sampleRate,ba=ch*2,dl=n*ba,ab=new ArrayBuffer(44+dl),v=new DataView(ab),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
 w(0,'RIFF');v.setUint32(4,36+dl,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ba,true);v.setUint16(32,ba,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,dl,true);
 const a0=b.getChannelData(0),a1=ch>1?b.getChannelData(1):a0;let o=44;for(let i=0;i<n;i++){let x=Math.max(-1,Math.min(1,a0[i]));v.setInt16(o,x<0?x*32768:x*32767,true);o+=2;if(ch>1){x=Math.max(-1,Math.min(1,a1[i]));v.setInt16(o,x<0?x*32768:x*32767,true);o+=2}}
 return new Blob([ab],{type:'audio/wav'})}
async function rsSource(d){if(d.tid){const t=library.find(x=>String(x.id)===String(d.tid));if(t){try{const ab=await getBuf(t,()=>{}),a=String(t.audio||''),mt=/\.wav$/i.test(a)?'audio/wav':/\.(m4a|mp4)$/i.test(a)?'audio/mp4':'audio/mpeg';return{blob:new Blob([ab],{type:mt}),name:a.split('/').pop()||'track.mp3'}}catch(e){}}}
 if(d.buf.length*Math.min(2,d.buf.numberOfChannels)*2/1048576>90)throw new Error('This track is too large to upload from the browser');return{blob:wavBlob(d.buf),name:fname(d.t)+'.wav'}}
async function rsBuild(d,buf,files){init();const sr=C.sampleRate,n=buf.length,cap=(matchMedia('(pointer:coarse)').matches?250:500)*1048576;
 if(n*32>cap)throw new Error('This track is too long for real stems on this device (about '+(Math.round(cap/(sr*32)/6)/10)+' min max)');
 const out=C.createBuffer(8,n,sr);
 for(let k=0;k<4;k++){rsNote('Deck '+d.L+': preparing '+RS_KEYS[k]+'…');const ab=await C.decodeAudioData(await files[RS_KEYS[k]].arrayBuffer());if(d.buf!==buf)return false;
  for(let c=0;c<2;c++){const s=ab.getChannelData(Math.min(c,ab.numberOfChannels-1));out.getChannelData(k*2+c).set(s.length>n?s.subarray(0,n):s)}}
 d.buf8=out;d.buf8of=buf;rsGraph(d);d.rsOn=true;applyStems(d);if(d.on)seek(d,d.pos);refresh();return true}
async function rsSeparate(d){if(!d.buf){toast('Load a track into Deck '+d.L+' first');return}if(rsBusy[d.L])return;
 const key=pkey(d),buf=d.buf;rsBusy[d.L]=true;rsNote('Deck '+d.L+': checking for saved stems…');
 try{let files=null;try{const c=await kvGet('stems',key);if(c&&c.files&&RS_KEYS.every(k=>c.files[k]))files=c.files}catch(e){}
  if(!files){const url=rsUrl();if(!url)throw new Error('Add your Stems API URL above first');if(!okUrl(url))throw new Error('The Stems API URL isn’t valid (use https://, or http:// for localhost)');if(!navigator.onLine)throw new Error('You’re offline. Separation needs your backend');
   rsNote('Deck '+d.L+': uploading track…');const src=await rsSource(d),fd=new FormData();fd.append('file',src.blob,src.name);fd.append('title',d.t||'');fd.append('stems',RS_KEYS.join(','));
   let r=await tf(url,{method:'POST',headers:Object.assign({Accept:'application/json'},await rsAuth(url)),body:fd},180000);if(!r.ok)throw new Error(await errTxt(r));
   let j;try{j=await r.json()}catch(e){throw new Error('The backend’s reply wasn’t JSON')}
   const t0=Date.now();let poll='';
   while(!stemsOf(j)){const st=String(j&&j.status||'').toLowerCase();if(/fail|error/.test(st)||(j&&j.error))throw new Error(typeof j.error==='string'?j.error:((j&&j.message)||'Separation failed'));
    if(!poll){const su=j&&(j.status_url||j.statusUrl),jid=j&&(j.job_id||j.jobId||j.id);poll=su?new URL(su,url).href:jid?url.replace(/\/+$/,'')+'/'+encodeURIComponent(jid):'';
     if(!poll||new URL(poll).origin!==new URL(url).origin||!okUrl(poll))throw new Error('The backend’s reply had no stems and no job to poll')}
    if(Date.now()-t0>600000)throw new Error('Timed out waiting for your backend');
    const pr=j&&j.progress;rsNote('Deck '+d.L+': separating…'+(pr!=null&&isFinite(pr)?' '+Math.round(pr<=1?pr*100:pr)+'%':''));
    await new Promise(x=>setTimeout(x,3000));if(d.buf!==buf)return;
    const q=await tf(poll,{headers:Object.assign({Accept:'application/json'},await rsAuth(poll))},30000);if(!q.ok)throw new Error(await errTxt(q));j=await q.json()}
   const urls=stemsOf(j);files={};let n=0;
   for(const k of RS_KEYS){rsNote('Deck '+d.L+': downloading '+k+' ('+(++n)+'/4)…');const u=new URL(urls[k],url).href;if(!okUrl(u))throw new Error('The backend returned an unsafe stem URL');
    const rr=await tf(u,{},180000);if(!rr.ok)throw new Error('Couldn’t download the '+k+' stem');files[k]=await rr.blob()}
   try{await kvPut('stems',{key,files,t:Date.now()})}catch(e){console.warn('Stem cache not saved',e)}}
  if(d.buf!==buf)return;const ok=await rsBuild(d,buf,files);
  if(ok){d.rsCached=true;rsNote('Deck '+d.L+': real stems on.');toast('Real stems ready on Deck '+d.L)}}
 catch(e){const m=e&&e.name==='AbortError'?'The backend took too long to answer':(e instanceof TypeError?'Can’t reach your stems backend (wrong URL, offline or blocked by CORS)':(e&&e.message)||'Something went wrong');rsNote('Deck '+d.L+': '+m);toast('Real stems: '+m)}
 rsBusy[d.L]=false}
const _rf=refresh;refresh=function(){_rf();D.forEach(d=>{const ra=rsAct(d),o=$p('#rsO'+d.L);if(o){const t=ra?'REAL STEMS ON':'REAL STEMS';if(o.textContent!==t)o.textContent=t;o.classList.toggle('on',ra);o.setAttribute('aria-pressed',ra)}
  const sp=$p('#rsS'+d.L);if(sp){const t=rsBusy[d.L]?'WORKING…':(d.rsCached?'RE-LOAD':'SEPARATE');if(sp.textContent!==t)sp.textContent=t;sp.disabled=!!rsBusy[d.L]}
  [['hat',ra?'DRUMS':'HI-END'],['mel',ra?'OTHER':'MELODY']].forEach(x=>{const b=$p('#st'+d.L+x[0]);if(b&&b.textContent!==x[1])b.textContent=x[1]})})};
{const u=$p('#rsUrl');if(u)u.value=rsUrl()}
Promise.all([stRestore(),smRestore()]).then(()=>{stLast=stSnap();smLast=smSig();ready=true;refresh()});

window.proApi={detectKey,camelot,effKey,compat};
setTab(G('yapsProTab')&&panes.some(p=>p.dataset.p==G('yapsProTab'))?G('yapsProTab'):'wave');refresh();
})();


/* ══════════════════════════════════════════════════════════════════════════
   LIBRARY INTELLIGENCE — BPM + key badges in the track picker, "Suggest next track", Analyse library.
   Reads/writes localStorage 'yaps_dj_meta_v1' = { "<trackId>": { b: bpm, k: "8A", t: timestamp } }.
   Hooks: render() calls libRank(rows) and libBadge(t); proAnalyse() calls libStore(d) once a key is detected.
   ══════════════════════════════════════════════════════════════════════════ */
(function(){
const KEY='yaps_dj_meta_v1',L={sug:false,sc:new Map(),run:false,ref:null};
let M={};try{M=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){M={}}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(M))}catch(e){}};
const id=t=>String(t.id),meta=t=>{const m=M[id(t)];return m&&!m.x?m:(t.bpm?{b:t.bpm}:null)};
const rer=()=>{try{if($('#libd').open)render()}catch(e){}};
window.libStore=function(d){if(!d.tid||!d.key2||!window.proApi)return;M[String(d.tid)]={b:d.bpm?Math.round(d.bpm*10)/10:null,k:proApi.camelot(d.key2),t:Date.now()};save();rer();try{autoMatch(d)}catch(e){}};
/* AUTOMATIC matching: once a song is on a deck, (1) Suggest Next switches on by itself, (2) a few more songs are analysed quietly in the background,
   (3) a song loaded next to a playing one is tempo-synced when the tempos are close, and the harmonic fit is announced */
let autoSug=false,autoRun=0;
function autoMatch(d){const o=D[1-D.indexOf(d)];
 if(!autoSug){autoSug=true;L.sug=true;const b=$('#libSug');if(b){b.classList.add('on');b.setAttribute('aria-pressed','true')}}
 const ok=(()=>{try{const c=navigator.connection||{};return!c.saveData&&c.type!=='cellular'&&!/(^|-)2g$|3g/.test(c.effectiveType||'')}catch(e){return true}})();
 if(ok&&!L.run&&Date.now()-autoRun>60000){autoRun=Date.now();setTimeout(()=>analyseAll(5,true),1500)}
 if(o&&o.buf&&d.buf){const a=window.proApi.effKey(o),b=window.proApi.effKey(d),c=a&&b?proApi.compat(a.code,b.code):null;
  if(o.on&&!d.on&&d.bpm&&eff(o)&&!d.sync&&ratio(d.bpm,eff(o))<.08){doSync(d)}
  if(c)setTimeout(()=>toast('Deck '+d.L+' + Deck '+o.L+': '+(a.code+' → '+b.code)+' · '+c[0]),900)}
 rer()}
function refDeck(){const a=D.filter(d=>d.on&&d.buf),b=D.filter(d=>d.buf);const d=a[0]||b[0];if(!d)return null;
 const ek=proApi.effKey(d);return{d,bpm:d.bpm?eff(d):null,key:ek?ek.code:null}}
function ratio(a,b){let best=9;[1,2,.5].forEach(m=>{const r=Math.abs(a*m/b-1);if(r<best)best=r});return best}
function score(t,r){const m=meta(t);if(!m||(!m.b&&!m.k))return null;let bp=null,kp=null,cmp=null;
 if(m.b&&r.bpm){bp=Math.max(0,100-ratio(m.b,r.bpm)*100*8)}
 if(m.k&&r.key){cmp=proApi.compat(m.k,r.key);kp=({PERFECT:100,GOOD:85,OK:60,ENERGY:55}[cmp[0].split(' ')[0]]);if(kp==null)kp=0}
 if(bp==null&&kp==null)return null;const s=bp!=null&&kp!=null?.6*bp+.4*kp:(bp!=null?bp*.8:kp*.7);return{s:Math.round(s),cmp:cmp&&cmp[1]}}
const kn=c=>{const m=/^(\d+)([AB])$/.exec(c||'');return m?+m[1]*2+(m[2]==='B'?1:0):999};const SO=['','bpm','key','title'];function srt(rows){if(!L.so)return rows;const g=t=>meta(t)||{},r=rows.slice();if(L.so==='bpm')r.sort((a,b)=>(g(a).b||1e9)-(g(b).b||1e9));else if(L.so==='key')r.sort((a,b)=>kn(g(a).k)-kn(g(b).k));else r.sort((a,b)=>String(a.title).localeCompare(String(b.title)));return r}
window.libRank=function(rows){L.sc.clear();if(!L.sug)return srt(rows);const r=refDeck();L.ref=r;if(!r||(!r.bpm&&!r.key))return rows;
 const busy=new Set(D.map(d=>d.tid&&String(d.tid)).filter(Boolean)),sc=[],un=[];
 rows.forEach(t=>{if(busy.has(id(t)))return;const s=score(t,r);if(s){L.sc.set(id(t),s);sc.push(t)}else un.push(t)});
 sc.sort((a,b)=>L.sc.get(id(b)).s-L.sc.get(id(a)).s);return sc.concat(un)};
window.libBadge=function(t){const m=meta(t),s=L.sc.get(id(t));let h='';
 if(m&&(m.b||m.k))h=(m.b?Math.round(m.b)+' BPM':'')+(m.b&&m.k?' · ':'')+(m.k||'');else h='not analysed';
 if(s)h+=' · '+s.s+'% match';return'<em class="mt '+(s&&s.cmp?s.cmp:(m&&(m.b||m.k)?'':'dim'))+'">'+h+'</em>'};
function st(msg){const e=$('#libSt');if(e)e.textContent=msg||''}
async function analyseAll(cap,quiet){const b=$('#libAn');cap=+cap||25;
 if(L.run){L.run=false;st('Stopping…');return}
 try{if(navigator.connection&&navigator.connection.saveData){toast('Data Saver is on. Turn it off to analyse the library.');return}}catch(e){}
 const phone=matchMedia('(pointer:coarse)').matches,max=phone?360:600,
  todo=library.filter(t=>{const m=M[id(t)];if(m&&(m.x||m.k))return false;if(t.duration){const p=String(t.duration).split(':').map(Number);if((p[0]||0)*60+(p[1]||0)>max)return false}return true}).slice(0,cap);
 if(!todo.length){if(!quiet)toast('Every track here is already analysed');return}
 L.run=true;b.textContent='STOP';let n=0;
 for(const t of todo){if(!L.run)break;n++;st('Analysing '+n+' of '+todo.length+': '+t.title);
  try{const raw=await getBuf(t,()=>{});init();const ab=await C.decodeAudioData(raw),r=analyse(ab),k=proApi.detectKey(ab);
   M[id(t)]={b:t.bpm||r.bpm||null,k:k?proApi.camelot(k):null,t:Date.now()};save();rer()}
  catch(e){M[id(t)]={x:1,t:Date.now()};save()}
  await new Promise(r=>setTimeout(r,30))}
 L.run=false;b.textContent='ANALYSE LIBRARY';st(n<todo.length?'Stopped':'Done · '+n+' track'+(n>1?'s':'')+' analysed');rer()}
const bar=$('#libTools');if(!bar)return;
$('#libSort').onclick=()=>{L.so=SO[(SO.indexOf(L.so||'')+1)%SO.length];const b=$('#libSort');b.textContent='SORT: '+(L.so==='title'?'A–Z':(L.so||'off').toUpperCase());b.classList.toggle('on',!!L.so);b.setAttribute('aria-pressed',!!L.so);rer()};$('#libSug').onclick=()=>{L.sug=!L.sug;$('#libSug').classList.toggle('on',L.sug);$('#libSug').setAttribute('aria-pressed',L.sug);
 if(L.sug){const r=refDeck();st(r?'Best matches for Deck '+r.d.L+(r.bpm?' · '+r.bpm.toFixed(0)+' BPM':'')+(r.key?' · '+r.key:''):'Load a track on a deck first')}else st('');render()};
$('#libAn').onclick=()=>analyseAll();
})();

/* Dark / Light toggle (shares the saved mode with index.html) */
(function(){const b=$('#lmBtn'),s=$('#sbModeItem');if(!b)return;
 const sync=()=>{const l=window.__isLight&&__isLight();b.textContent=l?'DARK':'LIGHT';b.title=l?'Switch to dark mode':'Switch to light mode'};
 const flip=e=>{if(e)e.preventDefault();__setLight(!__isLight());sync();toast(__isLight()?'Light mode':'Dark mode')};
 b.addEventListener('click',flip);if(s)s.addEventListener('click',flip);
 const o=window.__themeChanged;window.__themeChanged=function(){if(o)o();sync()};sync();})();

/* ══════ YAPS bridge: live link with index.html (same origin) ══════
   app-play      YAPSMusic started a song         -> decks pause (never while recording)
   studio-play   a deck started here               -> YAPSMusic pauses its player
   mix-published a public mix was published here    -> DJ Mixes row refreshes in YAPSMusic
   load-deck     YAPSMusic sends a song to a deck  -> loaded live, answered with studio-ack */
(function(){
 if(window.__yapsBridge)return;window.__yapsBridge=1;
 let bc=null,me='studio';try{bc=new BroadcastChannel('yaps_bridge')}catch(e){}
 const post=(type,data)=>{const m=Object.assign({type,from:me,t:Date.now(),n:Math.random()},data||{});try{if(bc)bc.postMessage(m);else localStorage.setItem('yaps_bridge_msg',JSON.stringify(m))}catch(e){}};
 const recording=()=>typeof R!=='undefined'&&R.rec&&R.rec.state==='recording';
 async function onMsg(m){if(!m||m.from===me)return;
  if(m.type==='app-play'){if(!recording()&&!ai&&D.some(d=>d.on)){D.forEach(stopD);toast('Studio paused: YAPSMusic is playing '+(m.title?'“'+m.title+'”':'a song'))}}
  else if(m.type==='load-deck'){const L=String(m.deck).toUpperCase()==='B'?'B':'A',id=String(m.id);
   const find=()=>library.find(x=>String(x.id)===id);
   try{readShared();if(!find())await readDeviceUploads();if(!find())await loadRemote()}catch(e){}
   const t=find();if(!t){post('studio-ack',{ok:false,deck:L});return}
   loadTrack(L,t);toast('YAPSMusic sent “'+t.title+'” to Deck '+L);post('studio-ack',{ok:true,deck:L,title:t.title})}}

 /* a song made on song-creator.html is waiting in IndexedDB: put it in the chosen deck */
 const scHandoff=async force=>{try{if(!force&&new URLSearchParams(location.search).get('scload')!=='1')return;
  const db=await new Promise((res,rej)=>{const r=indexedDB.open('yaps_sc_handoff',1);r.onupgradeneeded=()=>r.result.createObjectStore('h',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  const row=await new Promise(res=>{const q=db.transaction('h').objectStore('h').get('latest');q.onsuccess=()=>res(q.result);q.onerror=()=>res(null)});
  if(!row||!row.blob||Date.now()-row.t>6e5)return;
  const L=row.deck==='B'?'B':'A';await new Promise(r=>setTimeout(r,500));
  const ok=await loadTrack(L,Object.assign({},row.track,{audio:URL.createObjectURL(row.blob),local:true}));
  try{history.replaceState(null,'','studio.html')}catch(e){}
  toast(ok?'“'+(row.track.title||'Your song')+'” is in Deck '+L+'. Mix it, add effects, record and export.':'Couldn’t load the song into Deck '+L+'. Use Download on the Song Creator page and load the file from Phone / Device.');
  try{const tx=db.transaction('h','readwrite');tx.objectStore('h').delete('latest')}catch(e){}
 }catch(e){console.warn('Song Creator hand-off failed',e)}};
 scHandoff();window.__scHandoff=()=>scHandoff(true);
 window.__yapsPost=post;
 if(bc)bc.onmessage=e=>onMsg(e.data);
 else addEventListener('storage',e=>{if(e.key==='yaps_bridge_msg'&&e.newValue){try{onMsg(JSON.parse(e.newValue))}catch(x){}}});
 /* a deck starts playing -> tell YAPSMusic */
 const _p=play;play=function(d){const was=d&&d.on;const r=_p.apply(this,arguments);if(d&&d.on&&!was)post('studio-play',{title:d.t||'',artist:d.ar||''});return r};
 /* a public mix is published -> tell YAPSMusic */
 const _s=saveMixRow;saveMixRow=async function(row){const r=await _s.apply(this,arguments);if(row&&row.visibility==='public')post('mix-published',{title:row.title||''});return r};
 /* live song list: index.html rewrote yaps_shared_catalogue, or the user came back from adding songs there */
 const refresh=()=>{try{readShared()}catch(e){}if($('#libd')&&$('#libd').open)render()};
 addEventListener('storage',e=>{if(e.key==='yaps_shared_catalogue')refresh()});
 let lastDev=0;document.addEventListener('visibilitychange',()=>{if(document.hidden||Date.now()-lastDev<5000)return;lastDev=Date.now();refresh();readDeviceUploads().then(()=>{if($('#libd')&&$('#libd').open)render()})});
})();

/* ===== VIDEO MIXER panel: crossfaded deck artwork + spectrum, with fullscreen ===== */
(function(){
const m=document.querySelector('main');if(!m)return;
const s=document.createElement('section');s.id='vidPanel';s.className='pn';
s.innerHTML='<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><b style="letter-spacing:.1em;font-size:12px">VIDEO MIXER</b><span style="flex:1"></span><button class="sm" id="vdMode">ART + BARS</button><button class="sm" id="vdFs">⛶ FULLSCREEN</button></div><canvas id="vdCv" width="960" height="540" style="width:100%;max-height:30vh;aspect-ratio:16/9;background:#000;display:block;margin:0 auto;border-radius:2px"></canvas><div class="pnote">The two decks\' artwork and spectrum, crossfaded with the crossfader. Go fullscreen to use it as a screen for your audience.</div>';
{const dkv=document.getElementById('vdock');m.insertBefore(s,dkv?dkv.nextSibling:null)}
const cv=document.getElementById('vdCv'),x=cv.getContext('2d'),modes=['ART + BARS','BARS ONLY','ART ONLY'],imgs={},fa=new Uint8Array(128);let mi=0;
function img(d){const mm=/url\("?([^")]+)"?\)/.exec(d.art||'');if(!mm)return null;const u=mm[1];if(!imgs[u]){const i=new Image();i.src=u;imgs[u]=i}const i=imgs[u];return i.complete&&i.naturalWidth?i:null}
function layer(d,a,side){if(a<=.01||!d.buf)return;const W=cv.width,H=cv.height,im=mi!==1?img(d):null;
 if(im){const r=Math.max(W/im.naturalWidth,H/im.naturalHeight);x.globalAlpha=a*.3;x.drawImage(im,(W-im.naturalWidth*r)/2,(H-im.naturalHeight*r)/2,im.naturalWidth*r,im.naturalHeight*r);
  const S=H*.5,cx=W*(side?.75:.25)-S/2,sr=Math.min(im.naturalWidth,im.naturalHeight);x.globalAlpha=a;x.drawImage(im,(im.naturalWidth-sr)/2,(im.naturalHeight-sr)/2,sr,sr,cx,H*.2,S,S)}
 if(mi!==2&&d.an){d.an.getByteFrequencyData(fa);const n=64,bw=W/n;x.globalAlpha=a*.8;x.fillStyle=d.c;for(let i=0;i<n;i++){const h=fa[i]/255*H*.55;x.fillRect(i*bw+1,H-h,bw-2,h)}}
 x.globalAlpha=a;x.fillStyle='#fff';x.font='bold 28px sans-serif';x.textAlign=side?'right':'left';x.fillText(String(d.t||'').slice(0,40),side?W-20:20,44)}
function f(){requestAnimationFrame(f);if(document.body.dataset.vp!=='video'&&!document.fullscreenElement)return;
 x.globalAlpha=1;x.fillStyle='#000';x.fillRect(0,0,cv.width,cv.height);
 let v=typeof xv!=='undefined'?xv:.5;if((window.proXf||{}).rev)v=1-v;
 layer(D[0],Math.min(1,2*(1-v)),0);layer(D[1],Math.min(1,2*v),1);x.globalAlpha=1}
requestAnimationFrame(f);
document.getElementById('vdMode').onclick=function(){mi=(mi+1)%3;this.textContent=modes[mi]};
document.getElementById('vdFs').onclick=()=>{if(cv.requestFullscreen)cv.requestFullscreen();else toast('Fullscreen is not supported here')};
})();
/* ===== DECK PHOTOS: profile picture on Deck A, featured image on Deck B ===== */
(function(){
const IMG_B='data:image/jpeg;base64,'+"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";
function put(L,url){const h=document.querySelector('#jog'+L+' .hub');if(!h||!url)return;if(h.dataset.ph===url)return;
 const t=new Image();t.onload=()=>{h.style.setProperty('--ph','url("'+url.replace(/["\\\n\r]/g,'')+'")');h.classList.add('ph');h.dataset.ph=url;h.setAttribute('role','img');h.setAttribute('aria-label','Deck '+L+' photo')};t.src=url}
window.__deckPhotos=function(){const a=window.__yapsAvatar;if(a&&/^https?:\/\//i.test(a))put('A',a);put('B',IMG_B)};
window.__deckPhotos();
})();

/* ===== YAPS v4 add-on: beat loops, loop IN/OUT/RELOOP/EXIT, beat roll, stutter, transition presets, BPM source + correction =====
   Built on the existing engine: loops and rolls reuse the Pro console's loopSet/autoLoop/rollStart (exported as window.YAPS_PRO),
   stutter schedules short slices of the deck's own decoded buffer on the audio clock, transitions move the existing crossfader (xv/xfade). */
(function(){
const PR=()=>window.YAPS_PRO||null;
const LT={sel:0,latch:false,rollDiv:.25,stDiv:.125,held:null};
const sel=()=>D[LT.sel],rt=d=>d.src?d.src.playbackRate.value:1+d.pitch/100;
const needBpm=d=>PR()?PR().needBpm(d):(d.bpm?false:(toast('Set a BPM for Deck '+d.L+' first (tap the BPM badge or SET BPM).'),true));
const bpmSrc=d=>d.bpmSrc==='manual'?'manual':d.bpmSrc==='tap'?'tap tempo':d.detected?'auto-detected':'from library';

/* ---------- loops ---------- */
function loopSize(d,v){if(!PR()){toast('Loop tools are unavailable: the Pro console did not start.');return}
 if(!d.buf)return toast('Load a track into Deck '+d.L+' first');if(!d.on)return toast('Start Deck '+d.L+' first');
 PR().autoLoop(d,v);refresh()}
function loopIn(d){if(!d.buf)return toast('Load a track into Deck '+d.L+' first');if(!d.on)return toast('Start Deck '+d.L+' first');
 d.lin=PR()?PR().snap(d,d.pos):d.pos;toast('Loop IN set on Deck '+d.L+' at '+d.lin.toFixed(2)+' s');refresh()}
function loopOut(d){if(d.lin==null)return toast('Set a loop IN first');if(!d.on)return toast('Start Deck '+d.L+' first');
 const e=Math.max(d.lin+.05,PR().snap(d,d.pos));if(!PR().loopSet(d,d.lin,e))toast('Move further past the IN point, then press OUT');refresh()}
function loopExit(d){if(PR())PR().loopOff(d);refresh()}
function reloop(d){if(!d.xlast)return toast('No loop yet. Pick a length or set IN and OUT.');if(d.xl)return toast('A loop is already running on Deck '+d.L);
 if(!d.on)return toast('Start Deck '+d.L+' first');PR().loopSet(d,d.xlast[0],d.xlast[1]);refresh()}

/* ---------- beat roll (loop-based, slip keeps the track moving underneath) ---------- */
function rollStart(d){if(!PR())return;if(!d.on||!d.src)return toast('Start Deck '+d.L+' first');if(needBpm(d))return;
 stutStop(d);PR().rollStart(d,LT.rollDiv,d.pos);refresh()}
function rollStop(d){if(PR()&&d.rollOn)PR().rollEnd(d);refresh()}

/* ---------- stutter: slices of the deck's own audio, scheduled on the audio clock, deck's main signal muted while active ---------- */
function stutStart(d){if(!d.on||!d.src||!d.buf)return toast('Start Deck '+d.L+' first');if(needBpm(d))return;
 init();if(d.st)stutStop(d);if(d.rollOn&&PR())PR().rollEnd(d);
 const len=LT.stDiv*60/d.bpm,t=C.currentTime,bus=C.createGain(),g=d.in.gain;bus.gain.value=g.value;bus.connect(d.lo);
 const st={d,len,s0:Math.max(0,Math.min(d.pos,d.dur-len-.02)),bus,nodes:new Set(),next:t+.01,prev:g.value,stopped:false,iv:0};
 g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(0,t+.005);
 d.st=st;st.iv=setInterval(()=>stutTick(st),20);stutTick(st);refresh()}
function stutTick(st){if(st.stopped)return;const d=st.d,now=C.currentTime;if(!d.on||!d.buf)return stutStop(d);
 const r=rt(d),per=st.len/r,on=per*.82;if(st.next<now-.05)st.next=now+.01;
 while(st.next<now+.12){const t=st.next,s=C.createBufferSource(),g=C.createGain(),rel=Math.min(.004,on/3);
  s.buffer=d.buf;s.playbackRate.value=r;s.connect(g);g.connect(st.bus);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+.002);g.gain.setValueAtTime(1,Math.max(t+.002,t+on-rel));g.gain.linearRampToValueAtTime(0,t+on);
  s.start(t,st.s0);s.stop(t+on+.01);st.nodes.add(s);s.onended=()=>{st.nodes.delete(s);try{s.disconnect();g.disconnect()}catch(e){}};st.next+=per}}
function stutStop(d,instant){const st=d&&d.st;if(!st)return;d.st=null;st.stopped=true;clearInterval(st.iv);
 const t=C.currentTime,g=d.in.gain;
 try{st.bus.gain.cancelScheduledValues(t);st.bus.gain.setValueAtTime(st.bus.gain.value,t);st.bus.gain.linearRampToValueAtTime(0,t+.005)}catch(e){}
 st.nodes.forEach(n=>{try{n.stop(t+.006)}catch(e){}});
 g.cancelScheduledValues(t);
 if(instant){g.value=st.prev}else{g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(st.prev,t+.01);setTimeout(()=>{if(!d.st){g.cancelScheduledValues(C.currentTime);g.value=st.prev}},60)}
 setTimeout(()=>{st.nodes.forEach(n=>{try{n.disconnect()}catch(e){}});st.nodes.clear();try{st.bus.disconnect()}catch(e){}},120);refresh()}
{const _sd=stopD;stopD=function(d){try{if(d&&d.st)stutStop(d,true)}catch(e){}return _sd.apply(this,arguments)}}

function resetDeck(d){stutStop(d);if(PR()){if(d.rollOn)PR().rollEnd(d);PR().loopOff(d)}d.lin=null;LT.held=null;refresh();toast('Deck '+d.L+': loop, roll and stutter cleared')}

/* hold (or latch) handling for ROLL and STUTTER */
const isOn=(k,d)=>k==='roll'?!!d.rollOn:!!d.st;
function holdDown(k){const d=sel();init();if(LT.latch){if(isOn(k,d))(k==='roll'?rollStop:stutStop)(d);else(k==='roll'?rollStart:stutStart)(d);return}
 LT.held={k,d};(k==='roll'?rollStart:stutStart)(d)}
function holdUp(){const h=LT.held;LT.held=null;if(h&&!LT.latch)(h.k==='roll'?rollStop:stutStop)(h.d)}
document.addEventListener('pointerdown',e=>{const b=e.target.closest('.yl-hold');if(!b)return;e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(x){}holdDown(b.dataset.hold)});
['pointerup','pointercancel','lostpointercapture'].forEach(t=>document.addEventListener(t,e=>{if(e.target.closest&&e.target.closest('.yl-hold'))holdUp()}));
document.addEventListener('keydown',e=>{const b=e.target.closest&&e.target.closest('.yl-hold');if(b&&(e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();holdDown(b.dataset.hold)}});
document.addEventListener('keyup',e=>{const b=e.target.closest&&e.target.closest('.yl-hold');if(b&&(e.key===' '||e.key==='Enter'))holdUp()});
addEventListener('blur',holdUp);document.addEventListener('visibilitychange',()=>{if(document.hidden)holdUp()});
document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest('.yl-hold'))e.preventDefault()});

/* ---------- transition presets (move the real crossfader, which drives the deck gains) ---------- */
const TR={t:0,run:false};
function trEnd(msg){clearInterval(TR.t);TR.t=0;TR.run=false;const o=$('#ylTrO');if(o)o.textContent=msg||'';refresh()}
function trGo(mode){
 try{if(typeof MN!=='undefined'&&MN.busy)return toast('Mix Now is running. Stop it first.');if(typeof ai!=='undefined'&&ai&&ai.busy)return toast('AI DJ is mixing. Stop it first.')}catch(e){}
 if(TR.run)trEnd('');
 const ti=xv<.5?1:0,dst=D[ti],src=D[1-ti];
 if(!dst.buf)return toast('Load a track into Deck '+dst.L+' first');
 init();if(!dst.on){play(dst);if(!dst.on)return}
 const dur=mode==='cut'?.08:+$(mode==='smooth'?'#ylD1':'#ylD2').value,from=xv,to=ti,t0=performance.now();
 TR.run=true;$('#ylTrO').textContent=(mode==='cut'?'Cut':mode==='smooth'?'Smooth fade':'Gradual blend')+' '+src.L+' → '+dst.L;
 TR.t=setInterval(()=>{const k=Math.min(1,(performance.now()-t0)/(dur*1000)),e=mode==='smooth'?k*k*(3-2*k):k;
  xv=from+(to-from)*e;xfade();$('#xf').value=Math.round(xv*100);if(k>=1){xv=to;xfade();$('#xf').value=to*100;trEnd('Done: Deck '+dst.L+' is up. Deck '+src.L+' keeps playing.')}},16);refresh()}
/* ---------- SWITCH SONG: hand over from one deck to the other in different styles (Pro Console > FX > Transitions) ---------- */
function trSwap(style,src){
 try{if(typeof MN!=='undefined'&&MN.busy)return toast('Mix Now is running. Stop it first.');if(typeof ai!=='undefined'&&ai&&ai.busy)return toast('AI DJ is mixing. Stop it first.')}catch(e){}
 const dst=D[1-D.indexOf(src)];
 if(!dst.buf)return toast('Load a track into Deck '+dst.L+' first');
 init();if(TR.run)trEnd('');
 if(!dst.on){play(dst);if(!dst.on)return}
 const rev=!!(window.proXf&&window.proXf.rev),to=(D.indexOf(dst)===1)!==rev?1:0,from=xv,
  N={cut:'Cut',fade:'Crossfade',slow:'Slow blend',echo:'Echo swap',spin:'Backspin swap',brake:'Brake swap'}[style]||'Swap',
  dur={cut:.08,fade:4,slow:12,echo:.25,spin:.9,brake:1.3}[style]||4,ease=style==='fade'||style==='slow';
 const FXO=window.YAPS_PRO||{};if(style==='echo'&&FXO.echoOut)FXO.echoOut(src);else if(style==='spin'&&FXO.spin)FXO.spin(src);else if(style==='brake'&&FXO.brake)FXO.brake(src);
 const t0=performance.now(),msg=$('#swapNote');
 TR.run=true;if(msg)msg.textContent=N+': Deck '+src.L+' → Deck '+dst.L;toast(N+': Deck '+src.L+' → Deck '+dst.L);
 TR.t=setInterval(()=>{const k=Math.min(1,(performance.now()-t0)/(dur*1000)),e=ease?k*k*(3-2*k):k;
  xv=from+(to-from)*e;xfade();$('#xf').value=Math.round(xv*100);
  if(k>=1){xv=to;xfade();$('#xf').value=to*100;clearInterval(TR.t);TR.t=0;TR.run=false;
   if(style==='spin')setTimeout(()=>{if(src.on)stopD(src)},1100); /* backspin re-drops the old deck silently: stop it */
   else if(style==='cut'||style==='fade'||style==='slow')setTimeout(()=>{if(src.on)stopD(src)},style==='cut'?150:300);
   if(msg)msg.textContent='Done: Deck '+dst.L+' is playing.';refresh()}},16);refresh()}
function trStop(why){if(!TR.run)return;trEnd(why==='manual'?'Manual crossfader':'Stopped at '+Math.round(xv*100)+'%')}
$('#xf').addEventListener('input',()=>{if(TR.run)trStop('manual')});
document.addEventListener('click',e=>{if(e.target.closest('#mixNow')&&TR.run)trStop('manual')},true);

/* ---------- BPM helpers ---------- */
function setBpm(d,v,src){v=Math.round(Math.max(40,Math.min(250,v))*10)/10;d.bpm=v;d.bpmSrc=src;d.detected=false;d.bpmNote=null;
 try{if(d.buf)d.beat0=analyse(d.buf,v).beat0}catch(e){}if(d.sync)try{doSync(d,1)}catch(e){}ui(d);refresh()}
window.__ylSetBpm=setBpm;

/* ---------- clicks ---------- */
document.addEventListener('click',e=>{
 const dd=e.target.closest('[data-ltd]');if(dd){LT.sel=+dd.dataset.ltd;refresh();return}
 const lp=e.target.closest('#ylLoop [data-loop]');if(lp){const v=+lp.dataset.loop,d=sel();if(v)loopSize(d,v);else loopExit(d);return}
 const a=e.target.closest('[data-yl]');if(a){const d=sel(),k=a.dataset.yl;
  if(k==='in')loopIn(d);else if(k==='out')loopOut(d);else if(k==='re')reloop(d);else if(k==='exit')loopExit(d);else if(k==='reset')resetDeck(d);
  else if(k==='latch'){LT.latch=!LT.latch;if(!LT.latch){stutStop(d);rollStop(d)}refresh()}
  return}
 const rd=e.target.closest('[data-rd]');if(rd){LT.rollDiv=+rd.dataset.rd;const d=sel();if(d.rollOn){rollStop(d);rollStart(d)}refresh();return}
 const sd=e.target.closest('[data-sd]');if(sd){LT.stDiv=+sd.dataset.sd;const d=sel();if(d.st)stutStart(d);refresh();return}
 const tr=e.target.closest('[data-tr]');if(tr){tr.dataset.tr==='stop'?trStop():trGo(tr.dataset.tr);return}
 const bp=e.target.closest('[data-bp]');if(bp){const d=sel(),k=bp.dataset.bp;
  if(k==='set'){if(!d.buf)return toast('Load a track into Deck '+d.L+' first');$('#bp'+d.L).click();return}
  if(k==='tm'||k==='tp'){d.pitch=Math.max(-16,Math.min(16,Math.round((d.pitch+(k==='tp'?.5:-.5))*10)/10));setPitch(d);refresh();return}
  if(!d.bpm)return toast('No BPM on Deck '+d.L+' yet. Use SET BPM to enter one.');
  setBpm(d,k==='half'?d.bpm/2:d.bpm*2,'manual');toast('Deck '+d.L+' BPM is now '+d.bpm.toFixed(1)+' (manual). The beat grid was recalculated and is an estimate.')}});

/* ---------- live state ---------- */
function refresh(){const d=sel(),$$$=s=>document.querySelectorAll(s);
 $$$('[data-ltd]').forEach(b=>b.classList.toggle('on',+b.dataset.ltd===LT.sel));
 if(d._lb!==d.buf){d._lb=d.buf;d.lin=null}
 $$$('#ylLoop [data-loop]').forEach(b=>{const v=+b.dataset.loop;b.classList.toggle('on',v>0&&!!d.xl&&!!d.bpm&&Math.abs(d.xl[1]-d.xl[0]-v*60/d.bpm)<.002)});
 const bi=document.querySelector('[data-yl=in]');if(bi)bi.classList.toggle('on',d.lin!=null&&!d.xl);
 const lo=$('#ylLoopO');if(lo)lo.textContent=d.xl?((d.xl[1]-d.xl[0])*(d.bpm?d.bpm/60:1)).toFixed(d.bpm?2:1)+(d.bpm?' beats':' s')+' looping':(d.lin!=null?'IN set':'no loop');
 $$$('.yl-hold').forEach(b=>b.classList.toggle('on',isOn(b.dataset.hold,d)));
 $$$('[data-rd]').forEach(b=>b.classList.toggle('on',+b.dataset.rd===LT.rollDiv));
 $$$('[data-sd]').forEach(b=>b.classList.toggle('on',+b.dataset.sd===LT.stDiv));
 const lt=document.querySelector('[data-yl=latch]');if(lt){lt.classList.toggle('on',LT.latch);lt.setAttribute('aria-pressed',LT.latch)}
 $$$('.ylDk').forEach(x=>x.textContent=d.L);
 const bo=$('#ylBpmO');if(bo)bo.textContent=!d.buf?'Deck '+d.L+': empty':!d.bpm?(d.bpmNote||'Deck '+d.L+': no BPM yet. Use SET BPM or the tap tempo.'):'Deck '+d.L+': '+d.bpm.toFixed(1)+' BPM ('+bpmSrc(d)+') → '+eff(d).toFixed(1)+' at '+(d.pitch>=0?'+':'')+d.pitch.toFixed(1)+'%';
 $$$('[data-tr]').forEach(b=>{if(b.dataset.tr!=='stop')b.classList.toggle('on',false)})}
setInterval(refresh,250);refresh();
window.trSwap=trSwap;window.YAPS_LOOPTOOLS={state:LT,trSwap,loopSize,loopIn,loopOut,loopExit,reloop,rollStart,rollStop,stutStart,stutStop,resetDeck,trGo,trStop,setBpm,get transition(){return TR.run}};
})();


/* ===== Library sections: Offline | Device | YAPS Library, every song can be dragged onto Deck A or B ===== */
(function(){
 const MAIN=['offline','device','lib'];let offSrc='off';try{offSrc=localStorage.getItem('yaps_studio_offsrc')==='lib'?'lib':'off'}catch(e){}
 const _r0=render;
 const libRow=t=>`<div class="it" title="Drag onto Deck A or B"><img loading="lazy" alt="" src="${esc(src(t.cover||''))}" onerror="this.removeAttribute('src')"><div><b>${esc(t.title)}</b><span>${esc(t.artist)}${t.genre?' · '+esc(t.genre):''}${t.duration?' · '+esc(t.duration):''}</span>${typeof libBadge==='function'?libBadge(t):''}</div>
  <button class="ld" data-d="A" data-id="${esc(t.id)}" aria-label="Load ${esc(t.title)} into Deck A">A</button><button class="ld b" data-d="B" data-id="${esc(t.id)}" aria-label="Load ${esc(t.title)} into Deck B">B</button>${t.local&&!t.dl?'':`<button class="ld sv${isOff(t.id)?' on':''}" data-save="${esc(t.id)}" aria-label="${isOff(t.id)?'Remove offline copy of ':'Save offline: '}${esc(t.title)}"${offBusy.has(String(t.id))?' disabled':''}>${offBusy.has(String(t.id))?'…':isOff(t.id)?'<i class="fas fa-check"></i>':'<i class="fas fa-download"></i>'}</button>`}</div>`;
 const devRow=r=>{const v=devIsVid(r);return `<div class="it" title="Drag onto Deck A or B" style="grid-template-columns:44px 1fr auto auto auto"><div class="dv${v?' v':''}" aria-hidden="true">${v?'▶':'♪'}</div><div><b>${esc(r.name)}</b><span>${esc(r.artist)}${r.duration&&r.duration!=='—'?' · '+esc(r.duration):''}${v?' · video':''}</span></div>
  <button class="ld" data-did="${r.id}" data-d="A" aria-label="Load ${esc(r.name)} into Deck A">A</button><button class="ld b" data-did="${r.id}" data-d="B" aria-label="Load ${esc(r.name)} into Deck B">B</button><button class="dx" data-del="${r.id}" aria-label="Remove ${esc(r.name)} from My Device">✕</button></div>`};
 render=function(){
  const l=$('#list');
  if(!MAIN.includes(mode)){l.classList.remove('secs');return _r0()}
  l.classList.add('secs');
  const keep={};l.querySelectorAll('.libsec').forEach(e=>keep[e.dataset.sec]=e.scrollTop);
  const q=$('#q').value.trim().toLowerCase(),hit=a=>!q||a.join(' ').toLowerCase().includes(q);
  let all=library.filter(t=>hit([t.title,t.artist,t.genre]));if(typeof libRank==='function')all=libRank(all);
  const off=all.filter(t=>isOff(t.id));
  const head='<div class="drow" style="margin:4px 0 2px"><button class="k pl" data-dev="add">Add songs and videos</button>'+(window.showDirectoryPicker?'<button class="k" data-dev="dir">Add a folder</button>':'')+'</div>';
  let devBody,devN=0;
  if(!devFresh){devBody=head+'<div class="empty">Loading your device library…</div>';devRefresh().then(()=>{if($('#libd').open&&MAIN.includes(mode))render()})}
  else{const rows=devRows.filter(r=>hit([r.name,r.artist]));devN=rows.length;devBody=head+(rows.length?rows.map(devRow).join(''):'<div class="empty">'+(q?'No files match “'+esc(q)+'”.':'Nothing here yet. Tap “Add songs and videos” and pick files from your phone.')+'</div>')}
  const sec=(k,title,n,body)=>`<div class="libsec${mode===k?' cur':''}" data-sec="${k}"><h5><span>${title}</span><em>${n}</em></h5>${body}</div>`;
  /* the first box switches between the DJ's offline songs and the whole YAPS Library */
  if(render._m!==mode){if(mode==='lib')offSrc='lib';else if(mode==='offline')offSrc='off';render._m=mode}
  const useLib=offSrc==='lib',srcRows=useLib?all:off;
  const sw='<div class="srcsw" role="tablist" aria-label="Song source"><button type="button" role="tab" aria-selected="'+!useLib+'" data-os="off" class="'+(useLib?'':'on')+'">Offline <em>'+off.length+'</em></button><button type="button" role="tab" aria-selected="'+useLib+'" data-os="lib" class="'+(useLib?'on':'')+'">YAPS Library <em>'+all.length+'</em></button></div>';
  const srcEmpty=useLib?'<div class="empty">'+(library.length?'No tracks match “'+esc(q)+'”. Try a different search.':'The library is empty.')+'</div>'
   :'<div class="empty">'+(q?'No offline songs match “'+esc(q)+'”.':'No offline songs yet. Switch to YAPS Library and tap the download icon next to a song to keep it offline.')+'</div>';
  l.innerHTML=
   '<div class="libsec cur" data-sec="offline"><h5>'+sw+'</h5>'+(srcRows.length?srcRows.map(libRow).join(''):srcEmpty)+'</div>'+
   sec('device','Device songs',devN,devBody);
  l.appendChild(window.DJFANS?DJFANS.el():Object.assign(document.createElement('div'),{className:'libsec fans',innerHTML:'<h5><span>Listeners</span><em>live</em></h5><div class="empty">Loading…</div>'}));
  l.querySelectorAll('.libsec').forEach(e=>{if(keep[e.dataset.sec])e.scrollTop=keep[e.dataset.sec]});
 };
 /* the ... button: Saved Mixes, My Uploads and the DJ helper buttons (Suggest next, Sort, Analyse) */
 const mb=$('#libMore'),box=$('#libMoreBox'),ld=$('#libd');
 const syncMore=()=>{const on=!!box.querySelector('.tabs .on');mb.classList.toggle('on',on&&box.hidden)};
 mb.addEventListener('click',()=>{box.hidden=!box.hidden;mb.setAttribute('aria-expanded',String(!box.hidden));syncMore()});
 try{new MutationObserver(syncMore).observe(ld,{subtree:true,attributes:true,attributeFilter:['class']})}catch(e){}
 /* drag any song onto Deck A or Deck B (mouse: drag; touch: press and hold, then drag) */
 const list=$('#list');let pend=null,dg=null,ghost=null;
 let zones=null;
 const vis=e=>{const r=e.getBoundingClientRect(),h=Math.min(r.bottom,innerHeight)-Math.max(r.top,0);return h>Math.min(120,r.height*.5)};
 const mkZones=()=>{rmZones();if(['A','B'].every(L=>{const e=document.getElementById('deck'+L);return e&&vis(e)}))return;
  zones=document.createElement('div');zones.className='dzones';
  zones.innerHTML='<div data-z="A">DROP → DECK A</div><div data-z="B">DROP → DECK B</div>';document.body.appendChild(zones)};
 const rmZones=()=>{if(zones){zones.remove();zones=null}};
 const deckAt=(x,y)=>{if(zones){for(const z of zones.children){const r=z.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return z.dataset.z}}
  for(const L of['A','B']){const e=document.getElementById('deck'+L);if(!e)continue;const r=e.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=Math.max(r.top,0)&&y<=Math.min(r.bottom,innerHeight))return L}return null};
 const scroller=()=>{let e=ld.parentElement;while(e&&e!==document.body&&e!==document.documentElement){const c=getComputedStyle(e);if(/(auto|scroll)/.test(c.overflowY)&&e.scrollHeight>e.clientHeight+4)return e;e=e.parentElement}return window};
 const loadBtn=(row,L)=>row.querySelector('.ld[data-d="'+L+'"],.ld[data-act="'+L+'"]');
 function clean(){if(pend){clearTimeout(pend.t);pend=null}
  if(dg){cancelAnimationFrame(dg.raf);dg.row.classList.remove('dragging')}
  if(ghost){ghost.remove();ghost=null}rmZones();dg=null;document.body.classList.remove('dragsong');
  ['A','B'].forEach(L=>{const e=document.getElementById('deck'+L);if(e)e.classList.remove('dropT')})}
 function begin(){if(!pend)return;const row=pend.row;clearTimeout(pend.t);
  dg={row,x:pend.x,y:pend.y,sc:scroller(),raf:0};pend=null;
  const nm=row.querySelector('b');ghost=document.createElement('div');ghost.className='dragghost';ghost.textContent='♪ '+(nm?nm.textContent:'Song')+'  →  drop on Deck A or B';document.body.appendChild(ghost);mkZones();
  row.classList.add('dragging');document.body.classList.add('dragsong');try{navigator.vibrate&&navigator.vibrate(15)}catch(e){}
  place();tick()}
 function place(){if(!ghost)return;ghost.style.left=Math.min(dg.x+14,innerWidth-ghost.offsetWidth-6)+'px';ghost.style.top=Math.max(4,dg.y-8)+'px';
  const L=deckAt(dg.x,dg.y);['A','B'].forEach(k=>{const e=document.getElementById('deck'+k);if(e)e.classList.toggle('dropT',k===L)});if(zones)for(const z of zones.children)z.classList.toggle('dropT',z.dataset.z===L)}
 function tick(){if(!dg)return;const h=innerHeight,y=dg.y;let v=0;if(y<80)v=-(80-y)/4;else if(y>h-80)v=(y-(h-80))/4;
  if(v){try{dg.sc.scrollBy(0,v)}catch(e){}place()}dg.raf=requestAnimationFrame(tick)}
 list.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;
  const row=e.target.closest('.it');if(!row||e.target.closest('button'))return;if(!loadBtn(row,'A')||!loadBtn(row,'B'))return;
  clean();const touch=e.pointerType!=='mouse';pend={row,x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,id:e.pointerId,touch,t:0};
  if(touch)pend.t=setTimeout(begin,260)});
 document.addEventListener('pointermove',e=>{
  if(dg){dg.x=e.clientX;dg.y=e.clientY;place();return}
  if(!pend||e.pointerId!==pend.id)return;pend.x=e.clientX;pend.y=e.clientY;
  const m=Math.hypot(e.clientX-pend.x0,e.clientY-pend.y0);
  if(pend.touch){if(m>10){clearTimeout(pend.t);pend=null}}else if(m>6)begin()});
 const end=e=>{if(dg){const L=deckAt(e.clientX,e.clientY),row=dg.row;clean();if(L&&e.type==='pointerup'){const b=loadBtn(row,L);if(b)b.click()}}else if(pend)clean()};
 document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dg)clean()});
 document.addEventListener('touchmove',e=>{if(dg&&e.cancelable)e.preventDefault()},{passive:false});
 list.addEventListener('click',e=>{const b=e.target.closest('[data-os]');if(!b)return;offSrc=b.dataset.os==='lib'?'lib':'off';try{localStorage.setItem('yaps_studio_offsrc',offSrc)}catch(x){}render()});
 list.addEventListener('dragstart',e=>e.preventDefault());
 list.addEventListener('contextmenu',e=>{if(e.target.closest('.it')&&(dg||pend))e.preventDefault()});
 if($('#libd').open)render();
})();
