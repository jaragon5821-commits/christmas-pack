// priority: 50
// ============================================================================================
//  FESTIVITY - Phase 1 KubeJS prototype  v0.1.1   (ONE server script: config + core + actions +
//  commands + welcome). Tags are in 05_tags.js. Design: Drive doc "Festivity Mechanic - Design v2.2".
//  TEST INSTANCE ONLY. Single player and dedicated server run the same code.
//  v0.1.1: no 'global' assignment (not allowed in server scripts). v0.1.2: time via level.time / level.getDayTime(),
//  no server.getPlayer (aborts in 2101), null-safe block entity data. v0.1.3: EntityEvents.afterHurt and
//  ItemEvents.entityInteracted (the only ones that exist in this build), robust advancement id reading.
//  v0.1.4: checkSpawn uses entity coordinates (event.position() does not exist); no ticker on op set/add.
//  v0.2.0: phase 2 hooks (minion kills skip the animal rule, our spawners are never cancelled, new action keys).
//  v0.3.0: HUD scoreboard bridge (fest_hud / fest_tick / fest_tickseq, read by the Festivity jar's client HUD),
//  boss bar hide no longer cuts a longer show short, one credit per present, Blizzard/Grey Day actually gate good
//  points, credit mult clamped, ledger lastSeen refreshed while online (crash-safe Welcome Back). See CHANGELOG.md.
//  v0.4.1: fest_java drain: the Festivity jar's compat bridges (0.8.2, carols in villages, fairy lights) queue x10 bar deltas in the dummy objective
//          fest_java under the player's name; the script drains it once a second through change() so the bar stays script-owned.
//  v0.4.2 (A8, Josh-approved 2026-11-09): colony mood. Festivity jar 0.9.18 writes fest_ext holder colony_mood (0-100, -1 = nobody in a
//          colony) every 5 min. Every 5 min (game ticks, players online, not frozen): 75+ = +0.3, 50-74 = +0.1, under 25 = -0.1, else none.
//          A missing score counts as -1 (no change). Normal bar change through change(): milestones/bands/HUD as usual, no player ticker.
//  v0.4.0: F10 Claws Night omens: two more fest_hud holders (omen 0..3, corrupt 0..100 creeping) written from hudSync,
//  and a once-per-day dusk cue (distant sounds, actionbar whisper, ash) while omen >= 1. Pure warning, no gameplay change.
// ============================================================================================

// ===== CONFIG: edit numbers here, then /reload. =====
// Design: "Festivity Mechanic - Design v2.2" (Drive). Server script: runs in single player too.

const FEST = {
  VERSION: '0.4.3',
  START: 55,                 // new world starting value (Josh: 55)
  MIN: 0, MAX: 100,
  HYSTERESIS: 3,             // points past a band edge before the band changes back
  DRIFT_TARGET: 60,          // bar drifts toward this while players are online
  DRIFT_PER_HOUR: 0.5,       // x sqrt(online players); doubled above 80 / below 20 (toward middle)
  DRIFT_EDGE_PER_HOUR: 1.0,
  GRACE_REAL_MS: 10 * 60 * 1000,   // 10 real min after an empty period: no spawns / events
  HOMECOMING_DAYS: 3, HOMECOMING_POINTS: 2,
  WELCOME_BACK_HOURS: 12,    // show the Welcome Back briefing after this long away
  FIRST_JOIN_INTRO: false,   // Josh's clean-join rule: no chat on join except Welcome Back. The quest book explains Festivity.
  SEASON_SCALING: false,     // v2.2 §17: daily caps shrink 10% per week from week 3, floor 50%. OFF until publish.
  LEDGER_EXPIRE_DAYS: 7,     // bad points stop counting after this (real days)
  DEC_DOUBLE: true,          // double good points on real Dec 24-25
  REPEAT_WINDOW_MS: 60 * 1000,     // same action within 60 s: half, then quarter
  GRIEFER_BRAKE: 15,         // one player causing more than -15 in a real hour: further bad halved
  NEWCOMER_SHIELD_TICKS: 48000,    // first 2 in-game days: no bad points
  ANIMAL_FLOOR: 40,          // animal kills never push the bar below this
  EVENT_LOG_SIZE: 30,
  MILESTONE_SHOW_TICKS: 160, // boss bar visible 8 s on a 5-point milestone
  BAND_SHOW_TICKS: 300,      // 15 s on a band change
  TICKER_PRIVATE: true,
  HUD_SYNC_TICKS: 100,       // scoreboard HUD bridge is re-written at least this often (and on every value change)
  HUD_SEEN_TICKS: 6000,      // ledger lastSeen/leftValue refresh for everyone online (crash-safe Welcome Back)
  OMEN_FALL_EPS: 0.5,        // 0.4.0: band 2 counts as "falling" when the bar is this much below its sample from ~1 in-game day earlier
  OMEN_SAMPLE_TICKS: 24000,  // 0.4.0: the omen sample is refreshed once per in-game day (game time, immune to /time set)
  CORRUPT_STEP: 2,           // 0.4.0: corrupt moves at most this much per hudSync toward its target (creep)
  DUSK_CUE_FROM: 12500, DUSK_CUE_TO: 12700,   // 0.4.0: dayTime window of the once-per-day dusk omen cue

  // name, low, high, bossbar colour, pop title. Order high -> low.
  BANDS: [
    { id: 'jolly',     name: 'Jolly',       lo: 80, hi: 100, color: 'green',  title: 'The world is Jolly!' },
    { id: 'merry',     name: 'Merry',       lo: 60, hi: 79,  color: 'green',  title: 'The world is Merry' },
    { id: 'quiet',     name: 'Quiet',       lo: 50, hi: 59,  color: 'white',  title: 'A quiet winter' },
    { id: 'grumbling', name: 'Grumbling',   lo: 40, hi: 49,  color: 'yellow', title: 'The world is Grumbling' },
    { id: 'bleak',     name: 'Bleak',       lo: 25, hi: 39,  color: 'purple', title: 'Bleak days have come' },
    { id: 'clawseve',  name: "Claws' Eve",  lo: 10, hi: 24,  color: 'red',    title: "Claws' Eve has begun" },
    { id: 'clawsnight',name: 'Claws Night', lo: 0,  hi: 9,   color: 'red',    title: 'CLAWS NIGHT' }
  ],

  // Point sources. cap = per player per real day (good only). All tunable.
  ACTIONS: {
    festive_food:   { pts: 0.5,  cap: 5 },
    give_present:   { pts: 2,    cap: 6 },
    place_decor:    { pts: 0.2,  cap: 4 },
    hut_built:      { pts: 1,    cap: 0 },     // per level, from MineColonies advancement
    colony_grew:    { pts: 3,    cap: 0 },
    citizen_fed:    { pts: 0.5,  cap: 5 },
    villager_trade: { pts: 0.2,  cap: 3 },
    letter_santa:   { pts: 1,    cap: 1 },
    group_sleep:    { pts: 1,    cap: 1 },
    quest:          { pts: 0,    cap: 0 },     // amount comes from /festivity add
    gift_villager:  { pts: 0.3,  cap: 5 },
    homecoming:     { pts: 2,    cap: 2 },
    rescue_minion:  { pts: 0.5,  cap: 5 },     // killed one of Santy Claws' minions
    rescue_player:  { pts: 2,    cap: 0 },     // freed a kidnapped player (plus a Ribbon token)
    cursed_star:    { pts: 5,    cap: 0 },     // destroyed a Claws Outpost

    kill_villager:  { pts: -5 },
    hurt_villager:  { pts: -0.1 },
    hurt_colonist:  { pts: -0.2 },
    kill_festive:   { pts: -2 },               // Snuffle, reindeer, golems (tag chop:festive_creatures)
    kill_animal:    { pts: -0.1, free: 5, cap: -1 },
    kill_baby:      { pts: -0.3 },
    kill_pet:       { pts: -2,   cap: -4 },
    break_decor:    { pts: -1 },
    kill_player:    { pts: -8 },               // PvP is on (Josh)
    explosion:      { pts: -3 },
    arson:          { pts: -3 },                 // synergy add-on chop_festivity_fire.js: burnt colony hut, blamed on the last igniter
    fire_kill:      { pts: -5 },                 // synergy add-on: villager/colonist died to fire or an unattributed blast
    // Phase 3 (festivity_phase3.js, draft)
    heist_recover:  { pts: 0.5,  cap: 0 },     // killed a Sour Elf thief carrying a present (+0.5 rescue_minion also fires: +1 total, matches the -1 stolen)
    naughty_dare:   { pts: -4 },                 // did the Naughty Letter dare
    naughty_ignored:{ pts: 1,    cap: 1 },     // ignored the Naughty Letter for a day
    eat_coal:       { pts: -1 }
  }
};


