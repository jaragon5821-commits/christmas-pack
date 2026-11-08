// chop_crop_unify.js v0.1.0 (Scripts thread, 2026-11-06) - boss card 107: duplicate crops work in EVERY recipe.
// Tomato / onion / cabbage / rice / garlic (Farmer's Delight, Farm & Charm, MineColonies, Herbs and Harvest...)
// and ginger / cinnamon (Snowy Spirit, Festive Delight, Herbs and Harvest, Merrymaking) exist several times.
// 1) Tags: every copy found in the registry joins one shared c: tag (adds to chop_synergy_tags.js, never removes).
// 2) Recipes: every recipe input that names ONE copy is widened to the shared tag, so any copy works
//    (crafting, cooking pots, furnaces, and the MineColonies cook/chef, which use these same recipes).
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
    { tag: 'c:foods/ground_cinnamon', re: /^[a-z0-9_.-]+:(ground_cinnamon|cinnamon_powder)$/ }
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
    GROUPS.forEach(g => f[g.tag].forEach(id => event.add(g.tag, id)));
  });

  ServerEvents.recipes(event => {
    let f = scan(), n = 0;
    GROUPS.forEach(g => {
      if (f[g.tag].length < 2) return;   // only real duplicates
      f[g.tag].forEach(id => { try { event.replaceInput({ input: id }, id, '#' + g.tag); n++; } catch (e) { console.warn('[chop crops] replace ' + id + ' failed: ' + e); } });
    });
    console.info('[chop crops] widened inputs for ' + n + ' crop ids');
  });
})();
