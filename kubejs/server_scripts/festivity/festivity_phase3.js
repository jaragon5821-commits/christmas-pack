// priority: 30
// FESTIVITY PHASE 3 (DRAFT v3, 2026-11-05, TEST fixes: present item fallback + scripted drop, multi-page letter without \n, non-silent debug commands) - Sour Elf heist, Naughty Letter, Santa sleigh fly-by, Town Hall anchor.
// Needs festivity.js 0.2.10+ (Phase 1: action keys + fest_lastDecorBreakKey stamp) and festivity_phase2.js loaded first. Design: doc v2.2 sections 7, 15, 18.
// Everything here is villager-safe: our mobs are separate tagged entities; nothing touches villager or citizen data.

const P3 = {
  ROLL_CHANCE: 0.10,           // per in-game day in Merry+ (on top of Phase 2 knock-downs); 0 disables the roll
  HEIST_ELVES: 3,              // thieves per heist, each carries one present (-1 each on grab, +1 back per kill)
  HEIST_RADIUS: 30,            // spawn distance from the Town Hall anchor (or a player)
  HEIST_PRESENT: ['christmas_hearthlight:christmas_gift_box', 'supplementaries:present_red', 'seasonsgreetings:present_red', 'snowyspirit:present_red', 'minecraft:chest'],   // first id that exists in the pack is used (TEST v2: the thieves held nothing, so the first id may not exist)
  LETTER_DARE_DECOR: 3,        // break this many decor blocks placed by OTHERS before dawn to "do the dare"
  LETTER_REWARD: 'minecraft:diamond 1',
  SLEIGH_MIN_BAND: 'merry',    // sleigh fly-by at dawn in Merry and Jolly
  SLEIGH_SECONDS: 12,
  LETTER_CHAT: false,          // true = also send the letter as private chat lines (fallback if the written_book give fails)
  DEBUG_CMDS: false            // TEST: run give/quest commands NON-silent so failures show in the log and op chat. Set false before promotion.
};
const R = Fest;   // Phase 1 table (data, readJson, score, change, announce, logEvent, online, dayCount, dayTime, cmd, jsonText, band, value)

function p3cmd(server, s) { if (P3.DEBUG_CMDS) { try { return server.runCommand(s); } catch (e) { console.warn('[Festivity] p3cmd fallback: ' + e); } } return R.cmd(server, s); }
let p3_present = null;
function presentItem() {
  if (p3_present) return p3_present;
  for (let id of P3.HEIST_PRESENT) { try { if (Item.exists(id)) { p3_present = id; break; } } catch (e) { try { if (Item.of(id).id == id) { p3_present = id; break; } } catch (x) {} } }
  if (!p3_present) p3_present = 'minecraft:chest';
  console.log('[Festivity] heist present item: ' + p3_present);
  return p3_present;
}
function p3json(server, key, fb) { return R.readJson(server, key, fb); }
function p3save(server, key, obj) { R.data(server).putString(key, JSON.stringify(obj)); }
function p3overworld(p) { try { return String(p.level.dimension) == 'minecraft:overworld'; } catch (e) { return true; } }
function p3isNight(server) { let t = R.dayTime(server) % 24000; return t >= 13000 && t <= 23000; }
function p3surface(level, x, z) {
  for (let y = 200; y > 40; y--) { try { let b = level.getBlock(x, y, z); if (b.id != 'minecraft:air' && b.id != 'minecraft:cave_air' && !b.id.endsWith('_leaves') && !b.id.includes('snow_layer')) return y + 1; } catch (e) {} }
  return 70;
}
// Town Hall anchor: set by an op with /festivity townhall set (stands at the doorstep). Falls back to a player.
function anchor(server) {
  let th = p3json(server, 'townhall', null);
  if (th) return th;
  for (let p of R.online(server)) if (p3overworld(p)) return { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z), player: p.username };
  return null;
}

