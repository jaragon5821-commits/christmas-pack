// chop_keys_cmd.js v0.1.0 (Scripts thread, 2026-11-08) - server script. Boss card D102 (keybind tutorial).
// /chopkeys <mod,mod,...>  - used by the "Show these keys in Keybind Atlas" links in Chop's Christmas Handbook.
// Anyone may run it (permission 0). It only tells THAT player's client to open Keybind Atlas filtered to those mods
// (client script chop_keys_atlas.js does the opening). Silent: no chat output.
(function () {
  ServerEvents.commandRegistry(event => {
    const Commands = event.commands;
    const Arguments = event.arguments;
    function send(ctx, mods) {
      let p = ctx.source.player;
      if (!p) return 0;
      p.sendData('chop_keys', { mods: String(mods || '') });
      return 1;
    }
    event.register(
      Commands.literal('chopkeys')
        .requires(src => true)
        .executes(ctx => send(ctx, ''))
        .then(Commands.argument('mods', Arguments.GREEDY_STRING.create(event))
          .executes(ctx => send(ctx, Arguments.GREEDY_STRING.getResult(ctx, 'mods'))))
    );
  });
})();
