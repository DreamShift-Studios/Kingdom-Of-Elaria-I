/* Defensive, versioned localStorage persistence. */
(function (global) {
  'use strict';

  const E = global.Elaria = global.Elaria || {};
  const SAVE_KEY = 'elaria-rise-save-v1';
  const SAVE_VERSION = 1;
  const SLOTS = ['weapon', 'armor', 'helmet', 'boots', 'amulet'];
  let fallbackUid = 0;

  function safeCall(context, method) {
    if (!context || typeof context[method] !== 'function') return undefined;
    try {
      return context[method].apply(context, Array.prototype.slice.call(arguments, 2));
    } catch (error) {
      return undefined;
    }
  }

  function finite(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min === undefined ? -1000000000 : min, Math.min(max === undefined ? 1000000000 : max, number));
  }

  function cleanString(value, fallback, maxLength) {
    if (typeof value !== 'string' && typeof value !== 'number') return fallback;
    const text = String(value).replace(/[\u0000-\u001f\u007f]/g, '').trim();
    return text ? text.slice(0, maxLength || 120) : fallback;
  }

  function get(object, key, fallback) {
    try {
      return object && object[key] !== undefined ? object[key] : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function first() {
    for (let i = 0; i < arguments.length; i += 1) {
      if (arguments[i] !== undefined && arguments[i] !== null) return arguments[i];
    }
    return undefined;
  }

  function cleanPlain(value, depth, budget) {
    if (depth > 7 || budget.count > 3000) return null;
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? Math.max(-1000000000, Math.min(1000000000, value)) : 0;
    if (typeof value === 'string') return value.replace(/[\u0000\u007f]/g, '').slice(0, 500);
    if (Array.isArray(value)) {
      const output = [];
      const limit = Math.min(value.length, 1000);
      for (let i = 0; i < limit; i += 1) {
        budget.count += 1;
        const cleaned = cleanPlain(value[i], depth + 1, budget);
        if (cleaned !== undefined) output.push(cleaned);
      }
      return output;
    }
    if (!value || typeof value !== 'object') return undefined;
    const output = Object.create(null);
    let keys;
    try { keys = Object.keys(value).slice(0, 300); } catch (error) { return output; }
    keys.forEach(function (key) {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') return;
      if (!/^[a-z0-9_.-]{1,80}$/i.test(key)) return;
      budget.count += 1;
      const cleaned = cleanPlain(get(value, key), depth + 1, budget);
      if (cleaned !== undefined) output[key] = cleaned;
    });
    return output;
  }

  function serialized(object) {
    if (!object) return null;
    const result = safeCall(object, 'serialize');
    return result && typeof result === 'object' ? result : null;
  }

  function newUid(id) {
    fallbackUid += 1;
    return 'itm-' + String(id).replace(/[^a-z0-9_-]/gi, '').slice(0, 18) + '-save-' + Date.now().toString(36) + '-' + fallbackUid.toString(36);
  }

  function sanitizeItems(inventorySource, equipmentSource) {
    const source = inventorySource && typeof inventorySource === 'object' ? inventorySource : {};
    const rawItems = Array.isArray(source) ? source : (Array.isArray(source.items) ? source.items : []);
    const items = [];
    const used = new Set();

    rawItems.slice(0, 1000).forEach(function (raw) {
      if (!raw || typeof raw !== 'object') return;
      const id = cleanString(get(raw, 'id'), '', 64);
      if (!id || !/^[a-z0-9_-]+$/i.test(id)) return;
      const def = E.ITEMS && E.ITEMS[id] ? E.ITEMS[id] : null;
      let qty = Math.floor(finite(get(raw, 'qty'), 1, 1, 9999));
      if (def) qty = def.stackable ? Math.min(qty, def.maxStack || 99) : 1;
      let uid = cleanString(get(raw, 'uid'), '', 120);
      if (!/^itm-[a-z0-9_-]{3,120}$/i.test(uid) || used.has(uid)) uid = newUid(id);
      used.add(uid);
      items.push({ uid: uid, id: id, qty: qty });
    });

    const rawEquipment = equipmentSource && typeof equipmentSource === 'object'
      ? equipmentSource
      : (!Array.isArray(source) && source.equipment && typeof source.equipment === 'object' ? source.equipment : {});
    const equipment = { weapon: null, armor: null, helmet: null, boots: null, amulet: null };
    const alreadyEquipped = new Set();
    SLOTS.forEach(function (slot) {
      const value = get(rawEquipment, slot);
      const possibleUid = value && typeof value === 'object' ? get(value, 'uid') : value;
      const possibleId = value && typeof value === 'object' ? get(value, 'id') : value;
      let item = items.find(function (entry) { return entry.uid === possibleUid; });
      if (!item && typeof possibleId === 'string') {
        item = items.find(function (entry) { return entry.id === possibleId && !alreadyEquipped.has(entry.uid); });
      }
      const def = item && E.ITEMS && E.ITEMS[item.id] ? E.ITEMS[item.id] : null;
      if (item && !alreadyEquipped.has(item.uid) && (!def || (def.slot || def.type) === slot)) {
        equipment[slot] = item.uid;
        alreadyEquipped.add(item.uid);
      }
    });
    return { items: items, equipment: equipment };
  }

  function sanitizePlayer(raw, root) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const position = get(source, 'position', {});
    const maxHealth = finite(first(get(source, 'maxHealth'), get(source, 'maxHp'), get(root, 'maxHealth')), 100, 1, 1000000);
    const health = finite(first(get(source, 'health'), get(source, 'hp'), get(root, 'health')), maxHealth, 0, maxHealth);
    const savedBase = get(source, 'baseStats', {});
    const baseStats = {
      maxHealth: finite(first(get(savedBase, 'maxHealth'), get(source, 'baseMaxHealth'), maxHealth), 100, 1, 1000000),
      damage: finite(first(get(savedBase, 'damage'), get(source, 'baseDamage'), get(source, 'damage')), 12, 0, 100000),
      defense: finite(first(get(savedBase, 'defense'), get(source, 'baseDefense'), get(source, 'defense')), 1, 0, 100000),
      moveSpeed: finite(first(get(savedBase, 'moveSpeed'), get(source, 'baseMoveSpeed'), get(source, 'moveSpeed'), get(source, 'speed')), 155, 1, 10000),
      critChance: finite(first(get(savedBase, 'critChance'), get(source, 'baseCritChance'), get(source, 'critChance')), 0.08, 0, 1),
      critDamage: finite(first(get(savedBase, 'critDamage'), get(source, 'baseCritDamage'), get(source, 'critDamage')), 1.75, 1, 20),
      potionStrength: finite(first(get(savedBase, 'potionStrength'), get(source, 'basePotionStrength'), get(source, 'potionStrength')), 38, 1, 100000)
    };
    const output = {
      name: cleanString(first(get(source, 'name'), get(root, 'playerName')), 'Hero', 32),
      x: finite(first(get(source, 'x'), get(position, 'x'), get(root, 'x')), 0, -1000000, 1000000),
      y: finite(first(get(source, 'y'), get(position, 'y'), get(root, 'y')), 0, -1000000, 1000000),
      facing: finite(get(source, 'facing'), Math.PI * 0.5, -1000, 1000),
      health: health,
      maxHealth: maxHealth,
      gold: Math.floor(finite(first(get(source, 'gold'), get(root, 'gold')), 0, 0, 1000000000)),
      potions: Math.floor(finite(get(source, 'potions'), 0, 0, 9999)),
      level: Math.floor(finite(get(source, 'level'), 1, 1, 999)),
      experience: Math.floor(finite(first(get(source, 'experience'), get(source, 'xp')), 0, 0, 1000000000)),
      baseStats: baseStats,
      baseMaxHealth: baseStats.maxHealth,
      baseDamage: baseStats.damage,
      baseDefense: baseStats.defense,
      baseMoveSpeed: baseStats.moveSpeed
    };
    const extraStats = get(source, 'stats');
    if (extraStats && typeof extraStats === 'object') output.stats = cleanPlain(extraStats, 0, { count: 0 });
    return output;
  }

  function sanitizeWorld(raw, root, player) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    let id = first(get(source, 'id'), get(source, 'worldId'), get(root, 'currentWorld'), get(root, 'worldId'), (typeof raw === 'string' || typeof raw === 'number' ? raw : undefined), 0);
    if (typeof id === 'number') id = Math.floor(finite(id, 0, 0, 999));
    else id = cleanString(id, 'elaria', 64);
    const rawPosition = first(get(source, 'position'), get(root, 'position'), {});
    return {
      id: id,
      position: {
        x: finite(first(get(rawPosition, 'x'), player.x), player.x, -1000000, 1000000),
        y: finite(first(get(rawPosition, 'y'), player.y), player.y, -1000000, 1000000)
      },
      checkpoint: cleanString(first(get(source, 'checkpoint'), get(root, 'checkpoint')), '', 80),
      entrance: cleanString(first(get(source, 'entrance'), get(root, 'entrance')), '', 80)
    };
  }

  function sanitizeSettings(raw, rootDifficulty) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const difficultyValue = cleanString(first(get(source, 'difficulty'), rootDifficulty), 'normal', 16).toLowerCase();
    const bindings = cleanPlain(get(source, 'bindings'), 0, { count: 0 }) || {};
    return {
      musicVolume: finite(first(get(source, 'musicVolume'), get(source, 'music')), 0.48, 0, 1),
      sfxVolume: finite(first(get(source, 'sfxVolume'), get(source, 'sfx')), 0.72, 0, 1),
      screenShake: get(source, 'screenShake') !== false,
      fullscreen: get(source, 'fullscreen') === true,
      uiScale: finite(get(source, 'uiScale'), 1, 0.75, 1.35),
      particleDensity: finite(get(source, 'particleDensity'), 1, 0.25, 1.5),
      colorblind: ['none','deuter','protan','tritan'].indexOf(cleanString(get(source, 'colorblind'), 'none', 16)) >= 0 ? cleanString(get(source, 'colorblind'), 'none', 16) : 'none',
      reducedFlashes: get(source, 'reducedFlashes') === true,
      highContrast: get(source, 'highContrast') === true,
      bindings: bindings,
      difficulty: ['easy', 'normal', 'hard', 'nightmare'].indexOf(difficultyValue) >= 0 ? difficultyValue : 'normal'
    };
  }

  function sanitizeStats(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const output = cleanPlain(source, 0, { count: 0 }) || {};
    ['enemiesDefeated', 'bossesDefeated', 'goldCollected', 'totalGoldCollected', 'deaths', 'chestsOpened'].forEach(function (key) {
      if (get(source, key) !== undefined) output[key] = Math.floor(finite(get(source, key), 0, 0, 1000000000));
    });
    return output;
  }

  function idList(value) {
    const output = [];
    const seen = new Set();
    const add = function (candidate) {
      const id = cleanString(candidate, '', 100);
      if (id && !seen.has(id)) { seen.add(id); output.push(id); }
    };
    if (Array.isArray(value)) value.slice(0, 1000).forEach(add);
    else if (value && typeof value === 'object') {
      Object.keys(value).slice(0, 1000).forEach(function (key) {
        const state = get(value, key);
        if (state === true || state === 'complete' || state === 'completed' || (state && typeof state === 'object' && (state.complete || state.completed))) add(key);
      });
    }
    return output;
  }

  function sanitizeSave(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const version = Math.floor(finite(get(raw, 'version'), SAVE_VERSION, 1, 999));
    if (version > SAVE_VERSION) return null;
    const player = sanitizePlayer(get(raw, 'player'), raw);
    const world = sanitizeWorld(get(raw, 'world'), raw, player);
    const inventory = sanitizeItems(get(raw, 'inventory'), first(get(raw, 'equipment'), get(get(raw, 'inventory', {}), 'equipment')));
    const settings = sanitizeSettings(get(raw, 'settings'), get(raw, 'difficulty'));
    const quests = cleanPlain(first(get(raw, 'quests'), {}), 0, { count: 0 }) || {};
    const bosses = cleanPlain(first(get(raw, 'bosses'), get(raw, 'bossesDefeated'), {}), 0, { count: 0 }) || {};
    const chests = cleanPlain(first(get(raw, 'chests'), get(raw, 'chestsOpened'), {}), 0, { count: 0 }) || {};
    const progression = cleanPlain(first(get(raw, 'progression'), get(raw, 'remaster'), {}), 0, { count: 0 }) || {};
    const playtime = finite(first(get(raw, 'playtime'), get(raw, 'playTime')), 0, 0, 315360000);
    const checkpointSource = get(raw, 'checkpoint', {});
    let checkpointWorld = first(get(checkpointSource, 'worldId'), get(checkpointSource, 'world'), world.id);
    checkpointWorld = typeof checkpointWorld === 'number'
      ? Math.floor(finite(checkpointWorld, typeof world.id === 'number' ? world.id : 0, 0, 999))
      : cleanString(checkpointWorld, typeof world.id === 'string' ? world.id : 'elaria', 64);
    const checkpoint = {
      worldId: checkpointWorld,
      x: finite(first(get(checkpointSource, 'x'), world.position.x), world.position.x, -1000000, 1000000),
      y: finite(first(get(checkpointSource, 'y'), world.position.y), world.position.y, -1000000, 1000000)
    };
    return {
      version: SAVE_VERSION,
      savedAt: Math.floor(finite(get(raw, 'savedAt'), Date.now(), 0, 9007199254740991)),
      reason: cleanString(get(raw, 'reason'), 'manual', 48),
      player: player,
      playerName: player.name,
      world: world,
      worldId: world.id,
      currentWorld: world.id,
      position: { x: world.position.x, y: world.position.y },
      checkpoint: checkpoint,
      inventory: inventory,
      equipment: Object.assign({}, inventory.equipment),
      settings: settings,
      difficulty: settings.difficulty,
      ngPlus: Math.floor(finite(get(raw, 'ngPlus'), 0, 0, 99)),
      endingChoice: cleanString(get(raw, 'endingChoice'), '', 24),
      playtime: playtime,
      stats: sanitizeStats(get(raw, 'stats')),
      quests: quests,
      bosses: bosses,
      bossesDefeated: idList(bosses),
      chests: chests,
      chestsOpened: idList(chests),
      progression: progression,
      achievements: idList(first(get(raw, 'achievements'), get(progression, 'achievements'), [])),
      worldDiscoveries: idList(first(get(raw, 'worldDiscoveries'), get(progression, 'worldDiscoveries'), [])),
      fastTravelPoints: idList(first(get(raw, 'fastTravelPoints'), get(progression, 'fastTravelPoints'), []))
    };
  }

  function gatherGame(game, reason) {
    let root = serialized(game) || {};
    if (!root || typeof root !== 'object' || Array.isArray(root)) root = {};
    const gamePlayer = get(game, 'player');
    const gameWorld = get(game, 'world');
    const gameInventory = first(get(game, 'inventory'), get(gamePlayer, 'inventory'));
    const gameQuests = first(get(game, 'quests'), get(game, 'questManager'));
    const player = first(get(root, 'player'), serialized(gamePlayer), gamePlayer, {});
    let world = first(get(root, 'world'), serialized(gameWorld));
    if (!world) {
      world = {
        id: first(get(root, 'currentWorld'), get(root, 'worldId'), get(game, 'currentWorld'), get(game, 'worldId'), get(gameWorld, 'id'), 0),
        position: { x: first(get(player, 'x'), 0), y: first(get(player, 'y'), 0) }
      };
    }
    const inventory = first(get(root, 'inventory'), serialized(gameInventory), gameInventory, {});
    const quests = first(get(root, 'quests'), serialized(gameQuests), gameQuests && get(gameQuests, 'states'), {});
    const settings = first(get(root, 'settings'), get(game, 'settings'), {});
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      reason: reason || 'manual',
      player: player,
      playerName: first(get(root, 'playerName'), get(player, 'name')),
      world: world,
      currentWorld: first(get(root, 'currentWorld'), get(root, 'worldId'), get(game, 'currentWorld'), get(game, 'worldId'), get(world, 'id')),
      position: first(get(root, 'position'), get(world, 'position')),
      inventory: inventory,
      equipment: first(get(root, 'equipment'), get(inventory, 'equipment')),
      settings: settings,
      difficulty: first(get(root, 'difficulty'), get(settings, 'difficulty'), get(game, 'difficultyName'), get(game, 'difficulty')),
      ngPlus: first(get(root, 'ngPlus'), get(game, 'ngPlus'), 0),
      endingChoice: first(get(root, 'endingChoice'), get(game, 'endingChoice'), ''),
      playtime: first(get(root, 'playtime'), get(root, 'playTime'), get(game, 'playtime'), get(game, 'playTime'), 0),
      checkpoint: first(get(root, 'checkpoint'), get(game, 'checkpoint')),
      stats: first(get(root, 'stats'), get(game, 'stats'), {}),
      quests: quests,
      bosses: first(get(root, 'bosses'), get(root, 'bossesDefeated'), get(game, 'bossesDefeated'), get(game, 'bosses'), {}),
      chests: first(get(root, 'chests'), get(root, 'chestsOpened'), get(game, 'chestsOpened'), get(game, 'chests'), {}),
      progression: first(get(root, 'progression'), serialized(get(game, 'progression')), {}),
      achievements: first(get(root, 'achievements'), get(get(root, 'progression'), 'achievements'), []),
      worldDiscoveries: first(get(root, 'worldDiscoveries'), get(get(root, 'progression'), 'worldDiscoveries'), []),
      fastTravelPoints: first(get(root, 'fastTravelPoints'), get(get(root, 'progression'), 'fastTravelPoints'), [])
    };
  }

  class SaveSystem {
    constructor(game) {
      this.game = game || null;
      this.key = SAVE_KEY;
      this.lastError = null;
    }

    _storage() {
      try {
        return global.localStorage || null;
      } catch (error) {
        this.lastError = error;
        return null;
      }
    }

    hasSave() {
      const storage = this._storage();
      if (!storage) return false;
      try {
        const raw = storage.getItem(this.key);
        if (!raw) return false;
        return Boolean(sanitizeSave(JSON.parse(raw)));
      } catch (error) {
        this.lastError = error;
        return false;
      }
    }

    save(game, reason) {
      let target = game;
      let saveReason = reason;
      if (typeof game === 'string') {
        saveReason = game;
        target = this.game;
      }
      if (!target || typeof target !== 'object') target = this.game;
      if (!target) return false;
      const storage = this._storage();
      if (!storage) return false;
      try {
        const data = sanitizeSave(gatherGame(target, cleanString(saveReason, 'manual', 48)));
        if (!data) return false;
        storage.setItem(this.key, JSON.stringify(data));
        this.lastError = null;
        safeCall(target, 'onSaved', data, data.reason);
        safeCall(target && target.ui, 'showSaveIndicator', data.reason);
        return true;
      } catch (error) {
        this.lastError = error;
        return false;
      }
    }

    load() {
      const storage = this._storage();
      if (!storage) return null;
      try {
        const text = storage.getItem(this.key);
        if (!text || text.length > 5000000) return null;
        const data = sanitizeSave(JSON.parse(text));
        if (!data) return null;
        this.lastError = null;
        return data;
      } catch (error) {
        this.lastError = error;
        return null;
      }
    }

    clear() {
      const storage = this._storage();
      if (!storage) return false;
      try {
        storage.removeItem(this.key);
        this.lastError = null;
        safeCall(this.game, 'onSaveCleared');
        return true;
      } catch (error) {
        this.lastError = error;
        return false;
      }
    }
  }

  SaveSystem.KEY = SAVE_KEY;
  SaveSystem.VERSION = SAVE_VERSION;
  SaveSystem.sanitize = sanitizeSave;
  E.SAVE_KEY = SAVE_KEY;
  E.SaveSystem = SaveSystem;
})(window);