// ---------- daily roll for Phase 3 events (Merry+, daytime, never in grace, one active Phase 3 event at a time) ----------
let p3_lastRollDay = -1;
ServerEvents.tick(event => {
  let server = event.server;
  if (server.tickCount % 100 != 0) return;
  if (R.onlineCount(server) == 0 || R.inGrace(server)) return;
  let d = R.data(server), day = R.dayCount(server), v = R.value(server);
  // run active events
  if (d.contains('heist')) heistTick(server);
  if (d.contains('letter')) letterTick(server);
  if (d.contains('sleigh')) sleighTick(server);
  // dawn: sleigh fly-by in Merry+
  let t = R.dayTime(server) % 24000;
  if (t >= 0 && t < 100 && !d.getBoolean('p3_sleighToday') && (R.band(server).id == 'merry' || R.band(server).id == 'jolly')) { d.putBoolean('p3_sleighToday', true); startSleigh(server); }
  if (t > 6000 && d.getBoolean('p3_sleighToday')) d.putBoolean('p3_sleighToday', false);
  // roll
  if (day == p3_lastRollDay || v < 60 || p3isNight(server) || d.contains('heist') || d.contains('letter') || d.contains('event')) return;
  p3_lastRollDay = day;
  if (Math.random() > P3.ROLL_CHANCE) return;
  if (Math.random() < 0.5) startHeist(server); else startLetter(server);
});

// ---------- Sour Elf heist (doc 15): thieves grab presents from the Town Hall doorstep ----------
function startHeist(server) {
  let a = anchor(server); if (!a) return;
  let ang = Math.random() * Math.PI * 2;
  let x = Math.floor(a.x + Math.cos(ang) * P3.HEIST_RADIUS), z = Math.floor(a.z + Math.sin(ang) * P3.HEIST_RADIUS), y = p3surface(server.overworld(), x, z);
  for (let i = 0; i < P3.HEIST_ELVES; i++) {
    // stray holding the present in the MAIN hand (visible, never a bow); the death handler below drops the present itself
    R.cmd(server, 'summon ' + fid('minecraft:stray') + ' ' + (x + i) + ' ' + y + ' ' + z + ' {PersistenceRequired:1b,Tags:["fest_minion","fest_heist"],HandItems:[{id:"' + presentItem() + '",count:1},{}],HandDropChances:[0f,0f],ArmorItems:[{},{},{},{id:"minecraft:leather_helmet",count:1,components:{"minecraft:dyed_color":{rgb:2263842}}}],active_effects:[{id:"minecraft:speed",amplifier:1,duration:-1,show_particles:0b}]}');
  }
  R.change(server, -P3.HEIST_ELVES, 'event', null, null);
  p3save(server, 'heist', { started: Date.now(), x: x, y: y, z: z, stolen: P3.HEIST_ELVES, recovered: 0 });
  R.cmd(server, 'title @a title ' + R.jsonText('Present heist!', 'green'));
  R.cmd(server, 'title @a subtitle ' + R.jsonText('Sour Elf Thieves grabbed ' + P3.HEIST_ELVES + ' presents near the Town Hall (-' + P3.HEIST_ELVES + '). Catch them before dawn!', 'gray'));
  R.cmd(server, 'playsound minecraft:block.bell.use master @a ' + x + ' ' + y + ' ' + z + ' 1 1.4');
  R.logEvent(server, 'Sour Elf heist: ' + P3.HEIST_ELVES + ' presents stolen');
}
function heistTick(server) {
  let h = p3json(server, 'heist', null); if (!h) return;
  let alive = 0; try { for (let e of server.overworld().getEntitiesWithin(AABB.of(h.x - 160, -64, h.z - 160, h.x + 160, 320, h.z + 160))) if (e.tags && e.tags.contains('fest_heist')) alive++; } catch (e) {}
  // thieves scatter at dawn after at least one night, taking what they still hold
  if (!p3isNight(server) && Date.now() - h.started > 60000 && (alive == 0 || R.dayTime(server) % 24000 < 1000)) {
    R.cmd(server, 'kill @e[tag=fest_heist]');
    R.data(server).remove('heist');
    R.announce(server, alive ? 'The Sour Elf Thieves got away with ' + alive + ' present' + (alive == 1 ? '' : 's') + '.' : 'Every stolen present was recovered!', alive ? 'red' : 'green');
    return;
  }
  if (alive == 0 && h.stolen - h.recovered <= 0) { R.data(server).remove('heist'); R.announce(server, 'Every stolen present was recovered!', 'green'); }
}
EntityEvents.death(event => {
  try {
    let e = event.entity; if (!e.tags || !e.tags.contains('fest_heist')) return;
    let server = e.server, h = p3json(server, 'heist', null); if (!h) return;
    let p = event.source ? event.source.player : null;
    h.recovered++; p3save(server, 'heist', h);
    R.cmd(server, 'summon minecraft:item ' + e.x.toFixed(1) + ' ' + (e.y + 0.5).toFixed(1) + ' ' + e.z.toFixed(1) + ' {Item:{id:"' + presentItem() + '",count:1}}');   // the stolen present comes back
    if (p && p.isPlayer()) R.score(server, p, 'heist_recover', 1, 'recovered a present'); else R.change(server, 1, 'event', null, null);
  } catch (err) {}
});

