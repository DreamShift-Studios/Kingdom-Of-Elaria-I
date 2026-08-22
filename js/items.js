/* Elaria item catalogue and item-instance factory. */
(function (global) {
  'use strict';

  const E = global.Elaria = global.Elaria || {};
  const TYPES = ['weapon', 'armor', 'helmet', 'boots', 'amulet', 'consumable', 'material', 'quest'];
  const RARITIES = Object.freeze({
    common: Object.freeze({ name: 'Common', color: '#d7d5c9', rank: 0, priceScale: 1 }),
    uncommon: Object.freeze({ name: 'Uncommon', color: '#7ed36b', rank: 1, priceScale: 1.35 }),
    rare: Object.freeze({ name: 'Rare', color: '#55a9f2', rank: 2, priceScale: 1.9 }),
    epic: Object.freeze({ name: 'Epic', color: '#b56af0', rank: 3, priceScale: 2.8 }),
    legendary: Object.freeze({ name: 'Legendary', color: '#f2b84b', rank: 4, priceScale: 4.5 }),
    mythic: Object.freeze({ name: 'Mythic', color: '#ff5cf4', rank: 5, priceScale: 8 })
  });

  const rawItems = [
    // Weapons
    { id: 'starter_sword', name: 'Elarian Training Sword', type: 'weapon', rarity: 'common', price: 35, world: 'elaria', description: 'The first true weapon entrusted to Elaria\'s chosen hero.', stats: { damage: 6 } },
    { id: 'basic_sword', name: 'Elarian Training Sword', type: 'weapon', rarity: 'common', price: 35, world: 'elaria', description: 'A plain but serviceable sword from the village armory.', stats: { damage: 6 } },
    { id: 'peasant_sword', name: 'Militia Sword', type: 'weapon', rarity: 'common', price: 45, world: 'elaria', description: 'A balanced iron sword issued by the Elarian armory.', stats: { damage: 7, critChance: 0.02 } },
    { id: 'rusty_sword', name: 'Rusty Goblin Blade', type: 'weapon', rarity: 'common', price: 28, world: 'forest', description: 'Notched and ugly, but still capable of a sharp lesson.', stats: { damage: 5 } },
    { id: 'iron_sword', name: 'Blacksmith\'s Iron Sword', type: 'weapon', rarity: 'uncommon', price: 115, world: 'elaria', description: 'A sturdy Elarian blade with a keen, dependable edge.', stats: { damage: 12, critChance: 0.03 } },
    { id: 'forest_blade', name: 'Greenhaven Blade', type: 'weapon', rarity: 'rare', price: 260, world: 'forest', description: 'Living runes along this sword brighten beneath open leaves.', stats: { damage: 19, critChance: 0.05, moveSpeed: 4 } },
    { id: 'thorncleaver', name: 'Thorncleaver', type: 'weapon', rarity: 'epic', price: 460, world: 'forest', description: 'Carved from the purified heartwood of the Creaking One.', stats: { damage: 27, critChance: 0.07, maxHealth: 8 } },
    { id: 'shadow_fang', name: 'Nyxfang Edge', type: 'weapon', rarity: 'epic', price: 720, world: 'dark_forest', description: 'A moon-dark blade that seems to move before its wielder.', stats: { damage: 36, critChance: 0.11, moveSpeed: 8 } },
    { id: 'crystal_sword', name: 'Crystal Resonator', type: 'weapon', rarity: 'epic', price: 1050, world: 'caves', description: 'Its harmonic edge shears armor as readily as stone.', stats: { damage: 48, critChance: 0.08, armorPierce: 8 } },
    { id: 'titan_hammer', name: 'Gorath\'s Shardhammer', type: 'weapon', rarity: 'legendary', price: 1500, world: 'caves', description: 'A titan-forged weapon made light by crystal magic.', stats: { damage: 61, defense: 5, knockback: 0.25 } },
    { id: 'chaosbane', name: 'Chaosbane', type: 'weapon', rarity: 'legendary', price: 2400, world: 'final', description: 'The last royal blade, reforged to sunder chaos itself.', stats: { damage: 78, critChance: 0.14, armorPierce: 14, maxHealth: 15 } },
    { id: 'eclipsebreaker', name: 'Eclipsebreaker', type: 'weapon', rarity: 'mythic', price: 9999, world: 'nightmare', description: 'Forged where the last light meets the endless dark. Its Eclipse Slash tears through chaos itself.', stats: { damage: 112, critChance: 0.22, armorPierce: 24, maxHealth: 30, moveSpeed: 12, knockback: 0.35 } },

    // Body armor
    { id: 'basic_armor', name: 'Elarian Recruit Armor', type: 'armor', rarity: 'common', price: 35, world: 'elaria', description: 'Simple armor kept ready for Elaria\'s newest defender.', stats: { defense: 4, maxHealth: 7 } },
    { id: 'padded_armor', name: 'Padded Militia Armor', type: 'armor', rarity: 'common', price: 40, world: 'elaria', description: 'Quilted protection from the castle stores.', stats: { defense: 4, maxHealth: 8 } },
    { id: 'leather_armor', name: 'Reinforced Leather', type: 'armor', rarity: 'uncommon', price: 105, world: 'elaria', description: 'Flexible leather reinforced with narrow iron strips.', stats: { defense: 7, maxHealth: 12 } },
    { id: 'ranger_armor', name: 'Greenhaven Ranger Coat', type: 'armor', rarity: 'rare', price: 285, world: 'forest', description: 'Layered barkcloth that turns claws without slowing a stride.', stats: { defense: 12, maxHealth: 18, moveSpeed: 5 } },
    { id: 'nightweave_armor', name: 'Nightweave Hauberk', type: 'armor', rarity: 'epic', price: 650, world: 'dark_forest', description: 'Silver thread binds shadows into resilient mail.', stats: { defense: 20, maxHealth: 28, poisonResist: 0.25 } },
    { id: 'crystal_plate', name: 'Resonant Crystal Plate', type: 'armor', rarity: 'epic', price: 980, world: 'caves', description: 'Overlapping crystal plates disperse violent impacts.', stats: { defense: 29, maxHealth: 38, damageReduction: 0.04 } },
    { id: 'chaosguard_armor', name: 'Chaosguard Cuirass', type: 'armor', rarity: 'legendary', price: 1900, world: 'final', description: 'Royal plate warded against the Orb\'s corrupting pulse.', stats: { defense: 42, maxHealth: 55, damageReduction: 0.08 } },

    // Helmets
    { id: 'iron_cap', name: 'Iron Cap', type: 'helmet', rarity: 'common', price: 55, world: 'elaria', description: 'Simple protection for a newly chosen hero.', stats: { defense: 3, maxHealth: 5 } },
    { id: 'leafguard_hood', name: 'Leafguard Hood', type: 'helmet', rarity: 'uncommon', price: 145, world: 'forest', description: 'A ranger hood scented with cedar and warding herbs.', stats: { defense: 5, critChance: 0.02 } },
    { id: 'wolf_crown', name: 'Crown of the Moon Wolf', type: 'helmet', rarity: 'epic', price: 590, world: 'dark_forest', description: 'Its silver crest sharpens instinct in deep shadow.', stats: { defense: 10, critChance: 0.06, maxHealth: 10 } },
    { id: 'crystal_helm', name: 'Prismatic Helm', type: 'helmet', rarity: 'rare', price: 720, world: 'caves', description: 'Faceted crystal reveals threats in fractured reflections.', stats: { defense: 15, armorPierce: 4 } },
    { id: 'void_circlet', name: 'Voidward Circlet', type: 'helmet', rarity: 'legendary', price: 1325, world: 'final', description: 'A royal ward that still remembers an unbroken sky.', stats: { defense: 20, critChance: 0.06, maxHealth: 20 } },

    // Boots
    { id: 'traveler_boots', name: 'Traveler\'s Boots', type: 'boots', rarity: 'common', price: 48, world: 'elaria', description: 'Well-made boots for a road with no certain end.', stats: { defense: 1, moveSpeed: 7 } },
    { id: 'ranger_boots', name: 'Briarstep Boots', type: 'boots', rarity: 'uncommon', price: 155, world: 'forest', description: 'Soft soles cross brambles without catching.', stats: { defense: 3, moveSpeed: 12 } },
    { id: 'shadowstep_boots', name: 'Shadowstep Boots', type: 'boots', rarity: 'epic', price: 610, world: 'dark_forest', description: 'Each hurried step leaves a fading echo behind.', stats: { defense: 6, moveSpeed: 18, dodgeChance: 0.04 } },
    { id: 'crystal_treads', name: 'Crystal Treads', type: 'boots', rarity: 'rare', price: 690, world: 'caves', description: 'Crystal cleats hold firm on broken stone.', stats: { defense: 10, moveSpeed: 13, knockbackResist: 0.2 } },
    { id: 'realmwalker_boots', name: 'Realmwalker Boots', type: 'boots', rarity: 'legendary', price: 1280, world: 'final', description: 'They find footing even where the realm has split apart.', stats: { defense: 13, moveSpeed: 22, dodgeChance: 0.07 } },

    // Amulets
    { id: 'healer_charm', name: 'Healer\'s Charm', type: 'amulet', rarity: 'uncommon', price: 180, world: 'elaria', description: 'Warm light gathers around every opened potion.', stats: { potionStrength: 0.25, maxHealth: 8 } },
    { id: 'acorn_talisman', name: 'Ancient Acorn Talisman', type: 'amulet', rarity: 'rare', price: 340, world: 'forest', description: 'A promise that the forest will grow again.', stats: { maxHealth: 22, healthRegen: 0.15 } },
    { id: 'moonfang_amulet', name: 'Moonfang Amulet', type: 'amulet', rarity: 'epic', price: 670, world: 'dark_forest', description: 'Cold moonlight pools in the fang\'s hollow.', stats: { critChance: 0.08, damage: 8, moveSpeed: 5 } },
    { id: 'titan_core_amulet', name: 'Titan Core Pendant', type: 'amulet', rarity: 'epic', price: 1050, world: 'caves', description: 'A tiny crystal heart beats against its silver cage.', stats: { defense: 12, damage: 10, maxHealth: 18 } },
    { id: 'orbward_amulet', name: 'Orbward Amulet', type: 'amulet', rarity: 'legendary', price: 1750, world: 'final', description: 'The last ward fashioned by Elaria\'s royal magi.', stats: { defense: 12, damage: 14, maxHealth: 28, potionStrength: 0.35 } },

    // Consumables
    { id: 'health_potion', name: 'Health Potion', type: 'consumable', rarity: 'common', price: 25, world: 'all', description: 'Restores 35 health.', stackable: true, maxStack: 20, effect: { heal: 35 } },
    { id: 'greater_health_potion', name: 'Greater Health Potion', type: 'consumable', rarity: 'uncommon', price: 70, world: 'forest', description: 'Restores 75 health.', stackable: true, maxStack: 15, effect: { heal: 75 } },
    { id: 'royal_elixir', name: 'Royal Elixir', type: 'consumable', rarity: 'rare', price: 175, world: 'caves', description: 'Restores 150 health.', stackable: true, maxStack: 10, effect: { heal: 150 } },
    { id: 'antidote', name: 'Greenhaven Antidote', type: 'consumable', rarity: 'common', price: 32, world: 'forest', description: 'Cures poison and restores 10 health.', stackable: true, maxStack: 12, effect: { heal: 10, cure: 'poison' } },
    { id: 'battle_tonic', name: 'Battle Tonic', type: 'consumable', rarity: 'rare', price: 130, world: 'dark_forest', description: 'Restores 45 health and briefly empowers attacks.', stackable: true, maxStack: 8, effect: { heal: 45, buff: 'damage', amount: 0.2, duration: 12 } },

    // Materials and trophies
    { id: 'slime_gel', name: 'Slime Gel', type: 'material', rarity: 'common', price: 8, world: 'forest', description: 'A faintly luminous alchemical reagent.', stackable: true, maxStack: 99 },
    { id: 'goblin_cloth', name: 'Goblin Cloth', type: 'material', rarity: 'common', price: 11, world: 'forest', description: 'Rough cloth that can still be repaired and traded.', stackable: true, maxStack: 99 },
    { id: 'living_bark', name: 'Living Bark', type: 'material', rarity: 'uncommon', price: 28, world: 'forest', description: 'Purified bark that hums with returning life.', stackable: true, maxStack: 99 },
    { id: 'venom_sac', name: 'Spider Venom Sac', type: 'material', rarity: 'uncommon', price: 30, world: 'dark_forest', description: 'Dangerous in careless hands; valuable in careful ones.', stackable: true, maxStack: 99 },
    { id: 'shadow_essence', name: 'Shadow Essence', type: 'material', rarity: 'rare', price: 52, world: 'dark_forest', description: 'A cold wisp trapped in smoky glass.', stackable: true, maxStack: 99 },
    { id: 'wolf_fang', name: 'Corrupted Wolf Fang', type: 'material', rarity: 'uncommon', price: 34, world: 'dark_forest', description: 'Black at the root from lingering chaos.', stackable: true, maxStack: 99 },
    { id: 'shadow_cloth', name: 'Shadow Cloth', type: 'material', rarity: 'uncommon', price: 29, world: 'dark_forest', description: 'Goblin cloth steeped in cold shadow magic.', stackable: true, maxStack: 99 },
    { id: 'spider_silk', name: 'Giant Spider Silk', type: 'material', rarity: 'uncommon', price: 32, world: 'dark_forest', description: 'Exceptionally strong silk used in warded clothing.', stackable: true, maxStack: 99 },
    { id: 'wolf_pelt', name: 'Corrupted Wolf Pelt', type: 'material', rarity: 'uncommon', price: 38, world: 'dark_forest', description: 'Dark fur that remains warm beneath a moonless sky.', stackable: true, maxStack: 99 },
    { id: 'chaos_dust', name: 'Chaos Dust', type: 'material', rarity: 'rare', price: 58, world: 'dark_forest', description: 'A volatile residue left by dark magic.', stackable: true, maxStack: 99 },
    { id: 'living_root', name: 'Living Root', type: 'material', rarity: 'uncommon', price: 27, world: 'dark_forest', description: 'A severed vine root that still curls toward water.', stackable: true, maxStack: 99 },
    { id: 'crystal_shard', name: 'Resonant Crystal Shard', type: 'material', rarity: 'uncommon', price: 44, world: 'caves', description: 'Sings softly when held near another shard.', stackable: true, maxStack: 99 },
    { id: 'golem_core', name: 'Stone Golem Core', type: 'material', rarity: 'rare', price: 85, world: 'caves', description: 'A dense knot of runes and living stone.', stackable: true, maxStack: 50 },
    { id: 'bat_wing', name: 'Cave Bat Wing', type: 'material', rarity: 'common', price: 16, world: 'caves', description: 'A tough membrane useful to alchemists.', stackable: true, maxStack: 99 },
    { id: 'ancient_bone', name: 'Ancient Bone', type: 'material', rarity: 'uncommon', price: 36, world: 'caves', description: 'A rune-scratched bone from a restless warrior.', stackable: true, maxStack: 99 },
    { id: 'chaos_ore', name: 'Chaos Ore', type: 'material', rarity: 'rare', price: 92, world: 'caves', description: 'Raw ore threaded with dangerous violet energy.', stackable: true, maxStack: 99 },
    { id: 'chaos_fragment', name: 'Chaos Fragment', type: 'material', rarity: 'epic', price: 135, world: 'final', description: 'Unstable residue chipped from the broken realm.', stackable: true, maxStack: 50 },
    { id: 'royal_sigil', name: 'Lost Royal Sigil', type: 'material', rarity: 'rare', price: 160, world: 'final', description: 'Proof that Elaria\'s old guard fought to the end.', stackable: true, maxStack: 20 },
    { id: 'rare_gel', name: 'Crowned Slime Gel', type: 'material', rarity: 'rare', price: 74, world: 'final', description: 'Brilliant gel shed by an unusually powerful slime.', stackable: true, maxStack: 50 },
    { id: 'goblin_relic', name: 'Goblin Champion Relic', type: 'material', rarity: 'rare', price: 105, world: 'final', description: 'A trophy carried by the strongest goblin champions.', stackable: true, maxStack: 50 },
    { id: 'alpha_fang', name: 'Chaos Alpha Fang', type: 'material', rarity: 'epic', price: 145, world: 'final', description: 'A massive fang vibrating with feral chaos.', stackable: true, maxStack: 25 },
    { id: 'warlock_focus', name: 'Warlock Focus', type: 'material', rarity: 'epic', price: 175, world: 'final', description: 'A dark crystal used to focus ruinous spells.', stackable: true, maxStack: 25 },
    { id: 'obsidian_heart', name: 'Obsidian Colossus Heart', type: 'material', rarity: 'epic', price: 210, world: 'final', description: 'An impossibly heavy core burning with inner light.', stackable: true, maxStack: 20 },

    // Quest items are intentionally priceless and cannot be sold or dropped.
    { id: 'wizard_seal', name: 'Wizard\'s Seal', type: 'quest', rarity: 'rare', price: 0, world: 'elaria', description: 'A glowing seal marking the bearer as Elaria\'s chosen.', stackable: false },
    { id: 'guard_pass', name: 'Elarian Gate Writ', type: 'quest', rarity: 'common', price: 0, world: 'elaria', description: 'The guard\'s permission to pass beyond the walls.', stackable: false },
    { id: 'forest_relic', name: 'Purified Heartwood', type: 'quest', rarity: 'epic', price: 0, world: 'forest', description: 'Heartwood freed from the Creaking One\'s corruption.', stackable: false },
    { id: 'shrine_fragment', name: 'Broken Shrine Fragment', type: 'quest', rarity: 'rare', price: 0, world: 'dark_forest', description: 'One part of a moon shrine shattered by Nyxfang.', stackable: true, maxStack: 8 },
    { id: 'cave_key', name: 'Runic Mine Key', type: 'quest', rarity: 'uncommon', price: 0, world: 'caves', description: 'Unlocks the sealed mechanisms of the Chaos Caves.', stackable: false },
    { id: 'forest_key', name: 'Greenhaven Path Key', type: 'quest', rarity: 'rare', price: 0, world: 'forest', description: 'A living-wood key that opens the road beyond Greenhaven.', stackable: false },
    { id: 'titan_prism', name: 'Titan Prism', type: 'quest', rarity: 'legendary', price: 0, world: 'caves', description: 'A stable prism capable of opening a path between realms.', stackable: false },
    { id: 'titan_shard', name: 'Titan Shard', type: 'quest', rarity: 'legendary', price: 0, world: 'caves', description: 'A massive crystal splinter left when Gorath fell.', stackable: false },
    { id: 'chaos_heart', name: 'Heart of Chaos', type: 'quest', rarity: 'legendary', price: 0, world: 'final', description: 'The extinguished heart of Velymoor\'s broken chaos form.', stackable: false },
    { id: 'orb_shard', name: 'Orb of Chaos Shard', type: 'quest', rarity: 'legendary', price: 0, world: 'final', description: 'A splinter of the artifact that broke the world.', stackable: true, maxStack: 4 }
  ];

  let uidCounter = 0;

  function freezeItem(definition) {
    const copy = Object.assign({
      slot: ['weapon', 'armor', 'helmet', 'boots', 'amulet'].indexOf(definition.type) >= 0 ? definition.type : null,
      rarity: 'common',
      world: 'all',
      price: 0,
      sellPrice: Math.max(0, Math.floor((definition.price || 0) * 0.45)),
      stackable: definition.type === 'material' || definition.type === 'consumable',
      maxStack: 1,
      stats: {},
      effect: null
    }, definition);
    copy.maxStack = copy.stackable ? Math.max(1, Math.floor(Number(copy.maxStack) || 99)) : 1;
    copy.stats = Object.freeze(Object.assign({}, copy.stats));
    copy.effect = copy.effect ? Object.freeze(Object.assign({}, copy.effect)) : null;
    return Object.freeze(copy);
  }

  const database = Object.create(null);
  rawItems.forEach(function (item) {
    if (TYPES.indexOf(item.type) < 0 || !RARITIES[item.rarity || 'common']) return;
    database[item.id] = freezeItem(item);
  });
  const aliases = {
    healthPotion: 'health_potion', greaterHealthPotion: 'greater_health_potion', royalElixir: 'royal_elixir',
    starterSword: 'starter_sword', basicSword: 'basic_sword', rustySword: 'rusty_sword', ironSword: 'iron_sword',
    basicArmor: 'basic_armor', leatherArmor: 'leather_armor', slimeGel: 'slime_gel', goblinCloth: 'goblin_cloth',
    shadowCloth: 'shadow_cloth', spiderSilk: 'spider_silk', wolfPelt: 'wolf_pelt', chaosDust: 'chaos_dust',
    livingRoot: 'living_root', batWing: 'bat_wing', ancientBone: 'ancient_bone', golemCore: 'golem_core',
    chaosOre: 'chaos_ore', crystalShard: 'crystal_shard', rareGel: 'rare_gel', goblinRelic: 'goblin_relic',
    alphaFang: 'alpha_fang', warlockFocus: 'warlock_focus', obsidianHeart: 'obsidian_heart'
  };
  Object.keys(aliases).forEach(function (alias) {
    if (database[aliases[alias]]) database[alias] = database[aliases[alias]];
  });

  function makeUid(id) {
    uidCounter += 1;
    const time = Date.now().toString(36);
    let random = '';
    try {
      const bytes = new Uint32Array(1);
      if (global.crypto && typeof global.crypto.getRandomValues === 'function') {
        global.crypto.getRandomValues(bytes);
        random = bytes[0].toString(36);
      }
    } catch (error) {
      random = '';
    }
    if (!random) random = Math.floor(Math.random() * 0xFFFFFF).toString(36);
    return 'itm-' + id.replace(/[^a-z0-9_-]/gi, '').slice(0, 18) + '-' + time + '-' + uidCounter.toString(36) + '-' + random;
  }

  function createItem(id, qty) {
    const definition = database[String(id || '')];
    if (!definition) return null;
    const amount = qty === undefined ? 1 : Math.floor(Number(qty));
    if (!Number.isFinite(amount) || amount < 1) return null;
    return {
      uid: makeUid(definition.id),
      id: definition.id,
      qty: definition.stackable ? Math.min(amount, definition.maxStack) : 1
    };
  }

  E.ITEM_TYPES = Object.freeze(TYPES.slice());
  E.RARITIES = RARITIES;
  E.ITEMS = Object.freeze(database);
  E.createItem = createItem;
})(window);