// ===== CORE =====
// Festivity Phase 1 prototype - CORE: storage, bands, drift, freeze while empty,
// boss bar moments, private ticker, event log, griefer brake, daily caps.
// Everything lives in the overworld's persistent data, so single player and the server behave the same.
// Time: see gameTime()/dayTime()/dayCount() below.

const F = FEST;

// ---------- storage ----------
function fdata(server) {
  // one compound tag on the server: { value, band, lastGameTime, log(json), ledger(json), flags }
  let pd = server.persistentData;
  if (!pd.contains('festivity')) {
    let tag = NBT.compoundTag();                                  // KubeJS NBT binding
    tag.putDouble('value', F.START);
    tag.putString('band', bandFor(F.START).id);
    tag.putLong('lastHourTick', 0);
    tag.putLong('lastEmptyRealMs', 0);
    tag.putLong('lastNonEmptyRealMs', 0);
    tag.putString('log', '[]');
    tag.putString('ledger', '{}');
    tag.putString('meta', JSON.stringify({ created: Date.now(), version: F.VERSION }));
    pd.put('festivity', tag);
  }
  return pd.getCompound('festivity');
}
function getValue(server) { return fdata(server).getDouble('value'); }
function readJson(server, key, fallback) {
  try { return JSON.parse(fdata(server).getString(key) || ''); } catch (e) { return fallback; }
}
function writeJson(server, key, obj) { fdata(server).putString(key, JSON.stringify(obj)); }

// ---------- bands ----------
function bandFor(v) {
  for (let b of F.BANDS) if (v >= b.lo) return b;
  return F.BANDS[F.BANDS.length - 1];
}
function currentBand(server) {
  let id = fdata(server).getString('band');
  for (let b of F.BANDS) if (b.id == id) return b;
  return bandFor(getValue(server));
}
// hysteresis: you enter a higher band at its edge (80 = Jolly) but only drop out HYSTERESIS below it (77).
function resolveBand(server, v) {
  let cur = currentBand(server);
  let raw = bandFor(v);
  if (raw.id == cur.id) return cur;
  let up = F.BANDS.indexOf(raw) < F.BANDS.indexOf(cur);        // BANDS is ordered high -> low
  if (Math.abs(F.BANDS.indexOf(raw) - F.BANDS.indexOf(cur)) > 1) return raw;   // /festivity set jumps
  if (up) return raw;
  return (v <= cur.lo - F.HYSTERESIS) ? raw : cur;
}

// ---------- time (ProbeJS 2026-11-02: level.time = game time, level.getDayTime() exists; getGameTime does not) ----------
function gameTime(server) { return Number(server.overworld().time); }
function dayTime(server)  { return Number(server.overworld().getDayTime()); }
function dayCount(server) { return Math.floor(dayTime(server) / 24000); }
function findPlayer(server, name) { for (let p of server.players) if (p.username == name) return p; return null; }   // server.getPlayer aborts in 2101

// ---------- helpers ----------
function online(server) { return server.players; }               // VERIFY: server.players list
function onlineCount(server) { let n = 0; for (let p of online(server)) n++; return n; }
function cmd(server, s) { return server.runCommandSilent(s); }
function fid(id) { return id; }                       // vanilla->festivity id map; Phase 5 redefines it when the Festivity jar is loaded
function f5isType(e, vanilla) { try { return String(e.type) == vanilla; } catch (x) { return false; } }   // Phase 5 redefines (also matches the jar's id)
function nowMs() { return Date.now(); }
// season scaling: week 1-2 full caps, then -10% per week, never below half (reads the world's creation stamp in meta)
function seasonScale(server) {
  if (!F.SEASON_SCALING) return 1;
  try {
    let meta = JSON.parse(fdata(server).getString('meta') || '{}');
    let weeks = Math.floor((nowMs() - (meta.created || nowMs())) / 604800000);
    return Math.max(0.5, 1 - 0.1 * Math.max(0, weeks - 2));
  } catch (e) { return 1; }
}
function realDayKey() { return Math.floor(nowMs() / 86400000); }
function isDec2425() {
  if (!F.DEC_DOUBLE) return false;
  let d = new Date();
  return d.getMonth() == 11 && (d.getDate() == 24 || d.getDate() == 25);
}
function jsonText(s, color) { return JSON.stringify({ text: s, color: color || 'white' }); }

// ---------- event log (for the Welcome Back briefing and /festivity log) ----------
function logEvent(server, text) {
  let log = readJson(server, 'log', []);
  log.push({ t: nowMs(), day: dayCount(server), text: text });
  while (log.length > F.EVENT_LOG_SIZE) log.shift();
  writeJson(server, 'log', log);
}

// ---------- ledger (per player, private) ----------
function ledgerOf(server, player) {
  let all = readJson(server, 'ledger', {});
  let id = String(player.uuid);
  if (!all[id]) all[id] = { name: player.username, good: 0, bad: 0, badEvents: [], caps: {}, capDay: realDayKey(),
                            lastSeen: nowMs(), firstSeenTick: gameTime(server), lastAction: {}, hourBad: [] };
  if (all[id].capDay != realDayKey()) { all[id].caps = {}; all[id].capDay = realDayKey(); }
  all[id].name = player.username;
  return { all: all, me: all[id] };
}
function saveLedger(server, all) { writeJson(server, 'ledger', all); }
function badScore(entry) {
  // bad points from the last LEDGER_EXPIRE_DAYS real days
  let cutoff = nowMs() - F.LEDGER_EXPIRE_DAYS * 86400000;
  let s = 0;
  for (let e of entry.badEvents) if (e.t >= cutoff) s += e.p;
  return s;
}

