// chop_donation_kettle.js v2 (Assets lane, 2026-11-05: explicit blockstate/model files, no generated model) - startup script: needs a full game restart.
// Decorative block only. Behaviour (ColonyBucks, bell, buff) lives in Scripts' chop_donation_bucket.js,
// which auto-detects any block id ending in "donation_kettle".
// Model: assets/chop/blockstates/donation_kettle.json -> models/block/donation_kettle_base.json (red kettle, iron stand, gold bell).
StartupEvents.registry('block', event => {
  event.create('chop:donation_kettle')
    .displayName('Donation Kettle')
    .soundType('metal')
    .hardness(1.5)
    .resistance(6.0)
    .notSolid()
    .defaultCutout()
    .box(1, 0, 1, 15, 16, 15, true)
    .tagBlock('minecraft:mineable/pickaxe');
});
