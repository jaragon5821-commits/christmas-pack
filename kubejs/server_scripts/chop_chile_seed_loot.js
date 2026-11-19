// chop_chile_seed_loot.js v0.1.0 (Rune, 2026-11-18) - server script, LootJS 3.7.0.
// Kitchen spec s2 (coordinator 11-18 06:13Z): red chile seeds are found in village chests at a low weight. Loot only, no structure
// or worldgen change. Adds ONE extra pool to every existing loot table whose path is chests/village/... (vanilla + any mod's
// village chests; MCA / MineColonies tables are skipped): 1 roll, seeds weight 1 vs nothing weight 9 = about 1 chest in 10,
// 1-2 seeds. Does nothing until festivity:red_chile_seeds is registered (Toybox's Red Kitchen build).
// The wandering trader offer lives in Festivity Java (Toybox), same build as the seed.
(function () {
  if (typeof LootJS === 'undefined') return;
  const SEED = 'festivity:red_chile_seeds';
  const RE = /^[a-z0-9_.-]+:chests\/village\//, SKIP = /^(mca|minecolonies):/;
  LootJS.lootTables(event => {
    let ok = false;
    try { ok = Item.exists(SEED); } catch (e) {}
    if (!ok) { console.info('[chop chile seeds] ' + SEED + ' not registered - village loot unchanged'); return; }
    let n = 0;
    event.getLootTableIds().forEach(rl => {
      let id = String(rl);
      if (!RE.test(id) || SKIP.test(id)) return;
      try {
        event.getLootTable(id).createPool(pool => {
          pool.name('chop_red_chile_seeds');
          pool.rolls(1);
          pool.addEntry(LootEntry.of(SEED, [1, 2]).withWeight(1));
          pool.addEntry(LootEntry.empty().withWeight(9));
        });
        n++;
      } catch (e) { console.warn('[chop chile seeds] ' + id + ': ' + e); }
    });
    console.info('[chop chile seeds] seed pool added to ' + n + ' village chest table(s)');
  });
})();
