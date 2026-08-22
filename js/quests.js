(function (global) {
  "use strict";

  var E = global.Elaria = global.Elaria || {};

  var SAVE_VERSION = 2;
  var REQUIRED_GUARD_GEAR = ["weapon", "armor"];
  var GUARD_BLOCKED = "Stop! The lands outside Elaria are filled with monsters. I cannot allow you through without armor and a weapon.";
  var GUARD_READY = "You are prepared, warrior. May the light of Elaria guide you.";

  function key(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function list(value) {
    if (value === null || value === undefined || value === "") return [];
    return Array.isArray(value) ? value.slice() : [value];
  }

  function unique(values) {
    var seen = Object.create(null);
    return values.filter(function (value) {
      var normalized = key(value);
      if (!normalized || seen[normalized]) return false;
      seen[normalized] = true;
      return true;
    });
  }

  function number(value, fallback) {
    value = Number(value);
    return Number.isFinite(value) ? value : (fallback || 0);
  }

  function positiveInteger(value, fallback) {
    return Math.max(1, Math.floor(number(value, fallback || 1)));
  }

  function copy(value) {
    if (value === undefined) return undefined;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_error) {
      return value;
    }
  }

  function merge(base, extra) {
    var result = {};
    Object.keys(base || {}).forEach(function (name) { result[name] = base[name]; });
    Object.keys(extra || {}).forEach(function (name) { result[name] = extra[name]; });
    return result;
  }

  function objective(id, event, label, targets, count, extra) {
    return merge({
      id: id,
      event: event,
      label: label,
      targets: list(targets),
      count: positiveInteger(count, 1)
    }, extra);
  }

  var WORLD_ALIASES = {
    elaria: ["elaria", "world_0", "world0", "village", "elaria_village"],
    greenhaven: ["greenhaven", "greenhaven_forest", "world_1", "world1", "forest"],
    dark_forest: ["dark_forest", "the_dark_forest", "world_2", "world2", "shadow_forest"],
    chaos_caves: ["chaos_caves", "the_chaos_caves", "world_3", "world3", "caves"],
    broken_realm: ["broken_realm", "velymoors_broken_realm", "velymoor_realm", "final_world", "world_4", "world4"]
  };

  var QUEST_LIST = [
    {
      id: "awakening",
      type: "main",
      title: "The Awakening",
      description: "The wizard has chosen you to carry Elaria's last hope. Visit the armory, equip a weapon and armor, then speak with the entrance guard.",
      giver: "wizard",
      world: "elaria",
      autoStart: true,
      sequential: true,
      objectives: [
        objective("hear_the_call", "wizard_spoken", "Speak with the wizard near your house", ["wizard", "elaria_wizard"]),
        objective("find_a_sword", "item_collected", "Collect a sword from the armory", ["starter_sword", "peasant_sword", "training_sword", "rusty_sword", "iron_sword", "basic_sword"], 1, { categories: ["weapon", "sword"], hint: "The armory is beside the training yard." }),
        objective("find_armor", "item_collected", "Collect basic armor from the armory", ["padded_armor", "leather_armor", "basic_armor", "guard_armor", "cloth_armor"], 1, { categories: ["armor", "body_armor"] }),
        objective("equip_a_sword", "item_equipped", "Open the inventory (I) and equip a weapon", [], 1, { slots: ["weapon"], anyItemInSlot: true }),
        objective("equip_armor", "item_equipped", "Equip armor in the armor slot", [], 1, { slots: ["armor", "body", "chest"], anyItemInSlot: true }),
        objective("face_the_guard", "guard_cleared", "Speak with the entrance guard", ["entrance_guard", "gate_guard", "guard"]),
        objective("leave_elaria", "world_entered", "Pass through the gate into Greenhaven Forest", WORLD_ALIASES.greenhaven)
      ],
      rewards: {
        gold: 25,
        items: [{ id: "health_potion", quantity: 2 }],
        unlockWorld: "greenhaven",
        flags: ["tutorial_complete"],
        display: "25 gold, 2 Health Potions, access to Greenhaven Forest"
      },
      next: ["creaking_one"]
    },
    {
      id: "creaking_one",
      type: "boss",
      title: "Heart of the Corruption",
      description: "Follow the corruption through Greenhaven and defeat the ancient tree guardian known as The Creaking One.",
      world: "greenhaven",
      prerequisites: ["awakening"],
      sequential: true,
      catchUpEvents: ["boss_killed"],
      objectives: [
        objective("enter_greenhaven", "world_entered", "Enter Greenhaven Forest", WORLD_ALIASES.greenhaven),
        objective("thin_the_horde", "enemy_killed", "Defeat corrupted creatures in Greenhaven", [], 5, { worlds: WORLD_ALIASES.greenhaven }),
        objective("find_the_grove", "area_discovered", "Find the Creaking Grove", ["creaking_grove", "ancient_grove", "tree_boss_arena"]),
        objective("fell_the_guardian", "boss_killed", "Defeat The Creaking One", ["creaking_one", "the_creaking_one", "creakingone"])
      ],
      rewards: {
        gold: 150,
        items: [{ id: "forest_key", quantity: 1 }],
        unlockWorld: "dark_forest",
        flags: ["creaking_one_defeated"],
        display: "150 gold, Forest Key, access to the Dark Forest"
      },
      next: ["nyxfang"]
    },
    {
      id: "nyxfang",
      type: "boss",
      title: "Fangs in the Fog",
      description: "Track Nyxfang through the poisoned Dark Forest and end the shadow wolf's hunt.",
      world: "dark_forest",
      prerequisites: ["creaking_one"],
      sequential: true,
      catchUpEvents: ["boss_killed"],
      objectives: [
        objective("enter_dark_forest", "world_entered", "Enter the Dark Forest", WORLD_ALIASES.dark_forest),
        objective("survive_the_dark", "enemy_killed", "Defeat creatures of the Dark Forest", [], 7, { worlds: WORLD_ALIASES.dark_forest }),
        objective("find_shadow_den", "area_discovered", "Discover Nyxfang's shadow den", ["nyxfang_den", "shadow_den", "wolf_den"]),
        objective("break_the_hunt", "boss_killed", "Defeat Nyxfang, the Shadow Wolf", ["nyxfang", "nyxfang_the_shadow_wolf", "shadow_wolf"])
      ],
      rewards: {
        gold: 250,
        items: [{ id: "cave_key", quantity: 1 }],
        unlockWorld: "chaos_caves",
        flags: ["nyxfang_defeated"],
        display: "250 gold, Cave Key, access to the Chaos Caves"
      },
      next: ["gorath"]
    },
    {
      id: "gorath",
      type: "boss",
      title: "The Crystal Titan",
      description: "Descend into the Chaos Caves, shatter Gorath's armor crystals, and bring down the titan.",
      world: "chaos_caves",
      prerequisites: ["nyxfang"],
      sequential: true,
      catchUpEvents: ["boss_killed"],
      objectives: [
        objective("enter_chaos_caves", "world_entered", "Enter the Chaos Caves", WORLD_ALIASES.chaos_caves),
        objective("cave_resistance", "enemy_killed", "Defeat monsters in the Chaos Caves", [], 8, { worlds: WORLD_ALIASES.chaos_caves }),
        objective("find_titan_sanctum", "area_discovered", "Reach the Titan's crystal sanctum", ["gorath_sanctum", "titan_sanctum", "crystal_arena"]),
        objective("shatter_the_titan", "boss_killed", "Defeat Gorath, the Crystal Titan", ["gorath", "gorath_the_crystal_titan", "crystal_titan"])
      ],
      rewards: {
        gold: 400,
        items: [{ id: "titan_shard", quantity: 1 }],
        unlockWorld: "broken_realm",
        flags: ["gorath_defeated"],
        display: "400 gold, Titan Shard, a portal to Velymoor's Broken Realm"
      },
      next: ["velymoor"]
    },
    {
      id: "velymoor",
      type: "boss",
      title: "Rise Against Velymoor",
      description: "Cross the Broken Realm, breach the fortress, destroy the Orb of Chaos, and restore the light of Elaria.",
      world: "broken_realm",
      prerequisites: ["gorath"],
      sequential: true,
      catchUpEvents: ["boss_killed"],
      objectives: [
        objective("enter_broken_realm", "world_entered", "Enter Velymoor's Broken Realm", WORLD_ALIASES.broken_realm),
        objective("break_the_legion", "enemy_killed", "Defeat Velymoor's elite forces", [], 10, { worlds: WORLD_ALIASES.broken_realm }),
        objective("reach_the_fortress", "area_discovered", "Reach Velymoor's fortress", ["velymoor_fortress", "broken_fortress", "final_fortress"]),
        objective("end_the_chaos", "boss_killed", "Defeat Velymoor and shatter the Orb of Chaos", ["velymoor", "velymoor_final", "chaos_velymoor"])
      ],
      rewards: {
        gold: 1000,
        items: [{ id: "chaos_heart", quantity: 1 }],
        flags: ["velymoor_defeated", "ending_unlocked", "new_game_plus_unlocked"],
        display: "1000 gold, Chaos Heart, New Game Plus and free exploration"
      }
    },
    {
      id: "forest_medicine",
      type: "collection",
      title: "Gel for the Wounded",
      description: "Mira can brew salves for Elaria's wounded if you bring her slime gel from Greenhaven.",
      giver: "mira",
      world: "greenhaven",
      prerequisites: ["awakening"],
      autoStartOnWorld: true,
      objectives: [objective("gather_slime_gel", "item_collected", "Collect Slime Gel", ["slime_gel", "green_slime_gel", "poison_slime_gel"], 5, { categories: ["slime_gel"] })],
      rewards: { gold: 70, items: [{ id: "health_potion", quantity: 3 }], display: "70 gold and 3 Health Potions" }
    },
    {
      id: "lost_scouts",
      type: "rescue",
      title: "The Lost Scouts",
      description: "Find the Elarian scouts stranded along Greenhaven's hidden trails.",
      giver: "lost_scout",
      world: "dark_forest",
      prerequisites: ["creaking_one"],
      autoStartOnWorld: true,
      objectives: [objective("rescue_scouts", "npc_rescued", "Rescue Scout Ilyra", ["ilyra", "lost_scout", "elarian_scout", "scout"], 1, { unique: true })],
      rewards: { gold: 100, items: [{ id: "ranger_boots", quantity: 1 }], display: "100 gold and Ranger Boots" }
    },
    {
      id: "greenhaven_secrets",
      type: "exploration",
      title: "Whispers Beneath the Leaves",
      description: "Discover Greenhaven's hidden paths and recover treasure lost to the corruption.",
      giver: "forest_survivor",
      world: "greenhaven",
      prerequisites: ["awakening"],
      autoStartOnWorld: true,
      objectives: [
        objective("secret_paths", "area_discovered", "Activate the Ancient Root Switch", ["green_switch"], 1, { worlds: WORLD_ALIASES.greenhaven, unique: true }),
        objective("forest_chests", "chest_opened", "Open treasure chests in Greenhaven", [], 2, { worlds: WORLD_ALIASES.greenhaven, unique: true })
      ],
      rewards: { gold: 120, items: [{ id: "forest_relic", quantity: 1 }], display: "120 gold and a Forest Relic" }
    },
    {
      id: "glowing_remedy",
      type: "collection",
      title: "Bandages in the Fog",
      description: "Recover goblin cloth from the webbed cache for Scout Ilyra's wounds.",
      giver: "lost_scout",
      world: "dark_forest",
      prerequisites: ["creaking_one"],
      autoStartOnWorld: true,
      objectives: [objective("gather_mushrooms", "item_collected", "Collect Goblin Cloth", ["goblin_cloth", "goblincloth"], 3)],
      rewards: { gold: 140, items: [{ id: "greater_health_potion", quantity: 2 }], display: "140 gold and 2 Greater Health Potions" }
    },
    {
      id: "broken_shrines",
      type: "exploration",
      title: "Light the Broken Shrines",
      description: "Find the old shrines scattered through the Dark Forest and rekindle their light.",
      giver: "shrine_keeper",
      world: "dark_forest",
      prerequisites: ["creaking_one"],
      autoStartOnWorld: true,
      objectives: [objective("restore_shrines", "area_discovered", "Restore the Broken Moon Shrine", ["broken_shrine", "restored_shrine", "forest_shrine"], 1, { unique: true })],
      rewards: { gold: 180, items: [{ id: "healer_charm", quantity: 1 }], display: "180 gold and a Healer's Charm" }
    },
    {
      id: "trapped_miners",
      type: "rescue",
      title: "Voices in the Deep",
      description: "Rescue the miners trapped beyond the cave-ins in the Chaos Caves.",
      giver: "miner_foreman",
      world: "chaos_caves",
      prerequisites: ["nyxfang"],
      autoStartOnWorld: true,
      objectives: [objective("rescue_miners", "npc_rescued", "Rescue Old Caster", ["caster", "trapped_miner", "chaos_miner", "miner"], 1, { unique: true })],
      rewards: { gold: 240, items: [{ id: "crystal_helm", quantity: 1 }], display: "240 gold and a Crystal Helm" }
    },
    {
      id: "crystal_research",
      type: "collection",
      title: "Fragments of Chaos",
      description: "Collect stable crystal fragments so Elaria's wizard can study Gorath's armor.",
      giver: "cave_scholar",
      world: "chaos_caves",
      prerequisites: ["nyxfang"],
      autoStartOnWorld: true,
      objectives: [objective("collect_crystals", "item_collected", "Collect Crystal Fragments", ["crystal_fragment", "chaos_crystal", "crystal_shard"], 8)],
      rewards: { gold: 260, items: [{ id: "crystal_sword", quantity: 1 }], display: "260 gold and a Crystal Sword" }
    },
    {
      id: "realm_survivors",
      type: "rescue",
      title: "Hope in a Broken Realm",
      description: "Free the last prisoners held in Velymoor's collapsing realm.",
      giver: "realm_spirit",
      world: "broken_realm",
      prerequisites: ["gorath"],
      autoStartOnWorld: true,
      objectives: [objective("free_prisoners", "npc_rescued", "Free realm prisoners", ["realm_prisoner", "captured_soldier", "prisoner"], 4, { unique: true })],
      rewards: { gold: 400, items: [{ id: "orbward_amulet", quantity: 1 }], display: "400 gold and an Orbward Amulet" }
    },
    {
      id: "treasure_hunter",
      type: "side",
      title: "Relics of the Fallen",
      description: "Open ancient chests scattered beyond Elaria and recover relics from the fallen kingdoms.",
      giver: "shopkeeper",
      world: "elaria",
      prerequisites: ["awakening"],
      autoStartOnPrereq: true,
      objectives: [objective("open_ancient_chests", "chest_opened", "Open treasure chests", [], 5, { unique: true })],
      rewards: { gold: 300, items: [{ id: "acorn_talisman", quantity: 1 }], display: "300 gold and an Acorn Talisman" }
    },
    {
      id: "greenhaven_escort",
      type: "escort",
      title: "A Ranger's Road Home",
      description: "Guide the young ranger Luma from the corrupted eastern trail back to the Wayfarer Shrine.",
      giver: "escort_luma",
      world: "greenhaven",
      prerequisites: ["awakening"],
      autoStartOnWorld: true,
      objectives: [objective("escort_luma_home", "escort_completed", "Escort Luma to the Wayfarer Shrine", ["escort_luma", "luma"], 1, { unique: true })],
      rewards: { gold: 110, items: [{ id: "ranger_boots", quantity: 1 }], display: "110 gold and Ranger Boots" }
    },
    {
      id: "warden_contract",
      type: "contract",
      title: "Contract: Warden of Echoes",
      description: "Find the concealed chamber beyond Greenhaven's waterfall and defeat the ancient Warden within.",
      giver: "lorekeeper",
      world: "greenhaven",
      prerequisites: ["awakening"],
      autoStartOnWorld: true,
      sequential: true,
      objectives: [
        objective("find_waterfall_cave", "area_discovered", "Find the Hidden Waterfall Cave", ["waterfall_cave"], 1, { unique: true }),
        objective("defeat_echo_warden", "enemy_killed", "Defeat the Warden of Echoes", ["elite_golem", "warden_of_echoes"], 1)
      ],
      rewards: { gold: 220, items: [{ id: "forest_relic", quantity: 1 }], display: "220 gold and a Forest Relic" }
    },
    {
      id: "brams_commission",
      type: "request",
      title: "Bram's Village Commission",
      description: "Elaria needs stable Chaos Ore to reinforce its gates before the next attack.",
      giver: "smith",
      world: "chaos_caves",
      prerequisites: ["nyxfang"],
      autoStartOnWorld: true,
      objectives: [objective("gather_chaos_ore", "item_collected", "Collect Chaos Ore for Elaria", ["chaos_ore"], 3)],
      rewards: { gold: 280, items: [{ id: "chaos_dust", quantity: 3 }], display: "280 gold and 3 Chaos Dust" }
    },
    {
      id: "cave_emergency",
      type: "timed",
      title: "Before the Tunnel Falls",
      description: "Thin the creatures around Caster's escape route before the unstable tunnel collapses.",
      giver: "miner",
      world: "chaos_caves",
      prerequisites: ["nyxfang"],
      autoStartOnWorld: true,
      timeLimit: 180,
      repeatable: true,
      objectives: [objective("clear_escape_route", "enemy_killed", "Defeat creatures in the Chaos Caves", [], 5, { worlds: WORLD_ALIASES.chaos_caves })],
      rewards: { gold: 190, items: [{ id: "greater_health_potion", quantity: 2 }], display: "190 gold and 2 Greater Health Potions" }
    },
    {
      id: "easy_mercy_trial", type: "difficulty", difficulty: "easy", title: "A Gentle Light",
      description: "Help Elaria recover supplies while learning the road.", world: "greenhaven", autoStartOnWorld: true,
      objectives: [objective("easy_kills", "enemy_killed", "Defeat creatures anywhere", [], 8)],
      rewards: { gold: 120, items: [{ id: "healer_charm", quantity: 1 }], display: "120 gold and Healer's Charm" }
    },
    {
      id: "normal_guardian_trial", type: "difficulty", difficulty: "normal", title: "The Forgotten Guardian",
      description: "Prove yourself against the corruption spreading beyond Elaria.", world: "dark_forest", autoStartOnWorld: true,
      objectives: [objective("normal_kills", "enemy_killed", "Defeat corrupted enemies", [], 18)],
      rewards: { gold: 260, items: [{ id: "forest_blade", quantity: 1 }], display: "260 gold and Greenhaven Blade" }
    },
    {
      id: "hard_ancient_trial", type: "difficulty", difficulty: "hard", title: "Trials of the Ancients",
      description: "Conquer the harsh road without yielding to chaos.", world: "chaos_caves", autoStartOnWorld: true,
      objectives: [objective("hard_kills", "enemy_killed", "Defeat enemies on Hard", [], 30), objective("hard_boss", "boss_killed", "Defeat Gorath", ["gorath"])],
      rewards: { gold: 500, items: [{ id: "chaosguard_armor", quantity: 1 }], display: "500 gold and Chaosguard Armor" }
    },
    {
      id: "nightmare_eclipse_trial", type: "difficulty", difficulty: "nightmare", title: "The Eclipse Trial",
      description: "Complete the three ancient trials hidden in World 0, then find the sealed chamber beside Velymoor's fortress and defeat the Eclipse Warden to claim the Mythic sword.",
      world: "elaria", autoStartOnWorld: true, sequential: true,
      objectives: [
        objective("eclipse_trial_might", "area_discovered", "World 0: Complete the Trial of Might", ["eclipse_trial_might_done"]),
        objective("eclipse_trial_endurance", "area_discovered", "World 0: Complete the Trial of Endurance", ["eclipse_trial_endurance_done"]),
        objective("eclipse_trial_spirit", "area_discovered", "World 0: Complete the Trial of Spirit", ["eclipse_trial_spirit_done"]),
        objective("find_eclipse_chamber", "world_entered", "Final World: Enter the secret Eclipse Chamber", ["eclipse_chamber"]),
        objective("defeat_eclipse_warden", "boss_killed", "Defeat the Eclipse Warden and claim Eclipsebreaker", ["eclipse_warden", "eclipsewarden"])
      ],
      rewards: { gold: 1200, flags: ["eclipsebreaker_claimed"], display: "1200 gold and the Mythic Eclipsebreaker" }
    }
  ];

  var QUEST_DEFS = Object.create(null);
  QUEST_LIST.forEach(function (definition) {
    QUEST_DEFS[definition.id] = definition;
  });

  var EVENT_ALIASES = {
    wizard_spoken: "wizard_spoken",
    wizard_talked: "wizard_spoken",
    talked_to_wizard: "wizard_spoken",
    speak_wizard: "wizard_spoken",
    item_collected: "item_collected",
    item_picked_up: "item_collected",
    pickup_item: "item_collected",
    collect_item: "item_collected",
    inventory_added: "item_collected",
    item_equipped: "item_equipped",
    equipment_changed: "item_equipped",
    equip_item: "item_equipped",
    guard_cleared: "guard_cleared",
    guard_approved: "guard_cleared",
    gate_cleared: "guard_cleared",
    world_entered: "world_entered",
    enter_world: "world_entered",
    entered_world: "world_entered",
    map_entered: "world_entered",
    world_changed: "world_entered",
    enemy_killed: "enemy_killed",
    enemy_defeated: "enemy_killed",
    killed_enemy: "enemy_killed",
    boss_killed: "boss_killed",
    boss_defeated: "boss_killed",
    defeated_boss: "boss_killed",
    item_used: "item_used",
    use_item: "item_used",
    potion_used: "item_used",
    chest_opened: "chest_opened",
    open_chest: "chest_opened",
    npc_rescued: "npc_rescued",
    survivor_rescued: "npc_rescued",
    rescue_npc: "npc_rescued",
    area_discovered: "area_discovered",
    location_discovered: "area_discovered",
    area_entered: "area_discovered",
    secret_found: "area_discovered",
    gold_collected: "gold_collected",
    coin_collected: "gold_collected",
    inventory_opened: "inventory_opened",
    player_moved: "player_moved",
    moved: "player_moved",
    player_attacked: "player_attacked",
    attack_performed: "player_attacked",
    player_damaged: "player_damaged",
    damage_taken: "player_damaged",
    npc_spoken: "npc_spoken",
    npc_talked: "npc_spoken",
    dialogue_complete: "npc_spoken"
  };

  function canonicalEvent(type, payload) {
    var normalized = key(type);
    var event = EVENT_ALIASES[normalized] || normalized;
    var tokens = payloadTokens(payload, event);
    if (event === "npc_spoken" && tokens.indexOf("wizard") >= 0) return "wizard_spoken";
    if (event === "enemy_killed" && payload && (payload.isBoss || payload.boss === true)) return "boss_killed";
    return event;
  }

  function payloadTokens(payload, event) {
    payload = payload || {};
    var values = [];
    ["id", "target", "itemId", "itemID", "npcId", "npcID", "enemyId", "enemyID", "boss", "bossId", "bossID", "world", "worldId", "worldID", "area", "areaId", "areaID", "chestId", "chestID", "rescueId", "name", "type", "kind", "slot"].forEach(function (name) {
      if (payload[name] !== undefined && payload[name] !== null) values.push(payload[name]);
    });
    list(payload.tags).concat(list(payload.aliases), list(payload.categories)).forEach(function (value) { values.push(value); });
    if (event === "wizard_spoken") values.push("wizard");
    if (event === "guard_cleared") values.push("guard", "entrance_guard");
    return unique(values.map(key));
  }

  function normalizePayload(payload) {
    if (payload === null || payload === undefined) return {};
    if (typeof payload === "string") return { target: payload, id: payload };
    if (typeof payload === "number") return { amount: payload };
    return payload;
  }

  function worldOf(game, payload) {
    payload = payload || {};
    var candidates = [payload.worldId, payload.worldID, payload.world, payload.mapId, payload.map];
    if (game) {
      candidates.push(game.currentWorldId, game.currentWorld, game.worldId, game.world);
      if (game.state) candidates.push(game.state.currentWorld, game.state.worldId);
    }
    for (var i = 0; i < candidates.length; i += 1) {
      var value = candidates[i];
      if (value && typeof value === "object") value = value.id || value.key || value.name;
      if (value !== null && value !== undefined && value !== "") return key(value);
    }
    return "";
  }

  function newFacts() {
    return {
      flags: {},
      counters: {},
      unique: {},
      worldsVisited: ["elaria"],
      bossesKilled: []
    };
  }

  function newObjectiveState(definition) {
    return { id: definition.id, current: 0, complete: false, seen: [] };
  }

  function newQuestState(definition, now) {
    var limit = Math.max(0, number(definition.timeLimit, 0));
    return {
      id: definition.id,
      status: "active",
      acceptedAt: now,
      deadline: null,
      timeRemaining: limit || null,
      failedAt: null,
      completedAt: null,
      currentObjective: 0,
      objectives: definition.objectives.map(newObjectiveState),
      rewardsClaimed: false,
      rewardDelivery: {},
      tracked: false
    };
  }

  function QuestManager(game, savedState, options) {
    this.game = game || null;
    this.options = options || {};
    this.states = Object.create(null);
    this.flags = Object.create(null);
    this.unlockedWorlds = ["elaria"];
    this.facts = newFacts();
    this.trackedQuestId = null;
    this.listeners = Object.create(null);
    this.lastError = null;
    this._loading = false;

    if (savedState) {
      if (!this.load(savedState) && this.options.autoStart !== false) {
        this.startQuest("awakening", { force: true, silent: true });
      }
    } else if (this.options.autoStart !== false) {
      this.startQuest("awakening", { force: true, silent: true });
    }
  }

  QuestManager.prototype.setGame = function (game) {
    this.game = game || null;
    this.sync();
    this.retryPendingRewards();
    return this;
  };

  QuestManager.prototype.on = function (type, callback) {
    var event = key(type) || "change";
    if (typeof callback !== "function") return function () {};
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    var self = this;
    return function () { self.off(event, callback); };
  };

  QuestManager.prototype.off = function (type, callback) {
    var callbacks = this.listeners[key(type)] || [];
    this.listeners[key(type)] = callbacks.filter(function (entry) { return entry !== callback; });
  };

  QuestManager.prototype._emit = function (type, detail) {
    if (this._loading) return;
    var event = key(type);
    var payload = merge({ type: event, manager: this }, detail || {});
    var callbacks = (this.listeners[event] || []).concat(this.listeners.change || []);
    callbacks.slice().forEach(function (callback) {
      try { callback(payload); } catch (error) { global.setTimeout(function () { throw error; }, 0); }
    });
    if (typeof global.dispatchEvent === "function" && typeof global.CustomEvent === "function") {
      try {
        global.dispatchEvent(new global.CustomEvent("elaria:quest", { detail: payload }));
        global.dispatchEvent(new global.CustomEvent("elaria:quest:" + event, { detail: payload }));
      } catch (_error) { /* DOM events are an optional integration path. */ }
    }
  };

  QuestManager.prototype.definition = function (id) {
    return QUEST_DEFS[key(id)] || null;
  };

  QuestManager.prototype.hasQuest = function (id) {
    return !!this.states[key(id)];
  };

  QuestManager.prototype.isActive = function (id) {
    var state = this.states[key(id)];
    return !!state && state.status === "active";
  };

  QuestManager.prototype.isCompleted = function (id) {
    var state = this.states[key(id)];
    return !!state && state.status === "completed";
  };

  QuestManager.prototype.isComplete = QuestManager.prototype.isCompleted;

  QuestManager.prototype.isAvailable = function (id) {
    var definition = this.definition(id);
    if (!definition) return false;
    var existing = this.states[definition.id];
    if (definition.difficulty && this.game && this.game.difficultyName !== definition.difficulty) return false;
    if (existing && !(existing.status === "failed" && definition.repeatable)) return false;
    return list(definition.prerequisites).every(function (questId) {
      return this.isCompleted(questId);
    }, this);
  };

  QuestManager.prototype._autoStartEligible = function (worldId) {
    var normalizedWorld = key(worldId);
    QUEST_LIST.forEach(function (definition) {
      if (!this.isAvailable(definition.id)) return;
      if (definition.autoStartOnPrereq && !normalizedWorld) {
        this.startQuest(definition.id);
        return;
      }
      if (!definition.autoStartOnWorld || !normalizedWorld) return;
      var worlds = WORLD_ALIASES[key(definition.world)] || [definition.world];
      if (worlds.map(key).indexOf(normalizedWorld) >= 0) this.startQuest(definition.id);
    }, this);
  };

  QuestManager.prototype.startQuest = function (id, options) {
    options = options || {};
    var definition = this.definition(id);
    if (!definition) return null;
    var existing = this.states[definition.id];
    if (existing && existing.status === "failed" && definition.repeatable) {
      delete this.states[definition.id];
      existing = null;
    }
    if (existing) return this.getQuest(definition.id);
    if (!options.force && !this.isAvailable(definition.id)) return null;

    var state = newQuestState(definition, Date.now());
    this.states[definition.id] = state;
    if (!this.trackedQuestId || definition.type === "main" || definition.type === "boss") {
      this.setTracked(definition.id, { silent: true });
    }
    if (!options.silent) this._emit("accepted", { quest: this.getQuest(definition.id) });
    if (!options.skipSync) this._syncQuest(state);
    return this.getQuest(definition.id);
  };

  QuestManager.prototype.acceptQuest = QuestManager.prototype.startQuest;

  QuestManager.prototype.abandonQuest = function (id) {
    var definition = this.definition(id);
    var state = definition && this.states[definition.id];
    if (!definition || !state || state.status !== "active" || definition.type === "main" || definition.type === "boss") return false;
    delete this.states[definition.id];
    if (this.trackedQuestId === definition.id) this.trackedQuestId = null;
    this._emit("abandoned", { questId: definition.id });
    return true;
  };

  QuestManager.prototype.setTracked = function (id, options) {
    options = options || {};
    id = key(id);
    var state = this.states[id];
    if (!state || state.status !== "active") return false;
    Object.keys(this.states).forEach(function (questId) { this.states[questId].tracked = false; }, this);
    state.tracked = true;
    this.trackedQuestId = id;
    if (!options.silent) this._emit("tracked", { quest: this.getQuest(id) });
    return true;
  };

  QuestManager.prototype.trackQuest = QuestManager.prototype.setTracked;

  QuestManager.prototype._activeObjectiveIndex = function (state) {
    for (var i = 0; i < state.objectives.length; i += 1) {
      if (!state.objectives[i].complete) return i;
    }
    return state.objectives.length;
  };

  QuestManager.prototype._completeObjectiveAt = function (state, index, source) {
    var definition = QUEST_DEFS[state.id];
    var objectiveDefinition = definition.objectives[index];
    var objectiveState = state.objectives[index];
    if (!objectiveDefinition || !objectiveState || objectiveState.complete) return false;
    objectiveState.current = objectiveDefinition.count;
    objectiveState.complete = true;
    state.currentObjective = this._activeObjectiveIndex(state);
    this._emit("objective_completed", {
      questId: state.id,
      quest: this.getQuest(state.id),
      objective: copy(objectiveDefinition),
      source: source || "progress"
    });
    if (state.currentObjective >= definition.objectives.length) this.completeQuest(state.id);
    return true;
  };

  QuestManager.prototype._matches = function (objectiveDefinition, event, payload) {
    if (objectiveDefinition.event !== event) return false;
    var tokens = payloadTokens(payload, event);
    var targets = list(objectiveDefinition.targets).map(key).filter(Boolean);
    var categories = list(objectiveDefinition.categories).concat(list(objectiveDefinition.tags)).map(key).filter(Boolean);
    var slots = list(objectiveDefinition.slots).map(key).filter(Boolean);

    if (slots.length) {
      var payloadSlots = [payload.slot, payload.equipmentSlot, payload.category, payload.item && (payload.item.slot || payload.item.category)].map(key).filter(Boolean);
      if (!payloadSlots.some(function (slot) { return slots.indexOf(slot) >= 0; })) return false;
      if (objectiveDefinition.anyItemInSlot) targets = [];
    }
    if (categories.length && !targets.length) {
      if (!tokens.some(function (token) { return categories.indexOf(token) >= 0; })) return false;
    } else if (targets.length && !tokens.some(function (token) { return targets.indexOf(token) >= 0 || categories.indexOf(token) >= 0; })) {
      return false;
    }

    var allowedWorlds = list(objectiveDefinition.worlds).map(key).filter(Boolean);
    if (allowedWorlds.length) {
      var currentWorld = worldOf(this.game, payload);
      if (currentWorld && allowedWorlds.indexOf(currentWorld) < 0) return false;
    }
    return payload.success !== false && payload.cancelled !== true;
  };

  QuestManager.prototype._eventAmount = function (payload) {
    if (payload.total !== undefined) return { amount: Math.max(0, number(payload.total, 0)), absolute: true };
    if (payload.progress !== undefined && payload.absolute) return { amount: Math.max(0, number(payload.progress, 0)), absolute: true };
    return { amount: Math.max(1, number(payload.amount !== undefined ? payload.amount : payload.quantity, 1)), absolute: false };
  };

  QuestManager.prototype._progressObjectiveAt = function (state, index, event, payload) {
    var definition = QUEST_DEFS[state.id];
    var objectiveDefinition = definition.objectives[index];
    var objectiveState = state.objectives[index];
    if (!this._matches(objectiveDefinition, event, payload) || objectiveState.complete) return false;

    if (objectiveDefinition.unique) {
      var tokens = payloadTokens(payload, event);
      var identity = key(payload.uniqueId || payload.instanceId || payload.id || payload.npcId || payload.areaId || payload.chestId || tokens[0]);
      if (identity) {
        if (objectiveState.seen.indexOf(identity) >= 0) return false;
        objectiveState.seen.push(identity);
      }
    }

    var change = this._eventAmount(payload);
    objectiveState.current = Math.min(objectiveDefinition.count, change.absolute ? change.amount : objectiveState.current + change.amount);
    this._emit("progress", {
      questId: state.id,
      quest: this.getQuest(state.id),
      objective: copy(objectiveDefinition),
      current: objectiveState.current,
      required: objectiveDefinition.count
    });
    if (objectiveState.current >= objectiveDefinition.count) this._completeObjectiveAt(state, index, "event");
    return true;
  };

  QuestManager.prototype._applyEventToQuest = function (state, event, payload) {
    if (!state || state.status !== "active") return false;
    var definition = QUEST_DEFS[state.id];
    var index = this._activeObjectiveIndex(state);
    if (index >= definition.objectives.length) return false;

    if (list(definition.catchUpEvents).map(key).indexOf(event) >= 0) {
      var later = -1;
      for (var i = index; i < definition.objectives.length; i += 1) {
        if (this._matches(definition.objectives[i], event, payload)) { later = i; break; }
      }
      if (later > index) {
        for (var skipped = index; skipped < later; skipped += 1) this._completeObjectiveAt(state, skipped, "catch_up");
        if (state.status !== "active") return true;
        index = later;
      }
    }

    if (definition.sequential !== false) return this._progressObjectiveAt(state, index, event, payload);
    var changed = false;
    for (var objectiveIndex = 0; objectiveIndex < definition.objectives.length; objectiveIndex += 1) {
      changed = this._progressObjectiveAt(state, objectiveIndex, event, payload) || changed;
    }
    return changed;
  };

  QuestManager.prototype._rememberFact = function (event, payload) {
    var tokens = payloadTokens(payload, event);
    var amount = this._eventAmount(payload).amount;
    var counter = this.facts.counters[event] || { total: 0, byTarget: {}, byWorld: {} };
    counter.total += amount;
    tokens.forEach(function (token) { counter.byTarget[token] = number(counter.byTarget[token], 0) + amount; });
    var eventWorld = worldOf(this.game, payload);
    if (eventWorld) counter.byWorld[eventWorld] = number(counter.byWorld[eventWorld], 0) + amount;
    this.facts.counters[event] = counter;

    var uniqueEvents = ["world_entered", "boss_killed", "area_discovered", "chest_opened", "npc_rescued"];
    if (uniqueEvents.indexOf(event) >= 0) {
      var uniqueFacts = this.facts.unique[event] || [];
      var identity = key(payload.uniqueId || payload.instanceId || payload.id || tokens[0]);
      if (identity && uniqueFacts.indexOf(identity) < 0) uniqueFacts.push(identity);
      this.facts.unique[event] = uniqueFacts;
    }
    if (event === "world_entered") {
      var enteredWorld = tokens[0] || eventWorld;
      if (enteredWorld && this.facts.worldsVisited.indexOf(enteredWorld) < 0) this.facts.worldsVisited.push(enteredWorld);
    }
    if (event === "boss_killed") {
      var boss = tokens[0];
      if (boss && this.facts.bossesKilled.indexOf(boss) < 0) this.facts.bossesKilled.push(boss);
    }
    if (event === "wizard_spoken") this.facts.flags.wizard_spoken = true;
    if (event === "guard_cleared") this.facts.flags.guard_cleared = true;
  };

  QuestManager.prototype._teachFromEvent = function (event, payload) {
    var lessonMap = {
      player_moved: "movement",
      wizard_spoken: "dialogue",
      npc_spoken: "interaction",
      inventory_opened: "inventory",
      item_equipped: "equipment",
      player_attacked: "combat",
      enemy_killed: "combat",
      player_damaged: "health",
      gold_collected: "gold"
    };
    var lesson = lessonMap[event];
    if (event === "item_used" && payloadTokens(payload, event).some(function (token) { return token.indexOf("potion") >= 0; })) lesson = "potions";
    if (!lesson || this.flags["lesson_" + lesson]) return;
    this.flags["lesson_" + lesson] = true;
    this._emit("lesson", { lesson: lesson });
  };

  QuestManager.prototype.record = function (type, rawPayload) {
    var payload = normalizePayload(rawPayload);
    if (key(type) === "potion_used" && !payload.itemId && !payload.id) payload.itemId = "health_potion";
    var event = canonicalEvent(type, payload);
    if (!event) return [];
    this._rememberFact(event, payload);
    this._teachFromEvent(event, payload);

    if (event === "wizard_spoken" && !this.hasQuest("awakening")) this.startQuest("awakening", { force: true });
    if (event === "boss_killed") {
      var bossTokens = payloadTokens(payload, event);
      ["creaking_one", "nyxfang", "gorath", "velymoor"].some(function (questId) {
        var definition = QUEST_DEFS[questId];
        var bossObjective = definition.objectives[definition.objectives.length - 1];
        if (bossObjective.targets.map(key).some(function (target) { return bossTokens.indexOf(target) >= 0; }) && !this.hasQuest(questId) && this.isAvailable(questId)) {
          this.startQuest(questId);
          return true;
        }
        return false;
      }, this);
    }

    var changed = [];
    var processed = Object.create(null);
    for (var pass = 0; pass < 4; pass += 1) {
      var activeIds = this.getActiveIds();
      var foundNew = false;
      for (var i = 0; i < activeIds.length; i += 1) {
        var questId = activeIds[i];
        if (processed[questId]) continue;
        processed[questId] = true;
        foundNew = true;
        if (this._applyEventToQuest(this.states[questId], event, payload)) changed.push(questId);
      }
      if (!foundNew) break;
    }
    this.sync();
    if (event === "world_entered") {
      this._autoStartEligible(worldOf(this.game, payload) || payloadTokens(payload, event)[0]);
    }
    return unique(changed);
  };

  QuestManager.prototype.handleEvent = QuestManager.prototype.record;
  QuestManager.prototype.notify = QuestManager.prototype.record;
  QuestManager.prototype.emit = QuestManager.prototype.record;
  QuestManager.prototype.event = QuestManager.prototype.record;

  QuestManager.prototype.updateProgress = function (questId, objectiveId, amount, options) {
    options = options || {};
    var state = this.states[key(questId)];
    var definition = this.definition(questId);
    if (!state || !definition || state.status !== "active") return false;
    var index = definition.objectives.findIndex(function (entry) { return entry.id === objectiveId; });
    if (index < 0 || (definition.sequential !== false && index !== this._activeObjectiveIndex(state) && !options.force)) return false;
    var objectiveState = state.objectives[index];
    objectiveState.current = Math.min(definition.objectives[index].count, options.absolute ? Math.max(0, number(amount, 0)) : objectiveState.current + Math.max(0, number(amount, 1)));
    if (objectiveState.current >= definition.objectives[index].count) this._completeObjectiveAt(state, index, "manual");
    else this._emit("progress", { questId: state.id, quest: this.getQuest(state.id), objective: copy(definition.objectives[index]), current: objectiveState.current, required: definition.objectives[index].count });
    return true;
  };

  QuestManager.prototype.completeObjective = function (questId, objectiveId, options) {
    options = options || {};
    var state = this.states[key(questId)];
    var definition = this.definition(questId);
    if (!state || !definition || state.status !== "active") return false;
    var index = definition.objectives.findIndex(function (entry) { return entry.id === objectiveId; });
    if (index < 0 || (definition.sequential !== false && index !== this._activeObjectiveIndex(state) && !options.force)) return false;
    return this._completeObjectiveAt(state, index, "manual");
  };

  QuestManager.prototype._inventory = function () {
    var game = this.game || {};
    return game.inventory || (game.player && game.player.inventory) || (game.state && game.state.inventory) || null;
  };

  QuestManager.prototype._inventoryEntries = function () {
    var inventory = this._inventory();
    if (!inventory) return [];
    if (Array.isArray(inventory)) return inventory;
    if (Array.isArray(inventory.items)) return inventory.items;
    if (Array.isArray(inventory.slots)) return inventory.slots;
    var source = inventory.items && typeof inventory.items === "object" ? inventory.items : null;
    if (!source) return [];
    return Object.keys(source).map(function (id) {
      var value = source[id];
      if (typeof value === "number") return { id: id, quantity: value };
      return value && typeof value === "object" ? merge({ id: id }, value) : { id: id, quantity: 1 };
    });
  };

  QuestManager.prototype._itemCount = function (objectiveDefinition) {
    var inventory = this._inventory();
    var targets = list(objectiveDefinition.targets).map(key);
    var categories = list(objectiveDefinition.categories).map(key);
    var best = 0;
    if (inventory) {
      ["count", "getCount", "quantityOf", "countItem"].some(function (method) {
        if (typeof inventory[method] !== "function") return false;
        targets.forEach(function (target) {
          try { best = Math.max(best, number(inventory[method](target), 0)); } catch (_error) { /* Try the next shape. */ }
        });
        return false;
      });
    }
    var entryTotal = 0;
    this._inventoryEntries().forEach(function (entry) {
      if (!entry) return;
      var item = entry.item || entry;
      var itemKey = key(typeof item === "string" ? item : (item.id || item.itemId || entry.id || item.name));
      var itemCategories = typeof item === "string" ? [] : [item.category, item.type, item.slot].concat(list(item.tags)).map(key);
      if ((!targets.length || targets.indexOf(itemKey) >= 0) || itemCategories.some(function (category) { return categories.indexOf(category) >= 0; })) {
        var entryQuantity = entry.quantity !== undefined ? entry.quantity : (entry.qty !== undefined ? entry.qty : entry.count);
        entryTotal += Math.max(1, number(entryQuantity, 1));
      }
    });
    best = Math.max(best, entryTotal);
    var factCounter = this.facts.counters.item_collected;
    if (factCounter) {
      targets.concat(categories).forEach(function (target) { best = Math.max(best, number(factCounter.byTarget[target], 0)); });
    }
    return best;
  };

  QuestManager.prototype._equipment = function () {
    var game = this.game || {};
    var inventory = this._inventory();
    return (game.player && game.player.equipment) || game.equipment || (inventory && inventory.equipment) || (game.state && game.state.equipment) || {};
  };

  QuestManager.prototype._equippedIn = function (slots) {
    var equipment = this._equipment();
    slots = list(slots).map(key);
    for (var i = 0; i < slots.length; i += 1) {
      var slot = slots[i];
      var value = equipment[slot];
      if (value === undefined && slot === "armor") value = equipment.body || equipment.chest;
      if (value !== undefined && value !== null && value !== "" && value !== false) return value;
    }
    var inventory = this._inventory();
    if (inventory && typeof inventory.getEquipped === "function") {
      for (var j = 0; j < slots.length; j += 1) {
        try {
          var equipped = inventory.getEquipped(slots[j]);
          if (equipped) return equipped;
        } catch (_error) { /* Try the next slot. */ }
      }
    }
    return null;
  };

  QuestManager.prototype._gameFlag = function (name) {
    var game = this.game || {};
    return !!(this.flags[name] || this.facts.flags[name] || (game.flags && game.flags[name]) || (game.state && game.state.flags && game.state.flags[name]));
  };

  QuestManager.prototype._bossWasKilled = function (targets) {
    targets = targets.map(key);
    if (this.facts.bossesKilled.some(function (boss) { return targets.indexOf(key(boss)) >= 0; })) return true;
    var game = this.game || {};
    var defeated = game.bossesDefeated || (game.state && game.state.bossesDefeated);
    if (Array.isArray(defeated)) return defeated.map(key).some(function (boss) { return targets.indexOf(boss) >= 0; });
    if (defeated && typeof defeated.has === "function") return targets.some(function (boss) { return defeated.has(boss); });
    if (defeated && typeof defeated === "object") return targets.some(function (boss) { return !!defeated[boss]; });
    return false;
  };

  QuestManager.prototype._observedProgress = function (objectiveDefinition) {
    var event = objectiveDefinition.event;
    var targets = list(objectiveDefinition.targets).map(key);
    // Unique rescues, chests, and discoveries are restored from their saved
    // objective state. Generic event totals cannot safely distinguish repeats.
    if (objectiveDefinition.unique) return 0;
    if (event === "item_collected") return this._itemCount(objectiveDefinition);
    if (event === "item_equipped") return this._equippedIn(objectiveDefinition.slots) ? 1 : 0;
    if (event === "wizard_spoken") return this._gameFlag("wizard_spoken") ? 1 : 0;
    if (event === "guard_cleared") return this._gameFlag("guard_cleared") ? 1 : 0;
    if (event === "world_entered") {
      var currentWorld = worldOf(this.game, {});
      return targets.indexOf(currentWorld) >= 0 || this.facts.worldsVisited.map(key).some(function (world) { return targets.indexOf(world) >= 0; }) ? 1 : 0;
    }
    if (event === "boss_killed") return this._bossWasKilled(targets) ? 1 : 0;
    var counter = this.facts.counters[event];
    if (!counter) return 0;
    var worlds = list(objectiveDefinition.worlds).map(key);
    if (worlds.length) {
      return worlds.reduce(function (total, world) { return total + number(counter.byWorld[world], 0); }, 0);
    }
    if (targets.length) {
      return targets.reduce(function (best, target) { return Math.max(best, number(counter.byTarget[target], 0)); }, 0);
    }
    return counter.total;
  };

  QuestManager.prototype._syncQuest = function (state) {
    if (!state || state.status !== "active") return false;
    var definition = QUEST_DEFS[state.id];
    var changed = false;
    for (var safety = 0; safety < definition.objectives.length + 1 && state.status === "active"; safety += 1) {
      var index = this._activeObjectiveIndex(state);
      if (index >= definition.objectives.length) break;
      var objectiveDefinition = definition.objectives[index];
      var observed = this._observedProgress(objectiveDefinition);
      var objectiveState = state.objectives[index];
      if (observed > objectiveState.current) {
        objectiveState.current = Math.min(objectiveDefinition.count, observed);
        changed = true;
      }
      if (objectiveState.current >= objectiveDefinition.count) {
        this._completeObjectiveAt(state, index, "state_sync");
        changed = true;
        continue;
      }
      break;
    }
    return changed;
  };

  QuestManager.prototype.sync = function (game) {
    if (game) this.game = game;
    var changed = false;
    this.getActiveIds().forEach(function (id) { changed = this._syncQuest(this.states[id]) || changed; }, this);
    return changed;
  };

  QuestManager.prototype.canPassElariaGate = function () {
    return REQUIRED_GUARD_GEAR.every(function (slot) { return !!this._equippedIn([slot]); }, this);
  };

  QuestManager.prototype.canLeaveElaria = QuestManager.prototype.canPassElariaGate;

  QuestManager.prototype.getGuardDialogue = function () {
    return this.canPassElariaGate() ? GUARD_READY : GUARD_BLOCKED;
  };

  QuestManager.prototype._addGold = function (amount) {
    amount = Math.max(0, Math.floor(number(amount, 0)));
    if (!amount) return true;
    var game = this.game;
    if (!game) return false;
    var player = game.player || (game.state && game.state.player);
    try {
      if (player && typeof player.addGold === "function") { player.addGold(amount); return true; }
      if (player && typeof player.gold === "number") { player.gold += amount; return true; }
      if (typeof game.addGold === "function") { game.addGold(amount); return true; }
      if (game.inventory && typeof game.inventory.addGold === "function") { game.inventory.addGold(amount); return true; }
      if (typeof game.gold === "number") { game.gold += amount; return true; }
    } catch (error) { this.lastError = error; }
    return false;
  };

  QuestManager.prototype._addItem = function (itemId, quantity) {
    var inventory = this._inventory();
    if (!inventory) return false;
    quantity = positiveInteger(quantity, 1);
    var itemDefinition = E.ITEMS && (E.ITEMS[itemId] || E.ITEMS[key(itemId)]);
    var methods = ["add", "addItem", "give", "giveItem"];
    for (var i = 0; i < methods.length; i += 1) {
      var method = methods[i];
      if (typeof inventory[method] !== "function") continue;
      try {
        var result = inventory[method](itemId, quantity);
        if (result !== false && result !== null) return true;
      } catch (firstError) {
        if (itemDefinition) {
          try {
            var secondResult = inventory[method](itemDefinition, quantity);
            if (secondResult !== false && secondResult !== null) return true;
          } catch (secondError) { this.lastError = secondError; }
        } else {
          this.lastError = firstError;
        }
      }
    }
    if (Array.isArray(inventory)) {
      inventory.push({ id: itemId, quantity: quantity });
      return true;
    }
    if (Array.isArray(inventory.items)) {
      inventory.items.push({ id: itemId, quantity: quantity });
      return true;
    }
    return false;
  };

  QuestManager.prototype._unlockWorld = function (worldId) {
    worldId = key(worldId);
    if (!worldId) return true;
    if (this.unlockedWorlds.indexOf(worldId) < 0) this.unlockedWorlds.push(worldId);
    var game = this.game;
    if (!game) return true;
    try {
      if (typeof game.unlockWorld === "function") game.unlockWorld(worldId);
      else if (game.worlds && typeof game.worlds.unlock === "function") game.worlds.unlock(worldId);
      else if (game.unlockedWorlds && typeof game.unlockedWorlds.add === "function") game.unlockedWorlds.add(worldId);
      else if (Array.isArray(game.unlockedWorlds) && game.unlockedWorlds.indexOf(worldId) < 0) game.unlockedWorlds.push(worldId);
      else if (game.unlockedWorlds && typeof game.unlockedWorlds === "object") game.unlockedWorlds[worldId] = true;
    } catch (error) { this.lastError = error; }
    return true;
  };

  QuestManager.prototype._applyStatBonus = function (name, value) {
    var player = this.game && this.game.player;
    if (!player) return false;
    try {
      if (typeof player.addStatBonus === "function") { player.addStatBonus(name, value); return true; }
      if (typeof player[name] === "number") { player[name] += number(value, 0); return true; }
      if (player.stats && typeof player.stats[name] === "number") { player.stats[name] += number(value, 0); return true; }
    } catch (error) { this.lastError = error; }
    return false;
  };

  QuestManager.prototype._deliverRewards = function (state) {
    var definition = QUEST_DEFS[state.id];
    var rewards = definition.rewards || {};
    var delivery = state.rewardDelivery || (state.rewardDelivery = {});
    if (rewards.gold && !delivery.gold && this._addGold(rewards.gold)) delivery.gold = true;
    list(rewards.items).forEach(function (item, index) {
      var deliveryKey = "item_" + index + "_" + key(item.id);
      if (!delivery[deliveryKey] && this._addItem(item.id, item.quantity || 1)) delivery[deliveryKey] = true;
    }, this);
    list(rewards.flags).forEach(function (flag) {
      var deliveryKey = "flag_" + key(flag);
      this.flags[key(flag)] = true;
      delivery[deliveryKey] = true;
    }, this);
    list(rewards.unlockWorld).forEach(function (worldId) {
      var deliveryKey = "world_" + key(worldId);
      if (!delivery[deliveryKey] && this._unlockWorld(worldId)) delivery[deliveryKey] = true;
    }, this);
    Object.keys(rewards.stats || {}).forEach(function (stat) {
      var deliveryKey = "stat_" + key(stat);
      if (!delivery[deliveryKey] && this._applyStatBonus(stat, rewards.stats[stat])) delivery[deliveryKey] = true;
    }, this);

    var expected = [];
    if (rewards.gold) expected.push("gold");
    list(rewards.items).forEach(function (item, index) { expected.push("item_" + index + "_" + key(item.id)); });
    list(rewards.flags).forEach(function (flag) { expected.push("flag_" + key(flag)); });
    list(rewards.unlockWorld).forEach(function (worldId) { expected.push("world_" + key(worldId)); });
    Object.keys(rewards.stats || {}).forEach(function (stat) { expected.push("stat_" + key(stat)); });
    state.rewardsClaimed = expected.every(function (deliveryKey) { return !!delivery[deliveryKey]; });
    return state.rewardsClaimed;
  };

  QuestManager.prototype.claimRewards = function (id) {
    var state = this.states[key(id)];
    if (!state || state.status !== "completed") return false;
    var claimed = this._deliverRewards(state);
    this._emit("rewards", { quest: this.getQuest(state.id), claimed: claimed });
    return claimed;
  };

  QuestManager.prototype.retryPendingRewards = function () {
    var complete = true;
    Object.keys(this.states).forEach(function (id) {
      var state = this.states[id];
      if (state.status === "completed" && !state.rewardsClaimed) complete = this._deliverRewards(state) && complete;
    }, this);
    return complete;
  };

  QuestManager.prototype.completeQuest = function (id, options) {
    options = options || {};
    var state = this.states[key(id)];
    var definition = this.definition(id);
    if (!state || !definition || state.status !== "active") return false;
    if (!options.force && state.objectives.some(function (entry) { return !entry.complete; })) return false;
    if (options.force) {
      state.objectives.forEach(function (entry, index) {
        entry.current = definition.objectives[index].count;
        entry.complete = true;
      });
    }
    state.status = "completed";
    state.completedAt = Date.now();
    state.currentObjective = definition.objectives.length;
    state.tracked = false;
    if (this.trackedQuestId === state.id) this.trackedQuestId = null;
    this._deliverRewards(state);
    this._emit("completed", { quest: this.getQuest(state.id), rewards: copy(definition.rewards || {}) });

    list(definition.next).forEach(function (nextId) {
      if (!this.hasQuest(nextId) && this.isAvailable(nextId)) this.startQuest(nextId);
    }, this);
    this._autoStartEligible();
    if (!this.trackedQuestId) {
      var nextActive = this.getActiveIds()[0];
      if (nextActive) this.setTracked(nextActive, { silent: true });
    }
    return true;
  };

  QuestManager.prototype.getActiveIds = function () {
    return Object.keys(this.states).filter(function (id) { return this.states[id].status === "active"; }, this);
  };

  QuestManager.prototype.getCompletedIds = function () {
    return Object.keys(this.states).filter(function (id) { return this.states[id].status === "completed"; }, this);
  };

  QuestManager.prototype.getFailedIds = function () {
    return Object.keys(this.states).filter(function (id) { return this.states[id].status === "failed"; }, this);
  };

  QuestManager.prototype.update = function (dt) {
    if (this.game && this.game.state && this.game.state !== "playing") return;
    if (this.game && this.game.dialogue && this.game.dialogue.isOpen && this.game.dialogue.isOpen()) return;
    var now = Date.now();
    var elapsed = Math.max(0, Math.min(0.1, number(dt, 0)));
    Object.keys(this.states).forEach(function (id) {
      var state = this.states[id];
      if (!state || state.status !== "active" || state.timeRemaining === null) return;
      state.timeRemaining = Math.max(0, state.timeRemaining - elapsed);
      if (state.timeRemaining > 0) return;
      state.status = "failed";
      state.failedAt = now;
      state.tracked = false;
      if (this.trackedQuestId === id) this.trackedQuestId = null;
      var definition = QUEST_DEFS[id];
      if (this.game && this.game.ui && typeof this.game.ui.toast === "function") this.game.ui.toast((definition ? definition.title : id) + " failed. Leave the area and return to retry.", "danger");
      this._emit("failed", { quest: this.getQuest(id) });
    }, this);
    if (!this.trackedQuestId) {
      var next = this.getActiveIds()[0];
      if (next) this.setTracked(next, { silent: true });
    }
  };

  QuestManager.prototype._publicQuest = function (state) {
    if (!state) return null;
    var definition = QUEST_DEFS[state.id];
    var result = copy(definition);
    result.status = state.status;
    result.acceptedAt = state.acceptedAt;
    result.deadline = state.deadline || null;
    result.failedAt = state.failedAt || null;
    result.timeRemaining = state.timeRemaining !== null && state.status === "active" ? Math.max(0, Math.ceil(state.timeRemaining)) : null;
    result.completedAt = state.completedAt;
    result.currentObjectiveIndex = state.currentObjective;
    result.rewardsClaimed = state.rewardsClaimed;
    result.tracked = !!state.tracked;
    result.objectives = definition.objectives.map(function (objectiveDefinition, index) {
      var objectiveState = state.objectives[index];
      var entry = copy(objectiveDefinition);
      entry.current = objectiveState.current;
      entry.required = objectiveDefinition.count;
      entry.complete = objectiveState.complete;
      entry.progress = objectiveState.current + "/" + objectiveDefinition.count;
      return entry;
    });
    result.currentObjective = state.status === "active" ? result.objectives[state.currentObjective] || null : null;
    result.progress = result.objectives.length ? result.objectives.filter(function (entry) { return entry.complete; }).length + "/" + result.objectives.length : "0/0";
    result.rewardText = (definition.rewards && definition.rewards.display) || this.formatRewards(definition.rewards);
    return result;
  };

  QuestManager.prototype.getQuest = function (id) {
    return this._publicQuest(this.states[key(id)]);
  };

  QuestManager.prototype.getActive = function () {
    return this.getActiveIds().map(function (id) { return this.getQuest(id); }, this);
  };

  QuestManager.prototype.getCompleted = function () {
    return this.getCompletedIds().map(function (id) { return this.getQuest(id); }, this);
  };

  QuestManager.prototype.getAvailable = function () {
    return QUEST_LIST.filter(function (definition) { return this.isAvailable(definition.id); }, this).map(copy);
  };

  QuestManager.prototype.getTrackedQuest = function () {
    if (this.trackedQuestId && this.isActive(this.trackedQuestId)) return this.getQuest(this.trackedQuestId);
    var first = this.getActiveIds()[0];
    return first ? this.getQuest(first) : null;
  };

  QuestManager.prototype.getCurrentObjective = function (id) {
    var quest = id ? this.getQuest(id) : this.getTrackedQuest();
    return quest ? quest.currentObjective : null;
  };

  QuestManager.prototype.getHUDObjective = function () {
    var quest = this.getTrackedQuest();
    if (!quest || !quest.currentObjective) return null;
    var objectiveEntry = quest.currentObjective;
    return {
      questId: quest.id,
      questTitle: quest.title,
      text: objectiveEntry.label,
      current: objectiveEntry.current,
      required: objectiveEntry.required,
      progress: objectiveEntry.required > 1 ? objectiveEntry.current + "/" + objectiveEntry.required : "",
      timeRemaining: quest.timeRemaining
    };
  };

  QuestManager.prototype.getObjectiveText = function (id) {
    var quest = id ? this.getQuest(id) : this.getTrackedQuest();
    if (!quest) return "";
    if (quest.status === "completed") return quest.title + " — Completed";
    var current = quest.currentObjective;
    if (!current) return quest.title;
    var progress = current.required > 1 ? " (" + current.current + "/" + current.required + ")" : "";
    var timer = quest.timeRemaining !== null ? " â€¢ " + Math.floor(quest.timeRemaining / 60) + ":" + String(quest.timeRemaining % 60).padStart(2, "0") : "";
    return current.label + progress + timer;
  };

  QuestManager.prototype.formatRewards = function (rewards) {
    rewards = rewards || {};
    var parts = [];
    if (rewards.gold) parts.push(rewards.gold + " gold");
    list(rewards.items).forEach(function (item) { parts.push((item.quantity || 1) + "x " + String(item.id).replace(/_/g, " ")); });
    if (rewards.unlockWorld) parts.push("new area unlocked");
    return parts.join(", ") || "None";
  };

  QuestManager.prototype.getNpcMarker = function (npcId) {
    var npc = key(npcId);
    var active = this.getActive();
    for (var i = 0; i < active.length; i += 1) {
      var objectiveEntry = active[i].currentObjective;
      if (!objectiveEntry) continue;
      var targets = list(objectiveEntry.targets).map(key);
      if ((objectiveEntry.event === "wizard_spoken" && npc === "wizard") || targets.indexOf(npc) >= 0) {
        return { symbol: "?", kind: "objective", questId: active[i].id, color: active[i].type === "main" || active[i].type === "boss" ? "gold" : "deepskyblue" };
      }
    }
    var available = this.getAvailable();
    for (var j = 0; j < available.length; j += 1) {
      if (key(available[j].giver) === npc) return { symbol: "!", kind: "available", questId: available[j].id, color: available[j].type === "main" || available[j].type === "boss" ? "gold" : "deepskyblue" };
    }
    return null;
  };

  QuestManager.prototype.getMarker = QuestManager.prototype.getNpcMarker;

  QuestManager.prototype.getTutorialLessons = function () {
    var lessons = ["movement", "interaction", "dialogue", "inventory", "equipment", "combat", "health", "potions", "gold"];
    return lessons.reduce(function (result, lesson) {
      result[lesson] = !!this.flags["lesson_" + lesson];
      return result;
    }.bind(this), {});
  };

  QuestManager.prototype.serialize = function () {
    var states = {};
    Object.keys(this.states).forEach(function (id) { states[id] = copy(this.states[id]); }, this);
    return {
      version: SAVE_VERSION,
      states: states,
      activeQuests: this.getActiveIds(),
      completedQuests: this.getCompletedIds(),
      trackedQuestId: this.trackedQuestId,
      flags: copy(this.flags),
      facts: copy(this.facts),
      unlockedWorlds: this.unlockedWorlds.slice()
    };
  };

  QuestManager.prototype.toJSON = QuestManager.prototype.serialize;
  QuestManager.prototype.save = QuestManager.prototype.serialize;

  QuestManager.prototype._sanitizeState = function (raw, definition) {
    raw = raw || {};
    var state = newQuestState(definition, number(raw.acceptedAt, Date.now()));
    state.status = raw.status === "completed" ? "completed" : (raw.status === "failed" ? "failed" : "active");
    state.completedAt = state.status === "completed" ? number(raw.completedAt, Date.now()) : null;
    state.failedAt = state.status === "failed" ? number(raw.failedAt, Date.now()) : null;
    state.deadline = null;
    state.timeRemaining = definition.timeLimit && state.status === "active" ? Math.max(0, number(raw.timeRemaining, definition.timeLimit)) : null;
    state.rewardsClaimed = !!raw.rewardsClaimed;
    state.rewardDelivery = raw.rewardDelivery && typeof raw.rewardDelivery === "object" ? copy(raw.rewardDelivery) : {};
    state.tracked = !!raw.tracked;
    state.objectives = definition.objectives.map(function (objectiveDefinition, index) {
      var saved = raw.objectives && raw.objectives[index] || {};
      var current = Math.max(0, Math.min(objectiveDefinition.count, number(saved.current !== undefined ? saved.current : saved.progress, 0)));
      var completed = state.status === "completed" || !!saved.complete || current >= objectiveDefinition.count;
      return {
        id: objectiveDefinition.id,
        current: completed ? objectiveDefinition.count : current,
        complete: completed,
        seen: Array.isArray(saved.seen) ? unique(saved.seen.map(key)) : []
      };
    });
    state.currentObjective = this._activeObjectiveIndex(state);
    return state;
  };

  QuestManager.prototype.load = function (saved) {
    this.lastError = null;
    if (typeof saved === "string") {
      try { saved = JSON.parse(saved); } catch (error) { this.lastError = error; return false; }
    }
    if (!saved || typeof saved !== "object") return false;
    this._loading = true;
    this.states = Object.create(null);
    this.flags = merge({}, saved.flags || {});
    this.unlockedWorlds = unique(["elaria"].concat(list(saved.unlockedWorlds).map(key)));
    this.facts = merge(newFacts(), saved.facts || {});
    this.facts.flags = merge({}, this.facts.flags || {});
    this.facts.counters = this.facts.counters && typeof this.facts.counters === "object" ? this.facts.counters : {};
    this.facts.unique = this.facts.unique && typeof this.facts.unique === "object" ? this.facts.unique : {};
    Object.keys(this.facts.counters).forEach(function (event) {
      var rawCounter = this.facts.counters[event];
      if (!rawCounter || typeof rawCounter !== "object") rawCounter = {};
      this.facts.counters[event] = {
        total: Math.max(0, number(rawCounter.total, 0)),
        byTarget: rawCounter.byTarget && typeof rawCounter.byTarget === "object" ? merge({}, rawCounter.byTarget) : {},
        byWorld: rawCounter.byWorld && typeof rawCounter.byWorld === "object" ? merge({}, rawCounter.byWorld) : {}
      };
    }, this);
    Object.keys(this.facts.unique).forEach(function (event) {
      this.facts.unique[event] = Array.isArray(this.facts.unique[event]) ? unique(this.facts.unique[event].map(key)) : [];
    }, this);
    this.facts.worldsVisited = unique(list(this.facts.worldsVisited).concat("elaria").map(key));
    this.facts.bossesKilled = unique(list(this.facts.bossesKilled).map(key));

    var rawStates = saved.states || saved.quests;
    if (rawStates && !Array.isArray(rawStates) && typeof rawStates === "object") {
      Object.keys(rawStates).forEach(function (id) {
        var definition = this.definition(id);
        if (definition) this.states[definition.id] = this._sanitizeState(rawStates[id], definition);
      }, this);
    } else {
      list(saved.activeQuests || saved.currentQuests).forEach(function (entry) {
        var id = key(typeof entry === "string" ? entry : entry && entry.id);
        var definition = this.definition(id);
        if (definition) this.states[id] = this._sanitizeState(typeof entry === "object" ? entry : { status: "active" }, definition);
      }, this);
      list(saved.completedQuests).forEach(function (entry) {
        var id = key(typeof entry === "string" ? entry : entry && entry.id);
        var definition = this.definition(id);
        if (definition) this.states[id] = this._sanitizeState(merge(typeof entry === "object" ? entry : {}, { status: "completed", rewardsClaimed: typeof entry === "object" ? !!entry.rewardsClaimed : true }), definition);
      }, this);
    }

    this.trackedQuestId = key(saved.trackedQuestId || "");
    if (!this.isActive(this.trackedQuestId)) {
      this.trackedQuestId = this.getActiveIds()[0] || null;
    }
    Object.keys(this.states).forEach(function (id) { this.states[id].tracked = id === this.trackedQuestId; }, this);
    if (!this.hasQuest("awakening") && !this.getCompletedIds().length && this.options.autoStart !== false) {
      this.states.awakening = newQuestState(QUEST_DEFS.awakening, Date.now());
      this.trackedQuestId = "awakening";
      this.states.awakening.tracked = true;
    }
    this._loading = false;
    this.sync();
    this.retryPendingRewards();
    this._emit("loaded", { active: this.getActiveIds(), completed: this.getCompletedIds() });
    return true;
  };

  QuestManager.prototype.deserialize = QuestManager.prototype.load;
  QuestManager.prototype.hydrate = QuestManager.prototype.load;

  QuestManager.prototype.reset = function (autoStart) {
    this.states = Object.create(null);
    this.flags = Object.create(null);
    this.unlockedWorlds = ["elaria"];
    this.facts = newFacts();
    this.trackedQuestId = null;
    if (autoStart !== false) this.startQuest("awakening", { force: true, silent: true });
    this._emit("reset", {});
  };

  E.QUEST_DEFS = QUEST_DEFS;
  E.QUEST_LIST = QUEST_LIST;
  E.QuestManager = QuestManager;
  E.QuestSystem = QuestManager;
  E.Quests = {
    VERSION: SAVE_VERSION,
    definitions: QUEST_DEFS,
    list: QUEST_LIST,
    worlds: WORLD_ALIASES,
    guardDialogue: { blocked: GUARD_BLOCKED, ready: GUARD_READY },
    create: function (game, savedState, options) { return new QuestManager(game, savedState, options); },
    canonicalEvent: canonicalEvent
  };
})(window);
