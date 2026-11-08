// chop_advent_calendar.js v0.1.0 (Scripts thread, 2026-11-06) - boss card D117, Festivity part agreed with the Festivity thread.
// Right-click chop:advent_calendar in December: open ONE door per real day (per player). You get the lowest door you
// have not opened yet, up to today's number (max 24), so missed days can be caught up one per day. No penalty ever.
// Gift per door from a small festive pool (ids checked in the registry, never guessed).
// Festivity: action 'advent' +0.3 once per player per day (cap 0.6 so the Dec 24 door can give 0.6 via mult 2).
// Outside December: an action-bar countdown. Clean join: nothing on join; messages are action-bar only.
// Test (op): /chopadvent day <1-31|0>  fakes the December day for everyone (0 = real date);  /chopadvent reset  clears your doors.
// KubeJS 2101: IIFE, early return, no declarations inside nested blocks; event.cancel() LAST.
(function () {
  const ACT = { pts: 0.3, cap: 0.6 };
  try { if (typeof FEST != 'undefined' && !FEST.ACTIONS.advent) FEST.ACTIONS.advent = ACT; } catch (e) {}
  let LocalDate = Java.loadClass('java.time.LocalDate');
  let BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');

  // door -> candidate gifts (first id that exists wins), count
  const GIFTS = {
    1: [['snowyspirit:gingerbread_cookie', 'minecraft:cookie'], 3], 2: [['minecraft:sweet_berries'], 8], 3: [['farmersdelight:hot_cocoa', 'minecraft:cookie'], 2],
    4: [['snowyspirit:candy_cane', 'minecraft:sugar'], 3], 5: [['minecraft:snowball'], 16], 6: [['chop:ribbon_token'], 1],
    7: [['chop:red_ornament'], 2], 8: [['minecraft:pumpkin_pie'], 2], 9: [['chop:gold_ornament'], 2], 10: [['minecraft:firework_rocket'], 4],
    11: [['snowyspirit:gingerbread_cookie', 'minecraft:cookie'], 4], 12: [['chop:ribbon_token'], 1], 13: [['chop:white_gift_bow'], 2],
    14: [['minecraft:honey_bottle'], 2], 15: [['chop:green_snowflake_ornament', 'chop:green_ornament'], 2], 16: [['minecraft:golden_carrot'], 3],
    17: [['chop:red_stripes_wrapping_paper'], 8], 18: [['chop:ribbon_token'], 1], 19: [['minecraft:glow_berries'], 6],
    20: [['chop:gold_jeweled_ornament', 'chop:gold_ornament'], 1], 21: [['minecraft:cake'], 1], 22: [['minecraft:firework_rocket'], 8],
    23: [['chop:red_painted_large_ornament', 'chop:red_large_ornament'], 1], 24: [['chop:ribbon_token'], 2]
  };
  let have = null;
  function exists(id) {
    if (!have) { have = {}; try { BuiltInRegistries.ITEM.keySet().forEach(k => { have[String(k)] = true; }); } catch (e) {} }
    return !!have[id];
  }
  function today(server) {
    let fake = server.persistentData.getInt('chopAdventTestDay');
    if (fake > 0) return { month: 12, day: fake, year: LocalDate.now().getYear(), fake: true };
    let d = LocalDate.now();
    return { month: d.getMonthValue(), day: d.getDayOfMonth(), year: d.getYear(), fake: false };
  }
  function tell(p, msg) { try { p.setStatusMessage(Text.of(msg).gold()); } catch (e) { try { p.displayClientMessage(Text.of(msg), true); } catch (x) {} } }

  function onClick(event) {
    if (String(event.block.id) != 'chop:advent_calendar') return false;
    if (!/main/i.test(String(event.hand))) return true;
    let p = event.player, server = p.server, t = today(server), pd = p.persistentData;
    if (t.month != 12) {
      let next = LocalDate.of(t.month == 12 ? t.year + 1 : t.year, 12, 1);
      let days = Java.loadClass('java.time.temporal.ChronoUnit').DAYS.between(LocalDate.now(), next);
      tell(p, 'The doors open on December 1st. ' + days + ' days to go!');
      return true;
    }
    let key = String(t.year), stamp = t.year + '-12-' + t.day;
    if (pd.getString('chopAdventYear') != key) { pd.putString('chopAdventYear', key); pd.putInt('chopAdventDoors', 0); pd.putString('chopAdventLast', ''); }
    if (pd.getString('chopAdventLast') == stamp) { tell(p, 'You already opened a door today. Come back tomorrow!'); return true; }
    let doors = pd.getInt('chopAdventDoors'), max = Math.min(24, t.day), door = 0;
    for (let i = 1; i <= max; i++) { if ((doors & (1 << (i - 1))) == 0) { door = i; break; } }
    if (door == 0) { tell(p, t.day >= 24 ? 'All 24 doors are open. Merry Christmas!' : 'All doors so far are open. Come back tomorrow!'); return true; }
    pd.putInt('chopAdventDoors', doors | (1 << (door - 1)));
    pd.putString('chopAdventLast', stamp);
    let g = GIFTS[door], id = g[0].filter(exists)[0] || 'minecraft:cookie';
    p.give(Item.of(id, g[1]));
    try { event.level.playSound(null, event.block.pos, 'minecraft:block.note_block.chime', 'blocks', 0.8, 1.2); } catch (e) {}
    tell(p, 'Door ' + door + ' opened! A little gift for you.');
    console.info('[chop advent] ' + p.username + ' opened door ' + door + ' (' + id + ' x' + g[1] + ')' + (t.fake ? ' [test day ' + t.day + ']' : ''));
    try { if (typeof Fest != 'undefined') Fest.score(server, p, 'advent', door == 24 ? 2 : 1, 'opened advent door ' + door); } catch (e) { console.warn('[chop advent] festivity failed: ' + e); }
    return true;
  }
  BlockEvents.rightClicked(event => { if (onClick(event)) event.cancel(); });   // cancel LAST (it throws in 2101)

  ServerEvents.commandRegistry(event => {
    const { commands: Commands, arguments: Arguments } = event;
    event.register(Commands.literal('chopadvent').requires(s => s.hasPermission(2))
      .then(Commands.literal('day').then(Commands.argument('n', Arguments.INTEGER.create(event)).executes(ctx => {
        let n = Arguments.INTEGER.getResult(ctx, 'n'); ctx.source.server.persistentData.putInt('chopAdventTestDay', n);
        ctx.source.sendSuccess(Text.of('Advent test day = ' + (n > 0 ? 'Dec ' + n : 'real date')), true); return 1; })))
      .then(Commands.literal('reset').executes(ctx => {
        let p = ctx.source.player; if (!p) return 0;
        p.persistentData.putInt('chopAdventDoors', 0); p.persistentData.putString('chopAdventLast', '');
        ctx.source.sendSuccess(Text.of('Advent doors reset for ' + p.username), true); return 1; })));
  });
})();
