(function () {
  'use strict';

  const E = window.Elaria = window.Elaria || {};
  const TAU = Math.PI * 2;
  const rect = (x, y, w, h, type, extra) => ({ x, y, w, h, type, ...(extra || {}) });
  const point = (x, y, type, extra) => ({ x, y, type, ...(extra || {}) });

  function hash(x, y, salt) {
    let n = (x * 374761393 + y * 668265263 + (salt || 0) * 69069) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }

  function ringTrees(cx, cy, rx, ry, count, seed, gapFn) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const a = i / count * TAU;
      const wobble = (hash(i, seed, 8) - .5) * 55;
      const x = cx + Math.cos(a) * (rx + wobble);
      const y = cy + Math.sin(a) * (ry + wobble * .5);
      if (!gapFn || !gapFn(x, y)) out.push(rect(x - 18, y - 16, 36, 32, 'tree', { seed: i + seed }));
    }
    return out;
  }

  function makeElaria() {
    const obstacles = [
      rect(0, 0, 2400, 72, 'wall'), rect(0, 1428, 2400, 72, 'wall'), rect(0, 0, 70, 1500, 'wall'),
      rect(2330, 0, 70, 650, 'wall'), rect(2330, 850, 70, 650, 'wall'),
      rect(105, 110, 2190, 44, 'castleWall'),
      rect(250, 875, 330, 245, 'building', { roof: '#755449', name: "Hero's House" }),
      rect(930, 280, 360, 250, 'building', { roof: '#5c5963', name: 'Royal Armory' }),
      rect(1365, 725, 355, 250, 'building', { roof: '#754a3c', name: 'Provisioner' }),
      rect(1720, 270, 290, 220, 'building', { roof: '#4d4c57', damaged: true, name: 'Ruined Home' }),
      rect(300, 280, 280, 205, 'building', { roof: '#4c444d', damaged: true, name: 'Abandoned Home' }),
      rect(720, 110, 330, 190, 'keep', { name: 'Castle of Elaria' }),
      rect(1980, 1000, 215, 140, 'trainingFence')
    ];
    for (let x = 90; x < 2310; x += 95) {
      if ((x > 610 && x < 760) || (x > 2070 && x < 2290)) continue;
      obstacles.push(rect(x, 1340 + (x % 3) * 7, 32, 28, 'tree', { seed: x }));
    }
    for (let y = 180; y < 1320; y += 100) {
      if (y > 650 && y < 860) continue;
      obstacles.push(rect(90 + (y % 4) * 5, y, 34, 30, 'tree', { seed: y }));
      if (y < 600 || y > 920) obstacles.push(rect(2250, y, 34, 30, 'tree', { seed: y + 4 }));
    }
    return {
      id: 'elaria', name: 'Kingdom of Elaria', width: 2400, height: 1500, spawn: { x: 650, y: 1160 },
      palette: { ground: '#506044', alt: '#56674a', path: '#8a7859', edge: '#394534', water: '#31516a', light: 'rgba(244,207,132,.08)' },
      paths: [rect(540,620,1780,190,'path'), rect(620,480,170,780,'path'), rect(1130,480,150,390,'path'), rect(1490,800,150,330,'path')],
      obstacles,
      npcs: [
        point(690, 1050, 'npc', { id: 'wizard', name: 'Maelor', role: 'Wizard', color: '#704b8e', marker: '!' }),
        point(2175, 755, 'npc', { id: 'guard', name: 'Captain Elowen', role: 'Guard', color: '#576779', marker: '?' }),
        point(1115, 585, 'npc', { id: 'smith', name: 'Bram', role: 'Armorer', color: '#8c4c35' }),
        point(1510, 1040, 'npc', { id: 'shopkeeper', name: 'Mira', role: 'Shopkeeper', color: '#617d50', marker: '$' })
      ],
      interactables: [
        point(1190, 575, 'chest', { id: 'armory_supply', label: 'Armory Supplies', rewards: { items: [['rusty_sword',1],['leather_armor',1]], gold: 0 } }),
        point(2070, 1190, 'dummy', { id: 'training_dummy', label: 'Training Dummy' }),
        point(870, 335, 'lockedDoor', { id: 'castle_lock', label: 'Castle Gate' })
      ],
      labels: [point(400,820,'label',{text:"Hero's House"}), point(1080,235,'label',{text:'ROYAL ARMORY'}), point(1445,680,'label',{text:'MIRA’S PROVISIONS'}), point(2070,955,'label',{text:'TRAINING YARD'})],
      exits: [rect(2245,650,85,200,'exit',{ id:'elaria_greenhaven', to:'greenhaven', position:{x:150,y:750}, label:'Greenhaven Forest', equipmentGate:true })],
      enemySpawns: []
    };
  }

  function makeGreenhaven() {
    const obstacles = [rect(0,0,2400,65,'cliff'),rect(0,1435,2400,65,'cliff')];
    for (let x = 0; x < 2400; x += 78) {
      const clearTop = x > 1750 && x < 2240;
      if (!clearTop) obstacles.push(rect(x + hash(x,1,2)*22, 100 + hash(x,2,3)*210, 42, 38, 'tree', { seed:x }));
      if (!(x > 1760 && x < 2240)) obstacles.push(rect(x + hash(x,5,3)*20, 1120 + hash(x,6,4)*210, 42, 38, 'tree', { seed:x+1 }));
    }
    for (let x = 330; x < 1700; x += 125) {
      const y = 420 + Math.sin(x * .012) * 205;
      if (x % 3) obstacles.push(rect(x, y, 38, 34, 'tree', { seed:x+7 }));
      if (x % 4) obstacles.push(rect(x+40, y+490, 38, 34, 'tree', { seed:x+9 }));
    }
    obstacles.push(rect(690,165,280,115,'water'),rect(1030,1050,360,120,'water'),rect(1440,300,180,110,'ruin'),rect(1840,390,390,35,'rootWall'),rect(1840,1075,390,35,'rootWall'));
    return {
      id:'greenhaven', name:'Greenhaven Forest', width:2400,height:1500,spawn:{x:150,y:750},
      palette:{ground:'#3f673d',alt:'#477544',path:'#7d764e',edge:'#27482d',water:'#287278',light:'rgba(214,248,158,.08)'},
      paths:[rect(0,650,1910,210,'path'),rect(1800,420,480,690,'arena')], obstacles,
      npcs:[point(760,625,'npc',{id:'forest_survivor',name:'Tarin',role:'Survivor',color:'#4c7652',marker:'!'}),point(1510,900,'npc',{id:'forest_merchant',name:'Fen',role:'Wandering Trader',color:'#676f43',marker:'$'})],
      interactables:[
        point(520,410,'chest',{id:'green_chest_1',label:'Mossy Chest',rewards:{gold:12,items:[['health_potion',1],['slime_gel',2]]}}),
        point(1550,225,'switch',{id:'green_switch',label:'Ancient Root Switch'}),
        point(1180,1250,'chest',{id:'green_secret_chest',label:'Hidden Grove Chest',requires:'green_switch',rewards:{gold:25,items:[['acorn_talisman',1],['health_potion',2]]}}),],
      labels:[point(250,610,'label',{text:'GREENHAVEN'}),point(1950,365,'label',{text:'THE HEARTWOOD'})],
      exits:[rect(70,650,75,200,'exit',{id:'green_elaria',to:'elaria',position:{x:2220,y:750},label:'Elaria'}),rect(2255,650,75,200,'exit',{id:'green_dark',to:'darkForest',position:{x:150,y:750},label:'The Dark Forest',requiresBoss:'creakingOne'})],
      bossZone:{x:2050,y:760,radius:245,type:'creakingOne',name:'The Creaking One'},
      enemySpawns:[
        point(420,700,'greenSlime'),point(560,850,'greenSlime'),point(670,480,'poisonSlime'),point(870,820,'goblinScout'),point(1040,600,'goblinArcher'),point(1180,900,'goblinScout'),point(1320,540,'goblinWarrior'),point(1450,760,'goblinArcher'),point(1600,1030,'poisonSlime'),point(1630,480,'goblinWarrior')
      ].map(p=>({x:p.x,y:p.y,type:p.type}))
    };
  }

  function makeDarkForest() {
    const obstacles=[rect(0,0,2400,70,'cliff'),rect(0,1430,2400,70,'cliff')];
    for(let i=0;i<82;i++){
      const x=120+hash(i,2,19)*2150,y=90+hash(i,5,20)*1320;
      const onPath=Math.abs(y-(730+Math.sin(x*.007)*150))<150;
      const inArena=x>1770&&y>390&&y<1120;
      if(!onPath&&!inArena) obstacles.push(rect(x,y,44,38,'darkTree',{seed:i}));
    }
    obstacles.push(rect(620,210,250,120,'poisonPool'),rect(930,1030,280,135,'poisonPool'),rect(1350,270,190,100,'poisonPool'),rect(1260,740,170,130,'ruin'),rect(1780,380,470,35,'shadowWall'),rect(1780,1090,470,35,'shadowWall'));
    return {
      id:'darkForest',name:'The Dark Forest',width:2400,height:1500,spawn:{x:150,y:750},
      palette:{ground:'#263a35',alt:'#2e443d',path:'#4b4a43',edge:'#172725',water:'#244556',light:'rgba(104,142,140,.045)'},
      paths:[rect(0,610,1800,280,'path'),rect(1770,415,510,675,'arena')],obstacles,fog:true,
      npcs:[point(830,890,'npc',{id:'lost_scout',name:'Scout Ilyra',role:'Lost Scout',color:'#3f6971',marker:'!'})],
      interactables:[],
      labels:[point(250,565,'label',{text:'THE DARK FOREST'}),point(1940,360,'label',{text:'NYXFANG’S DEN'})],
      exits:[rect(70,650,75,200,'exit',{id:'dark_green',to:'greenhaven',position:{x:2220,y:750},label:'Greenhaven'}),rect(2255,650,75,200,'exit',{id:'dark_caves',to:'chaosCaves',position:{x:150,y:750},label:'Chaos Caves',requiresBoss:'nyxfang'})],
      bossZone:{x:2050,y:760,radius:250,type:'nyxfang',name:'Nyxfang, the Shadow Wolf'},
      enemySpawns:[
        {x:410,y:730,type:'shadowGoblin'},{x:530,y:930,type:'spider'},{x:690,y:560,type:'wolf'},{x:880,y:740,type:'poisonSlime'},{x:1020,y:910,type:'spider'},{x:1160,y:530,type:'darkMage'},{x:1300,y:730,type:'vine'},{x:1450,y:930,type:'wolf'},{x:1570,y:530,type:'shadowGoblin'},{x:1670,y:780,type:'darkMage'}
      ]
    };
  }

  function makeCaves() {
    const obstacles=[rect(0,0,2400,85,'caveWall'),rect(0,1415,2400,85,'caveWall')];
    for(let i=0;i<60;i++){
      const x=100+hash(i,4,31)*2200,y=110+hash(i,8,32)*1270;
      const path=Math.abs(y-(740+Math.sin(x*.008)*120))<170;
      const arena=x>1770&&y>390&&y<1110;
      if(!path&&!arena) obstacles.push(rect(x,y,32+hash(i,2,2)*30,28+hash(i,3,4)*25,i%4===0?'crystal':'caveRock',{seed:i}));
    }
    obstacles.push(rect(620,230,330,125,'chaosLava'),rect(870,1030,350,125,'chaosLava'),rect(1310,250,330,105,'chaosLava'),rect(1390,850,150,190,'crackedWall',{id:'cave_cracked_wall'}),rect(1770,385,480,35,'crystalWall'),rect(1770,1095,480,35,'crystalWall'));
    return {
      id:'chaosCaves',name:'The Chaos Caves',width:2400,height:1500,spawn:{x:150,y:750},
      palette:{ground:'#34313d',alt:'#3b3548',path:'#555064',edge:'#211e2a',water:'#5f286b',light:'rgba(124,104,190,.07)'},
      paths:[rect(0,590,1810,310,'path'),rect(1760,420,520,675,'arena')],obstacles,
      npcs:[point(720,875,'npc',{id:'miner',name:'Old Caster',role:'Trapped Miner',color:'#7b6849',marker:'!'})],
      interactables:[point(1220,470,'switch',{id:'cart_switch',label:'Minecart Lever'})],
      labels:[point(250,540,'label',{text:'CHAOS CAVES'}),point(1900,365,'label',{text:'TITAN’S VAULT'})],
      exits:[rect(70,650,75,200,'exit',{id:'caves_dark',to:'darkForest',position:{x:2220,y:750},label:'Dark Forest'}),rect(2255,650,75,200,'exit',{id:'caves_realm',to:'brokenRealm',position:{x:150,y:750},label:'Broken Realm',requiresBoss:'gorath'})],
      bossZone:{x:2050,y:760,radius:255,type:'gorath',name:'Gorath, the Crystal Titan'},
      platforms:[{x:670,y:275,w:90,h:36,axis:'x',range:170,speed:.65,phase:0},{x:1010,y:1070,w:90,h:36,axis:'x',range:175,speed:.55,phase:2}],
      enemySpawns:[{x:390,y:700,type:'bat'},{x:520,y:860,type:'skeleton'},{x:700,y:570,type:'chaosMiner'},{x:850,y:800,type:'crystalCreature'},{x:1010,y:580,type:'bat'},{x:1160,y:880,type:'golem'},{x:1310,y:600,type:'darkMage'},{x:1460,y:810,type:'skeleton'},{x:1600,y:570,type:'crystalCreature'},{x:1660,y:930,type:'golem'}]
    };
  }

  function makeBrokenRealm() {
    const obstacles=[rect(0,0,2400,70,'voidEdge'),rect(0,1430,2400,70,'voidEdge')];
    for(let i=0;i<54;i++){
      const x=120+hash(i,1,43)*2150,y=100+hash(i,6,44)*1300;
      const path=Math.abs(y-750)<210;
      const arena=x>1810&&y>350&&y<1150;
      if(!path&&!arena) obstacles.push(rect(x,y,50+hash(i,3,2)*45,30+hash(i,4,2)*30,'floatingRock',{seed:i}));
    }
    obstacles.push(rect(560,180,340,110,'chaosRiver'),rect(800,1130,380,120,'chaosRiver'),rect(1260,180,280,115,'chaosRiver'),rect(1440,1010,280,120,'chaosRiver'),rect(1830,300,440,80,'fortressWall'),rect(1830,1120,440,80,'fortressWall'),rect(2210,300,90,900,'fortressWall'));
    return {
      id:'brokenRealm',name:"Velymoor's Broken Realm",width:2400,height:1500,spawn:{x:150,y:750},
      palette:{ground:'#33213e',alt:'#40244a',path:'#5a3a55',edge:'#1d1026',water:'#8b2c9f',light:'rgba(180,68,220,.07)'},
      paths:[rect(0,540,1900,420,'path'),rect(1810,380,400,740,'arena')],obstacles,storm:true,
      npcs:[],
      interactables:[point(1040,450,'portal',{id:'echo_portal',label:'Echo of Greenhaven'})],
      labels:[point(260,500,'label',{text:'THE BROKEN REALM'}),point(1880,300,'label',{text:'VELYMOOR’S FORTRESS'})],
      exits:[rect(70,650,75,200,'exit',{id:'realm_caves',to:'chaosCaves',position:{x:2220,y:750},label:'Chaos Caves'})],
      bossZone:{x:2020,y:760,radius:270,type:'velymoor',name:'Velymoor'},
      enemySpawns:[{x:390,y:690,type:'eliteSlime'},{x:510,y:900,type:'eliteGoblin'},{x:690,y:540,type:'shadowGoblin'},{x:810,y:780,type:'darkMage'},{x:980,y:950,type:'eliteWolf'},{x:1120,y:570,type:'golem'},{x:1270,y:910,type:'skeleton'},{x:1470,y:560,type:'eliteGoblin'},{x:1600,y:840,type:'darkMage'},{x:1710,y:650,type:'crystalCreature'}]
    };
  }

  E.WORLD_DEFS = {
    elaria: makeElaria(), greenhaven: makeGreenhaven(), darkForest: makeDarkForest(), chaosCaves: makeCaves(), brokenRealm: makeBrokenRealm()
  };

  class WorldManager {
    constructor(game) {
      this.game=game;
      this.current=null;
      this.currentId='elaria';
      this.nearby=null;
      this.bossTriggered=false;
      this.bossPending=false;
      this.hazardClock=0;
      this.exitClock=0;
      this.decor=[];
      this.lightning=0;
      this.lightningLines=[];
      this.introPlayed=false;
    }

    load(id, position) {
      this.currentId=E.WORLD_DEFS[id]?id:'elaria';
      this.current=E.WORLD_DEFS[this.currentId];
      this.bossTriggered=this.current.bossZone?this.game.bossesDefeated.has(this.current.bossZone.type):false;
      this.bossPending=false;
      this.nearby=null;
      this.hazardClock=0;
      this.exitClock=0;
      this.makeDecor();
      if(this.game.player){
        const p=position||this.current.spawn;
        this.game.player.x=+p.x||this.current.spawn.x;
        this.game.player.y=+p.y||this.current.spawn.y;
      }
      if(this.game.spawnEnemiesForWorld) this.game.spawnEnemiesForWorld(this.currentId,this.current.enemySpawns);
      return this.current;
    }

    getSpawn(){ return {...(this.current?this.current.spawn:{x:200,y:300})}; }
    serialize(){ return {id:this.currentId}; }

    makeDecor(){
      this.decor=[];
      const areaScale=(this.current.width*this.current.height)/(2400*1500),count=Math.round((this.currentId==='elaria'?140:220)*areaScale);
      const salt=Object.keys(E.WORLD_DEFS).indexOf(this.currentId)+1;
      for(let i=0;i<count;i++){
        const x=85+hash(i,11,salt)*Math.max(100,this.current.width-170),y=85+hash(i,13,salt+7)*Math.max(100,this.current.height-170);
        if(this.current.paths.some(p=>this.inside(x,y,p))) continue;
        const roll=hash(i,3,salt);
        this.decor.push({x,y,kind:roll>.91?'bush':roll>.72?'flower':roll<.09?'pebble':'tuft',tone:hash(i,4,salt),phase:hash(i,5,salt)*TAU});
      }
    }

    inside(x,y,r){ return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h; }

    collides(x,y,radius){
      const r=Math.max(2,radius||10),w=this.current;
      if(!w||x-r<70||y-r<70||x+r>w.width-70||y+r>w.height-70) return true;
      for(const o of w.obstacles){
        if(o.id==='cave_cracked_wall'&&this.game.chestsOpened.has('cave_cracked_wall')) continue;
        if(['poisonPool','chaosLava','chaosRiver'].includes(o.type)) continue;
        const cx=Math.max(o.x,Math.min(x,o.x+o.w)),cy=Math.max(o.y,Math.min(y,o.y+o.h));
        if((x-cx)*(x-cx)+(y-cy)*(y-cy)<r*r) return true;
      }
      return false;
    }

    update(dt){
      if(!this.current||!this.game.player) return;
      this.exitClock=Math.max(0,this.exitClock-dt);
      this.hazardClock=Math.max(0,this.hazardClock-dt);
      if(this.current.platforms){
        for(const p of this.current.platforms){
          p.offset=Math.sin(this.game.elapsed*p.speed+p.phase)*p.range;
        }
      }
      this.updateHazards();
      this.updateNearby();
      this.updateExits();
      this.updateBossZone();
      if(this.current.storm){
        this.lightning-=dt;
        if(this.lightning<=0){
          this.lightning=2.2+Math.random()*4;
          this.lightningLines=this.makeLightning();
          this.game.flash('#9e68df',.12);
          this.game.audio&&this.game.audio.play('thunder');
        }
      }
    }

    updateHazards(){
      const p=this.game.player;
      let hazard=null;
      for(const o of this.current.obstacles){
        if(!['poisonPool','chaosLava','chaosRiver'].includes(o.type)) continue;
        if(this.inside(p.x,p.y,o)){hazard=o.type;break;}
      }
      if(hazard){
        p.slowTimer=Math.max(p.slowTimer||0,.2);
        if(this.hazardClock<=0){
          this.hazardClock=.75;
          const amount=hazard==='poisonPool'?4:8;
          p.takeDamage&&p.takeDamage(amount,{type:hazard,environment:true});
          this.game.particles&&this.game.particles.burst(p.x,p.y,hazard==='poisonPool'?'#76bd5a':'#c848bd',6,48,3,.45,{color2:hazard==='poisonPool'?'#492b59':'#6d2f8d',gravity:-18});
        }
      }
    }

    updateNearby(){
      const p=this.game.player,all=[...(this.current.npcs||[]),...(this.current.interactables||[])];
      let best=null,bestD=82;
      for(const it of all){
        if(it.type==='chest'&&this.game.chestsOpened.has(it.id)) continue;
        const d=Math.hypot(p.x-it.x,p.y-it.y);
        if(d<bestD){best=it;bestD=d;}
      }
      this.nearby=best;
      const prompt=document.getElementById('interact-prompt');
      if(prompt){
        prompt.classList.toggle('hidden',!best);
        const span=prompt.querySelector('span');
        if(span&&best) span.textContent=best.type==='npc'?`Speak to ${best.name}`:(best.label||'Interact');
      }
    }

    updateExits(){
      if(this.exitClock>0||this.game.transitioning) return;
      const p=this.game.player;
      for(const ex of this.current.exits||[]){
        if(!this.inside(p.x,p.y,ex)) continue;
        if(ex.equipmentGate&&!this.isPrepared()){
          this.exitClock=1.2;
          this.guardDialogue(false);
          return;
        }
        if(ex.requiresBoss&&!this.game.bossesDefeated.has(ex.requiresBoss)){
          this.exitClock=1.4;
          this.game.ui&&this.game.ui.toast(`${this.current.bossZone?this.current.bossZone.name:'A powerful foe'} bars the path.`, 'danger');
          return;
        }
        if(ex.equipmentGate){
          this.game.quests&&this.game.quests.event('guard_cleared',{equipped:true});
          this.game.quests&&this.game.quests.event('left_elaria',{});
        }
        this.game.transitionTo(ex.to,ex.position);
        return;
      }
    }

    updateBossZone(){
      const z=this.current.bossZone;
      if(!z||this.bossTriggered||this.bossPending||this.game.bossesDefeated.has(z.type)) return;
      const p=this.game.player;
      if(Math.hypot(p.x-z.x,p.y-z.y)>z.radius) return;
      this.bossPending=true;
      const arenaIds={creakingOne:'creaking_grove',nyxfang:'nyxfang_den',gorath:'gorath_sanctum',velymoor:'velymoor_fortress'};
      this.game.quests&&this.game.quests.event('area_discovered',{id:arenaIds[z.type]||z.type,area:arenaIds[z.type]||z.type,world:this.game.currentWorldId||this.currentId});
      let stagedBoss=null;
      const spawn=()=>{
        this.bossTriggered=true;this.bossPending=false;
        const boss=stagedBoss||this.game.spawnBoss(z.type,z.x,z.y,{name:z.name});
        if(boss){
          if(stagedBoss){
            boss.releaseIntro&&boss.releaseIntro();
            this.game.audio&&this.game.audio.setWorld&&this.game.audio.setWorld(this.game.worldId,true,true);
            this.game.audio&&this.game.audio.fadeMusic&&this.game.audio.fadeMusic(1,.55);
            if(this.game.cinematicCamera){this.game.cinematicCamera.active=false;this.game.cinematicCamera.release=1.25;}
            this.game.ui&&this.game.ui.showBossTitle&&this.game.ui.showBossTitle('VELYMOOR','Bearer of the Orb of Chaos');
            this.game.quests&&this.game.quests.event('velymoor_confronted',{});
            this.game.effects&&this.game.effects.warp&&this.game.effects.warp(2.8,2.5);
            this.game.particles&&this.game.particles.burst&&this.game.particles.burst(z.x,z.y,'#d84cda',42,195,5,.95,{kind:'spark',glow:11,color2:'#f7d49a'});
          }else this.game.ui&&this.game.ui.showArea(z.name);
          this.game.shake(stagedBoss?11:5,stagedBoss ? .85 : .6);
        }
      };
      if(z.type==='velymoor'){
        stagedBoss=this.game.spawnBoss(z.type,z.x,z.y,{name:z.name,introHold:true,deferMusic:true});
        if(stagedBoss){
          this.game.cinematicCamera={active:true,targetX:z.x,targetY:z.y,zoom:1.08,release:0};
          if(this.game.player)this.game.player.cinematicLocked=true;
          this.game.audio&&this.game.audio.fadeMusic&&this.game.audio.fadeMusic(.12,1.3);
        }
        this.game.startDialogue({name:'Velymoor',portrait:'velymoor',lines:[
          'So... Another hero has come.',
          'You destroyed everything I built.',
          'But you are already too late.',
          'The Orb has chosen me.',
          'I shall become the end of this world.',
          {text:'Kneel, and I may let your dying kingdom watch the end.',choices:[
            {text:'Elaria will see the dawn.'},
            {text:'Your reign ends now.'}
          ]},
          'Then come. Let chaos remember your name.'
        ],onComplete:spawn});
      }else{
        const preludes={
          creakingOne:{name:'The Heartwood',portrait:'wizard',lines:['The grove holds its breath. Roots twist beneath your feet, and an ancient voice wakes inside the bark.','Mortal… if you carry the light, prove it against the grief that has consumed me.']},
          nyxfang:{name:'Nyxfang',portrait:'survivor',lines:['A howl folds the fog around you. Two violet eyes open where no creature stood a moment before.','Give me your shadow, little flame. Mine was taken long ago.']},
          gorath:{name:'Gorath',portrait:'smith',lines:['Three resonance crystals ignite. Stone the size of a tower lowers its head and remembers an ancient command.','INTRUDER. THE ASTERI VAULT WILL NOT FALL A SECOND TIME.']}
        };
        const scene=preludes[z.type];
        this.game.startDialogue({name:scene.name,portrait:scene.portrait,lines:scene.lines,onComplete:spawn});
      }
    }

    interact(){
      const it=this.nearby;
      if(!it)return;
      this.game.audio&&this.game.audio.play('interact');
      if(it.type==='npc') this.talk(it);
      else if(it.type==='chest') this.openChest(it);
      else if(it.type==='dummy'){
        this.game.startDialogue({name:'Training Dummy',portrait:'dummy',lines:['Attack with Space or the left mouse button. Chain three quick strikes for a combo.','Hold the attack button, then release for a charged blow. Press Shift to dodge through danger.']});
        this.game.quests&&this.game.quests.event('training_used',{});
      }else if(it.type==='switch'||it.type==='shrine'){
        if(!this.game.chestsOpened.has(it.id)){
          this.game.chestsOpened.add(it.id);this.game.audio&&this.game.audio.play('switch');this.game.shake(3,.25);
          this.game.ui&&this.game.ui.toast(it.type==='shrine'?'The broken shrine answers with a pale light.':'A hidden mechanism rumbles in the distance.','success');
          this.game.quests&&this.game.quests.event('secret_found',{id:it.id});
        }else this.game.ui&&this.game.ui.toast('The mechanism has already been activated.');
      }else if(it.type==='crackedWall'){
        if(!this.game.chestsOpened.has(it.id)){
          this.game.chestsOpened.add(it.id);this.game.shake(8,.5);this.game.audio&&this.game.audio.play('rockBreak');
          this.game.particles&&this.game.particles.burst(it.x,it.y,'#777081',24,125,5,.75,{color2:'#a57eb2',gravity:90});
          this.game.ui&&this.game.ui.toast('The cracked wall collapses, revealing a chamber!','rare');
        }
      }else if(it.type==='portal'){
        this.game.startDialogue({name:'Echoing Portal',portrait:'wizard',lines:['Calm forests flicker within the chaos. The Orb has tangled every realm together.','The portal is unstable, but its light restores a little strength.'],onComplete:()=>this.game.player&&this.game.player.heal&&this.game.player.heal(25)});
      }else if(it.type==='lockedDoor'){
        this.game.startDialogue({name:'Castle Gate',portrait:'guard',lines:[this.game.bossesDefeated.has('creakingOne')?'The old castle wing remains sealed while its foundations are repaired.':'The inner castle is locked. Perhaps victory beyond the walls will restore hope here.']});
      }
    }

    talk(npc){
      switch(npc.id){
        case 'wizard': this.wizardDialogue();break;
        case 'guard': this.guardDialogue(this.isPrepared());break;
        case 'smith':
          this.game.startDialogue({name:'Bram the Armorer',portrait:'smith',lines:[this.isPrepared()?'That leather will turn a claw, and the old blade still has honest steel in it. Equipments with higher rarity hold stronger enchantments.':'The chest beside me holds a rusty sword and leather armor. Take both, then open your inventory with I and equip them.','Weapons increase damage. Armor raises defense and sometimes maximum health. Never trust a shiny helmet more than its numbers.']});
          break;
        case 'shopkeeper': this.game.shop&&this.game.shop.open('elaria');break;
        case 'forest_merchant': this.game.shop&&this.game.shop.open('forest');break;
        case 'forest_survivor':
          this.game.startDialogue({name:'Tarin',portrait:'survivor',lines:['The goblins dragged survivors toward the old heartwood. I escaped through a hidden grove north of here.','Poison slimes telegraph their leaps. Step aside, then strike while they recover.'],onComplete:()=>this.game.quests&&this.game.quests.event('survivor_rescued',{id:'tarin'})});break;
        case 'lost_scout':
          this.game.startDialogue({name:'Scout Ilyra',portrait:'survivor',lines:['Nyxfang moves like a shadow, but even shadows need light to exist. Watch the ground when the beast vanishes.','I can find my way back now. Take this potion, {player}.'],onComplete:()=>{if(!this.game.chestsOpened.has('ilyra_reward')){this.game.chestsOpened.add('ilyra_reward');this.game.inventory.add('health_potion',1);}this.game.quests&&this.game.quests.event('survivor_rescued',{id:'ilyra'});}});break;
        case 'miner':
          this.game.startDialogue({name:'Old Caster',portrait:'smith',lines:['Gorath’s armor drinks power from three crystals around the vault. Break them first, or your blade will barely scratch it.','The minecart lever opens the old treasure line. I would pull it myself, but my knees retired three kingdoms ago.'],onComplete:()=>this.game.quests&&this.game.quests.event('survivor_rescued',{id:'caster'})});break;
      }
    }

    beginIntro(){
      if(this.introPlayed)return;
      this.introPlayed=true;
      this.wizardDialogue(true);
    }

    wizardDialogue(intro){
      const victories=this.game.bossesDefeated.size;
      const relationship=victories>=3?'Three guardians freed… I knew the prophecy named a savior, but I did not understand it named my friend. The final road waits.':victories===2?'The caves remember older magic than mine. Yet Nyxfang’s peaceful shadow follows you; you will not enter alone.':victories===1?'Greenhaven has begun to bloom again. Bram pretends he did not cry when the first seed arrived. You have given Elaria more than victory—you have given us tomorrow.':null;
      const lines=intro?[
        'At last… the dream was true. Come closer, {player}. There is little time.',
        'The world knew no monsters once. Then Velymoor found the Orb of Chaos and taught the darkness how to breathe.',
        'Kingdom after kingdom fell. Only Elaria remains—and even our walls are failing.',
        'The light has chosen an unlikely hand: yours. You begin as a farmer, but you need not end as one.',
        'Go to the Royal Armory. Take the sword and armor Bram has prepared, equip both from your inventory, then meet Captain Elowen at the eastern gate.',
        'Beyond her lies Greenhaven. Find the source of its corruption. Gather every coin and potion you can; the road will not forgive carelessness.'
      ]:[this.game.bossesDefeated.has('velymoor')?'The sky is clear again, {player}. Elaria will sing your name longer than these stones endure.':relationship|| (this.isPrepared()?'You carry Elaria’s steel now. Captain Elowen waits at the eastern gate. May the light walk beside you.':'The armory lies north along the stone path. Take the sword and armor, then equip them with I.')];
      this.game.startDialogue({name:'Maelor the Wizard',portrait:'wizard',lines,onComplete:()=>this.game.quests&&this.game.quests.event('wizard_spoken',{intro:!!intro})});
    }

    guardDialogue(prepared){
      const text=prepared?'You are prepared, warrior. May the light of Elaria guide you.':'Stop! The lands outside Elaria are filled with monsters. I cannot allow you through without armor and a weapon.';
      this.game.startDialogue({name:'Captain Elowen',portrait:'guard',lines:[text,prepared?'Greenhaven’s old guardian has gone silent. Follow the eastern road, but do not mistake beauty for safety.':'Visit the armory, take both pieces, then equip them from your inventory. I will not gamble Elaria’s last hope.'],onComplete:()=>{if(prepared)this.game.quests&&this.game.quests.event('guard_cleared',{equipped:true});}});
    }

    isPrepared(){
      const eq=this.game.inventory&&this.game.inventory.equipment;
      return !!(eq&&eq.weapon&&eq.armor);
    }

    openChest(chest){
      if(this.game.chestsOpened.has(chest.id))return;
      if(chest.requires&&!this.game.chestsOpened.has(chest.requires)){
        this.game.ui&&this.game.ui.toast('A hidden mechanism keeps this sealed.','danger');return;
      }
      this.game.chestsOpened.add(chest.id);
      this.game.stats.chestsOpened+=1;
      this.game.audio&&this.game.audio.play('chest');
      this.game.shake(2,.2);
      const reward=chest.rewards||{};
      if(reward.gold){
        const coins=Math.min(18,Math.max(4,Math.round(reward.gold/2)));
        const value=Math.max(1,Math.round(reward.gold/coins));
        this.game.spawnDrop('gold',chest.x,chest.y,{value});
        for(let i=1;i<coins;i++) this.game.spawnDrop('gold',chest.x+(Math.random()-.5)*10,chest.y+(Math.random()-.5)*10,{value});
      }
      for(const pair of reward.items||[]) this.game.spawnDrop(pair[0]==='health_potion'?'potion':'item',chest.x,chest.y,{itemId:pair[0],qty:pair[1]});
      this.game.particles&&this.game.particles.burst(chest.x,chest.y-12,'#f4d06b',18,105,3,.65,{kind:'spark',color2:'#9672b1',glow:5});
      this.game.quests&&this.game.quests.event('chest_opened',{id:chest.id});
      this.game.saveNow('chest');
    }

    renderPreparedMarker(npc){
      if(npc.id==='wizard') return !this.game.quests||!this.game.inventory||!this.game.inventory.equipment.weapon?'!':'';
      if(npc.id==='guard') return this.isPrepared()?'!':'?';
      return npc.marker||'';
    }

    draw(ctx,camera){
      const w=this.current;if(!w)return;
      const startX=Math.max(0,Math.floor(camera.x/32)*32-32),endX=Math.min(w.width,startX+1056);
      const startY=Math.max(0,Math.floor(camera.y/32)*32-32),endY=Math.min(w.height,startY+640);
      ctx.fillStyle=w.palette.ground;ctx.fillRect(startX,startY,endX-startX,endY-startY);
      for(let y=startY;y<endY;y+=32)for(let x=startX;x<endX;x+=32){
        const h=hash(x>>5,y>>5,Object.keys(E.WORLD_DEFS).indexOf(w.id));
        ctx.fillStyle=h>.52?w.palette.alt:w.palette.ground;ctx.fillRect(x,y,32,32);
        ctx.fillStyle=h>.82?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)';ctx.fillRect(x+(h*23|0),y+((h*61)%25|0),2+(h>.9?1:0),2);
        if(h>.68){ctx.globalAlpha=.12;ctx.fillStyle=this.tint(w.palette.alt,18);ctx.fillRect(x+4+((h*17)|0)%20,y+6+((h*29)|0)%17,5,1);ctx.globalAlpha=1;}
      }
      ctx.save();
      const terrainGlow=ctx.createLinearGradient(startX,startY,endX,endY);
      terrainGlow.addColorStop(0,w.palette.light||'rgba(255,255,255,.03)');
      terrainGlow.addColorStop(.55,'rgba(255,255,255,0)');
      terrainGlow.addColorStop(1,'rgba(0,0,0,.09)');
      ctx.fillStyle=terrainGlow;ctx.fillRect(startX,startY,endX-startX,endY-startY);ctx.restore();
      for(const p of w.paths){
        const pathColor=p.type==='arena'?this.tint(w.palette.path,-10):w.palette.path;
        ctx.fillStyle='rgba(13,9,16,.20)';ctx.fillRect(p.x-3,p.y-3,p.w+6,p.h+6);
        ctx.fillStyle=pathColor;ctx.fillRect(p.x,p.y,p.w,p.h);
        ctx.fillStyle='rgba(255,238,190,.07)';ctx.fillRect(p.x,p.y,p.w,2);
        ctx.fillStyle='rgba(0,0,0,.10)';ctx.fillRect(p.x,p.y+p.h-3,p.w,3);
        ctx.fillStyle='rgba(255,255,255,.055)';for(let x=p.x+16;x<p.x+p.w;x+=32)ctx.fillRect(x,p.y+((x*7)%Math.max(8,p.h-8)),3,2);
      }
      for(const d of this.decor) if(d.x>camera.x-20&&d.x<camera.x+980&&d.y>camera.y-20&&d.y<camera.y+560)this.drawDecor(ctx,d);
      for(const o of w.obstacles) if(this.visible(o,camera))this.drawObstacle(ctx,o);
      if(w.platforms)for(const p of w.platforms)this.drawPlatform(ctx,p);
      for(const label of w.labels||[])this.drawLabel(ctx,label);
      for(const it of w.interactables||[])this.drawInteractable(ctx,it);
      for(const npc of w.npcs||[])this.drawNpc(ctx,npc);
      for(const ex of w.exits||[])this.drawExit(ctx,ex);
      if(this.game.boss&&this.game.boss.bossType==='velymoor'&&this.game.boss.drawArenaEffects)this.game.boss.drawArenaEffects(ctx);
      if(w.bossZone&&!this.game.bossesDefeated.has(w.bossZone.type))this.drawArenaSeal(ctx,w.bossZone);
    }

    drawForeground(ctx,camera){
      for(const o of this.current.obstacles){
        if(!['tree','darkTree'].includes(o.type)||!this.visible(o,camera))continue;
        ctx.save();ctx.globalAlpha=.22;ctx.fillStyle=o.type==='darkTree'?'#4f6570':'#9bb564';ctx.fillRect(o.x-15,o.y-30,o.w+30,5);ctx.restore();
      }
    }

    visible(o,c){return o.x+o.w>c.x-100&&o.x<c.x+1060&&o.y+o.h>c.y-100&&o.y<c.y+640;}

    drawDecor(ctx,d){
      const cave=this.currentId==='chaosCaves',dark=this.currentId==='darkForest',realm=this.currentId==='brokenRealm';
      const sway=Math.sin(this.game.elapsed*1.7+d.phase)*(this.game.ambient?this.game.ambient.wind:0)*2;
      if(d.kind==='bush'){
        ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(d.x-8,d.y+2,18,5);ctx.fillStyle=dark?'#213d38':realm?'#5d3268':cave?'#514660':'#3c6943';ctx.fillRect(d.x-9+sway,d.y-7,18,10);ctx.fillStyle=dark?'#3e6556':realm?'#9c4a9c':cave?'#776489':'#5f9155';ctx.fillRect(d.x-5+sway,d.y-11,12,7);ctx.fillStyle='rgba(255,255,255,.09)';ctx.fillRect(d.x-3+sway,d.y-9,5,2);return;
      }
      if(d.kind==='pebble'){ctx.fillStyle=cave?'#81758d':realm?'#74447e':'#6e7164';ctx.fillRect(d.x-3,d.y-2,7,3);ctx.fillStyle='rgba(255,255,255,.1)';ctx.fillRect(d.x-1,d.y-2,3,1);return;}
      if(cave){ctx.fillStyle=d.tone>.7?'#8d60ba':'#5b4f72';ctx.fillRect(d.x,d.y-4,2,6);ctx.fillStyle='#bd8ce0';ctx.fillRect(d.x,d.y-5,2,2);}
      else if(dark){ctx.fillStyle=d.kind==='flower'?'#70c6a5':'#344d41';ctx.fillRect(d.x,d.y-3,2,4);if(d.kind==='flower')ctx.fillRect(d.x-2,d.y-5,5,2);}
      else if(realm){ctx.fillStyle=d.kind==='flower'?'#d05ce1':'#6c3978';ctx.fillRect(d.x,d.y-3,2,5);}
      else{ctx.fillStyle=d.kind==='flower'?(d.tone>.5?'#e1c563':'#b7d6df'):'#617b4d';ctx.fillRect(d.x+sway,d.y-3,2,4);if(d.kind==='flower')ctx.fillRect(d.x-2+sway,d.y-5,5,2);}
    }

    drawObstacle(ctx,o){
      const x=Math.round(o.x),y=Math.round(o.y),w=Math.round(o.w),h=Math.round(o.h);
      ctx.save();
      if(o.type==='tree'||o.type==='darkTree'){
        const dark=o.type==='darkTree',sway=Math.round(Math.sin(this.game.elapsed*1.1+(o.seed||0))*(this.game.ambient?this.game.ambient.wind:0)*2);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x-13,y+h-3,w+26,9);ctx.fillStyle=dark?'#342b35':'#594129';ctx.fillRect(x+w/2-6,y+h-18,12,24);
        const c1=dark?'#1c3130':'#31563a',c2=dark?'#28403c':'#447148',c3=dark?'#3a5250':'#5f8953';
        ctx.fillStyle=c1;ctx.fillRect(x-15+sway,y-26,w+30,h+30);ctx.fillStyle=c2;ctx.fillRect(x-9+sway,y-35,w+18,h+32);ctx.fillStyle=c3;ctx.fillRect(x+3+sway,y-39,w-6,13);ctx.fillStyle='rgba(255,255,255,.11)';ctx.fillRect(x-2+sway,y-28,14,5);ctx.globalAlpha=.45;ctx.fillStyle=dark?'#5f7470':'#7da369';ctx.fillRect(x-10+sway,y-17,9,4);ctx.fillRect(x+w-2+sway,y-9,7,3);ctx.globalAlpha=1;
      }else if(o.type==='building'){
        ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(x+10,y+h,w,12);ctx.fillStyle=o.damaged?'#6b5c56':'#827164';ctx.fillRect(x,y+48,w,h-48);ctx.fillStyle=o.roof||'#654a47';ctx.beginPath();ctx.moveTo(x-18,y+55);ctx.lineTo(x+w/2,y);ctx.lineTo(x+w+18,y+55);ctx.closePath();ctx.fill();ctx.fillStyle=this.tint(o.roof||'#654a47',20);ctx.fillRect(x+15,y+47,w-30,8);
        ctx.fillStyle='#251b22';ctx.fillRect(x+w/2-22,y+h-58,44,58);ctx.fillStyle='#b27b48';ctx.fillRect(x+w/2+13,y+h-31,4,4);
        for(let ix=45;ix<w-35;ix+=90){ctx.fillStyle='#392f36';ctx.fillRect(x+ix,y+90,32,34);ctx.shadowBlur=8;ctx.shadowColor='rgba(235,190,108,.35)';ctx.fillStyle=o.damaged?'#61727a':'#8cadad';ctx.fillRect(x+ix+5,y+95,22,19);ctx.shadowBlur=0;ctx.fillStyle='#d8c88b';ctx.fillRect(x+ix+15,y+95,2,19);}
        if(o.damaged){ctx.fillStyle='#1a141a';ctx.fillRect(x+w*.7,y+10,30,38);ctx.fillRect(x+w*.77,y+34,42,18);}
      }else if(o.type==='keep'){
        ctx.fillStyle='#77737a';ctx.fillRect(x,y+35,w,h-35);ctx.fillStyle='#3b3440';ctx.fillRect(x+w/2-26,y+h-70,52,70);for(let ix=0;ix<w;ix+=42){ctx.fillStyle='#88838a';ctx.fillRect(x+ix,y,27,48);}ctx.fillStyle='#504851';ctx.fillRect(x+25,y+70,w-50,12);
      }else if(['wall','castleWall','fortressWall'].includes(o.type)){
        ctx.fillStyle=o.type==='fortressWall'?'#392044':'#6e6b6b';ctx.fillRect(x,y,w,h);ctx.fillStyle=o.type==='fortressWall'?'#7f3e83':'#8b8780';for(let ix=0;ix<w;ix+=32)for(let iy=0;iy<h;iy+=18)ctx.fillRect(x+ix+(iy%36?16:0),y+iy,Math.min(28,w-ix),3);
      }else if(o.type==='cliff'||o.type==='voidEdge'||o.type==='caveWall'){
        ctx.fillStyle=o.type==='voidEdge'?'#0d0714':o.type==='caveWall'?'#211d2b':'#26372c';ctx.fillRect(x,y,w,h);ctx.fillStyle=o.type==='voidEdge'?'#a341bd':o.type==='caveWall'?'#54475e':'#4d6750';ctx.fillRect(x,y,w,8);
      }else if(['water','poisonPool','chaosLava','chaosRiver'].includes(o.type)){
        const colors=o.type==='water'?['#27586a','#4e8290']:o.type==='poisonPool'?['#375b40','#71a94e']:o.type==='chaosLava'?['#54265f','#bc4db4']:['#41134f','#ba3acb'];ctx.fillStyle=colors[0];ctx.fillRect(x,y,w,h);ctx.fillStyle=colors[1];const wave=Math.round(Math.sin(this.game.elapsed*2+y*.03)*8);for(let iy=8;iy<h;iy+=18)for(let ix=(iy%36)+wave;ix<w;ix+=45)ctx.fillRect(x+ix,y+iy,24,3);ctx.globalAlpha=.18;ctx.fillStyle='#d9f2e8';for(let ix=10;ix<w;ix+=64)ctx.fillRect(x+ix-wave*.5,y+5+(ix%3)*9,13,2);ctx.globalAlpha=1;
      }else if(o.type==='ruin'){
        ctx.fillStyle='#625f5d';ctx.fillRect(x,y+h-35,w,35);for(let ix=10;ix<w;ix+=50){ctx.fillRect(x+ix,y+20+(ix%3)*8,18,h-30);ctx.fillStyle='#858078';ctx.fillRect(x+ix-4,y+16+(ix%3)*8,26,7);ctx.fillStyle='#625f5d';}
      }else if(['rootWall','shadowWall','crystalWall'].includes(o.type)){
        ctx.fillStyle=o.type==='rootWall'?'#3f3424':o.type==='shadowWall'?'#211a2d':'#4d3a67';ctx.fillRect(x,y,w,h);for(let ix=8;ix<w;ix+=28){ctx.fillStyle=o.type==='crystalWall'?'#9a70bd':'rgba(0,0,0,.22)';ctx.fillRect(x+ix,y-10-(ix%3)*6,8,h+10+(ix%3)*6);}
      }else if(o.type==='caveRock'||o.type==='floatingRock'||o.type==='rock'){
        ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(x+3,y+h-2,w,7);ctx.fillStyle=o.type==='floatingRock'?'#51365c':'#514c59';ctx.fillRect(x,y+7,w,h-7);ctx.fillStyle=o.type==='floatingRock'?'#775080':'#6e6773';ctx.fillRect(x+6,y,w-12,11);
      }else if(o.type==='crystal'){
        ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x-5,y+h,w+10,6);ctx.shadowBlur=13;ctx.shadowColor='#a86fe2';ctx.fillStyle='#513968';ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x+w*.3,y);ctx.lineTo(x+w*.58,y+h);ctx.fill();ctx.fillStyle='#a978cf';ctx.beginPath();ctx.moveTo(x+w*.35,y+h);ctx.lineTo(x+w*.72,y+7);ctx.lineTo(x+w,y+h);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#f1dcff';ctx.fillRect(x+w*.42,y+8,3,h*.45);
      }else if(o.type==='crackedWall'){
        if(this.game.chestsOpened.has(o.id))return;ctx.fillStyle='#514a58';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#a88bb0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+w*.55,y);ctx.lineTo(x+w*.42,y+h*.3);ctx.lineTo(x+w*.62,y+h*.55);ctx.lineTo(x+w*.4,y+h);ctx.stroke();
      }else if(o.type==='trainingFence'){
        ctx.fillStyle='#5b452e';for(let ix=0;ix<w;ix+=28)ctx.fillRect(x+ix,y,7,h);ctx.fillRect(x,y+25,w,7);ctx.fillRect(x,y+h-30,w,7);
      }
      ctx.restore();
    }

    drawPlatform(ctx,p){
      const ox=p.axis==='x'?(p.offset||0):0,oy=p.axis==='y'?(p.offset||0):0;ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(p.x+ox+4,p.y+oy+5,p.w,p.h);ctx.fillStyle='#645d70';ctx.fillRect(p.x+ox,p.y+oy,p.w,p.h);ctx.fillStyle='#a27bb1';ctx.fillRect(p.x+ox+5,p.y+oy+4,p.w-10,5);
    }

    drawNpc(ctx,n){
      const x=Math.round(n.x),y=Math.round(n.y),bob=Math.sin(this.game.elapsed*3+n.x)*1.5;ctx.save();ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(x-12,y+10,24,7);ctx.fillStyle='#2a1d27';ctx.fillRect(x-10,y-7+bob,20,22);ctx.fillStyle=n.color||'#5b7180';ctx.fillRect(x-12,y-14+bob,24,18);ctx.fillStyle='#d4a178';ctx.fillRect(x-8,y-29+bob,16,15);ctx.fillStyle='#34232b';ctx.fillRect(x-9,y-31+bob,18,6);ctx.fillStyle='#17121a';ctx.fillRect(x-5,y-23+bob,3,3);ctx.fillRect(x+3,y-23+bob,3,3);ctx.fillStyle='#e5c781';ctx.font='7px monospace';ctx.textAlign='center';ctx.fillText(n.role,x,y+29);
      const marker=this.renderPreparedMarker(n);if(marker){ctx.fillStyle=marker==='$'?'#e2c25d':'#f3df7d';ctx.font='bold 16px monospace';ctx.fillText(marker,x,y-42+Math.sin(this.game.elapsed*4)*2);}
      ctx.restore();
    }

    drawInteractable(ctx,it){
      const x=Math.round(it.x),y=Math.round(it.y),open=this.game.chestsOpened.has(it.id);ctx.save();
      if(it.type==='chest'){
        if(open){ctx.fillStyle='#3f2e25';ctx.fillRect(x-15,y-6,30,12);ctx.fillStyle='#806039';ctx.fillRect(x-15,y-13,30,6);}
        else{ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x-18,y+8,36,7);ctx.fillStyle='#5e3e25';ctx.fillRect(x-16,y-8,32,19);ctx.fillStyle='#a77537';ctx.fillRect(x-17,y-14,34,10);ctx.fillStyle='#e2bc55';ctx.fillRect(x-3,y-5,6,9);ctx.shadowBlur=7;ctx.shadowColor='#e6bd52';ctx.strokeStyle='rgba(239,201,103,.45)';ctx.strokeRect(x-19,y-16,38,29);}
            }else if(it.type==='dummy'){
        ctx.fillStyle='#5a3f27';ctx.fillRect(x-3,y-14,6,34);ctx.fillRect(x-17,y-5,34,6);ctx.fillStyle='#a77a45';ctx.fillRect(x-11,y-29,22,17);ctx.fillStyle='#2d1d20';ctx.fillRect(x-6,y-23,3,3);ctx.fillRect(x+4,y-23,3,3);
      }else if(it.type==='switch'){
        ctx.fillStyle='#4b4253';ctx.fillRect(x-12,y-3,24,13);ctx.fillStyle=open?'#75c47b':'#c55d69';ctx.fillRect(x-4,y-12,8,11);
      }else if(it.type==='shrine'){
        ctx.fillStyle='#585b5b';ctx.fillRect(x-18,y-5,36,16);ctx.fillRect(x-11,y-29,22,25);ctx.fillStyle=open?'#a7d7cd':'#344444';ctx.fillRect(x-3,y-21,6,9);
      }else if(it.type==='crackedWall'){
        if(!open){ctx.fillStyle='#8c6f93';ctx.font='bold 15px monospace';ctx.textAlign='center';ctx.fillText('×',x,y);}
      }else if(it.type==='portal'){
        ctx.strokeStyle='#a55aca';ctx.lineWidth=6;ctx.shadowBlur=15;ctx.shadowColor='#a83ad0';ctx.beginPath();ctx.ellipse(x,y-8,18,30,0,0,TAU);ctx.stroke();ctx.fillStyle='rgba(145,62,182,.25)';ctx.fill();
      }else if(it.type==='lockedDoor'){
        ctx.fillStyle='#534651';ctx.fillRect(x-18,y-20,36,40);ctx.fillStyle='#bd9c4c';ctx.fillRect(x-3,y-4,6,8);
      }
      ctx.restore();
    }

    drawExit(ctx,ex){
      const locked=(ex.requiresBoss&&!this.game.bossesDefeated.has(ex.requiresBoss))||(ex.equipmentGate&&!this.isPrepared());ctx.save();ctx.globalAlpha=.5;ctx.fillStyle=locked?'#8f354d':'#72b978';if(ex.x<100)ctx.fillRect(ex.x+20,ex.y,7,ex.h);else ctx.fillRect(ex.x+ex.w-27,ex.y,7,ex.h);ctx.globalAlpha=1;ctx.fillStyle=locked?'#d97378':'#b9df96';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText(locked?'SEALED':ex.label,ex.x+ex.w/2,ex.y-10);ctx.restore();
    }

    drawLabel(ctx,l){ctx.save();ctx.fillStyle='rgba(13,10,15,.62)';ctx.fillRect(l.x-3,l.y-12,l.text.length*6+6,16);ctx.fillStyle='#d6c48f';ctx.font='bold 8px monospace';ctx.textAlign='left';ctx.fillText(l.text,l.x,l.y);ctx.restore();}

    drawArenaSeal(ctx,z){
      const active=this.game.boss&&this.game.boss.bossType===z.type&&!this.game.boss.dead;
      const pulse=(active ? .13 : .35)+Math.sin(this.game.elapsed*2)*(active ? .035 : .12);ctx.save();
      if(z.type==='velymoor'){
        const portal=ctx.createRadialGradient(z.x,z.y,24,z.x,z.y,145);portal.addColorStop(0,active?'rgba(100,23,123,.08)':'rgba(126,31,149,.2)');portal.addColorStop(.62,active?'rgba(84,18,104,.055)':'rgba(103,27,128,.12)');portal.addColorStop(1,'rgba(50,8,65,0)');ctx.fillStyle=portal;ctx.beginPath();ctx.arc(z.x,z.y,145,0,TAU);ctx.fill();
        ctx.globalAlpha=active ? .16 : .3;ctx.strokeStyle='#9e3cb7';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(z.x,z.y,104,45,this.game.elapsed*.12,0,TAU);ctx.stroke();
      }
      ctx.globalAlpha=pulse;ctx.strokeStyle=this.currentId==='greenhaven'?'#809d4c':this.currentId==='darkForest'?'#6c5293':this.currentId==='chaosCaves'?'#b168c2':'#d33ad2';ctx.lineWidth=active?2:4;ctx.setLineDash(active?[16,18]:[12,10]);ctx.beginPath();ctx.arc(z.x,z.y,z.radius*.82,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    }

    makeLightning(){
      let x=100+Math.random()*760,y=0;const pts=[[x,y]];for(let i=0;i<8;i++){x+=(Math.random()-.5)*65;y+=35+Math.random()*35;pts.push([x,y]);}return pts;
    }

    drawLighting(ctx,camera){
      ctx.save();
      if(this.currentId==='darkForest'){
        ctx.fillStyle='rgba(7,13,18,.34)';ctx.fillRect(0,0,960,540);
        const g=ctx.createRadialGradient(480,270,70,480,270,410);g.addColorStop(0,'rgba(40,57,58,0)');g.addColorStop(1,'rgba(4,9,13,.42)');ctx.fillStyle=g;ctx.fillRect(0,0,960,540);
        ctx.globalAlpha=.14;ctx.fillStyle='#b3d2ca';for(let i=0;i<9;i++){const x=((i*143+this.game.elapsed*8)%1100)-70,y=80+(i*71)%410;ctx.beginPath();ctx.ellipse(x,y,120,27,0,0,TAU);ctx.fill();}
      }else if(this.currentId==='chaosCaves'){
        ctx.fillStyle='rgba(16,10,24,.22)';ctx.fillRect(0,0,960,540);ctx.globalCompositeOperation='screen';for(let i=0;i<5;i++){const x=(i*257-camera.x*.1)%1100,y=120+(i*89)%350;const g=ctx.createRadialGradient(x,y,0,x,y,85);g.addColorStop(0,'rgba(164,102,204,.13)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-90,y-90,180,180);}
      }else if(this.currentId==='brokenRealm'){
        const finalBoss=this.game.boss&&this.game.boss.bossType==='velymoor'&&!this.game.boss.dead;
        const overload=finalBoss?(this.game.boss.overloadCharge||0):0;
        ctx.fillStyle=`rgba(20,5,28,${.18+(finalBoss&&this.game.boss.finalPhase ? .12 : 0)+overload*.28})`;ctx.fillRect(0,0,960,540);if(this.lightningLines.length&&this.lightning<(finalBoss ? .46 : .28)){ctx.strokeStyle=`rgba(213,157,255,${.8+overload*.18})`;ctx.lineWidth=finalBoss?3:2;ctx.beginPath();this.lightningLines.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();}
        if(finalBoss){ctx.globalCompositeOperation='screen';const chaosGlow=ctx.createRadialGradient(480,275,30,480,275,430);chaosGlow.addColorStop(0,`rgba(191,61,213,${.055+overload*.12})`);chaosGlow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=chaosGlow;ctx.fillRect(0,0,960,540);}
      }else if(this.currentId==='greenhaven'){
        const g=ctx.createLinearGradient(0,0,0,540);g.addColorStop(0,'rgba(255,235,157,.06)');g.addColorStop(1,'rgba(15,43,21,.08)');ctx.fillStyle=g;ctx.fillRect(0,0,960,540);
        ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<5;i++){ctx.globalAlpha=.025+.012*Math.sin(this.game.elapsed+i);ctx.fillStyle='#fff2b0';ctx.beginPath();ctx.moveTo(80+i*210,0);ctx.lineTo(190+i*210,0);ctx.lineTo(310+i*210,540);ctx.lineTo(175+i*210,540);ctx.closePath();ctx.fill();}ctx.restore();
      }else if(this.currentId==='elaria'){
        const g=ctx.createLinearGradient(0,0,0,540);g.addColorStop(0,'rgba(255,226,151,.055)');g.addColorStop(.7,'rgba(255,226,151,0)');g.addColorStop(1,'rgba(24,31,34,.1)');ctx.fillStyle=g;ctx.fillRect(0,0,960,540);
        ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.04;ctx.fillStyle='#ffe5a1';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(70+i*340,0);ctx.lineTo(150+i*340,0);ctx.lineTo(330+i*340,540);ctx.lineTo(230+i*340,540);ctx.closePath();ctx.fill();}ctx.restore();
      }
      ctx.restore();
    }

    tint(hex,amount){
      const n=parseInt(hex.slice(1),16),r=Math.max(0,Math.min(255,(n>>16)+amount)),g=Math.max(0,Math.min(255,((n>>8)&255)+amount)),b=Math.max(0,Math.min(255,(n&255)+amount));return `rgb(${r},${g},${b})`;
    }
  }

  E.WorldManager=WorldManager;
})();
