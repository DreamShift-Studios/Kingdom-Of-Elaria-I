(function () {
  "use strict";

  var E = window.Elaria = window.Elaria || {};
  var TAU = Math.PI * 2;

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function angleDelta(a, b) {
    var d = (a - b + Math.PI) % TAU;
    if (d < 0) d += TAU;
    return d - Math.PI;
  }

  function audio(game, name, options) {
    if (!game || !game.audio) return;
    try {
      if (typeof game.audio.play === "function") game.audio.play(name, options);
      else if (typeof game.audio.sfx === "function") game.audio.sfx(name, options);
      else if (typeof game.audio.playSfx === "function") game.audio.playSfx(name, options);
    } catch (ignore) { /* Non-fatal audio fallback. */ }
  }

  function CombatSystem(game) {
    this.game = game || {};
    this.game.projectiles = this.game.projectiles || [];
    this.projectiles = this.game.projectiles;
    this.slashes = [];
    this.attackLock = 0;
    this.lastHitCount = 0;
    this.attackSerial = 0;
    if (!this.game.combat) this.game.combat = this;
  }

  CombatSystem.prototype.update = function (dt) {
    dt = Math.min(0.05, Math.max(0, Number(dt) || 0));
    if (this.game.projectiles !== this.projectiles && Array.isArray(this.game.projectiles)) this.projectiles = this.game.projectiles;
    this.attackLock = Math.max(0, this.attackLock - dt);
    var write = 0;
    for (var i = 0; i < this.projectiles.length; i += 1) {
      var projectile = this.projectiles[i];
      if (!projectile || projectile.dead) continue;
      projectile.managedByCombat = true;
      if (typeof projectile.update === "function") projectile.update(dt);
      if (!projectile.dead) {
        this.projectiles[write] = projectile;
        write += 1;
      }
    }
    this.projectiles.length = write;

    write = 0;
    for (var j = 0; j < this.slashes.length; j += 1) {
      var slash = this.slashes[j];
      slash.life -= dt;
      if (slash.life <= 0) continue;
      slash.radius += slash.expand * dt;
      this.slashes[write] = slash;
      write += 1;
    }
    this.slashes.length = write;
  };

  CombatSystem.prototype._inSwordArc = function (player, target, reach, halfArc) {
    if (!target || !isFinite(target.x) || !isFinite(target.y)) return false;
    var dx = target.x - player.x;
    var dy = target.y - player.y;
    var targetRadius = target.radius || 12;
    var distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > reach + targetRadius || distance < 1) return distance < reach * 0.45;
    return Math.abs(angleDelta(Math.atan2(dy, dx), player.facing || 0)) <= halfArc + Math.asin(clamp(targetRadius / distance, 0, 0.8));
  };

  CombatSystem.prototype.playerAttack = function (charged, chargePower) {
    var player = this.game.player;
    if (!player || player.dead || this.attackLock > 0) return 0;
    charged = !!charged;
    chargePower = clamp(Number(chargePower) || 0, 0, 1);
    var combo = clamp(Math.floor(Number(player.comboStep) || 0), 0, 2);
    var comboMultipliers = [1, 1.18, 1.52];
    var multiplier = charged ? 2.05 + chargePower * 0.7 : comboMultipliers[combo];
    var reach = charged ? 78 + chargePower * 10 : [52, 56, 64][combo];
    var halfArc = charged ? 1.18 : [0.68, 0.75, 0.94][combo];
    var baseDamage = Math.max(1, Number(player.damage) || 10) * multiplier;
    var critChance = clamp(Number(player.critChance) || 0, 0, 0.9);
    var enemies = this.game.enemies || [];
    var hitCount = 0;
    var strongHit = charged || combo === 2;
    this.attackSerial += 1;
    this.attackLock = charged ? 0.16 : 0.09;

    for (var i = 0; i < enemies.length; i += 1) {
      var enemy = enemies[i];
      if (!enemy || enemy.dead || enemy.dying || typeof enemy.takeDamage !== "function") continue;
      if (!this._inSwordArc(player, enemy, reach, halfArc)) continue;
      var critical = Math.random() < critChance;
      var damage = baseDamage * (critical ? (Number(player.critDamage) || 1.75) : 1);
      var hitAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      var dealt = enemy.takeDamage(damage, player, {
        knockback: charged ? 330 + chargePower * 80 : [135, 170, 245][combo],
        angle: hitAngle,
        charged: charged,
        combo: combo,
        critical: critical,
        attackSerial: this.attackSerial
      });
      if (dealt !== 0) hitCount += 1;
      if (this.game.quests && typeof this.game.quests.event === "function") {
        this.game.quests.event("damageDealt", { amount: dealt || 0, enemy: enemy, charged: charged, critical: critical, combo: combo });
      }
      if (this.game.stats) this.game.stats.damageDealt = (Number(this.game.stats.damageDealt) || 0) + Math.max(0, Number(dealt) || 0);
    }

    var boss = this.game.boss;
    if (boss && !boss.dead && boss.crystals && typeof boss.damageCrystal === "function") {
      for (var c = 0; c < boss.crystals.length; c += 1) {
        var crystal = boss.crystals[c];
        if (!crystal || crystal.dead || !this._inSwordArc(player, crystal, reach, halfArc)) continue;
        var crystalCrit = Math.random() < critChance;
        boss.damageCrystal(c, baseDamage * (crystalCrit ? (Number(player.critDamage) || 1.75) : 1), player, { critical: crystalCrit, charged: charged });
        hitCount += 1;
      }
    }
    if (boss && !boss.dead && boss.chaosClones && typeof boss.damageChaosClone === "function") {
      for (var k = 0; k < boss.chaosClones.length; k += 1) {
        var chaosClone = boss.chaosClones[k];
        if (!chaosClone || chaosClone.dead || !this._inSwordArc(player, chaosClone, reach, halfArc)) continue;
        if (boss.damageChaosClone(k, player)) hitCount += 1;
      }
    }

    this.slashes.push({
      x: player.x,
      y: player.y,
      angle: player.facing || 0,
      arc: halfArc * 2,
      radius: reach * 0.58,
      maxRadius: reach,
      expand: charged ? 165 : 125,
      life: charged ? 0.22 : 0.15,
      maxLife: charged ? 0.22 : 0.15,
      color: charged ? "#ffe88a" : (combo === 2 ? "#b8edff" : "#e9f6ff"),
      width: charged ? 8 : (combo === 2 ? 6 : 4),
      charged: charged
    });
    if (hitCount > 0) {
      audio(this.game, strongHit ? "swordImpactHeavy" : "swordImpact", { rate: 1 + combo * 0.04 });
      if (this.game && typeof this.game.shake === "function" && (!this.game.settings || this.game.settings.screenShake !== false)) {
        this.game.shake(charged ? 8 + chargePower * 3 : (combo === 2 ? 5 : 2.5), charged ? 0.24 : 0.13);
      }
    }
    this.lastHitCount = hitCount;
    if (this.game.quests && typeof this.game.quests.event === "function") this.game.quests.event("player_attacked", { charged: charged, combo: combo, hits: hitCount });
    return hitCount;
  };

  CombatSystem.prototype._makeProjectile = function (options) {
    if (typeof E.Projectile !== "function") return null;
    var projectile = new E.Projectile(this.game, options);
    projectile.managedByCombat = true;
    this.projectiles.push(projectile);
    if (this.game.projectiles !== this.projectiles) this.game.projectiles = this.projectiles;
    return projectile;
  };

  /** Supports either one options object or x, y, angle, speed, damage, options. */
  CombatSystem.prototype.spawnEnemyProjectile = function (x, y, angle, speed, damage, options) {
    var settings;
    if (x && typeof x === "object") settings = Object.assign({}, x);
    else settings = Object.assign({}, options || {}, { x: x, y: y, angle: angle, speed: speed, damage: damage });
    settings.team = "enemy";
    if (!settings.owner) settings.owner = null;
    return this._makeProjectile(settings);
  };

  CombatSystem.prototype.spawnPlayerProjectile = function (x, y, angle, speed, damage, options) {
    var settings;
    if (x && typeof x === "object") settings = Object.assign({}, x);
    else settings = Object.assign({}, options || {}, { x: x, y: y, angle: angle, speed: speed, damage: damage });
    settings.team = "player";
    if (!settings.owner) settings.owner = this.game.player || null;
    return this._makeProjectile(settings);
  };

  CombatSystem.prototype.draw = function (ctx) {
    if (!ctx) return;
    for (var i = 0; i < this.projectiles.length; i += 1) {
      if (this.projectiles[i] && typeof this.projectiles[i].draw === "function") this.projectiles[i].draw(ctx);
    }
    ctx.save();
    ctx.lineCap = "square";
    for (var j = 0; j < this.slashes.length; j += 1) {
      var slash = this.slashes[j];
      var ratio = clamp(slash.life / slash.maxLife, 0, 1);
      ctx.globalAlpha = ratio * (slash.charged ? 0.92 : 0.72);
      ctx.strokeStyle = slash.color;
      ctx.shadowBlur = slash.charged ? 12 : 5;
      ctx.shadowColor = slash.color;
      ctx.lineWidth = slash.width * ratio + 1;
      ctx.beginPath();
      ctx.arc(Math.round(slash.x), Math.round(slash.y), slash.radius, slash.angle - slash.arc * 0.5, slash.angle + slash.arc * 0.5);
      ctx.stroke();
      if (slash.charged) {
        ctx.globalAlpha = ratio * 0.35;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(Math.round(slash.x), Math.round(slash.y), slash.radius - 8, slash.angle - slash.arc * 0.55, slash.angle + slash.arc * 0.55);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  E.CombatSystem = CombatSystem;
}());
