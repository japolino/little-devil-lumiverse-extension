(function () {
  "use strict";

  const ROLL_MESSAGE_TYPE = "little_devil_ttrpg_roll";
  const ROLL_RESULT_TYPE = "little_devil_ttrpg_roll_result";
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
      result.critical = notation.count === 1 && notation.sides === 100 && natural <= 5;
      result.fumble = notation.count === 1 && notation.sides === 100 && natural >= 96;
    } else {
      result.critical = total === 1;
      result.fumble = false;
    }
    return result;
  }

  function parseDiceRequest(content) {
    const source = String(content == null ? "" : content).trim();
    if (!source || source.length > 512) throw new Error("Invalid or oversized dice request.");
    const parts = source.split(":").map((part) => part.trim());
    if (parts.length < 2) throw new Error("Dice request must include notation and a label.");

    const notation = parts.shift();
    const label = String(parts.shift() || "Check").slice(0, 120);
    let target = null;
    let system = "dnd_high";
    let rollMode = "normal";

    for (const part of parts) {
      const normalized = part.toUpperCase();
      if (normalized === "LOW" || normalized === "L") {
        system = "coc_low";
      } else if (normalized === "ADV" || normalized === "ADVANTAGE") {
        rollMode = "advantage";
      } else if (normalized === "DIS" || normalized === "DISADVANTAGE") {
        rollMode = "disadvantage";
      } else {
        const targetMatch = normalized.match(/^DC\s*(-?\d+)$/) || normalized.match(/^(-?\d+)$/);
        if (targetMatch) target = integer(targetMatch[1], 0);
      }
    }

    return {
      notation,
      label,
      target,
      system,
      roll_mode: rollMode,
    };
  }

  function formatAttempt(dice) {
    return `[${dice.join("+")}]`;
  }

  function formatDiceResult(result) {
    const attempts = result.attempts.map(formatAttempt);
    const selectedIndex = result.selectedAttempt - 1;
    const selected = attempts[selectedIndex];
    const rollText = attempts.length === 1
      ? selected
      : `${attempts.join(" / ")} → ${selected}`;
    const totalModifier = result.notationModifier + result.extraModifier;
    const modifierText = totalModifier > 0 ? `+${totalModifier}` : totalModifier < 0 ? String(totalModifier) : "";
    let outcome = "";

    if (result.target !== null) {
      const comparison = result.system === "coc_low"
        ? `${result.total} ${result.success ? "<=" : ">"} ${result.target}`
        : `${result.total} ${result.success ? ">=" : "<"} DC${result.target}`;
      outcome = result.success
        ? `${comparison} ✅ 성공!`
        : `${comparison} ❌ 실패...`;
    }

    if (result.critical) outcome += " ✨ 크리티컬!";
    if (result.fumble) outcome += " 💀 펌블!";
    return `${result.notation} = ${rollText}${modifierText} = ${result.total}${outcome ? ` ${outcome}` : ""}`;
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
    name: "littleDevilLength",
    category: MACRO_CATEGORY,
    description: "Namespaced RisuAI-compatible string length used to avoid CharX macro-interceptor collisions.",
    returnType: "integer",
    args: [
      { name: "text", required: false }
    ],
    handler: function (ctx) {
      return macroArg(ctx, 0, "text").length;
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

  spindle.onFrontendMessage(async function (payload, userId) {
    if (!payload || payload.type !== ROLL_MESSAGE_TYPE) return;
    const chatId = String(payload.chatId || "");
    const messageId = String(payload.messageId || "");
    const rollKey = String(payload.rollKey || "");
    try {
      if (!chatId || !messageId || !rollKey) throw new Error("Missing chat, message, or roll identifier.");
      const result = resolveCheck(parseDiceRequest(payload.content));
      const formatted = formatDiceResult(result);
      const appended = await spindle.chat.appendMessage(chatId, {
        role: "user",
        content: formatted,
        metadata: {
          source: ROLL_MESSAGE_TYPE,
          roll_key: rollKey,
          source_message_id: messageId,
        },
      });
      spindle.sendToFrontend({
        type: ROLL_RESULT_TYPE,
        rollKey,
        status: "appended",
        messageId: appended && appended.id,
      }, userId);
    } catch (error) {
      spindle.sendToFrontend({
        type: ROLL_RESULT_TYPE,
        rollKey,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      }, userId);
    }
  });
})();
