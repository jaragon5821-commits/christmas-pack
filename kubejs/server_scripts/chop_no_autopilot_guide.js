// Colony Autopilot and Herbs and Harvest hand out a guide on first join and have no config for it.
// Josh wants neither given. Runs once per player and only touches what the first seconds after the
// first login put in the inventory, so a book crafted later survives.
PlayerEvents.loggedIn(event => {
  const p = event.player
  if (p.persistentData.getBoolean('chopCleanJoinBooks')) return
  event.server.scheduleInTicks(60, () => {
    for (let i = 0; i < p.inventory.containerSize; i++) {
      let it = p.inventory.getItem(i)
      let autopilot = it.id == 'guideme:guide' && String(it.getComponents()).indexOf('colonyautopilot:guide') >= 0
      if (autopilot || it.id == 'herbsandharvest:guide_book') p.inventory.setItem(i, Item.empty)
    }
    p.persistentData.putBoolean('chopCleanJoinBooks', true)
  })
})
