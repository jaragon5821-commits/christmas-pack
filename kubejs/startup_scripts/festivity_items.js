// Festivity items (startup script: needs a game restart, not just /reload).
// chop:coal_token  - drops from Festivity minions while the bar is 49 or lower; buys Naughty List rewards.
// chop:ribbon_token - from rescues, driving Santy Claws off, breaking a Cursed Star; buys Nice List rewards.
// chop:claws_horn  - trophy for driving Santy Claws off.
StartupEvents.registry('item', event => {
  event.create('chop:coal_token').displayName('Coal Token').maxStackSize(64).rarity('uncommon').tooltip('Santy Claws pays in coal.');
  event.create('chop:ribbon_token').displayName('Ribbon Token').maxStackSize(64).rarity('uncommon').tooltip('A ribbon from a rescued present.');
  event.create('chop:claws_horn').displayName('Claws Horn').maxStackSize(1).rarity('rare').tooltip('He will be back.');
});
