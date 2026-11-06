/* Static GitHub Pages character loader. Sequentially loads each independent
   character folder before booting the unchanged AdvengerSAGA battle application. */
(async function(){
 'use strict';
 const list=window.AdvengerCharacterManifest;
 if(!Array.isArray(list)||!list.length)throw new Error('Character manifest missing');
 const seen=new Set();
 const load=(src)=>new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=src;script.async=false;
  script.onload=resolve;script.onerror=()=>reject(new Error('Cannot load '+src));
  document.body.appendChild(script);
 });
 try{
  for(const entry of list){
   if(!entry||typeof entry.id!=='string'||!/^[a-z0-9-]+$/.test(entry.id)||
      !Array.isArray(entry.scripts)||!entry.scripts.length||seen.has(entry.id))
    throw new Error('Invalid or duplicate character manifest entry');
   seen.add(entry.id);
   const version=Number.isInteger(entry.version)?entry.version:1;
   for(const path of entry.scripts){
    if(typeof path!=='string'||!path.startsWith('characters/'+entry.id+'/')||
       !/^characters\/[a-z0-9-]+\/[a-z0-9_/-]+\.js$/.test(path)||
       path.includes('..'))throw new Error('Unsafe character script '+path);
    await load(path+'?v='+version);
   }
   if(!window.AdvengerCharacters?.get(entry.id))
    throw new Error('Character did not register: '+entry.id);
  }
  await load('js/app.js?v=0.8');
 }catch(err){
  console.error('[AdvengerSAGA] Character loader:',err);
  const info=document.createElement('div');
  info.setAttribute('role','alert');
  info.style.cssText='position:fixed;inset:auto 12px 12px;z-index:9999;padding:16px;border-radius:12px;background:#472233;color:white;box-shadow:0 8px 20px #0009';
  info.textContent='โหลดข้อมูลตัวละครไม่สำเร็จ: '+err.message;
  document.body.appendChild(info);
 }
})();