(function () {
  "use strict";

  var E = window.Elaria = window.Elaria || {};
  var TAU = Math.PI * 2;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function angleDelta(a, b) {
    var d = (a - b + Math.PI) % TAU;
    if (d < 0) d += TAU;
    return d - Math.PI;
  }

  function callAudio(game, name, options) {
    if (!game || !game.audio) return;
    try {
      if (typeof game.audio.play === "function") game.audio.play(name, options);
      else if (typeof game.audio.sfx === "function") game.audio.sfx(name, options);
      else if (typeof game.audio.playSfx === "function") game.audio.playSfx(name, options);
    } catch (ignore) { /* Audio is deliberately non-fatal. */ }
  }

  function particleSystem(game) {
    return game && game.particles && typeof game.particles === "object" ? game.particles : null;
  }

  function inputCall(input, method, key) {
    if (!input || typeof input[method] !== "function") return false;
    try { return !!input[method](key); } catch (ignore) { return false; }
  }

  function keyAliases(key) {
    var map = {
      left: ["a", "A", "KeyA", "ArrowLeft", "left"],
      right: ["d", "D", "KeyD", "ArrowRight", "right"],
      up: ["w", "W", "KeyW", "ArrowUp", "up"],
      down: ["s", "S", "KeyS", "ArrowDown", "down"],
      attack: [" ", "Space", "Spacebar", "Mouse0", "mouse0", "leftMouse"],
      dash: ["Shift", "ShiftLeft", "ShiftRight", "shift"],
      potion: ["q", "Q", "KeyQ"]
    };
    return map[key] || [key];
  }

  function inputAny(input, method, logicalKey) {
    var aliases = keyAliases(logicalKey);
    for (var i = 0; i < aliases.length; i += 1) {
      if (inputCall(input, method, aliases[i])) return true;
    }
    if (logicalKey === "attack" && input) {
      if (method === "down" && (input.mouseDown === true || (input.mouse && input.mouse.left === true))) return true;
      if (method === "pressed" && (input.mousePressed === true || (input.mouse && input.mouse.leftPressed === true))) return true;
    }
    return false;
  }

  function Player(game, data) {
    data = data || {};
    this.game = game || {};
    this.name = data.name || "Hero";
    this.x = Number(data.x);
    this.y = Number(data.y);
    if (!isFinite(this.x)) this.x = 160;
    if (!isFinite(this.y)) this.y = 160;
    this.radius = data.radius || 13;
    this.vx = 0;
    this.vy = 0;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.facing = Number(data.facing);
    if (!isFinite(this.facing)) this.facing = Math.PI * 0.5;
    this.facingX = Math.cos(this.facing);
    this.facingY = Math.sin(this.facing);

    var loadedBase = data.baseStats || {};
    this.baseStats = {
      maxHealth: Number(loadedBase.maxHealth || data.baseMaxHealth || 100),
      damage: Number(loadedBase.damage || data.baseDamage || 12),
      defense: Number(loadedBase.defense || data.baseDefense || 1),
      moveSpeed: Number(loadedBase.moveSpeed || data.baseMoveSpeed || 155),
      critChance: Number(loadedBase.critChance == null ? 0.08 : loadedBase.critChance),
      critDamage: Number(loadedBase.critDamage || 1.75),
      potionStrength: Number(loadedBase.potionStrength || 38)
    };
    this.maxHealth = this.baseStats.maxHealth;
    this.damage = this.baseStats.damage;
    this.defense = this.baseStats.defense;
    this.moveSpeed = this.baseStats.moveSpeed;
    this.speed = this.moveSpeed;
    this.critChance = this.baseStats.critChance;
    this.critDamage = this.baseStats.critDamage;
    this.potionStrength = this.baseStats.potionStrength;
    this.health = Number(data.health == null ? data.hp : data.health);
    if (!isFinite(this.health)) this.health = Number(data.maxHealth) || this.maxHealth;
    this.hp = this.health;
    this.gold = Math.max(0, Number(data.gold) || 0);
    this.potions = Math.max(0, Math.floor(Number(data.potions) || 0));

    this.acceleration = 980;
    this.deceleration = 1120;
    this.walkTime = 0;
    this.moving = false;
    this.dead = false;
    this.hurtFlash = 0;
    this.invulnerableTimer = 0;
    this.invulnerable = false;
    this.slowTimer = 0;
    this.slowFactor = 1;

    this.attackCooldown = 0;
    this.attackTimer = 0;
    this.attackDuration = 0.24;
    this.comboStep = 0;
    this.comboWindow = 0;
    this.charge = 0;
    this.maxCharge = 1.2;
    this.charging = false;
    this.lastAttackCharged = false;
    this._attackWasDown = false;

    this.dashCooldown = 0;
    this.dashTimer = 0;
    this.dashDuration = 0.17;
    this.dashX = 0;
    this.dashY = 0;

    this.recalcStats(false);
    this.health = clamp(this.health, 0, this.maxHealth);
    this.hp = this.health;
    if (this.game && !this.game.player) this.game.player = this;
  }

  Player.prototype._collides = function (x, y) {
    var worlds = this.game && this.game.worlds;
    try {
      if (worlds && typeof worlds.collides === "function") return !!worlds.collides(x, y, this.radius);
      if (worlds && worlds.current && typeof worlds.current.collides === "function") return !!worlds.current.collides(x, y, this.radius);
      if (this.game && this.game.world && typeof this.game.world.collides === "function") return !!this.game.world.collides(x, y, this.radius);
    } catch (ignore) { return false; }
    return false;
  };

  Player.prototype._moveWithCollision = function (dx, dy) {
    if (!dx && !dy) return;
    var targetX = this.x + dx;
    if (!this._collides(targetX, this.y)) this.x = targetX;
    else this.vx = this.knockbackX = 0;
    var targetY = this.y + dy;
    if (!this._collides(this.x, targetY)) this.y = targetY;
    else this.vy = this.knockbackY = 0;
  };

  Player.prototype._aimAtMouse = function () {
    var mouse = this.game && this.game.input && this.game.input.mouseWorld;
    if (!mouse) return;
    var mouseX = isFinite(mouse.worldX) ? mouse.worldX : mouse.x;
    var mouseY = isFinite(mouse.worldY) ? mouse.worldY : mouse.y;
    if (!isFinite(mouseX) || !isFinite(mouseY)) return;
    var dx = mouseX - this.x;
    var dy = mouseY - this.y;
    if (dx * dx + dy * dy < 16) return;
    this.facing = Math.atan2(dy, dx);
    this.facingX = Math.cos(this.facing);
    this.facingY = Math.sin(this.facing);
  };

  Player.prototype.update = function (dt) {
    dt = Math.min(0.05, Math.max(0, Number(dt) || 0));
    if (this.dead || dt <= 0) return;
    var input = this.game && this.game.input;

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    this.invulnerable = this.invulnerableTimer > 0 || this.dashTimer > 0;
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.cinematicLocked) {
      this.moving = false;
      this.charging = false;
      this.dashTimer = 0;
      this.invulnerable = true;
      return;
    }
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowFactor >= 1) this.slowFactor = 0.68;
    }
    else this.slowFactor = 1;

    if (inputAny(input, "pressed", "potion")) this.spendPotion();
    if (inputAny(input, "pressed", "dash")) this.dash();

    var moveX = (inputAny(input, "down", "right") ? 1 : 0) - (inputAny(input, "down", "left") ? 1 : 0);
    var moveY = (inputAny(input, "down", "down") ? 1 : 0) - (inputAny(input, "down", "up") ? 1 : 0);
    var length = Math.sqrt(moveX * moveX + moveY * moveY);
    if (length > 0) {
      moveX /= length;
      moveY /= length;
      if (!this.charging) {
        this.facing = Math.atan2(moveY, moveX);
        this.facingX = moveX;
        this.facingY = moveY;
      }
      this.moving = true;
      this.walkTime += dt * (6.5 + this.moveSpeed / 75);
    } else {
      this.moving = false;
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      var dashSpeed = 540 * (0.82 + this.moveSpeed / 800);
      this._moveWithCollision(this.dashX * dashSpeed * dt, this.dashY * dashSpeed * dt);
      var trail = particleSystem(this.game);
      if (trail && typeof trail.burst === "function" && Math.random() < 0.75) {
        trail.burst(this.x - this.dashX * 8, this.y - this.dashY * 8, "#a9dcff", 2, 16, 3, 0.25, { kind: "smoke", alpha: 0.45 });
      }
    } else {
      var speedScale = this.slowFactor * (this.charging ? 0.54 : 1);
      var targetVx = moveX * this.moveSpeed * speedScale;
      var targetVy = moveY * this.moveSpeed * speedScale;
      var accel = length > 0 ? this.acceleration : this.deceleration;
      var maxChange = accel * dt;
      this.vx += clamp(targetVx - this.vx, -maxChange, maxChange);
      this.vy += clamp(targetVy - this.vy, -maxChange, maxChange);
      this.knockbackX *= Math.max(0, 1 - dt * 8.5);
      this.knockbackY *= Math.max(0, 1 - dt * 8.5);
      this._moveWithCollision((this.vx + this.knockbackX) * dt, (this.vy + this.knockbackY) * dt);
    }

    var attackDown = inputAny(input, "down", "attack");
    var attackPressed = inputAny(input, "pressed", "attack");
    if ((attackDown || attackPressed) && !this._attackWasDown && !this.charging) {
      this.charging = true;
      this.charge = 0;
      this._aimAtMouse();
    }
    if (this.charging && attackDown) {
      this.charge = Math.min(this.maxCharge, this.charge + dt);
      this._aimAtMouse();
      if (this.charge >= 0.42 && this.charge - dt < 0.42) callAudio(this.game, "chargeReady");
    }
    if (this.charging && !attackDown) {
      this.attack(this.charge >= 0.42);
      this.charging = false;
      this.charge = 0;
    } else if (attackPressed && !attackDown) {
      this.attack(false);
      this.charging = false;
    }
    this._attackWasDown = attackDown;
  };

  Player.prototype.attack = function (charged) {
    if (this.dead || this.attackCooldown > 0 || this.dashTimer > 0) return false;
    charged = !!charged;
    this._aimAtMouse();
    if (charged) {
      this.comboStep = 2;
      this.attackCooldown = 0.58;
      this.attackDuration = 0.36;
      this.comboWindow = 0;
    } else {
      this.comboStep = this.comboWindow > 0 ? (this.comboStep + 1) % 3 : 0;
      this.attackCooldown = [0.20, 0.22, 0.34][this.comboStep];
      this.attackDuration = [0.20, 0.22, 0.31][this.comboStep];
      this.comboWindow = 0.66;
    }
    this.attackTimer = this.attackDuration;
    this.lastAttackCharged = charged;
    callAudio(this.game, charged ? "swordHeavy" : "swordSwing", { rate: 1 + this.comboStep * 0.06 });
    if (this.game && this.game.combat && typeof this.game.combat.playerAttack === "function") {
      this.game.combat.playerAttack(charged, charged ? clamp(this.charge / this.maxCharge, 0.45, 1) : 0);
    } else {
      this._fallbackAttack(charged);
    }
    return true;
  };

  Player.prototype._fallbackAttack = function (charged) {
    var enemies = this.game && this.game.enemies || [];
    var reach = charged ? 72 : 52;
    var arc = charged ? 1.8 : 1.35;
    for (var i = 0; i < enemies.length; i += 1) {
      var enemy = enemies[i];
      if (!enemy || enemy.dead || typeof enemy.takeDamage !== "function") continue;
      var dx = enemy.x - this.x;
      var dy = enemy.y - this.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= reach + (enemy.radius || 10) && Math.abs(angleDelta(Math.atan2(dy, dx), this.facing)) <= arc * 0.5) {
        enemy.takeDamage(this.damage * (charged ? 2.25 : [1, 1.18, 1.48][this.comboStep]), this, {
          knockback: charged ? 290 : 170,
          angle: Math.atan2(dy, dx),
          charged: charged
        });
      }
    }
  };

  Player.prototype.dash = function () {
    if (this.dead || this.dashCooldown > 0 || this.dashTimer > 0) return false;
    var speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > 25) {
      this.dashX = this.vx / speed;
      this.dashY = this.vy / speed;
    } else {
      this.dashX = this.facingX || Math.cos(this.facing);
      this.dashY = this.facingY || Math.sin(this.facing);
    }
    this.dashTimer = this.dashDuration;
    this.dashCooldown = 0.72;
    this.invulnerableTimer = Math.max(this.invulnerableTimer, this.dashDuration + 0.05);
    this.charging = false;
    this.charge = 0;
    callAudio(this.game, "dash");
    return true;
  };

  Player.prototype.takeDamage = function (amount, source) {
    if (this.dead || this.invulnerableTimer > 0 || this.dashTimer > 0) return 0;
    amount = Math.max(0, Number(amount) || 0);
    var mitigated = Math.max(1, Math.round(amount * (100 / (100 + Math.max(0, this.defense) * 7))));
    this.health = Math.max(0, this.health - mitigated);
    this.hp = this.health;
    this.invulnerableTimer = 0.72;
    this.invulnerable = true;
    this.hurtFlash = 0.2;
    if (source && isFinite(source.x) && isFinite(source.y)) {
      var angle = Math.atan2(this.y - source.y, this.x - source.x);
      var force = source.knockback || 145;
      this.knockbackX += Math.cos(angle) * force;
      this.knockbackY += Math.sin(angle) * force;
    }
    var particles = particleSystem(this.game);
    if (particles) {
      if (typeof particles.hit === "function") particles.hit(this.x, this.y - 7, "#ff6b72", mitigated >= 20);
      if (typeof particles.text === "function") particles.text(this.x, this.y - 26, "-" + mitigated, "#ff7078", 15, 0.75);
    }
    callAudio(this.game, "playerHurt");
    if (this.game && typeof this.game.shake === "function" && (!this.game.settings || this.game.settings.screenShake !== false)) {
      this.game.shake(mitigated >= 20 ? 6 : 3, 0.16);
    }
    if (this.game && this.game.quests && typeof this.game.quests.event === "function") {
      this.game.quests.event("playerDamaged", { amount: mitigated, source: source || null });
    }
    if (this.game && this.game.stats) this.game.stats.damageTaken = (Number(this.game.stats.damageTaken) || 0) + mitigated;
    if (this.health <= 0) {
      this.dead = true;
      this.vx = this.vy = 0;
      callAudio(this.game, "playerDeath");
      if (this.game && typeof this.game.onPlayerDeath === "function") this.game.onPlayerDeath();
    }
    return mitigated;
  };

  Player.prototype.heal = function (amount) {
    if (this.dead) return 0;
    var before = this.health;
    this.health = clamp(this.health + Math.max(0, Number(amount) || 0), 0, this.maxHealth);
    this.hp = this.health;
    var healed = this.health - before;
    if (healed > 0) {
      var particles = particleSystem(this.game);
      if (particles && typeof particles.heal === "function") particles.heal(this.x, this.y, healed);
      callAudio(this.game, "heal");
    }
    return healed;
  };

  Player.prototype.spendPotion = function () {
    if (this.dead || this.health >= this.maxHealth) {
      if (this.game && this.game.ui && typeof this.game.ui.toast === "function" && this.health >= this.maxHealth) this.game.ui.toast("Health is already full.");
      return false;
    }
    var inventory = this.game && this.game.inventory;
    var used = false;
    if (inventory) {
      try {
        if (typeof inventory.use === "function") {
          var potionItem = inventory.items && inventory.items.find(function (entry) { return entry && (entry.id === 'health_potion' || entry.id === 'greater_health_potion' || entry.id === 'royal_elixir'); });
          used = potionItem ? inventory.use(potionItem.uid) !== false : false;
        }
        else if (typeof inventory.remove === "function") used = !!inventory.remove("healthPotion", 1);
        else if (typeof inventory.removeItem === "function") used = !!inventory.removeItem("healthPotion", 1);
      } catch (ignore) { used = false; }
    }
    if (!used && this.potions > 0) {
      this.potions -= 1;
      used = true;
    }
    if (!used) {
      if (this.game && this.game.ui && typeof this.game.ui.toast === "function") this.game.ui.toast("No health potions.");
      callAudio(this.game, "uiDeny");
      return false;
    }
    // Inventory.use owns the healing step in the remastered build.
    callAudio(this.game, "potion");
    if (this.game && this.game.stats) this.game.stats.potionsUsed = (Number(this.game.stats.potionsUsed) || 0) + 1;
    if (this.game && this.game.quests && typeof this.game.quests.event === "function") this.game.quests.event("potionUsed", { player: this });
    return true;
  };

  Player.prototype.applySlow = function (factor, duration) {
    this.slowFactor = Math.min(this.slowFactor, clamp(Number(factor) || 0.65, 0.2, 1));
    this.slowTimer = Math.max(this.slowTimer, Number(duration) || 1);
  };

  Player.prototype.recalcStats = function (preserveRatio) {
    var bonuses = {};
    var inventory = this.game && this.game.inventory;
    try {
      if (inventory && typeof inventory.getBonuses === "function") bonuses = inventory.getBonuses() || {};
    } catch (ignore) { bonuses = {}; }
    try {
      var progressionBonuses = this.game && this.game.progression && typeof this.game.progression.getBonuses === "function" ? this.game.progression.getBonuses() : {};
      Object.keys(progressionBonuses || {}).forEach(function (key) { bonuses[key] = Number(bonuses[key] || 0) + Number(progressionBonuses[key] || 0); });
    } catch (ignoreProgression) { /* Remaster progression is optional for old saves. */ }
    var oldMax = this.maxHealth || this.baseStats.maxHealth;
    var oldHealth = isFinite(this.health) ? this.health : oldMax;
    this.maxHealth = Math.max(1, this.baseStats.maxHealth + Number(bonuses.maxHealth || bonuses.health || 0));
    this.damage = Math.max(1, this.baseStats.damage + Number(bonuses.damage || bonuses.attack || 0));
    this.defense = Math.max(0, this.baseStats.defense + Number(bonuses.defense || bonuses.armor || 0));
    this.moveSpeed = Math.max(70, this.baseStats.moveSpeed + Number(bonuses.moveSpeed || bonuses.speed || 0));
    this.speed = this.moveSpeed;
    this.critChance = clamp(this.baseStats.critChance + Number(bonuses.critChance || bonuses.crit || 0), 0, 0.75);
    this.critDamage = Math.max(1.2, this.baseStats.critDamage + Number(bonuses.critDamage || 0));
    var potionBonus = Number(bonuses.potionStrength || bonuses.healing || 0);
    this.potionStrength = Math.max(1, this.baseStats.potionStrength * (1 + potionBonus));
    if (preserveRatio && oldMax > 0) this.health = this.maxHealth * clamp(oldHealth / oldMax, 0, 1);
    else this.health = clamp(oldHealth + Math.max(0, this.maxHealth - oldMax), 0, this.maxHealth);
    this.hp = this.health;
    return this;
  };

  Player.prototype.serialize = function () {
    return {
      name: this.name,
      x: Math.round(this.x * 10) / 10,
      y: Math.round(this.y * 10) / 10,
      facing: this.facing,
      health: Math.round(this.health * 10) / 10,
      hp: Math.round(this.health * 10) / 10,
      maxHealth: this.maxHealth,
      gold: this.gold,
      potions: this.potions,
      baseStats: {
        maxHealth: this.baseStats.maxHealth,
        damage: this.baseStats.damage,
        defense: this.baseStats.defense,
        moveSpeed: this.baseStats.moveSpeed,
        critChance: this.baseStats.critChance,
        critDamage: this.baseStats.critDamage,
        potionStrength: this.baseStats.potionStrength
      }
    };
  };

  Player.prototype.draw = function (ctx) {
    if (!ctx) return;
    var x = Math.round(this.x);
    var y = Math.round(this.y);
    var bob = this.moving && this.dashTimer <= 0 ? Math.sin(this.walkTime * 2) * 1.5 : 0;
    var step = this.moving ? Math.sin(this.walkTime * 2.1) * 3 : 0;
    var blink = this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 18) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.45;

    ctx.fillStyle = "rgba(12,9,18,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + 10, this.dashTimer > 0 ? 16 : 12, 5, 0, 0, TAU);
    ctx.fill();

    ctx.translate(x, Math.round(y + bob));
    ctx.rotate(this.dashTimer > 0 ? this.facing * 0.05 : 0);
    var side = Math.abs(Math.cos(this.facing));
    var back = Math.sin(this.facing) < -0.25;

    ctx.fillStyle = "#29243c";
    ctx.fillRect(-7 + step * 0.35, 5, 5, 8);
    ctx.fillRect(2 - step * 0.35, 5, 5, 8);
    ctx.fillStyle = "#6f4933";
    ctx.fillRect(-7 + step * 0.35, 11, 5, 3);
    ctx.fillRect(2 - step * 0.35, 11, 5, 3);

    ctx.fillStyle = this.hurtFlash > 0 ? "#ffffff" : "#315d87";
    ctx.fillRect(-8, -5, 16, 13);
    ctx.fillStyle = "#d5a84d";
    ctx.fillRect(-8, 3, 16, 3);
    ctx.fillStyle = "#763d48";
    ctx.fillRect(-10, -3, 3, 9);
    ctx.fillRect(7, -3, 3, 9);

    ctx.fillStyle = this.hurtFlash > 0 ? "#ffffff" : "#e9b985";
    ctx.fillRect(-6, -15, 12, 11);
    ctx.fillStyle = "#5c352d";
    ctx.fillRect(-7, -17, 14, 5);
    ctx.fillRect(back ? -7 : -6, -13, back ? 14 : 3, 4);
    if (!back) {
      ctx.fillStyle = "#2b2430";
      var eyeX = side > 0.7 ? (Math.cos(this.facing) > 0 ? 3 : -4) : -3;
      ctx.fillRect(eyeX, -10, 2, 2);
      if (side < 0.7) ctx.fillRect(2, -10, 2, 2);
    }

    if (this.charging) {
      var chargeRatio = clamp(this.charge / 0.42, 0, 1.5);
      ctx.strokeStyle = this.charge >= 0.42 ? "#fff2a0" : "#8fdcff";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.35 + Math.min(0.55, chargeRatio * 0.4);
      ctx.beginPath();
      ctx.arc(0, -2, 18 + Math.sin(this.walkTime * 5) * 2, -Math.PI * 0.5, -Math.PI * 0.5 + TAU * Math.min(1, this.charge / 0.42));
      ctx.stroke();
      ctx.globalAlpha = blink ? 0.45 : 1;
    }

    ctx.restore();

    if (this.attackTimer > 0) {
      var progress = 1 - this.attackTimer / Math.max(0.01, this.attackDuration);
      var sweep = this.lastAttackCharged ? 2.25 : 1.55;
      var start = this.facing - sweep * 0.75;
      var swordAngle = start + sweep * clamp(progress * 1.35, 0, 1);
      var handX = x + Math.cos(swordAngle) * 10;
      var handY = y - 2 + Math.sin(swordAngle) * 10;
      var swordLength = this.lastAttackCharged ? 29 : 24;
      ctx.save();
      ctx.lineCap = "square";
      ctx.strokeStyle = "#6d482f";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(handX - Math.cos(swordAngle) * 3, handY - Math.sin(swordAngle) * 3);
      ctx.lineTo(handX + Math.cos(swordAngle) * 3, handY + Math.sin(swordAngle) * 3);
      ctx.stroke();
      ctx.strokeStyle = this.lastAttackCharged ? "#fff5b5" : "#d9e7ef";
      ctx.lineWidth = this.lastAttackCharged ? 5 : 4;
      ctx.shadowBlur = this.lastAttackCharged ? 10 : 0;
      ctx.shadowColor = "#ffdf6b";
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(handX + Math.cos(swordAngle) * swordLength, handY + Math.sin(swordAngle) * swordLength);
      ctx.stroke();
      ctx.restore();
    }
  };

  E.Player = Player;
}());
