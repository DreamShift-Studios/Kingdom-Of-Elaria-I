(function () {
  "use strict";

  var E = window.Elaria = window.Elaria || {};
  var TAU = Math.PI * 2;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function asColor(color, fallback) {
    return typeof color === "string" && color ? color : fallback;
  }

  /** Lightweight pooled canvas particles. All coordinates are world coordinates. */
  function ParticleSystem(game) {
    this.game = game || null;
    this.particles = [];
    this.floatingTexts = [];
    this.texts = this.floatingTexts;
    this.maxParticles = 520;
    this.particlePool = [];
    this.textPool = [];
    this.time = 0;
  }

  ParticleSystem.prototype._acquire = function () { return this.particlePool.pop() || {}; };
  ParticleSystem.prototype._release = function (particle) { if (particle && this.particlePool.length < this.maxParticles) this.particlePool.push(particle); };
  ParticleSystem.prototype._acquireText = function () { return this.textPool.pop() || {}; };
  ParticleSystem.prototype._releaseText = function (entry) { if (entry && this.textPool.length < 96) this.textPool.push(entry); };

  ParticleSystem.prototype._push = function (particle) {
    if (this.particles.length >= this.maxParticles) {
      var removed = this.particles.splice(0, Math.max(1, this.particles.length - this.maxParticles + 1));
      for (var r = 0; r < removed.length; r += 1) this._release(removed[r]);
    }
    this.particles.push(particle);
    return particle;
  };

  ParticleSystem.prototype.burst = function (x, y, color, count, speed, size, life, options) {
    // Compatibility form used by world props: burst(x, y, count, [palette]).
    if (typeof color === "number") {
      var legacyCount = Math.max(1, Math.round(color));
      var palette = Array.isArray(count) && count.length ? count : ["#ffffff"];
      for (var group = 0; group < palette.length; group += 1) {
        this.burst(x, y, palette[group], Math.ceil(legacyCount / palette.length), 90, 3, 0.55, { kind: "square", gravity: 45 });
      }
      return this;
    }
    options = options || {};
    count = clamp(Math.round(count == null ? 8 : count), 1, 80);
    var density = this.game && this.game.settings ? Number(this.game.settings.particleDensity) : 1;
    count = clamp(Math.round(count * (Number.isFinite(density) ? density : 1)), 1, 100);
    speed = speed == null ? 85 : speed;
    size = size == null ? 3 : size;
    life = life == null ? 0.45 : life;
    color = asColor(color, "#ffffff");
    var start = options.angle == null ? 0 : options.angle;
    var spread = options.spread == null ? TAU : options.spread;
    for (var i = 0; i < count; i += 1) {
      var angle = spread >= TAU ? random(0, TAU) : start + random(-spread * 0.5, spread * 0.5);
      var velocity = speed * random(0.45, 1.15);
      var particle = this._acquire();
      particle.kind=options.kind||"square";particle.x=x+random(-2,2);particle.y=y+random(-2,2);
      particle.vx=Math.cos(angle)*velocity+(options.vx||0);particle.vy=Math.sin(angle)*velocity+(options.vy||0);
      particle.gravity=options.gravity==null?0:options.gravity;particle.drag=options.drag==null?4.2:options.drag;
      particle.color=color;particle.color2=options.color2||color;particle.size=size*random(.65,1.35);particle.startSize=size;
      particle.life=life*random(.75,1.2);particle.maxLife=particle.life;particle.rotation=random(0,TAU);particle.spin=random(-8,8);
      particle.alpha=options.alpha==null?1:options.alpha;particle.shrink=options.shrink!==false;particle.glow=options.glow||0;particle.rise=options.rise||0;particle.expand=options.expand||0;
      this._push(particle);
    }
    return this;
  };

  ParticleSystem.prototype.coinBurst = function (x, y, count) {
    count = count == null ? 10 : count;
    this.burst(x, y, "#ffd84b", count, 105, 3.5, 0.75, {
      kind: "coin",
      gravity: 175,
      drag: 2.1,
      glow: 5,
      color2: "#fff3a1"
    });
    this.burst(x, y, "#fff5b5", Math.ceil(count * 0.45), 55, 1.5, 0.4, {
      kind: "spark",
      drag: 2.7,
      glow: 8
    });
    return this;
  };

  ParticleSystem.prototype.hit = function (x, y, color, strong, angle) {
    var power = strong ? 1.65 : 1;
    this.burst(x, y, asColor(color, "#fff1c7"), strong ? 18 : 10, 125 * power, strong ? 4 : 3, strong ? 0.58 : 0.38, {
      kind: "spark",
      angle: angle == null ? 0 : angle,
      spread: angle == null ? TAU : Math.PI * 0.8,
      drag: 5,
      glow: strong ? 9 : 4
    });
    var ring=this._acquire();ring.kind="ring";ring.x=x;ring.y=y;ring.vx=0;ring.vy=0;ring.gravity=0;ring.drag=0;
    ring.color=strong?"#ffffff":asColor(color,"#fff1c7");ring.color2="#ffffff";ring.size=strong?8:5;ring.startSize=ring.size;
    ring.life=.22;ring.maxLife=.22;ring.rotation=0;ring.spin=0;ring.alpha=.8;ring.shrink=false;ring.expand=strong?72:45;ring.glow=strong?10:0;ring.rise=0;this._push(ring);
    return this;
  };

  ParticleSystem.prototype.heal = function (x, y, amount) {
    this.burst(x, y + 8, "#71f79f", 14, 42, 3, 0.8, {
      kind: "cross",
      gravity: -22,
      drag: 3,
      rise: 16,
      glow: 6,
      color2: "#d6ffe4"
    });
    if (amount != null) this.text(x, y - 20, "+" + Math.round(amount), "#78f5a4", 16, 0.9);
    return this;
  };

  ParticleSystem.prototype.text = function (x, y, value, color, size, life, options) {
    options = options || {};
    if (this.floatingTexts.length > 80) { var oldTexts=this.floatingTexts.splice(0,8);for(var o=0;o<oldTexts.length;o+=1)this._releaseText(oldTexts[o]); }
    var entry=this._acquireText();entry.x=x;entry.y=y;entry.vx=options.vx||random(-7,7);entry.vy=options.vy==null?-27:options.vy;
    entry.value=String(value);entry.color=asColor(color,"#ffffff");entry.outline=options.outline||"#171322";entry.size=size==null?13:size;
    entry.life=life==null?.75:life;entry.maxLife=entry.life;entry.gravity=options.gravity==null?12:options.gravity;entry.critical=!!options.critical;this.floatingTexts.push(entry);
    return this;
  };

  ParticleSystem.prototype.smoke = function (x, y, color, count) {
    return this.burst(x, y, asColor(color, "#82788c"), count || 6, 28, 6, 0.8, {
      kind: "smoke", gravity: -15, drag: 2.4, alpha: 0.6, rise: 8
    });
  };

  ParticleSystem.prototype.update = function (dt) {
    dt = Math.min(0.05, Math.max(0, Number(dt) || 0));
    this.time += dt;
    var write = 0;
    for (var i = 0; i < this.particles.length; i += 1) {
      var p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this._release(p); continue; }
      var damp = Math.max(0, 1 - p.drag * dt);
      p.vx *= damp;
      p.vy = p.vy * damp + (p.gravity || 0) * dt - (p.rise || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += (p.spin || 0) * dt;
      if (p.expand) p.size += p.expand * dt;
      this.particles[write] = p;
      write += 1;
    }
    this.particles.length = write;

    write = 0;
    for (var j = 0; j < this.floatingTexts.length; j += 1) {
      var t = this.floatingTexts[j];
      t.life -= dt;
      if (t.life <= 0) { this._releaseText(t); continue; }
      t.vy += t.gravity * dt;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      this.floatingTexts[write] = t;
      write += 1;
    }
    this.floatingTexts.length = write;
  };

  ParticleSystem.prototype.draw = function (ctx) {
    if (!ctx) return;
    ctx.save();
    for (var i = 0; i < this.particles.length; i += 1) {
      var p = this.particles[i];
      var ratio = clamp(p.life / (p.maxLife || p.life), 0, 1);
      var size = p.size * (p.shrink ? (0.25 + ratio * 0.75) : 1);
      ctx.globalAlpha = p.alpha * Math.min(1, ratio * 2.8);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      ctx.shadowBlur = p.glow || 0;
      ctx.shadowColor = p.color;
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y));
      ctx.rotate(p.rotation);
      if (p.kind === "ring") {
        ctx.lineWidth = Math.max(1, 2.5 * ratio);
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, TAU);
        ctx.stroke();
      } else if (p.kind === "spark") {
        ctx.fillRect(-size * 1.7, -Math.max(0.7, size * 0.22), size * 3.4, Math.max(1.2, size * 0.44));
      } else if (p.kind === "coin") {
        ctx.fillStyle = p.color2;
        ctx.fillRect(-Math.max(1, Math.abs(Math.cos(p.rotation)) * size), -size, Math.max(2, Math.abs(Math.cos(p.rotation)) * size * 2), size * 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(-1, -size + 1, 2, size * 2 - 2);
      } else if (p.kind === "cross") {
        ctx.fillRect(-size * 0.28, -size, size * 0.56, size * 2);
        ctx.fillRect(-size, -size * 0.28, size * 2, size * 0.56);
      } else if (p.kind === "smoke") {
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
      }
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (var j = 0; j < this.floatingTexts.length; j += 1) {
      var t = this.floatingTexts[j];
      var alpha = clamp(t.life / t.maxLife * 1.8, 0, 1);
      var scale = t.critical ? 1 + Math.sin((1 - t.life / t.maxLife) * Math.PI) * 0.22 : 1;
      ctx.globalAlpha = alpha;
      ctx.font = "bold " + Math.round(t.size * scale) + "px monospace";
      ctx.lineWidth = 3;
      ctx.strokeStyle = t.outline;
      ctx.strokeText(t.value, Math.round(t.x), Math.round(t.y));
      ctx.fillStyle = t.color;
      ctx.fillText(t.value, Math.round(t.x), Math.round(t.y));
    }
    ctx.restore();
  };

  function ScreenEffects(game) {
    this.game = game || null;
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeAmount = 0;
    this.flashTime = 0;
    this.flashDuration = 0;
    this.flashColor = "#ffffff";
    this.flashAlpha = 0;
    this.distortion = 0;
    this.time = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  ScreenEffects.prototype.shake = function (amount, duration) {
    if (this.game && this.game.settings && this.game.settings.screenShake === false) return;
    this.shakeAmount = Math.max(this.shakeAmount, Number(amount) || 0);
    this.shakeTime = Math.max(this.shakeTime, Number(duration) || 0.15);
    this.shakeDuration = Math.max(this.shakeDuration, this.shakeTime);
  };

  ScreenEffects.prototype.flash = function (color, alpha, duration) {
    this.flashColor = asColor(color, "#ffffff");
    this.flashAlpha = clamp(alpha == null ? 0.25 : alpha, 0, 1);
    this.flashTime = Math.max(0.01, duration || 0.15);
    this.flashDuration = this.flashTime;
  };

  ScreenEffects.prototype.warp = function (strength, duration) {
    this.distortion = Math.max(this.distortion, strength || 1);
    this.distortionTime = Math.max(this.distortionTime || 0, duration || 0.8);
  };

  ScreenEffects.prototype.update = function (dt) {
    dt = Math.min(0.05, Math.max(0, Number(dt) || 0));
    this.time += dt;
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      var fade = clamp(this.shakeTime / Math.max(0.01, this.shakeDuration), 0, 1);
      this.offsetX = random(-this.shakeAmount, this.shakeAmount) * fade;
      this.offsetY = random(-this.shakeAmount, this.shakeAmount) * fade;
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
      this.shakeAmount = 0;
      this.shakeDuration = 0;
    }
    if (this.flashTime > 0) this.flashTime -= dt;
    if (this.distortionTime > 0) {
      this.distortionTime -= dt;
      this.distortion *= Math.max(0, 1 - dt * 1.8);
    } else {
      this.distortion = 0;
    }
  };

  ScreenEffects.prototype.begin = function (ctx) {
    if (!ctx) return;
    ctx.save();
    var wobble = this.distortion ? Math.sin(this.time * 23) * this.distortion : 0;
    ctx.translate(Math.round(this.offsetX + wobble), Math.round(this.offsetY));
  };

  ScreenEffects.prototype.end = function (ctx) {
    if (ctx) ctx.restore();
  };

  ScreenEffects.prototype.drawOverlay = function (ctx, width, height) {
    if (!ctx || this.flashTime <= 0) return;
    var ratio = clamp(this.flashTime / Math.max(0.01, this.flashDuration), 0, 1);
    ctx.save();
    ctx.globalAlpha = this.flashAlpha * ratio;
    ctx.fillStyle = this.flashColor;
    ctx.fillRect(0, 0, width || ctx.canvas.width, height || ctx.canvas.height);
    ctx.restore();
  };

  E.ParticleSystem = ParticleSystem;
  E.ScreenEffects = ScreenEffects;
}());
