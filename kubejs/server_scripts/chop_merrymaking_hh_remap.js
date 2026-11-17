// Boss picked A on 11-17: keep all 6 Merry Making recipes working.
// chop_merrymaking_hh_remap.js v0.1.0 - Mama's Merry Making recipes that needed Herbs & Harvest items.
// With H&H removed, these 6 Merry Making recipe files fail to load (their ingredients no longer exist), so
// KubeJS replaceInput cannot fix them: they are re-added here with remaining crops. Read from the
// mamas-merrymaking jar (data/merrymaking/recipe/*.json). Every id is checked against the registry first,
// so a missing item (e.g. Festivity < 0.9.172) skips that recipe and logs it instead of throwing.
// KubeJS 2101: IIFE, no declarations inside nested blocks.
(function () {
  let BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
  let reg = null;
  function has(id) {
    if (!reg) { reg = {}; try { BuiltInRegistries.ITEM.keySet().forEach(k => { reg[String(k)] = true; }); } catch (e) {} }
    return id.charAt(0) == '#' || reg[id] === true;
  }
  function firstOf(ids) { let r = null; ids.forEach(id => { if (!r && has(id)) r = id; }); return r; }

  ServerEvents.recipes(event => {
    if (!Platform.isLoaded('merrymaking') || Platform.isLoaded('herbsandharvest')) return;   // only needed once H&H is gone
    // Substitutes: H&H onion -> any onion tag; H&H corn -> corn tag; H&H sweet potato -> Festivity squash (0.9.172),
    // else a vanilla potato; H&H ground ginger -> Festivity ginger root (0.9.172); H&H fresh mint -> Festivity peppermint (0.9.172).
    let sweet = firstOf(['festivity:squash', 'minecraft:potato']);
    let ginger = firstOf(['festivity:ginger_root']);
    let mint = firstOf(['festivity:peppermint']);
    let R = [
      ['latke',          'merrymaking:latke', 1, ['minecraft:potato', '#c:crops/onion', 'minecraft:egg', 'minecraft:wheat']],
      ['poultry_dinner', 'merrymaking:stuffed_poultry_dinner', 1, ['merrymaking:quartz_platter', sweet, '#c:crops/corn', 'minecraft:carrot', 'minecraft:potato', 'minecraft:beetroot']],
      ['sweet_potato_pie', 'merrymaking:sweet_potato_pie', 1, ['minecraft:milk_bucket', 'minecraft:wheat', 'minecraft:sugar', 'minecraft:egg', sweet]],
      ['harvest_tray',   'merrymaking:harvest_tray', 1, ['merrymaking:empty_tray', sweet, '#c:crops/corn', 'minecraft:carrot', 'minecraft:apple', 'minecraft:potato', 'minecraft:sweet_berries', 'minecraft:beetroot', 'minecraft:wheat']],
      ['gingerbread_dough', 'merrymaking:gingerbread_dough', 8, [ginger, 'minecraft:milk_bucket', 'minecraft:wheat', 'minecraft:sugar', 'minecraft:egg']],
      ['mint_bottle',    'merrymaking:bottle_of_mint', 1, [mint, 'minecraft:glass_bottle']]
    ];
    R.forEach(r => {
      if (!has(r[1]) || r[3].some(i => !i || !has(i))) { console.info('[chop mm remap] skipped ' + r[0] + ' (an item is missing)'); return; }
      try { event.shapeless(Item.of(r[1], r[2]), r[3]).id('chop:merrymaking_remap/' + r[0]); console.info('[chop mm remap] added ' + r[0]); }
      catch (e) { console.warn('[chop mm remap] ' + r[0] + ' failed: ' + e); }
    });
  });
})();
