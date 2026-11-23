---
navigation:
  parent: index.md
  title: Plots and Your Own Builds
  icon: minecraft:spyglass
  position: 4
---

# Plots and Your Own Builds

Want to build something yourself inside the town? Claim the ground first, and the town will not build, pave, wall or terraform there.

## Seeing the plots

* **Plot Surveyor:** craft it from a spyglass with paper on all four sides. Hold it in town to see the plots outlined on the ground: blue claimed, green open, orange likely to be used by the town, yellow a building the planner has picked, grey buildings, white the plaza's planned streets, and cyan a protected zone. Right-click the air to hear what the plot you are standing on is.
* **Plot map:** the third tab of the Planning Board, or a **Plan Map Board** in town (craft: paper, map, paper on top; stick, Planning Board, stick below). Green tags are open plots. Owners and officers claim by dragging a box, or by clicking two corners. Click one open plot twice to claim just that plot. The answer appears on a paper slip.

## Marking your own plot

Any member of the town can mark out a plot with the **Plot Surveyor** in hand:

1. **Mark:** right-click a block for one corner, then the opposite corner. An outline appears with a note in chat.
   * **Green:** it can be claimed. If it touches your own plot, it joins it.
   * **Yellow:** it can be claimed, but the town had plans for that ground.
   * **Red:** it can't, and chat says why (a road, a building, someone else's plot, too big, and so on).
2. **Claim:** right-click inside a green or yellow outline.
3. **Add a piece:** mark a new box that touches your plot to make L or T shapes, up to 4 pieces.
4. **Release:** sneak and right-click inside a piece, then again within 10 seconds. Only that piece is given back.
5. **Change your mind:** sneak and right-click outside any plot to clear your marking. Markings also fade after 5 minutes.

A plot can be up to 96 blocks on each side. Claimed plots are labelled with their owner's name. The town owner and officers can release anyone's plot.

## Claiming by command

* `/townwright plot <id> list` lists the town's plots.
* `/townwright plot <id> claim <lot>` claims a plot from the list, or `claimbox x1 z1 x2 z2` claims your own size (3 to 96 blocks a side). If the claim gets a warning, run the same command again with `confirm` on the end.
* `/townwright plot <id> release x z` (or the plot's name, like `release C6`) gives a plot back.

You can't claim over a road, a planned street, the plaza, a building, or outside the town's land, so a claim never blocks the town's streets.

## Your own houses

A house you build inside town (24 or more blocks you placed in one chunk) becomes your plot by itself. The plaza never picks a side that would cover it, and town work never breaks blocks a player placed.

## Zone Marker

For a quick no-build rectangle, use the **Zone Marker** (8 sticks around a gold Structurize scepter, or `/townwright zone wand`). Right-click one corner, then the opposite corner, up to 48 blocks a side. Townwright plans, builds and lights around it. Sneak-right-click inside a zone to remove it. You need officer rank.
