// chop_winter_cycle.js v0.1.1 (Chop's Christmas pack) - KubeJS server script
// v0.1.1 (build thread): wrapped in an IIFE so /reload can't hit a const redeclaration (KubeJS 2101 rule).
// Winter-heavy season loop for Serene Seasons. Serene Seasons can't give seasons
// different lengths, so this script turns SS's own cycle off and picks the season itself.
//   THAW_DAYS = 0  -> permanent winter.
//   THAW_DAYS > 0  -> WINTER_DAYS of winter, then THAW_DAYS of thaw, repeat.
// Counts in-game days from the overworld clock (dayTime / 24000).
// Silent: no chat output (CLEAN JOIN rule).
(function () {
  let CHOP_WC = {
    ENABLED: true,
    WINTER_DAYS: 9,
    THAW_DAYS: 2,
    WINTER_SUB: 'mid_winter',
    THAW_SUB: 'early_summer',
    CHECK_EVERY_TICKS: 200
  }
  if (!CHOP_WC.ENABLED) return

  let chopWcTicks = 0

  ServerEvents.tick(event => {
    chopWcTicks++
    if (chopWcTicks < CHOP_WC.CHECK_EVERY_TICKS) return
    chopWcTicks = 0

    let server = event.server
    let level = server.overworld()
    let day = Math.floor(level.getDayTime() / 24000)
    let cycle = CHOP_WC.WINTER_DAYS + CHOP_WC.THAW_DAYS
    let want = (CHOP_WC.THAW_DAYS <= 0 || (day % cycle) < CHOP_WC.WINTER_DAYS)
      ? CHOP_WC.WINTER_SUB : CHOP_WC.THAW_SUB

    let pd = server.persistentData
    if (pd.getString('chop_wc_season') !== want) {
      server.runCommandSilent('gamerule doSeasonCycle false')
      server.runCommandSilent('season set ' + want)
      pd.putString('chop_wc_season', want)
    }
  })
})()
