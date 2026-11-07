/* AdvengerSAGA v1.6 — editable ONE character and 30-stat workshop.
 * All imported data validates in Character Creator; no dynamic JS execution.
 */
(function(g){
 'use strict';
 const C=g.AdvengerCharacterCreator;
 const S=g.AdvengerSkillCreator;
 const STATS=g.AdvengerStatDB;
 if(!C||!g.document)return;
 const $=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,t=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[t]));
 const core=['MAX_HP','P_ATK','M_ATK','DEF','SPD'];
 const baseId='saber';
 const presets=C.classIds.map(id=>g.AdvengerClasses[id]);
 const saved=C.get();
 let draft=saved?JSON.parse(JSON.stringify(saved)):
  {id:C.id,classId:baseId,name:'',nameTh:'',description:'',
   portrait:null,stats:C.initial(baseId),slots:{}};
 function message(value,error=false){
  $('charLabMessage').textContent=value;
  $('charLabMessage').classList.toggle('error',error);
 }
 function classImage(){
  return g.AdvengerCharacters.get(draft.classId)?.art||'characters/saber/art.svg';
 }
 function photo(){
  return draft.portrait&&C.imageAllowed(draft.portrait)?
   draft.portrait:classImage();
 }
 function renderPreview(){
  const klass=g.AdvengerClasses[draft.classId],base=g.AdvengerCharacters.get(draft.classId);
  $('charLabImage').src=photo();
  $('charLabClassLabel').textContent=klass.label.toUpperCase();
  $('charLabPreviewName').textContent=draft.nameTh||draft.name||'ตัวละครใหม่';
  $('charLabPreviewRole').textContent=(base.icon||'⚔️')+' '+klass.label+
   ' · '+klass.labelTh;
  $('charLabCorePreview').innerHTML=core.map(id=>
   '<div><small>'+esc(STATS.get(id).nameTh)+'</small>'+
   '<strong>'+Number(draft.stats[id]||0).toLocaleString()+'</strong></div>'
  ).join('');
 }
 function renderStats(){
  $('charLabStats').innerHTML=Object.entries(STATS.groups).map(([group,label])=>{
   const items=STATS.all().filter(x=>x.group===group);
   return '<details class="character-stat-group"'+(group==='core'?' open':'')+'>'+
    '<summary>'+esc(label)+' <small>'+items.length+' ค่า</small></summary>'+
    '<div class="character-stat-grid">'+items.map(item=>{
     const rate=item.unit==='rate';
     const raw=draft.stats[item.id]??0;
     const value=rate?Number((raw*100).toFixed(3)):raw;
     return '<label title="'+esc(item.description)+'">'+
      '<span>'+esc(item.nameTh)+'</span><small>'+esc(item.id)+
      '</small><div class="character-stat-entry"><input type="number" '+
      'data-char-stat="'+esc(item.id)+'" '+(rate?'data-rate="1" ':'')+
      'min="'+(item.id==='MAX_HP'?1:0)+'" max="'+(rate?10000:10000000)+
      '" step="'+(rate?'.1':'1')+'" value="'+esc(value)+'">'+
      '<em>'+(rate?'%':'')+'</em></div></label>';
    }).join('')+'</div></details>';
  }).join('');
 }
 function renderSkills(){
  const list=S.list();
  const active=S.assignments()?.[C.id];
  if(active&&saved){
   // The actual equipment DB is authoritative after the first creation.
   for(const slot of S.slots){
    if(active[slot])draft.slots[slot]=active[slot];
    else delete draft.slots[slot];
   }
  }
  const labels={basic:'Basic · โจมตีปกติ',skill1:'Skill 1',
   skill2:'Skill 2',ultimate:'Ultimate · ใช้ EX 100'};
  $('charLabSkills').innerHTML=S.slots.map(slot=>
   '<label>'+esc(labels[slot])+
   '<select data-char-slot="'+esc(slot)+'">'+
   '<option value="">ใช้ท่าตั้งต้น / ไม่ติดตั้ง</option>'+
   list.map(skill=>'<option value="'+esc(skill.id)+'"'+
    (draft.slots[slot]===skill.id?' selected':'')+'>'+
    esc(skill.name)+'</option>').join('')+'</select></label>'
  ).join('');
 }
 function updateBase(){
  draft.name=$('charLabName').value;
  draft.nameTh=$('charLabNameTh').value;
  draft.description=$('charLabDescription').value;
 }
 function draw(){
  $('charLabName').value=draft.name;
  $('charLabNameTh').value=draft.nameTh;
  $('charLabDescription').value=draft.description;
  $('charLabClass').value=draft.classId;
  renderStats();renderSkills();renderPreview();
 }
 function reload(){
  if(g.location?.reload){
   g.location.hash='#character';
   g.location.reload();
  }else{
   message('บันทึกแล้ว · โหลดหน้าใหม่เพื่อให้ตัวละครเข้าสู่หน้าจัดทีม');
  }
 }
 function save(){
  try{
   updateBase();
   for(const item of STATS.all()){
    const element=$('charLabStats').querySelector('[data-char-stat="'+item.id+'"]');
    if(!element)continue;
    const raw=element.value;
    if(raw===''||!Number.isFinite(Number(raw)))throw Error('กรอกค่า '+item.id+' ให้ถูกต้อง');
    draft.stats[item.id]=Number(raw)/(item.unit==='rate'?100:1);
   }
   const checked=C.save(draft);
   draft=checked;
   message('✅ บันทึก '+checked.name+' สำเร็จ · กำลังอัปเดตทีม');
   reload();
  }catch(e){message('⚠️ '+e.message,true)}
 }
 function bind(){
  for(const id of ['charLabName','charLabNameTh','charLabDescription'])
   $(id).addEventListener('input',()=>{updateBase();renderPreview()});
  $('charLabClass').addEventListener('change',event=>{
   draft.classId=event.target.value;
   draft.stats=C.initial(draft.classId);
   draft.portrait=null;
   $('charLabPortrait').value='';
   renderStats();renderPreview();
   message('เปลี่ยนอาชีพแล้ว ค่าสเตตัสรีเซ็ตเป็นค่าตั้งต้นของสายใหม่');
  });
  $('charLabPreset').addEventListener('click',()=>{
   if(typeof g.confirm==='function'&&!g.confirm('คืนค่าสเตตัสทั้ง 30 ค่าเป็นค่าตั้งต้นของอาชีพนี้?'))return;
   draft.stats=C.initial(draft.classId);renderStats();renderPreview();
   message('คืนค่าสเตตัสตั้งต้น '+g.AdvengerClasses[draft.classId].label+' แล้ว');
  });
  $('charLabStats').addEventListener('input',e=>{
   const id=e.target?.dataset?.charStat;
   if(!id||!STATS.get(id))return;
   const n=Number(e.target.value);
   draft.stats[id]=e.target.value===''?NaN:n/(e.target.dataset.rate==='1'?100:1);
   renderPreview();
  });
  $('charLabSkills').addEventListener('change',e=>{
   const slot=e.target?.dataset?.charSlot;
   if(!S.slots.includes(slot))return;
   if(e.target.value)draft.slots[slot]=e.target.value;
   else delete draft.slots[slot];
  });
  $('charLabPortrait').addEventListener('change',event=>{
   const file=event.target.files?.[0];
   if(!file)return;
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)||
     file.size>600*1024){
    event.target.value='';
    return message('⚠️ กรุณาใช้ PNG, JPG หรือ WebP ขนาดไม่เกิน 600 KB',true);
   }
   if(typeof g.FileReader!=='function')
    return message('เบราว์เซอร์นี้ไม่รองรับการอัปโหลดรูป',true);
   const reader=new g.FileReader();
   reader.onload=()=>{
    const encoded=String(reader.result||'');
    if(!C.imageAllowed(encoded))
     return message('ภาพไม่อยู่ในรูปแบบที่รองรับ',true);
    draft.portrait=encoded;renderPreview();
    message('✅ ใส่ภาพตัวละครแล้ว (ยังไม่ได้บันทึก)');
   };
   reader.onerror=()=>message('ไม่สามารถอ่านไฟล์ภาพได้',true);
   reader.readAsDataURL(file);
  });
  $('charLabResetPortrait').addEventListener('click',()=>{
   draft.portrait=null;$('charLabPortrait').value='';
   renderPreview();message('กลับไปใช้ภาพตัวอย่างจากอาชีพ');
  });
  $('charLabSave').addEventListener('click',save);
  $('charLabDelete').addEventListener('click',()=>{
   if(!C.get())return message('ยังไม่มีตัวละครที่บันทึกไว้');
   if(typeof g.confirm==='function'&&!g.confirm('ลบตัวละครที่สร้างเอง 1 ตัว? หากอยู่ในทีม เกมจะคืนทีมเริ่มต้นหลังรีโหลด'))return;
   C.remove();reload();
  });
  $('charLabExport').addEventListener('click',()=>{
   if(!C.get())return message('บันทึกตัวละครก่อนส่งออก JSON',true);
   $('charLabTransfer').value=JSON.stringify(C.exportData(),null,2);
   message('📤 ส่งออกตัวละครและคลังสกิลเป็น JSON แล้ว · คัดลอกสำรองไว้ได้');
  });
  $('charLabImport').addEventListener('click',()=>{
   try{
    const text=$('charLabTransfer').value;
    if(text.length>3500000)throw Error('ไฟล์ JSON ใหญ่เกินกำหนด');
    const parsed=JSON.parse(text);
    if(typeof g.confirm==='function'&&!g.confirm('นำเข้าข้อมูลนี้แทนตัวละครและคลังสกิลเดิมในเบราว์เซอร์นี้?'))return;
    const restored=C.importData(parsed);
    message('✅ นำเข้าตัวละคร '+restored.name+' แล้ว');reload();
   }catch(e){message('⚠️ นำเข้าไม่สำเร็จ: '+e.message,true)}
  });
 }
 function init(){
  draw();bind();
  if(C.get())message('มีตัวละครที่สร้างไว้แล้ว 1 ตัว · สามารถแก้ไขและบันทึกได้');
  else message('ยังไม่มีตัวละคร · กรอกชื่อและกดบันทึกเพื่อสร้างตัวแรก');
  if(g.location?.hash==='#character'){
   const tab=document.querySelector('[data-screen="character"]');
   tab?.click?.();
  }
 }
 init();
 g.AdvengerCharacterCreatorUI=Object.freeze({render:draw,save});
})(window);
