// priority: 25
// FESTIVITY QUEST HOOKS (DRAFT v6, 2026-11-08: command syntax verified against FTB Quests 2101.1.23 source; v5 silent command per the CLEAN JOIN rule)
// - completes the FTB Quests checkmark quests in the Naughty / Nice List chapters.
// FTB XMod Compat is NOT in the pack, so we drive FTB Quests through its command. VERIFIED (FTBTeam/FTB-Quests tag v2101.1.23, MC 1.21.1,
// common/.../ftbquests/command/FTBQuestsCommands.java): /ftbquests change_progress <players> (reset|complete) <quest_object> and
// /ftbquests change_progress <players> (reset-all|complete-all). <players> = EntityArgument.players() (a name or selector), <quest_object> =
// StringArgumentType.string(): a hex quest id (Long.parseLong(id, 16), case-insensitive, unquoted is fine) or '#<tag>' for the first quest object
// carrying that tag. Needs permission level 2 on the source (server.runCommandSilent runs as the server: ok). Unknown id -> 'No quest object found
// for ID ...' (swallowed by the silent run, so the line is logged below for a manual check).
// REQUIRED QUEST IDS (must exist in config/ftbquests/quests/chapters/*.snbt, field id: of the quest, exactly these hex values, or the hooks do nothing):
//   7C0A15F3B1D2E505 festive_feast | 7C0A15F3B1D2E50C drive_off_claws | 7C0A15F3B1D2E50F unwrapped | 7C0A15F3B1D2E40D naughty_dare
//   (alternative: give the quests tags: ["festivity_festive_feast"] etc. in the .snbt and use '#festivity_festive_feast' as the id here: survives re-creating a quest).
// Villager-safe: read-only hooks, nothing touches villagers or citizens.

const FQ = {
  CMD: 'ftbquests change_progress {player} complete {quest}',   // verified v6: literal 'change_progress' > players > literal 'complete' > string quest_object
  QUESTS: {
    festive_feast:   '7C0A15F3B1D2E505',   // Nice: ate festive food while Merry+
    drive_off_claws: '7C0A15F3B1D2E50C',   // Nice: among the hitters when Santy Claws fled
    unwrapped:       '7C0A15F3B1D2E50F',   // Nice: freed a kidnapped friend
    naughty_dare:    '7C0A15F3B1D2E40D'    // Naughty: did the Naughty Letter dare
  }
};
const FQ_F = Fest;

function fqComplete(server, playerName, key) {
  let id = FQ.QUESTS[key]; if (!id) return;
  // once per player per quest (FTB ignores repeats, but skip the command spam)
  for (let p of FQ_F.online(server)) if (p.username == playerName) {
    if (p.persistentData.getBoolean('fq_' + key)) return;
    p.persistentData.putBoolean('fq_' + key, true);
  }
  let c = FQ.CMD.replace('{player}', playerName).replace('{quest}', id);
  console.log('[Festivity] quest ' + key + ' for ' + playerName + ': /' + c);
  // v5: silent (rule: every script command via runCommandSilent; a non-silent console command echoes "[Server: ...]" to ops).
  // The command line is logged above so a wrong FTB Quests syntax can still be checked by running it by hand.
  FQ_F.cmd(server, c);
}

// Nice: Festive Feast (festive food eaten while Merry or Jolly)
ItemEvents.foodEaten(event => {
  try {
    let p = event.player; if (!p || !event.item.hasTag('chop:festive_food')) return;
    let b = FQ_F.band(p.server).id;
    console.log('[Festivity] feast hook: ' + p.username + ' ate ' + event.item.id + ' at ' + b);
    if (b == 'merry' || b == 'jolly') fqComplete(p.server, p.username, 'festive_feast');
  } catch (e) {}
});

// Hooks into the Phase 2 / Phase 3 flows: we wrap their functions (same shared script scope, loaded after them).
// Wrapped in one IIFE: Rhino rejected block-level const here ("redeclaration of var fq_origClawsLeave", TEST v2).
// Phase 2: clawsLeave(server, 'driven') -> every hitter; release(server, b, 'rescued', rescuer) -> the rescuer.
(function () {
  if (typeof clawsLeave == 'function') {
    var origLeave = clawsLeave;
    clawsLeave = function (server, why) {
      var c = null; try { c = FQ_F.readJson(server, 'claws', null); } catch (e) {}
      origLeave(server, why);
      if (why == 'driven' && c && c.hitters) for (var name in c.hitters) fqComplete(server, name, 'drive_off_claws');
    };
  }
  if (typeof release == 'function') {
    var origRelease = release;
    release = function (server, b, how, rescuer) {
      origRelease(server, b, how, rescuer);
      if (how == 'rescued' && rescuer) fqComplete(server, rescuer, 'unwrapped');
    };
  }
  // Phase 3: the Naughty Letter dare is scored with key 'naughty_dare'; hook the score call through a tiny wrapper on Fest.score.
  var origScore = Fest.score;
  Fest.score = function (server, player, key, mult, reason) {
    var d = origScore(server, player, key, mult, reason);
    try { if (key == 'naughty_dare' && player) fqComplete(server, player.username, 'naughty_dare'); } catch (e) {}
    return d;
  };
})();

// /festivity quest reset : clears the once-per-player flags so the hooks fire again (TEST only; FTB progress itself: /ftbquests change_progress <player> reset <id>, verified v2101.1.23)
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event;
  event.register(Commands.literal('festivity')
    .then(Commands.literal('quest').requires(src => src.hasPermission(2))
      .then(Commands.literal('reset').executes(ctx => {
        let p = ctx.source.player; if (!p) return 0;
        for (let k in FQ.QUESTS) p.persistentData.remove('fq_' + k);
        ctx.source.sendSuccess(Text.of('Festivity quest hook flags cleared for ' + p.username), true); return 1;
      })))
  );
});

console.log('[Festivity] quest hooks draft v6 loaded (ftbquests change_progress syntax verified against 2101.1.23, silent)');
