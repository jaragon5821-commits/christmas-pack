---
navigation:
  parent: index.md
  title: Founding a Town
  icon: minecraft:oak_sapling
  position: 0
---

# Founding a Town

1. **Place your Town Hall.** Townwright never places one for you, so where you put it matters. Flat ground is cheapest, because a hall on a slope needs earth filled in under its floor.
2. **The Town Planner.** Once your Town Hall stands, Townwright hands you (the owner) a Town Planner the next time you are online. It is a board 3 blocks wide and 2 tall: place it on a wall or floor with a block of room on each side and one row above. Right-click any part of it.
3. **Town setup.** A new town asks a few questions first: town layout, building look, roads and bridges, walls and foundations, and helpers. Every question already has an answer picked, so you can just press **Next >**. On the last page, press **Confirm and start building**. Nothing is built until you do, and you can change any answer later on the **Town settings** tab.
4. **The first proposal is a Builder's Hut.** Press **Yes** on the **Plans** tab.

A town's plan (Plaza, Main Street, Grid, Walled Ring or Village) can be changed until 5 buildings stand. Then it is set for good, and the board warns you when you're down to your last chance.

## Paying for it

Builders **buy** their materials from the town's treasury in **emeralds**. A new town starts with 56 to get the first builds going. After that, keep the treasury topped up or the builders wait.

* Sneak-right-click the Town Hall while holding emeralds, or put them in the Town Hall's racks. Emeralds in a Warehouse stay there, because your citizens may need them as materials.
* Or carry the materials to the Builder's Hut yourself.

Monsters sometimes drop emeralds, and loot chests hold a few. A town also earns a little every day, more as its huts level up and the happier its people are. Got old ColonyBucks? Craft each one into 4 emeralds.

## Head start

Townwright gives new towns a little push: builders start with their building skills raised a little, and a builder out at a site can take materials straight from its own hut instead of walking home. Nothing is free, though. The hut still has to be stocked.

**Supply camps and ships are switched off on this server for now.** New towns don't get one, but they still get their starter emeralds. An order that was placed before the switch and isn't built yet is cancelled and its plot freed. A camp or ship that already stands is left alone.

* **Turning them back on (ops):** set `economy.supplyCamps = true` in the server's Townwright config. Then a new town gets a **Supply Camp** (or a **Supply Ship** out on open water) at its edge, and the **Supply camp / ship** card in the board's **Town settings** picks per town: **auto**, **camp**, **ship** or **off**.
* **Take a standing one down:** `/townwright supplycamp <id> reclaim` (or `/colonyautopilot supplycamp <id> reclaim`), run twice within 10 seconds to confirm. Anything left in its chests comes to you, and it takes down only the blocks it placed: anything you built or changed stays, and so does the floor. The plot is freed and it won't be built again. Owner and officers only (and server ops).

Hover over a MineColonies hut item to see how that building stands in your nearest town: not built yet, being built, its level, or what it needs for the next level.

Lost the board? `/townwright ui` opens the board screen for the town you're standing in, or the one you own (add `plans` or `map` for the other tabs). For a new Town Planner, sneak and right-click your Town Hall while holding **paper**: one paper becomes a Town Planner (owners and officers, once every 10 minutes per town). You can also craft one: paper, map, paper on top; spruce planks, crafting table, spruce planks below.
