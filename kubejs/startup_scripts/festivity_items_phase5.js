// Festivity Phase 5 items (startup script: game restart). DRAFT v2b 2026-11-07 (hunger -> nutrition, KubeJS 2101). Textures by Assets at kubejs/assets/chop/textures/item/<id>.png (default KubeJS path).
StartupEvents.registry('item', event => {
  event.create('chop:sour_candy').displayName('Sour Candy').maxStackSize(64).food(f => f.nutrition(2).saturation(0.4).alwaysEdible()).tooltip('Dropped by Sour Elves. Eye-wateringly sour.');
  event.create('chop:rocky_snowball').displayName('Rocky Snowball').maxStackSize(16).tooltip('A snowball with a stone in it. Throws like one, hurts more.');
  event.create('chop:present_sack').displayName("Captain's Present Sack").maxStackSize(1).rarity('rare').tooltip('Right-click to shake out what the Elf Captain stole.');
  event.create('chop:gingerbread_chunk').displayName('Gingerbread Chunk').maxStackSize(64).tooltip('A piece of a Rotten Gingerbread Man. Nine bake a friend.');
  event.create('chop:rotten_cookie').displayName('Rotten Cookie').maxStackSize(64).food(f => f.nutrition(1).saturation(0.1).alwaysEdible().effect('minecraft:nausea', 100, 0, 1.0)).tooltip('Smells like last year.');
  event.create('chop:gingerbread_friend').displayName('Gingerbread Friend').maxStackSize(1).rarity('rare').tooltip('Right-click the ground to wake your own gingerbread pet.');
  event.create('chop:frozen_treat').displayName('Frozen Treat').maxStackSize(16).tooltip('Right-click a wild Frost Hound to tame it (a bone works too, like a wolf).');
  event.create('chop:bell_necklace').displayName('Bell Necklace').maxStackSize(1).rarity('uncommon').tooltip('Put it on a Reindeer to ride it.');
});
