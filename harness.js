const fs=require('fs'),{JSDOM,VirtualConsole}=require('jsdom');
const FIDB=require('fake-indexeddb');
process.on('unhandledRejection',()=>{});process.on('uncaughtException',(e)=>{console.error('NODE-LEVEL',String(e).slice(0,200))});
const file=process.argv[2]||'index.html', waitMs=+(process.argv[3]||8000), opts=JSON.parse(process.argv[4]||'{}');
const html=fs.readFileSync((process.env.YAPS_DIR||require('path').resolve(__dirname,'..'))+'/'+file,'utf8');
const log={errors:[],rejections:[],consoleErr:[],sbCalls:{},sbOrder:[],fetches:[],warn:[]};
const vc=new VirtualConsole();
vc.on('jsdomError',e=>log.errors.push('jsdomError: '+(e.detail&&e.detail.stack?e.detail.stack.split('\n')[0]:e.message)));
vc.on('error',(...a)=>log.consoleErr.push(a.map(String).join(' ').slice(0,200)));
vc.on('warn',(...a)=>log.warn.push(a.map(String).join(' ').slice(0,160)));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:opts.url||'https://brians124.github.io/YAPSMUSIC.APP/'+file,virtualConsole:vc,
 beforeParse(w){
  const rec=(k)=>{log.sbCalls[k]=(log.sbCalls[k]||0)+1;log.sbOrder.push(k)};
  const result={data:opts.rows||[],error:null,count:0};
  const chain=(label,nul)=>{const f=function(){};const p=new Proxy(f,{get(t,k){ if(k==='maybeSingle'||k==='single')return ()=>chain(label+'.'+k,true); if(k==='then')return (res)=>Promise.resolve(nul?{data:null,error:null}:result).then(res); if(k==='catch')return ()=>p; if(k==='finally')return ()=>p; return (...a)=>{ if(['from','rpc'].includes(k)){rec(k+':'+a[0]);} return chain(label+'.'+String(k)); } },apply(){return chain(label)}});return p};
  const client={ auth:{ getSession:async()=>({data:{session:opts.session||null}}), getUser:async()=>({data:{user:null}}), onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}), signInWithPassword:async()=>({data:{},error:{message:'mock'}}), signUp:async()=>({data:{},error:{message:'mock'}}), signOut:async()=>({}), signInWithOAuth:async()=>({data:{},error:{message:'mock'}}), resetPasswordForEmail:async()=>({}), updateUser:async()=>({}) },
    from:(t)=>{rec('from:'+t);return chain('from')}, rpc:(n)=>{rec('rpc:'+n);return chain('rpc')}, channel:(n)=>{rec('channel:'+String(n).split(/[:_]/)[0]);const c=new Proxy({}, {get(t,k){ if(k==='subscribe')return (cb)=>{try{cb&&cb('SUBSCRIBED')}catch(e){}return c}; return (...a)=>c}});return c}, removeChannel(){}, storage:{from:(b)=>{rec('storage:'+b);return chain('storage')}}, functions:{invoke:async(n)=>{rec('fn:'+n);return {data:null,error:null}}} };
  w.supabase={createClient:()=>client};
  w.matchMedia=w.matchMedia||((q)=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
  for(const n of ['IntersectionObserver','ResizeObserver','PerformanceObserver'])w[n]=w[n]||class{constructor(){}observe(){}unobserve(){}disconnect(){}takeRecords(){return[]}};
  w.HTMLMediaElement.prototype.play=function(){return Promise.resolve()};w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.load=function(){};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:(t,k)=>k==='canvas'?this:(k==='measureText'?()=>({width:10}):(k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{})),set:()=>true})};
  w.Element.prototype.scrollIntoView=function(){};w.scrollTo=function(){};w.Element.prototype.scrollTo=function(){};
  w.URL.createObjectURL=()=>'blob:mock';w.URL.revokeObjectURL=()=>{};
  const mkParam=()=>new Proxy({value:0,defaultValue:0,minValue:-1e9,maxValue:1e9},{get:(t,k)=>k in t?t[k]:(()=>mkParam()),set:(t,k,v)=>{t[k]=v;return true}});
  const PARAMS=['gain','frequency','Q','detune','pan','delayTime','threshold','knee','ratio','attack','release','playbackRate','offset','positionX','positionY','positionZ','reduction'];
  const mkNode=()=>{const store={context:null,channelCount:2,numberOfInputs:1,numberOfOutputs:1,fftSize:2048,frequencyBinCount:1024,smoothingTimeConstant:0.8,type:'lowpass',curve:null,buffer:null,loop:false,onended:null};return new Proxy(store,{get(t,k){if(k in t)return t[k];if(k==='connect'||k==='disconnect')return (x)=>x||mkNode();if(k==='getByteFrequencyData'||k==='getByteTimeDomainData'||k==='getFloatFrequencyData'||k==='getFloatTimeDomainData')return (a)=>{};if(PARAMS.includes(k))return t[k]=mkParam();return ()=>{}},set(t,k,v){t[k]=v;return true}})};
  const mkBuf=(len=44100*180,ch=2,sr=44100)=>({duration:len/sr,length:len,numberOfChannels:ch,sampleRate:sr,getChannelData:()=>new Float32Array(2048),copyToChannel(){},copyFromChannel(){}});
  const ACproto={state:'running',currentTime:0,sampleRate:44100,baseLatency:0.01,destination:mkNode(),listener:mkNode(),resume:()=>Promise.resolve(),suspend:()=>Promise.resolve(),close:()=>Promise.resolve(),decodeAudioData:(b,ok)=>{const r=mkBuf();ok&&ok(r);return Promise.resolve(r)},createBuffer:(c,l,r)=>mkBuf(l,c,r),addEventListener(){},removeEventListener(){},audioWorklet:{addModule:()=>Promise.resolve()}};
  w.AudioContext=w.webkitAudioContext=w.OfflineAudioContext=function(){return new Proxy(ACproto,{get(t,k){if(k in t)return t[k];if(typeof k==='string'&&/^create/.test(k)){if(k==='createMediaStreamDestination')return()=>Object.assign(mkNode(),{stream:{getTracks:()=>[]}});return()=>mkNode()}return undefined},set(t,k,v){t[k]=v;return true}})};
  w.AudioWorkletNode=function(){return mkNode()};w.MediaRecorder=class{constructor(){this.state='inactive'}start(){this.state='recording'}stop(){this.state='inactive'}addEventListener(){}static isTypeSupported(){return true}};
  w.MediaStream=w.MediaStream||class{getTracks(){return[]}};
  const HD=w.HTMLDialogElement&&w.HTMLDialogElement.prototype; if(HD){HD.show=function(){this.setAttribute('open','')};HD.showModal=function(){this.setAttribute('open','')};HD.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'))};}
  w.HTMLCanvasElement.prototype.toDataURL=function(){return 'data:image/png;base64,AAAA'};w.HTMLCanvasElement.prototype.toBlob=function(cb){cb(new w.Blob([]))};
  if(!w.Blob.prototype.arrayBuffer)w.Blob.prototype.arrayBuffer=function(){return Promise.resolve(new ArrayBuffer(8))};
  w.fetch=(u,o)=>{log.fetches.push(String(u).slice(0,100));return Promise.reject(new TypeError('Network blocked in audit sandbox'))};
  w.Notification=w.Notification||class{static requestPermission(){return Promise.resolve('default')}};w.Notification.permission='default';
  Object.defineProperty(w.navigator,'serviceWorker',{value:{register:()=>Promise.reject(new Error('sw.js not provided in upload')),ready:new Promise(()=>{}),addEventListener(){},controller:null,getRegistration:()=>Promise.resolve(null)},configurable:true});
  Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:()=>Promise.reject(new Error('mock')),enumerateDevices:()=>Promise.resolve([])},configurable:true});
  w.addEventListener('error',e=>log.errors.push('uncaught: '+(e.message||e.error)+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));
  w.addEventListener('unhandledrejection',e=>log.rejections.push(String(e.reason&&e.reason.message||e.reason).slice(0,160)));
  w.indexedDB=FIDB.indexedDB;w.IDBKeyRange=FIDB.IDBKeyRange;w.IDBDatabase=FIDB.IDBDatabase;w.IDBRequest=FIDB.IDBRequest;
  w.__log=log;
  (opts.pre||[]).forEach(k=>{try{w.localStorage.setItem(k[0],k[1])}catch(e){}});
 }});
globalThis.__dom=dom;
setTimeout(async()=>{
  if(opts.script){ try{ const r=await dom.window.eval(opts.script); log.scriptResult=r }catch(e){log.scriptResult='THREW '+e.message} await new Promise(r=>setTimeout(r,1500)); }
  const uniq=a=>[...new Set(a)];
  console.log(JSON.stringify({file,uncaughtErrors:uniq(log.errors),unhandledRejections:uniq(log.rejections),consoleErrors:uniq(log.consoleErr).slice(0,15),supabaseCalls:log.sbCalls,fetches:uniq(log.fetches),scriptResult:log.scriptResult},null,1));
  process.exit(0);
},waitMs);
