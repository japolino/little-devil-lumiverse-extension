# Little Devil Preset Runtime

Companion Spindle extension for the Lumiverse port of the Little Devil v16-6 [Gem3.1] preset.

This extension serves all three source categories with the stage-1 `jailbreak` branch and both Hitomi controls removed. It registers:

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

Install this folder as a Lumiverse Spindle extension and grant the `chat_mutation` permission. Then import `little-devil-v16-6-gem3.1-lumiverse.preset.json`. Function Calling is not required.

The extension is required for full parity because many toggles use RisuAI's expression evaluator. Without it, Lumiverse leaves the compatibility macros unresolved and cannot turn TTRPG requests into interactive rolls.

## Preset controls

Volume structure uses the source's `endover` switch. The port's separate `volume_chapter` switch has been removed.

Scene timestamps use the source's `timenow` switch. Leave it off to include timestamps; turn it on to omit them. The port's duplicate `timestamps` switch has been removed. Check both retained controls after import if you had saved values for the removed switches.

The v16-6 source's third group is present. Its prompt-driven utilities, five genre selectors, and display heading toggle are wired into the preset. Nine switches appear in the source without a prompt or regex binding (`ban_cot_out`, `cot_box`, `nocomma`, `zerocomma`, `stopbracket`, `anitiating`, `ban_CSS`, `piece`, `PastMemori`). They are marked as source-only declarations in their descriptions.

Structured Reasoning Mode selects internal consistency, story-planning, canon, or mature-scene review instructions. Extended Reasoning adds depth instructions. Neither control enables provider-native thinking or sets an API token budget. Enable native thinking and its supported budget in your model/provider settings. Minimum Reasoning Tokens is a prompt target only.

The preset keeps model planning out of the response body in every response mode. If native thinking is unavailable, it asks for silent checks and a response without a visible reasoning section. Narrative reasoning retains the selected POV and custom character knowledge limits. Character inner thoughts, the optional checklist, and memory-tracking output remain separate features.

Run `node tests/reasoning.cjs` for offline branch and scope checks. These tests use the extension's compatibility macros; they do not test provider requests or model compliance. To verify native thinking in your setup, generate a response with thinking enabled and confirm that reasoning is reported in the provider's native channel and that the response body has no model-planning section. Repeat with thinking disabled to check the fallback.

The paired preset uses Lumiverse's native `unless` block plus namespaced boolean and length macros instead of the bare `if`, `and`, `or`, `not`, and `length` names. This keeps toggle branches and blank custom fields intact when a `.charx` card is running through LumiRealm's global Risu macro interceptor.

The custom Risu-style long-term-memory wrapper is intentionally omitted. Lumiverse handles long-term-memory retrieval and Memory Cortex injection itself; retaining the source wrapper would duplicate native recall and assume incompatible Risu memory fields.

BKSPC and the asset/image subsystem are intentionally not included.

Preset 3.1.0 imports v16-6 content, including Aneleh OOC mode, Kirene narration, the new writing and pace options, status-panel modes, population ratio fields, the intimate-dialogue control, five genre selectors, and eight new source-disabled regex scripts. The preset retains `helenabreak`, `prefil`, `chatml`, and `SFW`, excludes stage 1 and both Hitomi controls, keeps the consolidated Helena history scan, and uses native-only regex replacements.
