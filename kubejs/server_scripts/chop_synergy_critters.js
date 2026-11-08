// chop_synergy_critters.js  v0.1.2 (TEST)  - synergy thread, 2026-11-04 (Josh YES: a + b; v0.1.1 narwhal, v0.1.2 harpseal id fix)
// (a) Bountiful Seals arctic cod -> c:foods/raw_fish / c:foods/cooked_fish, so FD and Let's Do fish recipes take it.
// (b) LootJS gift drops: winter critters (penguin, seal incl. harp_seal, snow leopard, narwhal) and cold hostiles (stray, frozen zombie)
//     sometimes drop a festive treat; hostiles can also drop a present.
// Ids are NOT hard-coded: the script scans the item / entity registries by name, so it never names a missing id
// (Item.of on a missing id logs "KubeJS errors found" in chat and breaks clean join). Nothing found = nothing added.
// Note: killing a critter still costs Festivity 'hunting' points; the drop is a small consolation, not a reward.
// KubeJS 2101: IIFE, early returns, no declarations inside nested blocks.
(function () {
  let BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
  function keys(reg) { let out = []; try { reg.keySet().forEach(k => out.push(String(k))); } catch (e) { console.warn('[chop critters] registry read failed: ' + e); } return out; }
  function path(id) { return id.substring(id.indexOf(':') + 1); }

  ServerEvents.tags('item', event => {
    keys(BuiltInRegistries.ITEM).forEach(id => {
      let p = path(id);
      if (p.indexOf('arctic_cod') < 0 || /bucket|spawn_egg/.test(p)) return;
      if (p.indexOf('cooked') >= 0) event.add('c:foods/cooked_fish', id);
      else event.add('c:foods/raw_fish', id);
    });
  });

  if (!Platform.isLoaded('lootjs')) return;
  const CRITTER = /(penguin|seal|snow_leopard|narwhal)$/;   // v0.1.2: no word boundary, so animalgarden_harpseal:harpseal matches
  const COLD_HOSTILE = /^(minecraft:stray|.*:frozen_zombie)$/;

  LootJS.modifiers(event => {
    let critters = [], hostiles = [];
    keys(BuiltInRegistries.ENTITY_TYPE).forEach(id => {
      if (COLD_HOSTILE.test(id)) hostiles.push(id);
      else if (id.indexOf('minecraft:') != 0 && CRITTER.test(path(id))) critters.push(id);
    });
    if (critters.length) event.addEntityModifier(critters).killedByPlayer()
      .addLoot(LootEntry.tag('chop:festive_treats').randomChance(0.05));
    if (hostiles.length) event.addEntityModifier(hostiles).killedByPlayer()
      .addLoot(LootEntry.tag('chop:festive_treats').randomChance(0.08))
      .addLoot(LootEntry.tag('chop:presents').randomChance(0.02));
    console.info('[chop critters] gift drops: critters=' + critters.join(',') + ' hostiles=' + hostiles.join(','));
  });
})();
