// Colony Autopilot, Herbs and Harvest and Animal Pen hand out a guide on first join and have no config for it.
// Josh wants only the Handbook given (clean join). Runs once per player and only touches what the first seconds
// after the first login put in the inventory, so a book crafted later survives.
// v0.2.0 (Scripts, 2026-11-09, PM): + animal_pen:guide_book (animal_pen_config.json has no option for it).
//   Two passes (3 s and 10 s) in case a mod gives its book a little later.
// v0.2.1: Animal Pen's book is really patchouli:guide_book with component patchouli:book = "animal_pen:guide_book"
//   (Build test 11-09). Matched the same way as the Autopilot guideme book. The Handbook is guideme:guide + chopxmas:handbook, so it can't match.
// v0.2.2 (audit M7, 2026-11-11): wrapped in an IIFE so /reload cannot hit a const redeclaration (same rule as chop_winter_cycle.js).
;(function () {
  const CHOP_STRIP_IDS = ['herbsandharvest:guide_book', 'animal_pen:guide_book']
  function chopStripJoinBooks(p) {
    for (let i = 0; i < p.inventory.containerSize; i++) {
      let it = p.inventory.getItem(i)
      let autopilot = it.id == 'guideme:guide' && String(it.getComponents()).indexOf('colonyautopilot:guide') >= 0
      let animalPen = it.id == 'patchouli:guide_book' && String(it.getComponents()).indexOf('animal_pen:guide_book') >= 0
      if (autopilot || animalPen || CHOP_STRIP_IDS.indexOf(String(it.id)) >= 0) p.inventory.setItem(i, Item.empty)
    }
  }
  PlayerEvents.loggedIn(event => {
    const p = event.player
    if (p.persistentData.getBoolean('chopCleanJoinBooks')) return   // same flag as v0.1: players who already joined are not re-scanned
    event.server.scheduleInTicks(60, () => chopStripJoinBooks(p))
    event.server.scheduleInTicks(200, () => {
      chopStripJoinBooks(p)
      p.persistentData.putBoolean('chopCleanJoinBooks', true)
    })
  })
})()
