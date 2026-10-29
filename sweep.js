(async()=>{
 window.confirm=()=>false; window.prompt=()=>null; window.alert=()=>{}; window.open=()=>null;
 const log=window.__log; const out=[]; const seen=new Set();
 const sel='button,[onclick],[role=button],input[type=button],input[type=submit],summary';
 const all=[...document.querySelectorAll(sel)];
 const tick=()=>new Promise(r=>setTimeout(r,0));
 let n=0;
 for(const el of all){
   if(el.disabled) continue;
   const desc=(el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+' "'+(el.textContent||el.getAttribute('aria-label')||el.title||'').trim().replace(/\s+/g,' ').slice(0,28)+'" '+((el.getAttribute('onclick')||'').slice(0,70)));
   if(seen.has(desc)) continue; seen.add(desc); n++;
   const e0=log.errors.length, r0=log.rejections.length;
   try{ el.click(); }catch(err){ out.push({desc,thrown:String(err.message).slice(0,140)}); continue }
   await tick(); await new Promise(r=>setTimeout(r,5));
   const newE=log.errors.slice(e0).filter(x=>!/not implemented|navigation/i.test(x));
   const newR=log.rejections.slice(r0);
   if(newE.length||newR.length) out.push({desc,errors:newE.map(x=>x.slice(0,160)),rejections:newR.map(x=>x.slice(0,100))});
 }
 return {clicked:n,failing:out};
})()
