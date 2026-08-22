(function () {
  "use strict";

  var E = window.Elaria = window.Elaria || {};
  var TAU = Math.PI * 2;

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function random(min, max) { return min + Math.random() * (max - min); }
  function distanceSq(a, b) { var x = a.x - b.x; var y = a.y - b.y; return x * x + y * y; }
  function angleDelta(a, b) {
    var d = (a - b + Math.PI) % TAU;
    if (d < 0) d += TAU;
    return d - Math.PI;
  }

  function difficultyValue(game, key, fallback) {
    var difficulty = game && game.difficulty;
    if (!difficulty) return fallback;
    var value = difficulty[key];
    if (value == null && difficulty.modifiers) value = difficulty.modifiers[key];
    value = Number(value);
    return isFinite(value) && value > 0 ? value : fallback;
  }

  function audio(game, name, options) {
    if (!game || !game.audio) return;
    try {
      if (typeof game.audio.play === "function") game.audio.play(name, options);
      else if (typeof game.audio.sfx === "function") game.audio.sfx(name, options);
      else if (typeof game.audio.playSfx === "function") game.audio.playSfx(name, options);
    } catch (ignore) { /* Sound should never stop combat. */ }
  }

  function particles(game) {
    return game && game.particles && typeof game.particles === "object" ? game.particles : null;
  }

  var ENEMY_TYPES = {
    slime: { name: "Green Slime", behavior: "slime", color: "#56b94f", accent: "#a3e66e", hp: 30, damage: 7, speed: 68, radius: 12, aggro: 210, attackRange: 34, attackDelay: 1.25, gold: [2, 6], loot: "slime_gel", lootChance: 0.28 },
    poisonSlime: { name: "Poison Slime", behavior: "poisonSlime", color: "#7e49ad", accent: "#d279e8", hp: 42, damage: 9, speed: 62, radius: 13, aggro: 225, attackRange: 40, attackDelay: 1.45, gold: [3, 8], loot: "slime_gel", lootChance: 0.38 },
    goblinScout: { name: "Goblin Scout", behavior: "chase", color: "#69a34d", accent: "#d5a75b", hp: 45, damage: 9, speed: 108, radius: 12, aggro: 260, attackRange: 37, attackDelay: 0.9, gold: [4, 10], loot: "goblin_cloth", lootChance: 0.25 },
    goblinArcher: { name: "Goblin Archer", behavior: "ranged", color: "#5d9146", accent: "#b8793f", hp: 40, damage: 8, speed: 90, radius: 12, aggro: 330, attackRange: 220, attackDelay: 1.5, projectile: "arrow", gold: [5, 12], loot: "goblin_cloth", lootChance: 0.3 },
    goblinWarrior: { name: "Goblin Warrior", behavior: "block", color: "#527d42", accent: "#aeb7bd", hp: 78, damage: 14, speed: 72, radius: 14, aggro: 265, attackRange: 43, attackDelay: 1.4, gold: [8, 16], loot: "rusty_sword", lootChance: 0.14 },
    shadowGoblin: { name: "Shadow Goblin", behavior: "shadow", color: "#3d315e", accent: "#a06ad1", hp: 66, damage: 15, speed: 125, radius: 12, aggro: 310, attackRange: 42, attackDelay: 1.18, gold: [10, 20], loot: "shadow_cloth", lootChance: 0.22 },
    spider: { name: "Giant Spider", behavior: "spider", color: "#49384f", accent: "#b75a96", hp: 62, damage: 11, speed: 93, radius: 15, aggro: 285, attackRange: 195, attackDelay: 1.7, projectile: "web", gold: [7, 15], loot: "spider_silk", lootChance: 0.34 },
    wolf: { name: "Corrupted Wolf", behavior: "wolf", color: "#53616f", accent: "#b1c7cd", hp: 74, damage: 16, speed: 132, radius: 15, aggro: 340, attackRange: 48, attackDelay: 1.55, gold: [9, 18], loot: "wolf_pelt", lootChance: 0.27 },
    darkMage: { name: "Dark Mage", behavior: "mage", color: "#412d62", accent: "#b467d1", hp: 70, damage: 15, speed: 72, radius: 13, aggro: 360, attackRange: 250, attackDelay: 1.75, projectile: "darkOrb", gold: [12, 24], loot: "chaos_dust", lootChance: 0.3 },
    vine: { name: "Living Vine", behavior: "vine", color: "#316d3d", accent: "#7fc34e", hp: 58, damage: 12, speed: 18, radius: 14, aggro: 235, attackRange: 155, attackDelay: 1.5, projectile: "thorn", gold: [5, 12], loot: "living_root", lootChance: 0.3 },
    bat: { name: "Cave Bat", behavior: "bat", color: "#50416b", accent: "#c176bb", hp: 34, damage: 9, speed: 142, radius: 10, aggro: 270, attackRange: 32, attackDelay: 0.95, gold: [4, 9], loot: "bat_wing", lootChance: 0.22 },
    skeleton: { name: "Skeleton Warrior", behavior: "skeleton", color: "#d5d0b0", accent: "#8c8170", hp: 86, damage: 16, speed: 82, radius: 13, aggro: 300, attackRange: 42, attackDelay: 1.2, gold: [10, 22], loot: "ancient_bone", lootChance: 0.3 },
    golem: { name: "Stone Golem", behavior: "golem", color: "#676875", accent: "#ae75d4", hp: 175, damage: 25, speed: 42, radius: 20, aggro: 290, attackRange: 65, attackDelay: 2.1, gold: [18, 35], loot: "golem_core", lootChance: 0.23 },
    chaosMiner: { name: "Chaos Miner", behavior: "miner", color: "#75604d", accent: "#d34fd1", hp: 92, damage: 18, speed: 74, radius: 14, aggro: 320, attackRange: 215, attackDelay: 1.8, projectile: "bomb", gold: [13, 28], loot: "chaos_ore", lootChance: 0.36 },
    crystalCreature: { name: "Crystal Creature", behavior: "crystal", color: "#477995", accent: "#72eff2", hp: 112, damage: 20, speed: 66, radius: 17, aggro: 350, attackRange: 265, attackDelay: 1.9, projectile: "crystal", gold: [16, 32], loot: "crystal_shard", lootChance: 0.42 },
    eliteSlime: { name: "Crowned Slime", behavior: "poisonSlime", color: "#c044bc", accent: "#ffe46d", hp: 120, damage: 18, speed: 78, radius: 17, aggro: 300, attackRange: 50, attackDelay: 1.1, gold: [20, 38], loot: "rare_gel", lootChance: 0.65, elite: true },
    eliteGoblin: { name: "Goblin Champion", behavior: "block", color: "#385f39", accent: "#ffd868", hp: 185, damage: 24, speed: 92, radius: 17, aggro: 350, attackRange: 52, attackDelay: 1.05, gold: [28, 48], loot: "goblin_relic", lootChance: 0.55, elite: true },
    eliteWolf: { name: "Chaos Alpha", behavior: "wolf", color: "#332b47", accent: "#ef70ff", hp: 195, damage: 27, speed: 152, radius: 19, aggro: 410, attackRange: 58, attackDelay: 1.15, gold: [30, 55], loot: "alpha_fang", lootChance: 0.62, elite: true },
    eliteMage: { name: "Chaos Warlock", behavior: "mage", color: "#251b40", accent: "#ff67e7", hp: 178, damage: 28, speed: 82, radius: 16, aggro: 430, attackRange: 300, attackDelay: 1.2, gold: [35, 65], loot: "warlock_focus", lootChance: 0.62, elite: true },
    eliteGolem: { name: "Obsidian Colossus", behavior: "golem", color: "#302d3c", accent: "#ff5bcd", hp: 360, damage: 38, speed: 50, radius: 25, aggro: 380, attackRange: 78, attackDelay: 1.7, gold: [48, 82], loot: "obsidian_heart", lootChance: 0.72, elite: true }
  };

  var TYPE_ALIASES = {
    greenSlime: "slime", poison: "poisonSlime", goblin: "goblinScout", archer: "goblinArcher",
    warrior: "goblinWarrior", shadow: "shadowGoblin", giantSpider: "spider", corruptedWolf: "wolf",
    livingVine: "vine", caveBat: "bat", skeletonWarrior: "skeleton", stoneGolem: "golem",
    miner: "chaosMiner", crystal: "crystalCreature"
  };

  function normalizeType(type) {
    type = type || "slime";
    return TYPE_ALIASES[type] || type;
  }

  function worldCollides(game, x, y, radius) {
    try {
      if (game && game.worlds && typeof game.worlds.collides === "function") return !!game.worlds.collides(x, y, radius);
      if (game && game.worlds && game.worlds.current && typeof game.worlds.current.collides === "function") return !!game.worlds.current.collides(x, y, radius);
      if (game && game.world && typeof game.world.collides === "function") return !!game.world.collides(x, y, radius);
    } catch (ignore) { return false; }
    return false;
  }

  function Projectile(game, options, y, vx, vy, extra) {
    this.game = game || {};
    if (typeof options === "number") {
      options = Object.assign({}, extra || {}, { x: options, y: y, vx: vx, vy: vy });
    }
    options = options || {};
    this.x = Number(options.x) || 0;
    this.y = Number(options.y) || 0;
    this.prevX = this.x;
    this.prevY = this.y;
    this.vx = Number(options.vx) || 0;
    this.vy = Number(options.vy) || 0;
    if (options.angle != null && options.speed != null) {
      this.vx = Math.cos(options.angle) * options.speed;
      this.vy = Math.sin(options.angle) * options.speed;
    }
    this.owner = options.owner || null;
    this.team = options.team || (this.owner && this.owner === this.game.player ? "player" : "enemy");
    this.damage = Math.max(0, Number(options.damage) || 1);
    this.radius = Math.max(2, Number(options.radius) || 5);
    this.kind = options.kind || "orb";
    this.color = options.color || (this.team === "player" ? "#8fe8ff" : "#d36bdb");
    this.accent = options.accent || "#ffffff";
    this.life = Number(options.life) || 3;
    this.maxLife = this.life;
    this.dead = false;
    this.pierce = Math.max(0, Math.floor(Number(options.pierce) || 0));
    this.knockback = Number(options.knockback) || 120;
    this.homing = Number(options.homing) || 0;
    this.gravity = Number(options.gravity) || 0;
    this.slow = Number(options.slow) || 0;
    this.slowDuration = Number(options.slowDuration) || 1.1;
    this.explosionRadius = Number(options.explosionRadius) || 0;
    this.rotation = options.rotation == null ? Math.atan2(this.vy, this.vx) : options.rotation;
    this.spin = Number(options.spin) || 0;
    this.trail = options.trail !== false;
    this.hit = [];
    this.age = 0;
  }

  Projectile.prototype._alreadyHit = function (target) {
    return this.hit.indexOf(target) >= 0;
  };

  Projectile.prototype._impact = function (target) {
    if (!target || this.dead || this._alreadyHit(target)) return;
    this.hit.push(target);
    var dealt = 0;
    if (typeof target.takeDamage === "function") {
      dealt = target.takeDamage(this.damage, this.owner || this, {
        knockback: this.knockback,
        angle: Math.atan2(this.vy, this.vx),
        projectile: this,
        kind: this.kind
      });
    }
    if (this.slow && target && typeof target.applySlow === "function") target.applySlow(this.slow, this.slowDuration);
    var fx = particles(this.game);
    if (fx && typeof fx.hit === "function") fx.hit(this.x, this.y, this.color, this.explosionRadius > 0, Math.atan2(this.vy, this.vx));
    audio(this.game, dealt ? "projectileHit" : "projectileBlock");
    if (this.pierce > 0) this.pierce -= 1;
    else {
      if (this.explosionRadius > 0) this._explode();
      this.dead = true;
    }
  };

  Projectile.prototype._explode = function () {
    if (this._exploded) return;
    this._exploded = true;
    var targets = this.team === "player" ? (this.game.enemies || []) : [this.game.player];
    for (var i = 0; i < targets.length; i += 1) {
      var target = targets[i];
      if (!target || target.dead || this._alreadyHit(target)) continue;
      var dx = target.x - this.x;
      var dy = target.y - this.y;
      var range = this.explosionRadius + (target.radius || 10);
      if (dx * dx + dy * dy <= range * range) {
        this.hit.push(target);
        if (typeof target.takeDamage === "function") target.takeDamage(this.damage, this.owner || this, {
          knockback: this.knockback * 1.35,
          angle: Math.atan2(dy, dx),
          explosion: true,
          kind: this.kind
        });
      }
    }
    var fx = particles(this.game);
    if (fx) {
      if (typeof fx.burst === "function") fx.burst(this.x, this.y, this.color, 22, 155, 4, 0.55, { kind: "spark", glow: 7 });
      if (typeof fx.hit === "function") fx.hit(this.x, this.y, this.accent, true);
    }
    if (this.game && typeof this.game.shake === "function") this.game.shake(5, 0.18);
    audio(this.game, "explosion");
  };

  Projectile.prototype.update = function (dt) {
    if (this.dead) return;
    this._drawn = false;
    dt = Math.min(0.05, Math.max(0, Number(dt) || 0));
    this.life -= dt;
    this.age += dt;
    if (this.life <= 0) {
      if (this.explosionRadius > 0) this._explode();
      this.dead = true;
      return;
    }

    var target = null;
    if (this.homing > 0) {
      if (this.team === "enemy") target = this.game.player;
      else {
        var best = Infinity;
        var enemies = this.game.enemies || [];
        for (var h = 0; h < enemies.length; h += 1) {
          if (!enemies[h] || enemies[h].dead) continue;
          var ds = distanceSq(this, enemies[h]);
          if (ds < best) { best = ds; target = enemies[h]; }
        }
      }
      if (target && !target.dead) {
        var currentSpeed = Math.max(30, Math.sqrt(this.vx * this.vx + this.vy * this.vy));
        var desired = Math.atan2(target.y - this.y, target.x - this.x);
        var current = Math.atan2(this.vy, this.vx);
        current += clamp(angleDelta(desired, current), -this.homing * dt, this.homing * dt);
        this.vx = Math.cos(current) * currentSpeed;
        this.vy = Math.sin(current) * currentSpeed;
      }
    }
    this.vy += this.gravity * dt;
    this.rotation += this.spin * dt;
    if (!this.spin) this.rotation = Math.atan2(this.vy, this.vx);
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (worldCollides(this.game, this.x, this.y, this.radius)) {
      this.x = this.prevX;
      this.y = this.prevY;
      if (this.explosionRadius > 0) this._explode();
      var wallFx = particles(this.game);
      if (wallFx && typeof wallFx.burst === "function") wallFx.burst(this.x, this.y, this.color, 6, 55, 2, 0.3, { kind: "spark" });
      this.dead = true;
      return;
    }

    if (this.trail && Math.random() < 0.52) {
      var trailFx = particles(this.game);
      if (trailFx && typeof trailFx.burst === "function") trailFx.burst(this.x, this.y, this.color, 1, 7, this.radius * 0.45, 0.22, { kind: "square", alpha: 0.45 });
    }

    if (this.team === "enemy") {
      var player = this.game.player;
      if (player && !player.dead) {
        var pdx = player.x - this.x;
        var pdy = player.y - this.y;
        var pr = this.radius + (player.radius || 12);
        if (pdx * pdx + pdy * pdy <= pr * pr) this._impact(player);
      }
    } else {
      var list = this.game.enemies || [];
      for (var i = 0; i < list.length && !this.dead; i += 1) {
        var enemy = list[i];
        if (!enemy || enemy.dead || enemy.dying || enemy === this.owner) continue;
        var dx = enemy.x - this.x;
        var dy = enemy.y - this.y;
        var radius = this.radius + (enemy.radius || 12);
        if (dx * dx + dy * dy <= radius * radius) this._impact(enemy);
      }
      var boss = this.game.boss;
      if (!this.dead && boss && boss.crystals && typeof boss.damageCrystal === "function") {
        for (var c = 0; c < boss.crystals.length && !this.dead; c += 1) {
          var crystal = boss.crystals[c];
          if (!crystal || crystal.dead) continue;
          var cdx = crystal.x - this.x;
          var cdy = crystal.y - this.y;
          var cr = this.radius + (crystal.radius || 16);
          if (cdx * cdx + cdy * cdy <= cr * cr) {
            boss.damageCrystal(c, this.damage, this.owner || this);
            this.dead = true;
          }
        }
      }
    }
  };

  Projectile.prototype.draw = function (ctx) {
    if (!ctx || this.dead || this._drawn) return;
    this._drawn = true;
    var fade = clamp(this.life / Math.min(this.maxLife, 0.3), 0, 1);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.rotate(this.rotation);
    ctx.shadowBlur = this.kind === "arrow" || this.kind === "web" ? 0 : 8;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    if (this.kind === "arrow" || this.kind === "thorn") {
      ctx.fillRect(-10, -1.5, 16, 3);
      ctx.fillStyle = this.accent;
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(2, -5); ctx.lineTo(2, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = this.color;
      ctx.fillRect(-10, -4, 3, 8);
    } else if (this.kind === "web") {
      ctx.lineWidth = 1.5;
      for (var r = 3; r <= 8; r += 3) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
      for (var a = 0; a < TAU; a += Math.PI / 3) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.stroke(); }
    } else if (this.kind === "bomb") {
      ctx.fillStyle = "#29232e"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = this.color; ctx.fillRect(-2, -8, 4, 4);
      ctx.fillStyle = "#ffd36b"; ctx.fillRect(0, -11, 3, 3);
    } else if (this.kind === "crystal") {
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(0, -5); ctx.lineTo(-8, 0); ctx.lineTo(0, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = this.accent; ctx.fillRect(-1, -3, 4, 6);
    } else {
      var pulse = this.radius + Math.sin(this.age * 18) * 1.5;
      ctx.beginPath(); ctx.arc(0, 0, pulse, 0, TAU); ctx.fill();
      ctx.fillStyle = this.accent; ctx.globalAlpha *= 0.8; ctx.beginPath(); ctx.arc(-2, -2, pulse * 0.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  function Enemy(game, type, x, y, options) {
    options = options || {};
    this.game = game || {};
    this.type = normalizeType(type);
    var baseConfig = options.config || ENEMY_TYPES[this.type] || ENEMY_TYPES.slime;
    this.config = Object.assign({}, baseConfig, options.overrides || {});
    this.name = options.name || this.config.name;
    this.behavior = options.behavior || this.config.behavior;
    this.x = Number(x) || 0;
    this.y = Number(y) || 0;
    this.spawnX = this.x;
    this.spawnY = this.y;
    this.radius = Number(options.radius || this.config.radius) || 12;
    this.elite = options.elite != null ? !!options.elite : !!this.config.elite;
    var eliteHealth = this.elite && !this.config.elite ? 1.75 : 1;
    var eliteDamage = this.elite && !this.config.elite ? 1.45 : 1;
    this.maxHealth = Math.max(1, Math.round((options.health || this.config.hp) * difficultyValue(this.game, "enemyHealth", 1) * eliteHealth));
    this.health = this.maxHealth;
    this.hp = this.health;
    this.damage = Math.max(1, (options.damage || this.config.damage) * difficultyValue(this.game, "enemyDamage", 1) * eliteDamage);
    this.speed = Math.max(1, (options.speed || this.config.speed) * difficultyValue(this.game, "enemySpeed", 1));
    this.attackSpeed = difficultyValue(this.game, "enemySpeed", 1);
    this.aggroRange = Number(options.aggro || this.config.aggro) || 250;
    this.attackRange = Number(options.attackRange || this.config.attackRange) || 40;
    this.attackDelay = Number(options.attackDelay || this.config.attackDelay) || 1.2;
    this.color = options.color || this.config.color || "#6b9f55";
    this.accent = options.accent || this.config.accent || "#e5df9c";
    this.facing = random(0, TAU);
    this.state = "patrol";
    this.stateTime = 0;
    this.age = random(0, 10);
    this.walkPhase = random(0, TAU);
    this.attackCooldown = random(0.15, this.attackDelay * 0.8);
    this.telegraph = null;
    this.flashTimer = 0;
    this.hurtTimer = 0;
    this.blockTimer = 0;
    this.stunTimer = 0;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.lungeTimer = 0;
    this.lungeVx = 0;
    this.lungeVy = 0;
    this.hasHitDuringLunge = false;
    this.patrolAngle = random(0, TAU);
    this.patrolTimer = random(0.5, 2.2);
    this.circleDirection = Math.random() < 0.5 ? -1 : 1;
    this.invisibleTimer = 0;
    this.dead = false;
    this.dying = false;
    this.noDrops = !!options.noDrops;
    this.summoned = !!options.summoned;
    this.dropBonus = Number(options.dropBonus) || 1;
    this.id = options.id || (this.type + "-" + Math.random().toString(36).slice(2, 9));
  }

  Enemy.prototype._move = function (angle, speed, dt) {
    if (!isFinite(angle) || !speed || this.behavior === "vine") return false;
    var dx = Math.cos(angle) * speed * dt;
    var dy = Math.sin(angle) * speed * dt;
    var moved = false;
    if (!worldCollides(this.game, this.x + dx, this.y, this.radius)) { this.x += dx; moved = true; }
    if (!worldCollides(this.game, this.x, this.y + dy, this.radius)) { this.y += dy; moved = true; }
    if (!moved) {
      var left = angle - 0.72;
      var right = angle + 0.72;
      if (!worldCollides(this.game, this.x + Math.cos(left) * speed * dt, this.y + Math.sin(left) * speed * dt, this.radius)) {
        this.x += Math.cos(left) * speed * dt; this.y += Math.sin(left) * speed * dt; this.facing = left; moved = true;
      } else if (!worldCollides(this.game, this.x + Math.cos(right) * speed * dt, this.y + Math.sin(right) * speed * dt, this.radius)) {
        this.x += Math.cos(right) * speed * dt; this.y += Math.sin(right) * speed * dt; this.facing = right; moved = true;
      }
    }
    if (moved) this.walkPhase += dt * (5 + speed / 30);
    return moved;
  };

  Enemy.prototype._separate = function (dt) {
    var list = this.game.enemies || [];
    var sx = 0;
    var sy = 0;
    var count = 0;
    for (var i = 0; i < list.length; i += 1) {
      var other = list[i];
      if (!other || other === this || other.dead || other.dying || !isFinite(other.x)) continue;
      var dx = this.x - other.x;
      var dy = this.y - other.y;
      var minDistance = (this.radius + (other.radius || 12)) * 0.82;
      var ds = dx * dx + dy * dy;
      if (ds < minDistance * minDistance) {
        if (ds < 0.01) { dx = random(-1, 1); dy = random(-1, 1); ds = dx * dx + dy * dy; }
        var dist = Math.sqrt(ds);
        var push = (minDistance - dist) / minDistance;
        sx += dx / dist * push;
        sy += dy / dist * push;
        count += 1;
      }
    }
    if (count) {
      var length = Math.sqrt(sx * sx + sy * sy) || 1;
      var amount = Math.min(75 * dt, 3.5);
      var nx = this.x + sx / length * amount;
      var ny = this.y + sy / length * amount;
      if (!worldCollides(this.game, nx, this.y, this.radius)) this.x = nx;
      if (!worldCollides(this.game, this.x, ny, this.radius)) this.y = ny;
    }
  };

  Enemy.prototype._patrol = function (dt) {
    this.patrolTimer -= dt;
    if (this.patrolTimer <= 0) {
      this.patrolTimer = random(1, 3.2);
      this.patrolAngle = random(0, TAU);
    }
    var homeAngle = Math.atan2(this.spawnY - this.y, this.spawnX - this.x);
    var homeDist = Math.sqrt((this.x - this.spawnX) * (this.x - this.spawnX) + (this.y - this.spawnY) * (this.y - this.spawnY));
    this.facing = homeDist > 100 ? homeAngle : this.patrolAngle;
    if (this.patrolTimer > 0.55) this._move(this.facing, this.speed * 0.3, dt);
  };

  Enemy.prototype._beginTelegraph = function (kind, duration, data) {
    if (this.telegraph || this.dead || this.dying) return false;
    data = data || {};
    var player = this.game.player;
    var targetX = data.targetX != null ? data.targetX : (player ? player.x : this.x);
    var targetY = data.targetY != null ? data.targetY : (player ? player.y : this.y);
    this.telegraph = {
      kind: kind,
      time: Math.max(0.05, duration || 0.25),
      total: Math.max(0.05, duration || 0.25),
      targetX: targetX,
      targetY: targetY,
      angle: data.angle == null ? Math.atan2(targetY - this.y, targetX - this.x) : data.angle,
      range: data.range || this.attackRange,
      width: data.width || 16,
      count: data.count || 1
    };
    this.facing = this.telegraph.angle;
    this.state = "telegraph";
    return true;
  };

  Enemy.prototype._damagePlayerInRange = function (range, multiplier, angleLimit) {
    var player = this.game.player;
    if (!player || player.dead) return false;
    var dx = player.x - this.x;
    var dy = player.y - this.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > range + (player.radius || 12)) return false;
    if (angleLimit != null && Math.abs(angleDelta(Math.atan2(dy, dx), this.facing)) > angleLimit) return false;
    if (typeof player.takeDamage === "function") player.takeDamage(this.damage * (multiplier || 1), this);
    return true;
  };

  Enemy.prototype._spawnProjectile = function (kind, angle, speed, damage, options) {
    options = Object.assign({
      x: this.x + Math.cos(angle) * (this.radius + 5),
      y: this.y + Math.sin(angle) * (this.radius + 5),
      angle: angle,
      speed: speed,
      damage: damage,
      owner: this,
      team: "enemy",
      kind: kind,
      color: this.accent,
      accent: "#ffffff"
    }, options || {});
    var projectile;
    if (this.game.combat && typeof this.game.combat.spawnEnemyProjectile === "function") {
      projectile = this.game.combat.spawnEnemyProjectile(options);
    } else {
      projectile = new Projectile(this.game, options);
      this.game.projectiles = this.game.projectiles || [];
      this.game.projectiles.push(projectile);
    }
    return projectile;
  };

  Enemy.prototype._resolveTelegraph = function (attack) {
    if (!attack || this.dead || this.dying) return;
    var player = this.game.player;
    var angle = attack.angle;
    if (player && attack.kind !== "jump" && attack.kind !== "charge") angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.facing = angle;
    if (attack.kind === "melee") {
      this._damagePlayerInRange(attack.range || this.attackRange, 1, Math.PI * 0.48);
      audio(this.game, "enemySlash");
    } else if (attack.kind === "heavy" || attack.kind === "slam") {
      this._damagePlayerInRange(attack.range || this.attackRange * 1.3, attack.kind === "slam" ? 1.35 : 1.25);
      var slamFx = particles(this.game);
      if (slamFx && typeof slamFx.burst === "function") slamFx.burst(this.x, this.y, this.accent, 16, 115, 4, 0.5, { kind: "spark" });
      if (this.game && typeof this.game.shake === "function") this.game.shake(attack.kind === "slam" ? 6 : 4, 0.2);
      audio(this.game, "enemyHeavy");
    } else if (attack.kind === "jump" || attack.kind === "charge") {
      this.lungeTimer = attack.kind === "charge" ? 0.42 : 0.31;
      var power = attack.kind === "charge" ? this.speed * 3.3 : this.speed * 3.8;
      this.lungeVx = Math.cos(attack.angle) * power;
      this.lungeVy = Math.sin(attack.angle) * power;
      this.hasHitDuringLunge = false;
      audio(this.game, attack.kind === "charge" ? "enemyCharge" : "slimeJump");
    } else if (attack.kind === "shoot") {
      var isPoison = this.behavior === "poisonSlime";
      this._spawnProjectile(isPoison ? "poisonOrb" : (this.config.projectile || "arrow"), angle, isPoison ? 185 : 235, this.damage, {
        radius: isPoison ? 7 : 4,
        knockback: 95,
        color: isPoison ? "#a95ac6" : this.accent,
        slow: isPoison ? 0.64 : 0,
        slowDuration: isPoison ? 1.15 : 0
      });
      audio(this.game, "enemyShoot");
    } else if (attack.kind === "volley") {
      for (var v = -1; v <= 1; v += 1) this._spawnProjectile(this.config.projectile || "darkOrb", angle + v * 0.18, 205, this.damage * 0.82, { radius: 5, homing: this.elite ? 0.7 : 0 });
      audio(this.game, "enemyCast");
    } else if (attack.kind === "web") {
      this._spawnProjectile("web", angle, 175, this.damage * 0.75, { radius: 7, color: "#d8d5df", slow: 0.48, slowDuration: 1.7 });
      audio(this.game, "webShot");
    } else if (attack.kind === "thorn") {
      for (var t = -1; t <= 1; t += 1) this._spawnProjectile("thorn", angle + t * 0.24, 190, this.damage * 0.75, { radius: 4, color: "#8fcf59" });
      audio(this.game, "thornShot");
    } else if (attack.kind === "bomb") {
      var speed = Math.min(250, Math.sqrt((attack.targetX - this.x) * (attack.targetX - this.x) + (attack.targetY - this.y) * (attack.targetY - this.y)) * 1.25);
      this._spawnProjectile("bomb", attack.angle, Math.max(125, speed), this.damage, { radius: 7, gravity: 25, life: 1.15, explosionRadius: 54, knockback: 190, color: "#df55c9" });
      audio(this.game, "bombThrow");
    } else if (attack.kind === "crystal") {
      for (var c = -2; c <= 2; c += 1) this._spawnProjectile("crystal", angle + c * 0.1, 245, this.damage * 0.7, { radius: 5, pierce: c === 0 ? 1 : 0, color: "#61e2ed" });
      audio(this.game, "crystalShot");
    } else if (attack.kind === "teleport") {
      var oldX = this.x;
      var oldY = this.y;
      var tx = attack.targetX - Math.cos(attack.angle) * 32;
      var ty = attack.targetY - Math.sin(attack.angle) * 32;
      if (!worldCollides(this.game, tx, ty, this.radius)) { this.x = tx; this.y = ty; }
      var teleportFx = particles(this.game);
      if (teleportFx && typeof teleportFx.smoke === "function") { teleportFx.smoke(oldX, oldY, "#8f5dc5", 10); teleportFx.smoke(this.x, this.y, "#ba6de2", 10); }
      this.facing = Math.atan2(attack.targetY - this.y, attack.targetX - this.x);
      this._damagePlayerInRange(55, 1.2, Math.PI * 0.75);
      audio(this.game, "teleport");
    }
    this.attackCooldown = this.attackDelay / this.attackSpeed * random(0.88, 1.14);
    this.state = "chase";
  };

  Enemy.prototype._think = function (dt, player, distance, angle) {
    if (!player || distance > this.aggroRange * 1.4) { this.state = "patrol"; this._patrol(dt); return; }
    this.state = "chase";
    var behavior = this.behavior;
    if (behavior === "slime" || behavior === "poisonSlime") {
      if (this.attackCooldown <= 0 && distance < this.aggroRange) this._beginTelegraph("jump", behavior === "poisonSlime" ? 0.44 : 0.34, { angle: angle, range: 44 });
      else if (distance > 70) this._move(angle, this.speed * 0.45, dt);
      if (behavior === "poisonSlime" && this.attackCooldown <= this.attackDelay * 0.35 && distance > 100 && Math.random() < dt * 0.8) {
        this._beginTelegraph("shoot", 0.36, { angle: angle });
      }
    } else if (behavior === "chase") {
      if (distance > this.attackRange) this._move(angle, this.speed, dt);
      else if (this.attackCooldown <= 0) this._beginTelegraph("melee", 0.18, { angle: angle, range: this.attackRange });
    } else if (behavior === "ranged") {
      if (distance < 125) this._move(angle + Math.PI, this.speed, dt);
      else if (distance > 235) this._move(angle, this.speed * 0.82, dt);
      else this._move(angle + this.circleDirection * Math.PI * 0.5, this.speed * 0.42, dt);
      if (this.attackCooldown <= 0) this._beginTelegraph("shoot", 0.42, { angle: angle, width: 8 });
    } else if (behavior === "block") {
      if (distance > this.attackRange + 8) this._move(angle, this.speed, dt);
      else if (this.attackCooldown <= 0) this._beginTelegraph("heavy", 0.52, { angle: angle, range: this.attackRange + 10 });
      if (!this.telegraph && this.blockTimer <= 0 && this.attackCooldown > this.attackDelay * 0.55 && Math.random() < dt * 1.4) this.blockTimer = random(0.45, 0.85);
    } else if (behavior === "shadow") {
      this._move(angle + Math.sin(this.age * 4) * 0.65, this.speed * 0.8, dt);
      if (this.attackCooldown <= 0) this._beginTelegraph(distance > 75 ? "teleport" : "melee", distance > 75 ? 0.4 : 0.16, { angle: angle, targetX: player.x, targetY: player.y, range: 48 });
    } else if (behavior === "spider") {
      if (distance < 90) this._move(angle + Math.PI, this.speed, dt);
      else if (distance > 195) this._move(angle, this.speed * 0.85, dt);
      else this._move(angle + this.circleDirection * Math.PI * 0.5, this.speed * 0.58, dt);
      if (this.attackCooldown <= 0) this._beginTelegraph("web", 0.5, { angle: angle });
    } else if (behavior === "wolf") {
      if (this.attackCooldown <= 0 && distance < 250) this._beginTelegraph("charge", 0.48, { angle: angle, width: 18, range: distance });
      else this._move(angle + this.circleDirection * (distance < 95 ? 1.35 : 0.72), this.speed * 0.82, dt);
    } else if (behavior === "mage") {
      if (distance < 125) this._move(angle + Math.PI, this.speed, dt);
      else if (distance > 270) this._move(angle, this.speed * 0.7, dt);
      if (this.attackCooldown <= 0) this._beginTelegraph(this.elite ? "volley" : "shoot", 0.58, { angle: angle });
      else if (distance < 90 && Math.random() < dt * 1.2 && !this.telegraph) this._beginTelegraph("teleport", 0.32, { angle: angle + Math.PI, targetX: player.x + Math.cos(angle + Math.PI) * 125, targetY: player.y + Math.sin(angle + Math.PI) * 125 });
    } else if (behavior === "vine") {
      this.facing = angle;
      if (this.attackCooldown <= 0) this._beginTelegraph(distance < 58 ? "melee" : "thorn", 0.46, { angle: angle, range: 60 });
    } else if (behavior === "bat") {
      this._move(angle + Math.sin(this.age * 8 + this.spawnX) * 1.05, this.speed, dt);
      if (distance < this.attackRange + 10 && this.attackCooldown <= 0) this._beginTelegraph("melee", 0.12, { angle: angle, range: 42 });
    } else if (behavior === "skeleton") {
      var groupBoost = 0;
      var list = this.game.enemies || [];
      for (var s = 0; s < list.length; s += 1) if (list[s] !== this && list[s] && list[s].behavior === "skeleton" && distanceSq(this, list[s]) < 120 * 120) groupBoost += 0.06;
      if (distance > this.attackRange) this._move(angle, this.speed * Math.min(1.3, 1 + groupBoost), dt);
      else if (this.attackCooldown <= 0) this._beginTelegraph("melee", 0.26, { angle: angle, range: this.attackRange });
    } else if (behavior === "golem") {
      if (distance > this.attackRange) this._move(angle, this.speed, dt);
      else if (this.attackCooldown <= 0) this._beginTelegraph("slam", 0.78, { angle: angle, range: this.attackRange + 28 });
    } else if (behavior === "miner") {
      if (distance < 90) this._move(angle + Math.PI, this.speed * 0.9, dt);
      else if (distance > 215) this._move(angle, this.speed * 0.72, dt);
      if (this.attackCooldown <= 0) this._beginTelegraph("bomb", 0.58, { angle: angle, targetX: player.x, targetY: player.y });
    } else if (behavior === "crystal") {
      if (distance < 125) this._move(angle + Math.PI, this.speed * 0.7, dt);
      else this._move(angle + this.circleDirection * Math.PI * 0.5, this.speed * 0.45, dt);
      if (this.attackCooldown <= 0) this._beginTelegraph("crystal", 0.72, { angle: angle, width: 10 });
    } else {
      if (distance > this.attackRange) this._move(angle, this.speed, dt);
      else if (this.attackCooldown <= 0) this._beginTelegraph("melee", 0.22, { angle: angle });
    }
  };

  Enemy.prototype.update = function (dt) {
    if (this.dead || this.dying) return;
    dt = Math.min(0.05, Math.max(0, Number(dt) || 0));
    this.age += dt;
    this.stateTime += dt;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.blockTimer = Math.max(0, this.blockTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.invisibleTimer = Math.max(0, this.invisibleTimer - dt);

    if (Math.abs(this.knockbackX) + Math.abs(this.knockbackY) > 2) {
      var nx = this.x + this.knockbackX * dt;
      var ny = this.y + this.knockbackY * dt;
      if (!worldCollides(this.game, nx, this.y, this.radius)) this.x = nx; else this.knockbackX = 0;
      if (!worldCollides(this.game, this.x, ny, this.radius)) this.y = ny; else this.knockbackY = 0;
      this.knockbackX *= Math.max(0, 1 - dt * 9);
      this.knockbackY *= Math.max(0, 1 - dt * 9);
    }

    var player = this.game.player;
    if (this.lungeTimer > 0) {
      this.lungeTimer -= dt;
      this._move(Math.atan2(this.lungeVy, this.lungeVx), Math.sqrt(this.lungeVx * this.lungeVx + this.lungeVy * this.lungeVy), dt);
      if (!this.hasHitDuringLunge && player && distanceSq(this, player) <= Math.pow(this.radius + (player.radius || 12) + 4, 2)) {
        this.hasHitDuringLunge = true;
        if (typeof player.takeDamage === "function") player.takeDamage(this.damage * (this.behavior === "wolf" ? 1.35 : 1), this);
      }
      this._separate(dt);
      return;
    }

    if (this.telegraph) {
      this.telegraph.time -= dt;
      if (this.telegraph.time <= 0) {
        var resolved = this.telegraph;
        this.telegraph = null;
        this._resolveTelegraph(resolved);
      }
      this._separate(dt);
      return;
    }
    if (this.stunTimer > 0) { this._separate(dt); return; }

    if (!player || player.dead) { this._patrol(dt); this._separate(dt); return; }
    var dx = player.x - this.x;
    var dy = player.y - this.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    var angle = Math.atan2(dy, dx);
    if (distance < this.aggroRange) this.facing = angle;
    this._think(dt, player, distance, angle);
    this._separate(dt);
  };

  Enemy.prototype.takeDamage = function (amount, source, options) {
    if (this.dead || this.dying) return 0;
    options = options || {};
    amount = Math.max(0, Number(amount) || 0);
    if (this.blockTimer > 0 && this.behavior === "block" && !options.explosion) {
      amount *= 0.22;
      var blockFx = particles(this.game);
      if (blockFx && typeof blockFx.text === "function") blockFx.text(this.x, this.y - this.radius - 12, "BLOCK", "#d9e7ed", 11, 0.55);
      audio(this.game, "shieldBlock");
    }
    amount = Math.max(1, Math.round(amount));
    this.health = Math.max(0, this.health - amount);
    this.hp = this.health;
    this.flashTimer = 0.13;
    this.hurtTimer = 0.4;
    this.state = "hurt";
    var angle = options.angle;
    if (!isFinite(angle) && source && isFinite(source.x)) angle = Math.atan2(this.y - source.y, this.x - source.x);
    if (!isFinite(angle)) angle = 0;
    var knockback = Number(options.knockback) || 115;
    var resistance = this.behavior === "golem" ? 0.28 : (this.elite ? 0.6 : 1);
    this.knockbackX += Math.cos(angle) * knockback * resistance;
    this.knockbackY += Math.sin(angle) * knockback * resistance;
    var fx = particles(this.game);
    if (fx) {
      if (typeof fx.hit === "function") fx.hit(this.x, this.y, options.critical ? "#fff28b" : this.accent, !!options.charged, angle);
      if (typeof fx.text === "function") fx.text(this.x, this.y - this.radius - 8, options.critical ? "CRITICAL " + amount : amount, options.critical ? "#ffe66b" : "#ffffff", options.critical ? 15 : 13, 0.72, { critical: !!options.critical });
    }
    audio(this.game, "enemyHurt", { rate: random(0.92, 1.08) });
    if (this.health <= 0) this.die(source);
    return amount;
  };

  Enemy.prototype._drop = function (type, x, y, data) {
    data = data || {};
    if (this.game && typeof this.game.spawnDrop === "function") {
      var payload = Object.assign({}, data);
      if (payload.item && !payload.itemId) payload.itemId = payload.item;
      try { return this.game.spawnDrop(type, x, y, payload); } catch (ignore) { /* Use local fallback below. */ }
    }
    this.game.drops = this.game.drops || [];
    var drop = {
      type: type,
      x: x,
      y: y,
      vx: data.vx == null ? random(-60, 60) : data.vx,
      vy: data.vy == null ? random(-95, -35) : data.vy,
      value: data.value || 1,
      item: data.item || null,
      age: 0,
      grounded: false,
      collected: false
    };
    this.game.drops.push(drop);
    return drop;
  };

  Enemy.prototype.die = function (source) {
    if (this.dead || this.dying) return;
    this.dead = true;
    this.health = this.hp = 0;
    var fx = particles(this.game);
    if (fx) {
      if (typeof fx.burst === "function") fx.burst(this.x, this.y, this.color, this.elite ? 30 : 16, this.elite ? 165 : 105, this.elite ? 5 : 3.5, 0.7, { kind: "square", gravity: 70, color2: this.accent });
      if (typeof fx.smoke === "function") fx.smoke(this.x, this.y, this.color, this.elite ? 12 : 6);
    }
    audio(this.game, this.elite ? "eliteDeath" : "enemyDeath");
    if (this.game && this.game.quests && typeof this.game.quests.event === "function") {
      this.game.quests.event("enemyDefeated", { type: this.type, enemy: this, source: source || null, elite: this.elite });
    }
    if (this.game && this.game.stats) this.game.stats.enemiesDefeated = (Number(this.game.stats.enemiesDefeated) || 0) + 1;
    if (!this.noDrops) {
      var goldRange = this.config.gold || [1, 3];
      var goldMultiplier = (typeof this.game.spawnDrop === "function" ? 1 : difficultyValue(this.game, "gold", 1)) * this.dropBonus;
      var total = Math.max(1, Math.round(random(goldRange[0], goldRange[1] + 1) * goldMultiplier));
      var coins = clamp(Math.ceil(total / 5), 1, this.elite ? 8 : 5);
      var remaining = total;
      for (var i = 0; i < coins; i += 1) {
        var value = i === coins - 1 ? remaining : Math.max(1, Math.floor(remaining / (coins - i)));
        remaining -= value;
        var angle = random(0, TAU);
        this._drop("gold", this.x + Math.cos(angle) * random(2, 10), this.y + Math.sin(angle) * random(2, 10), {
          value: value,
          vx: Math.cos(angle) * random(35, 85),
          vy: -random(55, 115)
        });
      }
      if (fx && typeof fx.coinBurst === "function") fx.coinBurst(this.x, this.y, Math.min(14, coins * 3));
      var dropChance = (this.config.lootChance || 0) * difficultyValue(this.game, "drops", 1) * this.dropBonus;
      if (this.config.loot && Math.random() < dropChance) this._drop("item", this.x + random(-8, 8), this.y + random(-8, 8), { item: this.config.loot, vx: random(-40, 40), vy: random(-100, -65) });
      if (Math.random() < 0.045 * difficultyValue(this.game, "drops", 1)) this._drop("potion", this.x + random(-8, 8), this.y, { item: "healthPotion", vy: -85 });
    }
    this.remove = true;
  };

  Enemy.prototype.drawTelegraph = function (ctx) {
    var t = this.telegraph;
    if (!ctx || !t) return;
    var progress = clamp(1 - t.time / t.total, 0, 1);
    var pulse = 0.45 + Math.sin(this.age * 20) * 0.15;
    ctx.save();
    ctx.globalAlpha = pulse + progress * 0.35;
    ctx.strokeStyle = progress > 0.72 ? "#fff0a3" : "#ef596d";
    ctx.fillStyle = "rgba(220,55,84,0.14)";
    ctx.lineWidth = 2;
    if (t.kind === "melee" || t.kind === "heavy") {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.arc(this.x, this.y, t.range || this.attackRange, t.angle - 0.75, t.angle + 0.75);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (t.kind === "slam" || t.kind === "jump") {
      var cx = t.kind === "jump" ? t.targetX : this.x;
      var cy = t.kind === "jump" ? t.targetY : this.y;
      ctx.beginPath(); ctx.arc(cx, cy, t.range || 55, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, (t.range || 55) * progress, 0, TAU); ctx.stroke();
    } else if (t.kind === "teleport") {
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(t.targetX, t.targetY, 23 - progress * 8, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    } else if (t.kind === "bomb") {
      ctx.beginPath(); ctx.arc(t.targetX, t.targetY, 54, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(t.targetX, t.targetY, 54 * progress, 0, TAU); ctx.stroke();
    } else {
      var length = t.range > 80 ? t.range : 300;
      ctx.translate(this.x, this.y); ctx.rotate(t.angle);
      ctx.fillRect(0, -t.width * 0.5, length, t.width);
      ctx.strokeRect(0, -t.width * 0.5, length, t.width);
    }
    ctx.restore();
  };

  Enemy.prototype.draw = function (ctx) {
    if (!ctx || this.dead) return;
    this.drawTelegraph(ctx);
    var x = Math.round(this.x);
    var y = Math.round(this.y);
    var bob = Math.sin(this.walkPhase * 1.4 + this.age * (this.behavior === "bat" ? 7 : 1.5)) * (this.behavior === "bat" ? 4 : 1.5);
    var flash = this.flashTimer > 0;
    var color = flash ? "#ffffff" : this.color;
    var accent = flash ? "#ffffff" : this.accent;
    ctx.save();
    if (this.invisibleTimer > 0) ctx.globalAlpha = 0.22;
    if (this.elite) {
      ctx.globalAlpha *= 0.3 + Math.sin(this.age * 5) * 0.08;
      ctx.strokeStyle = "#ffd75c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, this.radius + 7 + Math.sin(this.age * 4) * 2, 0, TAU); ctx.stroke();
      ctx.globalAlpha = this.invisibleTimer > 0 ? 0.22 : 1;
    }
    ctx.fillStyle = "rgba(10,8,18,0.35)";
    ctx.beginPath(); ctx.ellipse(x, y + this.radius * 0.62, this.radius * 0.9, this.radius * 0.35, 0, 0, TAU); ctx.fill();
    ctx.translate(x, Math.round(y + bob));
    var behavior = this.behavior;
    if (behavior === "slime" || behavior === "poisonSlime") {
      var squash = this.telegraph && this.telegraph.kind === "jump" ? 0.72 : 1 + Math.sin(this.age * 5) * 0.05;
      ctx.scale(1 / squash, squash);
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 1, this.radius, this.radius * 0.8, 0, Math.PI, TAU); ctx.lineTo(this.radius, 7); ctx.lineTo(-this.radius, 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.fillRect(-this.radius * 0.45, -5, 4, 4); ctx.fillRect(this.radius * 0.2, -5, 4, 4);
      if (behavior === "poisonSlime") { ctx.globalAlpha *= 0.6; ctx.fillRect(-6, 1, 4, 3); ctx.fillRect(4, -1, 3, 3); }
    } else if (behavior === "chase" || behavior === "ranged" || behavior === "block" || behavior === "shadow") {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(-7, -8); ctx.lineTo(-14, -12); ctx.lineTo(-9, -2); ctx.lineTo(-8, 8); ctx.lineTo(8, 8); ctx.lineTo(9, -2); ctx.lineTo(14, -12); ctx.lineTo(7, -8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.fillRect(-5, -6, 3, 3); ctx.fillRect(3, -6, 3, 3);
      ctx.fillStyle = "#583a2e"; ctx.fillRect(-7, 7, 5, 7); ctx.fillRect(2, 7, 5, 7);
      if (behavior === "ranged") { ctx.strokeStyle = "#8a5734"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(10, 0, 9, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke(); }
      if (behavior === "block") { ctx.fillStyle = this.blockTimer > 0 ? "#dfe8eb" : "#8a98a0"; ctx.beginPath(); ctx.arc(-10, 1, 8, 0, TAU); ctx.fill(); ctx.fillStyle = "#52606a"; ctx.fillRect(-12, -5, 4, 12); }
      if (behavior === "shadow") { ctx.fillStyle = "#b46de0"; ctx.fillRect(-2, -13, 4, 5); }
    } else if (behavior === "spider") {
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      for (var l = -1; l <= 1; l += 2) for (var leg = -1; leg <= 1; leg += 1) { ctx.beginPath(); ctx.moveTo(l * 4, leg * 4); ctx.lineTo(l * (13 + Math.abs(leg) * 2), leg * 8); ctx.lineTo(l * 18, leg * 12); ctx.stroke(); }
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 3, 10, 9, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, -6, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = accent; ctx.fillRect(-4, -8, 2, 2); ctx.fillRect(2, -8, 2, 2); ctx.fillRect(-1, -4, 2, 2);
    } else if (behavior === "wolf") {
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 2, 15, 9, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(7, -4); ctx.lineTo(14, -12); ctx.lineTo(15, 1); ctx.lineTo(7, 5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, -7); ctx.lineTo(9, -15); ctx.lineTo(13, -10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.fillRect(11, -5, 3, 2); ctx.fillStyle = color; ctx.fillRect(-15, -1, 5, 4);
    } else if (behavior === "mage") {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(-12, 12); ctx.lineTo(12, 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#171426"; ctx.fillRect(-7, -8, 14, 11); ctx.fillStyle = accent; ctx.fillRect(-4, -5, 3, 3); ctx.fillRect(2, -5, 3, 3);
      ctx.shadowBlur = 8; ctx.shadowColor = accent; ctx.beginPath(); ctx.arc(12, 3, 4, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    } else if (behavior === "vine") {
      ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 13); ctx.bezierCurveTo(-8, 5, 8, -4, 0, -15); ctx.stroke();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(-7, 1, 7, 3, -0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(7, -8, 7, 3, 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -16, 7, 0, TAU); ctx.fill();
    } else if (behavior === "bat") {
      var wing = 7 + Math.sin(this.age * 18) * 5;
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-18, -wing); ctx.lineTo(-13, 7); ctx.lineTo(0, 4); ctx.lineTo(13, 7); ctx.lineTo(18, -wing); ctx.lineTo(2, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.fillRect(-3, -3, 2, 2); ctx.fillRect(2, -3, 2, 2);
    } else if (behavior === "skeleton") {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -7, 8, 0, TAU); ctx.fill(); ctx.fillRect(-5, 0, 10, 11);
      ctx.fillStyle = "#312d34"; ctx.fillRect(-5, -9, 3, 3); ctx.fillRect(2, -9, 3, 3); ctx.fillRect(-2, -3, 4, 2);
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, 9); ctx.lineTo(-7, 16); ctx.moveTo(4, 9); ctx.lineTo(7, 16); ctx.stroke();
    } else if (behavior === "golem") {
      ctx.fillStyle = color; ctx.fillRect(-14, -12, 28, 25); ctx.fillRect(-21, -6, 8, 18); ctx.fillRect(13, -6, 8, 18); ctx.fillRect(-11, 12, 9, 8); ctx.fillRect(2, 12, 9, 8);
      ctx.fillStyle = accent; ctx.fillRect(-8, -6, 5, 4); ctx.fillRect(3, -6, 5, 4); ctx.fillRect(-2, 1, 4, 8);
    } else if (behavior === "miner") {
      ctx.fillStyle = color; ctx.fillRect(-9, -8, 18, 20); ctx.fillStyle = "#d7a946"; ctx.fillRect(-11, -12, 22, 6); ctx.fillStyle = accent; ctx.fillRect(-4, -6, 3, 3); ctx.fillRect(3, -6, 3, 3);
      ctx.strokeStyle = "#77757c"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(8, 3); ctx.lineTo(17, -8); ctx.stroke();
    } else if (behavior === "crystal") {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(16, 3); ctx.lineTo(8, 18); ctx.lineTo(-10, 15); ctx.lineTo(-16, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(5, 2); ctx.lineTo(0, 11); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    if (this.hurtTimer > 0 || this.elite) {
      var width = Math.max(24, this.radius * 2.2);
      var ratio = clamp(this.health / this.maxHealth, 0, 1);
      ctx.fillStyle = "rgba(17,12,24,0.8)"; ctx.fillRect(Math.round(this.x - width * 0.5 - 1), Math.round(this.y - this.radius - 15), width + 2, 5);
      ctx.fillStyle = this.elite ? "#e7bd44" : "#dc5362"; ctx.fillRect(Math.round(this.x - width * 0.5), Math.round(this.y - this.radius - 14), Math.round(width * ratio), 3);
    }
  };

  function createEnemy(game, type, x, y, options) {
    options = options || {};
    var enemy = new Enemy(game, type, x, y, options);
    if (options.addToGame) {
      game.enemies = game.enemies || [];
      if (game.enemies.indexOf(enemy) < 0) game.enemies.push(enemy);
    }
    return enemy;
  }

  E.ENEMY_TYPES = ENEMY_TYPES;
  E.Enemy = Enemy;
  E.Projectile = Projectile;
  E.createEnemy = createEnemy;
}());
