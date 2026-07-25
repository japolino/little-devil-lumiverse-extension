(function () {
  "use strict";

  const TOOL_NAME = "roll_check";
  const MACRO_CATEGORY = "extension:little_devil_preset";

  function macroArg(ctx, index, name) {
    const args = ctx && ctx.args;
    if (Array.isArray(args)) return args[index] == null ? "" : String(args[index]);
    if (args && typeof args === "object") {
      const value = args[name] !== undefined ? args[name] : args[index];
      return value == null ? "" : String(value);
    }
    return "";
  }

  function macroArgs(ctx) {
    const args = ctx && ctx.args;
    if (Array.isArray(args)) return args.map((value) => value == null ? "" : String(value));
    if (args && typeof args === "object") {
      const keys = Object.keys(args);
      const numericKeys = keys.filter((key) => /^\d+$/.test(key)).sort((a, b) => Number(a) - Number(b));
      const ordered = numericKeys.length ? numericKeys : keys;
      return ordered.map((key) => args[key] == null ? "" : String(args[key]));
    }
    return [];
  }

  function isMacroTruthy(value) {
    const normalized = String(value == null ? "" : value).trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }

  function toRPN(expression) {
    let outputQueue = "";
    const operatorStack = [];
    const operators = {
      "+": { precedence: 2, associativity: "Left" },
      "-": { precedence: 2, associativity: "Left" },
      "*": { precedence: 3, associativity: "Left" },
      "/": { precedence: 3, associativity: "Left" },
      "^": { precedence: 4, associativity: "Left" },
      "%": { precedence: 3, associativity: "Left" },
      "<": { precedence: 1, associativity: "Left" },
      ">": { precedence: 1, associativity: "Left" },
      "|": { precedence: 1, associativity: "Left" },
      "&": { precedence: 1, associativity: "Left" },
      "≤": { precedence: 1, associativity: "Left" },
      "≥": { precedence: 1, associativity: "Left" },
      "=": { precedence: 1, associativity: "Left" },
      "≠": { precedence: 1, associativity: "Left" },
      "!": { precedence: 5, associativity: "Right" },
    };
    const operatorKeys = Object.keys(operators);
    const compact = String(expression).replace(/\s+/g, "");
    const tokens = [];
    let lastToken = "";
    for (let i = 0; i < compact.length; i++) {
      const char = compact[i];
      if (char === "-" && (i === 0 || operatorKeys.includes(compact[i - 1]) || compact[i - 1] === "(")) {
        lastToken += char;
      } else if (operatorKeys.includes(char)) {
        tokens.push(lastToken !== "" ? lastToken : "0");
        lastToken = "";
        tokens.push(char);
      } else {
        lastToken += char;
      }
    }
    tokens.push(lastToken !== "" ? lastToken : "0");
    for (const token of tokens) {
      if (parseFloat(token) || token === "0") {
        outputQueue += `${token} `;
      } else if (operatorKeys.includes(token)) {
        while (
          operatorStack.length > 0
          && (
            (operators[token].associativity === "Left"
              && operators[token].precedence <= operators[operatorStack[operatorStack.length - 1]].precedence)
            || (operators[token].associativity === "Right"
              && operators[token].precedence < operators[operatorStack[operatorStack.length - 1]].precedence)
          )
        ) outputQueue += `${operatorStack.pop()} `;
        operatorStack.push(token);
      }
    }
    while (operatorStack.length > 0) outputQueue += `${operatorStack.pop()} `;
    return outputQueue.trim();
  }

  function calculateRPN(expression) {
    const stack = [];
    for (const token of String(expression).split(" ")) {
      if (parseFloat(token) || token === "0") {
        stack.push(parseFloat(token));
      } else {
        const b = stack.pop();
        const a = stack.pop();
        switch (token) {
          case "+": stack.push(a + b); break;
          case "-": stack.push(a - b); break;
          case "*": stack.push(a * b); break;
          case "/": stack.push(a / b); break;
          case "^": stack.push(a ** b); break;
          case "%": stack.push(a % b); break;
          case "<": stack.push(a < b ? 1 : 0); break;
          case ">": stack.push(a > b ? 1 : 0); break;
          case "|": stack.push(a || b); break;
          case "&": stack.push(a && b); break;
          case "≤": stack.push(a <= b ? 1 : 0); break;
          case "≥": stack.push(a >= b ? 1 : 0); break;
          case "=": stack.push(a === b ? 1 : 0); break;
          case "≠": stack.push(a !== b ? 1 : 0); break;
          case "!": stack.push(b ? 0 : 1); break;
        }
      }
    }
    return stack.length === 0 ? 0 : stack.pop();
  }

  function executeRPNCalculation(text) {
    const normalized = String(text)
      .replace(/&&/g, "&")
      .replace(/\|\|/g, "|")
      .replace(/<=/g, "≤")
      .replace(/>=/g, "≥")
      .replace(/==/g, "=")
      .replace(/!=/g, "≠")
      .replace(/true/gi, "1")
      .replace(/false/gi, "0")
      .replace(/null/gi, "0");
    return calculateRPN(toRPN(normalized));
  }

  function calcString(text) {
    const depthText = [""];
    const source = String(text);
    for (let i = 0; i < source.length; i++) {
      if (source[i] === "(") {
        depthText.push("");
      } else if (source[i] === ")" && depthText.length > 1) {
        const result = executeRPNCalculation(depthText.pop());
        depthText[depthText.length - 1] += result;
      } else {
        depthText[depthText.length - 1] += source[i];
      }
    }
    return executeRPNCalculation(depthText.join(""));
  }

  function integer(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
  }

  function parseNotation(notation, system) {
    const fallback = system === "coc_low" ? "1d100" : "1d20";
    const text = String(notation || fallback).replace(/\s+/g, "");
    const match = text.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!match) throw new Error(`Invalid dice notation: ${text}`);
    const count = Math.max(1, Math.min(100, integer(match[1] || 1, 1)));
    const sides = Math.max(2, Math.min(10000, integer(match[2], 20)));
    const modifier = integer(match[3] || 0, 0);
    return { text, count, sides, modifier };
  }

  function randomDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  function rollPool(notation) {
    const dice = [];
    for (let i = 0; i < notation.count; i++) dice.push(randomDie(notation.sides));
    return {
      dice,
      raw: dice.reduce((sum, value) => sum + value, 0),
    };
  }

  function normalizeMode(mode) {
    const value = String(mode || "normal").toLowerCase();
    if (["adv", "advantage"].includes(value)) return "advantage";
    if (["dis", "disadvantage"].includes(value)) return "disadvantage";
    return "normal";
  }

  function cocDegree(selected, target) {
    if (selected === 1) return "critical";
    if (selected >= (target < 50 ? 96 : 100)) return "fumble";
    if (selected <= Math.floor(target / 5)) return "extreme";
    if (selected <= Math.floor(target / 2)) return "hard";
    if (selected <= target) return "regular";
    return "failure";
  }

  function resolveCheck(input) {
    const system = input.system === "coc_low" ? "coc_low" : "dnd_high";
    const mode = normalizeMode(input.roll_mode);
    const notation = parseNotation(input.notation, system);
    const hasTarget = input.target !== undefined && input.target !== null && input.target !== "" && Number.isFinite(Number(input.target));
    const target = hasTarget ? integer(input.target, 0) : null;
    const extraModifier = integer(input.modifier, 0);
    const attemptCount = mode === "normal" ? 1 : 2;
    const attempts = Array.from({ length: attemptCount }, () => rollPool(notation));
    const rawValues = attempts.map((attempt) => attempt.raw);
    const selectedIndex = mode === "advantage"
      ? rawValues.indexOf(system === "coc_low" ? Math.min(...rawValues) : Math.max(...rawValues))
      : mode === "disadvantage"
        ? rawValues.indexOf(system === "coc_low" ? Math.max(...rawValues) : Math.min(...rawValues))
        : 0;
    const selected = attempts[selectedIndex].raw;
    const total = selected + notation.modifier + extraModifier;
    const success = hasTarget ? (system === "coc_low" ? total <= target : total >= target) : null;
    const natural = notation.count === 1 ? attempts[selectedIndex].dice[0] : null;

    const result = {
      tool: TOOL_NAME,
      label: String(input.label || "Check"),
      system,
      notation: notation.text,
      rollMode: mode,
      attempts: attempts.map((attempt) => attempt.dice),
      selectedAttempt: selectedIndex + 1,
      selectedRaw: selected,
      notationModifier: notation.modifier,
      extraModifier,
      total,
      target,
      success,
    };

    if (system === "dnd_high") {
      result.critical = notation.count === 1 && notation.sides === 20 && natural === 20;
      result.fumble = notation.count === 1 && notation.sides === 20 && natural === 1;
    } else if (hasTarget) {
      result.degree = cocDegree(total, target);
      result.critical = result.degree === "critical";
      result.fumble = result.degree === "fumble";
    } else {
      result.critical = total === 1;
      result.fumble = false;
    }
    return result;
  }

  spindle.registerMacro({
    name: "littleDevilCalc",
    category: MACRO_CATEGORY,
    description: "Evaluates a RisuAI-compatible arithmetic or boolean expression for the Little Devil preset.",
    returnType: "number",
    args: [
      {
        name: "expression",
        description: "Expression using RisuAI operators, including nested parentheses.",
        required: true
      }
    ],
    handler: function (ctx) {
      return calcString(macroArg(ctx, 0, "expression"));
    }
  });

  spindle.registerMacro({
    name: "littleDevilContains",
    category: MACRO_CATEGORY,
    description: "Performs RisuAI-compatible literal, case-sensitive substring matching.",
    returnType: "integer",
    args: [
      { name: "text", required: true },
      { name: "needle", required: true }
    ],
    handler: function (ctx) {
      return macroArg(ctx, 0, "text").includes(macroArg(ctx, 1, "needle")) ? 1 : 0;
    }
  });

  spindle.registerMacro({
    name: "littleDevilNot",
    category: MACRO_CATEGORY,
    description: "Namespaced boolean negation used to avoid collisions with Risu compatibility interceptors.",
    returnType: "integer",
    args: [
      { name: "value", required: true }
    ],
    handler: function (ctx) {
      return isMacroTruthy(macroArg(ctx, 0, "value")) ? 0 : 1;
    }
  });

  spindle.registerMacro({
    name: "littleDevilAnd",
    category: MACRO_CATEGORY,
    description: "Namespaced variadic boolean AND used to avoid collisions with Risu compatibility interceptors.",
    returnType: "integer",
    handler: function (ctx) {
      const values = macroArgs(ctx);
      return values.length === 0 || values.every(isMacroTruthy) ? 1 : 0;
    }
  });

  spindle.registerMacro({
    name: "littleDevilOr",
    category: MACRO_CATEGORY,
    description: "Namespaced variadic boolean OR used to avoid collisions with Risu compatibility interceptors.",
    returnType: "integer",
    handler: function (ctx) {
      return macroArgs(ctx).some(isMacroTruthy) ? 1 : 0;
    }
  });

  spindle.registerMacro({
    name: "littleDevilRuntime",
    category: MACRO_CATEGORY,
    description: "Returns 1 when the Little Devil compatibility runtime is active.",
    returnType: "integer",
    handler: function () {
      return 1;
    }
  });

  spindle.registerTool({
    name: TOOL_NAME,
    display_name: "Little Devil TTRPG Check",
    description: "Resolve a consequential TTRPG check. Use dnd_high for roll-high d20 checks and coc_low for roll-low percentile checks.",
    council_eligible: false,
    parameters: {
      type: "object",
      properties: {
        system: {
          type: "string",
          enum: ["dnd_high", "coc_low"],
          description: "dnd_high succeeds at or above the target. coc_low succeeds at or below it."
        },
        label: {
          type: "string",
          description: "Short in-fiction name of the skill, save, or ability being checked."
        },
        notation: {
          type: "string",
          description: "Dice notation such as 1d20+5 or 1d100. Defaults appropriately for the selected system."
        },
        target: {
          type: "number",
          description: "Optional difficulty class for dnd_high or skill/target percentage for coc_low. Omit for an unopposed roll such as damage."
        },
        modifier: {
          type: "number",
          description: "Additional integer modifier not already included in notation."
        },
        roll_mode: {
          type: "string",
          enum: ["normal", "advantage", "disadvantage"],
          description: "Roll once, keep the favorable result, or keep the unfavorable result."
        }
      },
      required: ["system", "label"]
    }
  });

  spindle.on("TOOL_INVOCATION", async function (payload) {
    if (!payload || payload.toolName !== TOOL_NAME) return;
    const input = payload.args || payload.parameters || payload.arguments || payload.input || {};
    try {
      return JSON.stringify(resolveCheck(input));
    } catch (error) {
      return JSON.stringify({
        tool: TOOL_NAME,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
})();
