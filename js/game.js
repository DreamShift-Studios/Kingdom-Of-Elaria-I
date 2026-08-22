(function () {
  'use strict';

  const E = window.Elaria = window.Elaria || {};

  E.DIFFICULTIES = {
    // Every mode now keeps enemies dangerous. Easy is forgiving, but no longer a free walk-through.
    easy:   { enemyHealth: .90, enemyDamage: .78, enemySpeed: .96, gold: 1.22, drops: 1.18, label: 'Easy — Adventurer' },
    normal: { enemyHealth: 1.18, enemyDamage: 1.12, enemySpeed: 1.08, gold: 1.05, drops: .96, label: 'Normal — Heroic' },
    hard:   { enemyHealth: 1.62, enemyDamage: 1.55, enemySpeed: 1.20, gold: 1.16, drops: .76, healingScale: .90, label: 'Hard — Extreme' },
    nightmare: { enemyHealth: 1.95, enemyDamage: 1.88, enemySpeed: 1.30, gold: 1.32, drops: .64, healingScale: .68, eliteChance: .28, label: 'Nightmare — Relentless' }
  };

  const AREA_NAMES = {
    elaria: 'Kingdom of Elaria',
    greenhaven: 'Greenhaven Forest',
    darkForest: 'The Dark Forest',
    chaosCaves: 'The Chaos Caves',
    brokenRealm: "Velymoor's Broken Realm",
    eclipseChamber: "Secret Eclipse Chamber"
  };

  class InputManager {
    constructor(game, canvas) {
      this.game = game;
      this.canvas = canvas;
      this.held = new Set();
      this.hit = new Set();
      this.released = new Set();
      this.virtualKeys = new Map();
      this.mouse = { x: 480, y: 270, worldX: 480, worldY: 270 };
      this.mouseWorld = this.mouse;
      this.pointerInside = false;
      this.bind();
    }

    normalize(key) {
      const k = String(key || '').toLowerCase();
      const aliases = { ' ': 'space', spacebar: 'space', escape: 'escape', arrowup: 'arrowup', arrowdown: 'arrowdown', arrowleft: 'arrowleft', arrowright: 'arrowright' };
      return aliases[k] || k;
    }

    bind() {
      window.addEventListener('keydown', (event) => {
        const key = this.normalize(event.key);
        if (['space','arrowup','arrowdown','arrowleft','arrowright','tab'].includes(key)) event.preventDefault();
        if (!this.held.has(key)) this.hit.add(key);
        this.held.add(key);
        const virtual = this.virtualFor(key);
        this.virtualKeys.set(key, virtual);
        virtual.forEach((mapped) => { if (!this.held.has(mapped)) this.hit.add(mapped); this.held.add(mapped); });
        if (key === 'escape' || virtual.includes('escape')) this.game.handleEscape();
      }, { passive: false });

      window.addEventListener('keyup', (event) => {
        const key = this.normalize(event.key);
        this.held.delete(key);
        this.released.add(key);
        (this.virtualKeys.get(key) || []).forEach((mapped) => { this.held.delete(mapped); this.released.add(mapped); });
        this.virtualKeys.delete(key);
      });

      window.addEventListener('blur', () => {
        this.held.clear();
        this.hit.clear();
        this.released.clear();
        if (this.game.state === 'playing') this.game.pause();
      });

      const point = (event) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = (event.clientX - rect.left) * this.canvas.width / rect.width;
        this.mouse.y = (event.clientY - rect.top) * this.canvas.height / rect.height;
        this.mouse.worldX = this.mouse.x + (this.game.camera ? this.game.camera.x : 0);
        this.mouse.worldY = this.mouse.y + (this.game.camera ? this.game.camera.y : 0);
      };
      this.canvas.addEventListener('pointermove', (e) => { point(e); this.pointerInside = true; });
      this.canvas.addEventListener('pointerenter', (e) => { point(e); this.pointerInside = true; });
      this.canvas.addEventListener('pointerleave', () => { this.pointerInside = false; });
      this.canvas.addEventListener('pointerdown', (event) => {
        point(event);
        if (event.button === 0) {
          event.preventDefault();
          if (!this.held.has('mouse0')) this.hit.add('mouse0');
          this.held.add('mouse0');
          if (this.game.audio) this.game.audio.unlock();
        }
      });
      window.addEventListener('pointerup', (event) => {
        if (event.button === 0) {
          this.held.delete('mouse0');
          this.released.add('mouse0');
        }
      });
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    down(key) { return this.held.has(this.normalize(key)); }
    pressed(key) { return this.hit.has(this.normalize(key)); }
    releasedKey(key) { return this.released.has(this.normalize(key)); }
    consume(key) {
      key = this.normalize(key);
      const had = this.hit.has(key);
      this.hit.delete(key);
      return had;
    }
    endFrame() { this.hit.clear(); this.released.clear(); }
    virtualFor(key) {
      const defaults = { up:'w', down:'s', left:'a', right:'d', attack:'space', dash:'shift', interact:'e', inventory:'i', potion:'q', pause:'escape', map:'m', skills:'k', crafting:'r', codex:'b', quests:'l', stats:'c' };
      const bindings = this.game.settings && this.game.settings.bindings || {};
      const result = [];
      Object.keys(defaults).forEach((action) => { if (this.normalize(bindings[action] || defaults[action]) === key && defaults[action] !== key) result.push(defaults[action]); });
      return result;
    }
  }

  class Game {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d', { alpha: false });
      this.ctx.imageSmoothingEnabled = false;
      this.state = 'menu';
      this.previousState = 'playing';
      this.running = false;
      this.lastTime = 0;
      this.elapsed = 0;
      this.playtime = 0;
      this.worldId = 'elaria';
      this.playerName = 'Aren';
      this.difficultyName = 'normal';
      this.difficulty = E.DIFFICULTIES.normal;
      this.settings = this.loadSettings();
      this.camera = { x: 0, y: 0, targetX: 0, targetY: 0, shakeX: 0, shakeY: 0 };
      this.shakeState = { amount: 0, duration: 0, left: 0 };
      this.screenFlash = { color: '#fff', alpha: 0 };
      this.input = new InputManager(this, this.canvas);
      this.keys = this.input.held;
      this.enemies = [];
      this.projectiles = [];
      this.drops = [];
      this.breakables = [];
      this._actorBuffer = [];
      this.boss = null;
      this.bossesDefeated = new Set();
      this.chestsOpened = new Set();
      this.stats = this.freshStats();
      this.ngPlus = 0;
      this.endingChoice = null;
      this.endingPending = false;
      this.endingScheduled = false;
      this.checkpoint = { worldId: 'elaria', x: 650, y: 890 };
      this.transitioning = false;
      this.autoSaveClock = 0;

      this.save = E.SaveSystem ? new E.SaveSystem() : null;
      this.audio = E.AudioManager ? new E.AudioManager(this) : null;
      this.particles = E.ParticleSystem ? new E.ParticleSystem(this) : null;
      this.effects = E.ScreenEffects ? new E.ScreenEffects(this) : null;
      this.dialogue = E.DialogueManager ? new E.DialogueManager(this) : null;
      this.worlds = E.WorldManager ? new E.WorldManager(this) : null;
      this.shop = E.ShopManager ? new E.ShopManager(this) : null;
      this.ui = E.UIManager ? new E.UIManager(this) : null;
      this.combat = E.CombatSystem ? new E.CombatSystem(this) : null;
    }

    freshStats() {
      return { enemiesDefeated: 0, bossesDefeated: 0, totalGold: 0, damageDealt: 0, damageTaken: 0, chestsOpened: 0, potionsUsed: 0, deaths: 0, perfectDodges: 0, bestCombo: 0, itemsCrafted: 0, fishCaught: 0, oreMined: 0 };
    }

    loadSettings() {
      const defaults = { musicVolume: .55, sfxVolume: .75, screenShake: true, difficulty: 'normal', uiScale: 1, particleDensity: 1, colorblind: 'none', reducedFlashes: false, highContrast: false, bindings: { up:'w',down:'s',left:'a',right:'d',attack:'space',dash:'shift',interact:'e',inventory:'i',potion:'q',pause:'escape',map:'m',skills:'k',crafting:'r',codex:'b',quests:'l',stats:'c' } };
      try {
        const raw = JSON.parse(localStorage.getItem('elaria-settings') || '{}');
        return {
          musicVolume: Math.max(0, Math.min(1, Number.isFinite(+raw.musicVolume) ? +raw.musicVolume : defaults.musicVolume)),
          sfxVolume: Math.max(0, Math.min(1, Number.isFinite(+raw.sfxVolume) ? +raw.sfxVolume : defaults.sfxVolume)),
          screenShake: raw.screenShake !== false,
          difficulty: E.DIFFICULTIES[raw.difficulty] ? raw.difficulty : defaults.difficulty,
          uiScale: Math.max(.75, Math.min(1.35, Number.isFinite(+raw.uiScale) ? +raw.uiScale : 1)),
          particleDensity: Math.max(.25, Math.min(1.5, Number.isFinite(+raw.particleDensity) ? +raw.particleDensity : 1)),
          colorblind: ['none','deuter','protan','tritan'].includes(raw.colorblind) ? raw.colorblind : 'none',
          reducedFlashes: raw.reducedFlashes === true,
          highContrast: raw.highContrast === true,
          bindings: { ...defaults.bindings, ...(raw.bindings && typeof raw.bindings === 'object' ? raw.bindings : {}) }
        };
      } catch (_) { return defaults; }
    }

    storeSettings() {
      try { localStorage.setItem('elaria-settings', JSON.stringify(this.settings)); } catch (_) { /* storage may be unavailable */ }
      if (this.audio) this.audio.setVolumes(this.settings.musicVolume, this.settings.sfxVolume);
    }

    start() {
      if (this.running) return;
      this.running = true;
      if (this.audio) this.audio.setVolumes(this.settings.musicVolume, this.settings.sfxVolume);
      this.refreshContinueButton();
      requestAnimationFrame((t) => this.loop(t));
    }

    refreshContinueButton() {
      const btn = document.getElementById('continue-btn');
      if (btn) btn.disabled = !(this.save && this.save.hasSave());
    }

    createSession(data, isFreshJourney) {
      const d = data && typeof data === 'object' ? data : {};
      this.playerName = String(d.playerName || (d.player && d.player.name) || 'Aren').slice(0, 18);
      this.difficultyName = E.DIFFICULTIES[d.difficulty] ? d.difficulty : (E.DIFFICULTIES[this.settings.difficulty] ? this.settings.difficulty : 'normal');
      this.difficulty = { ...E.DIFFICULTIES[this.difficultyName] };
      if (d.ngPlus) {
        this.ngPlus = Math.max(0, Math.min(9, d.ngPlus | 0));
        this.difficulty.enemyHealth *= 1 + this.ngPlus * .16;
        this.difficulty.enemyDamage *= 1 + this.ngPlus * .12;
        this.difficulty.gold *= 1 + this.ngPlus * .1;
      } else this.ngPlus = 0;
      this.playtime = Math.max(0, +d.playtime || 0);
      this.endingChoice = typeof d.endingChoice === 'string' ? d.endingChoice : null;
      this.endingPending = false;
      this.endingScheduled = false;
      this.stats = { ...this.freshStats(), ...(d.stats || {}) };
      this.bossesDefeated = new Set(Array.isArray(d.bossesDefeated) ? d.bossesDefeated : []);
      this.chestsOpened = new Set(Array.isArray(d.chestsOpened) ? d.chestsOpened : []);
      this.enemies.length = 0;
      this.projectiles.length = 0;
      this.drops.length = 0;
      this.breakables.length = 0;
      this.boss = null;
      this.inventory = new E.Inventory(this, d.inventory || null);
      this.quests = new E.QuestManager(this, d.quests || null);
      this.player = new E.Player(this, { ...(d.player || {}), name: this.playerName });
      this.combat = new E.CombatSystem(this);
      this.particles = new E.ParticleSystem(this);
      this.effects = E.ScreenEffects ? new E.ScreenEffects(this) : null;
      if (!this.dialogue) this.dialogue = new E.DialogueManager(this);
      if (!this.worlds) this.worlds = new E.WorldManager(this);
      if (!this.shop) this.shop = new E.ShopManager(this);
      if (!this.ui) this.ui = new E.UIManager(this);
      const world = d.world || {};
      const id = world.id || d.worldId || 'elaria';
      const position = world.position || d.position || null;
      this.worlds.load(id, position);
      this.worldId = id;
      this.currentWorldId = this.questWorldId(id);
      if (position && Number.isFinite(+position.x) && Number.isFinite(+position.y)) {
        this.player.x = +position.x;
        this.player.y = +position.y;
      }
      this.checkpoint = d.checkpoint && Number.isFinite(+d.checkpoint.x) ? d.checkpoint : { worldId: id, x: this.player.x, y: this.player.y };
      this.camera.x = Math.max(0, this.player.x - this.canvas.width / 2);
      this.camera.y = Math.max(0, this.player.y - this.canvas.height / 2);
      this.state = 'playing';
      this.previousState = 'playing';
      this.showOnlyScreen(null);
      document.getElementById('hud').classList.remove('hidden');
      document.getElementById('vignette').classList.remove('hidden');
      if (this.ui) {
        this.ui.closePanels();
        this.ui.showArea(AREA_NAMES[id] || id);
        this.ui.update();
      }
      this.audio && this.audio.setWorld(id, false, false);
      if (this.bossesDefeated.has('velymoor') && !this.endingChoice) {
        this.endingPending = true;
        this.endingScheduled = true;
        this.player.invulnerableTimer = Math.max(this.player.invulnerableTimer || 0, 4);
        window.setTimeout(() => this.beginEndingChoice(), 650);
      }
      if (id === 'elaria' && isFreshJourney) {
        this.inventory.add('health_potion', 2);
        this.quests.event('game_started', { player: this.playerName });
        window.setTimeout(() => {
          if (this.state === 'playing' && this.worldId === 'elaria' && this.worlds && this.worlds.beginIntro) this.worlds.beginIntro();
        }, 700);
      }
    }

    newGame(name, difficulty) {
      this.audio && this.audio.unlock();
      this.settings.difficulty = E.DIFFICULTIES[difficulty] ? difficulty : 'normal';
      this.storeSettings();
      this.createSession({ playerName: name || 'Aren', difficulty: this.settings.difficulty, world: { id: 'elaria' } }, true);
      this.saveNow('new-game');
    }

    continueGame() {
      const data = this.save && this.save.load();
      if (!data) {
        this.ui && this.ui.toast('No readable save was found.', 'danger');
        this.refreshContinueButton();
        return false;
      }
      if (data.settings) {
        this.settings = { ...this.settings, ...data.settings };
        this.storeSettings();
      }
      this.createSession(data);
      return true;
    }

    serialize() {
      return {
        playerName: this.playerName,
        difficulty: this.difficultyName,
        ngPlus: this.ngPlus,
        endingChoice: this.endingChoice,
        playtime: this.playtime,
        settings: { ...this.settings },
        player: this.player && this.player.serialize ? this.player.serialize() : null,
        world: { id: this.worldId, position: this.player ? { x: Math.round(this.player.x), y: Math.round(this.player.y) } : null },
        checkpoint: this.checkpoint,
        inventory: this.inventory && this.inventory.serialize ? this.inventory.serialize() : null,
        quests: this.quests && this.quests.serialize ? this.quests.serialize() : null,
        bossesDefeated: [...this.bossesDefeated],
        chestsOpened: [...this.chestsOpened],
        stats: { ...this.stats }
      };
    }

    saveNow(reason) {
      if (!this.save || !this.player) return false;
      const ok = this.save.save(this, reason || 'manual');
      const el = document.getElementById('save-indicator');
      if (ok && el) {
        el.classList.remove('hidden');
        window.setTimeout(() => el.classList.add('hidden'), 750);
      }
      this.refreshContinueButton();
      return ok;
    }

    loop(time) {
      if (!this.running) return;
      const dt = Math.min(.033, Math.max(0, (time - (this.lastTime || time)) / 1000));
      this.lastTime = time;
      this.elapsed += dt;
      this.update(dt);
      this.render();
      this.input.endFrame();
      requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
      this.audio && this.audio.update(dt);
      if (this.state === 'menu') return;

      if (this.dialogue && this.dialogue.isOpen && this.dialogue.isOpen()) {
        this.dialogue.update(dt);
        if (this.input.consume('enter') || this.input.consume('e') || this.input.consume('space')) this.dialogue.advance();
        return;
      }

      if (this.state !== 'playing') {
        if (this.particles && ['victory','gameover'].includes(this.state)) this.particles.update(dt);
        return;
      }

      this.playtime += dt;
      this.autoSaveClock += dt;
      if (this.autoSaveClock > 150) { this.autoSaveClock = 0; this.saveNow('autosave'); }

      if (this.input.consume('i')) { this.ui && this.ui.openInventory(); return; }
      if (this.input.consume('l') || this.input.consume('j')) { this.ui && this.ui.openQuests(); return; }
      if (this.input.consume('c')) { this.ui && this.ui.openStats(); return; }
      if (this.input.consume('q')) {
        if (this.player && this.player.spendPotion) this.player.spendPotion();
        else if (this.inventory) {
          const potion = this.inventory.items.find((it) => it.id === 'health_potion');
          if (potion) this.inventory.use(potion.uid);
          else this.ui && this.ui.toast('You have no health potions.', 'danger');
        }
      }
      if (this.input.consume('e')) { this.interact(); }

      this.worlds && this.worlds.update(dt);
      this.player && this.player.update(dt);
      if (this.combat) this.combat.update(dt);

      for (const enemy of [...this.enemies]) {
        if (enemy && !enemy.dead && typeof enemy.update === 'function') enemy.update(dt);
      }
      this.enemies = this.enemies.filter((enemy) => enemy && !enemy.remove);

      for (const projectile of [...this.projectiles]) {
        if (projectile && !projectile.dead && typeof projectile.update === 'function' && !projectile.managedByCombat) projectile.update(dt);
      }
      this.projectiles = this.projectiles.filter((p) => p && !p.dead && !p.remove);
      this.updateDrops(dt);
      this.particles && this.particles.update(dt);
      this.effects && this.effects.update(dt);
      this.updateCamera(dt);
      this.updateShake(dt);
      if (this.screenFlash.alpha > 0) this.screenFlash.alpha = Math.max(0, this.screenFlash.alpha - dt * 2.6);
      this.ui && this.ui.update();
    }

    updateCamera(dt) {
      if (!this.player) return;
      const size = this.worlds && this.worlds.current ? this.worlds.current : { width: 960, height: 540 };
      this.camera.targetX = Math.max(0, Math.min(Math.max(0, size.width - 960), this.player.x - 480));
      this.camera.targetY = Math.max(0, Math.min(Math.max(0, size.height - 540), this.player.y - 270));
      const ease = 1 - Math.pow(.0008, dt);
      this.camera.x += (this.camera.targetX - this.camera.x) * ease;
      this.camera.y += (this.camera.targetY - this.camera.y) * ease;
      this.input.mouse.worldX = this.input.mouse.x + this.camera.x;
      this.input.mouse.worldY = this.input.mouse.y + this.camera.y;
    }

    updateShake(dt) {
      if (this.shakeState.left > 0 && this.settings.screenShake) {
        this.shakeState.left -= dt;
        const falloff = Math.max(0, this.shakeState.left / Math.max(.01, this.shakeState.duration));
        const amount = this.shakeState.amount * falloff;
        this.camera.shakeX = (Math.random() * 2 - 1) * amount;
        this.camera.shakeY = (Math.random() * 2 - 1) * amount;
      } else {
        this.shakeState.left = 0;
        this.camera.shakeX = 0;
        this.camera.shakeY = 0;
      }
    }

    shake(amount, duration) {
      if (!this.settings.screenShake) return;
      if (amount >= this.shakeState.amount || this.shakeState.left <= 0) {
        this.shakeState = { amount: Math.min(13, Math.max(0, amount || 0)), duration: Math.max(.05, duration || .15), left: Math.max(.05, duration || .15) };
      }
    }

    flash(color, alpha) {
      if (this.settings.reducedFlashes) alpha = Math.min(.08, alpha || .08);
      this.screenFlash.color = color || '#fff';
      this.screenFlash.alpha = Math.max(this.screenFlash.alpha, alpha || .18);
    }

    render() {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (this.state === 'menu' || !this.player || !this.worlds) {
        this.drawMenuScene(ctx);
        return;
      }

      ctx.fillStyle = '#0c0911';
      ctx.fillRect(0, 0, 960, 540);
      this.effects && this.effects.begin(ctx);
      ctx.save();
      ctx.translate(Math.round(-this.camera.x + this.camera.shakeX), Math.round(-this.camera.y + this.camera.shakeY));
      this.worlds.draw(ctx, this.camera);

      for (const drop of this.drops) this.drawDrop(ctx, drop);
      const actors = this._actorBuffer; actors.length = 0;
      if (this.player && !this.player.hidden) actors.push(this.player);
      for (const enemy of this.enemies) if (enemy && !enemy.dead && !enemy.hidden) actors.push(enemy);
      actors.sort((a, b) => (a.y || 0) - (b.y || 0));
      for (const actor of actors) if (actor.draw) actor.draw(ctx);
      for (const projectile of this.projectiles) if (projectile && !projectile.dead && projectile.draw) projectile.draw(ctx);
      this.combat && this.combat.draw && this.combat.draw(ctx);
      this.particles && this.particles.draw(ctx);
      this.worlds.drawForeground && this.worlds.drawForeground(ctx, this.camera);
      ctx.restore();
      this.effects && this.effects.end(ctx);

      this.worlds.drawLighting && this.worlds.drawLighting(ctx, this.camera);
      if (this.screenFlash.alpha > 0) {
        ctx.save(); ctx.globalAlpha = this.screenFlash.alpha; ctx.fillStyle = this.screenFlash.color; ctx.fillRect(0, 0, 960, 540); ctx.restore();
      }
      this.effects && this.effects.drawOverlay(ctx, 960, 540);
    }

    drawMenuScene(ctx) {
      const t = this.elapsed;
      const sky = ctx.createLinearGradient(0, 0, 0, 540);
      sky.addColorStop(0, '#20142e'); sky.addColorStop(.52, '#36233e'); sky.addColorStop(1, '#0e1116');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = '#a96cca'; ctx.globalAlpha = .12 + Math.sin(t * .7) * .025; ctx.beginPath(); ctx.arc(720, 105, 74, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#d8b5dc'; ctx.globalAlpha = .35; ctx.beginPath(); ctx.arc(720, 105, 42, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      for (let i = 0; i < 44; i++) {
        const x = (i * 137 + 43) % 950, y = (i * 59 + 21) % 245;
        const a = .2 + .35 * (Math.sin(t * 1.2 + i) * .5 + .5);
        ctx.fillStyle = `rgba(238,211,224,${a})`; ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, 1);
      }
      ctx.fillStyle = '#16151c';
      ctx.beginPath(); ctx.moveTo(0, 420); ctx.lineTo(0, 330); ctx.lineTo(120, 290); ctx.lineTo(220, 340); ctx.lineTo(320, 260); ctx.lineTo(430, 338); ctx.lineTo(560, 250); ctx.lineTo(710, 320); ctx.lineTo(840, 255); ctx.lineTo(960, 320); ctx.lineTo(960, 540); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0d1115';
      for (let x = -20; x < 1000; x += 58) {
        const h = 80 + ((x * 13) % 75 + 75) % 75;
        ctx.beginPath(); ctx.moveTo(x, 500); ctx.lineTo(x + 25, 500 - h); ctx.lineTo(x + 14, 500 - h + 43); ctx.lineTo(x + 30, 500 - h - 10); ctx.lineTo(x + 46, 500 - h + 46); ctx.lineTo(x + 37, 500 - h); ctx.lineTo(x + 61, 500); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#090c10'; ctx.fillRect(0, 468, 960, 72);
      // Broken castle silhouette
      ctx.fillStyle = '#0a0b10'; ctx.fillRect(755, 302, 145, 168); ctx.fillRect(735, 276, 42, 194); ctx.fillRect(878, 250, 44, 220);
      for (let x = 735; x < 922; x += 18) ctx.fillRect(x, x < 800 ? 265 : 290, 10, 22);
      ctx.fillStyle = '#8c4d7b';
      for (const p of [[750,330],[892,287],[825,360],[860,395]]) { ctx.globalAlpha = .45 + Math.sin(t * 2 + p[0]) * .15; ctx.fillRect(p[0],p[1],5,11); }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 14; i++) {
        const x = (i * 83 + Math.sin(t * .25 + i) * 20 + 960) % 960;
        const y = 325 + (i * 31 % 165) + Math.sin(t * 1.3 + i) * 6;
        ctx.fillStyle = `rgba(225,188,91,${.25 + .25 * Math.sin(t * 2 + i)})`; ctx.fillRect(x, y, 2, 2);
      }
    }

    interact() {
      if (this.state !== 'playing' || !this.worlds) return;
      this.worlds.interact();
    }

    startDialogue(data) {
      if (!this.dialogue) return;
      this.previousState = this.state;
      this.state = 'dialogue';
      this.dialogue.start(data);
    }

    onDialogueClosed() {
      if (this.state === 'dialogue') this.state = this.previousState === 'paused' ? 'paused' : 'playing';
    }

    transitionTo(worldId, position) {
      if (this.transitioning || !this.worlds || !this.player) return;
      this.transitioning = true;
      this.state = 'transition';
      const cover = document.getElementById('transition-screen');
      cover && cover.classList.add('active');
      this.audio && this.audio.play('door');
      window.setTimeout(() => {
        this.enemies.length = 0;
        this.projectiles.length = 0;
        this.drops.length = 0;
        this.breakables.length = 0;
        this.boss = null;
        this.worlds.load(worldId, position);
        this.worldId = worldId;
        this.currentWorldId = this.questWorldId(worldId);
        const spawn = position || (this.worlds.getSpawn ? this.worlds.getSpawn() : { x: 200, y: 300 });
        this.player.x = +spawn.x || 200;
        this.player.y = +spawn.y || 300;
        this.camera.x = Math.max(0, this.player.x - 480);
        this.camera.y = Math.max(0, this.player.y - 270);
        this.checkpoint = { worldId, x: this.player.x, y: this.player.y };
        this.audio && this.audio.setWorld(worldId, false, false);
        this.quests && this.quests.event('world_entered', { world: this.currentWorldId, worldId: this.currentWorldId, aliases: [worldId] });
        this.ui && this.ui.showArea(AREA_NAMES[worldId] || worldId);
        this.saveNow('world-transition');
        window.setTimeout(() => {
          cover && cover.classList.remove('active');
          this.state = 'playing';
          this.transitioning = false;
        }, 460);
      }, 460);
    }

    spawnEnemy(type, x, y, options) {
      if (!E.createEnemy) return null;
      const enemy = E.createEnemy(this, type, x, y, options || {});
      if (enemy && !this.enemies.includes(enemy)) this.enemies.push(enemy);
      return enemy;
    }

    spawnEnemiesForWorld(worldOrId, spawns) {
      const id = typeof worldOrId === 'string' ? worldOrId : this.worldId;
      const list = Array.isArray(spawns) ? spawns : (worldOrId && worldOrId.enemySpawns) || [];
      const respawned = new Set();
      for (const s of list) {
        const key = s.key || `${id}:${s.type}:${s.x}:${s.y}`;
        if (s.once && this.chestsOpened.has(`enemy:${key}`)) continue;
        const enemy = this.spawnEnemy(s.type, s.x, s.y, { ...s, spawnKey: key });
        if (enemy) respawned.add(key);
      }
      return respawned;
    }

    spawnBoss(type, x, y, options) {
      options = options || {};
      if (this.endingPending || this.bossesDefeated.has(type)) return null;
      if (this.boss && !this.boss.dead && !this.boss.remove) return this.boss;
      if (!E.createBoss) return null;
      const boss = E.createBoss(this, type, x, y, options);
      if (boss && !this.enemies.includes(boss)) this.enemies.push(boss);
      this.boss = boss;
      if (!options.deferMusic) this.audio && this.audio.setWorld(this.worldId, true, type === 'velymoor');
      return boss;
    }

    onBossDefeated(boss) {
      if (!boss) return;
      const id = boss.bossId || boss.bossType || boss.type || boss.id;
      if (!id || this.bossesDefeated.has(id)) return;
      this.bossesDefeated.add(id);
      if (this.worlds) { this.worlds.bossTriggered = true; this.worlds.bossPending = false; }
      this.stats.bossesDefeated += 1;
      this.quests && this.quests.event('boss_defeated', { boss: id, bossId: id, name: boss.name });
      this.particles && this.particles.burst(boss.x, boss.y, '#f7d86b', 48, 155, 4, .85, { kind: 'spark', glow: 8, color2: '#b16ac5' });
      this.shake(10, .8);
      this.flash('#fff1ae', .32);
      this.audio && this.audio.play('victory');
      this.boss = null;
      if (id === 'velymoor') {
        this.endingPending = true;
        if (this.player) {
          this.player.dead = false;
          this.player.health = this.player.hp = Math.max(1, this.player.health || this.player.hp || 1);
          this.player.invulnerableTimer = Math.max(this.player.invulnerableTimer || 0, 5);
        }
        this.projectiles.length = 0;
        for (const enemy of this.enemies) if (enemy && enemy !== boss) { enemy.dead = true; enemy.remove = true; }
        this.ui && this.ui.toast('Velymoor has fallen. The Orb awaits your choice.', 'success');
        this.saveNow('velymoor-defeated');
        if (!this.endingScheduled) { this.endingScheduled = true; window.setTimeout(() => this.beginEndingChoice(), 1600); }
      } else {
        this.audio && this.audio.setWorld(this.worldId, false, false);
        this.ui && this.ui.toast(`${boss.name || 'The boss'} has fallen. A new path opens!`, 'success');
        this.saveNow('boss-defeated');
      }
    }

    showEnding() {
      this.endingPending = false;
      this.endingScheduled = false;
      this.state = 'victory';
      this.saveNow('victory');
      if (this.ui) this.ui.showVictory({
        name: this.playerName,
        gold: this.stats.totalGold,
        enemies: this.stats.enemiesDefeated,
        bosses: this.stats.bossesDefeated,
        playtime: this.playtime
      });
    }

    beginEndingChoice() {
      if (this.state === 'victory') return;
      this.endingScheduled = false;
      this.endingPending = true;
      this.startDialogue({
        name: 'The Shattered Orb', portrait: 'velymoor',
        lines: [
          'The Orb cracks between your hands. Within it, you hear every kingdom Velymoor stole—and one frightened young scholar who believed power could end suffering.',
          { text: 'The last chaos-light waits for your decision.', choices: [
            { text: 'Shatter the Orb and end magic born from chaos.', action: () => { this.endingChoice = 'dawn'; } },
            { text: 'Purify the Orb and guard the memories within.', action: () => { this.endingChoice = 'keeper'; } }
          ] },
          { text: 'Your choice becomes the first story of the new age.' }
        ],
        onComplete: () => this.showEnding()
      });
    }

    startNewGamePlus() {
      const retained = this.inventory && this.inventory.serialize ? this.inventory.serialize() : null;
      const name = this.playerName;
      const difficulty = this.difficultyName;
      const plus = this.ngPlus + 1;
      this.createSession({ playerName: name, difficulty, ngPlus: plus, inventory: retained, stats: this.freshStats(), world: { id: 'elaria' } }, true);
      this.quests && this.quests.event('new_game_plus', { level: plus });
      this.ui && this.ui.toast(`New Game +${plus}: the darkness grows stronger.`, 'rare');
      this.saveNow('new-game-plus');
    }

    freeExplore() {
      this.state = 'playing';
      this.showOnlyScreen(null);
      document.getElementById('hud').classList.remove('hidden');
      this.ui && this.ui.toast('Free exploration unlocked. The roads are yours.', 'success');
      this.audio && this.audio.setWorld(this.worldId, false, false);
    }

    spawnDrop(type, x, y, data) {
      const kind = type === 'coin' ? 'gold' : type;
      const count = kind === 'gold' && typeof data === 'number' ? Math.max(1, Math.round(data)) : 1;
      const payload = data && typeof data === 'object' ? data : {};
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 35 + Math.random() * 85;
        this.drops.push({
          kind,
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          z: 8 + Math.random() * 14,
          vz: 90 + Math.random() * 70,
          age: 0,
          life: 65,
          value: Math.max(1, Math.round((payload.value || (kind === 'gold' ? 1 : 0)) * (kind === 'gold' ? this.difficulty.gold : 1))),
          itemId: payload.itemId || payload.item || payload.id || (kind === 'potion' ? 'health_potion' : null),
          qty: Math.max(1, payload.qty || 1),
          label: payload.label || ''
        });
      }
      if (kind === 'gold') this.audio && this.audio.play('goldDrop');
    }

    updateDrops(dt) {
      if (!this.player) return;
      for (const drop of this.drops) {
        drop.age += dt;
        drop.life -= dt;
        drop.x += drop.vx * dt;
        drop.y += drop.vy * dt;
        drop.vx *= Math.pow(.04, dt);
        drop.vy *= Math.pow(.04, dt);
        if (drop.z > 0 || drop.vz > 0) {
          drop.z += drop.vz * dt;
          drop.vz -= 330 * dt;
          if (drop.z <= 0) { drop.z = 0; drop.vz = Math.abs(drop.vz) > 35 ? -drop.vz * .34 : 0; }
        }
        const dx = this.player.x - drop.x, dy = this.player.y - drop.y;
        const dist = Math.hypot(dx, dy);
        if (drop.age > .35 && dist < 74) {
          const pull = (1 - dist / 74) * 310;
          if (dist > .001) { drop.x += dx / dist * pull * dt; drop.y += dy / dist * pull * dt; }
        }
        if (drop.age > .25 && dist < 21) this.collectDrop(drop);
      }
      this.drops = this.drops.filter((d) => !d.collected && d.life > 0);
    }

    collectDrop(drop) {
      if (drop.collected) return;
      drop.collected = true;
      if (drop.kind === 'gold') {
        this.player.gold = Math.max(0, (this.player.gold || 0) + drop.value);
        this.stats.totalGold += drop.value;
        this.quests && this.quests.event('gold_collected', { amount: drop.value, total: this.player.gold });
        this.audio && this.audio.play('gold');
        this.particles && this.particles.coinBurst(drop.x, drop.y, 7);
      } else {
        const id = drop.itemId || (drop.kind === 'potion' ? 'health_potion' : null);
        if (id && this.inventory && this.inventory.add(id, drop.qty)) {
          this.audio && this.audio.play('item');
          const item = E.ITEMS && E.ITEMS[id];
          this.ui && this.ui.toast(`Picked up ${item ? item.name : drop.label || id}.`, item && item.rarity === 'rare' ? 'rare' : 'success');
        }
      }
    }

    drawDrop(ctx, drop) {
      const y = drop.y - drop.z;
      ctx.save();
      ctx.globalAlpha = drop.life < 8 ? .55 + Math.sin(drop.life * 10) * .35 : 1;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(drop.x - 5), Math.round(drop.y - 2), 10, 4);
      if (drop.kind === 'gold') {
        const squash = Math.max(2, Math.abs(Math.sin((drop.age + drop.x) * 7)) * 6);
        ctx.shadowBlur = 8; ctx.shadowColor = '#f6c84b';
        ctx.fillStyle = '#8d5628'; ctx.fillRect(Math.round(drop.x - squash / 2 - 1), Math.round(y - 5), Math.round(squash + 2), 9);
        ctx.fillStyle = '#f3ca4e'; ctx.fillRect(Math.round(drop.x - squash / 2), Math.round(y - 4), Math.round(squash), 7);
        ctx.fillStyle = '#fff0a0'; ctx.fillRect(Math.round(drop.x - squash / 4), Math.round(y - 3), 2, 2);
      } else {
        ctx.shadowBlur = 7; ctx.shadowColor = drop.kind === 'potion' ? '#e85f7a' : '#7bbbe0';
        ctx.fillStyle = drop.kind === 'potion' ? '#d24a68' : '#69a7cb';
        ctx.fillRect(Math.round(drop.x - 5), Math.round(y - 5), 10, 10);
        ctx.fillStyle = '#f2deaa'; ctx.fillRect(Math.round(drop.x - 2), Math.round(y - 8), 4, 3);
      }
      ctx.restore();
    }

    damagePlayer(amount, source) {
      if (this.player && this.player.takeDamage) this.player.takeDamage(amount, source);
    }

    onPlayerDeath() {
      if (this.endingPending || (this.boss && this.boss.bossType === 'velymoor' && this.boss.dying)) {
        if (this.player) {
          this.player.dead = false;
          this.player.health = this.player.hp = Math.max(1, this.player.health || this.player.hp || 1);
          this.player.invulnerableTimer = Math.max(this.player.invulnerableTimer || 0, 5);
        }
        this.state = 'playing';
        return;
      }
      if (this.state === 'gameover') return;
      this.state = 'gameover';
      this.stats.deaths += 1;
      this.audio && this.audio.play('gameOver');
      this.audio && this.audio.stop();
      this.ui && this.ui.showGameOver();
    }

    restartCheckpoint() {
      const cp = this.checkpoint || { worldId: this.worldId, x: 200, y: 300 };
      this.showOnlyScreen(null);
      this.state = 'playing';
      this.enemies.length = 0;
      this.projectiles.length = 0;
      this.drops.length = 0;
      this.boss = null;
      this.player.dead = false;
      this.player.health = Math.max(1, Math.round((this.player.maxHealth || 100) * .65));
      this.player.hp = this.player.health;
      this.player.invulnerableTimer = 1;
      if (cp.worldId !== this.worldId) this.transitionTo(cp.worldId, { x: cp.x, y: cp.y });
      else {
        this.player.x = cp.x; this.player.y = cp.y;
        this.worlds.load(this.worldId, { x: cp.x, y: cp.y });
      }
      this.audio && this.audio.setWorld(this.worldId, false, false);
      this.ui && this.ui.toast('You awaken at the last sanctuary.', 'success');
    }

    setCheckpoint(x, y) {
      this.checkpoint = { worldId: this.worldId, x: +x || this.player.x, y: +y || this.player.y };
      if (this.player) {
        this.player.health = this.player.maxHealth;
        this.player.hp = this.player.health;
      }
      this.saveNow('save-point');
      this.audio && this.audio.play('save');
      this.ui && this.ui.toast('Your journey has been recorded. Health restored.', 'success');
    }

    pause() {
      if (this.state !== 'playing') return;
      this.state = 'paused';
      this.ui && this.ui.togglePause(true);
      this.audio && this.audio.play('button');
    }

    resume() {
      if (!['paused','panel'].includes(this.state)) return;
      this.state = 'playing';
      this.showOnlyScreen(null);
      document.getElementById('hud').classList.remove('hidden');
    }

    handleEscape() {
      if (this.state === 'menu' || this.state === 'transition' || this.state === 'gameover' || this.state === 'victory') return;
      if (this.dialogue && this.dialogue.isOpen && this.dialogue.isOpen()) { this.dialogue.advance(); return; }
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
      else if (this.state === 'panel') {
        if (this.shop && this.shop.isOpen) this.shop.close();
        this.ui && this.ui.closePanels();
        this.state = 'playing';
      }
    }

    returnToTitle() {
      if (this.player) this.saveNow('return-to-title');
      this.state = 'menu';
      this.player = null;
      this.enemies.length = 0; this.projectiles.length = 0; this.drops.length = 0;
      this.boss = null;
      this.showOnlyScreen('main-menu');
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('boss-hud').classList.add('hidden');
      this.audio && this.audio.stop();
      this.refreshContinueButton();
    }

    showOnlyScreen(id) {
      document.querySelectorAll('.screen').forEach((screen) => screen.classList.add('hidden'));
      if (id) document.getElementById(id) && document.getElementById(id).classList.remove('hidden');
    }

    questWorldId(id) {
      return ({ darkForest: 'dark_forest', chaosCaves: 'chaos_caves', brokenRealm: 'broken_realm', eclipseChamber: 'eclipse_chamber' })[id] || id;
    }
  }

  E.InputManager = InputManager;
  E.Game = Game;
})();
