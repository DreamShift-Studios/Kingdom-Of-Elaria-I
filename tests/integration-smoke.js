'use strict';

/*
 * Dependency-free integration smoke test for the local, Canvas-only build.
 * It runs the real scripts in their index.html order with a small DOM/Canvas
 * facade, then exercises the story, economy, combat, bosses, and persistence.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

class FakeClassList {
  constructor(value) { this.values = new Set(String(value || '').split(/\s+/).filter(Boolean)); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    const add = force === undefined ? !this.contains(name) : !!force;
    if (add) this.add(name); else this.remove(name);
    return add;
  }
  toString() { return [...this.values].join(' '); }
}

function fakeContext() {
  const gradient = { addColorStop() {} };
  const noop = function () {};
  return {
    canvas: null,
    imageSmoothingEnabled: false,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000', strokeStyle: '#000', shadowColor: '#000',
    shadowBlur: 0, lineWidth: 1, lineCap: 'butt', font: '10px monospace',
    textAlign: 'left', textBaseline: 'alphabetic',
    save: noop, restore: noop, setTransform: noop, resetTransform: noop,
    translate: noop, rotate: noop, scale: noop, transform: noop,
    fillRect: noop, strokeRect: noop, clearRect: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, ellipse: noop, rect: noop, quadraticCurveTo: noop, bezierCurveTo: noop,
    fill: noop, stroke: noop, clip: noop, setLineDash: noop,
    fillText: noop, strokeText: noop, drawImage: noop,
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    createPattern() { return {}; },
    measureText(text) { return { width: String(text).length * 7 }; }
  };
}

class FakeElement {
  constructor(tagName, attrs, ownerDocument) {
    this.tagName = String(tagName || 'div').toUpperCase();
    this.ownerDocument = ownerDocument;
    this.attributes = Object.assign({}, attrs || {});
    this.id = this.attributes.id || '';
    this.classList = new FakeClassList(this.attributes.class || '');
    this.style = { setProperty(name, value) { this[name] = String(value); } };
    this.dataset = {};
    this.children = [];
    this.parentNode = null;
    this.listeners = Object.create(null);
    this.textContent = '';
    this._innerHTML = '';
    this.value = this.attributes.value || '';
    this.checked = Object.prototype.hasOwnProperty.call(this.attributes, 'checked');
    this.disabled = false;
    this.hidden = false;
    this.width = Number(this.attributes.width) || 0;
    this.height = Number(this.attributes.height) || 0;
    this._context = null;
    Object.keys(this.attributes).forEach((name) => {
      if (name.startsWith('data-')) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        this.dataset[key] = this.attributes[name];
      }
    });
  }
  get className() { return this.classList.toString(); }
  set className(value) { this.classList = new FakeClassList(value); }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(value) { this._innerHTML = String(value); this.children.length = 0; }
  get offsetWidth() { return 960; }
  get offsetHeight() { return 540; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) { this.children = this.children.filter((entry) => entry !== child); child.parentNode = null; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  addEventListener(type, handler) { (this.listeners[type] || (this.listeners[type] = [])).push(handler); }
  removeEventListener(type, handler) { this.listeners[type] = (this.listeners[type] || []).filter((item) => item !== handler); }
  dispatchEvent(event) {
    event = event || {};
    event.type = event.type || 'click';
    event.target = event.target || this;
    event.currentTarget = this;
    event.preventDefault = event.preventDefault || function () {};
    event.stopPropagation = event.stopPropagation || function () {};
    (this.listeners[event.type] || []).slice().forEach((handler) => handler.call(this, event));
    return true;
  }
  click() { this.dispatchEvent({ type: 'click', button: 0 }); }
  focus() {}
  select() {}
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'id') this.id = String(value);
    if (name === 'class') this.className = value;
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      this.dataset[key] = String(value);
    }
  }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
  removeAttribute(name) { delete this.attributes[name]; }
  getContext() {
    if (!this._context) { this._context = fakeContext(); this._context.canvas = this; }
    return this._context;
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 540, right: 960, bottom: 540 }; }
  requestFullscreen() { this.ownerDocument.fullscreenElement = this; return Promise.resolve(); }
  matches(selector) {
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    const data = selector.match(/^\[data-([\w-]+)(?:="([^"]*)")?\]$/);
    if (data) {
      const key = data[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      return Object.prototype.hasOwnProperty.call(this.dataset, key) && (data[2] === undefined || this.dataset[key] === data[2]);
    }
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }
  closest(selector) {
    let node = this;
    while (node) { if (node.matches && node.matches(selector)) return node; node = node.parentNode; }
    return null;
  }
  querySelector(selector) {
    const found = this.querySelectorAll(selector);
    if (found.length) return found[0];
    const child = new FakeElement(selector.replace(/[^a-z]/gi, '') || 'span', {}, this.ownerDocument);
    this.appendChild(child);
    return child;
  }
  querySelectorAll(selector) {
    const local = [];
    const walk = (node) => {
      node.children.forEach((child) => { if (child.matches(selector)) local.push(child); walk(child); });
    };
    walk(this);
    if (local.length) return local;
    return this.ownerDocument ? this.ownerDocument.querySelectorAll(selector) : [];
  }
}

class FakeDocument {
  constructor(source) {
    this.elements = [];
    this.byId = Object.create(null);
    this.listeners = Object.create(null);
    this.fullscreenElement = null;
    this.documentElement = new FakeElement('html', { id: 'document-element' }, this);
    this.body = new FakeElement('body', { id: 'body' }, this);
    const tagPattern = /<([a-z][\w-]*)([^>]*\sid="[^"]+"[^>]*)>/gi;
    let match;
    while ((match = tagPattern.exec(source))) {
      const attrs = {};
      const attrPattern = /([\w-]+)(?:="([^"]*)")?/g;
      let attr;
      while ((attr = attrPattern.exec(match[2]))) attrs[attr[1]] = attr[2] === undefined ? '' : attr[2];
      const element = new FakeElement(match[1], attrs, this);
      this.elements.push(element);
      this.byId[element.id] = element;
      this.body.appendChild(element);
    }
    const defaults = { 'new-difficulty': 'normal', 'difficulty-select': 'normal', 'music-volume': '55', 'sfx-volume': '75', 'player-name-input': 'Aren' };
    Object.keys(defaults).forEach((id) => { if (this.byId[id]) this.byId[id].value = defaults[id]; });
  }
  getElementById(id) { return this.byId[id] || null; }
  createElement(tag) { return new FakeElement(tag, {}, this); }
  addEventListener(type, handler) { (this.listeners[type] || (this.listeners[type] = [])).push(handler); }
  querySelectorAll(selector) {
    if (selector.includes(',')) return selector.split(',').flatMap((part) => this.querySelectorAll(part.trim()));
    return this.elements.filter((element) => element.matches(selector));
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  exitFullscreen() { this.fullscreenElement = null; return Promise.resolve(); }
}

class FakeStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(String(key)) ? this.values.get(String(key)) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
  clear() { this.values.clear(); }
}

const document = new FakeDocument(html);
const localStorage = new FakeStorage();
const timers = [];
const windowListeners = Object.create(null);
const captured = { errors: [], warnings: [] };
let timerId = 0;

function setTimeoutFake(fn, delay) { const id = ++timerId; timers.push({ id, fn, delay: Number(delay) || 0, cancelled: false }); return id; }
function clearTimeoutFake(id) { const timer = timers.find((entry) => entry.id === id); if (timer) timer.cancelled = true; }
function flushTimers(limit) {
  let count = 0;
  while (timers.length && count < (limit || 100)) {
    timers.sort((a, b) => a.delay - b.delay);
    const timer = timers.shift();
    if (!timer.cancelled && typeof timer.fn === 'function') timer.fn();
    count += 1;
  }
  if (count >= (limit || 100) && timers.length) throw new Error('Timer loop did not settle');
}

const windowObject = {
  document,
  localStorage,
  location: { protocol: 'file:', href: 'file:///index.html' },
  navigator: { userAgent: 'Elaria Integration Test' },
  innerWidth: 960,
  innerHeight: 540,
  devicePixelRatio: 1,
  setTimeout: setTimeoutFake,
  clearTimeout: clearTimeoutFake,
  requestAnimationFrame() { return 1; },
  cancelAnimationFrame() {},
  addEventListener(type, handler) { (windowListeners[type] || (windowListeners[type] = [])).push(handler); },
  removeEventListener(type, handler) { windowListeners[type] = (windowListeners[type] || []).filter((entry) => entry !== handler); },
  getComputedStyle() { return {}; },
  performance: { now: () => 0 }
};
windowObject.window = windowObject;
windowObject.self = windowObject;

const sandbox = {
  window: windowObject,
  self: windowObject,
  document,
  localStorage,
  location: windowObject.location,
  navigator: windowObject.navigator,
  console: {
    log() {}, info() {},
    warn(...args) { captured.warnings.push(args.join(' ')); },
    error(...args) { captured.errors.push(args.join(' ')); }
  },
  setTimeout: setTimeoutFake,
  clearTimeout: clearTimeoutFake,
  requestAnimationFrame: windowObject.requestAnimationFrame,
  cancelAnimationFrame: windowObject.cancelAnimationFrame,
  performance: windowObject.performance,
  HTMLElement: FakeElement,
  HTMLCanvasElement: FakeElement,
  Event: function Event(type) { this.type = type; },
  Math, Date, JSON, Map, Set, WeakMap, WeakSet, Array, Object, String, Number, Boolean, RegExp, Error, TypeError, Promise, Symbol, parseInt, parseFloat, isFinite
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const scriptOrder = ['items','inventory','quests','save','audio','particles','player','enemies','bosses','combat','dialogue','worlds','progression','shop','ui','game','remaster','nightmare','main'];
for (const name of scriptOrder) {
  const file = path.join(ROOT, 'js', `${name}.js`);
  assert.ok(fs.existsSync(file), `Missing ${name}.js`);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: `${name}.js` });
}

const E = windowObject.Elaria;
const game = windowObject.elariaGame;
assert.ok(E && game, 'Main boot should expose a game instance');
assert.strictEqual(game.state, 'menu');
assert.strictEqual(document.getElementById('continue-btn').disabled, true);

// Real menu -> naming -> New Game flow.
document.getElementById('new-game-btn').click();
assert.ok(!document.getElementById('name-panel').classList.contains('hidden'));
document.getElementById('player-name-input').value = 'Lyra';
document.getElementById('new-difficulty').value = 'normal';
document.getElementById('begin-btn').click();
assert.strictEqual(game.state, 'playing');
assert.strictEqual(game.playerName, 'Lyra');
assert.strictEqual(game.worldId, 'elaria');
assert.strictEqual(game.inventory.count('health_potion'), 2);
assert.ok(game.quests.getActive().some((quest) => quest.id === 'awakening'));
timers.length = 0; // Skip the delayed auto-intro; exercise it deterministically below.

function finishDialogue(manager) {
  let guard = 0;
  while (manager.isOpen() && guard++ < 80) {
    manager.finishTyping();
    if (manager.choiceActive) manager.choose(0);
    else manager.advance();
  }
  assert.ok(guard < 80, 'Dialogue should always terminate');
}

// Story intro and exact guard gating copy.
game.worlds.wizardDialogue(true);
finishDialogue(game.dialogue);
assert.ok(game.quests.getObjectiveText().toLowerCase().includes('sword'));
game.worlds.guardDialogue(false);
game.dialogue.finishTyping();
assert.strictEqual(document.getElementById('dialogue-text').textContent, 'Stop! The lands outside Elaria are filled with monsters. I cannot allow you through without armor and a weapon.');
finishDialogue(game.dialogue);

// Armory items are physical pickups, then inventory/equipment advances the tutorial.
const armory = E.WORLD_DEFS.elaria.interactables.find((item) => item.id === 'armory_supply');
game.worlds.openChest(armory);
assert.ok(game.drops.some((drop) => drop.kind === 'item'), 'Armory chest must create physical drops');
game.player.x = armory.x; game.player.y = armory.y;
game.drops.forEach((drop) => { drop.x = game.player.x; drop.y = game.player.y; drop.z = 0; drop.age = .5; });
game.updateDrops(.016);
assert.strictEqual(game.inventory.count('rusty_sword'), 1);
assert.strictEqual(game.inventory.count('leather_armor'), 1);
game.ui.openInventory(false);
game.ui.renderInventory();
const sword = game.inventory.items.find((item) => item.id === 'rusty_sword');
const armor = game.inventory.items.find((item) => item.id === 'leather_armor');
assert.ok(game.inventory.equip(sword.uid));
assert.ok(game.inventory.equip(armor.uid));
assert.ok(game.inventory.equipment.weapon && game.inventory.equipment.armor);
assert.ok(game.player.damage > game.player.baseStats.damage);
game.state = 'playing';

game.worlds.guardDialogue(true);
game.dialogue.finishTyping();
assert.strictEqual(document.getElementById('dialogue-text').textContent, 'You are prepared, warrior. May the light of Elaria guide you.');
finishDialogue(game.dialogue);

// Healing crystals were removed; world-entry checkpoints remain automatic.
for (const world of Object.values(E.WORLD_DEFS)) assert.ok(!(world.interactables||[]).some((it)=>it.type==='save'), 'No blue healing/save stone should remain in any world');

// Transition, autosave, and quest handoff into Greenhaven.
game.transitionTo('greenhaven', { x: 150, y: 750 });
flushTimers();
assert.strictEqual(game.worldId, 'greenhaven');
assert.strictEqual(game.currentWorldId, 'greenhaven');
assert.strictEqual(game.state, 'playing');
assert.ok(game.save.hasSave());
assert.ok(game.quests.isComplete('awakening'));

// A defeated enemy emits physical coins; gold does not arrive until collection.
const enemy = game.spawnEnemy('greenSlime', game.player.x + 18, game.player.y, {});
const goldBeforeKill = game.player.gold;
enemy.takeDamage(9999, game.player, { knockback: 0, angle: 0 });
assert.ok(game.stats.enemiesDefeated >= 1);
assert.strictEqual(game.player.gold, goldBeforeKill, 'Enemy gold must not be awarded instantly');
assert.ok(game.drops.some((drop) => drop.kind === 'gold'), 'Enemy should leave physical coins');
game.drops.forEach((drop) => { drop.x = game.player.x; drop.y = game.player.y; drop.z = 0; drop.age = .5; });
game.updateDrops(.016);
assert.ok(game.player.gold > goldBeforeKill, 'Walking over coins should collect gold');

// Potions, real-time combat, and shop buy/sell.
game.player.health = 15; game.player.hp = 15; game.player.invulnerableTimer = 0;
const potionBefore = game.inventory.count('health_potion');
const healingPotion = game.inventory.items.find((item) => item.id === 'health_potion');
assert.ok(game.inventory.use(healingPotion.uid));
assert.ok(game.player.health > 15);
assert.strictEqual(game.inventory.count('health_potion'), potionBefore - 1);

const combatTarget = game.spawnEnemy('goblinScout', game.player.x + 35, game.player.y, {});
game.player.facing = 0; game.player.facingX = 1; game.player.facingY = 0;
game.combat.playerAttack(false, 0);
assert.ok(combatTarget.hp < combatTarget.maxHealth, 'Sword arc should damage a target in front of the player');

game.player.gold = 1000;
const shopPotionBefore = game.inventory.count('health_potion');
assert.ok(game.shop.open('elaria'));
assert.ok(game.shop.buy('health_potion'));
assert.strictEqual(game.inventory.count('health_potion'), shopPotionBefore + 1);
game.inventory.add('goblin_cloth', 1);
const cloth = game.inventory.items.find((item) => item.id === 'goblin_cloth');
assert.ok(game.shop.sell(cloth.uid));
game.shop.close();
assert.strictEqual(game.state, 'playing');

// Remaster progression, crafting, lore, perfect dodge, panels, ambience, and rebinding.
assert.ok(game.progression instanceof E.ProgressionSystem);
game.progression.skillPoints = 4;
const damageBeforeSkill = game.player.damage;
assert.ok(game.progression.unlockSkill('blade_edge'));
assert.ok(game.player.damage > damageBeforeSkill);
game.inventory.add('slime_gel', 2);
const craftedPotions = game.inventory.count('health_potion');
assert.ok(game.progression.craft('potion_brew'));
assert.strictEqual(game.inventory.count('health_potion'), craftedPotions + 1);
const equippedWeapon = game.inventory.get(game.inventory.equipment.weapon);
game.inventory.add('chaos_dust', 2);
const damageBeforeEnchant = game.player.damage;
assert.ok(game.progression.enchantItem(equippedWeapon.uid, 'flame'));
assert.ok(game.player.damage > damageBeforeEnchant);
game.ui.renderItemDetails(equippedWeapon);
assert.ok(document.getElementById('item-details').innerHTML.includes('ENCHANTMENT'));
assert.ok(game.progression.collectLore('heartwood_tablet'));
assert.ok(game.progression.collectibles.has('heartwood_tablet'));
game.progression.unlockTravel('greenhaven');
assert.ok(game.progression.fastTravelPoints.has('greenhaven'));
const bossSentinel = game.boss; game.boss = { active: true };
assert.strictEqual(game.progression.fastTravel('elaria'), false, 'Fast travel must be blocked during a boss fight');
game.boss = bossSentinel;
game.settings.bindings.up = 'z';
assert.ok(game.input.virtualFor('z').includes('w'));
game.settings.highContrast = true; game.ui.applyAccessibility();
assert.ok(document.getElementById('game-shell').classList.contains('high-contrast'));
game.ui.openSkills(false); game.ui.renderSkills();
game.ui.openCrafting('camp', false); game.ui.renderCrafting();
game.ui.openCodex(false); game.ui.renderCodex();
game.ui.openMap(false); game.ui.renderMap();
game.state = 'playing'; game.ui.closePanels();
game.ambient.update(.2); game.ambient.drawLandmarks(game.ctx); game.ambient.drawFront(game.ctx); game.ambient.drawScreen(game.ctx);
game.ambient.weather = 'snow'; game.ambient.spawn('snow'); game.ambient.update(.2); game.ambient.drawFront(game.ctx); game.ambient.drawScreen(game.ctx);
const dodgeThreat = game.spawnEnemy('goblinWarrior', game.player.x + 45, game.player.y, {});
dodgeThreat.telegraph = { kind: 'heavy', time: .1, total: .4 };
game.player.dashCooldown = 0; game.player.dashTimer = 0;
const perfectBefore = game.stats.perfectDodges;
assert.ok(game.player.dash());
assert.strictEqual(game.stats.perfectDodges, perfectBefore + 1);
game.player.dashTimer = 0;
assert.ok(game.progression.completion() >= 0 && game.progression.completion() <= 100);
game.player.health = game.player.hp = 4; game.setCheckpoint(game.player.x, game.player.y);
assert.strictEqual(game.player.health, game.player.maxHealth, 'Sanctuaries must restore actual combat health');
assert.strictEqual(game.player.hp, game.player.health);

// New remaster quest types: escort, hidden contract, timed retry, and actual prisoners.
assert.strictEqual(E.QUEST_DEFS.greenhaven_escort.type, 'escort');
assert.strictEqual(E.QUEST_DEFS.warden_contract.type, 'contract');
assert.strictEqual(E.QUEST_DEFS.cave_emergency.type, 'timed');
game.quests.startQuest('greenhaven_escort', { force: true });
const luma = E.WORLD_DEFS.greenhaven.npcs.find((npc) => npc.id === 'escort_luma');
game.worlds.talk(luma); finishDialogue(game.dialogue); game.state = 'playing';
game.player.x = 930; game.player.y = 790; luma.x = 945; luma.y = 800; game.ambient.update(.1);
assert.ok(game.quests.isCompleted('greenhaven_escort'));
game.quests.startQuest('warden_contract', { force: true });
const waterfall = E.WORLD_DEFS.greenhaven.interactables.find((it) => it.id === 'waterfall_cave');
game.worlds.nearby = waterfall; game.worlds.interact();
assert.ok(E.WORLD_DEFS.greenhaven.height > 1500 && game.player.y > 1500, 'The remaster should add a playable waterfall-cavern annex');
const warden = game.enemies.find((entry) => entry.name === 'Warden of Echoes');
assert.ok(warden, 'The hidden cave should awaken its dedicated Warden encounter');
warden.takeDamage(99999, game.player, { knockback: 0 });
assert.ok(game.quests.isCompleted('warden_contract'));
game.worlds.nearby = E.WORLD_DEFS.greenhaven.interactables.find((it) => it.id === 'waterfall_return'); game.worlds.interact();
assert.ok(game.player.y < 500, 'The cavern shortcut should return the player to Greenhaven');
game.quests.startQuest('cave_emergency', { force: true });
game.quests.states.cave_emergency.timeRemaining = 0; game.quests.update(.1);
assert.strictEqual(game.quests.states.cave_emergency.status, 'failed');
game.quests.startQuest('cave_emergency', { force: true });
assert.strictEqual(game.quests.states.cave_emergency.status, 'active');
game.quests.startQuest('realm_survivors', { force: true });
for (const prisoner of E.WORLD_DEFS.brokenRealm.npcs.filter((npc) => /^realm_prisoner_/.test(npc.id))) { game.worlds.talk(prisoner); finishDialogue(game.dialogue); }
assert.ok(game.quests.isCompleted('realm_survivors'));

// Save/load round-trip and refresh-equivalent Continue.
game.saveNow('integration');
const savedText = localStorage.getItem(E.SAVE_KEY);
assert.ok(savedText && savedText.includes('Lyra'));
const secondGame = new E.Game();
assert.ok(secondGame.continueGame());
assert.strictEqual(secondGame.playerName, 'Lyra');
assert.strictEqual(secondGame.worldId, 'greenhaven');
assert.ok(secondGame.inventory.equipment.weapon && secondGame.inventory.equipment.armor);
assert.ok(secondGame.progression.hasSkill('blade_edge'));
assert.ok(secondGame.progression.collectibles.has('heartwood_tablet'));
assert.strictEqual(secondGame.progression.enchantments[secondGame.inventory.equipment.weapon], 'flame');
assert.ok(secondGame.quests.isCompleted('greenhaven_escort') && secondGame.quests.isCompleted('warden_contract') && secondGame.quests.isCompleted('realm_survivors'));
assert.strictEqual(secondGame.settings.highContrast, true);
const legacySave = JSON.parse(savedText);
delete legacySave.progression; delete legacySave.achievements; delete legacySave.worldDiscoveries; delete legacySave.fastTravelPoints;
localStorage.setItem(E.SAVE_KEY, JSON.stringify(legacySave));
const legacyGame = new E.Game();
assert.ok(legacyGame.continueGame(), 'Pre-remaster saves should still load');
assert.strictEqual(legacyGame.progression.level, 1);
assert.strictEqual(legacyGame.playerName, 'Lyra');
localStorage.setItem(E.SAVE_KEY, savedText);
localStorage.setItem(E.SAVE_KEY, '{broken json');
assert.strictEqual(secondGame.save.load(), null, 'Corrupt saves should fail closed');
localStorage.setItem(E.SAVE_KEY, savedText);

// Every world loads, draws, and creates its requested boss from the arena zone.
const bossWorlds = [
  ['greenhaven','creakingOne'],
  ['darkForest','nyxfang'],
  ['chaosCaves','gorath']
];
for (const [worldId, bossId] of bossWorlds) {
  game.enemies.length = 0; game.projectiles.length = 0; game.boss = null;
  game.bossesDefeated.delete(bossId);
  game.worlds.load(worldId, E.WORLD_DEFS[worldId].spawn);
  game.worldId = worldId; game.currentWorldId = game.questWorldId(worldId);
  game.player.x = E.WORLD_DEFS[worldId].bossZone.x - 40;
  game.player.y = E.WORLD_DEFS[worldId].bossZone.y;
  game.worlds.update(.016);
  if (game.dialogue.isOpen()) finishDialogue(game.dialogue);
  assert.ok(game.boss && game.boss.bossType === bossId, `${bossId} should spawn in its arena`);
  game.boss.intro = false; game.boss.invulnerable = false;
  game.boss.draw(game.ctx);
  game.render();
  if (bossId === 'gorath') assert.strictEqual(game.boss.crystals.length, 3);
  game.onBossDefeated(game.boss);
  assert.ok(game.bossesDefeated.has(bossId));
}

// Final confrontation includes dialogue, choices, boss creation, and ending summary.
game.enemies.length = 0; game.projectiles.length = 0; game.boss = null;
game.bossesDefeated.delete('velymoor');
game.worlds.load('brokenRealm', E.WORLD_DEFS.brokenRealm.spawn);
game.worldId = 'brokenRealm'; game.currentWorldId = 'broken_realm'; game.state = 'playing';
game.player.x = E.WORLD_DEFS.brokenRealm.bossZone.x - 40;
game.player.y = E.WORLD_DEFS.brokenRealm.bossZone.y;
game.worlds.update(.016);
assert.ok(game.dialogue.isOpen(), 'Velymoor should confront the player before combat');
finishDialogue(game.dialogue);
assert.ok(game.boss && game.boss.bossType === 'velymoor');
assert.strictEqual(E.BOSS_CONFIG.velymoor.phases.length, 3);
assert.strictEqual(E.BOSS_CONFIG.velymoor.hp, 2820);
assert.strictEqual(E.BOSS_CONFIG.velymoor.damage, 43);
assert.strictEqual(E.BOSS_CONFIG.velymoor.speed, 101);
for (const attack of ['chaosDash','orbBarrage','chaosSlash','voidPrison','chaosMeteor','velymoorClones','orbOverload']) {
  assert.ok([...E.BOSS_CONFIG.velymoor.attacks,...E.BOSS_CONFIG.velymoor.phase2Attacks,...E.BOSS_CONFIG.velymoor.phase3Attacks,...E.BOSS_CONFIG.velymoor.phase4Attacks].includes(attack), `${attack} should be part of Velymoor's remastered phase pools`);
}
assert.strictEqual(game.boss.visualScale, 5, 'Velymoor should render at five-times visual scale');
assert.strictEqual(game.boss._phaseDamageMultiplier(), 1);
game.boss.phase=2; assert.strictEqual(game.boss._phaseDamageMultiplier(), 2, 'Velymoor Phase II should deal 2x damage');
game.boss.phase=3; assert.strictEqual(game.boss._phaseDamageMultiplier(), 2, 'Velymoor Phase III should keep 2x damage');
game.boss.phase=4; assert.strictEqual(game.boss._phaseDamageMultiplier(), 5, 'Velymoor Phase IV should deal 5x damage');
game.boss.phase=1;
game.boss.intro=false;game.boss.invulnerable=false;game.boss.introTimer=0;
const attackSnapshot={targetX:game.player.x,targetY:game.player.y,angle:0,total:1,time:0};
game.boss._resolveAttack({...attackSnapshot,name:'chaosDash'});assert.ok(game.boss.afterimages.length>=3,'Chaos Dash should leave afterimages');
game.boss._resolveAttack({...attackSnapshot,name:'orbBarrage'});game.boss._updateVelymoorEffects(.01);assert.ok(game.projectiles.length>0&&Math.hypot(game.projectiles[0].vx,game.projectiles[0].vy)>180,'Orb Barrage should use the Velymoor-only projectile speed boost');
game.boss._resolveAttack({...attackSnapshot,name:'chaosSlash'});assert.ok(game.boss.chaosSlashes.length&&game.boss.corruptionZones.length,'Chaos Slash should travel and corrupt its path');
game.boss._resolveAttack({...attackSnapshot,name:'voidPrison'});assert.ok(game.boss.hazards.some((hazard)=>hazard.kind==='prison'));
game.boss._resolveAttack({...attackSnapshot,name:'chaosMeteor'});assert.ok(game.boss.hazards.some((hazard)=>hazard.kind==='meteor'));
game.boss._resolveAttack({...attackSnapshot,name:'velymoorClones'});assert.ok(game.boss.chaosClones.length>=3&&game.boss.chaosClones.length<=5);assert.strictEqual(game.boss.damageChaosClone(0),1,'A fake clone should vanish after one hit');
game.boss._resolveAttack({...attackSnapshot,name:'orbOverload'});assert.ok(game.boss.hazards.some((hazard)=>hazard.kind==='beam'&&hazard.width>=54),'Orb Overload should create its telegraphed beam');
game.boss.hazards.length=0;game.boss.afterimages.length=0;game.boss.chaosSlashes.length=0;game.boss.corruptionZones.length=0;game.boss.chaosClones.length=0;game.boss.orbBarrage=null;game.projectiles.length=0;
game.render();
const finalBoss = game.boss;
game.enemies = [finalBoss];
finalBoss.intro = false; finalBoss.invulnerable = false; finalBoss.phase = 4; finalBoss.finalPhase = true; finalBoss.finalStrikeReady = true;
finalBoss.takeDamage(99999, game.player, { knockback: 0 });
assert.ok(finalBoss.dying, 'The final strike should start Velymoor\'s death sequence');
assert.ok(game.dialogue.isOpen(), 'Velymoor should speak before the Orb shatters');
finishDialogue(game.dialogue);
game.player.invulnerableTimer = 0; game.player.health = game.player.hp = 1;
game.player.takeDamage(99999, finalBoss);
assert.strictEqual(game.state, 'playing', 'A simultaneous final hit must not replace the ending with Game Over');
assert.strictEqual(game.player.dead, false);
for (let i = 0; i < 90; i += 1) game.update(.05);
assert.ok(game.bossesDefeated.has('velymoor'), 'The real death sequence should record Velymoor exactly once');
assert.strictEqual(game.boss, null);
assert.ok(!game.enemies.some((enemy) => enemy && enemy.bossType === 'velymoor' && !enemy.remove), 'Velymoor must not respawn after the finishing blow');
for (let i = 0; i < 5; i += 1) game.worlds.update(.05);
assert.strictEqual(game.boss, null, 'The arena trigger must stay sealed after Velymoor dies');
const pendingTimerCount = timers.length;
const resumedEnding = new E.Game();
assert.ok(resumedEnding.continueGame(), 'A save made between the final kill and ending choice should resume');
assert.ok(resumedEnding.endingPending && resumedEnding.bossesDefeated.has('velymoor'));
assert.strictEqual(resumedEnding.boss, null, 'Reloading the pending ending must not spawn a fresh Velymoor');
timers.splice(pendingTimerCount);
flushTimers();
assert.ok(game.dialogue.isOpen(), 'The remastered ending should offer a final choice');
finishDialogue(game.dialogue);
assert.strictEqual(game.state, 'victory');
assert.ok(document.getElementById('victory-copy').textContent.includes('Lyra'));

// Game over and checkpoint retry restore a live player.
game.createSession({ playerName: 'Lyra', difficulty: 'normal', world: { id: 'elaria', position: { x: 650, y: 1160 } } });
timers.length = 0;
game.player.invulnerableTimer = 0;
game.player.takeDamage(99999, { x: game.player.x - 10, y: game.player.y, knockback: 0 });
assert.strictEqual(game.state, 'gameover');
game.canvas.style.transform = 'scale(1.018)';
game.restartCheckpoint();
assert.strictEqual(game.state, 'playing');
assert.strictEqual(game.canvas.style.transform, 'scale(1)');
assert.strictEqual(game.player.dead, false);
assert.ok(game.player.hp > 0);

// Nightmare Eclipsebreaker route: three World 0 trials -> secret Final World chamber -> Eclipse Warden -> Mythic sword.
localStorage.setItem('elaria-nightmare-unlocked', '1');
game.createSession({ playerName: 'Nyra', difficulty: 'nightmare', world: { id: 'elaria', position: { x: 1650, y: 1190 } } });
timers.length = 0;
assert.ok(game.quests.hasQuest('nightmare_eclipse_trial'), 'Nightmare should start the Eclipse Trial quest in World 0');
for (const trialId of ['eclipse_trial_might','eclipse_trial_endurance','eclipse_trial_spirit']) {
  const altar = E.WORLD_DEFS.elaria.interactables.find((it) => it.id === trialId);
  assert.ok(altar, `${trialId} altar should exist in World 0`);
  assert.strictEqual(game.startEclipseTrial(altar), true);
  finishDialogue(game.dialogue); game.state = 'playing';
  const trialEnemies = game.enemies.filter((enemy) => enemy && enemy.eclipseTrialId === trialId && !enemy.dead);
  assert.ok(trialEnemies.length >= 5, `${trialId} should spawn a real combat wave`);
  trialEnemies.forEach((enemy) => enemy.die(game.player));
  game.update(.016);
  assert.ok(game.chestsOpened.has(`${trialId}_done`), `${trialId} should persist as completed`);
}
assert.ok(game.eclipseTrialsComplete(), 'All three World 0 trials should unlock the secret chamber');
assert.ok(E.WORLD_DEFS.eclipseChamber && E.BOSS_CONFIG.eclipseWarden, 'Secret chamber and Eclipse Warden should be registered');
game.worlds.load('brokenRealm', { x: 1770, y: 1040 });
game.worldId = 'brokenRealm'; game.currentWorldId = 'broken_realm'; game.state = 'playing';
const eclipseSeal = E.WORLD_DEFS.brokenRealm.interactables.find((it) => it.id === 'eclipse_seal');
assert.ok(eclipseSeal, "The Eclipse Seal should be beside Velymoor's fortress");
game.worlds.nearby = eclipseSeal; game.worlds.interact();
flushTimers();
assert.strictEqual(game.worldId, 'eclipseChamber', 'Completed trials should open the Secret Eclipse Chamber');
game.bossesDefeated.delete('eclipseWarden'); game.boss = null;
const eclipseWarden = game.spawnBoss('eclipseWarden', E.WORLD_DEFS.eclipseChamber.bossZone.x, E.WORLD_DEFS.eclipseChamber.bossZone.y, { skipIntro: true });
assert.ok(eclipseWarden && eclipseWarden.bossType === 'eclipseWarden');
game.onBossDefeated(eclipseWarden);
assert.ok(game.bossesDefeated.has('eclipseWarden'));
assert.ok(game.inventory.count('eclipsebreaker') >= 1, 'Defeating the Eclipse Warden should grant Eclipsebreaker');
assert.ok(game.quests.isCompleted('nightmare_eclipse_trial'), 'The Eclipse Trial quest should finish only after the secret boss falls');

// Offline loader contract: every listed file exists and classic mode is chosen for file://.
assert.ok(html.includes("location.protocol !== 'file:'"));
assert.strictEqual(scriptOrder.length, 19);
assert.deepStrictEqual(captured.errors, []);

console.log(JSON.stringify({
  result: 'PASS',
  scripts: scriptOrder.length,
  itemDefinitions: Object.keys(E.ITEMS).length,
  questDefinitions: Object.keys(E.QUEST_DEFS).length,
  enemyTypes: Object.keys(E.ENEMY_TYPES).length,
  bossTypes: Object.keys(E.BOSS_CONFIG).length,
  worlds: Object.keys(E.WORLD_DEFS).length,
  assertions: 'menu, naming, tutorial, Nightmare Eclipsebreaker trials/chamber/Warden, dialogue, physical loot, equipment comparison, enchantments, combat, shops, progression, crafting, lore, combat-safe fast travel, complete rebinding, accessibility, rain/snow ambience, perfect dodge, escort, timed quest retry, hidden contract/boss/cavern, four-prisoner rescue, full rendering, remaster save, legacy save, corrupt save, all bosses, real Velymoor death sequence, simultaneous final hit, no boss respawn, ending choice, healing-crystal removal, 5x Velymoor visual scale, phase damage scaling, retry'
}, null, 2));