// ---------- Naughty Letter (doc 15): a dare from Santy Claws. Doing it: -4 and a ledger mark. Ignoring it a day: +1. ----------
function startLetter(server) {
  let players = []; for (let p of R.online(server)) if (p3overworld(p)) players.push(p);   // plain loop: server.players is a Java list, no .filter
  if (!players.length) return;
  let p = players[Math.floor(Math.random() * players.length)];
  // one paragraph per page: 1.21.1 SNBT has no \n escape inside quoted strings (TEST v2: the give failed silently)
  let pages = ['Dear ' + p.username + ',', 'Nobody is watching. Break ' + P3.LETTER_DARE_DECOR + ' decorations that someone ELSE hung up, before dawn, and I will leave a diamond in your pocket.', 'Be naughty. It feels good.', '- S. Claws'];
  let pageSnbt = pages.map(t => "'" + JSON.stringify({ text: t, color: 'dark_red' }) + "'").join(',');
  p3cmd(server, 'give ' + p.username + ' minecraft:written_book[written_book_content={title:"A Letter From S. Claws",author:"Santy Claws",pages:[' + pageSnbt + ']}] 1');
  p3letterFallback(server, p, pages);
  R.cmd(server, 'playsound minecraft:block.chain.break master ' + p.username + ' ~ ~ ~ 1 0.5');
  R.cmd(server, 'title ' + p.username + ' actionbar ' + R.jsonText('A letter slid into your pocket. Read it... or do not.', 'dark_red'));
  p3save(server, 'letter', { player: p.username, day: R.dayCount(server), broken: 0, started: Date.now() });
  R.logEvent(server, 'Santy Claws sent a Naughty Letter');   // public log, no name: the dare is private
}
// If the written book cannot be given (component syntax), set P3.LETTER_CHAT = true and the letter goes to the player's chat instead (still private).
function p3letterFallback(server, p, pages) {
  if (!P3.LETTER_CHAT) return;
  try { for (let line of pages) p.tell(Text.of(line).darkRed()); } catch (e) {}
}
function letterTick(server) {
  let L = p3json(server, 'letter', null); if (!L) return;
  if (R.dayCount(server) > L.day && !p3isNight(server)) {              // dawn of the next day without doing it
    R.data(server).remove('letter');
    for (let p of R.online(server)) if (p.username == L.player) {
      let d = R.score(server, p, 'naughty_ignored', 1, 'ignored a Naughty Letter');
      p.tell(Text.of('You ignored Santy Claws. ' + (d > 0 ? '+' + d + ' Festivity.' : 'Good.')).green());
    }
  }
}
BlockEvents.broken(event => {
  try {
    let p = event.player; if (!p) return;
    let server = p.server, L = p3json(server, 'letter', null); if (!L || L.player != p.username) return;
    if (!event.block.hasTag('chop:decor')) return;
    // Phase 1's break handler runs first (priority 50), charges break_decor and clears the decor map entry, then stamps the breaker
    // with fest_lastDecorBreakKey when the decor belonged to someone ELSE. Same block key within 2 s = this break counts.
    let key = event.block.x + ',' + event.block.y + ',' + event.block.z;
    if (p.persistentData.getString('fest_lastDecorBreakKey') != key || R.nowMs() - p.persistentData.getLong('fest_lastDecorBreakMs') > 2000) return;
    L.broken++;
    if (L.broken >= P3.LETTER_DARE_DECOR) {
      R.data(server).remove('letter');
      R.score(server, p, 'naughty_dare', 1, 'did the Naughty Letter dare');
      let LD = R.ledgerOf(server, p); LD.me.naughtyMarks = (LD.me.naughtyMarks || 0) + 1; R.saveLedger(server, LD.all);
      R.cmd(server, 'give ' + p.username + ' ' + P3.LETTER_REWARD);
      p.tell(Text.of('A diamond appears in your pocket. Santy Claws is pleased.').darkRed());
      R.logEvent(server, 'Someone did a Naughty Letter dare');
    } else p3save(server, 'letter', L);
  } catch (err) {}
});

