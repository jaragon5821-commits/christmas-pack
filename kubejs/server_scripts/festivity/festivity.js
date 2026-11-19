// priority: 50
// ============================================================================================
//  FESTIVITY core SHIM v1.0.0 (Festivity jar 0.10.3+, boss E21 11-16: the core moved into Java).
//  The bar, bands, scoring, ledger bookkeeping, drift, HUD bridge, omens, Welcome Back, point sources and the /festivity
//  commands now live in com.chop.festivity.core (FestCore / FestSources). This file only keeps the old API (FEST, Fest and the
//  shared helper functions) so the event scripts (phase 2-5, pets, quests, fire, donation bucket) keep working unchanged,
//  and syncs the KubeJS stages festivity_<band> / festivity_merry_plus.
//  The jar's core stays idle until this shim attaches, so an old festivity.js can never double-count.
//  Data: the old 'festivity' compound in kubejs_persistent_data.nbt is copied ONCE into festivity_core.dat by the jar and left
//  untouched; the event scripts keep their own keys in it (event, claws, heist, outpost, letter, sleigh).
// ============================================================================================

const FestCore = Java.loadClass('com.chop.festivity.core.FestCore');
// 0.10.4 E8: the night ceiling (one big event per night); scripts ask Fest.budget(server, id) before a big start. Old jar: always yes.
var FestBudget = null; try { FestBudget = Java.loadClass('com.chop.festivity.core.NightBudget'); } catch (e) { FestBudget = null; }
// 0.10.5 (boss Q1): niceness = faded nice minus naughty (x10) from the one personal record (Java NaughtyNice); bad events pick the highest first
var FestNN = null; try { FestNN = Java.loadClass('com.chop.festivity.ledger.NaughtyNice'); } catch (e) { FestNN = null; }
function festNiceness(p) { if (!FestNN || !p) return 0; try { return Number(FestNN.nice(p)) - Number(FestNN.naughty(p)); } catch (e) { return 0; } }
function festBudget(server, id) { if (!FestBudget) return true; try { return !!FestBudget.claim(server, id); } catch (e) { return true; } }

