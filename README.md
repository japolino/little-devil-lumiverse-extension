# Little Devil Preset Runtime

Companion Spindle extension for the Lumiverse port of the Little Devil v15-9B [Gem3.1] preset.

This extension serves the whole preset. It registers:

- `littleDevilCalc`, a compatibility macro for RisuAI arithmetic, comparisons, boolean operators, negation, and nested parentheses.
- `littleDevilContains`, preserving RisuAI's literal case-sensitive substring test.
- `littleDevilRuntime`, a health-check macro.
- `roll_check`, the LLM tool used by the preset's two TTRPG modes.

The TTRPG systems are:

- `coc_low`: percentile roll-under. Advantage keeps the lower result; disadvantage keeps the higher.
- `dnd_high`: d20 roll-over. Advantage keeps the higher natural result; disadvantage keeps the lower.

The result includes every roll, the selected roll, modifiers, target, success, and critical/fumble information. CoC checks also return the success degree. Unopposed rolls such as damage are supported by omitting `target`; their `success` value is `null`.

## Install

Install this folder as a Lumiverse Spindle extension and grant the `tools` permission. Then import `little-devil-v15-9b-gem3.1-lumiverse.preset.json` and enable Function Calling in the active model profile if it is not already enabled.

The extension is required for full parity because many first-category toggles use RisuAI's expression evaluator. Without it, Lumiverse leaves the compatibility macros unresolved. TTRPG mode also falls back to emitting a `<DICE>...</DICE>` tag when the extension is unavailable.