// ---------- display ----------
function bossbarInit(server) {
  cmd(server, 'bossbar add chop:festivity ' + jsonText('Festivity', 'white'));
  cmd(server, 'bossbar set chop:festivity max 100');
  cmd(server, 'bossbar set chop:festivity players');       // hidden by default (nobody attached)
  refreshBossbar(server);
}
function refreshBossbar(server) {
  let v = getValue(server), b = currentBand(server);
  cmd(server, 'bossbar set chop:festivity value ' + Math.round(v));
  cmd(server, 'bossbar set chop:festivity color ' + b.color);
  cmd(server, 'bossbar set chop:festivity name ' + jsonText('Festivity ' + Math.round(v) + ' - ' + b.name, 'white'));
}
// popKind (optional) feeds the HUD pop counter: 1 milestone up, 2 milestone down, 3 band up, 4 band down, 5 command.
// The hide is guarded so a shorter show scheduled later cannot cut a longer one short.
let fest_barHideAt = 0;
function showBossbar(server, ticks, who, popKind) {
  refreshBossbar(server);
  cmd(server, 'bossbar set chop:festivity players ' + (who || '@a'));
  let hideAt = Number(server.tickCount) + ticks;
  if (hideAt > fest_barHideAt) fest_barHideAt = hideAt;
  if (popKind) hudPop(server, popKind);
  server.scheduleInTicks(ticks, () => { if (Number(server.tickCount) >= fest_barHideAt) cmd(server, 'bossbar set chop:festivity players'); });
}
function ticker(server, player, delta, reason) {
  if (!player) return;
  let sign = delta >= 0 ? '+' : '';
  let face = delta >= 0 ? ' ☺' : ' ☹';
  let color = delta >= 0 ? 'green' : 'red';
  let txt = sign + (Math.round(delta * 10) / 10) + ' Festivity' + face + (reason ? '  (' + reason + ')' : '');
  cmd(server, 'title ' + player.username + ' actionbar ' + jsonText(txt, color));
  hudTick(server, player, delta);
}

// ---------- HUD bridge: vanilla-synced scoreboard scores read by the Festivity jar's client HUD ----------
// fest_hud (dummy): bar = round(value*10) 0..1000, band = 0 Claws Night .. 6 Jolly, pop = +1 per boss-bar moment,
// popkind = 1 milestone up / 2 milestone down / 3 band up / 4 band down / 5 command, frozen = 1 while the bar is frozen
// (nobody online, grace, or /festivity freeze on). fest_tick (dummy): <player> = round(delta*10) of their last private
// ticker, fest_tickseq (dummy): <player> +1 per ticker. Never put in a display slot. All writes are silent.
// 0.4.0 (F10 omens): omen = 3 while Santy Claws is out or band == 0 (Claws Night), 2 when band == 1 (Claws' Eve),
// 1 when band == 2 (Bleak) AND the bar is falling (below its sample from ~1 in-game day earlier by OMEN_FALL_EPS), else 0.
// corrupt = 0..100, target 100 - bar while band <= 2 (else 0), moved at most CORRUPT_STEP per hudSync so it creeps;
// the current corrupt and the omen samples live in the festivity compound (persist across restarts and /reload).
let fest_hudLast = { bar: -1, band: -1, frozen: -1, omen: -1, corrupt: -1 };
function hudInit(server) {
  cmd(server, 'scoreboard objectives add fest_hud dummy');          // no-op (silent error) when it already exists
  cmd(server, 'scoreboard objectives add fest_tick dummy');
  cmd(server, 'scoreboard objectives add fest_tickseq dummy');
  fest_hudLast = { bar: -1, band: -1, frozen: -1, omen: -1, corrupt: -1 };
  hudSync(server, true);
  try {   // 0.3.0b: proof line for the log (HUD jar reads these objectives client-side)
    var sb = server.scoreboard, has = sb && sb.getObjective('fest_hud') != null;
    console.log('[Festivity] HUD scoreboard bridge ' + (has ? 'ready' : 'MISSING fest_hud objective') + ' (omen+corrupt) (bar=' + Math.round(getValue(server) * 10) + ', band=' + hudBandIndex(currentBand(server)) + ', omen=' + fest_hudLast.omen + ', corrupt=' + fest_hudLast.corrupt + ')');
  } catch (e) { console.log('[Festivity] HUD bridge check: ' + e); }
}
function hudBandIndex(band) { return (F.BANDS.length - 1) - F.BANDS.indexOf(band); }   // BANDS runs Jolly -> Claws Night; HUD counts the other way
function hudFrozen(server) {
  try { if (onlineCount(server) == 0 || fdata(server).getBoolean('frozen') || inGrace(server)) return 1; } catch (e) {}
  return 0;
}
function hudSync(server, force) {
  try {
    let bar = Math.round(getValue(server) * 10), band = hudBandIndex(currentBand(server)), frozen = hudFrozen(server);
    if (force || bar != fest_hudLast.bar) cmd(server, 'scoreboard players set bar fest_hud ' + bar);
    if (force || band != fest_hudLast.band) cmd(server, 'scoreboard players set band fest_hud ' + band);
    if (force || frozen != fest_hudLast.frozen) cmd(server, 'scoreboard players set frozen fest_hud ' + frozen);
    fest_hudLast = { bar: bar, band: band, frozen: frozen, omen: fest_hudLast.omen, corrupt: fest_hudLast.corrupt };
  } catch (e) { console.warn('[Festivity] hud sync skipped: ' + e); }
  hudOmen(server, force);   // 0.4.0: same cadence as the other holders
}
// 0.4.0 F10: omen / corrupt holders. Pure derivation from existing state; never changes the bar.
function hudOmenLevel(server, bar, band) {
  let d = fdata(server);
  if (d.contains('claws') || band == 0) return 3;              // Phase 2 keeps its 'claws' json in the same compound while he is out
  if (band == 1) return 2;
  if (band == 2) {
    // one sample per in-game day (game time: /time set does not move it). prev = the sample before the current one, so it is
    // 1..2 days old; current one is 0..1 days old. Compare with the older sample when there is one.
    let gt = gameTime(server);
    if (!d.contains('omenSampleTime') || gt - d.getLong('omenSampleTime') >= F.OMEN_SAMPLE_TICKS || gt < d.getLong('omenSampleTime')) {
      if (d.contains('omenSampleValue')) d.putDouble('omenPrevValue', d.getDouble('omenSampleValue'));
      d.putDouble('omenSampleValue', bar);
      d.putLong('omenSampleTime', gt);
    }
    let ref = d.contains('omenPrevValue') ? d.getDouble('omenPrevValue') : d.getDouble('omenSampleValue');
    return bar < ref - F.OMEN_FALL_EPS ? 1 : 0;
  }
  return 0;
}
function hudOmen(server, force) {
  try {
    let d = fdata(server);
    let bar = getValue(server), band = hudBandIndex(currentBand(server));
    let omen = hudOmenLevel(server, bar, band);
    let target = band <= 2 ? Math.max(0, Math.min(100, 100 - bar)) : 0;
    let cur = d.contains('corrupt') ? d.getInt('corrupt') : 0;
    let step = Math.max(-F.CORRUPT_STEP, Math.min(F.CORRUPT_STEP, target - cur));
    let corrupt = Math.max(0, Math.min(100, Math.round(cur + step)));
    if (corrupt != cur) d.putInt('corrupt', corrupt);
    if (force || omen != fest_hudLast.omen) cmd(server, 'scoreboard players set omen fest_hud ' + omen);
    if (force || corrupt != fest_hudLast.corrupt) cmd(server, 'scoreboard players set corrupt fest_hud ' + corrupt);
    fest_hudLast.omen = omen; fest_hudLast.corrupt = corrupt;
  } catch (e) { console.warn('[Festivity] hud omen skipped: ' + e); }
}
// 0.4.0 F10: dusk cue, once per in-game day while omen >= 1. Sounds + actionbar + ash only; no chat (CLEAN JOIN), all silent.
let FEST_OMEN_LINES = { 1: ['You hear sleigh bells, far off.', 'gray'], 2: ['Something heavy is pacing in the snow.', 'gray'], 3: ['He knows where you live.', 'dark_purple'] };
function hudDuskCue(server) {
  try {
    let t = dayTime(server) % 24000;
    if (t < F.DUSK_CUE_FROM || t > F.DUSK_CUE_TO) return;
    let d = fdata(server), day = dayCount(server);
    if (d.contains('omenCueDay') && d.getLong('omenCueDay') == day) return;   // per-day flag
    d.putLong('omenCueDay', day);
    let omen = fest_hudLast.omen;
    if (omen < 1) return;
    let line = FEST_OMEN_LINES[omen] || FEST_OMEN_LINES[1];
    for (let p of online(server)) {
      let n = p.username;
      cmd(server, 'execute at ' + n + ' run playsound minecraft:block.bell.use ambient ' + n + ' ~ ~ ~ 0.3 0.5');
      if (omen >= 2) cmd(server, 'execute at ' + n + ' run playsound minecraft:entity.polar_bear.warning ambient ' + n + ' ~ ~ ~ 0.5 0.6');
      if (omen >= 3) cmd(server, 'execute at ' + n + ' run playsound minecraft:entity.warden.heartbeat ambient ' + n + ' ~ ~ ~ 0.6 0.5');
      if (omen >= 2) cmd(server, 'execute at ' + n + ' run particle minecraft:ash ~ ~1 ~ 6 3 6 0 40');
      cmd(server, 'title ' + n + ' actionbar ' + jsonText(line[0], line[1]));
    }
  } catch (e) { console.warn('[Festivity] dusk cue skipped: ' + e); }
}
function hudPop(server, kind) {
  cmd(server, 'scoreboard players set popkind fest_hud ' + kind);
  cmd(server, 'scoreboard players add pop fest_hud 1');
}
function hudTick(server, player, delta) {
  try {
    cmd(server, 'scoreboard players set ' + player.username + ' fest_tick ' + Math.round(delta * 10));
    cmd(server, 'scoreboard players add ' + player.username + ' fest_tickseq 1');
  } catch (e) {}
}
function announce(server, text, color) { cmd(server, 'tellraw @a ' + jsonText(text, color || 'gold')); }

