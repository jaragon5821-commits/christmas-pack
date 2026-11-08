// chop_donation_bucket.js  v0.1.5 (TEST passed 2026-11-05)  - scripts thread, 2026-11-05
// priority: 0   (loads after festivity.js, priority 50)
// Boss D97 option A + D98: a Salvation-Army-style donation kettle.
//   - Right-click a block in #chop:donation_bucket that stands inside a colony, holding ColonyBucks:
//     1 buck goes in (sneak: up to 5). They go straight into that colony's Town Hall inventory, the same as a
//     hopper feeding the Town Hall (Colony Autopilot counts them in the treasury).
//   - Thank-you buff: one random small buff for 10 min, once per player per in-game day.
//     Donating again the same day still pays the colony (just a thank-you, no buff).
//   - Festivity (D98): action 'charity' +0.5, once per player per day (Festivity's own daily cap).
//   - The block: #chop:donation_bucket = Assets' kettle (auto-found by id *donation_kettle / *donation_bucket);
//     vanilla cauldron only as a fallback while no kettle block exists.
//   - Clean join: nothing on join. Messages are action-bar only, to the donor.
// KubeJS 2101: IIFE, early return, no declarations inside nested blocks.
(function () {
  if (!(Platform.isLoaded('minecolonies') && Platform.isLoaded('colonyautopilot'))) return;

  const CFG = {
    TEST_CAULDRON: true,               // false once the Assets kettle block exists (add its id to BLOCKS)
    BLOCKS: [],                        // e.g. 'chop:donation_kettle' later
    SNEAK_AMOUNT: 5,
    DEBUG: false,                      // v0.1.5: TEST passed; set true to log every kettle click
    BUFF_TICKS: 12000,                 // 10 min
    CHARITY: { pts: 0.5, cap: 0.5 }    // Festivity: once a day
  };
  const BUFFS = [
    { id: 'minecraft:speed', amp: 0, t: CFG.BUFF_TICKS, name: 'Jolly Stride (Speed)' },
    { id: 'minecraft:haste', amp: 0, t: CFG.BUFF_TICKS, name: 'Busy Elf (Haste)' },
    { id: 'minecraft:luck', amp: 0, t: CFG.BUFF_TICKS, name: 'Lucky Star (Luck)' },
    { id: 'minecraft:regeneration', amp: 0, t: 600, name: 'Warm Heart (Regeneration)', extra: { id: 'minecraft:saturation', amp: 0, t: 20 } }
  ];

  let ColonyManager = Java.loadClass('com.minecolonies.api.colony.IColonyManager');
  let BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
  let Capabilities = Java.loadClass('net.neoforged.neoforge.capabilities.Capabilities');
  let ItemHandlerHelper = Java.loadClass('net.neoforged.neoforge.items.ItemHandlerHelper');

  // Festivity action (D98). Added at load so festivity.js itself stays untouched.
  try { if (typeof FEST != 'undefined' && !FEST.ACTIONS.charity) FEST.ACTIONS.charity = CFG.CHARITY; } catch (e) {}

  // ColonyBucks item id: found in the registry, never hard-coded (a wrong id would break clean join)
  let buckId = null;
  function findBuck() {
    if (buckId !== null) return buckId;
    buckId = '';
    try {
      BuiltInRegistries.ITEM.keySet().forEach(k => {
        let s = String(k);
        if (buckId == '' && s.indexOf('colonyautopilot:') == 0 && /buck/.test(s)) buckId = s;
      });
    } catch (e) { console.warn('[chop donate] registry read failed: ' + e); }
    console.info('[chop donate] ColonyBucks item: ' + (buckId || 'NOT FOUND'));
    return buckId;
  }

  // v0.1.1: the custom kettle (Assets) is found by name: any block whose id ends in donation_kettle / donation_bucket.
  // If one exists, the vanilla cauldron fallback is NOT tagged (cauldrons stay normal cauldrons).
  ServerEvents.tags('block', event => {
    let found = CFG.BLOCKS.slice();
    try {
      BuiltInRegistries.BLOCK.keySet().forEach(k => { let s = String(k); if (/:(.*_)?donation_(kettle|bucket)$/.test(s) && found.indexOf(s) < 0) found.push(s); });
    } catch (e) { console.warn('[chop donate] block registry read failed: ' + e); }
    if (found.length == 0 && CFG.TEST_CAULDRON) found.push('minecraft:cauldron');
    found.forEach(id => event.add('chop:donation_bucket', id));
    kettleIds = found;
    console.info('[chop donate] kettle blocks: ' + found.join(','));
  });

  function dayOf(server) {
    let lvl = server.overworld();
    try { return Math.floor(Number(lvl.getDayTime()) / 24000); } catch (e) {}
    try { return Math.floor(Number(lvl.dayTime) / 24000); } catch (e) {}
    return 0;
  }
  function tell(player, msg) { console.info('[chop donate] ' + player.username + ': ' + msg); try { player.setStatusMessage(Text.of(msg).gold()); } catch (e) { try { player.displayClientMessage(Text.of(msg), true); } catch (x) {} } }

  let kettleIds = [];   // v0.1.2: filled by the tag event, used as a direct fallback to the tag check
  function isKettle(block) {
    let bid = String(block.id);
    if (kettleIds.indexOf(bid) >= 0) return true;
    try { if (block.hasTag('chop:donation_bucket')) return true; } catch (e) {}
    try { if (block.blockState.is(Java.loadClass('net.minecraft.tags.BlockTags').create('chop:donation_bucket'))) return true; } catch (e) {}
    return false;
  }

  function onClick(event) {   // v0.1.4: returns true when it handled the click
    let block = event.block, player = event.player;
    let hand = String(event.hand), bid = String(block.id), item = String(event.item.id);
    let kettle = isKettle(block);
    if (CFG.DEBUG && (kettle || /donation|cauldron/.test(bid))) console.info('[chop donate] click: hand=' + hand + ' block=' + bid + ' kettle=' + kettle + ' item=' + item + ' buck=' + findBuck());
    if (!/main/i.test(hand)) return;
    if (!kettle) return;
    let id = findBuck();
    if (!id || String(event.item.id) != id) return;
    let level = event.level, pos = block.pos;
    let colony = null;
    try { colony = ColonyManager.getInstance().getColonyByPosFromWorld(level, pos); } catch (e) { console.info('[chop donate] colony lookup error: ' + e); }
    if (!colony) { tell(player, 'This kettle is not inside a colony.'); return true; }
    let th = null;
    try { th = colony.getServerBuildingManager().getTownHall(); } catch (e) { console.info('[chop donate] getTownHall (server manager) error: ' + e); }
    try { if (!th) th = colony.getBuildingManager().getTownHall(); } catch (e) { console.info('[chop donate] getTownHall error: ' + e); }
    if (!th) { tell(player, 'This colony has no Town Hall yet.'); return true; }
    let handler = null;
    let thPos = th.getID();
    if (!level.isLoaded(thPos)) { tell(player, 'The Town Hall is not loaded right now.'); return true; }
    // v0.1.3: three ways to the Town Hall's inventory (block capability = what a hopper uses; then the tile; then the building)
    try { handler = level.getCapability(Capabilities.ItemHandler.BLOCK, thPos, null); } catch (e) { console.info('[chop donate] block capability error: ' + e); }
    if (!handler) { try { let te = level.getBlockEntity(thPos); if (te && typeof te.getInventory == 'function') handler = te.getInventory(); } catch (e) { console.info('[chop donate] tile inventory error: ' + e); } }
    if (!handler) { try { if (typeof th.getItemHandlerCap == 'function') handler = th.getItemHandlerCap(); } catch (e) { console.info('[chop donate] building inventory error: ' + e); } }
    if (!handler) { tell(player, 'Could not reach the Town Hall storage (at ' + thPos + ').'); return true; }
    if (CFG.DEBUG) console.info('[chop donate] town hall ' + thPos + ' handler ' + handler + ' slots ' + handler.getSlots());

    let want = player.isShiftKeyDown() ? CFG.SNEAK_AMOUNT : 1;
    let n = Math.min(want, event.item.count);
    let rest = ItemHandlerHelper.insertItem(handler, event.item.copyWithCount(n), false);
    let given = n - (rest ? rest.getCount() : 0);
    if (given <= 0) { tell(player, 'The Town Hall is full. Try again later.'); return true; }
    event.item.shrink(given);
    console.info('[chop donate] ' + player.username + ' gave ' + given + ' to colony ' + colony.getID());

    // sound + a puff
    try { level.playSound(null, pos, 'minecraft:block.note_block.bell', 'blocks', 0.8, 1.4); } catch (e) {}
    try { level.spawnParticles('minecraft:happy_villager', true, pos.x + 0.5, pos.y + 1.1, pos.z + 0.5, 0.3, 0.2, 0.3, 6, 0); } catch (e) {}

    let pd = player.persistentData, today = dayOf(player.server);
    if (pd.getInt('chopDonateDay') == today + 1) { tell(player, 'Thank you! (' + given + ' to ' + colony.getName() + ')'); return true; }
    pd.putInt('chopDonateDay', today + 1);    // +1 so day 0 differs from "never"
    let b = BUFFS[Math.floor(Math.random() * BUFFS.length)];
    player.potionEffects.add(b.id, b.t, b.amp, false, true);
    if (b.extra) player.potionEffects.add(b.extra.id, b.extra.t, b.extra.amp, false, false);
    tell(player, 'Thank you! ' + b.name + ' for being kind.');
    try { if (typeof Fest != 'undefined') Fest.score(player.server, player, 'charity', 1, 'gave to the colony'); } catch (e) { console.warn('[chop donate] festivity failed: ' + e); }
    return true;
  }
  BlockEvents.rightClicked(event => { if (onClick(event)) event.cancel(); });   // cancel LAST: in KubeJS 2101 cancel() throws and ends the handler
})();
