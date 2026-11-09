// priority: 20
// FESTIVITY LOOT (DRAFT v5, 2026-11-08: FL_LOG off for promotion; v4 2026-11-05) - LootJS 3.7.0 for KubeJS 2101. Doc v2.2 section 15 "Presents and loot".
// v3 TEST: the santa_rare table works; the LootJS block modifier on present blocks did nothing (Supplementaries presents drop themselves
// from the block entity, so the band additions never landed). v4: the band drops are spawned by our own BlockEvents.broken handler
// (same event Phase 1 already uses for presents), which works no matter how the present mod drops its block. LootJS only builds the table.
// Bands: <=24 coal + a poisonous potato appear with the present | 25-39 half the time one coal | 40-79 nothing extra | 80-89 cookies 60% | 90+ cookies + 15% rare gift.

const FL = Fest;
const FL_LOG = false;  // TEST: log every present break with the value and what was added. false for promotion (v5).

// 1) Santa's rare gift table (festivity.js dawn gift at 90+: /loot give <p> loot chop:santa_rare). TEST round 3: PASS.
LootJS.lootTables(event => {
  event.create('chop:santa_rare').createPool(pool => {
    pool.rolls(1);
    pool.addEntry(LootEntry.of(Item.of('minecraft:music_disc_otherside')).withWeight(2));
    pool.addEntry(LootEntry.of(Item.of('minecraft:music_disc_pigstep')).withWeight(2));
    pool.addEntry(LootEntry.of(Item.of('fairylights:fairy_light', 4)).withWeight(6));
    pool.addEntry(LootEntry.of(Item.of('christmas_hearthlight:christmas_gift_box', 2)).withWeight(3));
    pool.addEntry(LootEntry.of(Item.of('minecraft:enchanted_book')).withWeight(4).enchantRandomly());
    pool.addEntry(LootEntry.of(Item.of('minecraft:cake')).withWeight(6));
    pool.addEntry(LootEntry.of(Item.of('minecraft:cookie', 12)).withWeight(10));
  });
});

// 2) Band-driven extras when a present block is broken by a player (tag chop:present_blocks, see 05_tags.js)
function flDrop(server, b, item, count) { FL.cmd(server, 'summon minecraft:item ' + b.x + ' ' + (b.y + 0.5) + ' ' + b.z + ' {Item:{id:"' + item + '",count:' + count + '}}'); }
BlockEvents.broken(event => {
  try {
    let p = event.player; if (!p || !p.server) return;
    let b = event.block; if (!b.hasTag('chop:present_blocks')) return;
    let server = p.server, v = FL.value(server), added = [];
    if (v <= 24) {
      let n = 1 + Math.floor(Math.random() * 3); flDrop(server, b, 'minecraft:coal', n); added.push('coal x' + n);
      flDrop(server, b, 'minecraft:poisonous_potato', 1); added.push('poisonous_potato');
    } else if (v <= 39) {
      if (Math.random() < 0.5) { flDrop(server, b, 'minecraft:coal', 1); added.push('coal'); }
    } else if (v >= 80) {
      if (Math.random() < 0.6) { let n = 2 + Math.floor(Math.random() * 3); flDrop(server, b, 'minecraft:cookie', n); added.push('cookie x' + n); }
      if (v >= 90 && Math.random() < 0.15) { FL.cmd(server, 'loot spawn ' + b.x + ' ' + (b.y + 0.5) + ' ' + b.z + ' loot chop:santa_rare'); added.push('santa_rare roll'); }
    }
    if (FL_LOG) console.log('[Festivity] present broken by ' + p.username + ' (' + b.id + ') at value ' + Math.round(v) + ': ' + (added.length ? added.join(', ') : 'nothing extra'));
  } catch (e) { console.warn('[Festivity] present extras skipped: ' + e); }
});

console.log('[Festivity] loot draft v5 loaded (log ' + FL_LOG + ')');
