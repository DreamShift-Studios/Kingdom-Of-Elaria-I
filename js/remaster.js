(function () {
  'use strict';

  const E = window.Elaria = window.Elaria || {};
  const TAU = Math.PI * 2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const worldLabel=id=>({elaria:'Elaria',greenhaven:'Greenhaven',darkForest:'Dark Forest',chaosCaves:'Chaos Caves',brokenRealm:'Broken Realm',eclipseChamber:'Eclipse Chamber'})[id]||id;

  class AmbientSystem {
    constructor(game){
      this.game=game;this.worldId='';this.time=0;this.wind=0;this.windTarget=.4;this.spawnClock=0;this.weatherClock=0;
      this.particles=[];this.pool=[];this.maxParticles=135;this.weather='breeze';this.intensity=.55;this.lightning=0;this.dayCycle=.25;
    }
    onWorldChanged(id){
      this.worldId=id;while(this.particles.length)this.release(this.particles.pop());this.wind=0;this.weatherClock=18+Math.random()*25;
      const profiles={elaria:['breeze',.38],greenhaven:['leaves',.75],darkForest:['mist',.7],chaosCaves:['crystalDust',.62],brokenRealm:['ash',.95],eclipseChamber:['ash',1.15]};
      const p=profiles[id]||profiles.elaria;this.weather=p[0];this.intensity=p[1];
    }
    acquire(){return this.pool.pop()||{};}
    release(p){if(this.pool.length<160)this.pool.push(p);}
    spawn(kind){
      if(this.particles.length>=this.maxParticles||Math.random()>Math.min(1.5,this.game.settings&&this.game.settings.particleDensity||1))return;
      const p=this.acquire(),cam=this.game.camera||{x:0,y:0};
      p.kind=kind;p.life=p.maxLife=3+Math.random()*7;p.phase=Math.random()*TAU;p.size=1+Math.random()*3;p.alpha=.25+Math.random()*.55;
      if(kind==='rain'){p.x=cam.x-80+Math.random()*1120;p.y=cam.y-80-Math.random()*180;p.vx=-35+this.wind*45;p.vy=390+Math.random()*170;p.life=p.maxLife=1.6;}
      else if(kind==='snow'){p.x=cam.x-70+Math.random()*1100;p.y=cam.y-50-Math.random()*120;p.vx=-4+this.wind*18;p.vy=22+Math.random()*24;p.life=p.maxLife=8+Math.random()*5;p.size=1+Math.random()*2.5;p.alpha=.45+Math.random()*.4;}
      else if(kind==='mist'){p.x=cam.x-180+Math.random()*1280;p.y=cam.y+Math.random()*540;p.vx=7+Math.random()*13;p.vy=(Math.random()-.5)*3;p.size=70+Math.random()*110;p.life=p.maxLife=9+Math.random()*8;p.alpha=.045+Math.random()*.06;}
      else {p.x=cam.x-60+Math.random()*1080;p.y=cam.y-30+Math.random()*600;p.vx=(12+Math.random()*28)*this.wind;p.vy=kind==='ash'?-7-Math.random()*8:kind==='crystal'?-3-Math.random()*6:8+Math.random()*15;p.rotation=Math.random()*TAU;p.spin=(Math.random()-.5)*5;}
      this.particles.push(p);
    }
    update(dt){
      this.time+=dt;this.dayCycle=((this.game.playtime||0)/300+.25)%1;if(this.worldId!==this.game.worldId)this.onWorldChanged(this.game.worldId);
      this.windTarget+=((Math.random()-.5)*.08);this.windTarget=clamp(this.windTarget,-.35,1.1);this.wind+=(this.windTarget-this.wind)*dt*.35;
      this.weatherClock-=dt;
      if(this.weatherClock<=0&&['elaria','greenhaven','darkForest'].includes(this.worldId)){
        if(this.worldId==='darkForest'){this.weather=this.weather==='snow'?'mist':'snow';this.weatherClock=this.weather==='snow'?18+Math.random()*16:30+Math.random()*30;this.game.ui&&this.game.ui.toast(this.weather==='snow'?'Cold ash-snow drifts through the canopy.':'The silver mist gathers again.');}
        else{this.weather=this.weather==='rain'?(this.worldId==='elaria'?'breeze':'leaves'):'rain';this.weatherClock=this.weather==='rain'?14+Math.random()*18:28+Math.random()*40;this.game.ui&&this.game.ui.toast(this.weather==='rain'?'A soft rain begins.':'The clouds begin to part.');}
      }
      this.spawnClock-=dt;const rate=this.weather==='rain'?.012:this.weather==='mist'?.055:this.weather==='snow'?.035:.07;
      while(this.spawnClock<=0){this.spawnClock+=rate/this.intensity;this.spawn(this.weather==='rain'?'rain':this.weather==='mist'?'mist':this.weather==='snow'?'snow':this.worldId==='chaosCaves'?'crystal':['brokenRealm','eclipseChamber'].includes(this.worldId)?'ash':'leaf');if(this.particles.length>=this.maxParticles)break;}
      for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0||p.y>(this.game.camera.y+650)){this.particles.splice(i,1);this.release(p);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.rotation=(p.rotation||0)+(p.spin||0)*dt;if(p.kind==='leaf'){p.x+=Math.sin(this.time*2+p.phase)*12*dt;p.y+=Math.cos(this.time*1.5+p.phase)*5*dt;}if(p.kind==='ash'||p.kind==='snow')p.x+=Math.sin(this.time+(p.phase||0))*8*dt;}
      this.updateNpcs(dt);
      if(this.game.audio&&this.game.audio.setAmbience){const night=this.dayCycle>.76||this.dayCycle<.08,ambience=this.weather==='rain'?'rain':this.weather==='snow'?'snow':night&&['elaria','greenhaven'].includes(this.worldId)?'night':this.worldId==='elaria'?'town':this.worldId==='darkForest'?'night':'wild';this.game.audio.setAmbience(ambience);}
      if(this.game.audio&&this.game.audio.setCombat&&this.game.player){const combat=(this.game.enemies||[]).some(e=>e&&!e.dead&&!e.dying&&Math.hypot(e.x-this.game.player.x,e.y-this.game.player.y)<Math.min(330,e.aggroRange||250));this.game.audio.setCombat(combat);}
      if(this.game.combatFeedback&&this.game.combatFeedback.timer>0)this.game.combatFeedback.timer-=dt;
    }
    updateNpcs(dt){
      const worlds=this.game.worlds,current=worlds&&worlds.current;if(!current||this.game.state!=='playing')return;
      for(const npc of current.npcs||[]){
        if(['guard','shopkeeper'].includes(npc.id))continue;
        if(npc.id==='escort_luma'){
          const active=this.game.quests&&this.game.quests.isActive&&this.game.quests.isActive('greenhaven_escort');
          if(this.game.quests&&this.game.quests.isCompleted&&this.game.quests.isCompleted('greenhaven_escort')){npc.marker='';npc.escortActive=false;}
          if(active&&npc.escortActive){
            const p=this.game.player,dx=p.x-npc.x,dy=p.y-npc.y,d=Math.hypot(dx,dy);npc.facing=Math.atan2(dy,dx);
            if(d>360){npc.x=p.x-36;npc.y=p.y+26;}
            else if(d>46){const nx=npc.x+dx/d*58*dt,ny=npc.y+dy/d*58*dt;if(!worlds.collides(nx,ny,10)){npc.x=nx;npc.y=ny;}}
            if(Math.hypot(p.x-930,p.y-790)<82&&Math.hypot(npc.x-930,npc.y-790)<125){npc.escortActive=false;npc.marker='';this.game.quests.event('escort_completed',{id:'escort_luma',uniqueId:'escort_luma'});this.game.ui&&this.game.ui.toast('Luma reached the Wayfarer Shrine safely.','success');this.game.audio&&this.game.audio.play('achievement');}
            continue;
          }
        }
        if(npc.homeX==null){npc.homeX=npc.x;npc.homeY=npc.y;npc.routineTimer=1+Math.random()*4;npc.routineAngle=Math.random()*TAU;}
        npc.routineTimer-=dt;if(npc.routineTimer<=0){npc.routineTimer=2+Math.random()*5;npc.routineAngle=Math.random()*TAU;}
        const pd=Math.hypot(this.game.player.x-npc.x,this.game.player.y-npc.y);if(pd<75){npc.facing=Math.atan2(this.game.player.y-npc.y,this.game.player.x-npc.x);continue;}
        const phase=Math.floor(this.dayCycle*4),offsets=[[0,0],[26,-18],[-22,24],[0,0]],target=offsets[phase],tx=npc.homeX+target[0],ty=npc.homeY+target[1];
        const dx=tx-npc.x,dy=ty-npc.y,home=Math.hypot(dx,dy);let angle=home>14?Math.atan2(dy,dx):npc.routineAngle;
        const speed=npc.id==='wizard'?5:9,nx=npc.x+Math.cos(angle)*speed*dt,ny=npc.y+Math.sin(angle)*speed*dt;
        if(!worlds.collides(nx,ny,10)){npc.x=nx;npc.y=ny;}
      }
    }
    drawLandmarks(ctx){
      const t=this.time,id=this.worldId;ctx.save();
      if(id==='elaria'){
        for(let i=0;i<5;i++){const x=1820+i*23,y=720+Math.sin(t*1.5+i)*2;ctx.fillStyle=i%2?'#d8b662':'#e9dca5';ctx.fillRect(x,y-25,3,22);ctx.fillStyle='#8a3e48';ctx.fillRect(x+3,y-24,12,7);}
      }else if(id==='greenhaven'){
        ctx.fillStyle='#367983';ctx.fillRect(745,110,120,165);for(let y=115;y<270;y+=16){ctx.fillStyle=`rgba(154,225,215,${.25+.16*Math.sin(t*2+y)})`;ctx.fillRect(758+Math.sin(t+y)*7,y,88,4);}ctx.fillStyle='#6e5434';ctx.fillRect(970,710,160,18);ctx.fillStyle='#9a7448';for(let x=980;x<1120;x+=24)ctx.fillRect(x,704,15,30);
      }else if(id==='darkForest'){
        for(let i=0;i<16;i++){const x=360+(i*149)%1320,y=240+(i*83)%980,glow=.35+Math.sin(t*2+i)*.15;ctx.globalAlpha=glow;ctx.fillStyle=i%3?'#68d0ae':'#a278d6';ctx.fillRect(x-4,y-4,8,5);ctx.fillRect(x-1,y,2,5);}ctx.globalAlpha=1;
      }else if(id==='chaosCaves'){
        ctx.strokeStyle='#6f6678';ctx.lineWidth=3;for(let y=660;y<=840;y+=140){ctx.beginPath();ctx.moveTo(120,y);ctx.lineTo(1680,y+Math.sin(y)*18);ctx.stroke();}ctx.strokeStyle='#94858c';ctx.lineWidth=2;for(let x=150;x<1680;x+=34){ctx.beginPath();ctx.moveTo(x,650);ctx.lineTo(x+15,850);ctx.stroke();}
      }else if(id==='brokenRealm'){
        for(let i=0;i<9;i++){const x=260+i*170+Math.sin(t*.45+i)*18,y=240+(i*97)%880+Math.sin(t*.7+i)*9;ctx.fillStyle='#56345f';ctx.fillRect(x,y,40+(i%3)*15,13);ctx.fillStyle='#b84cc3';ctx.globalAlpha=.24;ctx.fillRect(x+4,y-3,30,3);}ctx.globalAlpha=1;
      }
      ctx.restore();
    }
    drawFront(ctx){
      const cam=this.game.camera;ctx.save();
      for(const p of this.particles){if(p.kind==='mist')continue;const ratio=clamp(p.life/p.maxLife,0,1);ctx.globalAlpha=p.alpha*Math.min(1,ratio*2);ctx.translate(Math.round(p.x),Math.round(p.y));ctx.rotate(p.rotation||0);
        if(p.kind==='rain'){ctx.strokeStyle='#a7cbd5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-5,-14);ctx.stroke();}
        else if(p.kind==='snow'){ctx.fillStyle='#dce9e6';ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);}
        else if(p.kind==='crystal'){ctx.fillStyle=Math.sin(p.phase)>0?'#c48bea':'#75dae8';ctx.shadowBlur=5;ctx.shadowColor=ctx.fillStyle;ctx.fillRect(-1,-1,p.size,p.size);ctx.shadowBlur=0;}
        else if(p.kind==='ash'){ctx.fillStyle='#d080d8';ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);}
        else{ctx.fillStyle=this.worldId==='greenhaven'?'#72a94f':'#d5b75e';ctx.fillRect(-p.size,-p.size/2,p.size*2,p.size);}
        ctx.rotate(-(p.rotation||0));ctx.translate(-Math.round(p.x),-Math.round(p.y));
      }
      ctx.restore();
    }
    drawScreen(ctx){
      ctx.save();
      if(this.weather==='rain'){ctx.fillStyle='rgba(19,31,43,.08)';ctx.fillRect(0,0,960,540);}
      if(this.weather==='snow'){ctx.fillStyle='rgba(170,203,208,.035)';ctx.fillRect(0,0,960,540);}
      const night=this.dayCycle>.76||this.dayCycle<.08;if(night&&['elaria','greenhaven'].includes(this.worldId)){ctx.fillStyle='rgba(18,25,55,.16)';ctx.fillRect(0,0,960,540);ctx.globalCompositeOperation='screen';const moon=ctx.createRadialGradient(820,72,2,820,72,95);moon.addColorStop(0,'rgba(194,220,234,.12)');moon.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=moon;ctx.fillRect(720,-25,200,200);ctx.globalCompositeOperation='source-over';}
      if(this.weather==='mist')for(const p of this.particles){if(p.kind!=='mist')continue;const x=p.x-this.game.camera.x,y=p.y-this.game.camera.y;ctx.globalAlpha=p.alpha;ctx.fillStyle='#bed3d0';ctx.beginPath();ctx.ellipse(x,y,p.size,p.size*.22,0,0,TAU);ctx.fill();}
      const current=this.game.worlds&&this.game.worlds.current,cam=this.game.camera;if(current&&cam){ctx.globalCompositeOperation='screen';for(const it of current.interactables||[]){if(!['camp','forge','portal','waystone','save'].includes(it.type))continue;const x=it.x-cam.x,y=it.y-cam.y;if(x<-90||x>1050||y<-90||y>630)continue;const color=['camp','forge'].includes(it.type)?'rgba(255,139,65,.14)':it.type==='portal'?'rgba(193,77,230,.13)':'rgba(105,220,230,.11)',light=ctx.createRadialGradient(x,y,3,x,y,72);light.addColorStop(0,color);light.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=light;ctx.fillRect(x-74,y-74,148,148);}ctx.globalCompositeOperation='source-over';}
      const glow=ctx.createRadialGradient(480,270,80,480,270,520);glow.addColorStop(0,'rgba(255,238,183,.025)');glow.addColorStop(1,['brokenRealm','eclipseChamber'].includes(this.worldId)?'rgba(48,3,61,.22)':'rgba(5,4,10,.12)');ctx.globalAlpha=1;ctx.fillStyle=glow;ctx.fillRect(0,0,960,540);ctx.restore();
    }
  }

  function drawInteractIcon(ctx,it,time,opened){
    const x=Math.round(it.x),y=Math.round(it.y),bob=Math.sin(time*2.5+it.x)*2;ctx.save();
    if(it.type==='lore'){ctx.fillStyle=opened?'#665b56':'#d4c38f';ctx.fillRect(x-10,y-10+bob,20,15);ctx.fillStyle='#6f4052';ctx.fillRect(x-1,y-10+bob,2,15);ctx.fillStyle='#f2e4bd';ctx.fillRect(x-7,y-7+bob,5,2);}
    else if(it.type==='waystone'){ctx.shadowBlur=12;ctx.shadowColor='#71d9e2';ctx.fillStyle='#416a76';ctx.beginPath();ctx.moveTo(x,y-28+bob);ctx.lineTo(x+12,y+bob);ctx.lineTo(x,y+12+bob);ctx.lineTo(x-12,y+bob);ctx.closePath();ctx.fill();ctx.fillStyle='#9cece5';ctx.fillRect(x-2,y-16+bob,4,18);}
    else if(it.type==='forge'){ctx.fillStyle='#554d50';ctx.fillRect(x-16,y-1,32,11);ctx.fillRect(x-7,y+10,14,10);ctx.fillStyle='#e17b43';ctx.globalAlpha=.7+Math.sin(time*6)*.2;ctx.fillRect(x-9,y-13,18,10);}
    else if(it.type==='camp'){ctx.fillStyle='#795435';for(let a=0;a<3;a++){ctx.save();ctx.translate(x,y+8);ctx.rotate(a*TAU/3);ctx.fillRect(0,-2,18,4);ctx.restore();}ctx.fillStyle='#f3a34e';ctx.beginPath();ctx.moveTo(x,y+4);ctx.lineTo(x-7,y-10+bob);ctx.lineTo(x,y-6);ctx.lineTo(x+6,y-12+bob);ctx.lineTo(x+7,y+4);ctx.fill();}
    else if(it.type==='mine'){ctx.fillStyle=opened?'#4a4552':'#8e6cad';ctx.beginPath();ctx.moveTo(x,y-18);ctx.lineTo(x+11,y+8);ctx.lineTo(x-10,y+8);ctx.closePath();ctx.fill();ctx.fillStyle='#d6b9eb';ctx.fillRect(x-2,y-12,3,10);}
    else if(it.type==='fish'){ctx.strokeStyle='#a4cfd7';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,13+Math.sin(time*2)*2,0,TAU);ctx.stroke();ctx.fillStyle='#e3d596';ctx.fillRect(x-3,y-2,6,3);}
    else if(it.type==='shortcut'){ctx.strokeStyle='#8bdbe0';ctx.lineWidth=3;ctx.globalAlpha=.55+Math.sin(time*3)*.25;ctx.beginPath();ctx.ellipse(x,y-5,12,22,0,time%TAU,time%TAU+Math.PI*1.55);ctx.stroke();ctx.fillStyle='#d5f6ed';ctx.fillRect(x-2,y-8+bob,4,4);}
    else if(it.type==='secret'||it.type==='collectible'){ctx.globalAlpha=opened?.25:.65+Math.sin(time*4)*.25;ctx.fillStyle='#e4bc58';ctx.font='bold 17px monospace';ctx.textAlign='center';ctx.fillText('✦',x,y+bob);}
    ctx.restore();
  }

  // Layer remaster interactions and tactical helpers onto the established worlds.
  const World=E.WorldManager&&E.WorldManager.prototype;
  if(World){
    const baseInteract=World.interact;
    World.interact=function(){
      const it=this.nearby,g=this.game;if(!it||!['lore','waystone','forge','camp','mine','fish','secret','shortcut','collectible'].includes(it.type))return baseInteract.call(this);
      if(it.type==='lore'){
        const lore=E.LORE[it.id];if(!lore)return;g.progression&&g.progression.collectLore(it.id);g.startDialogue({name:lore.title,portrait:'wizard',lines:[lore.text]});
      }else if(it.type==='waystone'){
        g.progression&&g.progression.unlockTravel(it.id);g.ui&&g.ui.openMap(false);
      }else if(it.type==='forge'||it.type==='camp')g.ui&&g.ui.openCrafting(it.type==='forge'?'forge':'camp');
      else if(it.type==='mine'){
        const legacyKey=`resource:${it.id}`;if(g.chestsOpened.has(legacyKey))g.chestsOpened.delete(legacyKey);const gathered=g.progression&&g.progression.gather('mine',it.id);if(gathered)g.particles&&g.particles.burst(it.x,it.y,'#b37bd2',16,90,3,.6,{kind:'spark',glow:5});
      }else if(it.type==='fish'){
        g.startDialogue({name:'Quiet Waters',portrait:'survivor',lines:[{text:'The water stirs beneath your line.',choices:[{text:'Wait for the right moment',action:()=>g.progression&&g.progression.gather('fish',it.id)},{text:'Leave the water undisturbed',close:true}]}]});
      }else if(it.type==='secret'){
        const first=!g.chestsOpened.has(it.id);if(first){g.chestsOpened.add(it.id);g.progression&&g.progression.discover(it.id);g.inventory.add('greater_health_potion',1);g.player.gold+=35;}
        g.quests&&g.quests.event('area_discovered',{id:'waterfall_cave',area:'waterfall_cave',world:g.currentWorldId||g.worldId});
        const cavern=it.id==='waterfall_cave';if(cavern&&g.player){g.player.x=1745;g.player.y=1685;g.player.vx=g.player.vy=0;g.camera.x=clamp(g.player.x-480,0,1440);g.camera.y=clamp(g.player.y-270,0,1360);g.ui&&g.ui.showArea('Echoing Waterfall Cavern');}
        const defeated=g.chestsOpened.has('warden_of_echoes_defeated'),awake=(g.enemies||[]).some(enemy=>enemy&&!enemy.dead&&enemy.name==='Warden of Echoes');
        if(!defeated&&!awake){const warden=g.spawnEnemy&&g.spawnEnemy('eliteGolem',cavern?2070:it.x+95,cavern?1680:it.y+55,{name:'Warden of Echoes',elite:true,health:520,dropBonus:1.8});if(warden)warden.name='Warden of Echoes';g.ui&&g.ui.toast(first?'Secret cave discovered — something ancient awakens!':'The Warden reforms from the chamber’s echoes!','rare');g.audio&&g.audio.play('secret');}
        else g.ui&&g.ui.toast(defeated?'The hidden chamber is peaceful now.':'The Warden is already awake.');
      }else if(it.type==='shortcut'){
        const target=it.target||{};if(g.player){g.player.x=Number(target.x)||g.player.x;g.player.y=Number(target.y)||g.player.y;g.player.vx=g.player.vy=0;g.camera.x=clamp(g.player.x-480,0,Math.max(0,this.current.width-960));g.camera.y=clamp(g.player.y-270,0,Math.max(0,this.current.height-540));g.audio&&g.audio.play('teleport');}
      }else if(it.type==='collectible'){
        if(!g.chestsOpened.has(it.id)){g.chestsOpened.add(it.id);g.progression&&g.progression.discover(it.id);g.inventory.add('chaos_fragment',1);g.ui&&g.ui.toast('A lost memory settles into your hand.','rare');}
      }
    };
    const baseTalk=World.talk;
    World.talk=function(npc){
      if(npc.id==='cave_merchant'){this.game.shop&&this.game.shop.open('caves');return;}
      if(npc.id==='final_merchant'){this.game.shop&&this.game.shop.open('final');return;}
      if(npc.id==='escort_luma'){
        const done=this.game.quests&&this.game.quests.isCompleted&&this.game.quests.isCompleted('greenhaven_escort');
        if(done){this.game.startDialogue({name:'Luma, Young Ranger',portrait:'survivor',lines:['The shrine is safe, and so am I. One day I will guide someone else home.']});return;}
        this.game.quests&&this.game.quests.startQuest&&this.game.quests.startQuest('greenhaven_escort');npc.escortActive=true;
        this.game.startDialogue({name:'Luma, Young Ranger',portrait:'survivor',lines:['The eastern trail is closing behind me. Stay near, and guide me west to the Wayfarer Shrine.','If I fall too far behind, I will follow the sound of your footsteps.']});return;
      }
      if(/^realm_prisoner_/.test(npc.id)){
        const key=`rescue:${npc.id}`;if(this.game.chestsOpened.has(key)){this.game.startDialogue({name:npc.name,portrait:'survivor',lines:['You broke the chain. I will follow the Last Light out when the fortress falls.']});return;}
        this.game.startDialogue({name:npc.name,portrait:'survivor',lines:['Velymoor bound my name to this place. Speak it once more, and the chain will break.',`${npc.name}. I remember. Thank you, {player}.`],onComplete:()=>{this.game.chestsOpened.add(key);npc.marker='';this.game.quests&&this.game.quests.event('npc_rescued',{id:npc.id,uniqueId:npc.id,type:'realm_prisoner',tags:['realm_prisoner','prisoner']});this.game.saveNow&&this.game.saveNow('rescue');}});return;
      }
      if(npc.id==='miner'&&this.game.quests&&this.game.quests.states&&this.game.quests.states.cave_emergency&&this.game.quests.states.cave_emergency.status==='failed')this.game.quests.startQuest('cave_emergency');
      const conversations={
        lorekeeper:[['The castle archive burned, but books are stubborn things. Twelve records survived beyond the walls.','Bring their words home, {player}. A kingdom is more than the people breathing inside it—it is everyone they remember.'],['Maelor once argued with a stone tablet for three days. On the fourth, the tablet apologized. At least, that is how he tells it.']],
        camp_healer:[['Greenhaven herbs still grow beneath the corruption. Slime gel and living bark make a potent restorative at any cooking fire.'],['Tarin speaks of you often. Hope changes the way wounded people heal. I cannot explain it, but I have seen it.']]
      };
      if(conversations[npc.id]){const choices=conversations[npc.id],index=(Math.floor(this.game.playtime/19)+this.game.bossesDefeated.size)%choices.length;this.game.startDialogue({name:`${npc.name}, ${npc.role}`,portrait:'survivor',lines:choices[index]});return;}
      return baseTalk.call(this,npc);
    };
    const baseDrawInteractable=World.drawInteractable;
    World.drawInteractable=function(ctx,it){baseDrawInteractable.call(this,ctx,it);if(['lore','waystone','forge','camp','mine','fish','secret','shortcut','collectible'].includes(it.type)){const cooling=this.game.progression&&this.game.progression.resourceCooldowns&&this.game.progression.resourceCooldowns[it.id]>Date.now();drawInteractIcon(ctx,it,this.game.elapsed,this.game.chestsOpened.has(it.id)||cooling||(it.type==='lore'&&this.game.progression&&this.game.progression.collectibles.has(it.id)));}if(it.type==='portal'){ctx.save();ctx.fillStyle='#e19bf0';for(let i=0;i<4;i++){const a=this.game.elapsed*(1.4+i*.16)+i*TAU/4,r=18+Math.sin(this.game.elapsed*2+i)*5;ctx.globalAlpha=.45+i*.1;ctx.fillRect(it.x+Math.cos(a)*r-2,it.y-8+Math.sin(a)*28-2,4,4);}ctx.restore();}};
    World.hasLineOfSight=function(x1,y1,x2,y2){const steps=Math.max(2,Math.ceil(Math.hypot(x2-x1,y2-y1)/28));for(let i=1;i<steps;i++){const f=i/steps;if(this.collides(x1+(x2-x1)*f,y1+(y2-y1)*f,4))return false;}return true;};
    const baseDraw=World.draw;World.draw=function(ctx,camera){baseDraw.call(this,ctx,camera);this.game.ambient&&this.game.ambient.drawLandmarks(ctx);};
    const baseForeground=World.drawForeground;World.drawForeground=function(ctx,camera){baseForeground&&baseForeground.call(this,ctx,camera);this.game.ambient&&this.game.ambient.drawFront(ctx);};
    const baseLighting=World.drawLighting;World.drawLighting=function(ctx,camera){baseLighting&&baseLighting.call(this,ctx,camera);this.game.ambient&&this.game.ambient.drawScreen(ctx);};
    const baseNpc=World.drawNpc;World.drawNpc=function(ctx,n){if(/^realm_prisoner_/.test(n.id)&&this.game.chestsOpened.has(`rescue:${n.id}`))n.marker='';if(n.id==='escort_luma'&&this.game.quests&&this.game.quests.isCompleted&&this.game.quests.isCompleted('greenhaven_escort'))n.marker='';baseNpc.call(this,ctx,n);const p=this.game.player;if(!p)return;const d=Math.hypot(p.x-n.x,p.y-n.y);if(d<70){const bob=Math.sin(this.game.elapsed*3+n.x)*1.5,lookX=Math.sign(p.x-n.x)*2,lookY=Math.sign(p.y-n.y);ctx.save();ctx.fillStyle='#d4a178';ctx.fillRect(n.x-7,n.y-25+bob,14,7);ctx.fillStyle='#17121a';ctx.fillRect(n.x-4+lookX,n.y-23+bob+lookY,2,2);ctx.fillRect(n.x+2+lookX,n.y-23+bob+lookY,2,2);ctx.globalAlpha=.72;ctx.fillStyle='#f0d47e';ctx.font='10px monospace';ctx.textAlign='center';const emotion=/realm_prisoner/.test(n.id)?'♡':n.id==='escort_luma'?'!':this.game.bossesDefeated.size?'♥':'·';ctx.fillText(emotion,n.x,n.y-38);ctx.restore();}};
  }

  // Player animation and combat feel extensions.
  const Player=E.Player&&E.Player.prototype;
  if(Player){
    const baseUpdate=Player.update;
    Player.update=function(dt){
      if(this._remasterStep==null){this._remasterStep=0;this.idleTime=0;this.celebrateTimer=0;this.dashAttackReady=0;this.lastLightSpent=false;}
      baseUpdate.call(this,dt);this.dashAttackReady=Math.max(0,this.dashAttackReady-dt);this.celebrateTimer=Math.max(0,this.celebrateTimer-dt);
      if(this.moving&&!this.dead){this.idleTime=0;this._remasterStep-=dt;const velocity=Math.hypot(this.vx||0,this.vy||0);if(this._remasterStep<=0&&velocity>35){this._remasterStep=velocity>150?.16:.25;const color=this.game.worldId==='chaosCaves'?'#81758f':this.game.worldId==='brokenRealm'?'#794780':'#9b8b69';this.game.particles&&this.game.particles.burst(this.x-this.facingX*6,this.y+10,color,3,20,2,.35,{kind:'smoke',alpha:.28});this.game.audio&&this.game.audio.play('footstep');}}
      else this.idleTime+=dt;
    };
    const baseDash=Player.dash;
    Player.dash=function(){
      const danger=(this.game.enemies||[]).some(e=>e&&!e.dead&&Math.hypot(e.x-this.x,e.y-this.y)<90&&(e.telegraph||e.lungeTimer>0))||(this.game.projectiles||[]).some(p=>p&&!p.dead&&p.team==='enemy'&&Math.hypot(p.x-this.x,p.y-this.y)<62);
      const ok=baseDash.call(this);if(!ok)return false;this.attackTimer=0;this.charging=false;this.dashAttackReady=.34;
      if(danger){const bonus=this.game.progression&&this.game.progression.getBonuses().perfectDodgeWindow||0;this.invulnerableTimer=Math.max(this.invulnerableTimer,.32+bonus);this.game.stats.perfectDodges=(this.game.stats.perfectDodges||0)+1;this.game.particles&&this.game.particles.text(this.x,this.y-32,'PERFECT','#9ff5ff',16,.8,{critical:true});this.game.particles&&this.game.particles.burst(this.x,this.y,'#9ff5ff',18,120,3,.55,{kind:'spark',glow:8});this.game.audio&&this.game.audio.play('perfectDodge');this.game.progression&&this.game.progression.gainXP(6,'dodge');this.game.progression&&this.game.progression.checkAchievements(true);}
      return true;
    };
    const basePlayerAttack=Player.attack;
    Player.attack=function(charged){const ok=basePlayerAttack.call(this,charged);if(ok&&!charged&&this.game.progression)this.comboWindow+=this.game.progression.getBonuses().comboWindow||0;return ok;};
    const baseTakeDamage=Player.takeDamage;
    Player.takeDamage=function(amount,source){
      const lastLight=this.game.progression&&this.game.progression.getBonuses().lastLight&&!this.lastLightSpent&&this.health>0&&amount>=this.health;
      if(lastLight){this.lastLightSpent=true;this.health=this.hp=1;this.invulnerableTimer=1.6;this.game.ui&&this.game.ui.toast('Last Light kept you standing!','rare');this.game.flash&&this.game.flash('#fff0a0',.35);return 0;}
      const dealt=baseTakeDamage.call(this,amount,source);if(this.dead)this.deathStartedAt=this.game.elapsed;return dealt;
    };
    const baseDraw=Player.draw;
    Player.draw=function(ctx){
      if(this.dead){const age=Math.max(0,this.game.elapsed-(this.deathStartedAt||this.game.elapsed)),turn=(this.facingX||1)>=0?1:-1,ox=this.x,oy=this.y;ctx.save();ctx.translate(ox,oy+8);ctx.rotate(turn*Math.min(1,age/.42)*Math.PI*.48);this.x=0;this.y=-8;baseDraw.call(this,ctx);this.x=ox;this.y=oy;ctx.restore();return;}
      const originalY=this.y;if(!this.moving&&!this.dead)this.y+=Math.sin((this.idleTime||0)*2.2)*.55;
      if(this.celebrateTimer>0){ctx.save();ctx.globalAlpha=.15+.15*Math.sin(this.game.elapsed*8);ctx.fillStyle='#ffe888';ctx.beginPath();ctx.arc(this.x,this.y,24+Math.sin(this.game.elapsed*5)*4,0,TAU);ctx.fill();ctx.restore();}
      baseDraw.call(this,ctx);this.y=originalY;
      if(this.celebrateTimer>0){ctx.save();ctx.fillStyle='#f4cf63';ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText('✦',this.x-14,this.y-25-Math.sin(this.game.elapsed*4)*6);ctx.fillText('✦',this.x+15,this.y-29-Math.sin(this.game.elapsed*4+2)*5);ctx.restore();}
      if(this.dashTimer>0){ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle='#bceaff';ctx.lineWidth=3;for(let i=1;i<=3;i++){ctx.beginPath();ctx.moveTo(this.x-this.dashX*i*9,this.y-this.dashY*i*9);ctx.lineTo(this.x-this.dashX*(i*9+8),this.y-this.dashY*(i*9+8));ctx.stroke();}ctx.restore();}
    };
  }

  const Combat=E.CombatSystem&&E.CombatSystem.prototype;
  if(Combat){
    const baseAttack=Combat.playerAttack;
    Combat.playerAttack=function(charged,power){
      const p=this.game.player,bonuses=this.game.progression&&this.game.progression.getBonuses()||{};let multiplier=1;
      if(p.dashAttackReady>0){multiplier*=1.45;p.dashAttackReady=0;this.game.particles&&this.game.particles.text(p.x,p.y-32,'DASH STRIKE','#b9efff',14,.7);}
      if(!charged&&p.comboStep===2)multiplier*=1+(bonuses.comboDamage||0);
      if((this.game.enemies||[]).some(e=>e&&!e.dead&&e.health/e.maxHealth<.3))multiplier*=1+(bonuses.executeDamage||0);
      const oldDamage=p.damage;p.damage*=multiplier;const hits=baseAttack.call(this,charged,power);p.damage=oldDamage;
      const feedback=this.game.combatFeedback||(this.game.combatFeedback={count:0,timer:0,best:0});
      if(hits>0){feedback.count=feedback.timer>0?feedback.count+hits:hits;feedback.timer=1.5;feedback.best=Math.max(feedback.best,feedback.count);this.game.stats.bestCombo=Math.max(this.game.stats.bestCombo||0,feedback.best);}
      return hits;
    };
  }

  const Enemy=E.Enemy&&E.Enemy.prototype;
  if(Enemy){
    const baseEnemyUpdate=Enemy.update;
    Enemy.update=function(dt){
      if(!this.personality){const code=String(this.id||this.type).split('').reduce((a,c)=>a+c.charCodeAt(0),0);this.personality=['aggressive','cautious','flanker','guardian'][code%4];this.reactionTimer=.08+(code%7)*.025;this.lastSeen=null;}
      const player=this.game.player;if(player&&!player.dead){const dist=Math.hypot(player.x-this.x,player.y-this.y),los=!this.game.worlds||!this.game.worlds.hasLineOfSight||this.game.worlds.hasLineOfSight(this.x,this.y,player.x,player.y);
        if(dist<this.aggroRange&&los){this.lastSeen={x:player.x,y:player.y,time:2.4};if(this.reactionTimer>0){this.reactionTimer-=dt;const held=this.game.player;try{this.game.player=null;baseEnemyUpdate.call(this,dt*.7);}finally{this.game.player=held;}return;}}
        else if(this.lastSeen){this.lastSeen.time-=dt;if(this.lastSeen.time>0&&!this.telegraph){const a=Math.atan2(this.lastSeen.y-this.y,this.lastSeen.x-this.x);this._move(a,this.speed*.42,dt);this.state='search';}else this.lastSeen=null;}
        if(!los){const held=this.game.player;try{this.game.player=null;baseEnemyUpdate.call(this,dt*.55);}finally{this.game.player=held;}if(this.lastSeen)this.state='search';return;}
      }
      baseEnemyUpdate.call(this,dt);
      if(!player||this.dead||this.telegraph)return;const ratio=this.health/this.maxHealth,angle=Math.atan2(player.y-this.y,player.x-this.x),dist=Math.hypot(player.x-this.x,player.y-this.y);
      if(ratio<.25&&(this.personality==='cautious'||this.behavior==='ranged')){this._move(angle+Math.PI,this.speed*.34,dt);this.state='retreat';}
      else if(this.personality==='flanker'&&dist>65&&dist<210){const side=(String(this.id).charCodeAt(0)%2?1:-1);this._move(angle+side*1.18,this.speed*.2,dt);}
      if(this.personality==='aggressive')this.attackCooldown=Math.max(0,this.attackCooldown-dt*.12);
    };
    const baseDie=Enemy.die;
    Enemy.die=function(source){if(this.dead||this.dying)return;const hiddenWarden=this.name==='Warden of Echoes';if(hiddenWarden)this.game.chestsOpened&&this.game.chestsOpened.add('warden_of_echoes_defeated');const family=['slime','poison'].includes(this.behavior)?'slimePop':['wolf','bat','spider'].includes(this.behavior)?'beastCry':['golem','crystal','block'].includes(this.behavior)?'constructBreak':['skeleton'].includes(this.behavior)?'undeadFall':null;if(family)this.game.audio&&this.game.audio.play(family);this.game.progression&&this.game.progression.recordEnemy(this);const oldBonus=this.dropBonus;if(this.game.progression)this.dropBonus*=1+(this.game.progression.getBonuses().dropBonus||0);baseDie.call(this,source);this.dropBonus=oldBonus;if(hiddenWarden)this.game.saveNow&&this.game.saveNow('hidden-boss');};
  }

  const Boss=E.Boss&&E.Boss.prototype;
  if(Boss){
    const baseBossUpdate=Boss.update;
    Boss.update=function(dt){const before=this.phase;baseBossUpdate.call(this,dt);if(this.phase!==before){this.game.ui&&this.game.ui.toast(`${this.name} enters Phase ${this.phase}!`,'danger');this.game.flash&&this.game.flash(this.config.accent,.2);this.game.shake&&this.game.shake(9,.55);}};
  }

  // Premium UI layer, minimap, codex, crafting, and accessibility controls.
  const BaseUI=E.UIManager;
  if(BaseUI){
    class RemasterUI extends BaseUI {
      constructor(game){super(game);this.codexTab='bestiary';this.craftStation='camp';this.minimapClock=0;this.inventorySort='type';this.bindRemaster();this.applyAccessibility();}
      closeSidePanels(){super.closeSidePanels();['skills-panel','crafting-panel','codex-panel','map-panel'].forEach(id=>this.el(id)&&this.el(id).classList.add('hidden'));}
      bindRemaster(){
        document.querySelectorAll('[data-open-panel="skills"]').forEach(b=>b.addEventListener('click',()=>this.openSkills(true)));
        document.querySelectorAll('[data-open-panel="crafting"]').forEach(b=>b.addEventListener('click',()=>this.openCrafting('camp',true)));
        document.querySelectorAll('[data-open-panel="map"]').forEach(b=>b.addEventListener('click',()=>this.openMap(true)));
        document.querySelectorAll('[data-open-panel="codex"]').forEach(b=>b.addEventListener('click',()=>this.openCodex(true)));
        const skills=this.el('skills-list');skills&&skills.addEventListener('click',e=>{const b=e.target.closest('[data-skill]');if(b){this.game.progression.unlockSkill(b.dataset.skill);this.renderSkills();}});
        const recipes=this.el('recipe-list');recipes&&recipes.addEventListener('click',e=>{const b=e.target.closest('[data-recipe]');if(b){this.game.progression.craft(b.dataset.recipe);this.renderCrafting();}});
        const codex=this.el('codex-tabs');codex&&codex.addEventListener('click',e=>{const b=e.target.closest('[data-codex]');if(b){this.codexTab=b.dataset.codex;this.renderCodex();}});
        const map=this.el('travel-list');map&&map.addEventListener('click',e=>{const b=e.target.closest('[data-travel]');if(b)this.game.progression.fastTravel(b.dataset.travel);});
        const sorter=this.el('inventory-sort');sorter&&sorter.addEventListener('change',()=>{this.inventorySort=sorter.value;this.renderInventory();});
        const junk=this.el('sell-junk-btn');junk&&junk.addEventListener('click',()=>this.sellJunk());
        const scale=this.el('ui-scale');scale&&scale.addEventListener('input',()=>{this.game.settings.uiScale=+scale.value/100;this.game.storeSettings();this.applyAccessibility();this.el('ui-scale-output').textContent=`${scale.value}%`;});
        const cb=this.el('colorblind-mode');cb&&cb.addEventListener('change',()=>{this.game.settings.colorblind=cb.value;this.game.storeSettings();this.applyAccessibility();});
        const contrast=this.el('high-contrast');contrast&&contrast.addEventListener('change',()=>{this.game.settings.highContrast=contrast.checked;this.game.storeSettings();this.applyAccessibility();});
        const flashes=this.el('reduced-flashes');flashes&&flashes.addEventListener('change',()=>{this.game.settings.reducedFlashes=flashes.checked;this.game.storeSettings();});
        const density=this.el('particle-density');density&&density.addEventListener('input',()=>{this.game.settings.particleDensity=+density.value/100;this.game.storeSettings();});
        const bindings=this.el('bindings-list');bindings&&bindings.addEventListener('click',e=>{const b=e.target.closest('[data-bind]');if(!b)return;b.textContent='Press a key…';const action=b.dataset.bind;const handler=event=>{event.preventDefault();event.stopPropagation();this.game.settings.bindings[action]=this.game.input.normalize(event.key);this.game.storeSettings();b.textContent=this.game.settings.bindings[action].toUpperCase();window.removeEventListener('keydown',handler,true);};window.addEventListener('keydown',handler,true);});
        const inventory=this.el('inventory-panel');inventory&&inventory.addEventListener('click',e=>{const fav=e.target.closest('[data-favorite]'),upgrade=e.target.closest('[data-upgrade]'),enchant=e.target.closest('[data-enchant]');if(fav){this.game.progression.toggleFavorite(fav.dataset.favorite);this.renderInventory();}if(upgrade){this.game.progression.upgradeItem(upgrade.dataset.upgrade);this.renderInventory();}if(enchant){this.game.progression.enchantItem(enchant.dataset.uid,enchant.dataset.enchant);this.renderInventory();}});
      }
      openSkills(fromPause){this.returnToPause=!!fromPause;this.closeSidePanels();this.el('pause-panel')&&this.el('pause-panel').classList.add('hidden');this.game.state='panel';this.el('skills-panel').classList.remove('hidden');this.renderSkills();}
      openCrafting(station,fromPause){this.craftStation=station||'camp';this.returnToPause=!!fromPause;this.closeSidePanels();this.el('pause-panel')&&this.el('pause-panel').classList.add('hidden');this.game.state='panel';this.el('crafting-panel').classList.remove('hidden');this.renderCrafting();}
      openCodex(fromPause){this.returnToPause=!!fromPause;this.closeSidePanels();this.el('pause-panel')&&this.el('pause-panel').classList.add('hidden');this.game.state='panel';this.el('codex-panel').classList.remove('hidden');this.renderCodex();}
      openMap(fromPause){this.returnToPause=!!fromPause;this.closeSidePanels();this.el('pause-panel')&&this.el('pause-panel').classList.add('hidden');this.game.state='panel';this.el('map-panel').classList.remove('hidden');this.renderMap();}
      update(){super.update();const p=this.game.progression;if(!p)return;const level=this.el('level-value');if(level)level.textContent=p.level;const xp=this.el('xp-fill');if(xp)xp.style.width=`${clamp(p.xp/p.xpNeeded(p.level)*100,0,100)}%`;const completion=this.el('completion-value');if(completion)completion.textContent=`${p.completion()}%`;const area=this.el('minimap-area');if(area)area.textContent=worldLabel(this.game.worldId).toUpperCase();const combo=this.el('combo-counter'),feedback=this.game.combatFeedback;if(combo){combo.classList.toggle('hidden',!feedback||feedback.timer<=0||feedback.count<2);if(feedback&&feedback.timer>0)combo.innerHTML=`<b>${feedback.count}</b><span>HIT COMBO</span>`;}this.minimapClock-=.016;if(this.minimapClock<=0){this.minimapClock=.16;this.drawMinimap();}}
      renderInventory(){
        const inv=this.game.inventory;if(inv&&Array.isArray(inv.items)){const rarity={common:0,uncommon:1,rare:2,epic:3,legendary:4};inv.items.sort((a,b)=>{const af=this.game.progression.favoriteItems.has(a.uid)?1:0,bf=this.game.progression.favoriteItems.has(b.uid)?1:0;if(af!==bf)return bf-af;const ad=E.ITEMS[a.id],bd=E.ITEMS[b.id];if(this.inventorySort==='rarity')return (rarity[bd.rarity]||0)-(rarity[ad.rarity]||0);if(this.inventorySort==='name')return ad.name.localeCompare(bd.name);return ad.type.localeCompare(bd.type)||ad.name.localeCompare(bd.name);});}
        super.renderInventory();
        const host=this.el('inventory-list');if(host)host.querySelectorAll('[data-uid]').forEach(tile=>{const item=inv.get(tile.dataset.uid),def=item&&E.ITEMS[item.id];if(def){tile.classList.add(`rarity-border-${def.rarity}`);const icon=tile.querySelector('.item-icon');if(icon)icon.textContent=this.itemIcon(item.id,def);}if(this.game.progression.favoriteItems.has(tile.dataset.uid))tile.classList.add('favorite-item');});
      }
      itemIcon(id,def){const value=String(id||'');if(/sword|blade|shadow_fang/.test(value))return'⚔';if(/bow/.test(value))return'➶';if(/armor|mail|tunic/.test(value))return'▣';if(/helm|crown/.test(value))return'♜';if(/boot/.test(value))return'⌁';if(/amulet|charm|talisman/.test(value))return'◇';if(/potion|elixir|tonic|antidote/.test(value))return'◆';if(/key|sigil|relic|heart/.test(value))return'✥';if(/ore|crystal|shard|dust/.test(value))return'✦';if(/fang|bone|root|bark|cloth|pelt|gel/.test(value))return'·';return def.icon||'•';}
      itemProfile(item){const def=item&&E.ITEMS[item.id],out={};if(!def)return out;for(const [key,value] of Object.entries(def.stats||{}))out[key]=(out[key]||0)+(Number(value)||0);if(def.damage)out.damage=(out.damage||0)+Number(def.damage);if(def.defense)out.defense=(out.defense||0)+Number(def.defense);const level=this.game.progression.upgrades[item.uid]||0;if(level){if((def.slot||def.type)==='weapon')out.damage=(out.damage||0)+level*2;else if(['armor','helmet','boots'].includes(def.slot||def.type))out.defense=(out.defense||0)+level;else if((def.slot||def.type)==='amulet')out.maxHealth=(out.maxHealth||0)+level*3;}const enchant=this.game.progression.enchantments[item.uid];if(enchant==='flame')out.damage=(out.damage||0)+2;if(enchant==='ward')out.defense=(out.defense||0)+2;if(enchant==='swift')out.moveSpeed=(out.moveSpeed||0)+6;return out;}
      comparisonMarkup(item){const def=E.ITEMS[item.id],slot=def.slot||(['weapon','armor','helmet','boots','amulet'].includes(def.type)?def.type:null);if(!slot)return'';const current=this.equippedItem(slot);if(current&&current.uid===item.uid)return`<div class="equipment-preview equipped"><span>◆</span><div><small>CURRENTLY EQUIPPED</small><b>${this.escape(def.name)}</b></div></div>`;const candidate=this.itemProfile(item),equipped=current?this.itemProfile(current):{},keys=[...new Set([...Object.keys(candidate),...Object.keys(equipped)])],labels={damage:'Damage',defense:'Defense',maxHealth:'Max Health',health:'Max Health',critChance:'Critical Chance',moveSpeed:'Move Speed',speed:'Move Speed',potionStrength:'Potion Strength'};const rows=keys.map(key=>{const delta=(candidate[key]||0)-(equipped[key]||0);if(!delta)return'';const percent=key.toLowerCase().includes('chance'),value=percent?`${delta>0?'+':''}${Math.round(delta*100)}%`:`${delta>0?'+':''}${delta}`;return`<div class="comparison-row ${delta>0?'better':'worse'}"><span>${labels[key]||this.title(key)}</span><b>${value}</b></div>`;}).join('');const currentDef=current&&E.ITEMS[current.id];return`<div class="equipment-preview"><span>${this.itemIcon(item.id,def)}</span><div><small>VS ${this.escape(currentDef?currentDef.name:'EMPTY SLOT')}</small><b>${this.escape(def.name)}</b></div></div>${rows?`<div class="comparison-list">${rows}</div>`:'<p class="comparison-even">No core stat change.</p>'}`;}
      renderItemDetails(item){super.renderItemDetails(item);if(!item)return;const host=this.el('item-details'),favorite=this.game.progression.favoriteItems.has(item.uid),level=this.game.progression.upgrades[item.uid]||0,def=E.ITEMS[item.id],enchant=this.game.progression.enchantments[item.uid],equipment=!!(def.slot||['weapon','armor','helmet','boots','amulet'].includes(def.type));host.innerHTML+=this.comparisonMarkup(item);host.innerHTML+=`<div class="item-actions remaster-actions"><button class="pixel-btn" data-favorite="${this.escape(item.uid)}">${favorite?'★ Favorited':'☆ Favorite'}</button>${equipment?`<button class="pixel-btn" data-upgrade="${this.escape(item.uid)}">Upgrade ${level?`(+${level})`:''}</button>`:''}</div>${equipment?`<div class="enchant-card"><small>ENCHANTMENT ${enchant?`• ${this.escape(enchant.toUpperCase())}`:'• NONE'} · 2 CHAOS DUST</small><div><button data-enchant="flame" data-uid="${this.escape(item.uid)}">Flame</button><button data-enchant="ward" data-uid="${this.escape(item.uid)}">Ward</button><button data-enchant="swift" data-uid="${this.escape(item.uid)}">Swift</button></div></div>`:''}`;}
      sellJunk(){const inv=this.game.inventory;let gold=0;for(const item of [...inv.items]){const def=E.ITEMS[item.id];if(def.type==='material'&&!this.game.progression.favoriteItems.has(item.uid)&&def.rarity==='common'){gold+=Math.max(1,Math.floor(def.price*.35))*item.qty;inv.remove(item.uid,item.qty);}}this.game.player.gold+=gold;this.toast(gold?`Sold common materials for ${gold} gold.`:'No common junk to sell.',gold?'success':'');this.renderInventory();}
      renderSkills(){const p=this.game.progression;this.el('skill-points').textContent=p.skillPoints;const host=this.el('skills-list');host.innerHTML=['Blade','Ward','Wayfarer'].map(branch=>`<section class="skill-branch"><h3>${branch}</h3>${E.SKILLS.filter(s=>s.branch===branch).map(s=>{const owned=p.hasSkill(s.id),locked=(s.requires||[]).some(r=>!p.hasSkill(r));return `<article class="skill-node ${owned?'owned':''} ${locked?'locked':''}"><span class="skill-gem">${owned?'✦':locked?'◇':'◆'}</span><div><b>${s.name}</b><p>${s.description}</p></div><button class="pixel-btn" data-skill="${s.id}" ${owned||locked||p.skillPoints<s.cost?'disabled':''}>${owned?'Learned':`${s.cost} SP`}</button></article>`}).join('')}</section>`).join('');}
      renderCrafting(){const p=this.game.progression,inv=this.game.inventory;this.el('crafting-station').textContent=this.craftStation==='forge'?'BLACKSMITH FORGE':'CAMP KITCHEN';this.el('crafting-gold').textContent=Math.floor(this.game.player.gold||0);const recipes=E.RECIPES.filter(r=>r.station===this.craftStation);this.el('recipe-list').innerHTML=recipes.map(r=>{const ready=Object.entries(r.ingredients).every(([id,q])=>inv.count(id)>=q)&&this.game.player.gold>=(r.gold||0);const ingredients=Object.entries(r.ingredients).map(([id,q])=>`${q}× ${E.ITEMS[id].name} (${inv.count(id)})`).join(' · ');return `<article class="recipe-card ${ready?'ready':''}"><div class="recipe-icon">${r.station==='forge'?'⚒':'♨'}</div><div><h3>${r.name}</h3><p>${r.description}</p><small>${ingredients}${r.gold?` · ${r.gold} gold`:''}</small></div><button class="pixel-btn primary" data-recipe="${r.id}" ${ready?'':'disabled'}>Craft</button></article>`}).join('');}
      renderStats(){super.renderStats();const p=this.game.progression,host=this.el('stats-content'),s=this.game.stats;if(p&&host)host.innerHTML+=`<div class="remaster-stat-strip"><span>Level <b>${p.level}</b></span><span>XP <b>${p.xp}/${p.xpNeeded(p.level)}</b></span><span>Skills <b>${p.skills.size}/${E.SKILLS.length}</b></span><span>Completion <b>${p.completion()}%</b></span></div><div class="adventure-stats">${[['Perfect Dodges',s.perfectDodges],['Best Combo',s.bestCombo],['Damage Dealt',Math.round(s.damageDealt)],['Damage Taken',Math.round(s.damageTaken)],['Gold Found',s.totalGold],['Items Crafted',s.itemsCrafted],['Fish Caught',s.fishCaught],['Ore Mined',s.oreMined],['Meals Cooked',p.resources.meals],['Lore Records',`${p.collectibles.size}/${Object.keys(E.LORE).length}`],['Achievements',`${p.achievements.size}/${E.ACHIEVEMENTS.length}`],['Deaths',s.deaths]].map(row=>`<span>${row[0]} <b>${row[1]}</b></span>`).join('')}</div>`;}
      showVictory(summary){super.showVictory(summary);const copy=this.el('victory-copy');if(copy&&this.game.endingChoice==='keeper')copy.textContent=`${summary.name} purified the Orb and became keeper of the realm’s stolen memories. Magic remains, no longer ruled by fear, while Elaria rebuilds beneath a silver dawn.`;else if(copy)copy.textContent=`${summary.name}, once a humble citizen of the last kingdom, shattered the Orb of Chaos. Its darkness vanished, morning returned, and Elaria began to rebuild.`;}
      renderSettings(){super.renderSettings();const s=this.game.settings,scale=this.el('ui-scale'),density=this.el('particle-density'),mode=this.el('colorblind-mode'),contrast=this.el('high-contrast'),flashes=this.el('reduced-flashes');if(scale){scale.value=Math.round((s.uiScale||1)*100);this.el('ui-scale-output').textContent=`${scale.value}%`;}if(density)density.value=Math.round((s.particleDensity||1)*100);if(mode)mode.value=s.colorblind||'none';if(contrast)contrast.checked=!!s.highContrast;if(flashes)flashes.checked=!!s.reducedFlashes;const bindings=this.el('bindings-list');bindings&&bindings.querySelectorAll('[data-bind]').forEach(b=>b.textContent=String(s.bindings&&s.bindings[b.dataset.bind]||b.textContent).toUpperCase());}
      renderCodex(){const p=this.game.progression;this.el('codex-tabs').querySelectorAll('[data-codex]').forEach(b=>b.classList.toggle('active',b.dataset.codex===this.codexTab));const host=this.el('codex-content');if(this.codexTab==='bestiary')host.innerHTML=p.bestiaryEntries().map(e=>`<article class="codex-entry ${e.seen?'':'unknown'}"><span>${e.seen?'◈':'?'}</span><div><h3>${e.seen?e.definition.name:'Unknown Creature'}</h3><p>${e.seen?`${this.title(e.definition.behavior)} behavior · ${e.definition.hp} base health · ${e.kills} defeated`:'Encounter this creature to record it.'}</p></div></article>`).join('');else if(this.codexTab==='lore')host.innerHTML=p.loreEntries().map(e=>`<article class="codex-entry ${e.found?'':'unknown'}"><span>▤</span><div><h3>${e.found?e.title:'Undiscovered Record'}</h3><p>${e.found?e.text:`Hidden somewhere in ${worldLabel(e.world)}.`}</p></div></article>`).join('');else host.innerHTML=E.ACHIEVEMENTS.map(a=>`<article class="codex-entry ${p.achievements.has(a.id)?'complete':'unknown'}"><span>${p.achievements.has(a.id)?'🏆':'◇'}</span><div><h3>${a.name}</h3><p>${a.description}</p></div></article>`).join('');}
      renderMap(){const p=this.game.progression,host=this.el('travel-list');host.innerHTML=Object.entries(E.WORLD_DEFS).map(([id,w])=>{const found=p.worldDiscoveries.has(id)||p.worldDiscoveries.has(this.game.questWorldId(id)),travel=p.fastTravelPoints.has(id);return `<article class="travel-card ${found?'found':'unknown'}"><span>${found?'◉':'?'}</span><div><h3>${found?w.name:'Uncharted Realm'}</h3><p>${travel?'Waystone awakened':found?'Find and awaken this realm’s waystone':'Explore to reveal this region'}</p></div><button class="pixel-btn" data-travel="${id}" ${travel&&id!==this.game.worldId?'':'disabled'}>Travel</button></article>`}).join('');this.drawWorldMap();}
      drawMinimap(){const canvas=this.el('minimap-canvas');if(!canvas||!this.game.player||!this.game.worlds.current)return;const ctx=canvas.getContext('2d'),w=this.game.worlds.current,sx=canvas.width/w.width,sy=canvas.height/w.height;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#15101c';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=.65;ctx.fillStyle=w.palette.ground;ctx.fillRect(3,3,canvas.width-6,canvas.height-6);ctx.fillStyle='#1a1420';for(const o of w.obstacles){if(o.w<25&&o.h<25)continue;ctx.fillRect(o.x*sx,o.y*sy,Math.max(1,o.w*sx),Math.max(1,o.h*sy));}ctx.globalAlpha=1;ctx.fillStyle='#e8d274';for(const n of w.npcs||[])ctx.fillRect(n.x*sx-1,n.y*sy-1,3,3);if(this.game.progression&&this.game.progression.getBonuses().revealSecrets){ctx.fillStyle='#c783da';for(const it of w.interactables||[])if(['secret','lore','collectible'].includes(it.type)&&!this.game.chestsOpened.has(it.id))ctx.fillRect(it.x*sx-1,it.y*sy-1,3,3);}if(this.game.boss){ctx.fillStyle='#e35a87';ctx.fillRect(this.game.boss.x*sx-2,this.game.boss.y*sy-2,5,5);}ctx.fillStyle='#8deaf0';ctx.beginPath();ctx.arc(this.game.player.x*sx,this.game.player.y*sy,3,0,TAU);ctx.fill();}
      drawWorldMap(){const c=this.el('world-map-canvas');if(!c)return;const x=c.getContext('2d'),p=this.game.progression;x.clearRect(0,0,c.width,c.height);const g=x.createLinearGradient(0,0,c.width,c.height);g.addColorStop(0,'#2c2535');g.addColorStop(1,'#15111d');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);const nodes=[['elaria',65,118],['greenhaven',170,90],['darkForest',275,125],['chaosCaves',375,80],['brokenRealm',480,125]];x.strokeStyle='#7d674d';x.lineWidth=3;x.beginPath();nodes.forEach((n,i)=>i?x.lineTo(n[1],n[2]):x.moveTo(n[1],n[2]));x.stroke();for(const [id,nx,ny] of nodes){const found=p.worldDiscoveries.has(id)||p.worldDiscoveries.has(this.game.questWorldId(id));x.fillStyle=found?'#d4b65e':'#403747';x.beginPath();x.arc(nx,ny,12,0,TAU);x.fill();x.fillStyle=found?'#eadcb6':'#7c7080';x.font='10px monospace';x.textAlign='center';x.fillText(found?worldLabel(id):'???',nx,ny+28);}}
      applyAccessibility(){const s=this.game.settings||{};document.documentElement.style.setProperty('--ui-scale',String(s.uiScale||1));const shell=this.el('game-shell');shell.classList.remove('colorblind-deuter','colorblind-protan','colorblind-tritan','high-contrast','reduced-flashes');if(s.colorblind&&s.colorblind!=='none')shell.classList.add(`colorblind-${s.colorblind}`);if(s.highContrast)shell.classList.add('high-contrast');if(s.reducedFlashes)shell.classList.add('reduced-flashes');}
    }
    E.UIManager=RemasterUI;
  }

  // Extend the established Game lifecycle without changing old save semantics.
  const Game=E.Game&&E.Game.prototype;
  if(Game){
    const baseCreate=Game.createSession;
    Game.createSession=function(data,fresh){const result=baseCreate.call(this,data,fresh);this.progression=new E.ProgressionSystem(this,data&&data.progression);for(const world of Object.values(E.WORLD_DEFS||{}))for(const npc of world.npcs||[]){if(npc.originX==null){npc.originX=npc.x;npc.originY=npc.y;npc.originMarker=npc.marker||'';}npc.x=npc.originX;npc.y=npc.originY;npc.marker=npc.originMarker;delete npc.homeX;delete npc.homeY;delete npc.routineTimer;delete npc.routineAngle;npc.escortActive=false;if(/^realm_prisoner_/.test(npc.id)&&this.chestsOpened.has(`rescue:${npc.id}`))npc.marker='';if(npc.id==='escort_luma'&&this.quests&&this.quests.isCompleted&&this.quests.isCompleted('greenhaven_escort'))npc.marker='';}this.ambient=new AmbientSystem(this);this.ambient.onWorldChanged(this.worldId);this.progression.discover(this.worldId);this.player&&this.player.recalcStats&&this.player.recalcStats(true);this.ui&&this.ui.applyAccessibility&&this.ui.applyAccessibility();const minimap=document.getElementById('minimap');minimap&&minimap.classList.remove('hidden');return result;};
    const baseSerialize=Game.serialize;
    Game.serialize=function(){const data=baseSerialize.call(this);data.progression=this.progression&&this.progression.serialize?this.progression.serialize():null;data.achievements=data.progression?data.progression.achievements:[];data.worldDiscoveries=data.progression?data.progression.worldDiscoveries:[];data.fastTravelPoints=data.progression?data.progression.fastTravelPoints:[];return data;};
    const baseUpdate=Game.update;
    Game.update=function(dt){
      if(this.state==='playing'&&this.ui){if(this.input.consume('m'))this.ui.openMap(false);else if(this.input.consume('k'))this.ui.openSkills(false);else if(this.input.consume('r'))this.ui.openCrafting('camp',false);else if(this.input.consume('b'))this.ui.openCodex(false);}
      baseUpdate.call(this,dt);this.quests&&this.quests.update&&this.quests.update(dt);this.ambient&&this.ambient.update(dt);if(this.progression){this.progression.checkAchievements(false);this.progression.lastCompletion=this.progression.completion();}
      const cinematic=this.cinematicCamera,boss=this.boss;let zoom=1;
      if(cinematic&&cinematic.active&&this.camera){const world=this.worlds&&this.worlds.current||{width:960,height:540};const tx=Math.max(0,Math.min(Math.max(0,world.width-960),cinematic.targetX-480));const ty=Math.max(0,Math.min(Math.max(0,world.height-540),cinematic.targetY-270));const ease=1-Math.pow(.035,Math.max(0,dt));this.camera.x+=(tx-this.camera.x)*ease;this.camera.y+=(ty-this.camera.y)*ease;zoom=cinematic.zoom||1.06;}
      else{if(cinematic&&cinematic.release>0)cinematic.release=Math.max(0,cinematic.release-dt);if(boss&&!boss.dead){zoom=boss.intro?1.045:boss.phaseTransitionTimer>0?1.035:boss.finalPhase?1.026:boss.phase>1?1.014:1;}}
      if(this.canvas)this.canvas.style.transform=`scale(${zoom})`;
    };
    const baseTransition=Game.transitionTo;
    Game.transitionTo=function(id,position){if(this.canvas)this.canvas.style.transform='scale(1)';this.cinematicCamera=null;if(this.player)this.player.cinematicLocked=false;this.progression&&this.progression.discover(id);return baseTransition.call(this,id,position);};
    const baseRestart=Game.restartCheckpoint;
    Game.restartCheckpoint=function(){if(this.canvas)this.canvas.style.transform='scale(1)';this.cinematicCamera=null;if(this.player)this.player.cinematicLocked=false;return baseRestart.call(this);};
    const baseCheckpoint=Game.setCheckpoint;
    Game.setCheckpoint=function(x,y){const result=baseCheckpoint.call(this,x,y);this.progression&&this.progression.unlockTravel(this.worldId);if(this.player)this.player.lastLightSpent=false;return result;};
    const baseBossDefeated=Game.onBossDefeated;
    Game.onBossDefeated=function(boss){const id=boss&&(boss.bossType||boss.type||boss.id);this.progression&&this.progression.recordBoss(id);if(this.player)this.player.celebrateTimer=2.2;if(this.canvas)this.canvas.style.transform='scale(1)';if(this.cinematicCamera){this.cinematicCamera.active=false;this.cinematicCamera.release=.8;}const result=baseBossDefeated.call(this,boss);if(id&&id!=='velymoor')window.setTimeout(()=>{if(this.state==='playing')this.startDialogue({name:'Maelor’s Echo',portrait:'wizard',lines:[{creakingOne:'The heartwood breathes freely again. Greenhaven will remember your mercy.',nyxfang:'The moon-wolf’s shadow is whole. A road opens beneath the ancient roots.',gorath:'The titan rests, and the last portal answers your courage.'}[id]||'Another chain of chaos has broken.']});},1100);return result;};
    const baseCollect=Game.collectDrop;
    Game.collectDrop=function(drop){if(drop&&drop.kind==='gold'&&this.progression)drop.value=Math.max(1,Math.round(drop.value*(1+(this.progression.getBonuses().goldBonus||0))));return baseCollect.call(this,drop);};
    const baseReturn=Game.returnToTitle;Game.returnToTitle=function(){if(this.canvas)this.canvas.style.transform='';this.cinematicCamera=null;if(this.player)this.player.cinematicLocked=false;const minimap=document.getElementById('minimap');minimap&&minimap.classList.add('hidden');return baseReturn.call(this);};
    const baseNewPlus=Game.startNewGamePlus;Game.startNewGamePlus=function(){const retained=this.progression&&this.progression.serialize();const result=baseNewPlus.call(this);if(retained&&this.progression){this.progression.load(retained);this.progression.level=Math.max(this.progression.level,2);this.progression.skillPoints++;this.player&&this.player.recalcStats&&this.player.recalcStats(true);}return result;};
  }

  E.AmbientSystem=AmbientSystem;
})();
