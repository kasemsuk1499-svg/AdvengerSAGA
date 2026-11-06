/* Only this character's Basic Attack behavior. */
(function(){
 const id='new-hero';
 const slots=window.AdvengerCharacterSkills ||= {};
 const kit=slots[id] ||= {};
 kit.basic=async function(a){
  a.announce('BASIC ATTACK','โจมตีพื้นฐาน');
  const dash=a.rush(640,'slash');
  await a.wait(345);a.hit(100,'slash');await dash;
 };
})();