// ---------- the one entry point that changes the bar ----------
// source: player or null. kind: ACTIONS key or 'drift' / 'command' / 'quest'.
function change(server, delta, kind, player, reason) {
  if (delta == 0) return 0;
  let before = getValue(server);
  let after = Math.max(F.MIN, Math.min(F.MAX, before + delta));
  if (after == before) return 0;
  fdata(server).putDouble('value', after);

  // milestone (every 5 whole points), band change
  let m0 = Math.floor(before / 5), m1 = Math.floor(after / 5);
  let newBand = resolveBand(server, after), oldBand = currentBand(server);
  if (newBand.id != oldBand.id) {
    fdata(server).putString('band', newBand.id);
    onBandChange(server, oldBand, newBand, after > before);
  } else if (m0 != m1 && kind != 'drift-silent') {
    showBossbar(server, F.MILESTONE_SHOW_TICKS, '@a', after > before ? 1 : 2);
    announce(server, 'Festivity ' + (after > before ? 'reached ' : 'fell to ') + (m1 * 5), after > before ? 'green' : 'red');
  } else {
    refreshBossbar(server);
  }
  hudSync(server, false);
  if (player && F.TICKER_PRIVATE && kind != 'command') ticker(server, player, after - before, reason);   // no ticker for op set
  return after - before;
}

function onBandChange(server, oldBand, newBand, up) {
  showBossbar(server, F.BAND_SHOW_TICKS, '@a', up ? 3 : 4);
  cmd(server, 'title @a title ' + jsonText(newBand.title, newBand.color == 'red' ? 'dark_red' : (newBand.color == 'green' ? 'green' : 'white')));
  cmd(server, 'title @a subtitle ' + jsonText('Festivity ' + Math.round(getValue(server)), 'gray'));
  cmd(server, 'playsound ' + (up ? 'minecraft:block.note_block.chime' : 'minecraft:entity.wither.ambient') + ' master @a ~ ~ ~ 0.6 1');
  announce(server, newBand.title + ' (' + oldBand.name + ' -> ' + newBand.name + ')');
  logEvent(server, 'The world became ' + newBand.name);
  // KubeJS stages festivity_<band> (FTB XMod Compat is NOT in the pack: gate recipes/quests with KubeJS stage checks and /festivity commands)
  for (let p of online(server)) syncStages(p);
  applyBandEffects(server, newBand);
}

function syncStages(player) {
  try {
    let st = player.stages;                                       // VERIFY: KubeJS player stages
    for (let b of F.BANDS) st.remove('festivity_' + b.id);
    st.add('festivity_' + currentBand(player.server).id);
    let v = getValue(player.server);
    if (v >= 60) st.add('festivity_merry_plus'); else st.remove('festivity_merry_plus');
  } catch (e) { console.warn('[Festivity] stage sync failed: ' + e); }
}

// Phase 1 world effects: weather + a sound cue. Buffs, loot, spawns come in phase 2.
function applyBandEffects(server, band) {
  switch (band.id) {
    case 'jolly':      cmd(server, 'weather clear 12000'); break;
    case 'merry':      cmd(server, 'weather rain 3000'); break;      // light snowfall in snowy biomes
    case 'bleak':      cmd(server, 'weather rain 9000'); break;
    case 'clawseve':
    case 'clawsnight': cmd(server, 'weather thunder 6000'); break;
    default: break;
  }
}

// ---------- scoring with caps, repeats, shields, brakes ----------
// Returns the applied delta. Good actions obey daily caps; bad actions obey newcomer shield + griefer brake.
function score(server, player, key, mult, reason) {
  let a = F.ACTIONS[key];
  if (!a) { console.warn('[Festivity] unknown action ' + key); return 0; }
  let pts = a.pts * (mult || 1);
  if (pts == 0) return 0;
  let L = ledgerOf(server, player), me = L.me, t = nowMs();

  if (pts > 0) {
    // knock-down events (phase 2 'event' record): Blizzard of Doubt = good deeds count for nothing, Grey Day = half
    try {
      let ev = readJson(server, 'event', null);
      if (ev && ev.type == 'blizzard') return 0;
      if (ev && ev.type == 'greyday') pts *= 0.5;
    } catch (e) {}
    if (isDec2425()) pts *= 2;
    // diminishing repeats
    let last = me.lastAction[key];
    if (last && t - last.t < F.REPEAT_WINDOW_MS) { last.n++; pts = pts / Math.pow(2, Math.min(last.n, 2)); }
    else me.lastAction[key] = { t: t, n: 0 };
    me.lastAction[key].t = t;
    // daily cap
    if (a.cap > 0) {
      let cap = a.cap * seasonScale(server);
      let used = me.caps[key] || 0;
      if (used >= cap) { saveLedger(server, L.all); return 0; }
      pts = Math.min(pts, cap - used);
      me.caps[key] = used + pts;
    }
    me.good += pts;
  } else {
    // newcomer shield
    if (gameTime(server) - me.firstSeenTick < F.NEWCOMER_SHIELD_TICKS) { saveLedger(server, L.all); return 0; }
    // animal rule: free kills, daily cap, hard floor
    if (key == 'kill_animal' || key == 'kill_baby' || key == 'kill_pet') {
      let capKey = key == 'kill_pet' ? 'kill_pet' : 'kill_animal';
      let cfg = F.ACTIONS[capKey];
      me.caps['n_' + key] = (me.caps['n_' + key] || 0) + 1;
      if (key == 'kill_animal' && me.caps['n_kill_animal'] <= cfg.free) { saveLedger(server, L.all); return 0; }
      let used = me.caps[capKey] || 0;                          // negative accumulates
      if (used <= cfg.cap) { saveLedger(server, L.all); return 0; }
      pts = Math.max(pts, cfg.cap - used);
      me.caps[capKey] = used + pts;
      if (getValue(server) + pts < F.ANIMAL_FLOOR) pts = Math.min(0, F.ANIMAL_FLOOR - getValue(server));
      if (pts == 0) { saveLedger(server, L.all); return 0; }
    }
    // ledger keeps the FULL bad amount; griefer brake halves the world effect
    me.bad += -pts;
    me.badEvents.push({ t: t, p: -pts, k: key });
    while (me.badEvents.length > 200) me.badEvents.shift();
    me.hourBad = me.hourBad.filter(e => t - e.t < 3600000);
    let hourSum = 0; for (let e of me.hourBad) hourSum += e.p;
    me.hourBad.push({ t: t, p: -pts });
    if (hourSum > F.GRIEFER_BRAKE) {
      pts = pts / 2;
      console.log('[Festivity] griefer brake on ' + player.username + ' (' + hourSum + ' in the last hour)');
    }
  }
  saveLedger(server, L.all);
  return change(server, pts, key, player, reason || String(key).replace(/_/g, ' '));
}

