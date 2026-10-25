// Run: node gen-seo.js   (in the repo root next to index.html). Re-run whenever you add/remove songs.
// Builds crawlable pages for every song + artist, songs.html, and sitemap.xml so Google can index them.
const fs=require('fs'),path=require('path');
const B='https://brians124.github.io/YAPSMUSIC.APP/';
const html=fs.readFileSync('index.html','utf8');
const a=html.indexOf('const tracks = [');
const b=html.indexOf('\n];',a)+3;
const tracks=(new Function(html.slice(a,b).replace('const tracks =','var tracks =')+';return tracks;'))();
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const slug=s=>String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'x';
const enc=p=>encodeURI(p);
const iso=d=>{const m=/^(\d+):(\d+)$/.exec(d||'');return m?`PT${+m[1]}M${+m[2]}S`:undefined};
const primary=s=>s.split(/\s+(?:ft\.?|feat\.?|featuring|&|x|,)\s+|\s*,\s*/i)[0].trim();
const today=new Date().toISOString().slice(0,10);
fs.mkdirSync('song',{recursive:true});fs.mkdirSync('artist',{recursive:true});
const css=`<style>:root{color-scheme:dark}body{margin:0;background:#050b22;color:#eef6ff;font:16px/1.6 system-ui,sans-serif}main{max-width:760px;margin:0 auto;padding:24px 16px 60px}a{color:#5cc8ff}img{max-width:240px;width:100%;border-radius:14px;display:block;margin:12px 0}.btn{display:inline-block;background:#1db954;color:#04110a;font-weight:800;padding:12px 22px;border-radius:30px;text-decoration:none;margin:10px 0}ul{padding-left:20px}nav a{margin-right:14px}</style>`;
const head=(t,d,url,img,extra='')=>`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t)}</title><meta name="description" content="${esc(d)}">
<link rel="canonical" href="${url}"><meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:site_name" content="YAPS Music"><meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${esc(d)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary"><link rel="icon" href="${B}favicon.ico?v=3"><meta name="theme-color" content="#050814">
${extra}${css}</head><body><main>`;
const nav=`<nav><a href="${B}">YAPS Music</a><a href="${B}songs.html">All songs</a><a href="${B}studio.html">YAPS DJ Studio</a></nav>`;
const urls=[[B,'1.0','daily'],[B+'studio.html','0.7','weekly'],[B+'songs.html','0.8','weekly']];
const byArtist={};
for(const t of tracks){
  const s=`${t.id}-${slug(t.title)}-${slug(primary(t.artist))}`;
  t._url=`${B}song/${s}.html`;t._file=`song/${s}.html`;
  const p=primary(t.artist);(byArtist[p]=byArtist[p]||[]).push(t);
}
for(const t of tracks){
  const p=primary(t.artist),img=B+enc(t.img||'images/yaps-cover.png');
  const title=`${t.title} - ${t.artist} | Listen on YAPS Music`;
  const desc=`Listen to "${t.title}" by ${t.artist} on YAPS Music (YAPSMusic). ${t.genre||'Music'}${t.duration?`, ${t.duration}`:''}. Stream free on YAPS, the Ugandan and African music app with YAPS AI.`;
  const ld={"@context":"https://schema.org","@type":"MusicRecording","name":t.title,"url":t._url,"image":img,"byArtist":{"@type":"MusicGroup","name":t.artist,"url":`${B}artist/${slug(p)}.html`},"genre":t.genre,"duration":iso(t.duration),"inLanguage":(t.tags||[]).includes('Luganda')?'lg':undefined,"isPartOf":{"@type":"WebSite","name":"YAPS Music","url":B},"potentialAction":{"@type":"ListenAction","target":`${B}?track=${encodeURIComponent(t.id)}`}};
  const others=byArtist[p].filter(x=>x!==t).slice(0,8);
  fs.writeFileSync(t._file,head(title,desc,t._url,img,`<script type="application/ld+json">${JSON.stringify(ld)}</script>\n`)+
`${nav}<h1>${esc(t.title)} - ${esc(t.artist)}</h1>
<img src="${B+enc(t.img||'images/yaps-cover.png')}" alt="${esc(t.title)} by ${esc(t.artist)}" width="240" height="240">
<p><strong>${esc(t.title)}</strong> by <a href="${B}artist/${slug(p)}.html">${esc(t.artist)}</a> is available to stream free on <strong>YAPS Music</strong> (YAPSMusic), the Ugandan and African music app with YAPS AI, YAPS DJ Studio and offline downloads.</p>
<p>Genre: ${esc(t.genre||'Music')}${t.duration?` &middot; Duration: ${esc(t.duration)}`:''}${t.region?` &middot; Region: ${esc(t.region)}`:''}</p>
<a class="btn" href="${B}?track=${encodeURIComponent(t.id)}">&#9654; Play "${esc(t.title)}" on YAPS Music</a>
${others.length?`<h2>More from ${esc(p)}</h2><ul>${others.map(o=>`<li><a href="${o._url}">${esc(o.title)} - ${esc(o.artist)}</a></li>`).join('')}</ul>`:''}
</main></body></html>`);
  urls.push([t._url,'0.6','monthly']);
}
for(const [p,list] of Object.entries(byArtist)){
  const u=`${B}artist/${slug(p)}.html`,img=B+enc(list[0].img||'images/yaps-cover.png');
  const title=`${p} songs, music & latest tracks | YAPS Music`;
  const desc=`Stream ${p} songs free on YAPS Music (YAPSMusic): ${list.slice(0,5).map(x=>x.title).join(', ')}${list.length>5?' and more':''}.`;
  const ld={"@context":"https://schema.org","@type":"MusicGroup","name":p,"url":u,"image":img,"track":list.map(x=>({"@type":"MusicRecording","name":x.title,"url":x._url}))};
  fs.writeFileSync(`artist/${slug(p)}.html`,head(title,desc,u,img,`<script type="application/ld+json">${JSON.stringify(ld)}</script>\n`)+
`${nav}<h1>${esc(p)} on YAPS Music</h1><img src="${img}" alt="${esc(p)}" width="240" height="240">
<p>Listen to ${esc(p)} songs on YAPS Music (YAPSMusic), free.</p><ul>${list.map(x=>`<li><a href="${x._url}">${esc(x.title)}</a>${x.artist!==p?` - ${esc(x.artist)}`:''}</li>`).join('')}</ul>
<a class="btn" href="${B}">Open YAPS Music</a></main></body></html>`);
  urls.push([u,'0.7','weekly']);
}
fs.writeFileSync('songs.html',head('All songs on YAPS Music (YAPSMusic) | Ugandan & African music, YAPS AI','Browse every song on YAPS Music (YAPSMusic): Ugandan and African Afrobeats, Luganda Pop, Gospel, Hip-Hop and more. Stream free.',B+'songs.html',B+'images/yaps-cover.png?v=2')+
`${nav}<h1>All songs on YAPS Music</h1><ul>${tracks.map(t=>`<li><a href="${t._url}">${esc(t.title)}</a> - ${esc(t.artist)}</li>`).join('')}</ul><h2>Artists</h2><ul>${Object.keys(byArtist).sort().map(p=>`<li><a href="${B}artist/${slug(p)}.html">${esc(p)}</a></li>`).join('')}</ul></main></body></html>`);
fs.writeFileSync('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u,p,c])=>`  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>${c}</changefreq><priority>${p}</priority></url>`).join('\n')}\n</urlset>\n`);
console.log(tracks.length+' songs, '+Object.keys(byArtist).length+' artists, '+urls.length+' URLs');
