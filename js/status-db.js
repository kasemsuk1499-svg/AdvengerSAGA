/* AdvengerSAGA v1.3 — original status-effect catalog referencing
 * Seven Knights Re:BIRTH (not copied game assets or official game code).
 * Reference: https://gamewith.net/sevenknights-rebirth/70421
 * Numerical defaults are source-reference descriptions; per-skill power
 * and duration overrides take precedence. Combat math is adapted.
 */
(function(g){
 'use strict';
 const source='https://gamewith.net/sevenknights-rebirth/70421';
 const rows=[
  ['burn','เผาไหม้','Burn','dot','โจมตีด้วยไฟ ส่งผลเสียหายต่อเนื่องตาม ATK ผู้ใช้'],
  ['dragonFlame','เพลิงมังกร','Dragon Flame','dot','ไฟต่อเนื่องที่รุนแรงกว่า Burn และนับเป็นกลุ่มเผาไหม้'],
  ['bleed','เลือดไหล','Bleed','dot','เสียหายตาม ATK ผู้ใช้ สะสมได้สูงสุด 5 ชั้น'],
  ['poison','พิษ','Poison','dot','เสีย HP สูงสุดเป็นเปอร์เซ็นต์ต่อรอบ โดยมีเพดานตาม ATK ผู้ใช้'],
  ['death','คำสาปมรณะ','Death','dot','เสีย HP ปัจจุบันทุกครั้งที่ครบรอบ และ KO เมื่อหมดระยะเวลา/โดนซ้ำ'],
  ['stun','มึนงง','Stun','control','ไม่สามารถออกคำสั่ง'],
  ['paralysis','อัมพาต','Paralysis','control','ไม่สามารถออกคำสั่ง และอัตราบล็อกเป็นศูนย์'],
  ['shock','ช็อกไฟฟ้า','Shock','control','ไม่สามารถออกคำสั่ง และรับความเสียหายเพิ่มเมื่อโดนโจมตี'],
  ['freeze','แช่แข็ง','Freeze','control','ไม่สามารถออกคำสั่ง; หลุดเมื่อได้รับการโจมตีและปล่อยความเสียหายเมื่อสิ้นสุด'],
  ['petrify','กลายเป็นหิน','Petrify','control','ไม่สามารถออกคำสั่ง; ปลดสถานะแล้วเกิดความเสียหาย'],
  ['blind','ตาบอด','Blind','restriction','การโจมตีปกติ/สวนกลับ/ติดตาม พลาดเป้าเชิงประสิทธิภาพ'],
  ['silence','ใบ้สกิล','Silence','restriction','ไม่สามารถใช้สกิล Active หรือ Ultimate แต่โจมตีปกติได้'],
  ['sleep','หลับ','Sleep','control','ไม่สามารถออกคำสั่ง; ได้รับความเสียหายถึง 7% HP สูงสุดจึงตื่น'],
  ['fear','หวาดกลัว','Fear','control','ไม่สามารถออกคำสั่ง และเสียความสามารถหลบเลี่ยงดีบัฟ'],
  ['confusion','สับสน','Confusion','restriction','การโจมตีบางครั้งกลายเป็น Fumble'],
  ['healBlock','ห้ามฟื้นฟู','Unable to Recover','restriction','ไม่สามารถรับการรักษา'],
  ['soulDeath','สลายวิญญาณ','Soul Death','restriction','ไม่สามารถชุบชีวิตหรือฟื้นจากความตายระหว่างติดสถานะ']
 ];
 const groups=Object.freeze({dot:'เสียหายต่อเนื่อง',control:'ควบคุมการกระทำ',restriction:'จำกัดความสามารถ'});
 const controls=new Set(['stun','paralysis','shock','freeze','petrify','sleep','fear']);
 const catalogue=Object.freeze(Object.fromEntries(rows.map(([id,nameTh,name,category,description])=>
  [id,Object.freeze({id,name,nameTh,category,description,source})])));
 const extras=[
  ['attackDown','ATK↓',true],['defenseDown','DEF↓',true],
  ['physicalVulnerability','รับกายภาพเพิ่ม',true],['damageReductionDown','ต้านทานลด',true],
  ['defenseUp','DEF↑',false],['physicalDamageUp','กายภาพ↑',false],
  ['weaknessBoost','โจมตีจุดอ่อน↑',false],['poisonImmunity','ป้องกันพิษ',false],
  ['magicImmunity','คุ้มกันเวท',false],['statusImmunity','ป้องกันสถานะ',false],
  ['ccImmunity','ป้องกันควบคุม',false],['burnImmunity','ป้องกันไฟ',false],
  ['bleedImmunity','ป้องกันเลือดไหล',false]
 ];
 const labels=Object.freeze({
  ...Object.fromEntries(rows.map(([id,nameTh])=>[id,nameTh])),
  ...Object.fromEntries(extras.map(([id,label])=>[id,label]))
 });
 const negative=new Set([...rows.map(x=>x[0]),...extras.filter(x=>x[2]).map(x=>x[0])]);
 const dot=new Set(['burn','dragonFlame','bleed','poison','death']);
 g.AdvengerStatusDB=Object.freeze({
  version:1,source,groups,labels,
  all:()=>Object.values(catalogue),get:id=>catalogue[id]||null,
  has:id=>Object.hasOwn(labels,id),isNegative:id=>negative.has(id),
  isControl:id=>controls.has(id),isDot:id=>dot.has(id),
  negative:Object.freeze(Array.from(negative)),
  controls:Object.freeze(Array.from(controls))
 });
})(window);
