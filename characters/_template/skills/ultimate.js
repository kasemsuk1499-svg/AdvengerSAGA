/* Only this character's Ultimate behavior. */
(function(){
 const id='new-hero';
 const slots=window.AdvengerCharacterSkills ||= {};
 const kit=slots[id] ||= {};
 kit.ultimate=async function(a){
  a.announce('ULTIMATE','ท่าไม้ตายเฉพาะตัว');
  await a.cinematic('ULTIMATE','CHARACTER EXCLUSIVE',900);
  await a.charge(300);
  const dash=a.rush(1100,'slash');
  await a.wait(620);a.hit(140,'slash');
  await a.wait(260);a.hit(260,'slash',true);
  await dash;
 };
})();