// ---------- 0.4.1: fest_java drain (Festivity jar 0.8.2 compat bridges) ----------
// Java never writes the bar. It adds a x10 delta to dummy objective fest_java (holder = player name) after its own per-day caps.
// We read it, pass it through change() (which applies MIN/MAX, bands, pops, HUD), and zero the score. All silent, no chat.
function javaDrain(server) {
  try {
    let sb = server.scoreboard; if (!sb) return;
    let obj = sb.getObjective('fest_java'); if (!obj) return;
    for (let p of online(server)) {
      let acc = sb.getOrCreatePlayerScore(p, obj);
      let v = acc.get();
      if (v == 0) continue;
      acc.set(0);
      v = Math.max(-20, Math.min(20, v));                      // sanity: never more than 2.0 points per drain per player
      change(server, v / 10, 'java', p, 'bridge');
    }
  } catch (e) { console.log('[Festivity] javaDrain: ' + e); }
}

// ---------- 0.4.2: colony mood (A8) ----------
// Reads fest_ext / colony_mood WITHOUT creating it (a created 0 would read as a miserable colony). -1 or missing = no change.
const FEST_MOOD = { EVERY_TICKS: 6000, HIGH: 75, MID: 50, LOW: 25, HIGH_PTS: 0.3, MID_PTS: 0.1, LOW_PTS: -0.1 };
var fest_ScoreHolder = null;
function colonyMood(server) {
  try {
    let sb = server.scoreboard; if (!sb) return -1;
    let obj = sb.getObjective('fest_ext'); if (!obj) return -1;
    if (!fest_ScoreHolder) fest_ScoreHolder = Java.loadClass('net.minecraft.world.scores.ScoreHolder');
    let info = sb.getPlayerScoreInfo(fest_ScoreHolder.forNameOnly('colony_mood'), obj);
    if (info == null) return -1;
    return Number(info.value());
  } catch (e) { console.log('[Festivity] colonyMood: ' + e); return -1; }
}
function colonyMoodTick(server) {
  let m = colonyMood(server);
  console.info('[Festivity] colony mood ' + m);   // 0.4.3: one line per 5-min read
  if (m < 0) return;
  let M = FEST_MOOD, d = 0;
  if (m >= M.HIGH) d = M.HIGH_PTS; else if (m >= M.MID) d = M.MID_PTS; else if (m < M.LOW) d = M.LOW_PTS;
  if (d != 0) change(server, d, 'colony_mood', null, 'colony mood ' + m);
}

// ---------- tick: drift, freeze, grace ----------
var fest_hudInited = false;   // 0.3.0c: ServerEvents.loaded does not fire again on /reload, so init lazily from the first tick too
ServerEvents.tick(event => {
  let server = event.server;
  if (!fest_hudInited) { fest_hudInited = true; try { bossbarInit(server); hudInit(server); } catch (e) { console.log('[Festivity] HUD init on tick failed: ' + e); } }
  if (server.tickCount % 20 != 0) return;                     // once a second
  let d = fdata(server);
  let n = onlineCount(server);
  let t = nowMs();
  if (server.tickCount % F.HUD_SYNC_TICKS == 0) hudSync(server, true);   // HUD bridge heartbeat (also flips frozen on/off)
  if (n == 0) {                                               // FROZEN while empty (Josh: absence is never punished)
    d.putLong('lastEmptyRealMs', t);
    return;
  }
  d.putLong('lastNonEmptyRealMs', t);
  hudDuskCue(server);                                         // 0.4.0: once per in-game day at dusk while omen >= 1 (players online only)
  javaDrain(server);                                          // 0.4.1: grant bar points queued by the jar's mod bridges (fest_java)
  if (server.tickCount % F.HUD_SEEN_TICKS == 0) {             // keep lastSeen/leftValue fresh so a crash cannot fake a 12 h absence
    for (let p of online(server)) {
      try { let L = ledgerOf(server, p); L.me.lastSeen = t; L.me.leftValue = getValue(server); saveLedger(server, L.all); } catch (e) {}
    }
  }
  if (d.getBoolean('frozen')) return;                          // /festivity freeze on
  if (server.tickCount % FEST_MOOD.EVERY_TICKS == 0) colonyMoodTick(server);   // 0.4.2 A8: every 5 min
  let hour = Math.floor(gameTime(server) / 1000);
  if (hour != d.getLong('lastHourTick')) {
    d.putLong('lastHourTick', hour);
    let v = getValue(server);
    let target = isDec2425() ? 70 : F.DRIFT_TARGET;
    let speed = (v > 80 || v < 20) ? F.DRIFT_EDGE_PER_HOUR : F.DRIFT_PER_HOUR;
    speed *= Math.sqrt(n);
    let delta = Math.max(-speed, Math.min(speed, target - v));
    if (v > 80 && target < v) delta = -F.DRIFT_EDGE_PER_HOUR;   // Jolly decays toward the middle
    if (Math.abs(delta) > 0.001) change(server, delta, 'drift-silent', null, null);
  }
});

function inGrace(server) {
  let d = fdata(server);
  let lastEmpty = d.getLong('lastEmptyRealMs');
  return lastEmpty > 0 && nowMs() - lastEmpty < F.GRACE_REAL_MS;
}

// ---------- server start ----------
ServerEvents.loaded(event => {
  let server = event.server;
  fdata(server);
  fest_hudInited = true;
  bossbarInit(server);
  hudInit(server);
  console.log('[Festivity] ' + F.VERSION + ' loaded (HUD bridge on, omens on). Value ' + getValue(server) + ' (' + currentBand(server).name + ')');
});

