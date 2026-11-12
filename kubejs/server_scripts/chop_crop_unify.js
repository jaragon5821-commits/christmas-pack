// chop_crop_unify.js v0.3.3 (Scripts thread, 2026-11-10; v0.3.2 2026-11-09; v0.2.0 grapes, v0.1.0 2026-11-06) - boss card 107: duplicate crops work in EVERY recipe.
// Tomato / onion / cabbage / rice / garlic (Farmer's Delight, Farm & Charm, MineColonies, Herbs and Harvest...)
// and ginger / cinnamon (Snowy Spirit, Festive Delight, Herbs and Harvest, Merrymaking) exist several times.
// 1) Tags: every copy found in the registry joins one shared c: tag (adds to chop_synergy_tags.js, never removes).
// 2) Recipes: every recipe input that names ONE copy is widened to the shared tag, so any copy works
//    (crafting, cooking pots, furnaces, and the MineColonies cook/chef, which use these same recipes).
// v0.2.0: grapes (Let's Do Vinery + Herbs and Harvest). ONE-WAY: only Herbs and Harvest's generic grapes are widened,
//         so its juice/pitchers take any Vinery grape, while Vinery wines keep their own red/white/biome grapes.
// v0.3.0: compat pass 2 (Boss Board D138, default set A1 A2 B1-B4 B7): knives (TAG ONLY: never widened, so knife upgrade/smithing
//         recipes stay strict), rolling pins, rope, flour, plain dough, milk bottles, and more duplicate crops (corn, strawberry, lettuce,
//         bell pepper, eggplant, soybean, peas, mint, chickpea, cranberry, chestnut). Every group logs what it found.
//         v0.3.1 adds B5 butter / chocolate (two-way), cheese (tag only: flavours differ), B6 raw bacon (two-way) and C1 festive tags
//         chop:stockings / chop:wreaths (tag only, for quests / loot / Festivity decor credit; different looks are never merged).
//         Non-crop groups widen to a chop:unify/* tag holding ONLY the matched copies (a shared c: tag may hold more, e.g. milk buckets),
//         and the copies are also added to the c: tag for other mods.
// v0.3.2 (Josh live test 11-10): cooking recipes (smelting / smoking / campfire / blasting) are NEVER widened. Widening FD's bacon
//         smoker recipe made Herbs and Harvest bacon cook into Farmer's Delight cooked bacon (worse food). Each mod's raw item now
//         cooks with its own recipe; crafting, cooking pots, cutting boards etc. still take any copy.
//         Also: block tag chop:ultimine_snow (vanilla snow + every Snow Real Magic snow block) for FTB Ultimine merge_tags, so a
//         snowy patch where SRM swapped some layers for its own blocks mines as ONE group (Josh 11-10: snowy ground broke one at a time).
//         Also fills a cooking gap: Merrymaking's raw ham only had a furnace recipe, so it would not go in a smoker or on a campfire.
//         Cooking audit (11-10): Farm & Charm lamb ham / minced beef cook into the mod's own cooked item in furnace + smoker too.
// v0.3.4: chop:ultimine_snow also holds grass / ferns / Winterly frozen grass (snowy grass highlighted but didn't break).
// v0.3.3: Herbs and Harvest bacon / chicken cutlet / salmon steak / sausage also cook in the smoker and on a campfire (were furnace only).
// Ids come from the registry (never Item.of on a guess: clean join).
// KubeJS 2101: IIFE, early return, no declarations inside nested blocks.
(function () {
  let BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
  const GROUPS = [
    { tag: 'c:crops/tomato',          re: /^[a-z0-9_.-]+:(tomato|tomatoes)$/ },
    { tag: 'c:crops/onion',           re: /^[a-z0-9_.-]+:onions?$/ },
    { tag: 'c:crops/cabbage',         re: /^[a-z0-9_.-]+:cabbages?$/ },
    { tag: 'c:crops/rice',            re: /^[a-z0-9_.-]+:rice$/ },
    { tag: 'c:crops/garlic',          re: /^[a-z0-9_.-]+:garlic$/ },
    { tag: 'c:crops/ginger',          re: /^[a-z0-9_.-]+:(ginger|ginger_root)$/ },
    { tag: 'c:crops/cinnamon',        re: /^[a-z0-9_.-]+:(cinnamon|cinnamon_stick|cinnamon_sticks)$/ },
    { tag: 'c:foods/ground_ginger',   re: /^[a-z0-9_.-]+:ground_ginger$/ },
    { tag: 'c:foods/ground_cinnamon', re: /^[a-z0-9_.-]+:(ground_cinnamon|cinnamon_powder)$/ },
    { tag: 'c:crops/grape',           re: /^(herbsandharvest:grapes|vinery:([a-z]+_)?grapes?(_(red|white))?)$/,
      oneWay: ['herbsandharvest:grapes'] },
    // ---- v0.3.0 compat pass 2 ----
    { tag: 'c:tools/knife',           re: /^[a-z0-9_.-]+:[a-z0-9_]*knife$/, tagOnly: true },
    { tag: 'chop:unify/rolling_pin', also: 'c:tools/rolling_pin',     re: /^[a-z0-9_.-]+:[a-z0-9_]*rolling_pin$/ },
    { tag: 'chop:unify/rope', also: 'c:ropes',       re: /^[a-z0-9_.-]+:rope$/ },
    { tag: 'chop:unify/flour', also: 'c:foods/flour',       re: /^[a-z0-9_.-]+:(flour|wheat_flour)$/ },
    { tag: 'chop:unify/dough', also: 'c:foods/dough',       re: /^[a-z0-9_.-]+:(dough|wheat_dough|bread_dough)$/ },
    { tag: 'chop:unify/milk_bottle', also: 'c:drinks/milk',       re: /^[a-z0-9_.-]+:milk_bottle$/ },
    { tag: 'c:crops/corn',            re: /^[a-z0-9_.-]+:(corn|maize)$/ },
    { tag: 'c:crops/strawberry',      re: /^[a-z0-9_.-]+:strawberr(y|ies)$/ },
    { tag: 'c:crops/lettuce',         re: /^[a-z0-9_.-]+:lettuce$/ },
    { tag: 'c:crops/bell_pepper',     re: /^[a-z0-9_.-]+:(bell_pepper|bellpepper)$/ },
    { tag: 'c:crops/eggplant',        re: /^[a-z0-9_.-]+:(eggplant|aubergine)$/ },
    { tag: 'c:crops/soybean',         re: /^[a-z0-9_.-]+:soy_?beans?$/ },
    { tag: 'c:crops/peas',            re: /^[a-z0-9_.-]+:(peas|pea_pod|pea_pods)$/ },
    { tag: 'c:crops/mint',            re: /^[a-z0-9_.-]+:mint(_leaves)?$/ },
    { tag: 'c:crops/chickpea',        re: /^[a-z0-9_.-]+:chickpeas?$/ },
    { tag: 'c:crops/cranberry',       re: /^[a-z0-9_.-]+:cranberr(y|ies)$/ },
    { tag: 'c:crops/chestnut',        re: /^[a-z0-9_.-]+:chestnuts?$/ },
    { tag: 'chop:unify/butter', also: 'c:foods/butter',        re: /^[a-z0-9_.-]+:butter$/ },
    { tag: 'chop:unify/chocolate', also: 'c:foods/chocolate',  re: /^[a-z0-9_.-]+:(chocolate|chocolate_bar|milk_chocolate)$/ },
    { tag: 'c:foods/cheese',          re: /^[a-z0-9_.-]+:([a-z_]+_)?cheese(_wedge|_slice)?$/, tagOnly: true },
    { tag: 'chop:unify/raw_bacon', also: 'c:foods/raw_bacon',  re: /^[a-z0-9_.-]+:(bacon|raw_bacon)$/ },
    { tag: 'chop:stockings',          re: /^[a-z0-9_.-]+:[a-z0-9_]*stocking$/, tagOnly: true },
    { tag: 'chop:wreaths',            re: /^[a-z0-9_.-]+:[a-z0-9_]*wreath$/, tagOnly: true }
  ];
  const NO_WIDEN = [{ type: 'minecraft:smelting' }, { type: 'minecraft:smoking' }, { type: 'minecraft:campfire_cooking' }, { type: 'minecraft:blasting' }];   // v0.3.2
  const SKIP = /^(minecraft|kubejs|chop):/;

  let reg = null;   // v0.3.2: id -> true, read once
  function scanHas(id) {
    if (!reg) { reg = {}; try { BuiltInRegistries.ITEM.keySet().forEach(k => { reg[String(k)] = true; }); } catch (e) {} }
    return reg[id] === true;
  }
  let found = null;   // tag -> [ids], read once from the registry
  function scan() {
    if (found) return found;
    found = {};
    GROUPS.forEach(g => { found[g.tag] = []; });
    try {
      BuiltInRegistries.ITEM.keySet().forEach(k => {
        let s = String(k);
        if (SKIP.test(s)) return;
        GROUPS.forEach(g => { if (g.re.test(s)) found[g.tag].push(s); });
      });
    } catch (e) { console.warn('[chop crops] registry read failed: ' + e); }
    GROUPS.forEach(g => console.info('[chop crops] ' + g.tag + ': ' + (found[g.tag].join(', ') || 'none')));
    return found;
  }

  ServerEvents.tags('item', event => {
    let f = scan();
    GROUPS.forEach(g => f[g.tag].forEach(id => { event.add(g.tag, id); if (g.also) event.add(g.also, id); }));
  });

  // v0.3.2: Ultimine snow group (block tag; registry-scanned, so only real ids; logged)
  ServerEvents.tags('block', event => {
    let ids = ['minecraft:snow'];
    try { BuiltInRegistries.BLOCK.keySet().forEach(k => { let s = String(k); if (/^snowrealmagic:.*snow/.test(s)) ids.push(s); }); } catch (e) { console.warn('[chop crops] snow scan failed: ' + e); }
    // v0.3.4 snowy plants (Josh 11-12): SRM snowy_plant/double_plant hold a plant; the upper half stays plain tall_grass and
    // breaking the snow leaves the plant, so the group looked selected but nothing seemed to break. Plants join the group.
    let plants = { 'minecraft:short_grass': 1, 'minecraft:tall_grass': 1, 'minecraft:fern': 1, 'minecraft:large_fern': 1,
      'minecraft:dead_bush': 1, 'winterly:frozen_grass': 1, 'winterly:frozen_flower': 1 };
    try { BuiltInRegistries.BLOCK.keySet().forEach(k => { let s = String(k); if (plants[s]) ids.push(s); }); } catch (e) { console.warn('[chop crops] plant scan failed: ' + e); }
    ids.forEach(id => event.add('chop:ultimine_snow', id));
    console.info('[chop crops] chop:ultimine_snow: ' + ids.join(', '));
  });

  ServerEvents.recipes(event => {
    let f = scan(), n = 0;
    GROUPS.forEach(g => {
      if (g.tagOnly || f[g.tag].length < 2) return;   // only real duplicates; tag-only groups are never widened
      (g.oneWay ? f[g.tag].filter(id => g.oneWay.indexOf(id) >= 0) : f[g.tag]).forEach(id => { try { event.replaceInput({ input: id, not: NO_WIDEN }, id, '#' + g.tag); n++; } catch (e) { console.warn('[chop crops] replace ' + id + ' failed: ' + e); } });
    });
    console.info('[chop crops] widened inputs for ' + n + ' crop ids');
    // v0.3.2: smoker + campfire for Merrymaking ham (the mod ships only a furnace recipe; same result and xp, vanilla speeds)
    // 11-12 Festivity migration: the ham pair resolves to festivity:ham / cooked_ham once those exist (000_chop_migration_ids.js)
    let hamRaw = (typeof chopMig == 'function') ? chopMig('merrymaking:ham') : 'merrymaking:ham';
    let hamCooked = (typeof chopMig == 'function') ? chopMig('merrymaking:cooked_ham') : 'merrymaking:cooked_ham';
    if (hamRaw && hamCooked && scanHas(hamRaw) && scanHas(hamCooked)) {
      event.smoking(hamCooked, hamRaw).xp(0.6).cookingTime(150).id('chop:cooking/merrymaking_ham_smoking');
      event.campfireCooking(hamCooked, hamRaw).xp(0.6).cookingTime(600).id('chop:cooking/merrymaking_ham_campfire');
    }
    // v0.3.2 (cooking audit 11-10): Farm & Charm's own furnace/smoker recipes turn lamb ham into vanilla cooked mutton and minced beef
    // into a vanilla steak, while its campfire gives the mod's cooked item. Same result everywhere now (xp/time kept).
    [['farm_and_charm:lamb_ham', 'minecraft:cooked_mutton', 'farm_and_charm:cooked_lamb_ham'],
     ['farm_and_charm:minced_beef', 'minecraft:cooked_beef', 'farm_and_charm:cooked_minced_beef']].forEach(r => {
      if (!scanHas(r[0]) || !scanHas(r[2])) return;
      try { event.replaceOutput({ input: r[0], output: r[1] }, r[1], r[2]); console.info('[chop crops] cooking fix ' + r[0] + ' -> ' + r[2]); }
      catch (e) { console.warn('[chop crops] cooking fix ' + r[0] + ' failed: ' + e); }
    });
    // v0.3.3 (cooking audit 11-10): Herbs and Harvest raw meats ship furnace recipes only; add smoker + campfire with the mod's own result.
    // Cooked ids follow the mod's cooked_<raw> naming; any pair that does not exist is skipped and logged (never guessed into a recipe).
    ['bacon', 'chicken_cutlet', 'salmon_steak', 'sausage'].forEach(n => {
      let raw = 'herbsandharvest:' + n, ck = 'herbsandharvest:cooked_' + n;
      if (!scanHas(raw) || !scanHas(ck)) { console.info('[chop crops] cooking gap skipped: ' + raw + ' / ' + ck + ' not both in registry'); return; }
      event.smoking(ck, raw).xp(0.35).cookingTime(100).id('chop:cooking/hh_' + n + '_smoking');
      event.campfireCooking(ck, raw).xp(0.35).cookingTime(600).id('chop:cooking/hh_' + n + '_campfire');
      console.info('[chop crops] cooking gap filled: ' + raw + ' -> ' + ck + ' (smoker + campfire)');
    });
  });
})();
