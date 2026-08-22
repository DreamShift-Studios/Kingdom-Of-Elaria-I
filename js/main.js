(function () {
  'use strict';

  const E = window.Elaria = window.Elaria || {};

  function byId(id) { return document.getElementById(id); }
  function show(id) { const el = byId(id); if (el) el.classList.remove('hidden'); }
  function hide(id) { const el = byId(id); if (el) el.classList.add('hidden'); }

  function boot() {
    if (window.elariaGame) return;
    const game = window.elariaGame = new E.Game();
    let settingsReturn = 'main-menu';
    let confirmAction = null;

    const showMenuScreen = (id) => {
      document.querySelectorAll('.screen').forEach((node) => node.classList.add('hidden'));
      show(id);
    };

    const confirm = (title, text, action) => {
      byId('confirm-title').textContent = title;
      byId('confirm-text').textContent = text;
      confirmAction = action;
      show('confirm-panel');
    };

    let creditsReturn = 'main-menu';
    let creditsTimer = 0;

    const finishCredits = () => {
      window.clearTimeout(creditsTimer);
      creditsTimer = 0;
      const roll = byId('credits-roll');
      if (roll) { roll.classList.add('hidden'); roll.classList.remove('fast'); }
      if (creditsReturn === 'victory' && game.state === 'victory') showMenuScreen('victory-panel');
      else showMenuScreen('main-menu');
    };

    const startCredits = (returnTo) => {
      creditsReturn = returnTo || (game.state === 'victory' ? 'victory' : 'main-menu');
      document.querySelectorAll('.screen').forEach((node) => node.classList.add('hidden'));
      const roll = byId('credits-roll');
      const scroll = byId('credits-scroll');
      if (!roll || !scroll) return;
      roll.classList.remove('hidden', 'fast');
      scroll.style.animation = 'none';
      void scroll.offsetHeight;
      scroll.style.animation = '';
      game.audio && game.audio.play('victory');
      window.clearTimeout(creditsTimer);
      creditsTimer = window.setTimeout(finishCredits, 59000);
    };

    const renderSettings = () => {
      byId('music-volume').value = Math.round(game.settings.musicVolume * 100);
      byId('sfx-volume').value = Math.round(game.settings.sfxVolume * 100);
      byId('music-output').textContent = `${Math.round(game.settings.musicVolume * 100)}%`;
      byId('sfx-output').textContent = `${Math.round(game.settings.sfxVolume * 100)}%`;
      byId('screen-shake').checked = game.settings.screenShake;
      byId('difficulty-select').value = game.settings.difficulty;
      if (byId('ui-scale')) { byId('ui-scale').value = Math.round((game.settings.uiScale || 1) * 100); byId('ui-scale-output').textContent = `${byId('ui-scale').value}%`; }
      if (byId('particle-density')) byId('particle-density').value = Math.round((game.settings.particleDensity || 1) * 100);
      if (byId('colorblind-mode')) byId('colorblind-mode').value = game.settings.colorblind || 'none';
      if (byId('high-contrast')) byId('high-contrast').checked = !!game.settings.highContrast;
      if (byId('reduced-flashes')) byId('reduced-flashes').checked = !!game.settings.reducedFlashes;
      game.ui && game.ui.renderSettings && game.ui.renderSettings();
    };

    byId('new-game-btn').addEventListener('click', () => {
      game.audio && game.audio.unlock();
      showMenuScreen('name-panel');
      const input = byId('player-name-input');
      window.setTimeout(() => { input.focus(); input.select(); }, 30);
    });

    byId('continue-btn').addEventListener('click', () => {
      game.audio && game.audio.unlock();
      game.continueGame();
    });

    byId('begin-btn').addEventListener('click', () => {
      const input = byId('player-name-input');
      const name = input.value.trim().replace(/[<>]/g, '').slice(0, 18);
      if (!name) {
        input.focus();
        input.setAttribute('aria-invalid', 'true');
        return;
      }
      input.removeAttribute('aria-invalid');
      game.newGame(name, byId('new-difficulty').value);
    });
    byId('player-name-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.stopPropagation(); byId('begin-btn').click(); }
    });

    byId('main-settings-btn').addEventListener('click', () => {
      settingsReturn = 'main-menu';
      renderSettings();
      showMenuScreen('settings-panel');
    });
    byId('credits-btn').addEventListener('click', () => showMenuScreen('credits-panel'));
    byId('roll-credits-btn').addEventListener('click', () => startCredits('main-menu'));
    byId('skip-credits-btn').addEventListener('click', finishCredits);

    document.querySelectorAll('[data-close]').forEach((button) => {
      button.addEventListener('click', () => showMenuScreen('main-menu'));
    });

    byId('resume-btn').addEventListener('click', () => game.resume());
    byId('pause-save-btn').addEventListener('click', () => {
      game.saveNow('manual');
      game.ui && game.ui.toast('Game saved.', 'success');
    });
    byId('pause-main-btn').addEventListener('click', () => {
      confirm('Return to the title?', 'Your progress will be saved before leaving.', () => game.returnToTitle());
    });

    document.querySelectorAll('[data-open-panel]').forEach((button) => {
      button.addEventListener('click', () => {
        const panel = button.dataset.openPanel;
        hide('pause-panel');
        if (panel === 'inventory' && game.ui) game.ui.openInventory(true);
        else if (panel === 'quests' && game.ui) game.ui.openQuests(true);
        else if (panel === 'stats' && game.ui) game.ui.openStats(true);
        else if (panel === 'settings') {
          settingsReturn = 'pause-panel';
          renderSettings();
          show('settings-panel');
          game.state = 'panel';
        }
      });
    });

    document.querySelectorAll('.panel-close').forEach((button) => {
      button.addEventListener('click', () => {
        const panel = button.closest('.screen');
        panel && panel.classList.add('hidden');
        if (panel && panel.id === 'settings-panel' && game.state === 'menu') {
          showMenuScreen(settingsReturn);
          return;
        }
        if (game.ui && game.ui.closePanels) game.ui.closePanels();
        if (game.player) {
          const backToPause = settingsReturn === 'pause-panel' || !!(game.ui && game.ui.returnToPause);
          game.state = backToPause ? 'paused' : 'playing';
          if (game.ui) game.ui.returnToPause = false;
          if (backToPause) show('pause-panel');
          settingsReturn = 'main-menu';
        } else showMenuScreen('main-menu');
      });
    });

    const volumeChange = () => {
      game.settings.musicVolume = +byId('music-volume').value / 100;
      game.settings.sfxVolume = +byId('sfx-volume').value / 100;
      byId('music-output').textContent = `${byId('music-volume').value}%`;
      byId('sfx-output').textContent = `${byId('sfx-volume').value}%`;
      game.storeSettings();
    };
    byId('music-volume').addEventListener('input', volumeChange);
    byId('sfx-volume').addEventListener('input', volumeChange);
    byId('screen-shake').addEventListener('change', () => {
      game.settings.screenShake = byId('screen-shake').checked;
      game.storeSettings();
    });
    byId('difficulty-select').addEventListener('change', () => {
      game.settings.difficulty = byId('difficulty-select').value;
      game.storeSettings();
      if (game.player) game.ui && game.ui.toast('Difficulty applies fully when the area reloads.', 'rare');
    });
    byId('fullscreen-btn').addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) await byId('game-shell').requestFullscreen();
        else await document.exitFullscreen();
      } catch (_) { game.ui && game.ui.toast('Fullscreen is unavailable in this browser.', 'danger'); }
    });
    byId('reset-save-btn').addEventListener('click', () => {
      confirm('Erase your journey?', 'All saved progress will be permanently removed.', () => {
        game.save && game.save.clear();
        game.refreshContinueButton();
        if (game.player) game.returnToTitle();
        else showMenuScreen('main-menu');
      });
    });

    byId('confirm-no').addEventListener('click', () => { hide('confirm-panel'); confirmAction = null; });
    byId('confirm-yes').addEventListener('click', () => {
      const action = confirmAction;
      hide('confirm-panel');
      confirmAction = null;
      action && action();
    });

    byId('retry-btn').addEventListener('click', () => game.restartCheckpoint());
    byId('gameover-main-btn').addEventListener('click', () => game.returnToTitle());
    byId('free-explore-btn').addEventListener('click', () => game.freeExplore());
    byId('new-game-plus-btn').addEventListener('click', () => game.startNewGamePlus());
    byId('watch-credits-btn').addEventListener('click', () => startCredits('victory'));
    byId('victory-main-btn').addEventListener('click', () => game.returnToTitle());

    const unlockAudio = () => game.audio && game.audio.unlock();
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game.player) game.saveNow('background');
    });
    window.addEventListener('beforeunload', () => { if (game.player) game.saveNow('unload'); });

    renderSettings();
    game.start();
  }

  boot();
})();