const FEST = {
  VERSION: 'shim-1.2.0',
  DEATH_PENALTY: 5,
  // band table kept for scripts that read it (ids, names, edges). The jar owns the real values.
  BANDS: [
    { id: 'jolly',     name: 'Jolly',       lo: 80, hi: 100, color: 'green',  title: 'The world is Jolly!' },
    { id: 'merry',     name: 'Merry',       lo: 60, hi: 79,  color: 'green',  title: 'The world is Merry' },
    { id: 'quiet',     name: 'Quiet',       lo: 50, hi: 59,  color: 'white',  title: 'A quiet winter' },
    { id: 'grumbling', name: 'Grumbling',   lo: 40, hi: 49,  color: 'yellow', title: 'The world is Grumbling' },
    { id: 'bleak',     name: 'Bleak',       lo: 25, hi: 39,  color: 'purple', title: 'Bleak days have come' },
    { id: 'clawseve',  name: "Claws' Eve",  lo: 10, hi: 24,  color: 'red',    title: "Claws' Eve has begun" },
    { id: 'clawsnight',name: 'Claws Night', lo: 0,  hi: 9,   color: 'red',    title: 'CLAWS NIGHT' }
  ],
  // The jar's action table (FestCore.ACTIONS) is the real one; this copy is kept for scripts that look keys up.
  // Scripts may ADD actions here (charity, baby_born ...); score() passes a script-added key to the jar the first time it is used.
  ACTIONS: {
    festive_food:   { pts: 0.5,  cap: 5 },
    give_present:   { pts: 2,    cap: 6 },
    place_decor:    { pts: 0.2,  cap: 6, taper: 4 },   // 11-16 boss: full points for the first 20 decor a day, then a quarter (cap 6 = 60 more)
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
    kill_animal:    { pts: -0.1, free: 10, cap: -1 },  // 11-16 boss: free kills doubled (5 -> 10); the penalty reads 'overhunting'
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
const F = FEST;

// ---------- storage: the KubeJS compound stays for the event scripts' own keys ----------
function fdata(server) {
  let pd = server.persistentData;
  if (!pd.contains('festivity')) pd.put('festivity', NBT.compoundTag());
  return pd.getCompound('festivity');
}
function getValue(server) { return Number(FestCore.value(server)); }
function readJson(server, key, fallback) {
  if (key == 'log') { try { return JSON.parse(String(FestCore.logJson(server))); } catch (e) { return fallback; } }
  try { return JSON.parse(fdata(server).getString(key) || ''); } catch (e) { return fallback; }
}
function writeJson(server, key, obj) { if (key != 'log' && key != 'ledger') fdata(server).putString(key, JSON.stringify(obj)); }

// ---------- bands ----------
function bandFor(v) { for (let b of F.BANDS) if (v >= b.lo) return b; return F.BANDS[F.BANDS.length - 1]; }
function currentBand(server) { let id = String(FestCore.bandId(server)); for (let b of F.BANDS) if (b.id == id) return b; return bandFor(getValue(server)); }

// ---------- time and helpers (unchanged) ----------
function gameTime(server) { return Number(server.overworld().time); }
function dayTime(server)  { return Number(server.overworld().getDayTime()); }
function dayCount(server) { return Math.floor(dayTime(server) / 24000); }
function findPlayer(server, name) { for (let p of server.players) if (p.username == name) return p; return null; }
function online(server) { return FestCore.activePlayers(server); }          // E16: ACTIVE (non-AFK) players everywhere
function onlineCount(server) { return Number(FestCore.activeCount(server)); }
function cmd(server, s) { return server.runCommandSilent(s); }
function fid(id) { return id; }
function f5isType(e, vanilla) { try { return String(e.type) == vanilla; } catch (x) { return false; } }
function nowMs() { return Date.now(); }
function jsonText(s, color) { return JSON.stringify({ text: s, color: color || 'white' }); }
function logEvent(server, text) { FestCore.logEvent(server, String(text)); }

// ---------- ledger: bookkeeping lives in the jar; script-owned fields (naughtyMarks ...) round-trip through saveLedger ----------
function ledgerOf(server, player) {
  let me = {};
  try { me = JSON.parse(String(FestCore.ledgerJson(server, player))); } catch (e) {}
  return { all: { _server: server, _player: player, _me: me }, me: me };
}
function saveLedger(server, all) { try { if (all && all._player) FestCore.ledgerMerge(server, all._player, JSON.stringify(all._me)); } catch (e) {} }
function badScore(entry) { return entry && entry._bad7 ? Number(entry._bad7) : 0; }   // E5: the one fading record, in points

// ---------- display ----------
function refreshBossbar(server) { FestCore.refreshBar(server); }
function showBossbar(server, ticks, who, popKind) { FestCore.showBarFor(server, ticks, who ? String(who) : '', popKind || 0); }
function ticker(server, player, delta, reason) { if (player) cmd(server, 'title ' + player.username + ' actionbar ' + jsonText((delta >= 0 ? '+' : '') + (Math.round(delta * 10) / 10) + ' Festivity' + (reason ? '  (' + reason + ')' : ''), delta >= 0 ? 'green' : 'red')); }
function hudSync(server, force) { FestCore.hudSync(server, !!force); }
function hudPop(server, kind) { FestCore.hudPop(server, kind); }
function hudInit(server) { FestCore.hudSync(server, true); }
function announce(server, text, color) { cmd(server, 'tellraw @a ' + jsonText(text, color || 'gold')); }
function inGrace(server) { return !!FestCore.inGrace(server); }

// ---------- the bar ----------
function change(server, delta, kind, player, reason) { return Number(FestCore.changeJs(server, delta, kind ? String(kind) : 'script', player || null, reason ? String(reason) : null)); }
function score(server, player, key, mult, reason) {
  if (!player) return 0;
  let a = F.ACTIONS[key];
  if (a) { try { FestCore.defineAction(String(key), Number(a.pts || 0), Number(a.cap || 0), Number(a.free || 0), Number(a.taper || 0)); } catch (e) {} }
  return Number(FestCore.score(server, player, String(key), mult || 1, reason ? String(reason) : null));
}

// ---------- KubeJS stages (the jar cannot set them) ----------
function syncStages(player) {
  try {
    let st = player.stages, band = currentBand(player.server);
    for (let b of F.BANDS) if (b.id != band.id) st.remove('festivity_' + b.id);
    st.add('festivity_' + band.id);
    if (getValue(player.server) >= 60) st.add('festivity_merry_plus'); else st.remove('festivity_merry_plus');
  } catch (e) { console.warn('[Festivity] stage sync failed: ' + e); }
}

// ---------- attach + script actions ----------
// 0.10.4 (Judge 065 F1): the guard is the Java core's own flag, not a script variable, so a core that lost its attach is re-attached
var fest_defined = false, fest_lastBand = '';
function festAttach(server) {
  if (!fest_defined) {
    fest_defined = true;
    for (let k of Object.keys(F.ACTIONS)) {
      let a = F.ACTIONS[k];
      try { FestCore.defineAction(k, Number(a.pts || 0), Number(a.cap || 0), Number(a.free || 0), Number(a.taper || 0)); } catch (e) { console.warn('[Festivity] action ' + k + ': ' + e); }
    }
  }
  if (FestCore.attached()) return;
  FestCore.attach(server, F.VERSION);
  console.log('[Festivity] core shim attached to the Java core: value ' + getValue(server) + ' (' + currentBand(server).name + ')');
}
ServerEvents.loaded(event => festAttach(event.server));
ServerEvents.tick(event => {
  let server = event.server;
  if (server.tickCount % 20 != 0) return;
  if (!FestCore.attached()) festAttach(server);                 // /reload, or a core that started after the shim
  // 0.10.4 (Judge 065 F2): phase2/phase5 still read 'frozen' from this compound; mirror the Java core's freeze once a second
  try { fdata(server).putBoolean('frozen', !!FestCore.frozen(server)); } catch (e) {}
  let b = String(FestCore.bandId(server));
  if (b != fest_lastBand) { fest_lastBand = b; for (let p of server.players) syncStages(p); }
});
PlayerEvents.loggedIn(event => { let p = event.player; p.server.scheduleInTicks(60, () => syncStages(p)); });

// shared table used by the event scripts
const Fest = {
  data: fdata, value: getValue, band: currentBand, bandFor: bandFor, change: change, score: score,
  ledgerOf: ledgerOf, saveLedger: saveLedger, badScore: badScore, logEvent: logEvent, readJson: readJson,
  showBossbar: showBossbar, refreshBossbar: refreshBossbar, hudSync: hudSync, hudPop: hudPop, hudInit: hudInit,
  announce: announce, ticker: ticker, syncStages: syncStages, inGrace: inGrace, budget: festBudget, niceness: festNiceness,
  cmd: cmd, online: online, onlineCount: onlineCount, jsonText: jsonText, nowMs: nowMs,
  gameTime: gameTime, dayTime: dayTime, dayCount: dayCount
};
