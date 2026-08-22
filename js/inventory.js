/* Inventory, equipment, and consumable handling. */
(function (global) {
  'use strict';

  const E = global.Elaria = global.Elaria || {};
  const EQUIPMENT_SLOTS = ['weapon', 'armor', 'helmet', 'boots', 'amulet'];
  const ID_ALIASES = Object.freeze({
    healthPotion: 'health_potion', greaterHealthPotion: 'greater_health_potion', royalElixir: 'royal_elixir',
    starterSword: 'starter_sword', basicSword: 'basic_sword', rustySword: 'rusty_sword', ironSword: 'iron_sword',
    basicArmor: 'basic_armor', leatherArmor: 'leather_armor', slimeGel: 'slime_gel', goblinCloth: 'goblin_cloth',
    shadowCloth: 'shadow_cloth', spiderSilk: 'spider_silk', wolfPelt: 'wolf_pelt', chaosDust: 'chaos_dust',
    livingRoot: 'living_root', batWing: 'bat_wing', ancientBone: 'ancient_bone', golemCore: 'golem_core',
    chaosOre: 'chaos_ore', crystalShard: 'crystal_shard', rareGel: 'rare_gel', goblinRelic: 'goblin_relic',
    alphaFang: 'alpha_fang', warlockFocus: 'warlock_focus', obsidianHeart: 'obsidian_heart'
  });
  const BONUS_DEFAULTS = Object.freeze({
    damage: 0,
    defense: 0,
    maxHealth: 0,
    critChance: 0,
    moveSpeed: 0,
    potionStrength: 0,
    armorPierce: 0,
    damageReduction: 0,
    dodgeChance: 0,
    healthRegen: 0,
    poisonResist: 0,
    knockback: 0,
    knockbackResist: 0
  });

  function positiveInteger(value, fallback) {
    const number = Math.floor(Number(value));
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function safeCall(context, method) {
    if (!context || typeof context[method] !== 'function') return undefined;
    try {
      return context[method].apply(context, Array.prototype.slice.call(arguments, 2));
    } catch (error) {
      return undefined;
    }
  }

  function canonicalId(id) {
    const value = String(id || '');
    return ID_ALIASES[value] || value;
  }

  class Inventory {
    constructor(game, data) {
      this.game = game || null;
      this.items = [];
      this.equipment = { weapon: null, armor: null, helmet: null, boots: null, amulet: null };
      if (data) this.load(data);
    }

    _definition(id) {
      return E.ITEMS && E.ITEMS[id] ? E.ITEMS[id] : null;
    }

    _newItem(id, qty) {
      if (typeof E.createItem === 'function') return E.createItem(id, qty);
      const def = this._definition(id);
      if (!def) return null;
      return {
        uid: 'itm-' + id + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
        id: id,
        qty: def.stackable ? positiveInteger(qty, 1) : 1
      };
    }

    _toast(message, kind) {
      safeCall(this.game && this.game.ui, 'toast', message, kind || 'info');
    }

    _sound(name) {
      safeCall(this.game && this.game.audio, 'play', name);
    }

    _quest(type, payload) {
      const manager = this.game && (this.game.quests || this.game.questManager);
      safeCall(manager, 'event', type, payload || {});
    }

    _refreshPlayer() {
      const bonuses = this.getBonuses();
      const player = this.game && this.game.player;
      if (player) {
        if (typeof player.recalculateStats === 'function') {
          safeCall(player, 'recalculateStats', bonuses);
        } else if (typeof player.applyEquipmentBonuses === 'function') {
          safeCall(player, 'applyEquipmentBonuses', bonuses);
        } else if (typeof player.recalcStats === 'function') {
          safeCall(player, 'recalcStats', true);
        }
      }
      safeCall(this.game, 'onEquipmentChanged', bonuses, this.equipment);
      safeCall(this.game && this.game.ui, 'renderInventory');
      safeCall(this.game && this.game.ui, 'updateHUD');
    }

    add(id, qty) {
      id = canonicalId(id);
      const def = this._definition(id);
      let remaining = positiveInteger(qty === undefined ? 1 : qty, 0);
      if (!def || remaining < 1) return null;
      remaining = Math.min(remaining, 9999);
      const requested = remaining;
      let firstAffected = null;

      if (def.stackable) {
        for (let i = 0; i < this.items.length && remaining > 0; i += 1) {
          const stack = this.items[i];
          if (stack.id !== id || stack.qty >= def.maxStack) continue;
          const moved = Math.min(remaining, def.maxStack - stack.qty);
          stack.qty += moved;
          remaining -= moved;
          if (!firstAffected) firstAffected = stack;
        }
      }

      while (remaining > 0) {
        const moved = def.stackable ? Math.min(remaining, def.maxStack) : 1;
        const item = this._newItem(id, moved);
        if (!item) break;
        item.qty = moved;
        this.items.push(item);
        if (!firstAffected) firstAffected = item;
        remaining -= moved;
      }

      const added = requested - remaining;
      if (added > 0) {
        this._quest('item_collected', { id: id, itemId: id, qty: added, item: firstAffected });
        this._sound('itemPickup');
        this._toast('Received ' + def.name + (added > 1 ? ' ×' + added : '') + '.', 'item');
        safeCall(this.game && this.game.ui, 'renderInventory');
        safeCall(this.game && this.game.ui, 'updateHUD');
      }
      return firstAffected;
    }

    remove(uidOrId, qty) {
      let key = String(uidOrId || '');
      let remaining = positiveInteger(qty === undefined ? 1 : qty, 0);
      if (!key || remaining < 1) return 0;
      const byUid = this.items.some(function (item) { return item.uid === key; });
      if (!byUid) key = canonicalId(key);
      let removed = 0;

      for (let i = this.items.length - 1; i >= 0 && remaining > 0; i -= 1) {
        const item = this.items[i];
        if ((byUid && item.uid !== key) || (!byUid && item.id !== key)) continue;
        const amount = Math.min(remaining, item.qty);
        item.qty -= amount;
        remaining -= amount;
        removed += amount;
        if (item.qty <= 0) {
          this._clearEquippedUid(item.uid);
          this.items.splice(i, 1);
        }
        if (byUid) break;
      }
      if (removed > 0) {
        this._refreshPlayer();
        safeCall(this.game && this.game.ui, 'renderInventory');
      }
      return removed;
    }

    _clearEquippedUid(uid) {
      let changed = false;
      EQUIPMENT_SLOTS.forEach((slot) => {
        if (this.equipment[slot] === uid) {
          this.equipment[slot] = null;
          changed = true;
        }
      });
      return changed;
    }

    count(id) {
      id = canonicalId(id);
      return this.items.reduce(function (total, item) {
        return total + (item.id === id ? item.qty : 0);
      }, 0);
    }

    get(uid) {
      const key = String(uid || '');
      return this.items.find(function (item) { return item.uid === key; }) || null;
    }

    _find(uidOrId) {
      const key = String(uidOrId || '');
      const id = canonicalId(key);
      return this.get(key) || this.items.find(function (item) { return item.id === id; }) || null;
    }

    equip(uid) {
      const requestedId = canonicalId(uid);
      const item = this._find(uid) || this.items.find(function (entry) { return entry && canonicalId(entry.id) === requestedId; });
      const def = item && (this._definition(item.id) || this._definition(canonicalId(item.id)));
      if (!item || !def || EQUIPMENT_SLOTS.indexOf(def.slot || def.type) < 0) {
        this._toast('That item cannot be equipped.', 'warning');
        return false;
      }
      const slot = def.slot || def.type;
      if (this.equipment[slot] === item.uid) return true;
      const previousUid = this.equipment[slot];
      this.equipment[slot] = item.uid;
      this._quest('item_equipped', {
        id: item.id,
        itemId: item.id,
        uid: item.uid,
        slot: slot,
        previousUid: previousUid,
        equipment: Object.assign({}, this.equipment)
      });
      this._sound('equip');
      this._toast('Equipped ' + def.name + '.', 'success');
      this._refreshPlayer();
      return true;
    }

    unequip(slot) {
      const normalized = String(slot || '').toLowerCase();
      if (EQUIPMENT_SLOTS.indexOf(normalized) < 0) return null;
      const uid = this.equipment[normalized];
      if (!uid) return null;
      const item = this.get(uid);
      this.equipment[normalized] = null;
      this._quest('item_unequipped', {
        id: item ? item.id : null,
        itemId: item ? item.id : null,
        uid: uid,
        slot: normalized,
        equipment: Object.assign({}, this.equipment)
      });
      this._sound('equip');
      this._refreshPlayer();
      return item;
    }

    use(uid) {
      const legacyPlayerUse = uid === 'healthPotion';
      const item = this._find(uid);
      const def = item && this._definition(item.id);
      if (!item || !def || def.type !== 'consumable' || !def.effect) {
        this._toast('That item cannot be used.', 'warning');
        return false;
      }

      // Player.spendPotion in older builds owns the healing step after this alias call.
      if (legacyPlayerUse) return this.remove(item.uid, 1) === 1;

      const player = this.game && this.game.player;
      if (!player) return false;
      const effect = def.effect;
      const currentKey = Number.isFinite(Number(player.health)) ? 'health' : (Number.isFinite(Number(player.hp)) ? 'hp' : null);
      const maxKey = Number.isFinite(Number(player.maxHealth)) ? 'maxHealth' : (Number.isFinite(Number(player.maxHp)) ? 'maxHp' : null);
      const current = currentKey ? Number(player[currentKey]) : null;
      const maximum = maxKey ? Number(player[maxKey]) : null;
      const hasSecondaryEffect = Boolean(effect.cure || effect.buff);
      if (effect.heal && current !== null && maximum !== null && current >= maximum && !hasSecondaryEffect) {
        this._toast('Your health is already full.', 'info');
        return false;
      }

      let healed = 0;
      if (effect.heal) {
        const strength = Math.max(0, Number(this.getBonuses().potionStrength) || 0);
        const difficultyScale = this.game && this.game.difficultyName === 'nightmare' ? 0.72 : 1;
        const amount = Math.max(1, Math.round(Number(effect.heal) * (1 + strength) * difficultyScale));
        if (typeof player.heal === 'function') {
          const result = safeCall(player, 'heal', amount);
          healed = Number.isFinite(Number(result)) ? Number(result) : amount;
        } else if (currentKey && maxKey) {
          const next = Math.min(maximum, current + amount);
          player[currentKey] = next;
          healed = next - current;
        }
      }

      if (effect.cure) {
        if (typeof player.cureStatus === 'function') {
          safeCall(player, 'cureStatus', effect.cure);
        } else if (player.statusEffects && typeof player.statusEffects === 'object') {
          if (Array.isArray(player.statusEffects)) {
            player.statusEffects = player.statusEffects.filter(function (status) {
              return status !== effect.cure && (!status || status.type !== effect.cure);
            });
          } else {
            delete player.statusEffects[effect.cure];
          }
        }
      }
      if (effect.buff) {
        if (typeof player.addBuff === 'function') {
          safeCall(player, 'addBuff', effect.buff, Number(effect.amount) || 0, Number(effect.duration) || 0);
        } else {
          safeCall(this.game && this.game.combat, 'addPlayerBuff', effect.buff, Number(effect.amount) || 0, Number(effect.duration) || 0);
        }
      }

      if (this.remove(item.uid, 1) !== 1) return false;
      this._quest('item_used', { id: item.id, itemId: item.id, qty: 1, healed: healed });
      this._sound('potion');
      this._toast('Used ' + def.name + (healed > 0 ? ' (+' + Math.round(healed) + ' health).' : '.'), 'success');
      safeCall(this.game && this.game.ui, 'updateHUD');
      return true;
    }

    drop(uid, qty) {
      const item = this._find(uid);
      const def = item && this._definition(item.id);
      if (!item || !def) return false;
      if (def.type === 'quest') {
        this._toast('Quest items cannot be dropped.', 'warning');
        return false;
      }
      const amount = Math.min(item.qty, positiveInteger(qty === undefined ? 1 : qty, 0));
      if (amount < 1) return false;
      const equippedSlot = EQUIPMENT_SLOTS.find((slot) => this.equipment[slot] === item.uid);
      if (equippedSlot) this.unequip(equippedSlot);
      if (this.remove(item.uid, amount) !== amount) return false;

      const payload = { id: item.id, itemId: item.id, qty: amount, definition: def };
      if (typeof (this.game && this.game.spawnItemDrop) === 'function') {
        safeCall(this.game, 'spawnItemDrop', payload);
      } else if (typeof (this.game && this.game.spawnDrop) === 'function') {
        const player = this.game.player || {};
        safeCall(this.game, 'spawnDrop', 'item', Number(player.x) || 0, Number(player.y) || 0, payload);
      } else {
        safeCall(this.game && this.game.world, 'spawnItemDrop', payload);
      }
      this._quest('item_dropped', payload);
      this._toast('Dropped ' + def.name + (amount > 1 ? ' ×' + amount : '') + '.', 'info');
      return true;
    }

    getBonuses() {
      const bonuses = Object.assign({}, BONUS_DEFAULTS);
      EQUIPMENT_SLOTS.forEach((slot) => {
        const item = this.get(this.equipment[slot]);
        const def = item && this._definition(item.id);
        if (!def || !def.stats) return;
        Object.keys(def.stats).forEach(function (key) {
          const value = Number(def.stats[key]);
          if (!Number.isFinite(value)) return;
          bonuses[key] = (Number(bonuses[key]) || 0) + value;
        });
      });
      return bonuses;
    }

    serialize() {
      return {
        items: this.items.map(function (item) {
          return { uid: item.uid, id: item.id, qty: item.qty };
        }),
        equipment: Object.assign({}, this.equipment)
      };
    }

    load(data) {
      const source = data && typeof data === 'object' ? data : {};
      const list = Array.isArray(source) ? source : (Array.isArray(source.items) ? source.items : []);
      const seenUids = new Set();
      this.items = [];

      list.slice(0, 1000).forEach((saved) => {
        if (!saved || typeof saved !== 'object') return;
        const def = this._definition(String(saved.id || ''));
        if (!def) return;
        let qty = positiveInteger(saved.qty, 1);
        qty = def.stackable ? Math.min(qty, def.maxStack) : 1;
        const fresh = this._newItem(def.id, qty);
        if (!fresh) return;
        const suppliedUid = typeof saved.uid === 'string' && /^itm-[a-z0-9_-]{3,120}$/i.test(saved.uid) ? saved.uid : null;
        fresh.uid = suppliedUid && !seenUids.has(suppliedUid) ? suppliedUid : fresh.uid;
        if (seenUids.has(fresh.uid)) {
          const replacement = this._newItem(def.id, qty);
          fresh.uid = replacement ? replacement.uid : fresh.uid + '-' + seenUids.size;
        }
        seenUids.add(fresh.uid);
        fresh.qty = qty;
        this.items.push(fresh);
      });

      this.equipment = { weapon: null, armor: null, helmet: null, boots: null, amulet: null };
      const savedEquipment = !Array.isArray(source) && source.equipment && typeof source.equipment === 'object' ? source.equipment : {};
      const equippedUids = new Set();
      EQUIPMENT_SLOTS.forEach((slot) => {
        const saved = savedEquipment[slot];
        const savedUid = saved && typeof saved === 'object' ? saved.uid : saved;
        const savedId = saved && typeof saved === 'object' ? saved.id : saved;
        let item = this.get(savedUid);
        if (!item && typeof savedId === 'string') {
          item = this.items.find((entry) => entry.id === savedId && !equippedUids.has(entry.uid)) || null;
        }
        const def = item && this._definition(item.id);
        if (item && def && (def.slot || def.type) === slot && !equippedUids.has(item.uid)) {
          this.equipment[slot] = item.uid;
          equippedUids.add(item.uid);
        }
      });
      this._refreshPlayer();
      return this;
    }
  }

  Inventory.SLOTS = Object.freeze(EQUIPMENT_SLOTS.slice());
  E.Inventory = Inventory;
})(window);
