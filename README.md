# Little Devil Preset Runtime

Companion Spindle extension for the Lumiverse port of the Little Devil v16 [Gem3.1] preset.

This extension serves the first- and second-category preset port with the `jailbreak` and `hitomiw` controls and their prompt branches removed. It registers:

- `littleDevilCalc`, a compatibility macro for RisuAI arithmetic, comparisons, boolean operators, negation, and nested parentheses.
- `littleDevilContains`, preserving RisuAI's literal case-sensitive substring test.
- `littleDevilLength`, a collision-safe replacement for RisuAI's string-length macro.
- `littleDevilNot`, `littleDevilAnd`, and `littleDevilOr`, namespaced boolean macros that prevent LumiRealm's `.charx` compatibility interceptor from consuming the preset's control flow.
- `littleDevilRuntime`, a health-check macro.
- A frontend `<DICE>` tag widget and backend roll handler for the preset's two TTRPG modes.

The TTRPG systems are:

- `coc_low`: percentile roll-under. Advantage keeps the lower result; disadvantage keeps the higher.
- `dnd_high`: d20 roll-over. Advantage keeps the higher natural result; disadvantage keeps the lower.

The assistant emits one `<DICE>notation:label:target[:LOW][:ADV|DIS]</DICE>` request and stops. The extension hides that tag, renders a clickable roll button in the assistant message, and appends the resolved check as the next user message. It does not automatically trigger another generation.

## Install

Install this folder as a Lumiverse Spindle extension and grant the `chat_mutation` permission. Then import `little-devil-v16-gem3.1-lumiverse.preset.json`. Function Calling is not required.

The extension is required for full parity because many toggles use RisuAI's expression evaluator. Without it, Lumiverse leaves the compatibility macros unresolved and cannot turn TTRPG requests into interactive rolls.

## Preset controls

Volume & Chapter Structure (`endover`) is disabled by default. Enabling it applies volume-based plot pacing and ending markers, plus volume/chapter headings and numbering in novel mode. The separate `volume_chapter` switch has been removed.

Disable In-Story Scene Timestamps (`timenow`) is the sole scene-timestamp control. Leave it off to include timestamps; turn it on to omit them. The duplicate `timestamps` switch has been removed. After importing this update into an existing setup, check these retained controls because saved values may differ from the preset defaults.

Structured Reasoning Mode selects internal consistency, story-planning, canon, or mature-scene review instructions. Extended Reasoning adds depth instructions. Neither control enables provider-native thinking or sets an API token budget. Enable native thinking and its supported budget in your model/provider settings. Minimum Reasoning Tokens is a prompt target only.

The preset keeps model planning out of the response body in every response mode. If native thinking is unavailable, it asks for silent checks and a response without a visible reasoning section. Narrative reasoning retains the selected POV and custom character knowledge limits. Character inner thoughts, the optional checklist, and memory-tracking output remain separate features.

Run `node tests/reasoning.cjs` for offline branch and scope checks. These tests use the extension's compatibility macros; they do not test provider requests or model compliance. To verify native thinking in your setup, generate a response with thinking enabled and confirm that reasoning is reported in the provider's native channel and that the response body has no model-planning section. Repeat with thinking disabled to check the fallback.

The paired preset uses Lumiverse's native `unless` block plus namespaced boolean and length macros instead of the bare `if`, `and`, `or`, `not`, and `length` names. This keeps toggle branches and blank custom fields intact when a `.charx` card is running through LumiRealm's global Risu macro interceptor.

The custom Risu-style long-term-memory wrapper is intentionally omitted. Lumiverse handles long-term-memory retrieval and Memory Cortex injection itself; retaining the source wrapper would duplicate native recall and assume incompatible Risu memory fields.

BKSPC and the asset/image subsystem are intentionally not included.

Preset 3.0.0 imports the v16 source changes (rewritten saching instructions, removed Courtesy/derogatory sections from Guidelines, a show-don't-tell addition in Feedback, and a prompt-injection warning in the final response block), retains the first-category controls `helenabreak`, `prefil`, `chatml`, and `SFW`, removes `jailbreak`, `hitomiw`, and their prompt branches, adds the 11 new v16 source-disabled regex scripts, keeps the consolidated Helena history scan, and keeps every regex replacement native-only.
