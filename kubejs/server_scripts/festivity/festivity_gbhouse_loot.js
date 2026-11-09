// priority: 20
// FESTIVITY GINGERBREAD HOUSE LOOT (v1, 2026-11-08, Josh 20:09 UTC) - LootJS 3.7.0 for KubeJS 2101. Chest table chop:chests/gingerbread_house
// for Assets' gingerbread house (its chest's LootTable NBT points here; the raid trigger lives in festivity_phase5.js section M).
// Counts / rolls: number or [min, max] only (RULES lessons). Pack candy ids are optional: added only when the item exists.
const GBL_CANDY = ['snowyspirit:candy_cane', 'seasonsgreetings:candy_cane', 'festive_delight:candy_cane', 'snowyspirit:gingerbread_cookie', 'seasonsgreetings:gingerbread_man', 'festive_delight:gingerbread_cookie'];
function gblExists(id) { try { return Item.exists(id); } catch (e) { return false; } }
LootJS.lootTables(event => {
  event.create('chop:chests/gingerbread_house').createPool(pool => {
    pool.rolls([3, 5]);
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
    console.log('[Festivity] gingerbread house loot v1: table chop:chests/gingerbread_house, ' + candies + ' pack candy id(s) added');
  });
});
console.log('[Festivity] gingerbread house loot v1 loaded');