// shared table used by the sections below
const Fest = {
  data: fdata, value: getValue, band: currentBand, bandFor: bandFor, change: change, score: score,
  ledgerOf: ledgerOf, saveLedger: saveLedger, badScore: badScore, logEvent: logEvent, readJson: readJson,
  showBossbar: showBossbar, refreshBossbar: refreshBossbar, hudSync: hudSync, hudPop: hudPop, hudInit: hudInit,
  announce: announce, ticker: ticker, syncStages: syncStages, inGrace: inGrace,
  cmd: cmd, online: online, onlineCount: onlineCount, jsonText: jsonText, nowMs: nowMs,
  gameTime: gameTime, dayTime: dayTime, dayCount: dayCount
};


// ===== POINT SOURCES =====
// Festivity Phase 1 - POINT SOURCES. Each handler only READS game events; nothing here ever edits
// a villager, colonist or their data (villager safety rule).
const G = Fest;
const FA = FEST.ACTIONS;

// --- good: eat festive food (and the coal snack) ---
ItemEvents.foodEaten(event => {
  let p = event.player; if (!p || !p.server) return;
  if (event.item.id == 'minecraft:coal' || event.item.id == 'chop:coal_snack') { G.score(p.server, p, 'eat_coal', 1, 'ate coal'); return; }
  if (event.item.hasTag('chop:festive_food')) G.score(p.server, p, 'festive_food', 1, 'festive food');
});

// --- good: place decor / bad: break someone else's decor ---
BlockEvents.placed(event => {
  let p = event.entity; if (!p || !p.isPlayer()) return;
  if (event.block.hasTag('chop:decor')) G.score(p.server, p, 'place_decor', 1, 'decorating');
});
BlockEvents.broken(event => {
  let p = event.player; if (!p) return;
  if (!event.block.hasTag('chop:decor')) return;
  // Phase 1: we remember who placed decor (below). Breaking decor that someone ELSE placed is naughty.
  // Unrecorded decor (pre-existing, generated) is free. OPAC claim-owner check comes in phase 2.
  let placed = G.readJson(p.server, 'decor', {});
  let key = event.block.x + ',' + event.block.y + ',' + event.block.z;
  let placer = placed[key];
  if (placer) { delete placed[key]; Fest.data(p.server).putString('decor', JSON.stringify(placed)); }
  if (placer && placer != p.username) {
    G.score(p.server, p, 'break_decor', 1, "broke " + placer + "'s decor");
    // remember the last foreign-decor break on the player (Phase 3 Naughty Letter reads it; this handler runs first and clears the map)
    try { p.persistentData.putString('fest_lastDecorBreakKey', key); p.persistentData.putLong('fest_lastDecorBreakMs', G.nowMs()); } catch (e) {}
  }
});
BlockEvents.placed(event => {
  let p = event.entity; if (!p || !p.isPlayer()) return;
  if (!event.block.hasTag('chop:decor')) return;
  let placed = G.readJson(p.server, 'decor', {});
  placed[event.block.x + ',' + event.block.y + ',' + event.block.z] = p.username;
  let keys = Object.keys(placed); if (keys.length > 4000) for (let i = 0; i < 500; i++) delete placed[keys[i]];
  Fest.data(p.server).putString('decor', JSON.stringify(placed));
});

// --- good: give a present (another player opens a present block you placed) ---
BlockEvents.rightClicked(event => {
  let p = event.player; if (!p) return;
  if (!event.block.hasTag('chop:present_blocks')) return;
  let be = null; try { be = event.block.entityData; } catch (x) {}   // null on blocks without a block entity
  let placer = be ? String(be.getString('fest_placer') || '') : '';
  if (placer && placer != p.username) {
    let giver = findPlayer(p.server, placer);
    if (giver) G.score(p.server, giver, 'give_present', 1, p.username + ' opened your present');
    G.score(p.server, p, 'give_present', 0.5, 'opened a present');
    try { event.block.mergeEntityData({ fest_placer: '' }); } catch (e) {}   // one present = one gift (no re-click farming up to the cap)
  }
});
// remember who placed a present block (NBT on the block entity, our own key only)
BlockEvents.placed(event => {
  let p = event.entity; if (!p || !p.isPlayer()) return;
  if (!event.block.hasTag('chop:present_blocks')) return;
  try { event.block.mergeEntityData({ fest_placer: p.username }); } catch (e) {}   // VERIFY: mergeEntityData
});

// --- good: villager trade (vanilla advancement trigger via hidden advancement) + MineColonies advancements ---
function advId(adv) {
  try { if (adv.id !== undefined) { let v = adv.id; return String(typeof v == 'function' ? adv.id() : v); } } catch (x) {}
  try { return String(adv.id()); } catch (x) {}
  try { return String(adv.getId()); } catch (x) {}
  try { return String(adv.asHolder ? adv.asHolder().id() : adv); } catch (x) {}
  return String(adv);
}
PlayerEvents.advancement(event => {
  // TEST 2026-11-02: this event did not fire for granted hidden advancements, so credits now come from the
  // advancements' own rewards.function running "/festivity credit @s <action> [mult]" (synergy datapack).
  // This handler stays only as a debug trace.
  try { let id = advId(event.advancement); if (id.startsWith('chop')) console.log('[Festivity] advancement event ' + id + ' for ' + event.player.username); } catch (e) {}
});

// --- good: give a gift to an MCA villager (right-click with a chop:gift item). Read-only: we never touch the villager. ---
// Smoke test 2026-11-02: the real event is ItemEvents.entityInteracted (player, target, item, hand).
ItemEvents.entityInteracted(event => {
  try {
    let p = event.player, e = event.target || event.entity;
    if (!p || !e || !e.type || !e.type.startsWith('mca:')) return;
    if (event.hand && String(event.hand) != 'MAIN_HAND') return;
    let item = event.item || p.mainHandItem;
    if (!item || !item.hasTag('chop:gift')) return;
    if (p.persistentData.getLong('fest_lastGift') && G.nowMs() - p.persistentData.getLong('fest_lastGift') < 5000) return;   // one credit per gift, not per hand/tick
    p.persistentData.putLong('fest_lastGift', G.nowMs());
    G.score(p.server, p, 'gift_villager', e.isBaby() ? 2 : 1, 'gift to a villager');
  } catch (err) { console.warn('[Festivity] gift check skipped: ' + err); }
});

// --- bad: hurting / killing villagers, colonists, festive creatures, animals, players ---
EntityEvents.afterHurt(event => {                                   // smoke test: hurt() does not exist, afterHurt does
  let src = event.source; let p = src ? src.player : null;
  if (!p || !p.isPlayer()) return;
  let e = event.entity;
  if (e.type.startsWith('minecolonies:')) G.score(p.server, p, 'hurt_colonist', 1, 'hurt a colonist');
  else if (e.type.startsWith('mca:') || e.type == 'minecraft:villager' || e.type == 'minecraft:wandering_trader') G.score(p.server, p, 'hurt_villager', 1, 'hurt a villager');
});

