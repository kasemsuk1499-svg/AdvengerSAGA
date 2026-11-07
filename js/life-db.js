/* AdvengerSAGA v1.4 — Death/Revival Skill Effect Library.
 * Original metadata and skill building IDs inspired by Seven Knights Re:BIRTH.
 * References are attributed; not an official Netmarble API.
 */
(function(g){
 'use strict';
 const ref={
  status:'https://gamewith.net/sevenknights-rebirth/70421',
  effect:'https://gamewith.net/sevenknights-rebirth/70436',
  kris:'https://gamewith.net/sevenknights-rebirth/70600',
  rosie:'https://gamewith.net/sevenknights-rebirth/70501',
  ring:'https://guide.netmarble.com/tskgb/65'
 };
 const rows=[
  ['death','คำสาปมรณะ','Death','ailment','status','ทำดาเมจจาก HP ปัจจุบันทุกครั้งที่จบรอบ และ KO เมื่อครบเวลา ติด Death อีกครั้งระหว่างติดอยู่จะ KO ทันที',ref.status],
  ['deathImmunity','ภูมิคุ้มกันมรณะ','Death Immunity','defense','status','ไม่รับสถานะ Death ระหว่างภูมิคุ้มกันมีผล',ref.status],
  ['soulDeath','สลายวิญญาณ','Soul Death','ailment','status','ถ้าตายขณะติดสถานะ จะใช้ Revive หรือ Immortality ไม่ได้ แต่ Guts ที่ป้องกันการตายยังทำงาน',ref.effect],
  ['revive','ชุบชีวิต','Revive','recovery','revive','ชุบสมาชิกที่ KO กลับมาด้วย HP ตามเปอร์เซ็นต์ที่กำหนด ไม่คืนคิวที่ใช้ไปแล้ว',ref.rosie],
  ['autoRevive','คืนชีพอัตโนมัติ','Auto Revive','recovery','autoRevive','เมื่อได้รับความเสียหายถึงตายจะคืนชีพโดยอัตโนมัติ ตาม HP และจำนวนครั้งที่สกิลกำหนด',ref.ring],
  ['guts','ฮึดสู้','Guts','survival','guts','รอดจากความเสียหายถึงตายหนึ่งครั้งด้วย HP 1; ไม่ใช่การชุบผู้ที่ตายไปแล้ว',ref.effect],
  ['immortality','อมตะชั่วคราว','Immortality','survival','immortality','เมื่อเกิดความเสียหายถึงตาย จะฟื้นด้วย HP 1 และคงไว้ที่ 1 ชั่วระยะเวลาที่กำหนด แล้ว KO เมื่อหมดเวลา',ref.effect],
  ['execute','สำเร็จโทษ','Execution','offense','execute','ทำให้เป้าหมาย KO เมื่อเข้าเกณฑ์สัดส่วน HP และข้อจำกัด HP เทียบกับพลังโจมตีผู้ใช้',ref.effect],
  ['damageImmunity','ภูมิคุ้มกันความเสียหาย','Damage Immunity','defense','status','ป้องกันความเสียหายทั่วไปช่วงเวลาที่กำหนด แยกจากการป้องกันสถานะมรณะ',ref.effect]
 ];
 const groups=Object.freeze({ailment:'คำสาป/ขัดขวาง',offense:'โจมตีถึงตาย',recovery:'คืนชีพ',survival:'เอาชีวิตรอด',defense:'ภูมิคุ้มกัน'});
 const entries=Object.freeze(rows.map(([id,nameTh,name,group,effectType,description,source])=>
  Object.freeze({id,nameTh,name,group,effectType,description,source})));
 const index=Object.freeze(Object.fromEntries(entries.map(v=>[v.id,v])));
 g.AdvengerLifeDB=Object.freeze({
  version:1,count:entries.length,groups,all:()=>entries.slice(),
  get:id=>Object.hasOwn(index,id)?index[id]:null
 });
})(window);
