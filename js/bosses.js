(function () {
  "use strict";

  var E = window.Elaria = window.Elaria || {};
  var BaseEnemy = E.Enemy;
  var TAU = Math.PI * 2;

  if (typeof BaseEnemy !== "function") {
    throw new Error("Elaria enemies.js must be loaded before bosses.js");
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function random(min, max) { return min + Math.random() * (max - min); }
  function distanceSq(a, b) { var dx = a.x - b.x; var dy = a.y - b.y; return dx * dx + dy * dy; }
  function angleDelta(a, b) {
    var delta = (a - b + Math.PI) % TAU;
    if (delta < 0) delta += TAU;
    return delta - Math.PI;
  }

  function difficultyValue(game, key, fallback) {
    var difficulty = game && game.difficulty;
    var value = difficulty && (difficulty[key] == null && difficulty.modifiers ? difficulty.modifiers[key] : difficulty[key]);
    value = Number(value);
    return isFinite(value) && value > 0 ? value : fallback;
  }

  function audio(game, name, options) {
    if (!game || !game.audio) return;
    try {
      if (typeof game.audio.play === "function") game.audio.play(name, options);
      else if (typeof game.audio.sfx === "function") game.audio.sfx(name, options);
      else if (typeof game.audio.playSfx === "function") game.audio.playSfx(name, options);
    } catch (ignore) { /* Boss combat remains playable without sound. */ }
  }

  function fx(game) { return game && game.particles && typeof game.particles === "object" ? game.particles : null; }

  function collides(game, x, y, radius) {
    try {
      if (game && game.worlds && typeof game.worlds.collides === "function") return !!game.worlds.collides(x, y, radius);
      if (game && game.worlds && game.worlds.current && typeof game.worlds.current.collides === "function") return !!game.worlds.current.collides(x, y, radius);
      if (game && game.world && typeof game.world.collides === "function") return !!game.world.collides(x, y, radius);
    } catch (ignore) { return false; }
    return false;
  }

  var BOSS_CONFIG = {
    creakingOne: {
      name: "The Creaking One", subtitle: "Corrupted Guardian", hp: 850, damage: 22, speed: 43, radius: 38,
      color: "#58422f", accent: "#90b94f", reward: "forest_relic", gold: 145,
      phases: [0.5],
      attacks: ["rootSlam", "thornBarrage", "vineGrab", "fallingBranches", "summonSlimes", "groundShockwave"],
      attackLabels: { rootSlam: "Root Slam", thornBarrage: "Thorn Barrage", vineGrab: "Vine Grab", fallingBranches: "Falling Branches", summonSlimes: "Awaken the Corrupted", groundShockwave: "Ancient Shockwave" }
    },
    nyxfang: {
      name: "Nyxfang", subtitle: "The Shadow Wolf", hp: 1120, damage: 27, speed: 118, radius: 31,
      color: "#29273e", accent: "#a263d0", reward: "moonfang_amulet", gold: 220,
      phases: [0.4],
      attacks: ["fastLunge", "shadowClones", "wolfSpirits", "invisibility", "darkProjectiles", "shadowHowl"],
      attackLabels: { fastLunge: "Night Lunge", shadowClones: "Shadow Clones", wolfSpirits: "Wolf Spirit Summons", invisibility: "Veil of Night", darkProjectiles: "Dark Projectile Storm", shadowHowl: "Dread Howl" }
    },
    gorath: {
      name: "Gorath", subtitle: "The Crystal Titan", hp: 1480, damage: 34, speed: 37, radius: 43,
      color: "#3f5265", accent: "#67e1ed", reward: "titan_prism", gold: 310,
      phases: [0.55], crystals: 3,
      attacks: ["groundSlam", "fallingCrystals", "laserBeams", "summonStone", "crystalShockwaves"],
      attackLabels: { groundSlam: "Titan Ground Slam", fallingCrystals: "Falling Crystals", laserBeams: "Prismatic Beams", summonStone: "Summon Stone Creatures", crystalShockwaves: "Crystal Shockwaves" }
    },
    eclipseWarden: {
      name: "The Eclipse Warden", subtitle: "Keeper of the Mythic Blade", hp: 2100, damage: 38, speed: 92, radius: 40,
      color: "#17101f", accent: "#ff4fd8", reward: "chaos_fragment", gold: 900,
      phases: [0.62, 0.32],
      attacks: ["darkProjectiles", "magicCircles", "dashAttack", "chaosBeams", "areaExplosions", "fallingEnergy", "chaosShockwaves", "fireAndDark", "powerCharge", "chaosMeteor"],
      attackLabels: {
        darkProjectiles: "Eclipse Bolts", magicCircles: "Black Sun Sigils", dashAttack: "Nightmare Rush", chaosBeams: "Twin Eclipse Beams",
        areaExplosions: "Umbral Detonation", fallingEnergy: "Falling Night", chaosShockwaves: "Eclipse Shockwave", fireAndDark: "Hellfire Veil",
        powerCharge: "Warden's Charge", chaosMeteor: "Black Star Rain"
      }
    },
    velymoor: {
      name: "Velymoor", subtitle: "Bearer of the Orb of Chaos", hp: 2820, damage: 43, speed: 101, radius: 29,
      color: "#22172e", accent: "#d94eda", reward: "orb_shard", gold: 600,
      phases: [0.72, 0.45, 0.18],
      attacks: ["swordCombo", "darkProjectiles", "teleportStrike", "summonMinions", "magicCircles", "dashAttack", "chaosDash", "chaosSlash"],
      phase2Attacks: ["chaosBeams", "areaExplosions", "darkClones", "fallingEnergy", "screenDistortion", "summonMonsters", "orbBarrage", "voidPrison", "velymoorClones"],
      phase3Attacks: ["clawAttack", "chaosShockwaves", "fireAndDark", "arenaDestruction", "powerCharge", "summonChaos", "chaosMeteor", "orbOverload"],
      phase4Attacks: ["collapseStorm", "orbFracture", "finalOnslaught", "chaosDash", "chaosMeteor", "orbOverload"],
      attackLabels: {
        swordCombo: "Kingbreaker Combo", darkProjectiles: "Dark Projectiles", teleportStrike: "Teleport Strike", summonMinions: "Call of Ruin", magicCircles: "Magic Circles", dashAttack: "Void Dash",
        chaosBeams: "Chaos Beams", areaExplosions: "Chaos Detonation", darkClones: "Dark Clones", fallingEnergy: "Falling Chaos", screenDistortion: "Reality Fracture", summonMonsters: "Legion of the Orb",
        clawAttack: "Chaos Claw", chaosShockwaves: "Worldbreaker Shockwaves", fireAndDark: "Fire and Dark Magic", arenaDestruction: "Arena Destruction", powerCharge: "Cataclysmic Charge", summonChaos: "Summon Chaos Creatures",
        collapseStorm: "The Realm Collapses", orbFracture: "Orb Fracture", finalOnslaught: "Final Onslaught",
        chaosDash: "Chaos Dash", orbBarrage: "Orb Barrage", chaosSlash: "Chaos Slash", voidPrison: "Void Prison", chaosMeteor: "Chaos Meteor", velymoorClones: "Shadow Clones", orbOverload: "Orb Overload"
      }
    }
  };

  var BOSS_ALIASES = {
    creaking: "creakingOne", tree: "creakingOne", "theCreakingOne": "creakingOne", "The Creaking One": "creakingOne",
    nyx: "nyxfang", "Nyxfang, the Shadow Wolf": "nyxfang", crystalTitan: "gorath", "Gorath, the Crystal Titan": "gorath",
    eclipse: "eclipseWarden", eclipse_warden: "eclipseWarden", "Eclipse Warden": "eclipseWarden", "The Eclipse Warden": "eclipseWarden",
    final: "velymoor", "Velymoor": "velymoor"
  };

  function normalizeBoss(type) {
    type = type || "creakingOne";
    return BOSS_ALIASES[type] || type;
  }

  function Boss(game, type, x, y, options) {
    options = options || {};
    type = normalizeBoss(type);
    var config = BOSS_CONFIG[type] || BOSS_CONFIG.creakingOne;
    BaseEnemy.call(this, game, type, x, y, {
      config: {
        name: config.name, behavior: "boss", color: config.color, accent: config.accent,
        hp: config.hp, damage: config.damage, speed: config.speed, radius: config.radius,
        aggro: 900, attackRange: 75, attackDelay: 1.5, gold: [0, 0]
      },
      noDrops: true,
      id: options.id,
      health: options.health,
      damage: options.damage,
      speed: options.speed
    });
    this.bossType = type;
    this.config = config;
    this.name = config.name;
    this.subtitle = config.subtitle;
    this.radius = config.radius;
    this.phase = 1;
    this.previousPhase = 1;
    this.introDuration = options.skipIntro ? 0 : (type === "velymoor" ? 3.2 : 2.35);
    this.introTimer = this.introDuration;
    this.intro = this.introTimer > 0;
    this.introHold = !!options.introHold;
    this.introLocksPlayer = !!options.introHold;
    this.invulnerable = this.intro;
    this.bossAttack = null;
    this.lastAttack = "";
    this.attackCooldown = this.intro ? 1.3 : 0.8;
    this.hazards = [];
    this.visualClones = [];
    this.dying = false;
    this.deathTimer = 0;
    this.deathDuration = type === "velymoor" ? 4.4 : 2.3;
    this._finishedDeath = false;
    this.arenaX = Number(options.arenaX);
    this.arenaY = Number(options.arenaY);
    if (!isFinite(this.arenaX)) this.arenaX = this.x;
    if (!isFinite(this.arenaY)) this.arenaY = this.y;
    this.arenaRadius = Number(options.arenaRadius) || (type === "velymoor" ? 390 : 330);
    this.phasePulse = 0;
    this.attackLabelTimer = 0;
    this.lungeDamageMultiplier = 1;
    this.enraged = false;
    this.armorBroken = type !== "gorath";
    this.vulnerableTimer = 0;
    this.finalPhase = false;
    this.finalSurvival = 0;
    this.finalStrikeReady = false;
    this._surviveTextCooldown = 0;
    this.visualScale = type === "velymoor" ? 5 : 1;
    this.chaosAuraAngle = random(0, TAU);
    this.afterimages = [];
    this.chaosSlashes = [];
    this.corruptionZones = [];
    this.chaosClones = [];
    this.orbBarrage = null;
    this.overloadCharge = 0;
    this.phaseTransitionTimer = 0;
    this._trailClock = 0;
    this._chaosPulseTriggered = false;
    this.pendingForcedAttack = "";
    this._finalFlashClock = 0;
    this._deathExplosionDone = false;
    this._deathWhiteoutDone = false;
    this._defeatDialogueComplete = true;
    this.arenaCracks = [];
    if (type === "velymoor") {
      for (var crack = 0; crack < 15; crack += 1) {
        var crackAngle = crack * TAU / 15 + random(-0.13, 0.13);
        this.arenaCracks.push({ angle: crackAngle, inner: random(48, 105), length: random(70, 155), branch: random(-0.5, 0.5), lift: random(0, TAU) });
      }
    }

    this.crystals = [];
    if (type === "gorath") {
      for (var c = 0; c < 3; c += 1) {
        var crystalAngle = -Math.PI * 0.5 + c * TAU / 3;
        this.crystals.push({
          x: this.arenaX + Math.cos(crystalAngle) * 142,
          y: this.arenaY + Math.sin(crystalAngle) * 142,
          angle: crystalAngle,
          radius: 18,
          health: Math.round(125 * difficultyValue(this.game, "enemyHealth", 1)),
          maxHealth: Math.round(125 * difficultyValue(this.game, "enemyHealth", 1)),
          dead: false,
          flash: 0,
          pulse: random(0, TAU)
        });
      }
    }

    this.game.enemies = this.game.enemies || [];
    if (this.game.enemies.indexOf(this) < 0) this.game.enemies.push(this);
    this.game.boss = this;
    if (!options.deferMusic) audio(this.game, type === "velymoor" ? "velymoorTheme" : "bossTheme", { music: true });
    if (this.game.quests && typeof this.game.quests.event === "function") this.game.quests.event("bossEncounter", { boss: this, type: type });
  }

  Boss.prototype = Object.create(BaseEnemy.prototype);
  Boss.prototype.constructor = Boss;

  Boss.prototype._toast = function (message) {
    if (this.game && this.game.ui && typeof this.game.ui.toast === "function") this.game.ui.toast(message);
  };

  Boss.prototype._shake = function (amount, duration) {
    if (this.game && typeof this.game.shake === "function" && (!this.game.settings || this.game.settings.screenShake !== false)) this.game.shake(amount, duration);
  };

  Boss.prototype.releaseIntro = function () {
    this.introHold = false;
    this.intro = this.introTimer > 0;
    this.invulnerable = this.intro;
    this.phasePulse = Math.max(this.phasePulse, 1.1);
  };

  Boss.prototype._recordAfterimage = function (x, y, strong) {
    if (this.bossType !== "velymoor" || !isFinite(x) || !isFinite(y)) return;
    this.afterimages.push({ x: x, y: y, life: strong ? 0.62 : 0.34, maxLife: strong ? 0.62 : 0.34, facing: this.facing, phase: this.phase });
    while (this.afterimages.length > 8) this.afterimages.shift();
  };

  Boss.prototype._addCorruptionZone = function (x, y, radius, life, armDelay) {
    if (this.bossType !== "velymoor") return null;
    var zone = {
      x: x, y: y, radius: radius || 31, life: life || 3.2, maxLife: life || 3.2,
      armDelay: armDelay == null ? 0.36 : armDelay, age: 0, tick: 0, phase: random(0, TAU)
    };
    this.corruptionZones.push(zone);
    while (this.corruptionZones.length > 8) this.corruptionZones.shift();
    return zone;
  };

  Boss.prototype._phaseFromHealth = function () {
    var ratio = this.health / this.maxHealth;
    if (this.bossType === "velymoor") return ratio <= 0.18 ? 4 : (ratio <= 0.45 ? 3 : (ratio <= 0.72 ? 2 : 1));
    if (this.bossType === "creakingOne") return ratio <= 0.5 ? 2 : 1;
    if (this.bossType === "nyxfang") return ratio <= 0.4 ? 2 : 1;
    return ratio <= 0.55 ? 2 : 1;
  };

  Boss.prototype._phaseDamageMultiplier = function () {
    if (this.bossType !== "velymoor") return 1;
    if (this.phase >= 4) return 5;
    if (this.phase >= 2) return 2;
    return 1;
  };

  Boss.prototype._scaledBossDamage = function (damage) {
    damage = Math.max(0, Number(damage) || 0);
    return damage * this._phaseDamageMultiplier();
  };

  Boss.prototype._setPhase = function (phase) {
    if (phase <= this.phase) return;
    this.previousPhase = this.phase;
    this.phase = phase;
    this.phasePulse = 1.35;
    this.phaseTransitionTimer = 1.25;
    this.enraged = phase > 1;
    this.bossAttack = null;
    this.attackCooldown = 1.05;
    var burst = fx(this.game);
    if (burst && typeof burst.burst === "function") {
      burst.burst(this.x, this.y, this.config.accent, phase === 4 ? 55 : 32, phase === 4 ? 220 : 160, phase === 4 ? 6 : 5, 1, { kind: "spark", glow: 10 });
    }
    this._shake(phase === 4 ? 13 : 9, phase === 4 ? 0.65 : 0.4);
    audio(this.game, phase === 4 ? "orbBreak" : "bossPhase");
    if (this.bossType === "creakingOne") this._toast("The ancient guardian is enraged!");
    else if (this.bossType === "nyxfang") this._toast("Nyxfang sheds the last of its restraint.");
    else if (this.bossType === "gorath") this._toast("Gorath draws power from the cavern!");
    else if (phase === 2) this._toast("PHASE II — Velymoor unleashes 2× CHAOS DAMAGE!");
    else if (phase === 3) { this._toast("PHASE III — Velymoor becomes a creature of chaos! 2× DAMAGE!"); this.radius = 48; }
    else if (phase === 4) {
      this.finalPhase = true;
      this.finalSurvival = 11.5;
      this.finalStrikeReady = false;
      this.health = this.hp = 1;
      this.radius = 52;
      this.pendingForcedAttack = "orbOverload";
      this._toast("PHASE IV — 5× DAMAGE! THE ORB IS BREAKING — SURVIVE!");
      if (this.game.effects && typeof this.game.effects.warp === "function") this.game.effects.warp(5, 12);
    }
    if (this.bossType === "velymoor" && this.game.audio && typeof this.game.audio.setBossIntensity === "function") this.game.audio.setBossIntensity(phase);
  };

  Boss.prototype._moveBoss = function (angle, speed, dt) {
    if (!isFinite(angle)) return;
    var oldX = this.x;
    var oldY = this.y;
    var nx = this.x + Math.cos(angle) * speed * dt;
    var ny = this.y + Math.sin(angle) * speed * dt;
    var fromCenterX = nx - this.arenaX;
    var fromCenterY = ny - this.arenaY;
    var limit = this.arenaRadius - this.radius - 12;
    if (fromCenterX * fromCenterX + fromCenterY * fromCenterY > limit * limit) {
      angle = Math.atan2(this.arenaY - this.y, this.arenaX - this.x);
      nx = this.x + Math.cos(angle) * speed * dt;
      ny = this.y + Math.sin(angle) * speed * dt;
    }
    if (!collides(this.game, nx, this.y, this.radius)) this.x = nx;
    if (!collides(this.game, this.x, ny, this.radius)) this.y = ny;
    this.facing = angle;
    this.walkPhase += dt * (4 + speed / 35);
    if (this.bossType === "velymoor") {
      this._trailClock -= dt;
      if (this._trailClock <= 0 && distanceSq({ x: oldX, y: oldY }, this) > 7) {
        this._recordAfterimage(oldX, oldY, false);
        this._trailClock = 0.09;
      }
    }
  };

  Boss.prototype._teleport = function (x, y) {
    var oldX = this.x;
    var oldY = this.y;
    if (!collides(this.game, x, y, this.radius)) { this.x = x; this.y = y; }
    if (this.bossType === "velymoor") {
      for (var trail = 0; trail < 4; trail += 1) {
        var trailT = trail / 4;
        this._recordAfterimage(oldX + (this.x - oldX) * trailT, oldY + (this.y - oldY) * trailT, true);
      }
    }
    var burst = fx(this.game);
    if (burst && typeof burst.smoke === "function") { burst.smoke(oldX, oldY, this.config.accent, 18); burst.smoke(this.x, this.y, this.config.accent, 18); }
    audio(this.game, "teleport");
  };

  Boss.prototype._spawnProjectile = function (kind, angle, speed, damage, options) {
    if (this.bossType === "velymoor") { speed *= 1.1; damage = this._scaledBossDamage(damage); }
    options = Object.assign({
      x: this.x + Math.cos(angle) * (this.radius + 8), y: this.y + Math.sin(angle) * (this.radius + 8),
      angle: angle, speed: speed, damage: damage, owner: this, team: "enemy", kind: kind,
      color: this.config.accent, accent: "#ffffff", radius: 6, knockback: 145
    }, options || {});
    if (this.game.combat && typeof this.game.combat.spawnEnemyProjectile === "function") return this.game.combat.spawnEnemyProjectile(options);
    if (typeof E.Projectile === "function") {
      var projectile = new E.Projectile(this.game, options);
      this.game.projectiles = this.game.projectiles || [];
      this.game.projectiles.push(projectile);
      return projectile;
    }
    return null;
  };

  Boss.prototype._radial = function (count, speed, damage, kind, offset, options) {
    for (var i = 0; i < count; i += 1) this._spawnProjectile(kind || "darkOrb", (offset || 0) + i * TAU / count, speed, damage, options);
  };

  Boss.prototype._aimed = function (count, spread, speed, damage, kind, options) {
    var player = this.game.player;
    if (!player) return;
    var angle = Math.atan2(player.y - this.y, player.x - this.x);
    for (var i = 0; i < count; i += 1) {
      var t = count === 1 ? 0 : i / (count - 1) - 0.5;
      this._spawnProjectile(kind || "darkOrb", angle + t * spread, speed, damage, options);
    }
  };

  Boss.prototype._addHazard = function (kind, x, y, radius, delay, damage, options) {
    options = options || {};
    if (this.bossType === "velymoor") damage = this._scaledBossDamage(damage);
    var hazard = {
      kind: kind, x: x, y: y, radius: radius, time: delay, total: delay,
      damage: damage, color: options.color || this.config.accent, width: options.width || radius * 0.35,
      length: options.length || radius, angle: options.angle || 0, slow: options.slow || 0,
      shake: options.shake || 0, owner: this, resolved: false, age: 0
    };
    this.hazards.push(hazard);
    return hazard;
  };

  Boss.prototype._resolveHazard = function (hazard) {
    if (hazard.resolved) return;
    hazard.resolved = true;
    var player = this.game.player;
    var hit = false;
    if (player && !player.dead) {
      if (hazard.kind === "beam") {
        var px = player.x - hazard.x;
        var py = player.y - hazard.y;
        var forward = px * Math.cos(hazard.angle) + py * Math.sin(hazard.angle);
        var side = Math.abs(-px * Math.sin(hazard.angle) + py * Math.cos(hazard.angle));
        hit = forward >= 0 && forward <= hazard.length && side <= hazard.width * 0.5 + (player.radius || 12);
      } else {
        var dx = player.x - hazard.x;
        var dy = player.y - hazard.y;
        hit = dx * dx + dy * dy <= Math.pow(hazard.radius + (player.radius || 12), 2);
      }
      if (hit && typeof player.takeDamage === "function") {
        player.takeDamage(hazard.damage, this);
        if (hazard.slow && typeof player.applySlow === "function") player.applySlow(hazard.slow, 1.8);
      }
    }
    var burst = fx(this.game);
    if (burst) {
      if (typeof burst.burst === "function") burst.burst(hazard.x, hazard.y, hazard.color, hazard.kind === "beam" ? 12 : 18, 135, 4, 0.55, { kind: "spark", glow: 7 });
      if (typeof burst.smoke === "function" && hazard.kind !== "beam") burst.smoke(hazard.x, hazard.y, hazard.color, 5);
    }
    if (hazard.shake) this._shake(hazard.shake, 0.2);
    if (hazard.kind === "meteor") this._addCorruptionZone(hazard.x, hazard.y, Math.max(25, hazard.radius * 0.86), 3.4, 0.28);
  };

  Boss.prototype._updateHazards = function (dt) {
    var write = 0;
    for (var i = 0; i < this.hazards.length; i += 1) {
      var hazard = this.hazards[i];
      hazard.time -= dt;
      hazard.age += dt;
      if (hazard.time <= 0 && !hazard.resolved) this._resolveHazard(hazard);
      if (hazard.time > -0.28) { this.hazards[write] = hazard; write += 1; }
    }
    this.hazards.length = write;
  };

  Boss.prototype._spawnMinions = function (types, count, radius) {
    if (typeof E.createEnemy !== "function") return;
    var existing = this.game.enemies || [];
    var activeMinions = 0;
    for (var e = 0; e < existing.length; e += 1) if (existing[e] && existing[e] !== this && !existing[e].dead && !existing[e].bossType) activeMinions += 1;
    count = Math.min(count, Math.max(0, 11 - activeMinions));
    for (var i = 0; i < count; i += 1) {
      var angle = i * TAU / Math.max(1, count) + random(-0.2, 0.2);
      var x = this.x + Math.cos(angle) * (radius || 80);
      var y = this.y + Math.sin(angle) * (radius || 80);
      if (collides(this.game, x, y, 14)) { x = this.arenaX + Math.cos(angle) * 100; y = this.arenaY + Math.sin(angle) * 100; }
      var minion = E.createEnemy(this.game, types[i % types.length], x, y, { summoned: true, noDrops: this.bossType === "velymoor" });
      this.game.enemies.push(minion);
      var burst = fx(this.game);
      if (burst && typeof burst.smoke === "function") burst.smoke(x, y, this.config.accent, 9);
    }
    audio(this.game, "summon");
  };

  Boss.prototype._beginLunge = function (x, y, speed, duration, damageMultiplier) {
    var angle = Math.atan2(y - this.y, x - this.x);
    this.lungeTimer = duration;
    this.lungeVx = Math.cos(angle) * speed;
    this.lungeVy = Math.sin(angle) * speed;
    this.facing = angle;
    this.hasHitDuringLunge = false;
    this.lungeDamageMultiplier = damageMultiplier || 1;
    audio(this.game, "bossCharge");
  };

  Boss.prototype._attackDuration = function (name) {
    var durations = {
      rootSlam: 0.72, thornBarrage: 0.62, vineGrab: 0.75, fallingBranches: 0.9, summonSlimes: 0.7, groundShockwave: 0.8,
      fastLunge: 0.38, shadowClones: 0.62, wolfSpirits: 0.68, invisibility: 0.55, darkProjectiles: 0.55, shadowHowl: 0.85,
      groundSlam: 0.82, fallingCrystals: 0.9, laserBeams: 0.88, summonStone: 0.75, crystalShockwaves: 0.78,
      swordCombo: 0.42, teleportStrike: 0.48, summonMinions: 0.65, magicCircles: 0.76, dashAttack: 0.38,
      chaosBeams: 0.82, areaExplosions: 0.72, darkClones: 0.6, fallingEnergy: 0.7, screenDistortion: 0.78, summonMonsters: 0.72,
      clawAttack: 0.58, chaosShockwaves: 0.68, fireAndDark: 0.64, arenaDestruction: 0.85, powerCharge: 0.56, summonChaos: 0.68,
      collapseStorm: 0.48, orbFracture: 0.5, finalOnslaught: 0.38,
      chaosDash: 0.58, orbBarrage: 0.82, chaosSlash: 0.92, voidPrison: 0.9, chaosMeteor: 1.05, velymoorClones: 0.88, orbOverload: 2.75
    };
    return durations[name] || 0.55;
  };

  Boss.prototype._chooseAttack = function () {
    if (this.bossType === "velymoor" && this.pendingForcedAttack) {
      var forced = this.pendingForcedAttack;
      this.pendingForcedAttack = "";
      return forced;
    }
    var pool;
    if (this.bossType === "velymoor") {
      pool = this.phase === 1 ? this.config.attacks : (this.phase === 2 ? this.config.phase2Attacks : (this.phase === 3 ? this.config.phase3Attacks : this.config.phase4Attacks));
    } else pool = this.config.attacks;
    var choices = [];
    for (var i = 0; i < pool.length; i += 1) if (pool[i] !== this.lastAttack) choices.push(pool[i]);
    if (!choices.length) choices = pool;
    var name = choices[Math.floor(Math.random() * choices.length)];
    var player = this.game.player;
    if (this.bossType === "creakingOne" && player && distanceSq(this, player) < 85 * 85 && Math.random() < 0.45) name = Math.random() < 0.5 ? "rootSlam" : "groundShockwave";
    if (this.bossType === "nyxfang" && player && distanceSq(this, player) > 190 * 190 && Math.random() < 0.55) name = "fastLunge";
    return name;
  };

  Boss.prototype._prepareAttack = function (name) {
    var player = this.game.player;
    var duration = this._attackDuration(name);
    this.lastAttack = name;
    this.attackLabelTimer = duration + 0.35;
    this.bossAttack = {
      name: name, time: duration, total: duration,
      targetX: player ? player.x : this.x,
      targetY: player ? player.y : this.y,
      angle: player ? Math.atan2(player.y - this.y, player.x - this.x) : this.facing
    };
    this.facing = this.bossAttack.angle;
    if (name === "orbOverload") {
      this.overloadCharge = 0.001;
      this._finalFlashClock = 0;
      if (this.game.effects && typeof this.game.effects.warp === "function") this.game.effects.warp(2.2, duration);
    }
    audio(this.game, "bossTelegraph");
  };

  Boss.prototype._hurtAt = function (x, y, radius, multiplier, slow) {
    var player = this.game.player;
    if (!player || player.dead) return false;
    var dx = player.x - x;
    var dy = player.y - y;
    if (dx * dx + dy * dy > Math.pow(radius + (player.radius || 12), 2)) return false;
    if (typeof player.takeDamage === "function") player.takeDamage(this._scaledBossDamage(this.damage * (multiplier || 1)), this);
    if (slow && typeof player.applySlow === "function") player.applySlow(slow, 2);
    return true;
  };

  Boss.prototype._resolveAttack = function (attack) {
    if (!attack || this.dying) return;
    var name = attack.name;
    var player = this.game.player;
    var phaseBoost = 1 + (this.phase - 1) * 0.08;
    var i;
    if (name === "rootSlam") {
      this._addHazard("circle", attack.targetX, attack.targetY, 58, 0.22, this.damage * 1.25, { color: "#7daa4c", shake: 7 });
      for (i = 0; i < 4; i += 1) this._addHazard("circle", attack.targetX + Math.cos(i * Math.PI * 0.5) * 64, attack.targetY + Math.sin(i * Math.PI * 0.5) * 64, 22, 0.38 + i * 0.06, this.damage * 0.7, { color: "#6b943f" });
    } else if (name === "thornBarrage") {
      this._aimed(this.phase > 1 ? 9 : 6, this.phase > 1 ? 1.25 : 0.8, 235, this.damage * 0.58, "thorn", { color: "#9acb54", radius: 4 });
    } else if (name === "vineGrab") {
      this._addHazard("circle", attack.targetX, attack.targetY, 36, 0.48, this.damage * 0.85, { color: "#4c923d", slow: 0.32 });
    } else if (name === "fallingBranches") {
      for (i = 0; i < (this.phase > 1 ? 8 : 5); i += 1) this._addHazard("branch", attack.targetX + random(-155, 155), attack.targetY + random(-125, 125), random(26, 39), 0.45 + i * 0.11, this.damage * 0.82, { color: "#755238", shake: i === 0 ? 3 : 0 });
    } else if (name === "summonSlimes") {
      this._spawnMinions(this.phase > 1 ? ["poisonSlime", "slime"] : ["slime"], this.phase > 1 ? 4 : 3, 92);
    } else if (name === "groundShockwave") {
      this._radial(this.phase > 1 ? 18 : 13, 165, this.damage * 0.65, "thorn", this.age, { color: "#91bd52", radius: 5, life: 2.4 });
      this._hurtAt(this.x, this.y, 78, 1.18);
      this._shake(8, 0.32);
    } else if (name === "fastLunge") {
      this._beginLunge(attack.targetX, attack.targetY, this.speed * (this.phase > 1 ? 4.8 : 4.1), 0.48, 1.4);
    } else if (name === "shadowClones") {
      for (i = 0; i < (this.phase > 1 ? 5 : 3); i += 1) {
        var ca = i * TAU / (this.phase > 1 ? 5 : 3);
        this.visualClones.push({ x: this.x + Math.cos(ca) * 95, y: this.y + Math.sin(ca) * 95, life: 1.4, maxLife: 1.4, angle: Math.atan2(attack.targetY - (this.y + Math.sin(ca) * 95), attack.targetX - (this.x + Math.cos(ca) * 95)) });
        this._addHazard("beam", this.x + Math.cos(ca) * 95, this.y + Math.sin(ca) * 95, 240, 0.7 + i * 0.08, this.damage * 0.72, { angle: Math.atan2(attack.targetY - (this.y + Math.sin(ca) * 95), attack.targetX - (this.x + Math.cos(ca) * 95)), length: 240, width: 18, color: "#7653b2" });
      }
    } else if (name === "wolfSpirits") {
      this._spawnMinions(["wolf"], this.phase > 1 ? 3 : 2, 110);
    } else if (name === "invisibility") {
      this.invisibleTimer = 1.55;
      var ia = random(0, TAU);
      this._teleport(attack.targetX + Math.cos(ia) * 105, attack.targetY + Math.sin(ia) * 105);
      this._addHazard("circle", attack.targetX, attack.targetY, 48, 0.7, this.damage * 1.1, { color: "#6c4a9a" });
    } else if (name === "darkProjectiles") {
      this._aimed(this.phase > 1 ? 9 : 6, 1.05, 265, this.damage * 0.58, "darkOrb", { homing: this.phase > 1 ? 0.7 : 0, color: "#a55bd2" });
    } else if (name === "shadowHowl") {
      this._hurtAt(this.x, this.y, 265, 0.5, 0.42);
      this._radial(this.phase > 1 ? 16 : 12, 145, this.damage * 0.52, "darkOrb", this.age, { color: "#8260b7", radius: 5 });
      this._shake(7, 0.4);
      audio(this.game, "wolfHowl");
    } else if (name === "groundSlam") {
      this._addHazard("circle", this.x, this.y, 105, 0.18, this.damage * 1.35, { color: "#6ddce4", shake: 10 });
      for (i = 0; i < 8; i += 1) this._addHazard("crystal", this.x + Math.cos(i * TAU / 8) * 105, this.y + Math.sin(i * TAU / 8) * 105, 24, 0.35 + i * 0.035, this.damage * 0.62, { color: "#68dbe6" });
    } else if (name === "fallingCrystals") {
      for (i = 0; i < (this.phase > 1 ? 10 : 7); i += 1) this._addHazard("crystal", attack.targetX + random(-175, 175), attack.targetY + random(-145, 145), random(22, 34), 0.4 + i * 0.1, this.damage * 0.72, { color: "#63e1ec", shake: i % 3 === 0 ? 2 : 0 });
    } else if (name === "laserBeams") {
      var beamCount = this.phase > 1 ? 4 : 3;
      for (i = 0; i < beamCount; i += 1) this._addHazard("beam", this.x, this.y, 430, 0.38 + i * 0.2, this.damage * 0.82, { angle: attack.angle + (i - (beamCount - 1) * 0.5) * 0.42, length: 430, width: 24, color: "#62edf2", shake: 3 });
    } else if (name === "summonStone") {
      this._spawnMinions(["golem", "crystalCreature"], this.phase > 1 ? 3 : 2, 125);
    } else if (name === "crystalShockwaves") {
      this._radial(this.phase > 1 ? 20 : 14, 185, this.damage * 0.6, "crystal", this.age, { color: "#68e4ed", radius: 5, pierce: 0 });
      this._shake(8, 0.35);
    } else if (name === "swordCombo") {
      if (player) {
        this._teleport(player.x - Math.cos(attack.angle) * 48, player.y - Math.sin(attack.angle) * 48);
        this._addHazard("circle", player.x, player.y, 62, 0.18, this.damage * 1.15, { color: "#d864d4", shake: 5 });
        this._addHazard("circle", player.x + Math.cos(attack.angle + 1.2) * 48, player.y + Math.sin(attack.angle + 1.2) * 48, 48, 0.38, this.damage * 0.72, { color: "#9f4dbe" });
      }
    } else if (name === "teleportStrike") {
      if (player) this._teleport(player.x - Math.cos(attack.angle) * 55, player.y - Math.sin(attack.angle) * 55);
      this._addHazard("circle", attack.targetX, attack.targetY, 58, 0.16, this.damage * 1.28, { color: "#dc58d3", shake: 6 });
    } else if (name === "summonMinions") {
      this._spawnMinions(["shadowGoblin", "darkMage"], 3, 115);
    } else if (name === "magicCircles") {
      for (i = 0; i < 5; i += 1) this._addHazard("magic", attack.targetX + random(-150, 150), attack.targetY + random(-125, 125), 40, 0.38 + i * 0.15, this.damage * 0.78, { color: "#b348c6" });
    } else if (name === "dashAttack") {
      this._beginLunge(attack.targetX, attack.targetY, 510, 0.55, 1.35);
    } else if (name === "chaosDash") {
      if (player) {
        var playerFacing = isFinite(player.facing) ? player.facing : attack.angle;
        var behindX = player.x - Math.cos(playerFacing) * 78;
        var behindY = player.y - Math.sin(playerFacing) * 78;
        this._teleport(behindX, behindY);
        this.facing = Math.atan2(player.y - this.y, player.x - this.x);
        this._addHazard("circle", player.x, player.y, 54, 0.26, this.damage * 1.08, { color: "#e45bd6", shake: 5 });
      }
    } else if (name === "orbBarrage") {
      this.orbBarrage = {
        waves: this.phase >= 4 ? 4 : 3,
        clock: 0,
        offset: this.age * 0.9,
        gapAngle: attack.angle,
        wave: 0
      };
    } else if (name === "chaosSlash") {
      var slashSpeed = 385;
      this.chaosSlashes.push({
        x: this.x + Math.cos(attack.angle) * 38, y: this.y + Math.sin(attack.angle) * 38,
        vx: Math.cos(attack.angle) * slashSpeed, vy: Math.sin(attack.angle) * slashSpeed,
        angle: attack.angle, radius: 27, life: 1.42, maxLife: 1.42, damage: this._scaledBossDamage(this.damage * 0.9), hit: false
      });
      while (this.chaosSlashes.length > 3) this.chaosSlashes.shift();
      for (i = 1; i <= 3; i += 1) this._addCorruptionZone(this.x + Math.cos(attack.angle) * (i * 112), this.y + Math.sin(attack.angle) * (i * 112), 29, 3.25, 0.52 + i * 0.08);
      this._shake(6, 0.28);
    } else if (name === "voidPrison") {
      this._addHazard("prison", attack.targetX, attack.targetY, 92, 1.48, this.damage * 1.18, { color: "#b84ee2", shake: 8 });
    } else if (name === "chaosMeteor") {
      var meteorCount = this.phase >= 4 ? 9 : 7;
      for (i = 0; i < meteorCount; i += 1) {
        var meteorX = i === 0 ? attack.targetX : attack.targetX + random(-190, 190);
        var meteorY = i === 0 ? attack.targetY : attack.targetY + random(-150, 150);
        this._addHazard("meteor", meteorX, meteorY, random(27, 38), 0.58 + i * 0.13, this.damage * 0.78, { color: i % 2 ? "#9d4cf0" : "#e657d2", shake: i % 3 === 0 ? 3 : 0 });
      }
    } else if (name === "velymoorClones") {
      var fakeCount = 3 + Math.floor(Math.random() * 3);
      var realSlot = Math.floor(Math.random() * (fakeCount + 1));
      var formationRadius = 112;
      this.chaosClones.length = 0;
      for (i = 0; i <= fakeCount; i += 1) {
        var formationAngle = attack.angle + Math.PI + i * TAU / (fakeCount + 1);
        var formationX = attack.targetX + Math.cos(formationAngle) * formationRadius;
        var formationY = attack.targetY + Math.sin(formationAngle) * formationRadius;
        if (i === realSlot) this._teleport(formationX, formationY);
        else this.chaosClones.push({ x: formationX, y: formationY, radius: 25, life: 4.6, maxLife: 4.6, shotClock: 0.85 + i * 0.12, facing: Math.atan2(attack.targetY - formationY, attack.targetX - formationX), dead: false });
      }
      this._toast("Find the true bearer before the shadows close in.");
    } else if (name === "orbOverload") {
      this.overloadCharge = 0;
      this._addHazard("beam", this.x, this.y - 15, Math.max(560, this.arenaRadius * 2.1), 0.34, this.damage * 1.42, { angle: attack.angle, length: Math.max(560, this.arenaRadius * 2.1), width: 54, color: "#f05bdf", shake: 12 });
      this._shake(12, 0.55);
      if (this.game && typeof this.game.flash === "function") this.game.flash("#d970ff", 0.22);
    } else if (name === "chaosBeams") {
      for (i = 0; i < 5; i += 1) this._addHazard("beam", this.x, this.y, 470, 0.35 + i * 0.13, this.damage * 0.76, { angle: attack.angle - 0.8 + i * 0.4, length: 470, width: 26, color: "#ef4dcc", shake: 2 });
    } else if (name === "areaExplosions") {
      for (i = 0; i < 9; i += 1) this._addHazard("magic", this.arenaX + random(-230, 230), this.arenaY + random(-190, 190), random(31, 48), 0.35 + i * 0.1, this.damage * 0.7, { color: "#e84ecf" });
    } else if (name === "darkClones") {
      for (i = 0; i < 4; i += 1) {
        var cloneAngle = i * TAU / 4;
        var cloneX = attack.targetX + Math.cos(cloneAngle) * 110;
        var cloneY = attack.targetY + Math.sin(cloneAngle) * 110;
        this.visualClones.push({ x: cloneX, y: cloneY, life: 1.6, maxLife: 1.6, angle: cloneAngle + Math.PI });
        this._addHazard("beam", cloneX, cloneY, 175, 0.55 + i * 0.09, this.damage * 0.72, { angle: cloneAngle + Math.PI, length: 175, width: 22, color: "#8f42b4" });
      }
    } else if (name === "fallingEnergy") {
      for (i = 0; i < 12; i += 1) this._addHazard("magic", attack.targetX + random(-190, 190), attack.targetY + random(-155, 155), random(22, 36), 0.3 + i * 0.075, this.damage * 0.62, { color: i % 2 ? "#ee54cb" : "#734ce0" });
    } else if (name === "screenDistortion") {
      if (this.game.effects && typeof this.game.effects.warp === "function") this.game.effects.warp(5, 2.5);
      this._radial(20, 175, this.damage * 0.52, "darkOrb", this.age, { color: "#ed4ccd", homing: 0.25, radius: 5 });
    } else if (name === "summonMonsters") {
      this._spawnMinions(["eliteSlime", "wolf", "goblinWarrior", "darkMage"], 4, 135);
    } else if (name === "clawAttack") {
      this._addHazard("circle", attack.targetX, attack.targetY, 92, 0.22, this.damage * 1.35, { color: "#f05c8e", shake: 8 });
      this._addHazard("circle", attack.targetX + Math.cos(attack.angle + 1.1) * 78, attack.targetY + Math.sin(attack.angle + 1.1) * 78, 62, 0.36, this.damage * 0.9, { color: "#b5419c" });
    } else if (name === "chaosShockwaves") {
      this._radial(24, 205, this.damage * 0.62, "darkOrb", this.age, { color: "#e94ebc", radius: 6 });
      this._radial(18, 145, this.damage * 0.48, "darkOrb", this.age + Math.PI / 18, { color: "#6f4fe0", radius: 5 });
      this._shake(10, 0.4);
    } else if (name === "fireAndDark") {
      for (i = -4; i <= 4; i += 1) this._spawnProjectile(i % 2 ? "darkOrb" : "bomb", attack.angle + i * 0.15, i % 2 ? 265 : 205, this.damage * 0.66, { color: i % 2 ? "#9b43d3" : "#f06a42", radius: 6, explosionRadius: i % 2 ? 0 : 30, life: 2.2 });
    } else if (name === "arenaDestruction") {
      for (i = 0; i < 14; i += 1) {
        var arenaAngle = random(0, TAU);
        var arenaDistance = random(75, this.arenaRadius - 35);
        this._addHazard("collapse", this.arenaX + Math.cos(arenaAngle) * arenaDistance, this.arenaY + Math.sin(arenaAngle) * arenaDistance, random(25, 42), 0.3 + i * 0.08, this.damage * 0.67, { color: "#d34a99", shake: i % 4 === 0 ? 3 : 0 });
      }
    } else if (name === "powerCharge") {
      this._beginLunge(attack.targetX, attack.targetY, 590, 0.62, 1.55);
    } else if (name === "summonChaos") {
      this._spawnMinions(["eliteWolf", "crystalCreature", "chaosMiner"], 3, 145);
    } else if (name === "collapseStorm") {
      for (i = 0; i < 11; i += 1) this._addHazard("collapse", this.arenaX + random(-250, 250), this.arenaY + random(-205, 205), random(24, 43), 0.18 + i * 0.09, this.damage * 0.62, { color: "#f15abf", shake: i % 3 === 0 ? 3 : 0 });
    } else if (name === "orbFracture") {
      this._radial(28, 230, this.damage * 0.55, "crystal", this.age, { color: "#f467d3", radius: 5, life: 2.5 });
    } else if (name === "finalOnslaught") {
      if (player) this._beginLunge(player.x, player.y, 650, 0.48, 1.48);
      for (i = 0; i < 5; i += 1) this._addHazard("magic", attack.targetX + random(-100, 100), attack.targetY + random(-100, 100), 34, 0.2 + i * 0.12, this.damage * 0.58, { color: "#ff62cf" });
    }
    this.attackCooldown = Math.max(0.36, (this.finalPhase ? 0.58 : (1.28 - (this.phase - 1) * 0.13)) / difficultyValue(this.game, "enemySpeed", 1)) * random(0.88, 1.08);
    audio(this.game, "bossAttack", { rate: phaseBoost });
  };

  Boss.prototype._updateClones = function (dt) {
    var write = 0;
    for (var i = 0; i < this.visualClones.length; i += 1) {
      var clone = this.visualClones[i];
      clone.life -= dt;
      if (clone.life > 0) { this.visualClones[write] = clone; write += 1; }
    }
    this.visualClones.length = write;
  };

  Boss.prototype._updateVelymoorEffects = function (dt) {
    if (this.bossType !== "velymoor") return;
    this.chaosAuraAngle = (this.chaosAuraAngle + dt * (0.38 + this.phase * 0.07)) % TAU;
    var i;
    var write = 0;
    for (i = 0; i < this.afterimages.length; i += 1) {
      var image = this.afterimages[i];
      image.life -= dt;
      if (image.life > 0) { this.afterimages[write] = image; write += 1; }
    }
    this.afterimages.length = write;

    if (this.bossAttack && this.bossAttack.name === "orbOverload") {
      this.overloadCharge = clamp(1 - this.bossAttack.time / Math.max(0.01, this.bossAttack.total), 0.001, 1);
      this._finalFlashClock -= dt;
      if (this._finalFlashClock <= 0 && this.overloadCharge > 0.22) {
        this._finalFlashClock = 0.24;
        if (this.game && typeof this.game.flash === "function") this.game.flash("#b54cff", 0.055 + this.overloadCharge * 0.04);
        var lightningFx = fx(this.game);
        if (lightningFx && typeof lightningFx.burst === "function") lightningFx.burst(this.x + random(-95, 95), this.y + random(-85, 45), "#dba0ff", 2, 150, 3, 0.28, { kind: "spark", glow: 9 });
      }
    } else if (this.overloadCharge > 0) this.overloadCharge = Math.max(0, this.overloadCharge - dt * 3.5);

    if (this.orbBarrage) {
      this.orbBarrage.clock -= dt;
      while (this.orbBarrage && this.orbBarrage.waves > 0 && this.orbBarrage.clock <= 0) {
        var barrage = this.orbBarrage;
        var projectileCount = this.phase >= 4 ? 18 : 16;
        var gapCenter = barrage.gapAngle + barrage.wave * 0.12;
        var ringOffset = barrage.offset + barrage.wave * 0.17;
        for (i = 0; i < projectileCount; i += 1) {
          if (this.game.projectiles && this.game.projectiles.length >= 105) break;
          var projectileAngle = ringOffset + i * TAU / projectileCount;
          if (Math.abs(angleDelta(projectileAngle, gapCenter)) < TAU / projectileCount * 1.55) continue;
          this._spawnProjectile("darkOrb", projectileAngle, 168 + barrage.wave * 17, this.damage * 0.4, {
            color: barrage.wave % 2 ? "#b650e9" : "#e356d2", accent: "#ffe4ff", radius: 5, life: 3.1, trail: false, spin: 5
          });
        }
        barrage.waves -= 1;
        barrage.wave += 1;
        barrage.clock += 0.24;
        if (barrage.waves <= 0) this.orbBarrage = null;
      }
    }

    var player = this.game.player;
    write = 0;
    for (i = 0; i < this.chaosSlashes.length; i += 1) {
      var slash = this.chaosSlashes[i];
      slash.life -= dt;
      slash.x += slash.vx * dt;
      slash.y += slash.vy * dt;
      if (!slash.hit && player && !player.dead) {
        var slashDx = player.x - slash.x;
        var slashDy = player.y - slash.y;
        if (slashDx * slashDx + slashDy * slashDy <= Math.pow(slash.radius + (player.radius || 12), 2)) {
          slash.hit = true;
          if (typeof player.takeDamage === "function") player.takeDamage(slash.damage, this);
          this._shake(7, 0.22);
        }
      }
      if (slash.life > 0) { this.chaosSlashes[write] = slash; write += 1; }
    }
    this.chaosSlashes.length = write;

    write = 0;
    for (i = 0; i < this.corruptionZones.length; i += 1) {
      var zone = this.corruptionZones[i];
      zone.life -= dt;
      zone.age += dt;
      zone.tick -= dt;
      if (zone.age >= zone.armDelay && zone.tick <= 0 && player && !player.dead) {
        var zoneDx = player.x - zone.x;
        var zoneDy = player.y - zone.y;
        if (zoneDx * zoneDx + zoneDy * zoneDy <= Math.pow(zone.radius + (player.radius || 12), 2)) {
          if (typeof player.takeDamage === "function") player.takeDamage(this._scaledBossDamage(this.damage * 0.28), this);
          zone.tick = 0.92;
        }
      }
      if (zone.life > 0) { this.corruptionZones[write] = zone; write += 1; }
    }
    this.corruptionZones.length = write;

    write = 0;
    for (i = 0; i < this.chaosClones.length; i += 1) {
      var clone = this.chaosClones[i];
      clone.life -= dt;
      clone.shotClock -= dt;
      if (!clone.dead && clone.life > 0 && clone.shotClock <= 0 && player && !player.dead) {
        clone.facing = Math.atan2(player.y - clone.y, player.x - clone.x);
        this._spawnProjectile("darkOrb", clone.facing, 148, this.damage * 0.28, { x: clone.x, y: clone.y - 8, color: "#8d47bd", radius: 4, trail: false, life: 2.8 });
        clone.shotClock = 1.45 + random(0, 0.35);
      }
      if (!clone.dead && clone.life > 0) { this.chaosClones[write] = clone; write += 1; }
    }
    this.chaosClones.length = write;

    if (this.finalPhase && !this.dying) {
      this._finalFlashClock -= dt;
      if (this._finalFlashClock <= 0 && !this.bossAttack) {
        this._finalFlashClock = random(1.05, 1.65);
        if (this.game && typeof this.game.flash === "function") this.game.flash("#d04dff", 0.07);
      }
    }
  };

  Boss.prototype.damageChaosClone = function (index) {
    var clone = this.chaosClones[index];
    if (!clone || clone.dead || clone.life <= 0) return 0;
    clone.dead = true;
    clone.life = 0;
    var burst = fx(this.game);
    if (burst && typeof burst.smoke === "function") burst.smoke(clone.x, clone.y, "#a54bd4", 14);
    if (burst && typeof burst.text === "function") burst.text(clone.x, clone.y - 24, "ILLUSION", "#d99aff", 11, 0.55);
    audio(this.game, "teleport");
    return 1;
  };

  Boss.prototype.update = function (dt) {
    dt = Math.min(0.05, Math.max(0, Number(dt) || 0));
    this.age += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.phasePulse = Math.max(0, this.phasePulse - dt);
    this.phaseTransitionTimer = Math.max(0, this.phaseTransitionTimer - dt);
    this.attackLabelTimer = Math.max(0, this.attackLabelTimer - dt);
    this.invisibleTimer = Math.max(0, this.invisibleTimer - dt);
    this.vulnerableTimer = Math.max(0, this.vulnerableTimer - dt);
    this._surviveTextCooldown = Math.max(0, this._surviveTextCooldown - dt);
    for (var c = 0; c < this.crystals.length; c += 1) this.crystals[c].flash = Math.max(0, this.crystals[c].flash - dt);
    this._updateHazards(dt);
    this._updateClones(dt);
    this._updateVelymoorEffects(dt);

    if (this.dying) {
      if (this.bossType === "velymoor" && !this._defeatDialogueComplete) return;
      this.deathTimer += dt;
      if (Math.random() < dt * 28) {
        var deathFx = fx(this.game);
        if (deathFx && typeof deathFx.burst === "function") deathFx.burst(this.x + random(-this.radius, this.radius), this.y + random(-this.radius, this.radius), this.config.accent, 3, 110, 4, 0.6, { kind: "spark", glow: 8 });
      }
      if (this.bossType === "velymoor") {
        if (!this._deathExplosionDone && this.deathTimer >= 2.65) {
          this._deathExplosionDone = true;
          this._shake(13, 0.75);
          if (this.game && typeof this.game.flash === "function") this.game.flash("#f5c8ff", 0.42);
          var orbFx = fx(this.game);
          if (orbFx && typeof orbFx.burst === "function") orbFx.burst(this.x, this.y - 32, "#e35be7", 65, 245, 6, 1.15, { kind: "spark", glow: 13, color2: "#fff0b0" });
          audio(this.game, "orbBreak");
        }
        if (!this._deathWhiteoutDone && this.deathTimer >= 3.65) {
          this._deathWhiteoutDone = true;
          if (this.game && typeof this.game.flash === "function") this.game.flash("#ffffff", 0.92);
          if (typeof document !== "undefined") {
            var whiteout = document.getElementById("ending-whiteout");
            if (whiteout) { whiteout.classList.remove("active"); void whiteout.offsetWidth; whiteout.classList.add("active"); }
          }
        }
      }
      if (this.deathTimer >= this.deathDuration) this._finishDeath();
      return;
    }

    if (this.introHold) {
      this.intro = true;
      this.invulnerable = true;
      return;
    }

    if (this.introTimer > 0) {
      this.introTimer -= dt;
      this.intro = true;
      this.invulnerable = true;
      if (Math.random() < dt * 12) {
        var introFx = fx(this.game);
        if (introFx && typeof introFx.burst === "function") introFx.burst(this.x + random(-this.radius, this.radius), this.y + random(-this.radius, this.radius), this.config.accent, 2, 45, 3, 0.7, { kind: "spark", glow: 6 });
      }
      if (this.introTimer <= 0) {
        this.introTimer = 0;
        this.intro = false;
        this.invulnerable = false;
        this._shake(8, 0.35);
        audio(this.game, "bossRoar");
        if (this.introLocksPlayer && this.game.player) {
          this.game.player.cinematicLocked = false;
          this.introLocksPlayer = false;
        }
      }
      return;
    }

    var calculatedPhase = this._phaseFromHealth();
    if (calculatedPhase > this.phase) this._setPhase(calculatedPhase);
    if (this.bossType === "velymoor" && !this._chaosPulseTriggered && this.health / Math.max(1, this.maxHealth) <= 0.5) {
      this._chaosPulseTriggered = true;
      this.phasePulse = 1.8;
      if (!this.pendingForcedAttack) this.pendingForcedAttack = "orbBarrage";
      this._toast("CHAOS PULSE — THE ORB AWAKENS!");
      this._shake(10, 0.5);
      if (this.game && typeof this.game.flash === "function") this.game.flash("#e252dd", 0.24);
      audio(this.game, "bossPhase");
    }
    if (this.finalPhase) {
      if (!this.finalStrikeReady) {
        this.finalSurvival = Math.max(0, this.finalSurvival - dt);
        if (this.finalSurvival <= 0) {
          this.finalStrikeReady = true;
          this._toast("THE ORB IS EXPOSED — LAND THE FINAL STRIKE!");
          this.phasePulse = 2;
          audio(this.game, "finalStrikeReady");
        }
      }
    }

    if (this.lungeTimer > 0) {
      this.lungeTimer -= dt;
      this._moveBoss(Math.atan2(this.lungeVy, this.lungeVx), Math.sqrt(this.lungeVx * this.lungeVx + this.lungeVy * this.lungeVy), dt);
      var player = this.game.player;
      if (!this.hasHitDuringLunge && player && distanceSq(this, player) <= Math.pow(this.radius + (player.radius || 12) + 7, 2)) {
        this.hasHitDuringLunge = true;
        if (typeof player.takeDamage === "function") player.takeDamage(this._scaledBossDamage(this.damage * this.lungeDamageMultiplier), this);
        this._shake(6, 0.18);
      }
      return;
    }

    if (this.bossAttack) {
      this.bossAttack.time -= dt;
      if (this.bossAttack.time <= 0) {
        var attack = this.bossAttack;
        this.bossAttack = null;
        this._resolveAttack(attack);
      }
      return;
    }

    this.attackCooldown -= dt;
    var target = this.game.player;
    if (target && !target.dead) {
      var angle = Math.atan2(target.y - this.y, target.x - this.x);
      var distance = Math.sqrt(distanceSq(this, target));
      if (this.bossType === "creakingOne") {
        if (distance > 145) this._moveBoss(angle, this.speed * (this.phase > 1 ? 1.2 : 0.85), dt);
      } else if (this.bossType === "nyxfang") {
        this._moveBoss(angle + Math.sin(this.age * 1.8) * 0.85, this.speed * (this.phase > 1 ? 1.18 : 0.8), dt);
      } else if (this.bossType === "gorath") {
        if (distance > 120) this._moveBoss(angle, this.speed * (this.phase > 1 ? 1.12 : 0.75), dt);
      } else {
        var desired = this.phase >= 3 ? 105 : 155;
        this._moveBoss(angle + (distance < desired ? Math.PI : (distance < desired + 70 ? Math.PI * 0.5 : 0)), this.speed * (this.phase >= 3 ? 0.92 : 0.65), dt);
      }
    }
    if (this.attackCooldown <= 0) this._prepareAttack(this._chooseAttack());
  };

  Boss.prototype.damageCrystal = function (index, amount, source, options) {
    var crystal = this.crystals[index];
    if (!crystal || crystal.dead || this.dying || this.intro) return 0;
    amount = Math.max(1, Math.round(Number(amount) || 0));
    crystal.health = Math.max(0, crystal.health - amount);
    crystal.flash = 0.16;
    var burst = fx(this.game);
    if (burst) {
      if (typeof burst.hit === "function") burst.hit(crystal.x, crystal.y, "#70edf3", !!(options && options.charged));
      if (typeof burst.text === "function") burst.text(crystal.x, crystal.y - 28, amount, "#b8fbff", 13, 0.65, { critical: !!(options && options.critical) });
    }
    audio(this.game, "crystalHit");
    if (crystal.health <= 0) {
      crystal.dead = true;
      if (burst && typeof burst.burst === "function") burst.burst(crystal.x, crystal.y, "#72f0f4", 30, 190, 5, 0.9, { kind: "crystal", gravity: 90, glow: 10 });
      this._shake(9, 0.42);
      audio(this.game, "crystalBreak");
      var alive = 0;
      for (var i = 0; i < this.crystals.length; i += 1) if (!this.crystals[i].dead) alive += 1;
      if (alive > 0) this._toast(alive + " arena crystal" + (alive === 1 ? " remains." : "s remain."));
      else {
        this.armorBroken = true;
        this.vulnerableTimer = 5.5;
        this._toast("GORATH'S CRYSTAL ARMOR SHATTERS!");
        this.phasePulse = 1.3;
        this.bossAttack = null;
        this.attackCooldown = 1.4;
      }
    }
    return amount;
  };

  Boss.prototype.takeDamage = function (amount, source, options) {
    if (this.dying || this.dead) return 0;
    if (this.intro || this.invulnerable) {
      if (this._surviveTextCooldown <= 0) {
        var introFx = fx(this.game);
        if (introFx && typeof introFx.text === "function") introFx.text(this.x, this.y - this.radius - 18, "IMMUNE", "#d7ccec", 12, 0.55);
        this._surviveTextCooldown = 0.5;
      }
      return 0;
    }
    if (this.finalPhase) {
      if (!this.finalStrikeReady) {
        if (this._surviveTextCooldown <= 0) {
          var surviveFx = fx(this.game);
          if (surviveFx && typeof surviveFx.text === "function") surviveFx.text(this.x, this.y - this.radius - 20, "SURVIVE " + this.finalSurvival.toFixed(1) + "s", "#ff82d6", 13, 0.7);
          this._surviveTextCooldown = 0.65;
        }
        return 0;
      }
      this.health = this.hp = 0;
      this.die(source);
      return Math.max(1, Number(amount) || 1);
    }
    amount = Math.max(0, Number(amount) || 0);
    if (this.bossType === "gorath" && !this.armorBroken) {
      amount *= 0.07;
      if (this._surviveTextCooldown <= 0) {
        var armorFx = fx(this.game);
        if (armorFx && typeof armorFx.text === "function") armorFx.text(this.x, this.y - this.radius - 20, "CRYSTAL ARMOR", "#86eef4", 12, 0.65);
        this._surviveTextCooldown = 0.55;
      }
    } else if (this.bossType === "gorath" && this.vulnerableTimer > 0) amount *= 1.3;

    if (this.bossType === "velymoor" && this.phase < 4) {
      var threshold = this.maxHealth * 0.18;
      if (this.health - amount <= threshold) {
        amount = Math.max(1, this.health - threshold);
        options = Object.assign({}, options || {}, { knockback: 0 });
        var transitionDamage = BaseEnemy.prototype.takeDamage.call(this, amount, source, options);
        this.health = this.hp = Math.max(1, threshold);
        this._setPhase(4);
        return transitionDamage;
      }
    }
    options = Object.assign({}, options || {});
    options.knockback = (Number(options.knockback) || 90) * (this.bossType === "nyxfang" ? 0.12 : 0.04);
    return BaseEnemy.prototype.takeDamage.call(this, amount, source, options);
  };

  Boss.prototype.die = function (source) {
    if (this.dying || this._finishedDeath) return;
    this.dying = true;
    this.dead = false;
    this.health = this.hp = 0;
    this.bossAttack = null;
    this.hazards.length = 0;
    this.lungeTimer = 0;
    this.deathTimer = 0;
    this.deathSource = source || null;
    if (this.bossType === "velymoor") {
      this.game.endingPending = true;
      this.game.cinematicCamera = { active: true, targetX: this.x, targetY: this.y - 18, zoom: 1.05, release: 0 };
      this.orbBarrage = null;
      this.chaosSlashes.length = 0;
      this.corruptionZones.length = 0;
      this.chaosClones.length = 0;
      this.afterimages.length = 0;
      if (this.game.player) {
        this.game.player.dead = false;
        this.game.player.health = this.game.player.hp = Math.max(1, this.game.player.health || this.game.player.hp || 1);
        this.game.player.invulnerableTimer = Math.max(this.game.player.invulnerableTimer || 0, this.deathDuration + 4);
        this.game.player.cinematicLocked = true;
      }
      if (this.game.projectiles) this.game.projectiles.length = 0;
      for (var i = 0; i < (this.game.enemies || []).length; i += 1) {
        var enemy = this.game.enemies[i];
        if (enemy && enemy !== this && enemy.summoned) { enemy.dead = true; enemy.remove = true; }
      }
      if (this.game.dialogue && typeof this.game.startDialogue === "function") {
        var defeatedBoss = this;
        this._defeatDialogueComplete = false;
        this.game.startDialogue({
          name: "Velymoor",
          portrait: "velymoor",
          lines: ["No...", "This power...", "It cannot..."],
          onComplete: function () { defeatedBoss._defeatDialogueComplete = true; }
        });
      }
    }
    this._shake(this.bossType === "velymoor" ? 16 : 11, 0.8);
    audio(this.game, this.bossType === "velymoor" ? "velymoorDefeat" : "bossDefeat");
  };

  Boss.prototype._finishDeath = function () {
    if (this._finishedDeath) return;
    this._finishedDeath = true;
    this.dead = true;
    this.dying = false;
    var burst = fx(this.game);
    if (burst && typeof burst.burst === "function") burst.burst(this.x, this.y, this.config.accent, this.bossType === "velymoor" ? 70 : 45, 240, 6, 1.2, { kind: "spark", gravity: 55, glow: 12 });
    var totalGold = Math.round(this.config.gold * (typeof this.game.spawnDrop === "function" ? 1 : difficultyValue(this.game, "gold", 1)));
    var coins = this.bossType === "velymoor" ? 18 : 12;
    var remaining = totalGold;
    for (var i = 0; i < coins; i += 1) {
      var value = i === coins - 1 ? remaining : Math.max(1, Math.floor(remaining / (coins - i)));
      remaining -= value;
      var angle = random(0, TAU);
      this._drop("gold", this.x + Math.cos(angle) * random(5, 26), this.y + Math.sin(angle) * random(5, 26), { value: value, vx: Math.cos(angle) * random(65, 150), vy: -random(95, 175) });
    }
    this._drop("item", this.x, this.y - 8, { item: this.config.reward, vx: 0, vy: -145 });
    if (burst && typeof burst.coinBurst === "function") burst.coinBurst(this.x, this.y, 28);
    if (typeof this.game.onBossDefeated !== "function" && this.game.quests && typeof this.game.quests.event === "function") this.game.quests.event("bossDefeated", { type: this.bossType, boss: this.bossType, bossId: this.bossType, source: this.deathSource });
    if (this.game.boss === this) this.game.boss = null;
    if (typeof this.game.onBossDefeated === "function") this.game.onBossDefeated(this);
    this.remove = true;
  };

  Boss.prototype._drawHazards = function (ctx) {
    for (var i = 0; i < this.hazards.length; i += 1) {
      var h = this.hazards[i];
      var progress = clamp(1 - h.time / Math.max(0.01, h.total), 0, 1);
      ctx.save();
      ctx.globalAlpha = h.resolved ? clamp((h.time + 0.28) / 0.28, 0, 1) * 0.45 : 0.25 + progress * 0.55;
      ctx.strokeStyle = progress > 0.75 ? "#fff3b0" : h.color;
      ctx.fillStyle = h.resolved ? h.color : "rgba(214,57,153,0.14)";
      ctx.lineWidth = h.resolved ? 4 : 2;
      if (h.kind === "beam") {
        ctx.translate(h.x, h.y); ctx.rotate(h.angle);
        ctx.fillRect(0, -h.width * 0.5, h.length, h.width);
        ctx.strokeRect(0, -h.width * 0.5, h.length, h.width);
        if (!h.resolved) { ctx.strokeStyle = "#ffffff"; ctx.globalAlpha *= progress; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(h.length, 0); ctx.stroke(); }
      } else if (h.kind === "prison") {
        ctx.setLineDash([8, 6]);
        ctx.lineWidth = 3 + progress * 4;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        for (var prisonRune = 0; prisonRune < 8; prisonRune += 1) {
          var prisonAngle = prisonRune * TAU / 8 + progress * 0.45;
          var prisonX = h.x + Math.cos(prisonAngle) * h.radius;
          var prisonY = h.y + Math.sin(prisonAngle) * h.radius;
          ctx.fillStyle = prisonRune === 0 ? "#fff0a8" : h.color;
          ctx.fillRect(prisonX - 3, prisonY - 3, 6, 6);
        }
        ctx.globalAlpha *= 0.8;
        ctx.fillStyle = "rgba(110,36,143,0.1)";
        ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * progress, 0, TAU); ctx.fill();
      } else if (h.kind === "meteor") {
        ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.globalAlpha *= 0.9;
        ctx.strokeStyle = "#f1b4ff";
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(h.x + 34 - progress * 28, h.y - 78 + progress * 68); ctx.lineTo(h.x, h.y); ctx.stroke();
        ctx.fillStyle = "#f4d8ff";
        ctx.beginPath(); ctx.arc(h.x + 34 - progress * 28, h.y - 78 + progress * 68, 5 + progress * 5, 0, TAU); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, TAU); ctx.fill(); ctx.stroke();
        if (!h.resolved) { ctx.beginPath(); ctx.arc(h.x, h.y, Math.max(2, h.radius * progress), 0, TAU); ctx.stroke(); }
        if (h.kind === "crystal" || h.kind === "branch") {
          ctx.beginPath(); ctx.moveTo(h.x, h.y - h.radius); ctx.lineTo(h.x - h.radius * 0.35, h.y + h.radius * 0.4); ctx.lineTo(h.x + h.radius * 0.35, h.y + h.radius * 0.4); ctx.closePath(); ctx.stroke();
        }
      }
      ctx.restore();
    }
  };

  Boss.prototype._drawAttackTelegraph = function (ctx) {
    var attack = this.bossAttack;
    if (!attack) return;
    var progress = clamp(1 - attack.time / attack.total, 0, 1);
    var name = attack.name;
    ctx.save();
    ctx.strokeStyle = progress > 0.72 ? "#fff1a0" : this.config.accent;
    ctx.fillStyle = "rgba(216,67,179,0.13)";
    ctx.globalAlpha = 0.45 + progress * 0.45;
    ctx.lineWidth = 2 + progress * 2;
    if (name === "orbOverload") {
      var overloadWidth = 14 + progress * 42;
      ctx.globalAlpha = 0.28 + progress * 0.58;
      ctx.translate(this.x, this.y - 15); ctx.rotate(attack.angle);
      ctx.fillStyle = "rgba(211,66,220,0.2)";
      ctx.fillRect(0, -overloadWidth * 0.5, Math.max(620, this.arenaRadius * 2.2), overloadWidth);
      ctx.strokeRect(0, -overloadWidth * 0.5, Math.max(620, this.arenaRadius * 2.2), overloadWidth);
      ctx.strokeStyle = "#fff2b0"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.max(620, this.arenaRadius * 2.2), 0); ctx.stroke();
    } else if (name === "voidPrison") {
      ctx.setLineDash([9, 6]); ctx.lineWidth = 3 + progress * 3;
      ctx.beginPath(); ctx.arc(attack.targetX, attack.targetY, 92, 0, TAU); ctx.stroke();
      ctx.setLineDash([]); ctx.beginPath(); ctx.arc(attack.targetX, attack.targetY, 92 * progress, 0, TAU); ctx.stroke();
    } else if (name === "chaosSlash") {
      ctx.translate(this.x, this.y); ctx.rotate(attack.angle);
      ctx.fillRect(0, -22, 510, 44); ctx.strokeRect(0, -22, 510, 44);
      ctx.beginPath(); ctx.arc(0, 0, 58 + progress * 26, -0.75, 0.75); ctx.stroke();
    } else if (name === "chaosDash") {
      ctx.beginPath(); ctx.arc(attack.targetX, attack.targetY, 66, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(attack.targetX, attack.targetY); ctx.stroke(); ctx.setLineDash([]);
    } else if (name === "chaosMeteor") {
      ctx.beginPath(); ctx.arc(attack.targetX, attack.targetY, 115, 0, TAU); ctx.fill(); ctx.stroke();
      for (var meteorMark = 0; meteorMark < 5; meteorMark += 1) {
        var meteorAngle = meteorMark * TAU / 5 + progress;
        ctx.beginPath(); ctx.arc(attack.targetX + Math.cos(meteorAngle) * 76, attack.targetY + Math.sin(meteorAngle) * 58, 15 + progress * 7, 0, TAU); ctx.stroke();
      }
    } else if (/Lunge|dashAttack|powerCharge|finalOnslaught/.test(name)) {
      ctx.translate(this.x, this.y); ctx.rotate(attack.angle); ctx.fillRect(0, -20, 420, 40); ctx.strokeRect(0, -20, 420, 40);
    } else if (/Barrage|Projectiles|Shockwave|shockwave|Howl|Fracture/.test(name)) {
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 28 + progress * 18, 0, TAU); ctx.stroke();
      for (var i = 0; i < 10; i += 1) { ctx.beginPath(); ctx.moveTo(this.x + Math.cos(i * TAU / 10) * (this.radius + 8), this.y + Math.sin(i * TAU / 10) * (this.radius + 8)); ctx.lineTo(this.x + Math.cos(i * TAU / 10) * (this.radius + 28), this.y + Math.sin(i * TAU / 10) * (this.radius + 28)); ctx.stroke(); }
    } else if (/Beam/.test(name) || name === "laserBeams") {
      ctx.translate(this.x, this.y); ctx.rotate(attack.angle); ctx.fillRect(0, -16, 460, 32); ctx.strokeRect(0, -16, 460, 32);
    } else if (/summon|Summon|Spirits|Clones|invisibility|Distortion/.test(name)) {
      ctx.beginPath(); ctx.arc(this.x, this.y, 55 + progress * 22, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(this.x, this.y, 35 - progress * 18, 0, TAU); ctx.stroke();
    } else {
      var radius = /falling|Falling|Explosions|Destruction|collapse|Storm|Circles|Energy/.test(name) ? 75 : 58;
      ctx.beginPath(); ctx.arc(attack.targetX, attack.targetY, radius, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(attack.targetX, attack.targetY, radius * progress, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  };

  Boss.prototype._drawCrystals = function (ctx) {
    for (var i = 0; i < this.crystals.length; i += 1) {
      var crystal = this.crystals[i];
      if (crystal.dead) continue;
      var pulse = 1 + Math.sin(this.age * 4 + crystal.pulse) * 0.08;
      ctx.save(); ctx.translate(Math.round(crystal.x), Math.round(crystal.y)); ctx.scale(pulse, pulse);
      ctx.shadowBlur = 14; ctx.shadowColor = "#67edf2";
      ctx.fillStyle = crystal.flash > 0 ? "#ffffff" : "#4bc2d3";
      ctx.beginPath(); ctx.moveTo(0, -23); ctx.lineTo(14, 5); ctx.lineTo(7, 20); ctx.lineTo(-11, 15); ctx.lineTo(-15, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#b8fbff"; ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(4, 3); ctx.lineTo(0, 12); ctx.lineTo(-4, 1); ctx.closePath(); ctx.fill();
      ctx.restore();
      var width = 35;
      ctx.fillStyle = "rgba(10,18,24,0.85)"; ctx.fillRect(crystal.x - width * 0.5, crystal.y - 33, width, 4);
      ctx.fillStyle = "#63e8ef"; ctx.fillRect(crystal.x - width * 0.5, crystal.y - 33, width * crystal.health / crystal.maxHealth, 4);
      ctx.save(); ctx.globalAlpha = 0.22; ctx.strokeStyle = "#68e8ef"; ctx.beginPath(); ctx.moveTo(crystal.x, crystal.y); ctx.lineTo(this.x, this.y); ctx.stroke(); ctx.restore();
    }
  };

  Boss.prototype._drawClones = function (ctx) {
    for (var i = 0; i < this.visualClones.length; i += 1) {
      var clone = this.visualClones[i];
      ctx.save(); ctx.globalAlpha = clamp(clone.life / clone.maxLife, 0, 1) * 0.42; ctx.translate(clone.x, clone.y); ctx.rotate(clone.angle || 0);
      ctx.fillStyle = this.config.accent; ctx.beginPath(); ctx.ellipse(0, 0, this.radius * 0.75, this.radius * 0.48, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(this.radius * 0.3, -this.radius * 0.25); ctx.lineTo(this.radius, 0); ctx.lineTo(this.radius * 0.3, this.radius * 0.25); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (this.bossType === "velymoor") {
      for (var cloneIndex = 0; cloneIndex < this.chaosClones.length; cloneIndex += 1) {
        var chaosClone = this.chaosClones[cloneIndex];
        if (!chaosClone || chaosClone.dead) continue;
        ctx.save();
        ctx.globalAlpha = clamp(chaosClone.life / Math.min(0.6, chaosClone.maxLife), 0, 1) * 0.72;
        ctx.translate(Math.round(chaosClone.x), Math.round(chaosClone.y + Math.sin((this.game.elapsed || this.age) * 3 + cloneIndex) * 2));
        this._drawVelymoorBody(ctx, true, Math.min(this.phase, 2));
        ctx.restore();
      }
    }
  };

  Boss.prototype._drawVelymoorAura = function (ctx) {
    var time = this.game && isFinite(this.game.elapsed) ? this.game.elapsed : this.age;
    var pulse = 0.88 + Math.sin(time * 2.05) * 0.12;
    var deathFade = this.dying ? clamp(1 - this.deathTimer / 2.75, 0, 1) : 1;
    ctx.save();
    ctx.globalAlpha *= deathFade;
    var glow = ctx.createRadialGradient(0, -5, 8, 0, -5, 82 * pulse);
    glow.addColorStop(0, "rgba(224,82,226,0.27)");
    glow.addColorStop(0.45, "rgba(143,53,190,0.12)");
    glow.addColorStop(1, "rgba(76,24,100,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -5, 82 * pulse, 0, TAU); ctx.fill();
    ctx.rotate(this.chaosAuraAngle);
    ctx.strokeStyle = "#d85ce4"; ctx.lineWidth = 3; ctx.shadowBlur = 10; ctx.shadowColor = "#b538d1";
    ctx.setLineDash([17, 11]); ctx.beginPath(); ctx.ellipse(0, -4, 58 * pulse, 29 * pulse, 0.22, 0, TAU); ctx.stroke();
    ctx.rotate(-this.chaosAuraAngle * 2.25);
    ctx.strokeStyle = "rgba(178,91,231,0.75)"; ctx.lineWidth = 2; ctx.setLineDash([7, 13]);
    ctx.beginPath(); ctx.ellipse(0, -5, 69, 38, -0.35, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha *= 0.25 + pulse * 0.15;
    ctx.strokeStyle = "#f3c4ff"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(4 + Math.sin(time) * 3, -5, 76, 43, 0.1, 0, TAU); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha *= deathFade;
    for (var mote = 0; mote < 13; mote += 1) {
      var moteAngle = time * (mote % 2 ? -0.55 : 0.72) + mote * TAU / 13;
      var moteRadius = 45 + (mote % 4) * 9;
      var moteX = Math.cos(moteAngle) * moteRadius;
      var moteY = -10 + Math.sin(moteAngle) * (25 + (mote % 3) * 5);
      ctx.globalAlpha = deathFade * (0.28 + (mote % 3) * 0.16);
      ctx.fillStyle = mote % 4 === 0 ? "#fff1b0" : (mote % 2 ? "#e85dde" : "#9a54e5");
      var moteSize = mote % 4 === 0 ? 3 : 2;
      ctx.fillRect(Math.round(moteX), Math.round(moteY), moteSize, moteSize);
    }
    ctx.restore();
  };

  Boss.prototype._drawVelymoorBody = function (ctx, ghost, forcedPhase) {
    var phase = forcedPhase || this.phase;
    var time = this.game && isFinite(this.game.elapsed) ? this.game.elapsed : this.age;
    var unstable = phase >= 4 && !ghost ? Math.sin(time * 19) * 1.2 : 0;
    var kneel = this.dying && !ghost;
    ctx.save();
    var figureAlpha = ctx.globalAlpha;
    ctx.translate(unstable, kneel ? 9 : 0);
    ctx.scale(this.visualScale * (phase >= 3 ? 1.04 : 1), this.visualScale * (kneel ? 0.86 : 1));
    if (ghost) ctx.globalAlpha = figureAlpha * 0.92;

    var cloakWave = Math.sin(time * 3.1) * 2.2;
    var robe = this.flashTimer > 0 ? "#f7e8ff" : (phase >= 3 ? "#24102f" : "#1b1427");
    var robeLight = this.flashTimer > 0 ? "#ffffff" : (phase >= 3 ? "#51215f" : "#392342");
    var purple = this.finalStrikeReady ? "#fff1a6" : (phase >= 3 ? "#ed55d8" : "#c34fd2");
    var gold = "#caa557";

    ctx.shadowBlur = ghost ? 7 : 16; ctx.shadowColor = purple;
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(-11, -31); ctx.lineTo(-25, -12); ctx.lineTo(-31, 31);
    ctx.lineTo(-21, 36 + cloakWave); ctx.lineTo(-12, 31 - cloakWave * 0.3);
    ctx.lineTo(-3, 39 + cloakWave * 0.45); ctx.lineTo(7, 31); ctx.lineTo(17, 37 - cloakWave * 0.6);
    ctx.lineTo(30, 29 + cloakWave * 0.25); ctx.lineTo(24, -12); ctx.lineTo(11, -31); ctx.closePath(); ctx.fill();
    ctx.fillStyle = robeLight; ctx.globalAlpha = figureAlpha * (ghost ? 0.42 : 0.7);
    ctx.beginPath(); ctx.moveTo(-17, -8); ctx.lineTo(-23, 27); ctx.lineTo(-12, 31); ctx.lineTo(-5, -5); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = figureAlpha * (ghost ? 0.92 : 1);

    ctx.strokeStyle = gold; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-18, 18); ctx.quadraticCurveTo(0, 25, 20, 18); ctx.stroke();
    ctx.fillStyle = gold; ctx.fillRect(-15, -9, 30, 3); ctx.fillRect(-4, -7, 8, 8);

    for (var shoulder = -1; shoulder <= 1; shoulder += 2) {
      ctx.save(); ctx.translate(shoulder * (26 + (phase >= 3 ? 4 : 0)), -12 + Math.sin(time * 2.7 + shoulder) * 2); ctx.rotate(shoulder * (0.12 + Math.sin(time * 1.8) * 0.04));
      ctx.fillStyle = phase >= 3 ? "#4d255f" : "#31283d"; ctx.strokeStyle = gold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-9, -7); ctx.lineTo(10, -4); ctx.lineTo(13, 4); ctx.lineTo(0, 9); ctx.lineTo(-11, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = purple; ctx.fillRect(shoulder > 0 ? 5 : -7, -2, 4, 4); ctx.restore();
    }

    ctx.fillStyle = "#120d1a"; ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(-15, -31); ctx.lineTo(-12, -15); ctx.lineTo(0, -9); ctx.lineTo(13, -16); ctx.lineTo(16, -31); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#25142e"; ctx.beginPath(); ctx.ellipse(0, -27, 11, 13, 0, 0, TAU); ctx.fill();
    ctx.shadowBlur = 13; ctx.shadowColor = purple; ctx.fillStyle = purple;
    ctx.fillRect(-7, -30, 5, 3); ctx.fillRect(3, -30, 5, 3);
    ctx.fillStyle = "#fff4c5"; ctx.fillRect(-5, -30, 2, 2); ctx.fillRect(4, -30, 2, 2);
    ctx.fillStyle = gold; ctx.fillRect(-10, -14, 20, 3); ctx.fillRect(-2, -16, 4, 8);

    if (!kneel) {
      if (!ghost && this.bossAttack && /swordCombo|chaosSlash|chaosDash|teleportStrike/.test(this.bossAttack.name)) {
        var trailProgress = clamp(1 - this.bossAttack.time / Math.max(0.01, this.bossAttack.total), 0, 1);
        ctx.save(); ctx.globalAlpha = figureAlpha * (0.18 + trailProgress * 0.42); ctx.strokeStyle = "#e570e5"; ctx.shadowBlur = 12; ctx.shadowColor = "#ca49d5"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(13, -7, 43, -1.48, -0.25 + trailProgress * 0.6); ctx.stroke(); ctx.restore();
      }
      ctx.save(); ctx.translate(18, -4); ctx.rotate(-0.76 + Math.sin(time * 1.6) * 0.025);
      ctx.strokeStyle = "#27162d"; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -42); ctx.stroke();
      ctx.strokeStyle = "#e7e6ef"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -42); ctx.stroke();
      ctx.strokeStyle = "#c05be0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -38); ctx.stroke();
      ctx.fillStyle = gold; ctx.fillRect(-8, 6, 16, 4); ctx.fillRect(-2, 8, 4, 11); ctx.restore();
    }

    if (!this._deathExplosionDone || ghost) {
      var orbX = -31 + (phase >= 4 && !ghost ? Math.sin(time * 23) * 2.5 : 0), orbY = -34 + (phase >= 4 && !ghost ? Math.cos(time * 19) * 1.8 : 0);
      ctx.shadowBlur = 20; ctx.shadowColor = purple; ctx.fillStyle = purple;
      ctx.beginPath(); ctx.arc(orbX, orbY, phase >= 3 ? 10 : 8, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,232,255,0.75)"; ctx.beginPath(); ctx.arc(orbX - 2, orbY - 2, 3, 0, TAU); ctx.fill();
      ctx.strokeStyle = purple; ctx.lineWidth = 1.5;
      for (var orbit = 0; orbit < 2; orbit += 1) { ctx.beginPath(); ctx.ellipse(orbX, orbY, 15 + orbit * 5, 6 + orbit * 3, time * (orbit ? -1.2 : 0.9), 0, TAU); ctx.stroke(); }
      if (phase >= 4 && !ghost) {
        ctx.strokeStyle = "#fff0bc"; ctx.globalAlpha = figureAlpha * (0.38 + Math.sin(time * 15) * 0.18); ctx.lineWidth = 1.5;
        for (var spark = 0; spark < 3; spark += 1) { var sparkAngle = time * 2.4 + spark * TAU / 3; ctx.beginPath(); ctx.moveTo(orbX + Math.cos(sparkAngle) * 10, orbY + Math.sin(sparkAngle) * 10); ctx.lineTo(orbX + Math.cos(sparkAngle + 0.18) * 18, orbY + Math.sin(sparkAngle + 0.18) * 16); ctx.lineTo(orbX + Math.cos(sparkAngle) * 24, orbY + Math.sin(sparkAngle) * 21); ctx.stroke(); }
        ctx.globalAlpha = figureAlpha;
      }
      if (kneel && this.deathTimer > 0.45) {
        var crackProgress = clamp((this.deathTimer - 0.45) / 2, 0, 1);
        ctx.strokeStyle = "#fff6cf"; ctx.lineWidth = 1 + crackProgress * 2;
        ctx.beginPath(); ctx.moveTo(orbX, orbY - 8); ctx.lineTo(orbX - 3, orbY - 2); ctx.lineTo(orbX + 2, orbY + 2); ctx.lineTo(orbX - 4, orbY + 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(orbX - 1, orbY); ctx.lineTo(orbX + 7, orbY - 3); ctx.stroke();
      }
    }

    ctx.globalAlpha = figureAlpha * (ghost ? 0.31 : 0.58);
    ctx.strokeStyle = purple; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-28, 8); ctx.bezierCurveTo(-46, -7 + cloakWave, -37, -36, -17, -47); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(27, 12); ctx.bezierCurveTo(46, 0 - cloakWave, 39, -25, 20, -44); ctx.stroke();
    ctx.restore();
  };

  Boss.prototype._drawVelymoorAfterimages = function (ctx) {
    for (var i = 0; i < this.afterimages.length; i += 1) {
      var image = this.afterimages[i];
      ctx.save();
      ctx.globalAlpha = clamp(image.life / image.maxLife, 0, 1) * 0.18;
      ctx.translate(Math.round(image.x), Math.round(image.y));
      ctx.fillStyle = "#b54bd3";
      this._drawVelymoorBody(ctx, true, image.phase);
      ctx.restore();
    }
  };

  Boss.prototype._drawChaosSlashes = function (ctx) {
    for (var i = 0; i < this.chaosSlashes.length; i += 1) {
      var slash = this.chaosSlashes[i];
      var ratio = clamp(slash.life / slash.maxLife, 0, 1);
      ctx.save(); ctx.translate(Math.round(slash.x), Math.round(slash.y)); ctx.rotate(slash.angle);
      ctx.globalAlpha = 0.35 + ratio * 0.55; ctx.strokeStyle = "#e66ee7"; ctx.shadowBlur = 15; ctx.shadowColor = "#bd43d1";
      ctx.lineWidth = 7 + ratio * 5; ctx.beginPath(); ctx.arc(0, 0, 32, -1.15, 1.15); ctx.stroke();
      ctx.strokeStyle = "#fff0c4"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 32, -1.05, 1.05); ctx.stroke(); ctx.restore();
    }
  };

  Boss.prototype.drawArenaEffects = function (ctx) {
    if (!ctx || this.bossType !== "velymoor") return;
    var time = this.game && isFinite(this.game.elapsed) ? this.game.elapsed : this.age;
    for (var z = 0; z < this.corruptionZones.length; z += 1) {
      var zone = this.corruptionZones[z];
      var zoneAlpha = clamp(zone.life / 0.45, 0, 1) * (zone.age < zone.armDelay ? 0.16 : 0.34);
      ctx.save(); ctx.globalAlpha = zoneAlpha; ctx.fillStyle = "#681c79"; ctx.strokeStyle = "#cf54d7"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(zone.x, zone.y, zone.radius * (0.92 + Math.sin(time * 3 + zone.phase) * 0.08), 0, TAU); ctx.fill(); ctx.stroke();
      ctx.globalAlpha *= 0.75; for (var rune = 0; rune < 5; rune += 1) { var a = rune * TAU / 5 + time * 0.3; ctx.fillRect(zone.x + Math.cos(a) * zone.radius * 0.6 - 2, zone.y + Math.sin(a) * zone.radius * 0.6 - 2, 4, 4); } ctx.restore();
    }
    if (!this.finalPhase && !this.dying) return;
    var crackFade = this.dying ? clamp(1 - this.deathTimer / 3.6, 0, 1) : 1;
    ctx.save(); ctx.globalAlpha = 0.42 * crackFade; ctx.strokeStyle = "#c844cf"; ctx.shadowBlur = 7; ctx.shadowColor = "#8e2ca9"; ctx.lineWidth = 3;
    for (var c = 0; c < this.arenaCracks.length; c += 1) {
      var crack = this.arenaCracks[c];
      var startX = this.arenaX + Math.cos(crack.angle) * crack.inner;
      var startY = this.arenaY + Math.sin(crack.angle) * crack.inner;
      var endX = this.arenaX + Math.cos(crack.angle + crack.branch * 0.12) * (crack.inner + crack.length);
      var endY = this.arenaY + Math.sin(crack.angle + crack.branch * 0.12) * (crack.inner + crack.length);
      var midX = (startX + endX) * 0.5 + Math.cos(crack.angle + Math.PI * 0.5) * crack.branch * 22;
      var midY = (startY + endY) * 0.5 + Math.sin(crack.angle + Math.PI * 0.5) * crack.branch * 22;
      ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(midX, midY); ctx.lineTo(endX, endY); ctx.stroke();
    }
    ctx.restore();
  };

  Boss.prototype._drawFinalDebris = function (ctx) {
    if (!this.finalPhase || this.bossType !== "velymoor") return;
    var time = this.game && isFinite(this.game.elapsed) ? this.game.elapsed : this.age;
    var fade = this.dying ? clamp(1 - this.deathTimer / 3.1, 0, 1) : 1;
    ctx.save(); ctx.globalAlpha = 0.42 * fade; ctx.fillStyle = "#594062"; ctx.strokeStyle = "#a84eb5";
    for (var i = 0; i < 11; i += 1) {
      var a = i * TAU / 11 + 0.22;
      var r = 82 + (i % 4) * 38;
      var px = this.arenaX + Math.cos(a) * r;
      var py = this.arenaY + Math.sin(a) * r - 10 - Math.sin(time * 1.5 + i) * (8 + i % 3 * 3);
      ctx.save(); ctx.translate(px, py); ctx.rotate(time * (i % 2 ? -0.35 : 0.28) + i); ctx.fillRect(-4, -3, 9 + i % 3 * 3, 6 + i % 2 * 3); ctx.strokeRect(-4, -3, 9 + i % 3 * 3, 6 + i % 2 * 3); ctx.restore();
    }
    ctx.restore();
  };

  Boss.prototype.draw = function (ctx) {
    if (!ctx || this.dead) return;
    this._drawHazards(ctx);
    this._drawAttackTelegraph(ctx);
    if (this.bossType === "velymoor") {
      this._drawFinalDebris(ctx);
      this._drawVelymoorAfterimages(ctx);
      this._drawChaosSlashes(ctx);
    }
    this._drawClones(ctx);
    this._drawCrystals(ctx);
    var x = Math.round(this.x);
    var y = Math.round(this.y);
    var visualTime = this.game && isFinite(this.game.elapsed) ? this.game.elapsed : this.age;
    var bob = Math.sin(visualTime * (this.bossType === "velymoor" ? 2.15 : 2.5)) * (this.bossType === "velymoor" ? 4 : 2);
    var flash = this.flashTimer > 0;
    var color = flash ? "#ffffff" : this.config.color;
    var accent = flash ? "#ffffff" : this.config.accent;
    var deathAlpha = this.dying ? (this.bossType === "velymoor" ? (this.deathTimer < 2.65 ? 1 : clamp(1 - (this.deathTimer - 2.65) / 1.75, 0, 1)) : clamp(1 - this.deathTimer / this.deathDuration, 0, 1)) : 1;
    ctx.save();
    ctx.globalAlpha = deathAlpha * (this.invisibleTimer > 0 ? 0.2 : 1);
    var shadowScale = this.bossType === "velymoor" ? Math.max(2.6, this.visualScale * 0.78) : 1;
    ctx.fillStyle = this.bossType === "velymoor" ? "rgba(4,2,9,0.72)" : "rgba(6,4,11,0.52)"; ctx.beginPath(); ctx.ellipse(x, y + this.radius * (this.bossType === "velymoor" ? 1.18 : 0.66), this.radius * (this.bossType === "velymoor" ? 1.18 * shadowScale : 1.05), this.radius * (this.bossType === "velymoor" ? 0.30 * shadowScale : 0.35), 0, 0, TAU); ctx.fill();
    ctx.translate(x, Math.round(y + bob));
    if (this.phasePulse > 0) {
      ctx.strokeStyle = accent; ctx.globalAlpha *= clamp(this.phasePulse, 0, 1); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, Math.max(4, this.radius + (1 - clamp(this.phasePulse, 0, 1)) * 75), 0, TAU); ctx.stroke(); ctx.globalAlpha = deathAlpha * (this.invisibleTimer > 0 ? 0.2 : 1);
    }
    ctx.shadowBlur = this.phase > 1 ? 16 : 8; ctx.shadowColor = accent;
    if (this.bossType === "creakingOne") {
      ctx.fillStyle = color; ctx.fillRect(-18, -24, 36, 62); ctx.fillRect(-31, -8, 14, 45); ctx.fillRect(17, -8, 14, 45);
      ctx.fillStyle = this.phase > 1 ? "#5c2f47" : "#395d35";
      for (var b = 0; b < 7; b += 1) { ctx.beginPath(); ctx.arc(Math.cos(b * TAU / 7) * 25, -31 + Math.sin(b * TAU / 7) * 12, 18, 0, TAU); ctx.fill(); }
      ctx.fillStyle = accent; ctx.fillRect(-11, -13, 7, 7); ctx.fillRect(5, -13, 7, 7); ctx.fillRect(-4, 3, 8, 16);
      ctx.strokeStyle = this.phase > 1 ? "#b7567c" : "#6e9c49"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-23, 27); ctx.bezierCurveTo(-42, 39, -28, 48, -49, 55); ctx.moveTo(23, 27); ctx.bezierCurveTo(42, 39, 28, 48, 49, 55); ctx.stroke();
    } else if (this.bossType === "nyxfang") {
      var fur = this.phase > 1 ? "#171323" : color;
      ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(0, 4, 37, 21, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(17, -8); ctx.lineTo(40, -25); ctx.lineTo(39, 9); ctx.lineTo(20, 17); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(19, -15); ctx.lineTo(21, -38); ctx.lineTo(34, -23); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.fillRect(29, -12, 7, 5); ctx.fillStyle = "#dde5ee"; ctx.fillRect(40, 0, 8, 4);
      ctx.strokeStyle = accent; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-30, -1); ctx.bezierCurveTo(-58, -20, -55, 25, -72, 5); ctx.stroke();
    } else if (this.bossType === "gorath") {
      ctx.fillStyle = color; ctx.fillRect(-29, -31, 58, 69); ctx.fillRect(-44, -19, 16, 57); ctx.fillRect(28, -19, 16, 57); ctx.fillRect(-24, 37, 19, 17); ctx.fillRect(5, 37, 19, 17);
      ctx.fillStyle = accent;
      if (!this.armorBroken) { for (var cr = -1; cr <= 1; cr += 1) { ctx.beginPath(); ctx.moveTo(cr * 18, -48 - Math.abs(cr) * 4); ctx.lineTo(cr * 18 - 9, -22); ctx.lineTo(cr * 18 + 9, -22); ctx.closePath(); ctx.fill(); } }
      ctx.fillRect(-18, -20, 10, 7); ctx.fillRect(8, -20, 10, 7); ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(10, 16); ctx.lineTo(0, 27); ctx.lineTo(-10, 16); ctx.closePath(); ctx.fill();
    } else if (this.bossType === "eclipseWarden") {
      var pulseE = 0.75 + Math.sin(visualTime * 4.2) * 0.18;
      ctx.globalAlpha *= pulseE;
      ctx.strokeStyle = "#ff4fd8"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -3, 50 + Math.sin(visualTime * 3) * 4, 0, TAU); ctx.stroke();
      ctx.globalAlpha = deathAlpha;
      ctx.fillStyle = "#120b19"; ctx.fillRect(-24, -31, 48, 67); ctx.fillRect(-35, -16, 12, 45); ctx.fillRect(23, -16, 12, 45);
      ctx.fillStyle = "#2c1638"; ctx.beginPath(); ctx.moveTo(-24,-28); ctx.lineTo(-39,-55); ctx.lineTo(-12,-36); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(24,-28); ctx.lineTo(39,-55); ctx.lineTo(12,-36); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#0a0710"; ctx.fillRect(-18,-28,36,20); ctx.fillStyle = accent; ctx.shadowBlur = 14; ctx.shadowColor = accent; ctx.fillRect(-12,-22,8,5); ctx.fillRect(4,-22,8,5); ctx.shadowBlur = 0;
      ctx.fillStyle = "#511c57"; ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(15,20); ctx.lineTo(0,38); ctx.lineTo(-15,20); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#f0c5ff"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(29,-8); ctx.lineTo(47,31); ctx.stroke(); ctx.strokeStyle = "#ff4fd8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(29,-8); ctx.lineTo(47,31); ctx.stroke();
    } else {
      this._drawVelymoorAura(ctx);
      this._drawVelymoorBody(ctx, false, this.phase);
    }
    ctx.restore();

    if (this.bossType === "velymoor" && this.dying && !this._deathExplosionDone) {
      var swordFall = clamp(this.deathTimer / 0.8, 0, 1);
      ctx.save(); ctx.translate(x + 31 + swordFall * 18, y - 18 + swordFall * 47); ctx.rotate(-0.62 + swordFall * 1.72);
      ctx.strokeStyle = "#24152b"; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(0, 26); ctx.stroke();
      ctx.strokeStyle = "#e6e6ef"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(0, 26); ctx.stroke();
      ctx.strokeStyle = "#bd58d8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -21); ctx.lineTo(0, 22); ctx.stroke();
      ctx.fillStyle = "#caa557"; ctx.fillRect(-9, 25, 18, 5); ctx.restore();
    }

    if (this.intro && this.bossType !== "velymoor") {
      var introRatio = 1 - this.introTimer / Math.max(0.01, this.introDuration);
      ctx.save(); ctx.globalAlpha = Math.sin(introRatio * Math.PI); ctx.textAlign = "center"; ctx.font = "bold 16px monospace"; ctx.lineWidth = 4; ctx.strokeStyle = "#160e1e"; ctx.strokeText(this.name, x, y - this.radius - 38); ctx.fillStyle = "#ffe8b0"; ctx.fillText(this.name, x, y - this.radius - 38); ctx.font = "10px monospace"; ctx.fillStyle = this.config.accent; ctx.fillText(this.subtitle, x, y - this.radius - 23); ctx.restore();
    } else if (!this.intro && this.attackLabelTimer > 0 && this.lastAttack) {
      ctx.save(); ctx.globalAlpha = clamp(this.attackLabelTimer * 2, 0, 1); ctx.textAlign = "center"; ctx.font = "bold 10px monospace"; ctx.lineWidth = 3; ctx.strokeStyle = "#1a1020"; var label = this.config.attackLabels[this.lastAttack] || this.lastAttack; var labelY = y - (this.bossType === "velymoor" ? 222 : this.radius + 26); ctx.strokeText(label.toUpperCase(), x, labelY); ctx.fillStyle = "#ffdca0"; ctx.fillText(label.toUpperCase(), x, labelY); ctx.restore();
    }
    if (this.finalPhase && !this.dying) {
      ctx.save(); ctx.textAlign = "center"; ctx.font = "bold 11px monospace"; ctx.fillStyle = this.finalStrikeReady ? "#fff4a3" : "#ff72ce"; ctx.fillText(this.finalStrikeReady ? "FINAL STRIKE" : "SURVIVE " + this.finalSurvival.toFixed(1), x, y - (this.bossType === "velymoor" ? 238 : this.radius + 40)); ctx.restore();
    }
  };

  function createBoss(game, type, x, y, options) {
    return new Boss(game, type, x, y, options || {});
  }

  E.BOSS_CONFIG = BOSS_CONFIG;
  E.Boss = Boss;
  E.createBoss = createBoss;
}());
