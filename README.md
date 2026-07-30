# Little Devil Preset Runtime

Companion Spindle extension for the Lumiverse port of the Little Devil v15-9B [Gem3.1] preset.

This extension serves the whole preset, including the first- and second-category port. It registers:

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

Install this folder as a Lumiverse Spindle extension and grant the `chat_mutation` permission. Then import `little-devil-v15-9b-gem3.1-lumiverse.preset.json`. Function Calling is not required.

The extension is required for full parity because many toggles use RisuAI's expression evaluator. Without it, Lumiverse leaves the compatibility macros unresolved and cannot turn TTRPG requests into interactive rolls.

The paired preset uses Lumiverse's native `unless` block plus namespaced boolean and length macros instead of the bare `if`, `and`, `or`, `not`, and `length` names. This keeps toggle branches and blank custom fields intact when a `.charx` card is running through LumiRealm's global Risu macro interceptor.

The custom Risu-style long-term-memory wrapper is intentionally omitted. Lumiverse handles long-term-memory retrieval and Memory Cortex injection itself; retaining the source wrapper would duplicate native recall and assume incompatible Risu memory fields.

BKSPC and the asset/image subsystem are intentionally not included.

Preset 2.3.1 consolidates the repeated Helena history detectors, makes every regex replacement native-only, namespaces string-length checks, removes the redundant Risu memory wrapper, restores the original clickable TTRPG flow, and keeps GM dialogue in the selected response language.
