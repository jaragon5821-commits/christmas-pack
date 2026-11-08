// priority: 25
// FESTIVITY QUEST HOOKS (DRAFT) - completes the FTB Quests checkmark quests in the Naughty / Nice List chapters.
// FTB XMod Compat is NOT in the pack, so we drive FTB Quests through its command: /ftbquests change_progress <player> complete <quest id>
// (VERIFY the exact syntax in TEST with tab-complete: FTB Quests 2101.x). Quest ids match phase3_draft/config/ftbquests/quests/chapters/*.snbt.
// Villager-safe: read-only hooks, nothing touches villagers or citizens.

const FQ = {
  CMD: 'ftbquests change_progress {player} complete {quest}',   // VERIFY
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
  // non-silent so a wrong FTB Quests syntax shows in the log (runCommandSilent returns nothing in KubeJS 2101)
  try { server.runCommand(c); } catch (e) { console.warn('[Festivity] quest command failed: ' + e); FQ_F.cmd(server, c); }
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

// /festivity quest reset : clears the once-per-player flags so the hooks fire again (TEST only; FTB progress itself: /ftbquests change_progress <player> reset <id>)
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

console.log('[Festivity] quest hooks draft v4 loaded');
