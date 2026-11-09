// chop_item_tooltips.js v0.1.2 (Tooltips thread, 2026-11-09; candle line needs Festivity 0.9.12c+) - CLIENT script (kubejs/client_scripts). Text only, no gameplay.
// Josh 2026-11-09: helpful English tooltips for the pack's custom items (no translations).
// Adds ONLY to items that had no hint before this (checked against Festivity 0.9.12b src lang/appendHoverText,
// Chop Autopilot chop.15 src, and the pack's KubeJS startup/client scripts on the test branch).
// Already covered elsewhere, so NOT repeated here: chop_xmas_tooltips.js (ornaments, windows, wool, paper, bows, ice,
// icing drips, advent calendar), KubeJS .tooltip() on chop:* tokens/pet items, Festivity ".lore" lines (boss drops, loot).
// Every id is checked against the item registry first, so missing mods or older jars just skip their lines.
// If a mod later gets its own tooltip for one of these ids, delete that line here so it doesn't show twice.
(function () {
  let BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
  // v0.1.2: the registry is read INSIDE the tooltip event (at script load it is still empty: Build TEST 11-09, 0 added).
  function readKnown() {
    let k = {}, n = 0;
    try { BuiltInRegistries.ITEM.keySet().forEach(r => { k[String(r)] = true; n++; }); }
    catch (e) { console.warn('[chop item tooltips] registry read failed: ' + e); }
    return n > 0 ? k : null;   // null = could not read: try every id and let try/catch skip the bad ones
  }

  // ---- exact ids ----
  const TIPS = {
    // Chop Autopilot (colonyautopilot). Town Planner proposals line needs chop.7 or newer.
    'colonyautopilot:colony_bucks': ['Colony money. Builders buy materials with it.', 'To pay in, sneak-right-click your Town Hall while holding it.', 'Drops from monsters and turns up in loot chests.'],
    'colonyautopilot:town_planner': ['Right-click to see the colony\'s plan and settings.', 'Owners and officers accept or skip proposals here.'],
    'colonyautopilot:zone_marker': ['Right-click two corners to protect an area (up to 48 per side).', 'The autopilot builds around it. Sneak-right-click inside to remove.', 'Needs officer rank.'],
    // Chop KubeJS blocks
    'chop:donation_kettle': ['Place it inside a colony. Right-click with ColonyBucks to donate 1', '(sneak: 5) straight to the Town Hall.', 'First donation each day gives you a small 10-minute buff.'],
    'chop:coal_token': ['Counts toward the Naughty List quests.'],
    'chop:ribbon_token': ['Counts toward the Nice List quests. Crafts a Blaze Heart.'],
    // Festivity blocks
    'festivity:candle_of_vigil': ['Right-click with a Coal Heart Shard to light it (holds up to 4).', 'Burns one shard every dawn, then goes out.', 'While lit, Santy Claws can\'t break into homes within 32 blocks.'],
    'festivity:toy_soldier_banner': ['When placed, Nutcrackers within 20 blocks stop fighting', 'and march to it for 1 minute.'],
    'festivity:wrapped_present': ['Plain: decoration.', 'Made by the Gift Wrap spell: place it to unwrap the block inside, contents and all.'],
    'festivity:icing_block': ['Icing Piper bridge. Melts after 10 seconds.']
  };

  // ---- generated: Festivity string lights + spell school crafting items ----
  ['warm', 'multicolour', 'twinkle', 'chase', 'fade'].forEach(s => {
    TIPS['festivity:string_lights_' + s] = ['Click a wall: strand. Click a ceiling: droop.', 'Click a post top (or sneak): deep swag. Gives light.'];
  });
  const SCHOOLS = { yuletide: ['Yuletide', 'Tinsel Caroler'], naughty: ['Naughty', 'Coal Trickster'], toymaker: ['Toymaker', 'Clockwork Tinkerer'], hearthfire: ['Hearthfire', 'Hearth Keeper'], aurora: ['Aurora', 'Aurora Seer'] };
  Object.keys(SCHOOLS).forEach(s => {
    let name = SCHOOLS[s][0], mob = SCHOOLS[s][1];
    TIPS['festivity:' + s + '_focus'] = ['Dropped by the ' + mob + '.', '8 around a Blank Rune craft one ' + name + ' Rune.'];
    TIPS['festivity:' + s + '_rune'] = ['Crafts the ' + name + ' staff, spellbook, mage armor and upgrade orb.'];
    TIPS['festivity:' + s + '_upgrade_orb'] = ['Use at an Arcane Anvil: +5% ' + name + ' Spell Power on that gear.'];
  });

  // ---- regex groups (Chop decor not covered by chop_xmas_tooltips.js) ----
  const GROUPS = [
    [/^chop:.*_icing_(block|slab)$/, ['White icing: sugar + a snowball. Dye 8 white blocks to recolor.']],
    [/^chop:.*_ribbon_block$/, ['Decoration. Counts as decorating for Festivity.']],
    [/^chop:snowy_.*/, ['Snow-capped roof block. Counts as decorating for Festivity.']],
    [/^colonyautopilot:(road|bridge)_.*/, ['Laid by the colony autopilot.']]
  ];

  let added = 0, skipped = 0;
  ItemEvents.modifyTooltips(event => {
    let known = readKnown();
    if (!known) console.warn('[chop item tooltips] item registry empty here; adding every id unchecked');
    Object.keys(TIPS).forEach(id => {
      if (known && !known[id]) { skipped++; return; }
      try { event.add(id, TIPS[id].map(t => Text.gray(t))); added++; } catch (e) { console.warn('[chop item tooltips] ' + id + ': ' + e); }
    });
    GROUPS.forEach(g => {
      try { event.add(g[0], g[1].map(t => Text.gray(t))); } catch (e) { console.warn('[chop item tooltips] ' + g[0] + ': ' + e); }
    });
    console.info('[chop item tooltips] ' + added + ' item tooltips added, ' + skipped + ' ids not in this pack (skipped), ' + GROUPS.length + ' groups');
  });
})();
