// chop_synergy_tags_letsdo.js  v0.1.1 (BIOME TEST)  - synergy thread, 2026-11-03
// Let's Do (Farm & Charm, Bakery, HerbalBrews, Candlelight) into the pack's shared tags.
// Farm & Charm already tags its crops as c:crops/* (tomato, onion, lettuce, barley, oat, corn, strawberry) and
// c:foods/*, so FD / Herbs & Harvest recipes already accept them: nothing to unify there.
// This adds the Christmas-side tags: cookies, festive treats (presents loot + Festivity), hot drinks.
// Ids from the build thread's jar dump. v0.1.1: ids are checked against the item REGISTRY (no Item.of, which logs
// an error for unknown ids and broke clean join). Lang keys are not proof: bakery:donut has a lang key but no item.
// KubeJS 2101: IIFE, early return, no declarations inside nested blocks.
(function () {
  if (!(Platform.isLoaded('bakery') || Platform.isLoaded('herbalbrews') || Platform.isLoaded('candlelight'))) return;

  let BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
  let known = null;
  function real(id) {
    if (known === null) {
      known = {};
      try { BuiltInRegistries.ITEM.keySet().forEach(k => { known[String(k)] = true; }); } catch (e) { console.warn('[chop letsdo tags] registry read failed: ' + e); }
    }
    return known[id] === true;
  }
  function addAll(event, tag, ids) { ids.filter(real).forEach(id => event.add(tag, id)); }

  let cookies = ['bakery:chocolate_glazed_cookie', 'bakery:strawberry_glazed_cookie', 'bakery:sweetberry_glazed_cookie'];
  let treats = cookies.concat([
    'bakery:chocolate_truffle', 'bakery:jam_roll', 'bakery:linzer_tart_slice',
    'bakery:apple_cupcake', 'bakery:strawberry_cupcake', 'bakery:sweetberry_cupcake',
    'bakery:chocolate_cake_slice', 'bakery:chocolate_gateau_slice', 'bakery:bundt_cake_slice',
    'bakery:strawberry_cake_slice', 'bakery:sweetberry_cake_slice', 'bakery:apple_pie_slice',
    'bakery:chocolate_tart_slice', 'bakery:glowberry_pie_slice',
    'bakery:chocolate_box', 'candlelight:chocolate_box'
  ]);
  // HerbalBrews brewed drinks are placeable; the item id may or may not carry _block, so try both
  let teaNames = ['black_tea', 'green_tea', 'oolong_tea', 'hibiscus_tea', 'lavender_tea', 'rooibos_tea', 'yerba_mate_tea', 'coffee', 'milk_coffee'];
  let drinks = [];
  teaNames.forEach(n => { drinks.push('herbalbrews:' + n); drinks.push('herbalbrews:' + n + '_block'); });

  ServerEvents.tags('item', event => {
    addAll(event, 'c:foods/cookie', cookies);
    addAll(event, 'chop:festive_treats', treats);         // presents loot (LootJS 20%) + Festivity festive treats
    addAll(event, 'c:drinks', drinks);
    addAll(event, 'chop:hot_drinks', drinks);            // spare tag for Festivity / quests (warm drinks in the cold)
  });
})();
