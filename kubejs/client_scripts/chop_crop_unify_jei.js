// chop_crop_unify_jei.js v0.1.0 (Scripts thread, 2026-11-06) - boss card 107, client side.
// Hides the EXTRA seed copies in JEI/EMI so each crop shows one seed. Keeps the first mod in PREFER order.
// Seeds still drop and still plant: this only tidies the recipe viewer.
(function () {
  if (typeof RecipeViewerEvents == 'undefined') return;
  let BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
  const PREFER = ['farmersdelight', 'farm_and_charm', 'herbsandharvest', 'snowyspirit', 'festive_delight', 'merrymaking', 'minecolonies'];
  const SEED = /^([a-z0-9_.-]+):(tomato|onion|cabbage|rice|garlic|ginger)_seeds?$/;
  function rank(ns) { let i = PREFER.indexOf(ns); return i < 0 ? 99 : i; }
  RecipeViewerEvents.removeEntries('item', event => {
    let byCrop = {};
    try {
      BuiltInRegistries.ITEM.keySet().forEach(k => {
        let s = String(k), m = SEED.exec(s);
        if (!m) return;
        (byCrop[m[2]] = byCrop[m[2]] || []).push(s);
      });
    } catch (e) { console.warn('[chop crops] client registry read failed: ' + e); return; }
    Object.keys(byCrop).forEach(c => {
      let ids = byCrop[c].sort((a, b) => rank(a.split(':')[0]) - rank(b.split(':')[0]));
      ids.slice(1).forEach(id => event.remove(id));
      if (ids.length > 1) console.info('[chop crops] JEI: kept ' + ids[0] + ', hid ' + ids.slice(1).join(', '));
    });
  });
})();
