// chop_whats_new.js v0.1.2 (Sleigh, 2026-11-18) - "What's new" note, shown ONCE per pack update to each player on login.
// Edit WN_VERSION and WN_LINES at each install. A player who has seen this version is not shown it again.
// Chat only (no screen, no client mod), so it works the same on LAN, e4mc and the server.
const WN_VERSION = '2026.11.19-1'
// Lines below are for Festivity 0.10.9 r21 (launch jar). If the install falls back to 0.10.7 r4, use the FALLBACK list instead.
const WN_LINES = [
  'Festivity 0.10.9: animals with personalities; tame the Sea Otter, Hedgehog, Frostpuff and the field mouse',
  'Advent doors, presents rework, frozen drinks and new food icons',
  'Red Kitchen: red chile crop and feast pots (find its Lost Book)',
  '21 new Immersive Melodies instruments, plus carol melodies',
  'Zone music has its own volume slider; big events get intro screens',
  'Santy Claws only arrives after the crash event',
  'New quests: Winter Pantry, Claws\' Deal',
  'Blueprint Board: craft the Builder Elf to build your blueprints for you',
  'AutoTorch!: toggle it with its keybind (Controls menu)'
]
// FALLBACK (0.10.7 r4): 'Festivity 0.10.7: Advent doors, presents rework, frozen drinks, new food icons', 'Santy Claws is locked until the crash event',
//   'New quests: Winter Pantry, Claws\' Deal', 'AutoTorch!: toggle it with its keybind (Controls menu)'
const WN_CHANGELOG = 'https://github.com/jaragon5821-commits/christmas-pack/blob/test/CHANGELOG.md'
PlayerEvents.loggedIn(event => {
  let p = event.player
  try {
    if (String(p.persistentData.getString('chopWhatsNew')) == WN_VERSION) return
    event.server.scheduleInTicks(100, () => {
      try {
        p.tell(Text.gold('What\'s new in Chop\'s Christmas Special ' + WN_VERSION).bold())
        WN_LINES.forEach(l => p.tell(Text.of(' - ').gray().append(Text.white(l))))
        p.tell(Text.aqua('[Full changelog]').underlined().clickOpenUrl(WN_CHANGELOG).hover('Opens the changelog in your browser'))
        p.persistentData.putString('chopWhatsNew', WN_VERSION)
      } catch (e2) { console.warn('[chop whatsnew] tell failed: ' + e2) }
    })
  } catch (e) { console.warn('[chop whatsnew] ' + e) }
})
console.info('[chop whatsnew] v0.1.2 version ' + WN_VERSION + ', ' + WN_LINES.length + ' lines')