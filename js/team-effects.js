/* Optimized shared-field effects: cached glow sprites, max 30 Canvas FPS,
   idle suspension and a maximum of 16 impact residues. No endless draw loop. */
(function(g){
 'use strict';
 const colors={
  water:'#66ccff',fire:'#ff9564',wind:'#79f1bd',lightning:'#ffe58e',
  void:'#c7a0ff',arcane:'#bca6ff',frost:'#9de7ff',storm:'#ffdf99',
  nature:'#76e2ad',earth:'#deb784',metal:'#e3e9ff',
  kinetic:'#8beaff',ice:'#b1eaff'
 };
 class EffectField{
  constructor(stage,canvas){
   this.stage=stage;this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});
   this.events=[];this.marks=[];this.textures=new Map();this.frame=0;this.last=0;this.seq=0;
   this.small=matchMedia('(max-width:760px)').matches;
   this.bound=this.tick.bind(this);
   this.resize=this.resize.bind(this);
   if(typeof ResizeObserver!=='undefined'){this.observer=new ResizeObserver(this.resize);this.observer.observe(stage)}
   else addEventListener('resize',this.resize,{passive:true});
   this.resize();
  }
  resize(){
   const r=this.stage.getBoundingClientRect();this.w=Math.max(1,r.width);this.h=Math.max(1,r.height);
   const dpr=Math.min(this.small?1.3:1.7,devicePixelRatio||1);
   this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);
   this.ctx.setTransform(dpr,0,0,dpr,0,0);
   this.drawFrame(performance.now());
  }
  color(e){return colors[e]||'#d8e9ff'}
  texture(hex){
   if(this.textures.has(hex))return this.textures.get(hex);
   const c=document.createElement('canvas');c.width=c.height=128;
   const ctx=c.getContext('2d');const grd=ctx.createRadialGradient(64,64,1,64,64,62);
   grd.addColorStop(0,'#ffffff');grd.addColorStop(.14,hex);
   grd.addColorStop(.39,hex+'91');grd.addColorStop(1,hex+'00');
   ctx.fillStyle=grd;ctx.fillRect(0,0,128,128);
   this.textures.set(hex,c);return c;
  }
  point(node){
   const a=this.stage.getBoundingClientRect(),b=node.getBoundingClientRect();
   return {x:b.left-a.left+b.width*.5,y:b.top-a.top+b.height*.48};
  }
  emit(type,src,dest,color,duration=550,opt={}){
   this.events.push({type,src,dest,color,begin:performance.now(),duration,...opt});
   if(this.events.length>48)this.events.splice(0,this.events.length-48);
   this.request();
  }
  impact(dest,color,intensity=1,role='slash'){
   this.emit('burst',dest,dest,color,intensity>1?540:390,{intensity,role});
   this.marks.push({x:dest.x,y:Math.min(this.h-15,dest.y+47),start:performance.now(),color,size:Math.min(95,46+20*intensity),role});
   if(this.marks.length>16)this.marks.shift();
   this.request();
  }
  request(){if(!this.frame)this.frame=requestAnimationFrame(this.bound)}
  tick(now){
   this.frame=0;
   if(now-this.last<33-1){this.request();return}this.last=now;
   this.drawFrame(now);
   if(this.events.length||this.marks.length)this.request();
  }
  clear(){this.events=[];this.marks=[];if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.drawFrame(performance.now())}
  destroy(){this.clear();this.observer?.disconnect();if(!this.observer)removeEventListener('resize',this.resize)}
  drawFrame(now){
   if(!this.ctx)return;
   const c=this.ctx;c.clearRect(0,0,this.w,this.h);
   this.marks=this.marks.filter(m=>now-m.start<2700);
   for(const m of this.marks){
    const p=(now-m.start)/2700,alpha=.46*(1-p);
    c.save();c.translate(m.x,m.y);c.globalAlpha=alpha;
    c.strokeStyle=m.color;c.lineWidth=m.role==='heavy'?3:1.7;
    c.beginPath();c.ellipse(0,0,m.size*(.64+p*.3),m.size*.18,0,0,Math.PI*2);c.stroke();
    c.globalAlpha=alpha*.5;c.drawImage(this.texture(m.color),-m.size/2,-m.size*.23,m.size,m.size*.46);
    c.restore();
   }
   this.events=this.events.filter(e=>now-e.begin<e.duration);
   for(const e of this.events){
    let t=Math.min(1,Math.max(0,(now-e.begin)/e.duration)),fade=t<.15?t/.15:Math.min(1,(1-t)/.3);
    const a=e.src,b=e.dest,color=e.color;
    c.save();c.globalCompositeOperation='screen';c.globalAlpha=fade;
    if(e.type==='projectile'||e.type==='meteor'){
     const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t-(e.type==='projectile'?Math.sin(t*Math.PI)*17:0);
     const angle=Math.atan2(b.y-a.y,b.x-a.x),size=e.role==='bullet'?22:39;
     c.drawImage(this.texture(color),x-size,y-size,size*2,size*2);
     c.strokeStyle=color;c.lineWidth=e.role==='bullet'?2:5;c.lineCap='round';
     c.beginPath();c.moveTo(x-Math.cos(angle)*Math.min(35,50*t),y-Math.sin(angle)*Math.min(35,50*t));c.lineTo(x,y);c.stroke();
    }else if(e.type==='rune'||e.type==='shield'||e.type==='lock'){
     const q=Math.min(1,t*2),size=(e.radius||56)*(0.7+q*.4);
     c.translate(b.x,b.y);c.rotate(t*Math.PI*(e.type==='rune'?.9:.3));c.strokeStyle=color;
     c.lineWidth=e.type==='shield'?4:2.2;
     for(let k=0;k<2;k++){
      c.beginPath();c.arc(0,0,size*(k?.72:1),0,Math.PI*2);c.stroke();
     }
     const n=e.type==='rune'?10:6;
     for(let k=0;k<n;k++){
      const h=k*2*Math.PI/n;c.beginPath();c.moveTo(Math.cos(h)*size*.83,Math.sin(h)*size*.83);
      c.lineTo(Math.cos(h)*size,Math.sin(h)*size);c.stroke();
     }
    }else if(e.type==='slash'){
     c.strokeStyle='#fff';c.lineWidth=5*(1-t)+1;c.lineCap='round';
     const radius=(e.intensity||1)*56;
     c.shadowColor=color;c.shadowBlur=this.small?7:11;
     c.beginPath();c.moveTo(b.x-radius,b.y+radius*.58);
     c.quadraticCurveTo(b.x+5,b.y-radius*.9,b.x+radius,b.y-radius*.4);c.stroke();
     c.shadowBlur=0;
     c.strokeStyle=color;c.lineWidth=2.5;c.stroke();
    }else if(e.type==='burst'){
     let radius=(e.intensity||1)*(10+t*65);
     c.drawImage(this.texture(color),b.x-radius,b.y-radius,radius*2,radius*2);
     c.strokeStyle=color;c.lineWidth=(e.role==='heavy'?4:2.2)*(1-t)+.3;
     c.beginPath();c.ellipse(b.x,b.y,radius,radius*.74,0,0,Math.PI*2);c.stroke();
     for(let k=0;k<9;k++){let q=(k*2.399+e.begin*.001),dist=radius*(.55+(k%3)*.16);
      c.strokeStyle=k%2?'#ffffff':color;c.lineWidth=2.4*(1-t);
      c.beginPath();c.moveTo(b.x+Math.cos(q)*dist,b.y+Math.sin(q)*dist);
      c.lineTo(b.x+Math.cos(q)*(dist+12),b.y+Math.sin(q)*(dist+12));c.stroke();
     }
    }else if(e.type==='beam'){
     c.strokeStyle=color;c.lineCap='round';c.lineWidth=(12+19*(1-t))*(e.intensity||1);
     c.shadowColor=color;c.shadowBlur=this.small?8:19;
     c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
     c.shadowBlur=0;c.strokeStyle='#fff';c.lineWidth=5;c.stroke();
    }else if(e.type==='charge'){
     const radius=20+40*t;
     c.drawImage(this.texture(color),b.x-radius,b.y-radius,radius*2,radius*2);
     c.strokeStyle=color;c.lineWidth=2;
     c.beginPath();c.arc(b.x,b.y,radius*.8,Math.PI*(1.5-t*2),Math.PI*(1.5-t*2)+Math.PI*1.4);c.stroke();
    }
    c.restore();
   }
  }
 }
 g.AdvengerEffectField=EffectField;
})(window);