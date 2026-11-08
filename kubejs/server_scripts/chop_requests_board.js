// chop_requests_board.js  v0.1.2 (TEST, after the build pause)  - scripts thread, 2026-11-05
// Boss D99 option C: Colony Requests Board with a "most needed" spotlight.
//   - Any block in #chop:requests_board placed inside a colony becomes a board for that colony (many boards per colony ok).
//   - Floating text above the board (vanilla text_display): the "most needed" item (the one waiting longest) in gold,
//     then the top 5 builder shortages: "Oak Planks x64 - Bakery". Refreshed every 45 s, only while a player is within 32 blocks.
//   - Right-click the board: the full list in chat (only to that player), plus "Drop materials in a Stash or the warehouse".
//   - Source: every Builder's Hut's needed-resources list (the same list as the hut's Resources tab / clipboard):
//     needed = amount - available. Nothing is taken or given; read only.
//   - Until Assets makes a board block, TEST_BLOCKS puts a vanilla lectern (and Supplementaries' notice board if loaded) in the tag.
//   - Clean join: nothing on join. Op: /chopboard refresh | list
// KubeJS 2101: IIFE, early return, no declarations inside nested blocks.
(function () {
  if (!Platform.isLoaded('minecolonies')) return;

  const CFG = {
    TEST_BLOCKS: ['minecraft:lectern', 'supplementaries:notice_board'],
    BLOCKS: [],                 // the Assets board id later
    REFRESH_TICKS: 900,         // 45 s
    NEAR: 32,                   // blocks: only boards with a player this close are refreshed
    TOP: 5,                     // lines in the floating text
    CHAT_MAX: 20,               // lines on right-click
    LOG: false                  // v0.1.2: TEST passed; errors still log
  };

  let ColonyManager = Java.loadClass('com.minecolonies.api.colony.IColonyManager');
  let BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
  function log(m) { if (CFG.LOG) console.info('[chop board] ' + m); }

  ServerEvents.tags('block', event => {
    CFG.TEST_BLOCKS.concat(CFG.BLOCKS).forEach(id => { if (Platform.isLoaded(id.split(':')[0]) || id.indexOf('minecraft:') == 0) event.add('chop:requests_board', id); });
  });

  // ---- board registry (server persistent data, survives restarts) ----
  function boards(server) {
    let pd = server.persistentData;
    try { return JSON.parse(String(pd.getString('chopBoards') || '[]')); } catch (e) { return []; }
  }
  function saveBoards(server, list) { server.persistentData.putString('chopBoards', JSON.stringify(list)); }
  function keyOf(dim, x, y, z) { return dim + '|' + x + '|' + y + '|' + z; }
  function tagOf(b) { return 'chop_board_' + Math.abs(b.x) + '_' + Math.abs(b.y) + '_' + Math.abs(b.z) + (b.x < 0 ? 'n' : 'p') + (b.z < 0 ? 'n' : 'p'); }

  // ---- what the colony's builders need ----
  let firstSeen = {};   // colonyId|itemId -> game time first seen missing (for the "most needed" spotlight)
  function gameTime(server) { try { return Number(server.overworld().getGameTime()); } catch (e) {} try { return Number(server.overworld().gameTime); } catch (e) {} return 0; }

  function neededOf(b) {
    try { if (typeof b.getNeededResources == 'function') return b.getNeededResources(); } catch (e) {}
    try { for (let m of b.getModules()) { if (typeof m.getNeededResources == 'function') return m.getNeededResources(); } } catch (e) {}
    return null;
  }
  function jobName(colony, b) {
    try {
      for (let wo of colony.getWorkManager().getWorkOrders().values()) {
        let by = null; try { by = wo.getClaimedBy(); } catch (e) {}
        if (by && by.equals(b.getID())) {
          try { return String(wo.getDisplayName().getString()); } catch (e) {}
          try { let p = String(wo.getStructurePath()); return p.substring(p.lastIndexOf('/') + 1).replace(/\.blueprint$/, '').replace(/[0-9]+$/, ''); } catch (e) {}
        }
      }
    } catch (e) {}
    return 'a build';
  }
  function colonyNeeds(server, colony) {
    let rows = [], now = gameTime(server), seenNow = {}, byId = {};
    try {
      for (let b of colony.getServerBuildingManager().getBuildings().values()) {
        let res = neededOf(b);
        if (!res) continue;
        let job = null;
        for (let r of res.values()) {
          let missing = 0, stack = null;
          try { missing = Number(r.getAmount()) - Number(r.getAvailable()); stack = r.getItemStack(); } catch (e) { continue; }
          if (missing <= 0 || !stack || stack.isEmpty()) continue;
          if (job === null) job = jobName(colony, b);
          let id = String(BuiltInRegistries.ITEM.getKey(stack.getItem()));
          let fk = colony.getID() + '|' + id;
          if (!firstSeen[fk]) firstSeen[fk] = now;
          seenNow[fk] = true;
          let prev = byId[id];   // v0.1.2: one line per item, summed across huts
          if (prev) { prev.n += missing; if (prev.jobs.indexOf(job) < 0) prev.jobs.push(job); continue; }
          byId[id] = { id: id, name: String(stack.getHoverName().getString()), n: missing, jobs: [job], since: firstSeen[fk] };
          rows.push(byId[id]);
        }
      }
    } catch (e) { console.warn('[chop board] could not read needs: ' + e); }
    for (let k in firstSeen) if (k.indexOf(colony.getID() + '|') == 0 && !seenNow[k]) delete firstSeen[k];
    rows.forEach(r => { r.job = r.jobs.length <= 2 ? r.jobs.join(', ') : r.jobs.length + ' builds'; });
    rows.sort((a, b) => b.n - a.n);
    let star = null;
    for (let r of rows) if (!star || r.since < star.since) star = r;
    return { rows: rows, star: star };
  }

  // ---- floating text ----
  function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'"); }
  function displayText(colony, needs) {
    let parts = ['{"text":"' + esc(colony.getName()) + ' needs\\n","color":"white","bold":true}'];
    if (needs.rows.length == 0) parts.push('{"text":"Nothing right now. Thank you!","color":"green","bold":false}');
    else {
      if (needs.star) parts.push('{"text":"\u2605 Most needed: ' + esc(needs.star.name) + ' x' + needs.star.n + '\\n","color":"gold","bold":false}');
      let shown = 0;
      for (let r of needs.rows) {
        if (shown >= CFG.TOP) break;
        if (needs.star && r === needs.star) continue;
        parts.push('{"text":"' + esc(r.name) + ' x' + r.n + ' - ' + esc(r.job) + '\\n","color":"gray","bold":false}');
        shown++;
      }
      if (needs.rows.length > shown + 1) parts.push('{"text":"Right-click for the full list","color":"dark_gray","italic":true,"bold":false}');
    }
    return '[' + parts.join(',') + ']';
  }
  function updateBoard(server, b, colony, needs) {
    let tag = tagOf(b), txt = displayText(colony, needs);
    let at = 'execute in ' + b.dim + ' positioned ' + (b.x + 0.5) + ' ' + (b.y + 1.6) + ' ' + (b.z + 0.5) + ' run ';
    let n = server.runCommandSilent(at + 'data merge entity @e[type=minecraft:text_display,tag=' + tag + ',limit=1,distance=..2] {text:\'' + txt + '\'}');
    if (!n) server.runCommandSilent(at + 'summon minecraft:text_display ~ ~ ~ {Tags:["chop_board","' + tag + '"],billboard:"vertical",alignment:"left",line_width:220,background:1073741824,text:\'' + txt + '\'}');
  }
  function removeBoard(server, b) {
    server.runCommandSilent('execute in ' + b.dim + ' positioned ' + (b.x + 0.5) + ' ' + (b.y + 1.6) + ' ' + (b.z + 0.5) + ' run kill @e[type=minecraft:text_display,tag=' + tagOf(b) + ',distance=..2]');
  }

  function playerNear(server, b) {
    for (let p of server.players) {
      if (String(p.level.dimension) != b.dim) continue;
      let dx = p.x - b.x, dy = p.y - b.y, dz = p.z - b.z;
      if (dx * dx + dy * dy + dz * dz <= CFG.NEAR * CFG.NEAR) return true;
    }
    return false;
  }
  function refreshAll(server, force) {
    let list = boards(server), cache = {}, keep = [];
    for (let b of list) {
      let lvl = null; try { lvl = server.getLevel(b.dim); } catch (e) {}
      if (!lvl) { keep.push(b); continue; }
      let colony = null;
      try { colony = ColonyManager.getInstance().getColonyByWorld(b.colony, lvl); } catch (e) {}
      if (!colony) { removeBoard(server, b); continue; }        // colony gone: drop the board
      keep.push(b);
      if (!force && !playerNear(server, b)) continue;
      if (!cache[b.colony]) cache[b.colony] = colonyNeeds(server, colony);
      updateBoard(server, b, colony, cache[b.colony]);
    }
    if (keep.length != list.length) saveBoards(server, keep);
  }

  // ---- place / break / click ----
  BlockEvents.placed(event => {
    let block = event.block;
    if (!block.hasTag('chop:requests_board')) return;
    let level = event.level, colony = null;
    try { colony = ColonyManager.getInstance().getColonyByPosFromWorld(level, block.pos); } catch (e) {}
    if (!colony) return;                                        // outside a colony: just a block
    let server = level.server, list = boards(server), dim = String(level.dimension);
    let b = { dim: dim, x: block.x, y: block.y, z: block.z, colony: colony.getID() };
    if (!list.some(o => keyOf(o.dim, o.x, o.y, o.z) == keyOf(dim, b.x, b.y, b.z))) { list.push(b); saveBoards(server, list); }
    updateBoard(server, b, colony, colonyNeeds(server, colony));
    log('board added at ' + keyOf(dim, b.x, b.y, b.z) + ' for colony ' + colony.getID());
  });

  BlockEvents.broken(event => {
    let block = event.block;
    if (!block.hasTag('chop:requests_board')) return;
    let server = event.level.server, dim = String(event.level.dimension), k = keyOf(dim, block.x, block.y, block.z);
    let list = boards(server), keep = list.filter(o => keyOf(o.dim, o.x, o.y, o.z) != k);
    if (keep.length == list.length) return;
    removeBoard(server, list.filter(o => keyOf(o.dim, o.x, o.y, o.z) == k)[0]);
    saveBoards(server, keep);
  });

  function onClick(event) {   // v0.1.1: returns true when it handled the click
    if (String(event.hand) != 'MAIN_HAND') return;
    let block = event.block;
    if (!block.hasTag('chop:requests_board')) return;
    let server = event.level.server, dim = String(event.level.dimension), k = keyOf(dim, block.x, block.y, block.z);
    let b = boards(server).filter(o => keyOf(o.dim, o.x, o.y, o.z) == k)[0];
    if (!b) return;                                             // a normal lectern/board outside a colony
    let colony = null;
    try { colony = ColonyManager.getInstance().getColonyByWorld(b.colony, event.level); } catch (e) {}
    if (!colony) return true;
    let needs = colonyNeeds(server, colony), p = event.player;
    p.tell(Text.of('--- ' + colony.getName() + ': what the builders need ---').gold());
    if (needs.rows.length == 0) { p.tell(Text.of('Nothing right now. Thank you!').green()); return true; }
    if (needs.star) p.tell(Text.of('\u2605 Most needed: ' + needs.star.name + ' x' + needs.star.n + ' (' + needs.star.job + ')').gold());
    let shown = 0;
    for (let r of needs.rows) {
      if (shown >= CFG.CHAT_MAX) break;
      p.tell(Text.of(' ' + r.name + ' x' + r.n + ' - ' + r.job).gray());
      shown++;
    }
    if (needs.rows.length > shown) p.tell(Text.of(' ...and ' + (needs.rows.length - shown) + ' more').darkGray());
    p.tell(Text.of('Drop materials in a Stash or the warehouse. Couriers bring them to the builders.').yellow());
    updateBoard(server, b, colony, needs);
    return true;
  }
  BlockEvents.rightClicked(event => { if (onClick(event)) event.cancel(); });   // cancel LAST: in KubeJS 2101 cancel() throws and ends the handler

  ServerEvents.tick(event => {
    if (event.server.tickCount % CFG.REFRESH_TICKS != 0) return;
    try { refreshAll(event.server, false); } catch (e) { console.warn('[chop board] refresh failed: ' + e); }
  });

  ServerEvents.commandRegistry(event => {
    const { commands: Commands } = event;
    event.register(Commands.literal('chopboard').requires(s => s.hasPermission(2))
      .then(Commands.literal('refresh').executes(ctx => { refreshAll(ctx.source.server, true); ctx.source.sendSystemMessage(Text.of('chop board: refreshed ' + boards(ctx.source.server).length + ' boards')); return 1; }))
      .then(Commands.literal('list').executes(ctx => { ctx.source.sendSystemMessage(Text.of('chop board: ' + JSON.stringify(boards(ctx.source.server)))); return 1; })));
  });
})();
