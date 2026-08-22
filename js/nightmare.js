(function(){
'use strict';
const E=window.Elaria=window.Elaria||{};
const TAU=Math.PI*2;
const doneKey=id=>`${id}_done`;
const TRIAL_ORDER=['eclipse_trial_might','eclipse_trial_endurance','eclipse_trial_spirit'];
const TRIALS={
  eclipse_trial_might:{title:'Trial of Might',done:'eclipse_trial_might_done',altar:{x:1700,y:1190},intro:['The first rune ignites: MIGHT.','Defeat the six Nightmare champions without leaving the training grounds.'],enemies:['eliteGoblin','goblinWarrior','eliteGoblin','goblinArcher','eliteSlime','eliteGoblin']},
  eclipse_trial_endurance:{title:'Trial of Endurance',done:'eclipse_trial_endurance_done',requires:'eclipse_trial_might_done',altar:{x:1950,y:1190},intro:['The second rune ignites: ENDURANCE.','Survive the hunters of the Eclipse. They will not give you time to breathe.'],enemies:['eliteWolf','wolf','spider','eliteWolf','poisonSlime','wolf','spider','eliteWolf']},
  eclipse_trial_spirit:{title:'Trial of Spirit',done:'eclipse_trial_spirit_done',requires:'eclipse_trial_endurance_done',altar:{x:2200,y:1190},intro:['The final rune ignites: SPIRIT.','Break the sorcerers guarding the path to the Mythic blade.'],enemies:['eliteMage','darkMage','eliteGolem','eliteMage','darkMage']}
};
const TRIAL_SPAWNS=[
  [1660,1270],[1770,1280],[1870,1230],[1990,1285],[2100,1240],[2220,1280],[1810,1180],[2140,1175]
];

function unlocked(){try{return localStorage.getItem('elaria-nightmare-unlocked')==='1';}catch(_){return false;}}
function refreshOptions(){
  ['nightmare-new-option','nightmare-settings-option'].forEach(id=>{const o=document.getElementById(id);if(o){o.disabled=!unlocked();o.textContent=o.textContent.replace(/ \(LOCKED\)$/,'')+(!unlocked()?' (LOCKED)':'');}});
}
function hasFlag(game,key){return !!(game&&game.chestsOpened&&game.chestsOpened.has(key));}
function countItem(game,id){return game&&game.inventory&&typeof game.inventory.count==='function'?game.inventory.count(id):0;}
function clearTrialEnemies(game,id){
  for(const enemy of game&&game.enemies||[]){if(enemy&&enemy.eclipseTrialId===id&&!enemy.dead){enemy.dead=true;enemy.remove=true;}}
}
function allTrialsComplete(game){return TRIAL_ORDER.every(id=>hasFlag(game,TRIALS[id].done));}
function remainingTrials(game){return TRIAL_ORDER.filter(id=>!hasFlag(game,TRIALS[id].done)).map(id=>TRIALS[id].title);}

// Add the World 0 trial altars and the hidden seal near Velymoor's fortress.
if(E.WORLD_DEFS&&E.WORLD_DEFS.elaria){
  const world=E.WORLD_DEFS.elaria;
  const add=(item)=>{if(!(world.interactables||[]).some(x=>x.id===item.id))world.interactables.push(item);};
  add({x:1700,y:1190,type:'trialAltar',id:'eclipse_trial_might',label:'Eclipse Trial: Might',trialId:'eclipse_trial_might'});
  add({x:1950,y:1190,type:'trialAltar',id:'eclipse_trial_endurance',label:'Eclipse Trial: Endurance',trialId:'eclipse_trial_endurance'});
  add({x:2200,y:1190,type:'trialAltar',id:'eclipse_trial_spirit',label:'Eclipse Trial: Spirit',trialId:'eclipse_trial_spirit'});
  if(!(world.labels||[]).some(x=>x.text==='ECLIPSE TRIALS'))world.labels.push({x:1725,y:1148,type:'label',text:'ECLIPSE TRIALS'});
}
if(E.WORLD_DEFS&&E.WORLD_DEFS.brokenRealm){
  const world=E.WORLD_DEFS.brokenRealm;
  if(!(world.interactables||[]).some(x=>x.id==='eclipse_seal'))world.interactables.push({x:1770,y:1040,type:'eclipseSeal',id:'eclipse_seal',label:'Ancient Eclipse Seal'});
}
if(E.WORLD_DEFS&&!E.WORLD_DEFS.eclipseChamber){
  E.WORLD_DEFS.eclipseChamber={
    id:'eclipseChamber',name:'Secret Eclipse Chamber',width:1600,height:1000,spawn:{x:180,y:500},
    palette:{ground:'#17101f',alt:'#21142b',path:'#382342',edge:'#09060e',water:'#64136f',light:'rgba(218,65,222,.08)'},
    paths:[{x:70,y:350,w:920,h:300,type:'path'},{x:900,y:180,w:520,h:640,type:'arena'}],
    obstacles:[
      {x:0,y:0,w:1600,h:70,type:'voidEdge'},{x:0,y:930,w:1600,h:70,type:'voidEdge'},{x:0,y:0,w:70,h:1000,type:'voidEdge'},{x:1530,y:0,w:70,h:1000,type:'voidEdge'},
      {x:420,y:130,w:110,h:110,type:'floatingRock',seed:701},{x:610,y:760,w:135,h:90,type:'floatingRock',seed:702},{x:830,y:100,w:120,h:85,type:'floatingRock',seed:703},
      {x:900,y:145,w:500,h:35,type:'fortressWall'},{x:900,y:820,w:500,h:35,type:'fortressWall'},
      {x:1030,y:230,w:32,h:78,type:'crystal',seed:710},{x:1310,y:690,w:38,h:95,type:'crystal',seed:711}
    ],
    npcs:[],
    interactables:[],
    labels:[{x:170,y:315,type:'label',text:'SECRET ECLIPSE CHAMBER'},{x:1070,y:150,type:'label',text:'THE BLACK ALTAR'}],
    exits:[{x:70,y:410,w:75,h:180,type:'exit',id:'eclipse_return',to:'brokenRealm',position:{x:1710,y:1040},label:'Broken Realm',requiresBoss:'eclipseWarden'}],
    bossZone:{x:1200,y:500,radius:285,type:'eclipseWarden',name:'The Eclipse Warden'},
    enemySpawns:[],storm:true
  };
}

const baseStart=E.Game&&E.Game.prototype.start;
if(baseStart)E.Game.prototype.start=function(){refreshOptions();return baseStart.apply(this,arguments);};

const baseNew=E.Game&&E.Game.prototype.newGame;
if(baseNew)E.Game.prototype.newGame=function(name,difficulty){
  if(difficulty==='nightmare'&&!unlocked()){this.ui&&this.ui.toast('Complete Hard Mode to unlock Nightmare.','danger');difficulty='hard';}
  return baseNew.call(this,name,difficulty);
};

const baseVictory=E.Game&&E.Game.prototype.showEnding;
if(baseVictory)E.Game.prototype.showEnding=function(){
  if(this.difficultyName==='hard'){
    try{localStorage.setItem('elaria-nightmare-unlocked','1');}catch(_){}
    refreshOptions();this.ui&&this.ui.toast('NIGHTMARE MODE UNLOCKED','success');
  }
  return baseVictory.apply(this,arguments);
};

const baseSession=E.Game&&E.Game.prototype.createSession;
if(baseSession)E.Game.prototype.createSession=function(data,fresh){
  const result=baseSession.apply(this,arguments);
  this.eclipseTrialState=null;
  if(this.difficultyName==='nightmare'){
    document.body.classList.add('nightmare-mode');
    this.ui&&this.ui.toast('NIGHTMARE: The realm is hunting you.','danger');
    if(this.quests){
      const old=this.quests.states&&this.quests.states.nightmare_eclipse_trial;
      if(old&&(!old.objectives||old.objectives.length!==5)&&countItem(this,'eclipsebreaker')<1){
        delete this.quests.states.nightmare_eclipse_trial;
        if(this.quests.trackedQuestId==='nightmare_eclipse_trial')this.quests.trackedQuestId=null;
      }
      if(!this.quests.hasQuest||!this.quests.hasQuest('nightmare_eclipse_trial'))this.quests.startQuest&&this.quests.startQuest('nightmare_eclipse_trial');
    }
  }else document.body.classList.remove('nightmare-mode');
  return result;
};

const baseSpawn=E.Game&&E.Game.prototype.spawnEnemy;
if(baseSpawn)E.Game.prototype.spawnEnemy=function(type,x,y,options){
  options=options||{};
  const enemy=baseSpawn.call(this,type,x,y,options);
  if(!enemy)return enemy;
  if(options.eclipseTrial){
    enemy.eclipseTrialId=options.eclipseTrialId||'';
    enemy.noDrops=true;enemy.elite=true;
    enemy.name=options.trialName||('Trial '+(enemy.name||'Shade'));
    enemy.maxHealth=Math.round((enemy.maxHealth||enemy.health||30)*1.12);enemy.health=enemy.hp=enemy.maxHealth;
    enemy.damage=Math.round((enemy.damage||8)*1.08);enemy.accent='#ff4fd8';enemy.color=enemy.color||'#35143d';
    return enemy;
  }
  if(this.difficultyName==='nightmare'&&Math.random()<0.22&&!enemy.isBoss){
    enemy.elite=true;enemy.name='Nightmare '+(enemy.name||'Creature');
    enemy.maxHealth=Math.round((enemy.maxHealth||enemy.health||30)*1.35);enemy.health=enemy.hp=enemy.maxHealth;
    enemy.damage=Math.round((enemy.damage||8)*1.22);enemy.speed=(enemy.speed||60)*1.08;enemy.accent='#ff355e';
  }
  return enemy;
};

const baseBoss=E.Game&&E.Game.prototype.spawnBoss;
if(baseBoss)E.Game.prototype.spawnBoss=function(type,x,y,options){
  const boss=baseBoss.apply(this,arguments);
  if(boss&&this.difficultyName==='nightmare'){
    boss.maxHealth=Math.round(boss.maxHealth*1.18);boss.health=boss.hp=boss.maxHealth;boss.damage=Math.round(boss.damage*1.15);boss.speed*=1.08;
    if(type==='velymoor'){
      boss.visualScale=Math.max(boss.visualScale||1,1.85);boss.radius=Math.max(boss.radius||29,46);boss.config.subtitle='Demon King of the Shattered Orb';boss.demonForm=true;
    }
    if(type==='eclipseWarden'){
      boss.maxHealth=Math.round(boss.maxHealth*1.16);boss.health=boss.hp=boss.maxHealth;boss.damage=Math.round(boss.damage*1.12);boss.speed*=1.07;
      boss.name='The Eclipse Warden';boss.subtitle='Keeper of Eclipsebreaker';
    }
  }
  return boss;
};

E.Game.prototype.eclipseTrialsComplete=function(){return this.difficultyName==='nightmare'&&allTrialsComplete(this);};
E.Game.prototype.canEnterEclipseChamber=function(){return this.eclipseTrialsComplete();};
E.Game.prototype.startEclipseTrial=function(altar){
  const id=altar&&altar.trialId||altar&&altar.id,trial=TRIALS[id];
  if(!trial)return false;
  if(this.difficultyName!=='nightmare'){
    this.startDialogue&&this.startDialogue({name:'Ancient Trial Stone',portrait:'wizard',lines:['The rune is cold. A whisper reaches you: “Return when the world itself has become a Nightmare.”']});
    return false;
  }
  this.quests&&this.quests.startQuest&&this.quests.startQuest('nightmare_eclipse_trial');
  this.quests&&this.quests.setTracked&&this.quests.setTracked('nightmare_eclipse_trial',{silent:true});
  if(hasFlag(this,trial.done)){
    this.ui&&this.ui.toast(`${trial.title} has already been conquered.`,'success');return false;
  }
  if(trial.requires&&!hasFlag(this,trial.requires)){
    const required=TRIAL_ORDER.map(k=>TRIALS[k]).find(t=>t.done===trial.requires);
    this.ui&&this.ui.toast(`The rune rejects you. Complete ${required?required.title:'the previous trial'} first.`,'danger');return false;
  }
  if(this.eclipseTrialState&&this.eclipseTrialState.active){this.ui&&this.ui.toast('Finish the active Eclipse Trial first.','danger');return false;}
  const begin=()=>{
    if(this.worldId!=='elaria')return;
    this.eclipseTrialState={id,active:true,spawned:trial.enemies.length,altarX:altar.x,altarY:altar.y};
    this.ui&&this.ui.showArea&&this.ui.showArea(trial.title.toUpperCase());
    this.shake&&this.shake(8,.5);this.flash&&this.flash('#ff4fd8',.22);this.audio&&this.audio.play&&this.audio.play('bossCharge');
    trial.enemies.forEach((type,i)=>{
      const pos=TRIAL_SPAWNS[i%TRIAL_SPAWNS.length];
      const enemy=this.spawnEnemy(type,pos[0],pos[1],{eclipseTrial:true,eclipseTrialId:id,noDrops:true,trialName:`${trial.title} Shade`});
      if(enemy){enemy.eclipseTrialId=id;enemy.summoned=true;}
    });
    this.ui&&this.ui.toast(`${trial.title}: defeat ${trial.enemies.length} trial shades.`,'rare');
  };
  if(this.startDialogue)this.startDialogue({name:trial.title,portrait:'wizard',lines:trial.intro,onComplete:begin});else begin();
  return true;
};

const baseUpdate=E.Game&&E.Game.prototype.update;
if(baseUpdate)E.Game.prototype.update=function(dt){
  const result=baseUpdate.apply(this,arguments),state=this.eclipseTrialState;
  if(state&&state.active){
    if(this.worldId!=='elaria'){
      clearTrialEnemies(this,state.id);state.active=false;this.ui&&this.ui.toast('The Eclipse Trial fades as you leave Elaria.','danger');
    }else if(this.player&&this.player.dead){
      clearTrialEnemies(this,state.id);state.active=false;
    }else{
      const alive=(this.enemies||[]).filter(e=>e&&e.eclipseTrialId===state.id&&!e.dead&&!e.remove).length;
      if(alive===0&&state.spawned>0){
        const trial=TRIALS[state.id];state.active=false;
        this.chestsOpened&&this.chestsOpened.add(trial.done);
        this.quests&&this.quests.event&&this.quests.event('area_discovered',{id:trial.done,area:trial.done,world:'elaria',uniqueId:trial.done});
        this.particles&&this.particles.burst&&this.particles.burst(state.altarX,state.altarY,'#ff62e0',35,150,4,.85,{kind:'spark',glow:10,color2:'#fff0a5'});
        this.audio&&this.audio.play&&this.audio.play('achievement');this.ui&&this.ui.toast(`${trial.title} COMPLETE`,'success');
        if(allTrialsComplete(this))this.ui&&this.ui.toast('ALL THREE TRIALS COMPLETE — a secret seal has awakened beside Velymoor’s fortress!','rare');
        this.saveNow&&this.saveNow('eclipse-trial');
      }
    }
  }
  return result;
};

const baseBossDefeated=E.Game&&E.Game.prototype.onBossDefeated;
if(baseBossDefeated)E.Game.prototype.onBossDefeated=function(boss){
  const id=boss&&(boss.bossId||boss.bossType||boss.type||boss.id),already=id&&this.bossesDefeated&&this.bossesDefeated.has(id);
  const result=baseBossDefeated.apply(this,arguments);
  if(id==='eclipseWarden'&&!already){
    if(countItem(this,'eclipsebreaker')<1&&this.inventory&&this.inventory.add)this.inventory.add('eclipsebreaker',1);
    this.chestsOpened&&this.chestsOpened.add('eclipsebreaker_claimed');
    this.startDialogue&&this.startDialogue({name:'Eclipsebreaker',portrait:'smith',lines:['The Warden dissolves into black starlight. A blade rises from the altar without a hand to hold it.','MYTHIC WEAPON ACQUIRED: ECLIPSEBREAKER','Its edge carries the silence between light and darkness.']});
    this.ui&&this.ui.toast('MYTHIC ECLIPSEBREAKER ACQUIRED','success');this.audio&&this.audio.play&&this.audio.play('achievement');this.saveNow&&this.saveNow('eclipsebreaker');
  }
  return result;
};

const World=E.WorldManager&&E.WorldManager.prototype;
if(World){
  const baseInteract=World.interact;
  World.interact=function(){
    const it=this.nearby,g=this.game;
    if(!it)return baseInteract.call(this);
    if(it.type==='trialAltar')return g.startEclipseTrial&&g.startEclipseTrial(it);
    if(it.type==='eclipseSeal'){
      if(g.difficultyName!=='nightmare'){
        g.startDialogue&&g.startDialogue({name:'Ancient Eclipse Seal',portrait:'velymoor',lines:['The black door has no handle. Three dead runes stare back at you.','Only a Nightmare may wake what sleeps beyond this wall.']});return;
      }
      if(!allTrialsComplete(g)){
        const remaining=remainingTrials(g).join(', ');
        g.startDialogue&&g.startDialogue({name:'Ancient Eclipse Seal',portrait:'wizard',lines:['The seal recognizes you, but its three runes are incomplete.',`Return to World 0 and complete: ${remaining}.`]});return;
      }
      g.quests&&g.quests.event&&g.quests.event('area_discovered',{id:'eclipse_seal_opened',area:'eclipse_seal_opened',world:'broken_realm'});
      g.ui&&g.ui.toast('The Eclipse Seal opens. A hidden chamber waits beyond.','rare');g.transitionTo&&g.transitionTo('eclipseChamber',{x:180,y:500});return;
    }
    return baseInteract.call(this);
  };

  const baseDrawInteractable=World.drawInteractable;
  World.drawInteractable=function(ctx,it){
    baseDrawInteractable.call(this,ctx,it);
    const x=Math.round(it.x),y=Math.round(it.y),t=this.game.elapsed||0;
    if(it.type==='trialAltar'){
      const trial=TRIALS[it.trialId||it.id],done=trial&&hasFlag(this.game,trial.done),available=this.game.difficultyName==='nightmare';
      ctx.save();ctx.globalAlpha=available?(done?.45:.82):.28;ctx.shadowBlur=available&&!done?14:4;ctx.shadowColor=done?'#ffe79d':'#ff4fd8';ctx.fillStyle='#291735';ctx.fillRect(x-13,y-5,26,15);ctx.fillStyle=done?'#ffe79d':'#ff4fd8';ctx.beginPath();ctx.moveTo(x,y-29);ctx.lineTo(x+10,y-8);ctx.lineTo(x,y+2);ctx.lineTo(x-10,y-8);ctx.closePath();ctx.fill();ctx.globalAlpha=available&&!done?.45+.25*Math.sin(t*4):.18;ctx.strokeStyle='#ff9cec';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-12,21+Math.sin(t*3)*2,0,TAU);ctx.stroke();ctx.restore();
    }else if(it.type==='eclipseSeal'){
      const ready=allTrialsComplete(this.game)&&this.game.difficultyName==='nightmare';
      ctx.save();ctx.translate(x,y);ctx.globalAlpha=ready?.9:.45;ctx.shadowBlur=ready?20:5;ctx.shadowColor='#ff44de';ctx.strokeStyle=ready?'#ff70e8':'#69406f';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,-12,18,32,0,0,TAU);ctx.stroke();ctx.lineWidth=2;for(let i=0;i<3;i++){const a=t*.7+i*TAU/3;ctx.fillStyle=ready?'#fff0aa':'#57385d';ctx.fillRect(Math.cos(a)*28-3,-12+Math.sin(a)*40-3,6,6);}ctx.restore();
    }
  };

  const baseBossZone=World.updateBossZone;
  World.updateBossZone=function(){
    const z=this.current&&this.current.bossZone;
    if(!z||z.type!=='eclipseWarden')return baseBossZone.call(this);
    if(this.bossTriggered||this.bossPending||this.game.bossesDefeated.has('eclipseWarden'))return;
    const p=this.game.player;if(!p||Math.hypot(p.x-z.x,p.y-z.y)>z.radius)return;
    this.bossPending=true;
    this.game.quests&&this.game.quests.event&&this.game.quests.event('area_discovered',{id:'eclipse_altar',area:'eclipse_altar',world:'eclipse_chamber'});
    const spawn=()=>{
      this.bossTriggered=true;this.bossPending=false;
      const boss=this.game.spawnBoss('eclipseWarden',z.x,z.y,{name:z.name,arenaX:z.x,arenaY:z.y,arenaRadius:360});
      if(boss){this.game.ui&&this.game.ui.showBossTitle&&this.game.ui.showBossTitle('THE ECLIPSE WARDEN','Keeper of the Mythic Blade');this.game.shake&&this.game.shake(11,.8);this.game.flash&&this.game.flash('#ff3fd9',.22);}
    };
    this.game.startDialogue&&this.game.startDialogue({name:'The Eclipse Warden',portrait:'velymoor',lines:['Three trials. Three scars. You have carried their mark to my chamber.','Eclipsebreaker was forged for a warrior who could survive both light and ruin.','Prove that warrior is you.'],onComplete:spawn});
  };

  const baseLighting=World.drawLighting;
  World.drawLighting=function(ctx,camera){
    baseLighting&&baseLighting.call(this,ctx,camera);
    if(this.currentId==='eclipseChamber'){
      ctx.save();ctx.fillStyle='rgba(8,2,13,.38)';ctx.fillRect(0,0,960,540);ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(680,270,20,680,270,360);g.addColorStop(0,'rgba(255,67,218,.11)');g.addColorStop(.45,'rgba(112,31,138,.07)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,960,540);ctx.globalCompositeOperation='source-over';ctx.restore();
    }
  };
}

document.addEventListener('DOMContentLoaded',refreshOptions);
})();