// ---------- Santa sleigh fly-by (doc 9/15): sound and sparkle crossing the sky east to west over the anchor ----------
function startSleigh(server) {
  let a = anchor(server); if (!a) return;
  p3save(server, 'sleigh', { started: Date.now(), x: a.x, y: a.y + 40, z: a.z, step: 0 });
  R.cmd(server, 'playsound minecraft:block.bell.use master @a ' + (a.x + 120) + ' ' + (a.y + 40) + ' ' + a.z + ' 2 1.5');
}
function sleighTick(server) {
  let s = p3json(server, 'sleigh', null); if (!s) return;
  let steps = P3.SLEIGH_SECONDS * 20 / 100;   // tick runs every 100 ticks (5 s), so interpolate inside with scheduled sub-steps
  if (s.step >= steps) { R.data(server).remove('sleigh'); return; }
  for (let i = 0; i < 5; i++) {
    let f = (s.step * 5 + i) / (steps * 5), x = Math.floor(s.x + 120 - 240 * f), y = s.y + Math.floor(Math.sin(f * Math.PI) * 10), z = s.z;
    server.scheduleInTicks(i * 20, () => {
      R.cmd(server, 'particle minecraft:firework ' + x + ' ' + y + ' ' + z + ' 3 1 1 0.05 40 force');
      R.cmd(server, 'particle minecraft:end_rod ' + x + ' ' + y + ' ' + z + ' 1 0.5 0.5 0.02 10 force');
      if (i % 2 == 0) R.cmd(server, 'playsound minecraft:block.bell.use master @a ' + x + ' ' + y + ' ' + z + ' 2 ' + (1.2 + f * 0.6).toFixed(2));
      if (f > 0.45 && f < 0.55) R.cmd(server, 'playsound minecraft:entity.firework_rocket.twinkle master @a ' + x + ' ' + y + ' ' + z + ' 2 1');
    });
  }
  s.step++; p3save(server, 'sleigh', s);
}

// ---------- commands: /festivity townhall set|clear, /festivity event heist|letter|sleigh ----------
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event;
  event.register(Commands.literal('festivity')
    .then(Commands.literal('townhall').requires(src => src.hasPermission(2))
      .then(Commands.literal('set').executes(ctx => { let p = ctx.source.player; if (!p) return 0; p3save(ctx.source.server, 'townhall', { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) }); ctx.source.sendSuccess(Text.of('Town Hall doorstep set here.'), true); return 1; }))
      .then(Commands.literal('clear').executes(ctx => { R.data(ctx.source.server).remove('townhall'); ctx.source.sendSuccess(Text.of('Town Hall anchor cleared.'), true); return 1; })))
    .then(Commands.literal('event').requires(src => src.hasPermission(2))
      .then(Commands.literal('heist').executes(ctx => { startHeist(ctx.source.server); return 1; }))
      .then(Commands.literal('letter').executes(ctx => { startLetter(ctx.source.server); return 1; }))
      .then(Commands.literal('sleigh').executes(ctx => { startSleigh(ctx.source.server); return 1; })))
  );
});

console.log('[Festivity] phase 3 draft v3 loaded');
