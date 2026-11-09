// chop_crop_unify.js v0.3.1 (Scripts thread, 2026-11-09; v0.2.0 grapes, v0.1.0 2026-11-06) - boss card 107: duplicate crops work in EVERY recipe.
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
  const SKIP = /^(minecraft|kubejs|chop):/;

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

  ServerEvents.recipes(event => {
    let f = scan(), n = 0;
    GROUPS.forEach(g => {
      if (g.tagOnly || f[g.tag].length < 2) return;   // only real duplicates; tag-only groups are never widened
      (g.oneWay ? f[g.tag].filter(id => g.oneWay.indexOf(id) >= 0) : f[g.tag]).forEach(id => { try { event.replaceInput({ input: id }, id, '#' + g.tag); n++; } catch (e) { console.warn('[chop crops] replace ' + id + ' failed: ' + e); } });
    });
    console.info('[chop crops] widened inputs for ' + n + ' crop ids');
  });
})();
