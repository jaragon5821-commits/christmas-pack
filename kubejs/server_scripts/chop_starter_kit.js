// chop_starter_kit.js v0.1.1 (Scripts thread, 2026-11-08) - server script. Boss card D131 + D102.
// v0.1.1: also gives Chop's Christmas Handbook (GuideME guide chopxmas:handbook) once per player
//         under its own flag 'chopHandbook', so players who already got the v0.1.0 kit get the book too.
// First-join starter kit: given ONCE per player ever (player persistentData 'chopStarterKit'), silently.
// CLEAN JOIN rule: no chat line, no title; the items just appear in the inventory a couple of seconds after joining.
// Every item id is checked against the registry first, so a missing mod just means that item is skipped.
(function () {
  const KIT = [
    ['merrymaking:red_ugly_christmas_sweater', 1],
    ['merrymaking:red_santa_hat', 1],
    ['snowyspirit:sled_spruce', 1],
    ['comforts:sleeping_bag_red', 1],
    ['minecraft:cookie', 8],
    ['minecraft:torch', 16]
  ];
  const PAGES = [
    "Chop's Christmas Special\n\nA short guide for new arrivals.\n\nThe town remembers how you treat it. That memory is called Festivity.",
    "Festivity\n\nHelping villagers, giving gifts, donating and decorating raise it.\n\nHurting villagers, griefing and stealing lower it.\n\nNewcomers get a grace period.",
    "Nice or Naughty?\n\nNice players get warm welcomes and better trades.\n\nNaughty players end up on Santy Claws's list... and he pays in coal.",
    "Your Colony\n\nPlace a Supply Camp to start a MineColonies town. Your colonists are villagers too: they have names, moods and families.\n\nFill their requests on the Requests Board.",
    "Giving\n\nDrop spare items or Colony Bucks into a Donation Kettle. Both count the same.\n\nFrom December 1st, open one Advent Calendar door a day.",
    "Decorating\n\nOrnaments, windows and ice change style at the Chipped Glassblower.\n\nWrapping paper and sweater wool change pattern at the Loom Table.\n\nMatching windows connect.",
    "Getting Around\n\nRoads link the villages. Ride a stagecoach, a sled or a polar bear.\n\nCheck the quest book for your next step.\n\nMerry Christmas!"
  ];
  const BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
  let have = null;
  function ok(id) {
    if (!have) { have = {}; BuiltInRegistries.ITEM.keySet().forEach(k => { have[String(k)] = true; }); }
    return !!have[id];
  }
  function snbtStr(s) { return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }
  function bookCmd(name) {
    let pages = PAGES.map(t => snbtStr(JSON.stringify({ text: t }))).join(',');
    return 'give ' + name + ' minecraft:written_book[written_book_content={title:"Festivity Guide",author:"Chop",pages:[' + pages + ']}] 1';
  }
  const HANDBOOK = 'guideme:guide[guideme:guide_id="chopxmas:handbook"]';
  PlayerEvents.loggedIn(event => {
    let p = event.player;
    if (!p.persistentData.getBoolean('chopHandbook') && ok('guideme:guide')) {
      p.persistentData.putBoolean('chopHandbook', true);
      let s0 = p.server, n0 = String(p.username);
      s0.scheduleInTicks(60, () => {
        try { s0.runCommandSilent('give ' + n0 + ' ' + HANDBOOK + ' 1'); console.info('[chop kit] ' + n0 + ' got the Handbook'); }
        catch (e) { console.warn('[chop kit] handbook failed: ' + e); }
      });
    }
    if (p.persistentData.getBoolean('chopStarterKit')) return;
    p.persistentData.putBoolean('chopStarterKit', true);
    let server = p.server, name = String(p.username);
    server.scheduleInTicks(40, () => {
      let target = null;
      server.players.forEach(x => { if (String(x.username) == name) target = x; });
      if (!target) { console.warn('[chop kit] ' + name + ' left before the kit'); return; }
      try { server.runCommandSilent(bookCmd(name)); } catch (e) { console.warn('[chop kit] book failed: ' + e); }
      let given = [];
      KIT.forEach(k => { if (ok(k[0])) { target.give(Item.of(k[0], k[1])); given.push(k[0]); } });
      console.info('[chop kit] ' + name + ' got the starter kit: book + ' + given.join(', '));
    });
  });
})();