EntityEvents.death(event => {
  let src = event.source; let p = src ? src.player : null;
  if (!p || !p.isPlayer()) return;
  let e = event.entity, server = p.server;
  try { if (e.tags && e.tags.contains('fest_minion')) return; } catch (x) {}      // our own mobs: handled in phase 2
  if (e.isPlayer()) { if (String(e.uuid) != String(p.uuid)) G.score(server, p, 'kill_player', 1, 'killed ' + e.username); return; }   // Java UUIDs: compare as strings, not by reference
  if (e.type.startsWith('minecolonies:') || e.type.startsWith('mca:') || e.type == 'minecraft:villager') { G.score(server, p, 'kill_villager', 1, 'killed a villager'); return; }
  // festive creatures per 05_tags.js chop:festive_creatures: Snuffles, reindeer, snow / Snowy Spirit golems. Iron golems are not festive.
  if (e.type.startsWith('snuffles:') || e.type.includes('reindeer') || (e.type.includes('golem') && e.type != 'minecraft:iron_golem')) { G.score(server, p, 'kill_festive', 1, 'killed a festive creature'); return; }
  if (e.isAnimal && e.isAnimal()) {                               // VERIFY: EntityKJS.isAnimal()
    let tamed = false; try { tamed = (typeof e.isTame == 'function') ? e.isTame() : false; } catch (x) {}
    let named = false; try { named = e.hasCustomName(); } catch (x) {}
    if (tamed || named) G.score(server, p, 'kill_pet', 1, 'killed a pet');
    else if (e.isBaby()) G.score(server, p, 'kill_baby', 1, 'killed a baby animal');
    else G.score(server, p, 'kill_animal', 1, 'hunting');
  }
});

// --- bad: explosions inside a colony (phase 1: any player-caused explosion near a colonist) ---
// KubeJS 2101: event.explosion is undefined in beforeExplosion (TEST 0.2.5), so try the exploder accessors first. VERIFY with ProbeJS.
let fest_explWarned = false;
function explosionPlayer(event) {
  let src = null;
  let tries = [
    () => event.exploder, () => event.getExploder(),
    () => event.explosion.getIndirectSourceEntity(), () => event.explosion.getDirectSourceEntity()
  ];
  for (let t of tries) { try { src = t(); } catch (e) { src = null; } if (src) break; }
  if (!src) return null;
  try { if (src.isPlayer()) return src; } catch (e) {}
  for (let own of [() => src.owner, () => src.getOwner()]) {               // primed TNT / fireball owner
    try { let o = own(); if (o && o.isPlayer()) return o; } catch (e) {}
  }
  return null;
}
LevelEvents.beforeExplosion(event => {
  try {
    let src = explosionPlayer(event);
    if (!src) return;
    let near = event.level.getEntitiesWithin(AABB.of(event.x - 24, event.y - 24, event.z - 24, event.x + 24, event.y + 24, event.z + 24));
    for (let e of near) if (String(e.type).startsWith('minecolonies:')) { G.score(src.server, src, 'explosion', 1, 'explosion in a colony'); break; }
  } catch (err) { if (!fest_explWarned) { fest_explWarned = true; console.warn('[Festivity] explosion check skipped: ' + err); } }
});

// --- good: everyone online slept through the night ---
let fest_lastDay = -1, fest_sleepers = {};
ServerEvents.tick(event => {
  let server = event.server;
  if (server.tickCount % 40 != 0) return;                               // every 2 s
  if (G.onlineCount(server) == 0) return;                               // frozen while empty
  for (let p of G.online(server)) if (p.isSleeping()) fest_sleepers[p.username] = true;
  let day = G.dayCount(server);
  if (fest_lastDay == -1) { fest_lastDay = day; return; }
  if (day != fest_lastDay) {
    fest_lastDay = day;
    let n = G.onlineCount(server), s = Object.keys(fest_sleepers).length;
    if (n > 0 && s >= n) for (let p of G.online(server)) G.score(server, p, 'group_sleep', 1, 'everyone slept');
    fest_sleepers = {};
    // Santa's dawn gift (Merry+): one small gift per online player every third dawn, every dawn at Jolly
    let b = G.band(server);
    if ((b.id == 'jolly') || (b.id == 'merry' && day % 3 == 0)) {
      for (let p of G.online(server)) {
        server.runCommandSilent('give ' + p.username + ' minecraft:cookie 3');
        server.runCommandSilent('playsound minecraft:block.note_block.bell master ' + p.username + ' ~ ~ ~ 0.8 1.2');
        if (G.value(server) >= 90) server.runCommandSilent('loot give ' + p.username + ' loot chop:santa_rare');  // LootJS table later
      }
      G.announce(server, 'Santa left a little something for everyone.', 'green');
      G.logEvent(server, 'Santa visited at dawn');
    }
  }
});

// --- Jolly: no surface monsters near players (phase 1 uses players as anchors; Town Halls in phase 2) ---
EntityEvents.checkSpawn(event => {
  let server = event.level.server; if (!server) return;
  let b = G.band(server);
  if (b.id != 'jolly' && b.id != 'merry') return;
  if (!event.entity.isMonster()) return;
  try { if (event.entity.tags && event.entity.tags.contains('fest_minion')) return; } catch (x) {}   // never cancel our own spawners
  try { if (String(event.entity.type).indexOf('festivity:') == 0) return; } catch (x) {}   // 0.4.3: never Festivity's own mobs (e.g. /summon festivity:santy_claws)
  try { let st = String(event.type || event.spawnType || '').toUpperCase(); if (st && ['NATURAL', 'CHUNK_GENERATION', 'SPAWNER', 'TRIAL_SPAWNER', 'REINFORCEMENT', 'PATROL', 'EVENT'].indexOf(st) < 0) return; } catch (x) {}   // 0.4.3: commands / spawn eggs / buckets are never blocked
  if (String(event.level.dimension) != 'minecraft:overworld') return;
  if (G.inGrace(server)) return;
  let e = event.entity, near = false;
  for (let p of G.online(server)) {
    if (String(p.level.dimension) != String(event.level.dimension)) continue;
    let dx = p.x - e.x, dy = p.y - e.y, dz = p.z - e.z;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < (b.id == 'jolly' ? 128 : 48)) { near = true; break; }
  }
  if (near && (b.id == 'jolly' || Math.random() < 0.25)) event.cancel();
});


// ===== COMMANDS =====
// Festivity commands. Everyone: /festivity, /festivity log. Ops (level 2+): get/set/add/ledger/freeze/band/test.
const G3 = Fest, F3 = FEST;

