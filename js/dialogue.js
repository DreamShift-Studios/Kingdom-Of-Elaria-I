(function () {
  'use strict';

  const E = window.Elaria = window.Elaria || {};

  class DialogueManager {
    constructor(game) {
      this.game = game;
      this.box = document.getElementById('dialogue-box');
      this.nameEl = document.getElementById('dialogue-name');
      this.portraitEl = document.getElementById('dialogue-portrait');
      this.textEl = document.getElementById('dialogue-text');
      this.choicesEl = document.getElementById('dialogue-choices');
      this.nextEl = document.getElementById('dialogue-next');
      this.open = false;
      this.lines = [];
      this.index = 0;
      this.visibleChars = 0;
      this.charClock = 0;
      this.typing = false;
      this.currentText = '';
      this.onComplete = null;
      this.choiceActive = false;
      if (this.box && !this.box.dataset.bound) {
        this.box.dataset.bound = '1';
        this.box.addEventListener('click', (event) => {
          if (event.target.closest('button')) return;
          this.advance();
        });
      }
    }

    isOpen() { return this.open; }

    substitute(text) {
      return String(text == null ? '' : text)
        .replace(/\{player\}/gi, this.game.playerName || (this.game.player && this.game.player.name) || 'Hero')
        .replace(/\{gold\}/gi, String((this.game.player && this.game.player.gold) || 0));
    }

    start(data) {
      if (!data) return;
      this.open = true;
      this.lines = Array.isArray(data.lines) ? data.lines.slice() : [data.text || '…'];
      this.index = 0;
      this.onComplete = typeof data.onComplete === 'function' ? data.onComplete : null;
      this.speaker = data.name || 'Unknown';
      this.portrait = data.portrait || String(this.speaker).toLowerCase();
      if (this.nameEl) this.nameEl.textContent = this.speaker;
      if (this.box) this.box.classList.remove('hidden');
      this.drawPortrait(this.portrait);
      this.showLine();
      this.game.audio && this.game.audio.play('dialogue');
    }

    lineObject() {
      const raw = this.lines[this.index];
      return typeof raw === 'string' ? { text: raw } : (raw || { text: '…' });
    }

    showLine() {
      const line = this.lineObject();
      if (line.name && this.nameEl) this.nameEl.textContent = this.substitute(line.name);
      if (line.portrait) this.drawPortrait(line.portrait);
      this.currentText = this.substitute(line.text);
      this.visibleChars = 0;
      this.charClock = 0;
      this.typing = true;
      this.choiceActive = false;
      if (this.textEl) this.textEl.textContent = '';
      if (this.choicesEl) this.choicesEl.innerHTML = '';
      if (this.nextEl) this.nextEl.classList.add('hidden');
    }

    update(dt) {
      if (!this.open || !this.typing) return;
      this.charClock += dt;
      const count = Math.max(1, Math.floor(this.charClock / .018));
      if (count > 0) {
        this.charClock -= count * .018;
        const old = this.visibleChars;
        this.visibleChars = Math.min(this.currentText.length, this.visibleChars + count);
        if (this.textEl) this.textEl.textContent = this.currentText.slice(0, this.visibleChars);
        if ((this.visibleChars >> 2) !== (old >> 2) && this.visibleChars < this.currentText.length) this.game.audio && this.game.audio.play('text');
      }
      if (this.visibleChars >= this.currentText.length) this.finishTyping();
    }

    finishTyping() {
      if (!this.open) return;
      this.visibleChars = this.currentText.length;
      this.typing = false;
      if (this.textEl) this.textEl.textContent = this.currentText;
      const line = this.lineObject();
      if (Array.isArray(line.choices) && line.choices.length) this.showChoices(line.choices);
      else if (this.nextEl) this.nextEl.classList.remove('hidden');
    }

    showChoices(choices) {
      this.choiceActive = true;
      if (this.nextEl) this.nextEl.classList.add('hidden');
      if (!this.choicesEl) return;
      this.choicesEl.innerHTML = '';
      choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = `› ${this.substitute(choice.text)}`;
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          this.choose(index);
        });
        this.choicesEl.appendChild(button);
      });
    }

    choose(index) {
      if (!this.open || !this.choiceActive) return;
      const line = this.lineObject();
      const choice = line.choices && line.choices[index];
      if (!choice) return;
      this.game.audio && this.game.audio.play('button');
      if (typeof choice.action === 'function') choice.action(this.game, this);
      if (Number.isFinite(choice.next)) {
        this.index = choice.next;
        this.showLine();
      } else if (choice.close) this.close();
      else {
        this.index += 1;
        if (this.index >= this.lines.length) this.close();
        else this.showLine();
      }
    }

    advance() {
      if (!this.open) return;
      if (this.typing) { this.finishTyping(); return; }
      if (this.choiceActive) return;
      const line = this.lineObject();
      if (typeof line.action === 'function') line.action(this.game, this);
      this.index += 1;
      if (this.index >= this.lines.length) this.close();
      else {
        this.game.audio && this.game.audio.play('dialogue');
        this.showLine();
      }
    }

    close() {
      if (!this.open) return;
      this.open = false;
      this.typing = false;
      this.choiceActive = false;
      if (this.box) this.box.classList.add('hidden');
      if (this.choicesEl) this.choicesEl.innerHTML = '';
      const complete = this.onComplete;
      this.onComplete = null;
      if (complete) complete(this.game);
      this.game.onDialogueClosed && this.game.onDialogueClosed();
    }

    drawPortrait(kind) {
      if (!this.portraitEl) return;
      this.portraitEl.innerHTML = '';
      const canvas = document.createElement('canvas');
      canvas.width = 80; canvas.height = 80;
      canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.imageRendering = 'pixelated';
      const c = canvas.getContext('2d');
      c.imageSmoothingEnabled = false;
      const key = String(kind || '').toLowerCase();
      const palettes = key.includes('wizard') ? ['#3d285b','#a482c3','#e4c5a5','#f1e7cc']
        : key.includes('guard') ? ['#3e4b5b','#a5a8a0','#c28b66','#e2b990']
        : key.includes('smith') ? ['#5b2f27','#c06a3d','#9a5d43','#e0ad7e']
        : key.includes('velymoor') ? ['#160f20','#68326f','#a75588','#e0a2c1']
        : key.includes('survivor') ? ['#385145','#6ca16d','#b67d5d','#dcb28d']
        : ['#2c3d50','#597c8e','#b87859','#e0ae87'];
      c.fillStyle = palettes[0]; c.fillRect(0,0,80,80);
      c.fillStyle = '#0e0b13'; c.fillRect(8,64,64,16); c.fillRect(15,55,50,15);
      c.fillStyle = palettes[1];
      if (key.includes('wizard')) { c.fillRect(12,7,56,14); c.fillRect(21,0,38,10); c.fillRect(17,18,46,17); }
      else if (key.includes('guard')) { c.fillRect(14,8,52,20); c.fillRect(10,20,60,12); c.fillStyle='#d9d4c5'; c.fillRect(22,12,36,7); }
      else { c.fillRect(17,8,46,18); c.fillRect(13,18,54,12); }
      c.fillStyle = palettes[2]; c.fillRect(20,23,40,37); c.fillRect(16,31,5,15); c.fillRect(59,31,5,15);
      c.fillStyle = '#17101b'; c.fillRect(27,35,7,5); c.fillRect(47,35,7,5);
      c.fillStyle = key.includes('velymoor') ? '#ef5b9e' : palettes[3]; c.fillRect(29,35,3,2); c.fillRect(49,35,3,2);
      c.fillStyle = '#6d3d3c'; c.fillRect(36,49,9,3);
      if (key.includes('wizard')) { c.fillStyle='#d5cbd8'; c.fillRect(25,52,30,12); c.fillRect(31,62,18,8); }
      if (key.includes('smith')) { c.fillStyle='#6f3325'; c.fillRect(23,49,34,12); }
      if (key.includes('velymoor')) { c.fillStyle='#28122f'; c.fillRect(12,0,10,62); c.fillRect(58,0,10,62); }
      this.portraitEl.appendChild(canvas);
    }
  }

  E.DialogueManager = DialogueManager;
})();
