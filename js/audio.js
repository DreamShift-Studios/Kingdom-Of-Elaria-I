/* Lightweight procedural music and sound effects using Web Audio only. */
(function (global) {
  'use strict';

  const E = global.Elaria = global.Elaria || {};
  const AudioContextClass = global.AudioContext || global.webkitAudioContext || null;

  const WORLD_MOTIFS = Object.freeze({
    elaria: Object.freeze({ tempo: 76, wave: 'triangle', notes: Object.freeze([57, 60, 64, 60, 55, 59, 62, null, 57, 60, 65, 64, 60, 59, 55, null]), bass: Object.freeze([45, null, 43, null, 41, null, 43, null]), volume: 0.095 }),
    forest: Object.freeze({ tempo: 108, wave: 'triangle', notes: Object.freeze([64, 67, 69, 71, 69, 67, 64, 62, 64, 67, 72, 71, 69, 67, 64, null]), bass: Object.freeze([48, null, 50, null, 52, null, 50, null]), volume: 0.085 }),
    dark_forest: Object.freeze({ tempo: 82, wave: 'sine', notes: Object.freeze([55, null, 58, 57, null, 53, 55, null, 51, 55, 58, null, 57, 53, 50, null]), bass: Object.freeze([43, null, 41, null, 39, null, 38, null]), volume: 0.085 }),
    caves: Object.freeze({ tempo: 90, wave: 'sine', notes: Object.freeze([60, 67, 63, 70, 65, 72, 67, null, 58, 65, 62, 69, 63, 70, 65, null]), bass: Object.freeze([36, null, 39, null, 41, null, 43, null]), volume: 0.075 }),
    final: Object.freeze({ tempo: 124, wave: 'sawtooth', notes: Object.freeze([48, 55, 51, 58, 53, 60, 55, 62, 48, 55, 59, 58, 53, 51, 50, null]), bass: Object.freeze([36, null, 34, null, 32, null, 31, null]), volume: 0.065 }),
    boss: Object.freeze({ tempo: 142, wave: 'square', notes: Object.freeze([48, 48, 55, 51, 48, 58, 55, 51, 46, 46, 53, 49, 46, 56, 53, null]), bass: Object.freeze([36, 36, 34, 34, 32, 32, 31, 31]), volume: 0.065 }),
    boss_forest: Object.freeze({ tempo: 136, wave: 'square', notes: Object.freeze([52,55,59,55,50,57,60,57,48,55,59,55,47,54,57,null]), bass: Object.freeze([40,40,38,38,36,36,35,35]), volume:.067 }),
    boss_dark_forest: Object.freeze({ tempo: 150, wave: 'sawtooth', notes: Object.freeze([43,50,46,53,45,52,48,55,41,48,45,52,39,46,43,null]), bass: Object.freeze([31,31,29,29,28,28,26,26]), volume:.062 }),
    boss_caves: Object.freeze({ tempo: 128, wave: 'triangle', notes: Object.freeze([48,55,60,55,51,58,63,58,46,53,58,53,44,51,56,null]), bass: Object.freeze([36,36,34,34,32,32,31,31]), volume:.073 }),
    final_boss: Object.freeze({ tempo: 164, wave: 'sawtooth', notes: Object.freeze([48, 55, 60, 51, 58, 63, 50, 57, 62, 46, 53, 58, 44, 51, 56, 43]), bass: Object.freeze([36, 34, 32, 31, 29, 31, 32, 34]), volume: 0.07 })
  });

  const SFX = Object.freeze({
    sword: Object.freeze([[0, 310, 0.055, 'sawtooth', 0.16, -900], [0.025, 180, 0.07, 'triangle', 0.11, -500]]),
    chargedattack: Object.freeze([[0, 170, 0.17, 'sawtooth', 0.16, 900], [0.11, 90, 0.14, 'square', 0.12, -300]]),
    playerdamage: Object.freeze([[0, 125, 0.12, 'square', 0.14, -350]]),
    enemydamage: Object.freeze([[0, 185, 0.075, 'square', 0.09, -250]]),
    enemydeath: Object.freeze([[0, 150, 0.18, 'sawtooth', 0.12, -850], [0.08, 82, 0.16, 'triangle', 0.09, -300]]),
    golddrop: Object.freeze([[0, 620, 0.055, 'sine', 0.07, 180], [0.045, 790, 0.06, 'sine', 0.06, 100]]),
    goldcollect: Object.freeze([[0, 740, 0.055, 'sine', 0.1, 100], [0.055, 980, 0.075, 'sine', 0.09, 180]]),
    chest: Object.freeze([[0, 230, 0.08, 'triangle', 0.11, 600], [0.08, 420, 0.09, 'triangle', 0.1, 450], [0.17, 680, 0.13, 'sine', 0.1, 200]]),
    dialogue: Object.freeze([[0, 430, 0.035, 'square', 0.035, 50]]),
    button: Object.freeze([[0, 330, 0.04, 'square', 0.055, 100]]),
    footstep: Object.freeze([[0, 82, 0.035, 'triangle', 0.035, -80]]),
    potion: Object.freeze([[0, 390, 0.08, 'sine', 0.09, 350], [0.065, 540, 0.15, 'sine', 0.08, 500]]),
    bossattack: Object.freeze([[0, 72, 0.24, 'sawtooth', 0.16, 500], [0.08, 48, 0.27, 'square', 0.1, -200]]),
    victory: Object.freeze([[0, 523, 0.15, 'triangle', 0.09, 20], [0.14, 659, 0.15, 'triangle', 0.09, 20], [0.28, 784, 0.28, 'triangle', 0.11, 40]]),
    gameover: Object.freeze([[0, 247, 0.24, 'triangle', 0.09, -150], [0.23, 196, 0.25, 'triangle', 0.09, -150], [0.46, 147, 0.42, 'sine', 0.1, -100]]),
    equip: Object.freeze([[0, 370, 0.055, 'triangle', 0.07, 120], [0.045, 554, 0.08, 'triangle', 0.065, 80]]),
    buy: Object.freeze([[0, 660, 0.05, 'sine', 0.075, 80], [0.05, 880, 0.07, 'sine', 0.075, 120]]),
    sell: Object.freeze([[0, 770, 0.05, 'sine', 0.07, -80], [0.05, 570, 0.07, 'sine', 0.065, -80]]),
    shop: Object.freeze([[0, 392, 0.08, 'triangle', 0.055, 40], [0.08, 494, 0.1, 'triangle', 0.055, 50]]),
    error: Object.freeze([[0, 105, 0.07, 'square', 0.075, -100], [0.08, 92, 0.08, 'square', 0.07, -100]]),
    itempickup: Object.freeze([[0, 480, 0.045, 'triangle', 0.055, 100], [0.04, 610, 0.055, 'triangle', 0.055, 100]]),
    door: Object.freeze([[0, 118, 0.09, 'square', 0.055, -180], [0.075, 92, 0.13, 'triangle', 0.05, -120]]),
    save: Object.freeze([[0, 440, 0.08, 'sine', 0.06, 40], [0.07, 660, 0.09, 'sine', 0.065, 60], [0.15, 880, 0.14, 'sine', 0.065, 80]]),
    dash: Object.freeze([[0, 145, 0.09, 'sawtooth', 0.065, 900]]),
    teleport: Object.freeze([[0, 260, 0.18, 'sine', 0.07, 1200], [0.07, 620, 0.13, 'triangle', 0.055, -500]]),
    levelup: Object.freeze([[0,392,.11,'triangle',.08,0],[.1,523,.12,'triangle',.08,0],[.21,659,.13,'triangle',.09,0],[.34,784,.28,'sine',.09,120]]),
    perfectdodge: Object.freeze([[0,920,.07,'sine',.09,-400],[.04,1380,.12,'triangle',.08,-700]]),
    craft: Object.freeze([[0,190,.07,'square',.065,220],[.08,285,.08,'triangle',.07,310],[.18,570,.13,'sine',.07,140]]),
    forge: Object.freeze([[0,96,.09,'square',.1,-120],[.11,145,.08,'triangle',.07,260],[.2,420,.1,'sine',.06,120]]),
    achievement: Object.freeze([[0,523,.1,'triangle',.075,0],[.1,659,.1,'triangle',.075,0],[.2,880,.24,'sine',.09,80]]),
    secret: Object.freeze([[0,330,.13,'sine',.065,350],[.12,660,.18,'triangle',.07,450],[.28,990,.22,'sine',.06,-120]]),
    thunder: Object.freeze([[0,48,.34,'sawtooth',.12,-300],[.08,36,.35,'square',.08,-100]]),
    switch: Object.freeze([[0,110,.08,'square',.07,160],[.08,165,.11,'triangle',.06,220]]),
    rockbreak: Object.freeze([[0,72,.2,'sawtooth',.1,-250],[.05,49,.22,'square',.08,-180]]),
    interact: Object.freeze([[0,410,.045,'triangle',.05,70]]),
    slimepop: Object.freeze([[0,210,.09,'sine',.07,-520],[.04,115,.12,'triangle',.055,-260]]),
    beastcry: Object.freeze([[0,165,.15,'sawtooth',.065,420],[.08,245,.18,'triangle',.05,-310]]),
    constructbreak: Object.freeze([[0,78,.18,'square',.08,-240],[.06,132,.12,'triangle',.055,-650]]),
    undeadfall: Object.freeze([[0,196,.14,'sine',.055,-720],[.08,92,.2,'square',.05,-180]])
  });

  const ALIASES = Object.freeze({
    swordattack: 'sword', attack: 'sword', slash: 'sword', charge: 'chargedattack', charged: 'chargedattack',
    playerhit: 'playerdamage', hurt: 'playerdamage', enemyhit: 'enemydamage', hit: 'enemydamage', death: 'enemydeath',
    coin: 'goldcollect', gold: 'goldcollect', coincollect: 'goldcollect', coinpickup: 'goldcollect',
    chestopen: 'chest', talk: 'dialogue', text: 'dialogue', click: 'button', ui: 'button', step: 'footstep',
    drink: 'potion', heal: 'potion', boss: 'bossattack', bossroar: 'bossattack', win: 'victory', lose: 'gameover',
    purchase: 'buy', sold: 'sell', pickup: 'itempickup', item: 'itempickup',
    chargeready: 'chargedattack', swordheavy: 'chargedattack', swordswing: 'sword', playerhurt: 'playerdamage',
    playerdeath: 'gameover', uideny: 'error', swordimpact: 'enemydamage', swordimpactheavy: 'bossattack',
    projectilehit: 'enemydamage', projectileblock: 'equip', explosion: 'bossattack', enemyslash: 'sword',
    enemyheavy: 'bossattack', enemycharge: 'chargedattack', slimejump: 'footstep', enemyshoot: 'sword',
    enemycast: 'chargedattack', webshot: 'sword', thornshot: 'sword', bombthrow: 'bossattack', crystalshot: 'chargedattack',
    shieldblock: 'equip', enemyhurt: 'enemydamage', elitedeath: 'enemydeath',
    perfect: 'perfectdodge', perfectstep: 'perfectdodge', craftitem: 'craft', blacksmith: 'forge',
    hidden: 'secret', discovery: 'secret', rocks: 'rockbreak',
    bosstelegraph: 'chargedattack', bossphase: 'achievement', orbbreak: 'thunder', finalstrikeready: 'achievement',
    velymoordefeat: 'thunder', velymoortheme: 'bossattack', summon: 'teleport', bosscharge: 'chargedattack'
  });

  function clamp(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
  }

  function midiFrequency(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  class AudioManager {
    constructor(game) {
      this.game = game || null;
      const settings = this.game && this.game.settings ? this.game.settings : {};
      this.musicVolume = clamp(settings.musicVolume, 0.48);
      this.sfxVolume = clamp(settings.sfxVolume, 0.72);
      this.context = null;
      this.masterGain = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.available = Boolean(AudioContextClass);
      this.unlocked = false;
      this.worldId = 'elaria';
      this.trackId = 'elaria';
      this.motif = WORLD_MOTIFS.elaria;
      this.musicStep = 0;
      this.musicElapsed = 0;
      this.musicEnabled = true;
      this.combatMode = false;
      this.bossIntensity = 0;
      this.musicDuck = 1;
      this.ambience = 'town';
      this.ambientElapsed = 0;
      this._active = new Set();
      this._musicActive = new Set();
      this._gestureHandler = this._onGesture.bind(this);
      this._installGestureUnlock();
    }

    _installGestureUnlock() {
      if (!global.document || !this.available) return;
      global.document.addEventListener('pointerdown', this._gestureHandler, { passive: true });
      global.document.addEventListener('keydown', this._gestureHandler);
    }

    _removeGestureUnlock() {
      if (!global.document) return;
      global.document.removeEventListener('pointerdown', this._gestureHandler);
      global.document.removeEventListener('keydown', this._gestureHandler);
    }

    _onGesture() {
      this.unlock();
      this._removeGestureUnlock();
    }

    unlock() {
      if (!this.available) return false;
      try {
        if (!this.context) {
          this.context = new AudioContextClass();
          this.masterGain = this.context.createGain();
          this.musicGain = this.context.createGain();
          this.sfxGain = this.context.createGain();
          this.masterGain.gain.value = 0.9;
          this.musicGain.gain.value = this.musicVolume * this.musicDuck;
          this.sfxGain.gain.value = this.sfxVolume;
          this.musicGain.connect(this.masterGain);
          this.sfxGain.connect(this.masterGain);
          this.masterGain.connect(this.context.destination);
        }
        if (this.context.state === 'suspended' && typeof this.context.resume === 'function') {
          const resumed = this.context.resume();
          if (resumed && typeof resumed.catch === 'function') resumed.catch(function () {});
        }
        this.unlocked = true;
        this.musicEnabled = true;
        this._removeGestureUnlock();
        return true;
      } catch (error) {
        this.available = false;
        this.unlocked = false;
        return false;
      }
    }

    setVolumes(music, sfx) {
      this.musicVolume = clamp(music, this.musicVolume);
      this.sfxVolume = clamp(sfx, this.sfxVolume);
      if (this.game && this.game.settings) {
        this.game.settings.musicVolume = this.musicVolume;
        this.game.settings.sfxVolume = this.sfxVolume;
      }
      if (this.context) {
        const now = this.context.currentTime;
        if (this.musicGain) this.musicGain.gain.setTargetAtTime(this.musicVolume * this.musicDuck, now, 0.025);
        if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(this.sfxVolume, now, 0.015);
      }
      return { music: this.musicVolume, sfx: this.sfxVolume };
    }

    _normalizeWorld(worldId) {
      if (typeof worldId === 'number') return ['elaria', 'forest', 'dark_forest', 'caves', 'final'][worldId] || 'elaria';
      const value = String(worldId === undefined ? 'elaria' : worldId).toLowerCase().replace(/[\s-]+/g, '_');
      const aliases = {
        '0': 'elaria', world0: 'elaria', kingdom: 'elaria',
        '1': 'forest', world1: 'forest', greenhaven: 'forest', greenhaven_forest: 'forest',
        '2': 'dark_forest', world2: 'dark_forest', darkforest: 'dark_forest',
        '3': 'caves', world3: 'caves', chaos_caves: 'caves',
        '4': 'final', world4: 'final', broken_realm: 'final', velymoor_realm: 'final', eclipse_chamber: 'final', eclipsechamber: 'final'
      };
      return aliases[value] || (WORLD_MOTIFS[value] ? value : 'elaria');
    }

    setWorld(worldId, boss, finalBoss) {
      this._musicActive.forEach(function (source) {
        try { source.stop(); } catch (error) {}
      });
      this._musicActive.clear();
      this.worldId = this._normalizeWorld(worldId);
      const regionalBoss = 'boss_' + this.worldId;
      this.trackId = finalBoss ? 'final_boss' : (boss ? (WORLD_MOTIFS[regionalBoss] ? regionalBoss : 'boss') : this.worldId);
      this.motif = WORLD_MOTIFS[this.trackId] || WORLD_MOTIFS.elaria;
      this.musicStep = 0;
      this.musicElapsed = 0;
      this.musicEnabled = true;
      this.combatMode = false;
      this.bossIntensity = finalBoss ? 0.14 : 0;
      this.ambience = this.worldId === 'elaria' ? 'town' : (this.worldId === 'dark_forest' ? 'night' : 'wild');
      this.ambientElapsed = 0;
      return this.trackId;
    }

    setCombat(active) {
      if (this.trackId.indexOf('boss') >= 0) return;
      this.combatMode = Boolean(active);
    }

    fadeMusic(level, seconds) {
      this.musicDuck = clamp(level, 1);
      if (this.context && this.musicGain) {
        const now = this.context.currentTime;
        this.musicGain.gain.setTargetAtTime(this.musicVolume * this.musicDuck, now, Math.max(0.02, (Number(seconds) || 0.25) / 3));
      }
      return this.musicDuck;
    }

    setBossIntensity(phase) {
      const value = Number(phase);
      this.bossIntensity = Number.isFinite(value) ? Math.max(0, Math.min(1, (value - 1) / 3)) : 0;
      return this.bossIntensity;
    }

    setAmbience(kind) {
      const allowed = ['town','night','rain','snow','wild'];
      const next = allowed.includes(kind) ? kind : 'wild';
      if (next !== this.ambience) { this.ambience = next; this.ambientElapsed = 0; }
    }

    _tone(frequency, duration, wave, volume, destination, delay, slide) {
      if (!this.context || !this.unlocked || this.context.state !== 'running' || !frequency || volume <= 0) return null;
      try {
        const now = this.context.currentTime + Math.max(0, Number(delay) || 0);
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = wave || 'sine';
        oscillator.frequency.setValueAtTime(Math.max(20, frequency), now);
        if (slide) oscillator.detune.linearRampToValueAtTime(Number(slide), now + duration);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + Math.min(0.012, duration * 0.15));
        gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.025, duration));
        oscillator.connect(gain);
        gain.connect(destination || this.sfxGain);
        oscillator.start(now);
        oscillator.stop(now + Math.max(0.03, duration) + 0.02);
        const activeSet = destination === this.musicGain ? this._musicActive : this._active;
        activeSet.add(oscillator);
        oscillator.onended = () => {
          activeSet.delete(oscillator);
          try { oscillator.disconnect(); gain.disconnect(); } catch (error) {}
        };
        return oscillator;
      } catch (error) {
        return null;
      }
    }

    _noise(duration, volume, delay) {
      if (!this.context || !this.unlocked || this.context.state !== 'running' || volume <= 0) return null;
      try {
        const length = Math.max(1, Math.floor(this.context.sampleRate * Math.min(duration, 0.35)));
        const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) channel[i] = (Math.random() * 2 - 1) * (1 - i / length);
        const source = this.context.createBufferSource();
        const filter = this.context.createBiquadFilter();
        const gain = this.context.createGain();
        filter.type = 'bandpass';
        filter.frequency.value = 380;
        filter.Q.value = 0.7;
        gain.gain.value = volume;
        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        const start = this.context.currentTime + Math.max(0, Number(delay) || 0);
        source.start(start);
        this._active.add(source);
        source.onended = () => {
          this._active.delete(source);
          try { source.disconnect(); filter.disconnect(); gain.disconnect(); } catch (error) {}
        };
        return source;
      } catch (error) {
        return null;
      }
    }

    play(name) {
      if (!this.context || !this.unlocked || this.context.state !== 'running' || this.sfxVolume <= 0) return false;
      let key = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      key = ALIASES[key] || key;
      const pattern = SFX[key];
      if (!pattern) return false;
      pattern.forEach((part) => {
        this._tone(part[1], part[2], part[3], part[4], this.sfxGain, part[0], part[5]);
      });
      if (key === 'sword' || key === 'chargedattack' || key === 'playerdamage' || key === 'enemydamage' || key === 'bossattack' || key === 'footstep') {
        this._noise(key === 'bossattack' ? 0.2 : 0.065, key === 'footstep' ? 0.018 : 0.045, 0);
      }
      return true;
    }

    update(dt) {
      if (!this.musicEnabled || !this.context || !this.unlocked || this.context.state !== 'running' || this.musicVolume <= 0) return;
      let seconds = Number(dt);
      if (!Number.isFinite(seconds) || seconds <= 0) return;
      if (seconds > 10) seconds /= 1000;
      seconds = Math.min(seconds, 0.25);
      this.ambientElapsed += seconds;
      const ambientInterval = this.ambience === 'rain' ? .52 : (this.ambience === 'town' ? 5.8 : (this.ambience === 'night' ? 4.6 : 7.5));
      if (!this.combatMode && this.ambientElapsed >= ambientInterval) {
        this.ambientElapsed %= ambientInterval;
        if (this.ambience === 'rain') this._noise(.28, .006, 0);
        else if (this.ambience === 'town') this._tone(midiFrequency(76 + (this.musicStep % 3) * 2), .34, 'sine', .012, this.musicGain, 0, -60);
        else if (this.ambience === 'night') this._tone(midiFrequency(43 + (this.musicStep % 2) * 5), .7, 'sine', .01, this.musicGain, 0, -90);
        else if (this.ambience === 'snow') this._tone(midiFrequency(88), .24, 'triangle', .008, this.musicGain, 0, -180);
      }
      const beat = 60 / (this.motif.tempo * (this.combatMode ? 1.22 : 1) * (1 + this.bossIntensity * .13)) / 2;
      this.musicElapsed += seconds;
      while (this.musicElapsed >= beat) {
        this.musicElapsed -= beat;
        const step = this.musicStep;
        const note = this.motif.notes[step % this.motif.notes.length];
        if (note !== null && note !== undefined) {
          this._tone(midiFrequency(note), beat * 0.82, this.motif.wave, this.motif.volume, this.musicGain, 0, 0);
        }
        if (step % 2 === 0) {
          const bassIndex = Math.floor(step / 2) % this.motif.bass.length;
          const bass = this.motif.bass[bassIndex];
          if (bass !== null && bass !== undefined) this._tone(midiFrequency(bass), beat * 1.65, 'sine', this.motif.volume * 0.75, this.musicGain, 0, 0);
        }
        if (this.combatMode && step % 4 === 3 && note !== null && note !== undefined) {
          this._tone(midiFrequency(note + 12), beat * .42, 'square', this.motif.volume * .32, this.musicGain, 0, -50);
        }
        if (this.bossIntensity > .45 && step % 4 === 1 && note !== null && note !== undefined) {
          this._tone(midiFrequency(note + 7), beat * .5, 'square', this.motif.volume * (.13 + this.bossIntensity * .13), this.musicGain, 0, -80);
        }
        this.musicStep = (this.musicStep + 1) % (this.motif.notes.length * 8);
      }
    }

    stop() {
      this.musicEnabled = false;
      this.musicElapsed = 0;
      this.musicStep = 0;
      this._musicActive.forEach(function (source) {
        try { source.stop(); } catch (error) {}
      });
      this._musicActive.clear();
      if (this.musicGain && this.context) {
        try {
          this.musicGain.gain.cancelScheduledValues(this.context.currentTime);
          this.musicGain.gain.setValueAtTime(this.musicVolume, this.context.currentTime);
        } catch (error) {}
      }
    }
  }

  E.AudioManager = AudioManager;
})(window);
