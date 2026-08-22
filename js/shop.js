/* Buy/sell interface for Elaria's regional merchants. */
(function (global) {
  'use strict';

  const E = global.Elaria = global.Elaria || {};

  const SHOPS = Object.freeze({
    elaria: Object.freeze({
      name: 'Elaria Provisioner',
      buyMultiplier: 1,
      sellMultiplier: 1,
      items: Object.freeze(['health_potion', 'antidote', 'iron_sword', 'leather_armor', 'iron_cap', 'traveler_boots', 'healer_charm'])
    }),
    forest: Object.freeze({
      name: 'Greenhaven Survivor Camp',
      buyMultiplier: 1.04,
      sellMultiplier: 1.08,
      items: Object.freeze(['health_potion', 'greater_health_potion', 'antidote', 'forest_blade', 'ranger_armor', 'leafguard_hood', 'ranger_boots', 'acorn_talisman'])
    }),
    caves: Object.freeze({
      name: 'Chaos Caves Expedition',
      buyMultiplier: 1.08,
      sellMultiplier: 1.12,
      items: Object.freeze(['greater_health_potion', 'royal_elixir', 'battle_tonic', 'shadow_fang', 'nightweave_armor', 'shadowstep_boots', 'crystal_sword', 'crystal_plate', 'crystal_helm', 'crystal_treads', 'titan_core_amulet'])
    }),
    final: Object.freeze({
      name: 'Last Light Quartermaster',
      buyMultiplier: 1.12,
      sellMultiplier: 1.2,
      items: Object.freeze(['greater_health_potion', 'royal_elixir', 'chaosbane', 'chaosguard_armor', 'void_circlet', 'realmwalker_boots', 'orbward_amulet'])
    })
  });

  const STAT_LABELS = Object.freeze({
    damage: 'Damage',
    defense: 'Defense',
    maxHealth: 'Max HP',
    critChance: 'Critical',
    moveSpeed: 'Speed',
    potionStrength: 'Potion power',
    armorPierce: 'Armor pierce',
    damageReduction: 'Damage reduction',
    dodgeChance: 'Dodge',
    healthRegen: 'Health regen',
    poisonResist: 'Poison resist',
    knockback: 'Knockback',
    knockbackResist: 'Knockback resist'
  });
  const PERCENT_STATS = new Set(['critChance', 'potionStrength', 'damageReduction', 'dodgeChance', 'poisonResist', 'knockback', 'knockbackResist']);
  const TYPE_ICONS = Object.freeze({ weapon: '⚔', armor: '▣', helmet: '♜', boots: '⌁', amulet: '◇', consumable: '◆', material: '✦' });

  function safeCall(context, method) {
    if (!context || typeof context[method] !== 'function') return undefined;
    try {
      return context[method].apply(context, Array.prototype.slice.call(arguments, 2));
    } catch (error) {
      return undefined;
    }
  }

  function element(tag, className, text) {
    const node = global.document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  class ShopManager {
    constructor(game) {
      this.game = game || null;
      this.currentShopId = null;
      this.isOpen = false;
      this._listNode = null;
      this._closeNode = null;
      this._previousState = null;
      this._listHandler = this._handleListClick.bind(this);
      this._closeHandler = this.close.bind(this);
      this._wire();
    }

    _inventory() {
      return this.game && (this.game.inventory || (this.game.player && this.game.player.inventory));
    }

    _player() {
      return this.game && this.game.player ? this.game.player : null;
    }

    _getGold() {
      const player = this._player();
      if (player && Number.isFinite(Number(player.gold))) return Math.max(0, Math.floor(Number(player.gold)));
      if (this.game && Number.isFinite(Number(this.game.gold))) return Math.max(0, Math.floor(Number(this.game.gold)));
      return 0;
    }

    _setGold(value) {
      const gold = Math.max(0, Math.floor(Number(value) || 0));
      const player = this._player();
      if (player) player.gold = gold;
      else if (this.game) this.game.gold = gold;
      safeCall(this.game && this.game.ui, 'updateHUD');
      return gold;
    }

    _toast(message, kind) {
      safeCall(this.game && this.game.ui, 'toast', message, kind || 'info');
    }

    _wire() {
      if (!global.document) return;
      const list = global.document.getElementById('shop-list');
      const close = global.document.getElementById('shop-close');
      if (list && this._listNode !== list) {
        if (this._listNode) this._listNode.removeEventListener('click', this._listHandler);
        list.addEventListener('click', this._listHandler);
        this._listNode = list;
      }
      if (close && this._closeNode !== close) {
        if (this._closeNode) this._closeNode.removeEventListener('click', this._closeHandler);
        close.addEventListener('click', this._closeHandler);
        this._closeNode = close;
      }
    }

    _handleListClick(event) {
      const target = event.target && typeof event.target.closest === 'function' ? event.target.closest('[data-shop-action]') : null;
      if (!target || target.disabled) return;
      const action = target.getAttribute('data-shop-action');
      const value = target.getAttribute('data-shop-value');
      if (action === 'buy') this.buy(value);
      if (action === 'sell') this.sell(value);
    }

    open(shopId) {
      const id = String(shopId === undefined ? 'elaria' : shopId).toLowerCase();
      if (!SHOPS[id]) {
        this._toast('That merchant is unavailable.', 'warning');
        return false;
      }
      this.currentShopId = id;
      this.isOpen = true;
      this._wire();
      const panel = global.document && global.document.getElementById('shop-panel');
      if (panel) {
        panel.hidden = false;
        panel.removeAttribute('aria-hidden');
        panel.classList.add('open');
        panel.classList.remove('hidden');
        panel.style.display = '';
      }
      safeCall(this.game && this.game.ui, 'closeSidePanels');
      if (panel) panel.classList.remove('hidden');
      if (this.game && this.game.state !== 'panel') this._previousState = this.game.state || 'playing';
      if (this.game) this.game.state = 'panel';
      safeCall(this.game, 'setPaused', true, 'shop');
      safeCall(this.game && this.game.audio, 'play', 'shop');
      this.render();
      return true;
    }

    close() {
      this.isOpen = false;
      const panel = global.document && global.document.getElementById('shop-panel');
      if (panel) {
        panel.hidden = true;
        panel.setAttribute('aria-hidden', 'true');
        panel.classList.remove('open');
        panel.classList.add('hidden');
      }
      safeCall(this.game, 'setPaused', false, 'shop');
      if (this.game && this.game.state === 'panel') this.game.state = this._previousState === 'paused' ? 'paused' : 'playing';
      this._previousState = null;
      safeCall(this.game && this.game.audio, 'play', 'button');
    }

    _stockPrice(itemId) {
      const shop = SHOPS[this.currentShopId];
      const def = E.ITEMS && E.ITEMS[itemId];
      if (!shop || !def || shop.items.indexOf(itemId) < 0) return null;
      return Math.max(1, Math.ceil(def.price * shop.buyMultiplier));
    }

    buy(itemId) {
      const id = String(itemId || '');
      const def = E.ITEMS && E.ITEMS[id];
      const price = this._stockPrice(id);
      const inventory = this._inventory();
      if (!this.isOpen || !def || price === null || !inventory || typeof inventory.add !== 'function') {
        this._toast('That item cannot be purchased here.', 'warning');
        return false;
      }
      if (this._getGold() < price) {
        this._toast('You do not have enough gold.', 'warning');
        safeCall(this.game && this.game.audio, 'play', 'error');
        return false;
      }
      const added = safeCall(inventory, 'add', id, 1);
      if (!added) {
        this._toast('Your pack cannot hold that item.', 'warning');
        return false;
      }
      this._setGold(this._getGold() - price);
      const quests = this.game && (this.game.quests || this.game.questManager);
      safeCall(quests, 'event', 'item_purchased', { id: id, itemId: id, qty: 1, gold: price, shopId: this.currentShopId });
      safeCall(this.game && this.game.audio, 'play', 'buy');
      this._toast('Purchased ' + def.name + ' for ' + price + ' gold.', 'success');
      this.render();
      return true;
    }

    sell(uid) {
      const inventory = this._inventory();
      const item = inventory && typeof inventory.get === 'function' ? safeCall(inventory, 'get', String(uid || '')) : null;
      const def = item && E.ITEMS && E.ITEMS[item.id];
      const shop = SHOPS[this.currentShopId];
      if (!this.isOpen || !inventory || !item || !def || !shop) return false;
      if (def.type === 'quest' || def.price <= 0) {
        this._toast('That item cannot be sold.', 'warning');
        return false;
      }
      const price = Math.max(1, Math.floor((Number(def.sellPrice) || def.price * 0.45) * shop.sellMultiplier));
      if (inventory.equipment && Object.keys(inventory.equipment).some(function (slot) { return inventory.equipment[slot] === item.uid; })) {
        const slot = Object.keys(inventory.equipment).find(function (key) { return inventory.equipment[key] === item.uid; });
        if (typeof inventory.unequip === 'function') safeCall(inventory, 'unequip', slot);
      }
      if (safeCall(inventory, 'remove', item.uid, 1) !== 1) return false;
      this._setGold(this._getGold() + price);
      const quests = this.game && (this.game.quests || this.game.questManager);
      safeCall(quests, 'event', 'item_sold', { id: item.id, itemId: item.id, qty: 1, gold: price, shopId: this.currentShopId });
      safeCall(this.game && this.game.audio, 'play', 'sell');
      this._toast('Sold ' + def.name + ' for ' + price + ' gold.', 'success');
      this.render();
      return true;
    }

    _formatStat(key, value) {
      const number = Number(value) || 0;
      return (STAT_LABELS[key] || key) + ' +' + (PERCENT_STATS.has(key) ? Math.round(number * 100) + '%' : Number(number.toFixed(2)));
    }

    _comparison(def) {
      if (!def || !def.slot) return '';
      const inventory = this._inventory();
      const currentUid = inventory && inventory.equipment ? inventory.equipment[def.slot] : null;
      const current = currentUid && typeof inventory.get === 'function' ? inventory.get(currentUid) : null;
      const equippedDef = current && E.ITEMS[current.id];
      if (!equippedDef) return 'Slot empty';
      const keys = new Set(Object.keys(def.stats || {}).concat(Object.keys(equippedDef.stats || {})));
      const differences = [];
      keys.forEach(function (key) {
        const delta = (Number(def.stats[key]) || 0) - (Number(equippedDef.stats[key]) || 0);
        if (Math.abs(delta) < 0.0001) return;
        const rendered = PERCENT_STATS.has(key) ? Math.round(delta * 100) + '%' : Number(delta.toFixed(2));
        differences.push((STAT_LABELS[key] || key) + ' ' + (delta > 0 ? '+' : '') + rendered);
      });
      return differences.length ? 'vs ' + equippedDef.name + ': ' + differences.join(', ') : 'Same core stats as ' + equippedDef.name;
    }

    _makeBuyRow(itemId) {
      const def = E.ITEMS[itemId];
      if (!def) return null;
      const price = this._stockPrice(itemId);
      const row = element('div', 'shop-item shop-buy-item');
      row.setAttribute('data-rarity', def.rarity);
      row.appendChild(element('div', 'item-icon rarity-' + def.rarity, TYPE_ICONS[def.type] || '•'));
      const details = element('div', 'shop-item-details');
      details.appendChild(element('h3', 'shop-item-name', def.name));
      details.appendChild(element('p', 'shop-item-rarity rarity-' + def.rarity, (E.RARITIES && E.RARITIES[def.rarity] ? E.RARITIES[def.rarity].name : def.rarity)));
      details.appendChild(element('p', 'shop-item-description', def.description));
      const statText = Object.keys(def.stats || {}).map((key) => this._formatStat(key, def.stats[key])).join(' · ');
      if (statText) details.appendChild(element('p', 'shop-item-stats', statText));
      const comparison = this._comparison(def);
      if (comparison) details.appendChild(element('p', 'shop-item-compare', comparison));
      const button = element('button', 'pixel-btn shop-buy shop-cost-button', String(price));
      button.type = 'button';
      button.title = 'Buy ' + def.name + ' for ' + price + ' gold';
      button.setAttribute('aria-label', 'Buy ' + def.name + ' for ' + price + ' gold');
      button.setAttribute('data-shop-action', 'buy');
      button.setAttribute('data-shop-value', itemId);
      button.disabled = this._getGold() < price;
      row.appendChild(details);
      row.appendChild(button);
      return row;
    }

    _makeSellRow(item) {
      const def = E.ITEMS[item.id];
      const shop = SHOPS[this.currentShopId];
      if (!def || def.type === 'quest' || def.price <= 0) return null;
      const price = Math.max(1, Math.floor((Number(def.sellPrice) || def.price * 0.45) * shop.sellMultiplier));
      const row = element('div', 'shop-item shop-sell-item');
      const label = def.name + (item.qty > 1 ? ' ×' + item.qty : '');
      row.appendChild(element('div', 'item-icon rarity-' + def.rarity, TYPE_ICONS[def.type] || '•'));
      const details = element('div', 'shop-item-details');
      details.appendChild(element('h3', 'shop-item-name', label));
      details.appendChild(element('p', 'shop-item-rarity rarity-' + def.rarity, (E.RARITIES && E.RARITIES[def.rarity] ? E.RARITIES[def.rarity].name : def.rarity)));
      row.appendChild(details);
      const button = element('button', 'pixel-btn shop-sell shop-cost-button', String(price));
      button.type = 'button';
      button.title = 'Sell ' + def.name + ' for ' + price + ' gold';
      button.setAttribute('aria-label', 'Sell ' + def.name + ' for ' + price + ' gold');
      button.setAttribute('data-shop-action', 'sell');
      button.setAttribute('data-shop-value', item.uid);
      row.appendChild(button);
      return row;
    }

    render() {
      if (!global.document || !this.currentShopId || !SHOPS[this.currentShopId]) return false;
      this._wire();
      const shop = SHOPS[this.currentShopId];
      const title = global.document.getElementById('shop-title');
      const gold = global.document.getElementById('shop-gold');
      const list = global.document.getElementById('shop-list');
      if (title) title.textContent = shop.name;
      if (gold) gold.textContent = String(this._getGold());
      if (!list) return false;
      list.textContent = '';

      const buyHeading = element('h3', 'shop-section-title', 'For Sale');
      buyHeading.style.gridColumn = '1 / -1';
      list.appendChild(buyHeading);
      shop.items.forEach((itemId) => {
        const row = this._makeBuyRow(itemId);
        if (row) list.appendChild(row);
      });

      const sellHeading = element('h3', 'shop-section-title', 'Sell from Pack');
      sellHeading.style.gridColumn = '1 / -1';
      list.appendChild(sellHeading);
      const inventory = this._inventory();
      const sellable = inventory && Array.isArray(inventory.items) ? inventory.items : [];
      let sellRows = 0;
      sellable.forEach((item) => {
        const row = this._makeSellRow(item);
        if (row) {
          list.appendChild(row);
          sellRows += 1;
        }
      });
      if (!sellRows) {
        const empty = element('div', 'shop-empty', 'Nothing in your pack can be sold.');
        empty.style.gridColumn = '1 / -1';
        list.appendChild(empty);
      }
      return true;
    }
  }

  E.SHOPS = SHOPS;
  E.ShopManager = ShopManager;
})(window);
