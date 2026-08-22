(function () {
  'use strict';

  const E = window.Elaria = window.Elaria || {};

  const SKILLS = [
    { id:'blade_edge', branch:'Blade', name:'Keen Edge', cost:1, description:'Weapon damage +3.', effects:{damage:3} },
    { id:'blade_momentum', branch:'Blade', name:'Momentum', cost:1, requires:['blade_edge'], description:'Critical chance +4%.', effects:{critChance:.04} },
    { id:'blade_flow', branch:'Blade', name:'Flow State', cost:2, requires:['blade_momentum'], description:'Longer combo window and stronger third strike.', effects:{comboWindow:.18,comboDamage:.16} },
    { id:'blade_executioner', branch:'Blade', name:'Chaos Breaker', cost:3, requires:['blade_flow'], description:'Deal 18% more damage to wounded enemies and bosses.', effects:{executeDamage:.18} },
    { id:'ward_vitality', branch:'Ward', name:'Elarian Vitality', cost:1, description:'Maximum health +18.', effects:{maxHealth:18} },
    { id:'ward_iron', branch:'Ward', name:'Iron Resolve', cost:1, requires:['ward_vitality'], description:'Defense +3.', effects:{defense:3} },
    { id:'ward_step', branch:'Ward', name:'Perfect Step', cost:2, requires:['ward_iron'], description:'Widens the perfect-dodge window and restores a little stamina.', effects:{perfectDodgeWindow:.09} },
    { id:'ward_lastlight', branch:'Ward', name:'Last Light', cost:3, requires:['ward_step'], description:'Survive one fatal hit per sanctuary visit.', effects:{lastLight:1} },
    { id:'path_fleet', branch:'Wayfarer', name:'Fleetfoot', cost:1, description:'Movement speed +12.', effects:{moveSpeed:12} },
    { id:'path_scavenger', branch:'Wayfarer', name:'Scavenger', cost:1, requires:['path_fleet'], description:'Gold and material finds are improved.', effects:{goldBonus:.12,dropBonus:.1} },
    { id:'path_herbalist', branch:'Wayfarer', name:'Herbalist', cost:2, requires:['path_scavenger'], description:'Potions restore 25% more health.', effects:{potionStrength:.25} },
    { id:'path_cartographer', branch:'Wayfarer', name:'Cartographer', cost:3, requires:['path_herbalist'], description:'Reveals hidden lore, chests, and secret paths on the minimap.', effects:{revealSecrets:1} }
  ];

  const RECIPES = [
    { id:'potion_brew', station:'camp', name:'Brew Health Potion', description:'Turn restorative gel into a travel potion.', ingredients:{slime_gel:2}, output:{id:'health_potion',qty:1} },
    { id:'greater_brew', station:'camp', name:'Greater Health Potion', description:'A concentrated restorative for dangerous roads.', ingredients:{health_potion:2,living_bark:1}, output:{id:'greater_health_potion',qty:1} },
    { id:'antidote_brew', station:'camp', name:'Greenhaven Antidote', description:'Neutralizes venom and swamp toxins.', ingredients:{slime_gel:1,venom_sac:1}, output:{id:'antidote',qty:2} },
    { id:'iron_forging', station:'forge', name:'Forge Iron Sword', description:'Restore a damaged blade with Elarian steel.', ingredients:{rusty_sword:1,goblin_cloth:2}, gold:85, output:{id:'iron_sword',qty:1} },
    { id:'ranger_stitching', station:'forge', name:'Stitch Ranger Armor', description:'Light armor made for the Greenhaven trails.', ingredients:{leather_armor:1,goblin_cloth:5,living_bark:2}, gold:140, output:{id:'ranger_armor',qty:1} },
    { id:'shadow_temper', station:'forge', name:'Temper Nyxfang Edge', description:'Bind shadow essence into a balanced blade.', ingredients:{forest_blade:1,shadow_essence:3,wolf_fang:2}, gold:260, output:{id:'shadow_fang',qty:1} },
    { id:'crystal_resonance', station:'forge', name:'Crystal Resonator', description:'Tune a weapon to the ancient crystal song.', ingredients:{shadow_fang:1,crystal_shard:6,golem_core:1}, gold:420, output:{id:'crystal_sword',qty:1} },
    { id:'battle_tonic', station:'camp', name:'Cook Battle Tonic', description:'A warming meal distilled into a combat tonic.', ingredients:{wolf_pelt:1,living_root:2,chaos_dust:1}, output:{id:'battle_tonic',qty:1} },
    { id:'royal_elixir', station:'camp', name:'Royal Elixir', description:'An old royal recipe for impossible battles.', ingredients:{greater_health_potion:2,crystal_shard:2,royal_sigil:1}, output:{id:'royal_elixir',qty:1} }
  ];

  const ACHIEVEMENTS = [
    {id:'first_steps',name:'Beyond the Walls',description:'Leave Elaria for the first time.',test:p=>p.worldDiscoveries.has('greenhaven')},
    {id:'coin_purse',name:'A Weighty Purse',description:'Collect 250 gold.',test:(p,g)=>g.stats.totalGold>=250},
    {id:'monster_hunter',name:'Monster Hunter',description:'Defeat 50 enemies.',test:(p,g)=>g.stats.enemiesDefeated>=50},
    {id:'guardian_fallen',name:'Ancient No More',description:'Defeat The Creaking One.',test:(p,g)=>g.bossesDefeated.has('creakingOne')},
    {id:'perfect_step',name:'Between Heartbeats',description:'Perform a perfect dodge.',test:(p,g)=>g.stats.perfectDodges>=1},
    {id:'artisan',name:'Hands of the Old World',description:'Craft five items.',test:(p,g)=>g.stats.itemsCrafted>=5},
    {id:'treasure_seeker',name:'No Stone Unturned',description:'Open ten treasure chests.',test:(p,g)=>g.stats.chestsOpened>=10},
    {id:'lorekeeper',name:'Lorekeeper',description:'Recover six lore entries.',test:p=>p.collectibles.size>=6},
    {id:'seasoned',name:'Seasoned Warrior',description:'Reach level 10.',test:p=>p.level>=10},
    {id:'all_guardians',name:'Breaker of Chains',description:'Defeat every corrupted guardian.',test:(p,g)=>g.bossesDefeated.size>=4},
    {id:'worldwalker',name:'Worldwalker',description:'Discover every main realm.',test:p=>p.worldDiscoveries.size>=5},
    {id:'elarias_dawn',name:"Elaria's Dawn",description:'Defeat Velymoor and shatter the Orb.',test:(p,g)=>g.bossesDefeated.has('velymoor')}
  ];

  const LORE = {
    maelor_journal:{title:"Maelor's First Journal",world:'elaria',text:'Long before he became Elaria’s court wizard, Maelor studied the sky-language of the vanished Asteri. He found one warning repeated in every ruin: power without memory becomes chaos.'},
    wall_foundation:{title:'The Foundation Stone',world:'elaria',text:'Elaria survived because its oldest walls were raised over an Asteri sanctuary. The buried wards did not stop the Orb, but they bent its first terrible wave.'},
    heartwood_tablet:{title:'Tablet of the Heartwood',world:'greenhaven',text:'The Creaking One once carried seeds between kingdoms. Velymoor did not create its rage; he amplified the grief of every forest burned by war.'},
    ranger_letter:{title:"A Ranger's Last Letter",world:'greenhaven',text:'The road under the waterfall leads to a grove the goblins cannot see. I left our medicine there. If anyone finds this, tell Tarin we held the eastern bridge.'},
    nyx_origin:{title:'Moon-Wolf Chronicle',world:'darkForest',text:'Nyxfang guarded travelers during moonless nights. Shadow magic severed the wolf from its own reflection, and it has hunted that missing half ever since.'},
    velymoor_youth:{title:"Velymoor's Field Notes",world:'darkForest',text:'The young scholar Velymoor wrote of ending famine and sickness. Each failure made mercy feel more like weakness. The Orb answered precisely that wound.'},
    asteri_ruin:{title:'The Asteri Equation',world:'darkForest',text:'The ancient civilization did not forge the Orb as a weapon. It was a vessel meant to absorb catastrophe. It broke when asked to contain the sorrow of an entire age.'},
    miner_log:{title:'Caster’s Mining Log',world:'chaosCaves',text:'The crystals sing in five voices. Strike the third after the first and the sealed treasure rail wakes. Gorath answers with a sixth voice from somewhere below.'},
    titan_inscription:{title:'Inscription of Gorath',world:'chaosCaves',text:'Gorath was built to hold the caverns when the Asteri city rose into the sky. Its armor is duty made solid; break the resonant anchors and the titan remembers how to rest.'},
    orb_treatise:{title:'Treatise on the Orb',world:'chaosCaves',text:'Chaos does not invent monsters. It gives bodies to buried fears, old hungers, and abandoned promises. Destroying the Orb will release what remains within it.'},
    broken_crown:{title:'Crown of the First Kingdom',world:'brokenRealm',text:'The first kingdom surrendered without battle. Its king believed service would spare his people. Velymoor spared their bodies and erased their names.'},
    destiny_fragment:{title:'The Last Prophecy',world:'brokenRealm',text:'The chosen hand bears no royal blood and speaks no ancient spell. Fate chose a humble life because only one who knows the worth of ordinary mornings can restore them.'}
  };

  function safeSet(value) { return new Set(Array.isArray(value) ? value.map(String) : []); }
  function finite(value,fallback,min,max){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}

  class ProgressionSystem {
    constructor(game,data){
      this.game=game;
      this.level=1;this.xp=0;this.skillPoints=0;
      this.skills=new Set();this.achievements=new Set();this.collectibles=new Set();
      this.worldDiscoveries=new Set(['elaria']);this.fastTravelPoints=new Set(['elaria']);
      this.discoveries=new Set();
      this.bestiary={};this.upgrades={};this.enchantments={};this.favoriteItems=new Set();
      this.crafted={};this.resources={fish:0,ore:0,meals:0};this.resourceCooldowns={};
      this.lastAchievementCheck=0;this.lastCompletion=0;this._completionAt=0;
      if(data)this.load(data);
    }

    xpNeeded(level){return Math.round(70+Math.pow(Math.max(1,level),1.55)*32);}
    gainXP(amount,reason){
      amount=Math.max(0,Math.round(Number(amount)||0));if(!amount)return 0;
      this.xp+=amount;
      this.game.particles&&this.game.player&&this.game.particles.text(this.game.player.x,this.game.player.y-38,`+${amount} XP`,'#8edff1',11,.8);
      let levels=0;
      while(this.xp>=this.xpNeeded(this.level)&&this.level<50){this.xp-=this.xpNeeded(this.level);this.level++;this.skillPoints++;levels++;}
      if(levels){
        this.game.ui&&this.game.ui.toast(`Level ${this.level}! Skill point earned.`,'rare');
        this.game.audio&&this.game.audio.play('levelUp');
        this.game.flash&&this.game.flash('#9de6ff',.22);
        if(this.game.player){this.game.player.baseStats.maxHealth+=4*levels;this.game.player.baseStats.damage+=1*levels;this.game.player.recalcStats&&this.game.player.recalcStats(true);this.game.player.heal&&this.game.player.heal(this.game.player.maxHealth);}
      }
      return levels;
    }

    hasSkill(id){return this.skills.has(id);}
    unlockSkill(id){
      const skill=SKILLS.find(s=>s.id===id);if(!skill||this.skills.has(id))return false;
      if((skill.requires||[]).some(req=>!this.skills.has(req))){this.game.ui&&this.game.ui.toast('Unlock the previous skill first.','danger');return false;}
      if(this.skillPoints<skill.cost){this.game.ui&&this.game.ui.toast('Not enough skill points.','danger');return false;}
      this.skillPoints-=skill.cost;this.skills.add(id);this.game.audio&&this.game.audio.play('equip');
      this.game.ui&&this.game.ui.toast(`${skill.name} unlocked.`,'rare');
      this.game.player&&this.game.player.recalcStats&&this.game.player.recalcStats(true);
      this.game.saveNow&&this.game.saveNow('skill');return true;
    }

    getBonuses(){
      const out={damage:0,defense:0,maxHealth:0,critChance:0,moveSpeed:0,potionStrength:0,comboWindow:0,comboDamage:0,executeDamage:0,perfectDodgeWindow:0,goldBonus:0,dropBonus:0,revealSecrets:0,lastLight:0};
      for(const skill of SKILLS)if(this.skills.has(skill.id))for(const [key,value] of Object.entries(skill.effects||{}))out[key]=(out[key]||0)+value;
      const equipment=this.game.inventory&&this.game.inventory.equipment||{};
      for(const uid of Object.values(equipment)){
        if(!uid)continue;const level=this.upgrades[uid]||0,item=this.game.inventory.get&&this.game.inventory.get(uid),def=item&&E.ITEMS[item.id];
        if(level&&def){if(def.type==='weapon')out.damage+=level*2;else if(['armor','helmet','boots'].includes(def.type))out.defense+=level;else if(def.type==='amulet')out.maxHealth+=level*3;}
        const enchant=this.enchantments[uid];if(enchant==='flame')out.damage+=2;if(enchant==='ward')out.defense+=2;if(enchant==='swift')out.moveSpeed+=6;
      }
      return out;
    }

    craft(recipeId){
      const recipe=RECIPES.find(r=>r.id===recipeId),inv=this.game.inventory,p=this.game.player;if(!recipe||!inv||!p)return false;
      const missing=Object.entries(recipe.ingredients).filter(([id,qty])=>inv.count(id)<qty);
      if(missing.length){this.game.ui&&this.game.ui.toast(`Missing ${E.ITEMS[missing[0][0]]?E.ITEMS[missing[0][0]].name:missing[0][0]}.`,'danger');return false;}
      if((p.gold||0)<(recipe.gold||0)){this.game.ui&&this.game.ui.toast('Not enough gold for the forge.','danger');return false;}
      for(const [id,qty] of Object.entries(recipe.ingredients))inv.remove(id,qty);
      p.gold-=recipe.gold||0;inv.add(recipe.output.id,recipe.output.qty||1);
      this.crafted[recipeId]=(this.crafted[recipeId]||0)+1;this.game.stats.itemsCrafted=(this.game.stats.itemsCrafted||0)+(recipe.output.qty||1);
      if(recipe.station==='camp'&&['battle_tonic','royal_elixir'].includes(recipe.id))this.resources.meals++;
      this.gainXP(18,'craft');this.game.audio&&this.game.audio.play('craft');this.game.ui&&this.game.ui.toast(`Crafted ${E.ITEMS[recipe.output.id].name}.`,'success');
      this.game.particles&&this.game.player&&this.game.particles.burst(this.game.player.x,this.game.player.y,'#f2c968',18,75,3,.65,{kind:'spark',glow:5});
      this.checkAchievements(true);this.game.saveNow&&this.game.saveNow('craft');return true;
    }

    upgradeItem(uid){
      const inv=this.game.inventory,item=inv&&inv.get(uid),def=item&&E.ITEMS[item.id];if(!item||!def||!def.slot)return false;
      const level=this.upgrades[uid]||0;if(level>=5){this.game.ui&&this.game.ui.toast('This item is fully upgraded.');return false;}
      const price=60+(level+1)*70;const material=level<2?'goblin_cloth':level<4?'crystal_shard':'chaos_fragment';const qty=level<2?2:level<4?3:1;
      if(this.game.player.gold<price||inv.count(material)<qty){this.game.ui&&this.game.ui.toast(`Upgrade needs ${price} gold and ${qty} ${E.ITEMS[material].name}.`,'danger');return false;}
      this.game.player.gold-=price;inv.remove(material,qty);this.upgrades[uid]=level+1;this.game.player.recalcStats&&this.game.player.recalcStats(true);
      this.game.ui&&this.game.ui.toast(`${def.name} upgraded to +${level+1}.`,'rare');this.game.audio&&this.game.audio.play('forge');this.game.saveNow&&this.game.saveNow('upgrade');return true;
    }

    enchantItem(uid,type){
      const allowed=['flame','ward','swift'];const inv=this.game.inventory,item=inv&&inv.get(uid);if(!item||!allowed.includes(type))return false;
      if(inv.count('chaos_dust')<2){this.game.ui&&this.game.ui.toast('Enchanting requires 2 Chaos Dust.','danger');return false;}
      if(this.enchantments[uid]===type){this.game.ui&&this.game.ui.toast(`That item already carries the ${type} enchantment.`);return false;}
      inv.remove('chaos_dust',2);this.enchantments[uid]=type;this.game.player.recalcStats&&this.game.player.recalcStats(true);this.game.ui&&this.game.ui.toast(`${E.ITEMS[item.id].name} gained the ${type} enchantment.`,'rare');this.game.audio&&this.game.audio.play('forge');this.game.saveNow&&this.game.saveNow('enchant');return true;
    }

    toggleFavorite(uid){if(this.favoriteItems.has(uid))this.favoriteItems.delete(uid);else this.favoriteItems.add(uid);return this.favoriteItems.has(uid);}

    recordEnemy(enemy){
      if(!enemy)return;const id=enemy.type||'unknown',entry=this.bestiary[id]||(this.bestiary[id]={seen:true,kills:0});entry.seen=true;entry.kills++;
      const xp=Math.max(3,Math.round((enemy.maxHealth||30)/18+(enemy.damage||5)/3));this.gainXP(enemy.elite?xp*2:xp,'enemy');this.checkAchievements(false);
    }
    recordBoss(id){this.gainXP(id==='velymoor'?650:260,'boss');this.discover(`boss:${id}`);this.checkAchievements(true);}
    discover(id){if(!id)return false;const value=String(id),worlds=new Set(['elaria','greenhaven','darkForest','dark_forest','chaosCaves','chaos_caves','brokenRealm','broken_realm']);const target=worlds.has(value)?this.worldDiscoveries:this.discoveries;const before=target.size;target.add(value);if(target.size>before){this.gainXP(12,'discovery');return true;}return false;}
    unlockTravel(id){if(!id)return false;const before=this.fastTravelPoints.size;this.fastTravelPoints.add(String(id));if(this.fastTravelPoints.size>before)this.game.ui&&this.game.ui.toast('Fast travel point awakened.','success');return this.fastTravelPoints.size>before;}
    fastTravel(worldId){
      const aliases={dark_forest:'darkForest',chaos_caves:'chaosCaves',broken_realm:'brokenRealm'};const id=aliases[worldId]||worldId;
      const player=this.game.player,inCombat=!!this.game.boss||(player&&(this.game.enemies||[]).some(enemy=>enemy&&!enemy.dead&&!enemy.dying&&Math.hypot(enemy.x-player.x,enemy.y-player.y)<300));
      if(inCombat){this.game.ui&&this.game.ui.toast('The waystones cannot answer during combat.','danger');return false;}
      if(!this.fastTravelPoints.has(id)&&!this.fastTravelPoints.has(worldId)){this.game.ui&&this.game.ui.toast('That waystone has not been awakened.','danger');return false;}
      const def=E.WORLD_DEFS[id];if(!def)return false;if(this.game.ui){this.game.ui.closePanels&&this.game.ui.closePanels();this.game.ui.returnToPause=false;}this.game.transitionTo(id,{...def.spawn});return true;
    }
    collectLore(id){
      if(!LORE[id]||this.collectibles.has(id))return false;this.collectibles.add(id);this.gainXP(30,'lore');this.game.ui&&this.game.ui.toast(`Lore recovered: ${LORE[id].title}`,'rare');this.game.audio&&this.game.audio.play('secret');this.checkAchievements(true);return true;
    }

    gather(kind,id){
      const key=String(id||kind),now=Date.now(),ready=finite(this.resourceCooldowns[key],0,0,Number.MAX_SAFE_INTEGER);
      if(ready>now){const seconds=Math.max(1,Math.ceil((ready-now)/1000));this.game.ui&&this.game.ui.toast(`${kind==='mine'?'This vein':'The water'} will recover in ${seconds}s.`);return false;}
      if(kind==='mine'){const choices=['crystal_shard','chaos_ore','golem_core'];const item=choices[Math.min(choices.length-1,Math.floor(Math.random()*choices.length))];this.game.inventory.add(item,1);this.resources.ore++;this.game.stats.oreMined=(this.game.stats.oreMined||0)+1;this.game.ui&&this.game.ui.toast(`Mined ${E.ITEMS[item].name}.`,'success');this.resourceCooldowns[key]=now+120000;}
      if(kind==='fish'){const roll=Math.random(),item=roll>.88?'royal_sigil':roll>.5?'slime_gel':'health_potion';this.game.inventory.add(item,1);this.resources.fish++;this.game.stats.fishCaught=(this.game.stats.fishCaught||0)+1;this.game.ui&&this.game.ui.toast(`Caught: ${E.ITEMS[item].name}.`,'success');this.resourceCooldowns[key]=now+12000;}
      this.gainXP(8,kind);this.game.saveNow&&this.game.saveNow(kind);return true;
    }

    checkAchievements(force){
      const now=Date.now();if(!force&&now-this.lastAchievementCheck<900)return;this.lastAchievementCheck=now;
      for(const achievement of ACHIEVEMENTS){if(this.achievements.has(achievement.id))continue;let won=false;try{won=!!achievement.test(this,this.game);}catch(_){won=false;}if(won){this.achievements.add(achievement.id);this.skillPoints++;this.game.ui&&this.game.ui.toast(`Achievement: ${achievement.name}`,'rare');this.game.audio&&this.game.audio.play('achievement');}}
    }

    completion(){
      const now=Date.now();if(this._completionAt&&now-this._completionAt<400)return this.lastCompletion;this._completionAt=now;
      const worlds=Math.min(5,this.worldDiscoveries.size)/5,bosses=Math.min(4,this.game.bossesDefeated.size)/4,lore=this.collectibles.size/Object.keys(LORE).length,ach=this.achievements.size/ACHIEVEMENTS.length;
      const questTotal=Math.max(1,Object.keys(E.QUEST_DEFS||{}).length),quests=Math.min(questTotal,this.game.quests&&this.game.quests.getCompletedIds?this.game.quests.getCompletedIds().length:0)/questTotal;
      const enemyTotal=Math.max(1,Object.keys(E.ENEMY_TYPES||{}).length),seen=Object.values(this.bestiary).filter(entry=>entry&&entry.seen).length/enemyTotal;
      const skills=this.skills.size/SKILLS.length,recipes=Object.keys(this.crafted).filter(id=>this.crafted[id]>0).length/RECIPES.length;
      const chestIds=[];for(const world of Object.values(E.WORLD_DEFS||{}))for(const it of world.interactables||[])if(it.type==='chest')chestIds.push(it.id);const chests=chestIds.length?chestIds.filter(id=>this.game.chestsOpened.has(id)).length/chestIds.length:0;
      this.lastCompletion=Math.round((worlds*.15+bosses*.25+lore*.15+ach*.12+quests*.1+seen*.08+skills*.06+recipes*.04+chests*.05)*100);return this.lastCompletion;
    }

    bestiaryEntries(){return Object.keys(E.ENEMY_TYPES||{}).map(id=>({id,definition:E.ENEMY_TYPES[id],...(this.bestiary[id]||{seen:false,kills:0})}));}
    loreEntries(){return Object.entries(LORE).map(([id,entry])=>({id,...entry,found:this.collectibles.has(id)}));}

    serialize(){const now=Date.now(),cooldowns={};for(const [id,ready] of Object.entries(this.resourceCooldowns))if(ready>now)cooldowns[id]=Math.min(300000,Math.max(0,ready-now));return{version:2,level:this.level,xp:this.xp,skillPoints:this.skillPoints,skills:[...this.skills],achievements:[...this.achievements],collectibles:[...this.collectibles],worldDiscoveries:[...this.worldDiscoveries],discoveries:[...this.discoveries],fastTravelPoints:[...this.fastTravelPoints],bestiary:this.bestiary,upgrades:this.upgrades,enchantments:this.enchantments,favoriteItems:[...this.favoriteItems],crafted:this.crafted,resources:this.resources,resourceCooldowns:cooldowns};}
    load(data){
      if(!data||typeof data!=='object')return false;this.level=Math.floor(finite(data.level,1,1,50));this.xp=Math.floor(finite(data.xp,0,0,999999));this.skillPoints=Math.floor(finite(data.skillPoints,0,0,99));
      this.skills=safeSet(data.skills);this.achievements=safeSet(data.achievements);this.collectibles=safeSet(data.collectibles);this.worldDiscoveries=safeSet(data.worldDiscoveries);if(!this.worldDiscoveries.size)this.worldDiscoveries.add('elaria');this.fastTravelPoints=safeSet(data.fastTravelPoints);if(!this.fastTravelPoints.size)this.fastTravelPoints.add('elaria');
      this.discoveries=safeSet(data.discoveries);
      this.favoriteItems=safeSet(data.favoriteItems);this.bestiary=data.bestiary&&typeof data.bestiary==='object'?data.bestiary:{};this.upgrades=data.upgrades&&typeof data.upgrades==='object'?data.upgrades:{};this.enchantments=data.enchantments&&typeof data.enchantments==='object'?data.enchantments:{};this.crafted=data.crafted&&typeof data.crafted==='object'?data.crafted:{};this.resources={fish:0,ore:0,meals:0,...(data.resources||{})};this.resourceCooldowns={};if(data.resourceCooldowns&&typeof data.resourceCooldowns==='object'){const now=Date.now();for(const [id,remaining] of Object.entries(data.resourceCooldowns))this.resourceCooldowns[id]=now+finite(remaining,0,0,300000);}return true;
    }
  }

  function addWorldContent(){
    if(!E.WORLD_DEFS)return;
    const content={
      elaria:[
        {x:690,y:470,type:'lore',id:'maelor_journal',label:"Maelor's Journal"},{x:640,y:780,type:'lore',id:'wall_foundation',label:'Foundation Inscription'},
        {x:1270,y:570,type:'forge',id:'elaria_forge',label:'Bram’s Forge'},{x:1575,y:1090,type:'camp',id:'elaria_kitchen',label:'Cooking Fire'},{x:895,y:820,type:'waystone',id:'elaria',label:'Elaria Waystone'}
      ],
      greenhaven:[
        {x:815,y:315,type:'fish',id:'green_lake',label:'Fish at the Lily Lake'},{x:1450,y:450,type:'lore',id:'heartwood_tablet',label:'Heartwood Tablet'},
        {x:1200,y:1195,type:'lore',id:'ranger_letter',label:"Ranger's Letter"},{x:930,y:790,type:'waystone',id:'greenhaven',label:'Greenhaven Waystone'},{x:1640,y:260,type:'secret',id:'waterfall_cave',label:'Hidden Waterfall Cave'}
      ],
      darkForest:[
        {x:1120,y:745,type:'waystone',id:'darkForest',label:'Moonlit Waystone'},{x:720,y:380,type:'lore',id:'nyx_origin',label:'Moon-Wolf Chronicle'},
        {x:1350,y:680,type:'lore',id:'velymoor_youth',label:"Velymoor's Field Notes"},{x:1540,y:1160,type:'lore',id:'asteri_ruin',label:'Asteri Equation'},{x:620,y:360,type:'fish',id:'moon_lake',label:'Fish in the Moon Lake'}
      ],
      chaosCaves:[
        {x:1040,y:660,type:'waystone',id:'chaosCaves',label:'Crystal Waystone'},{x:760,y:980,type:'lore',id:'miner_log',label:'Mining Log'},
        {x:1660,y:390,type:'lore',id:'titan_inscription',label:'Titan Inscription'},{x:1460,y:1210,type:'lore',id:'orb_treatise',label:'Orb Treatise'},
        {x:570,y:520,type:'mine',id:'ore_1',label:'Mine Resonant Ore'},{x:1290,y:590,type:'mine',id:'ore_2',label:'Mine Chaos Ore'},{x:1080,y:760,type:'forge',id:'cave_forge',label:'Ancient Crystal Forge'},
        {x:920,y:975,type:'chest',id:'minecart_treasure',label:'Sealed Rail Treasury',requires:'cart_switch',rewards:{gold:75,items:[['chaos_ore',3],['royal_sigil',1]]}}
      ],
      brokenRealm:[
        {x:1370,y:720,type:'waystone',id:'brokenRealm',label:'Last Waystone'},{x:870,y:1050,type:'lore',id:'broken_crown',label:'Broken Crown'},
        {x:1550,y:410,type:'lore',id:'destiny_fragment',label:'Last Prophecy'},{x:1220,y:1160,type:'collectible',id:'chaos_memory',label:'Memory of a Lost Kingdom'}
      ]
    };
    for(const [worldId,items] of Object.entries(content)){
      const list=E.WORLD_DEFS[worldId]&&E.WORLD_DEFS[worldId].interactables;if(!list)continue;
      for(const item of items)if(!list.some(existing=>existing.id===item.id&&existing.type===item.type))list.push(item);
    }
    const green=E.WORLD_DEFS.greenhaven;
    if(green&&green.height<1900){
      green.height=1900;
      green.paths.push({x:1580,y:1510,w:700,h:325,type:'arena'});
      green.obstacles.push({x:0,y:1835,w:2400,h:65,type:'cliff'},{x:1510,y:1500,w:45,h:335,type:'caveRock',seed:801},{x:2280,y:1500,w:45,h:335,type:'caveRock',seed:802},{x:1760,y:1530,w:110,h:55,type:'ruin',seed:803},{x:2100,y:1760,w:130,h:42,type:'ruin',seed:804});
      green.interactables.push({x:1715,y:1680,type:'shortcut',id:'waterfall_return',label:'Return Through the Waterfall',target:{x:1640,y:315}},{x:2160,y:1685,type:'chest',id:'warden_treasury',label:'Warden’s Treasury',requires:'warden_of_echoes_defeated',rewards:{gold:120,items:[['forest_relic',1],['greater_health_potion',2],['chaos_dust',2]]}});
      green.labels.push({x:1730,y:1540,type:'label',text:'ECHOING WATERFALL CAVERN'});
    }
    const livingNpcs={
      elaria:[{x:1330,y:650,type:'npc',id:'lorekeeper',name:'Sera',role:'Archivist',color:'#6d527d',marker:'!'}],
      greenhaven:[{x:1370,y:1010,type:'npc',id:'camp_healer',name:'Nima',role:'Camp Healer',color:'#537b62'},{x:1660,y:1015,type:'npc',id:'escort_luma',name:'Luma',role:'Young Ranger',color:'#557b72',marker:'!'}],
      chaosCaves:[{x:930,y:910,type:'npc',id:'cave_merchant',name:'Rook',role:'Expedition Trader',color:'#7d6449',marker:'$'}],
      brokenRealm:[
        {x:620,y:850,type:'npc',id:'realm_prisoner_1',name:'Aven',role:'Realm Prisoner',color:'#66556f',marker:'!'},
        {x:910,y:625,type:'npc',id:'realm_prisoner_2',name:'Pella',role:'Captured Healer',color:'#58687b',marker:'!'},
        {x:1300,y:925,type:'npc',id:'realm_prisoner_3',name:'Doran',role:'Lost Guard',color:'#715b55',marker:'!'},
        {x:1590,y:620,type:'npc',id:'realm_prisoner_4',name:'Isen',role:'Asteri Shade',color:'#665a82',marker:'!'},
        {x:1180,y:850,type:'npc',id:'final_merchant',name:'The Last Quartermaster',role:'Last Light',color:'#674c75',marker:'$'}
      ]
    };
    for(const [worldId,npcs] of Object.entries(livingNpcs)){const list=E.WORLD_DEFS[worldId]&&E.WORLD_DEFS[worldId].npcs;if(list)for(const npc of npcs)if(!list.some(existing=>existing.id===npc.id))list.push(npc);}
  }

  E.SKILLS=SKILLS;E.RECIPES=RECIPES;E.ACHIEVEMENTS=ACHIEVEMENTS;E.LORE=LORE;E.ProgressionSystem=ProgressionSystem;
  addWorldContent();
})();