ServerEvents.commandRegistry(event => {
  const { commands: Commands, arguments: Arguments } = event;

  const show = (ctx) => {
    let server = ctx.source.server, p = ctx.source.player;
    let v = G3.value(server), b = G3.band(server);
    ctx.source.sendSuccess(Text.of('Festivity ' + (Math.round(v * 10) / 10) + '  -  ' + b.name).gold(), false);
    if (p) {
      G3.showBossbar(server, 200, p.username, 5);                 // HUD pop kind 5 = command
      let L = G3.ledgerOf(server, p);
      ctx.source.sendSuccess(Text.of('You today: +' + (Math.round(L.me.good * 10) / 10) + ' good, -' + (Math.round(L.me.bad * 10) / 10) + ' bad (lifetime). Bad score (7 days): ' + (Math.round(G3.badScore(L.me) * 10) / 10)).gray(), false);
    }
    return 1;
  };

  event.register(Commands.literal('festivity')
    .executes(ctx => show(ctx))
    .then(Commands.literal('show').executes(ctx => show(ctx)))      // everyone: same as bare /festivity (HUD spec name)
    .then(Commands.literal('log').executes(ctx => {
      let log = G3.readJson(ctx.source.server, 'log', []);
      if (log.length == 0) { ctx.source.sendSuccess(Text.of('Nothing has happened yet.').gray(), false); return 1; }
      for (let i = Math.max(0, log.length - 10); i < log.length; i++) {
        let e = log[i]; ctx.source.sendSuccess(Text.of('Day ' + e.day + ': ' + e.text).gray(), false);
      }
      return 1;
    }))
    .then(Commands.literal('get').requires(src => src.hasPermission(2)).executes(ctx => show(ctx)))
    .then(Commands.literal('set').requires(src => src.hasPermission(2))
      .then(Commands.argument('value', Arguments.DOUBLE.create(event)).executes(ctx => {
        let server = ctx.source.server, v = Arguments.DOUBLE.getResult(ctx, 'value');
        let cur = G3.value(server);
        G3.change(server, v - cur, 'command', ctx.source.player, 'set by op');
        G3.logEvent(server, 'Festivity was set to ' + Math.round(v) + ' by an op');
        return 1;
      })))
    .then(Commands.literal('add').requires(src => src.hasPermission(2))
      .then(Commands.argument('amount', Arguments.DOUBLE.create(event))
        .executes(ctx => { G3.change(ctx.source.server, Arguments.DOUBLE.getResult(ctx, 'amount'), 'quest', ctx.source.player, 'quest'); return 1; })
        .then(Commands.argument('reason', Arguments.STRING.create(event)).executes(ctx => {
          G3.change(ctx.source.server, Arguments.DOUBLE.getResult(ctx, 'amount'), 'quest', ctx.source.player, String(Arguments.STRING.getResult(ctx, 'reason'))); return 1;
        }))))
    // /festivity credit <player> <action> : FTB Quests command rewards call this so the points land on the right player with caps
    // /festivity credit <player> <action> [mult] : advancement rewards.function and FTB Quests call this so points land on
    // the right player with caps. mult = hut level etc. Runs at permission level 2 (functions and quest rewards have it).
    .then(Commands.literal('credit').requires(src => src.hasPermission(2))
      .then(Commands.argument('player', Arguments.PLAYER.create(event))
        .then(Commands.argument('action', Arguments.STRING.create(event))
          .executes(ctx => {
            let p = Arguments.PLAYER.getResult(ctx, 'player'), a = String(Arguments.STRING.getResult(ctx, 'action'));
            let d = G3.score(ctx.source.server, p, a, 1, a.replace(/_/g, ' '));
            console.log('[Festivity] credit ' + p.username + ' ' + a + ' -> ' + (Math.round(d * 100) / 100)); return 1;
          })
          .then(Commands.argument('mult', Arguments.DOUBLE.create(event)).executes(ctx => {
            let p = Arguments.PLAYER.getResult(ctx, 'player'), a = String(Arguments.STRING.getResult(ctx, 'action')), m = Arguments.DOUBLE.getResult(ctx, 'mult');
            m = Math.max(0, Math.min(10, Number(m)));                   // hut levels go to 5; a typo in a reward function must not flood the bar
            let d = G3.score(ctx.source.server, p, a, m, a.replace(/_/g, ' '));
            console.log('[Festivity] credit ' + p.username + ' ' + a + ' x' + m + ' -> ' + (Math.round(d * 100) / 100)); return 1;
          })))))
    .then(Commands.literal('ledger').requires(src => src.hasPermission(2))
      .then(Commands.argument('player', Arguments.PLAYER.create(event)).executes(ctx => {
        let p = Arguments.PLAYER.getResult(ctx, 'player'), L = G3.ledgerOf(ctx.source.server, p);
        ctx.source.sendSuccess(Text.of(p.username + ': good ' + L.me.good.toFixed(1) + ', bad ' + L.me.bad.toFixed(1) + ', bad score 7d ' + G3.badScore(L.me).toFixed(1) + ', caps today ' + JSON.stringify(L.me.caps)), false);
        return 1;
      })))
    .then(Commands.literal('freeze').requires(src => src.hasPermission(2))
      .then(Commands.literal('on').executes(ctx => { G3.data(ctx.source.server).putBoolean('frozen', true); G3.hudSync(ctx.source.server, true); ctx.source.sendSuccess(Text.of('Festivity frozen'), true); return 1; }))
      .then(Commands.literal('off').executes(ctx => { G3.data(ctx.source.server).putBoolean('frozen', false); G3.hudSync(ctx.source.server, true); ctx.source.sendSuccess(Text.of('Festivity unfrozen'), true); return 1; })))
    .then(Commands.literal('reset').requires(src => src.hasPermission(2)).executes(ctx => {
      ctx.source.server.persistentData.remove('festivity');
      G3.data(ctx.source.server);
      G3.refreshBossbar(ctx.source.server); G3.hudSync(ctx.source.server, true);
      ctx.source.sendSuccess(Text.of('Festivity data reset to ' + F3.START), true); return 1;
    }))
  );
});


// ===== LOGIN / WELCOME BACK =====
// Login / logout: ledger last-seen, Welcome Back briefing (18.5), homecoming (+2 after 3 real days), stages sync.
const G4 = Fest, F4 = FEST;

PlayerEvents.loggedIn(event => {
  let p = event.player, server = p.server;
  let L = G4.ledgerOf(server, p), me = L.me;
  let away = G4.nowMs() - (me.lastSeen || G4.nowMs());
  let awayHours = away / 3600000;
  let firstTime = !me.everSeen;
  me.everSeen = true;
  let leftAt = me.leftValue;
  me.lastSeen = G4.nowMs();
  G4.saveLedger(server, L.all);

  server.scheduleInTicks(60, () => {
    G4.syncStages(p);
    let v = G4.value(server), b = G4.band(server);
    if (firstTime) {
      if (F4.FIRST_JOIN_INTRO) p.tell(Text.of('❄ Festivity: this world\'s Christmas spirit is a shared bar from 0 to 100. Right now it is ' + Math.round(v) + ' (' + b.name + '). Festive deeds raise it, naughty ones lower it. Type /festivity any time.').gold());
      return;
    }
    if (awayHours >= F4.WELCOME_BACK_HOURS) {
      let diff = (leftAt === undefined || leftAt === null) ? null : Math.round(v - leftAt);
      let days = Math.floor(awayHours / 24);
      let since = days >= 1 ? days + (days == 1 ? ' day' : ' days') : Math.round(awayHours) + ' hours';
      p.tell(Text.of('❄❄❄  Welcome back, ' + p.username + '  ❄❄❄').gold());
      p.tell(Text.of('Festivity is ' + Math.round(v) + ' (' + b.name + ')' + (diff === null ? '' : (diff == 0 ? ', unchanged' : (diff > 0 ? ', up ' : ', down ') + Math.abs(diff))) + ' since you left ' + since + ' ago.').white());
      let log = G4.readJson(server, 'log', []).filter(e => e.t > (me.lastSeen - away));
      for (let i = Math.max(0, log.length - 3); i < log.length; i++) p.tell(Text.of(' • ' + log[i].text).gray());
      if (log.length == 0) p.tell(Text.of(' • All quiet while you were away.').gray());
      if (awayHours >= F4.HOMECOMING_DAYS * 24) {
        let d = G4.score(server, p, 'homecoming', 1, 'welcome back');
        if (d > 0) p.tell(Text.of('Homecoming: +' + d + ' Festivity for coming back.').green());
      }
      G4.showBossbar(server, 200, p.username);
    }
  });
});

PlayerEvents.loggedOut(event => {
  let p = event.player, server = p.server;
  let L = G4.ledgerOf(server, p);
  L.me.lastSeen = G4.nowMs();
  L.me.leftValue = G4.value(server);
  G4.saveLedger(server, L.all);
});
