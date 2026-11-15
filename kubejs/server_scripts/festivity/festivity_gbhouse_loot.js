// priority: 20
// FESTIVITY GINGERBREAD HOUSE LOOT (v2 2026-11-12 X13 merge; v1 2026-11-08, Josh 20:09 UTC) - LootJS 3.7.0 for KubeJS 2101. Chest table chop:chests/gingerbread_house
// for Assets' gingerbread house (its chest's LootTable NBT points here; the raid trigger lives in festivity_phase5.js section M).
// Counts / rolls: number or [min, max] only (RULES lessons). Pack candy ids are optional: added only when the item exists.
const GBL_CANDY = ['snowyspirit:candy_cane', 'seasonsgreetings:candy_cane', 'festive_delight:candy_cane', 'snowyspirit:gingerbread_cookie', 'seasonsgreetings:gingerbread_man', 'festive_delight:gingerbread_cookie']
  .map((typeof chopMigOr == 'function' ? chopMigOr : (x => x))).filter((id, i, a) => a.indexOf(id) == i);   // 11-12 migration: Festivity ids once they exist, no duplicates
function gblExists(id) { try { return Item.exists(id); } catch (e) { return false; } }
// v2 (11-12, X13): the structures pack ships this table too; then our pool is ADDED to it instead of create() (which threw).
var GBL_ID = 'chop:chests/gingerbread_house';
LootJS.lootTables(event => {
  let merged = false, table = null;
  try { if (event.hasLootTable(GBL_ID)) { table = event.getLootTable(GBL_ID); merged = true; } } catch (e) { console.warn('[Festivity] gbhouse loot: table lookup failed: ' + e); }
  if (!table) { try { table = event.create(GBL_ID); } catch (e) { console.warn('[Festivity] gbhouse loot: create failed: ' + e); return; } }
  table.createPool(pool => {
    pool.rolls(merged ? [2, 3] : [3, 5]);
    pool.addEntry(LootEntry.of('chop:sour_candy', [2, 5]).withWeight(8));
    pool.addEntry(LootEntry.of('chop:gingerbread_chunk', [1, 3]).withWeight(7));
    pool.addEntry(LootEntry.of('chop:rotten_cookie', [1, 2]).withWeight(5));
    pool.addEntry(LootEntry.of('minecraft:cookie', [3, 8]).withWeight(8));
    pool.addEntry(LootEntry.of('minecraft:cake', 1).withWeight(3));
    pool.addEntry(LootEntry.of('minecraft:honey_bottle', [1, 2]).withWeight(4));
    pool.addEntry(LootEntry.of('minecraft:sugar', [2, 4]).withWeight(4));
    let candies = 0;
    for (let id of GBL_CANDY) if (gblExists(id)) { pool.addEntry(LootEntry.of(id, [1, 3]).withWeight(5)); candies++; }
    pool.addEntry(LootEntry.of('chop:gingerbread_friend', 1).withWeight(1));   // the rare one
    console.log('[Festivity] gingerbread house loot v2: ' + (merged ? 'pool added to the structures-pack table ' : 'created table ') + GBL_ID + ', ' + candies + ' pack candy id(s) added');
  });
});
console.log('[Festivity] gingerbread house loot v2 loaded');
