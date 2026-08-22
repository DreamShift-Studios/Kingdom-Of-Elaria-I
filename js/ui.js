(function () {
  'use strict';

  const E = window.Elaria = window.Elaria || {};

  const ICONS = {
    weapon: '⚔', armor: '▣', helmet: '♜', boots: '⌁', amulet: '◇', consumable: '◆', material: '✦', quest: '◆'
  };
  const RARITY = { common:'#c9c2b5',uncommon:'#70c878',rare:'#62aee0',epic:'#b879e5',legendary:'#f1b74d' };

  class UIManager {
    constructor(game) {
      this.game=game;
      this.inventoryCategory='all';
      this.selectedUid=null;
      this.returnToPause=false;
      this.areaTimer=0;
      this.bossHudBoss=null;
      this.bossHpVisual=1;
      this.bossHpChip=1;
      this.bossHudPhase=0;
      this.bossPulseBoss=null;
      this.bindInventory();
    }

    el(id){return document.getElementById(id);}
    itemDef(item){return item?(E.ITEMS&&E.ITEMS[item.id]||item.definition||item):null;}
    equippedItem(slot){
      const inv=this.game.inventory;if(!inv||!inv.equipment)return null;
      const value=inv.equipment[slot];if(!value)return null;
      if(typeof value==='object'&&value.id)return value;
      return inv.get?inv.get(value):(inv.items||[]).find(i=>i.uid===value||i.id===value)||null;
    }

    update(){
      const p=this.game.player;if(!p)return;
      const hp=Math.max(0,Math.round(p.hp||0)),max=Math.max(1,Math.round(p.maxHealth||p.maxHp||100));
      const fill=this.el('hp-fill');if(fill)fill.style.width=`${Math.max(0,Math.min(100,hp/max*100))}%`;
      const hpText=this.el('hp-text');if(hpText)hpText.textContent=`${hp} / ${max}`;
      const name=this.el('hud-player-name');if(name)name.textContent=this.game.playerName||p.name||'Hero';
      const gold=this.el('gold-value');if(gold)gold.textContent=String(Math.max(0,Math.round(p.gold||0)));
      const potions=this.el('potion-value');if(potions)potions.textContent=String(this.game.inventory&&this.game.inventory.count?this.game.inventory.count('health_potion'):0);
      const weapon=this.equippedItem('weapon'),weaponDef=this.itemDef(weapon);const wep=this.el('weapon-value');if(wep)wep.textContent=weaponDef?weaponDef.name:'Unarmed';
      const objective=this.el('quest-objective');if(objective&&this.game.quests)objective.textContent=this.game.quests.getObjectiveText?this.game.quests.getObjectiveText():'Explore the road ahead';
      const boss=this.game.boss,bossHud=this.el('boss-hud');
      if(boss&&boss.hp>0&&!boss.dead){
        bossHud&&bossHud.classList.remove('hidden');
        const bossName=this.el('boss-name');if(bossName)bossName.textContent=boss.name||boss.displayName||'Corrupted Guardian';
        const subtitle=this.el('boss-subtitle');if(subtitle)subtitle.textContent=boss.subtitle||'';
        const bm=Math.max(1,boss.maxHp||boss.maxHealth||1);let target=Math.max(0,Math.min(1,boss.hp/bm));
        if(boss.finalPhase)target=boss.finalStrikeReady ? .045 : .18;
        if(this.bossHudBoss!==boss){this.bossHudBoss=boss;this.bossHpVisual=target;this.bossHpChip=target;this.bossHudPhase=boss.phase||1;this.bossPulseBoss=null;}
        else{this.bossHpVisual+=(target-this.bossHpVisual)*.24;if(target>=this.bossHpChip)this.bossHpChip=target;else this.bossHpChip+=(target-this.bossHpChip)*.055;}
        const bossFill=this.el('boss-hp-fill'),bossChip=this.el('boss-hp-chip');if(bossFill)bossFill.style.width=`${Math.max(0,this.bossHpVisual*100)}%`;if(bossChip)bossChip.style.width=`${Math.max(0,this.bossHpChip*100)}%`;
        const value=boss.phase||1,phase=this.el('boss-phase');if(phase)phase.textContent=typeof value==='string'?value.toUpperCase():`PHASE ${['I','II','III','IV'][Math.max(0,value-1)]||value}`;
        if(bossHud){bossHud.classList.toggle('velymoor',boss.bossType==='velymoor');bossHud.classList.toggle('final-strike',!!boss.finalStrikeReady);if(this.bossHudPhase!==value){this.bossHudPhase=value;bossHud.classList.remove('phase-transition');void bossHud.offsetWidth;bossHud.classList.add('phase-transition');window.setTimeout(()=>bossHud.classList.remove('phase-transition'),850);}if(boss._chaosPulseTriggered&&this.bossPulseBoss!==boss){this.bossPulseBoss=boss;bossHud.classList.remove('chaos-pulse');void bossHud.offsetWidth;bossHud.classList.add('chaos-pulse');window.setTimeout(()=>bossHud.classList.remove('chaos-pulse'),1200);}}
        const finalIndicator=this.el('boss-final-indicator');if(finalIndicator){finalIndicator.classList.toggle('hidden',!boss.finalPhase);finalIndicator.classList.toggle('ready',!!boss.finalStrikeReady);finalIndicator.textContent=boss.finalStrikeReady?'FINAL STRIKE — THE ORB IS EXPOSED':`SURVIVE THE COLLAPSE · ${Math.max(0,boss.finalSurvival||0).toFixed(1)}s`;}
      }else{if(bossHud){bossHud.classList.add('hidden');bossHud.classList.remove('velymoor','phase-transition','chaos-pulse','final-strike');}this.bossHudBoss=null;const finalIndicator=this.el('boss-final-indicator');finalIndicator&&finalIndicator.classList.add('hidden');}
    }

    toast(text,type){
      const host=this.el('toast-container');if(!host||!text)return;
      const node=document.createElement('div');node.className=`toast ${type||''}`;node.textContent=String(text);host.appendChild(node);
      window.setTimeout(()=>node.remove(),3200);
    }

    showArea(name){
      const banner=this.el('area-banner');if(!banner)return;
      const strong=banner.querySelector('strong');if(strong)strong.textContent=name||'';
      banner.classList.add('hidden');void banner.offsetWidth;banner.classList.remove('hidden');
      window.setTimeout(()=>banner.classList.add('hidden'),3250);
    }

    showBossTitle(name,subtitle){
      const title=this.el('boss-intro-title');if(!title)return;
      const strong=title.querySelector('strong'),copy=title.querySelector('span');if(strong)strong.textContent=name||'VELYMOOR';if(copy)copy.textContent=subtitle||'Bearer of the Orb of Chaos';
      title.classList.add('hidden');void title.offsetWidth;title.classList.remove('hidden');window.setTimeout(()=>title.classList.add('hidden'),3200);
    }

    togglePause(force){
      const panel=this.el('pause-panel');if(!panel)return;
      const visible=typeof force==='boolean'?force:panel.classList.contains('hidden');
      panel.classList.toggle('hidden',!visible);
      if(visible){this.closeSidePanels();this.game.state='paused';}
    }

    closeSidePanels(){
      ['inventory-panel','quests-panel','stats-panel','shop-panel','settings-panel'].forEach(id=>this.el(id)&&this.el(id).classList.add('hidden'));
    }

    closePanels(){this.closeSidePanels();}

    openInventory(fromPause){
      if(!this.game.inventory)return;
      this.returnToPause=!!fromPause;
      this.closeSidePanels();this.el('pause-panel')&&this.el('pause-panel').classList.add('hidden');
      this.game.state='panel';this.el('inventory-panel')&&this.el('inventory-panel').classList.remove('hidden');this.renderInventory();
    }

    openQuests(fromPause){
      this.returnToPause=!!fromPause;this.closeSidePanels();this.el('pause-panel')&&this.el('pause-panel').classList.add('hidden');
      this.game.state='panel';this.el('quests-panel')&&this.el('quests-panel').classList.remove('hidden');this.renderQuests();
    }

    openStats(fromPause){
      this.returnToPause=!!fromPause;this.closeSidePanels();this.el('pause-panel')&&this.el('pause-panel').classList.add('hidden');
      this.game.state='panel';this.el('stats-panel')&&this.el('stats-panel').classList.remove('hidden');this.renderStats();
    }

    openSettings(fromPause){
      this.returnToPause=!!fromPause;this.closeSidePanels();this.game.state='panel';this.el('settings-panel')&&this.el('settings-panel').classList.remove('hidden');this.renderSettings();
    }

    showGameOver(){
      this.closeSidePanels();document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));this.el('gameover-panel')&&this.el('gameover-panel').classList.remove('hidden');
    }

    showVictory(summary){
      this.closeSidePanels();document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));this.el('victory-panel')&&this.el('victory-panel').classList.remove('hidden');
      const copy=this.el('victory-copy');if(copy)copy.textContent=`${summary.name}, once a humble citizen of the last kingdom, broke the Orb of Chaos. Daylight spills across the realm, and Elaria begins to rebuild.`;
      const host=this.el('victory-summary');if(host){
        const time=this.formatTime(summary.playtime);host.innerHTML=[['Gold Collected',summary.gold],['Enemies Defeated',summary.enemies],['Bosses Defeated',summary.bosses],['Playtime',time]].map(v=>`<div class="summary-stat"><b>${this.escape(v[1])}</b><small>${this.escape(v[0])}</small></div>`).join('');
      }
    }

    bindInventory(){
      const panel=this.el('inventory-panel');if(panel&&!panel.dataset.uiBound){
        panel.dataset.uiBound='1';
        panel.addEventListener('click',(event)=>{
          const tab=event.target.closest('[data-category]');
          if(tab){this.inventoryCategory=tab.dataset.category;panel.querySelectorAll('[data-category]').forEach(t=>t.classList.toggle('active',t===tab));this.renderInventory();return;}
          const tile=event.target.closest('[data-uid]');
          if(tile&&!event.target.closest('[data-action]')){this.selectedUid=tile.dataset.uid;this.renderInventory();return;}
          const action=event.target.closest('[data-action]');
          if(!action)return;
          const uid=action.dataset.uid||this.selectedUid,slot=action.dataset.slot;
          if(action.dataset.action==='equip')this.game.inventory.equip(uid);
          else if(action.dataset.action==='use')this.game.inventory.use(uid);
          else if(action.dataset.action==='drop')this.game.inventory.drop(uid,1);
          else if(action.dataset.action==='unequip')this.game.inventory.unequip(slot);
          this.game.player&&this.game.player.recalcStats&&this.game.player.recalcStats();
          this.game.audio&&this.game.audio.play('button');this.renderInventory();this.update();
        });
      }
    }

    renderInventory(){
      const inv=this.game.inventory;if(!inv)return;
      const items=Array.isArray(inv.items)?inv.items:[];
      if(this.selectedUid&&!items.some(i=>String(i.uid)===String(this.selectedUid)))this.selectedUid=null;
      const list=this.el('inventory-list');
      const filtered=items.filter(item=>{
        const def=this.itemDef(item),type=def&&(def.type||def.category||def.slot);
        if(this.inventoryCategory==='all')return true;
        if(this.inventoryCategory==='armor')return ['armor','helmet','boots','amulet'].includes(type)||['armor','helmet','boots','amulet'].includes(def&&def.slot);
        return type===this.inventoryCategory;
      });
      if(list){
        list.innerHTML=filtered.length?filtered.map(item=>{
          const d=this.itemDef(item)||{},rarity=d.rarity||'common',selected=String(item.uid)===String(this.selectedUid);
          return `<button class="item-tile ${selected?'selected':''}" data-uid="${this.escape(item.uid)}" title="${this.escape(d.name||item.id)}"><span class="item-icon" style="color:${RARITY[rarity]||RARITY.common}">${this.escape(d.icon||ICONS[d.type]||ICONS.material)}</span>${item.qty>1?`<span class="qty">${item.qty}</span>`:''}<i class="rarity-line" style="background:${RARITY[rarity]||RARITY.common}"></i></button>`;
        }).join(''):'<p class="muted">This part of your pack is empty.</p>';
      }
      this.renderEquipment();
      const selected=items.find(i=>String(i.uid)===String(this.selectedUid));this.renderItemDetails(selected);
      const bonuses=inv.getBonuses?inv.getBonuses():{};
      const mini=this.el('inventory-mini-stats');if(mini)mini.innerHTML=`<span>Damage</span><b>${Math.round((this.game.player&&this.game.player.damage)||bonuses.damage||5)}</b><span>Defense</span><b>${Math.round((this.game.player&&this.game.player.defense)||bonuses.defense||0)}</b><span>Crit</span><b>${Math.round(((this.game.player&&this.game.player.critChance)||bonuses.critChance||.05)*100)}%</b>`;
    }

    renderEquipment(){
      const host=this.el('equipment-slots');if(!host)return;
      host.innerHTML=['weapon','armor','helmet','boots','amulet'].map(slot=>{
        const item=this.equippedItem(slot),d=this.itemDef(item),name=d?d.name:'Empty';
        return `<button class="equipment-slot" ${item?`data-action="unequip" data-slot="${slot}"`:''}><span class="slot-icon">${ICONS[slot]}</span><span><small>${slot}</small>${this.escape(name)}</span></button>`;
      }).join('');
    }

    renderItemDetails(item){
      const host=this.el('item-details');if(!host)return;
      if(!item){host.innerHTML='<p class="muted">Select an item to inspect it.</p>';return;}
      const d=this.itemDef(item)||{},rarity=d.rarity||'common',stats=d.stats||{};
      const rows=[];
      const labels={damage:'Damage',defense:'Defense',maxHealth:'Max Health',health:'Max Health',critChance:'Critical Chance',speed:'Move Speed',moveSpeed:'Move Speed',potionStrength:'Potion Strength'};
      for(const [key,val] of Object.entries(stats))rows.push(`<tr><td>${labels[key]||this.title(key)}</td><td>${key.toLowerCase().includes('chance')?Math.round(val*100)+'%':val>0?'+'+val:val}</td></tr>`);
      if(d.damage)rows.push(`<tr><td>Damage</td><td>+${d.damage}</td></tr>`);if(d.defense)rows.push(`<tr><td>Defense</td><td>+${d.defense}</td></tr>`);
      const type=d.type||d.category||'',equip=['weapon','armor','helmet','boots','amulet'].includes(type)||d.slot;
      host.innerHTML=`<div class="item-art" style="color:${RARITY[rarity]||RARITY.common}">${this.escape(d.icon||ICONS[type]||'✦')}</div><h3 style="color:${RARITY[rarity]||RARITY.common}">${this.escape(d.name||item.id)}</h3><span class="rarity-name" style="color:${RARITY[rarity]||RARITY.common}">${rarity}</span><p>${this.escape(d.description||'A useful item found on the road.')}</p>${rows.length?`<table class="stats-table">${rows.join('')}</table>`:''}<div class="item-actions">${equip?`<button class="pixel-btn primary" data-action="equip" data-uid="${this.escape(item.uid)}">Equip</button>`:''}${type==='consumable'?`<button class="pixel-btn primary" data-action="use" data-uid="${this.escape(item.uid)}">Use</button>`:''}${type!=='quest'?`<button class="pixel-btn" data-action="drop" data-uid="${this.escape(item.uid)}">Drop One</button>`:''}</div>`;
    }

    questEntries(){
      const q=this.game.quests;if(!q)return[];
      if(q.getActive){
        const result=q.getActive(true);
        const completed=q.getCompleted?q.getCompleted():[];
        if(Array.isArray(result))return result.concat(Array.isArray(completed)?completed:[]);
      }
      if(Array.isArray(q.quests))return q.quests;
      if(q.states&&typeof q.states==='object')return Object.entries(q.states).map(([id,state])=>({...((E.QUEST_DEFS&&E.QUEST_DEFS[id])||{}),id,...state}));
      return [];
    }

    renderQuests(){
      const host=this.el('quest-list');if(!host)return;
      let quests=this.questEntries();
      if(!quests.length&&E.QUEST_DEFS){quests=Object.values(E.QUEST_DEFS).filter(q=>q.active||q.id==='tutorial');}
      host.innerHTML=quests.length?quests.map(q=>{
        const def=(E.QUEST_DEFS&&E.QUEST_DEFS[q.id])||q,state=q.state||q.status||'',complete=q.completed||state==='completed',kind=def.type||def.category||'side';
        const objectiveEntry=q.currentObjective&&typeof q.currentObjective==='object'?q.currentObjective:null;
        const objective=(objectiveEntry&&(objectiveEntry.label||objectiveEntry.text))||q.objective||(typeof q.currentObjective==='string'?q.currentObjective:null)||(Array.isArray(def.objectives)?((def.objectives[q.stage||0]||{}).label||def.objectives[q.stage||0]):def.objective)||def.description||'Continue your journey.';
        const progress=q.progressText||(objectiveEntry&&objectiveEntry.required>1?`${objectiveEntry.current} / ${objectiveEntry.required}`:(q.progress!=null&&q.target?`${q.progress} / ${q.target}`:''));
        const timed=q.timeRemaining!=null?`${Math.floor(q.timeRemaining/60)}:${String(q.timeRemaining%60).padStart(2,'0')}`:'';
        return `<article class="quest-entry ${kind==='main'?'main':'side'} ${complete?'completed':''}"><div class="quest-sigil">${complete?'✓':kind==='main'?'◆':kind==='timed'?'◷':'·'}</div><div><h3>${this.escape(def.name||def.title||q.id||'Quest')}</h3><p>${this.escape(def.description||'')}</p><p class="objective">${complete?'Completed':this.escape(objective)} ${progress?`(${this.escape(progress)})`:''}${timed?` · ${timed}`:''}</p></div><div class="reward">${this.escape(def.rewardText||this.rewardText(def.reward))}</div></article>`;
      }).join(''):'<p class="muted">No quests are recorded yet.</p>';
    }

    rewardText(reward){
      if(!reward)return'';if(typeof reward==='string')return reward;const out=[];if(reward.gold)out.push(`${reward.gold} gold`);if(reward.items)out.push(`${reward.items.length} item${reward.items.length===1?'':'s'}`);return out.join(' · ');
    }

    renderStats(){
      const p=this.game.player;if(!p)return;const host=this.el('stats-content'),inv=this.game.inventory,bonus=inv&&inv.getBonuses?inv.getBonuses():{};
      const rows=[['Level',p.level||1],['Damage',Math.round(p.damage||p.attackDamage||5)],['Defense',Math.round(p.defense||0)],['Maximum Health',Math.round(p.maxHealth||p.maxHp||100)],['Critical Chance',`${Math.round((p.critChance||.05)*100)}%`],['Movement Speed',Math.round(p.speed||p.moveSpeed||150)],['Enemies Defeated',this.game.stats.enemiesDefeated],['Bosses Defeated',this.game.stats.bossesDefeated],['Chests Opened',this.game.stats.chestsOpened],['Playtime',this.formatTime(this.game.playtime)]];
      if(host)host.innerHTML=`<div class="hero-paperdoll" aria-label="${this.escape(this.game.playerName)}">⚔</div><div><p class="eyebrow">${this.escape(this.game.playerName)} · ${E.DIFFICULTIES[this.game.difficultyName].label}${this.game.ngPlus?` · NG+${this.game.ngPlus}`:''}</p><div class="stat-list">${rows.map(r=>`<div class="stat-row"><span>${this.escape(r[0])}</span><b>${this.escape(r[1])}</b></div>`).join('')}</div></div>`;
    }

    renderSettings(){
      const s=this.game.settings,m=this.el('music-volume'),fx=this.el('sfx-volume'),shake=this.el('screen-shake'),diff=this.el('difficulty-select');
      if(m)m.value=Math.round(s.musicVolume*100);if(fx)fx.value=Math.round(s.sfxVolume*100);if(shake)shake.checked=s.screenShake;if(diff)diff.value=s.difficulty;
      const mo=this.el('music-output'),so=this.el('sfx-output');if(mo)mo.textContent=`${Math.round(s.musicVolume*100)}%`;if(so)so.textContent=`${Math.round(s.sfxVolume*100)}%`;
    }

    formatTime(seconds){const total=Math.max(0,Math.floor(seconds||0)),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;}
    title(value){return String(value).replace(/([A-Z])/g,' $1').replace(/^./,m=>m.toUpperCase());}
    escape(value){return String(value==null?'':value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  }

  E.UIManager=UIManager;
})();
