const ROLL_MESSAGE_TYPE = "little_devil_ttrpg_roll";
const ROLL_RESULT_TYPE = "little_devil_ttrpg_roll_result";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function requestLabel(content) {
  const parts = String(content || "").split(":").map((part) => part.trim());
  const notation = parts[0] || "dice";
  const label = parts[1] || "Check";
  const target = parts.slice(2).find((part) => /^(?:DC\s*)?-?\d+$/i.test(part));
  const rollLow = parts.slice(2).some((part) => /^(?:LOW|L)$/i.test(part));
  return `🎲 ${label} (${notation}${target ? ` ${rollLow ? "≤" : "≥"}${target.replace(/^DC\s*/i, "")}` : ""})`;
}

function stableKey(messageId, content) {
  const source = `${messageId}\u0000${content}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `little-devil-roll-${(hash >>> 0).toString(16)}`;
}

function widgetHtml(label) {
  return `
    <style>
      :root { color-scheme: light dark; }
      body { margin: 0; padding: 2px 0; color: var(--lumiverse-text); background: transparent; }
      button {
        appearance: none;
        border: 1px solid color-mix(in srgb, var(--lumiverse-accent) 68%, var(--lumiverse-border));
        border-radius: 999px;
        padding: 7px 13px;
        color: var(--lumiverse-accent-fg);
        background: linear-gradient(135deg, var(--lumiverse-accent), color-mix(in srgb, var(--lumiverse-accent) 72%, #6d28d9));
        box-shadow: 0 3px 12px color-mix(in srgb, var(--lumiverse-accent) 24%, transparent);
        font: 600 0.9rem/1.2 system-ui, sans-serif;
        cursor: pointer;
      }
      button:hover { filter: brightness(1.08); }
      button:disabled { cursor: wait; opacity: 0.62; }
    </style>
    <button id="little-devil-roll" type="button">${escapeHtml(label)}</button>
    <script>
      const button = document.getElementById("little-devil-roll");
      const originalLabel = button.textContent;
      button.addEventListener("click", () => {
        button.disabled = true;
        button.textContent = "🎲 Rolling…";
        window.spindleSandbox.postMessage({ type: "roll" });
        setTimeout(() => {
          button.disabled = false;
          button.textContent = originalLabel;
        }, 750);
      });
    </script>
  `;
}

export function setup(ctx) {
  const widgets = new Map();
  const pending = new Set();

  const handleTag = (payload) => {
    if (!payload || payload.isStreaming || payload.isUser || !payload.messageId || !payload.chatId) return;
    const content = String(payload.content || "").trim();
    if (!content) return;
    const rollKey = stableKey(payload.messageId, content);
    if (widgets.has(rollKey)) return;

    const cleanup = ctx.messages.renderWidget(
      {
        messageId: payload.messageId,
        widgetId: rollKey,
        html: widgetHtml(requestLabel(content)),
      },
      (message) => {
        if (!message || message.type !== "roll" || pending.has(rollKey)) return;
        pending.add(rollKey);
        ctx.sendToBackend({
          type: ROLL_MESSAGE_TYPE,
          chatId: payload.chatId,
          messageId: payload.messageId,
          content,
          rollKey,
        });
      },
    );
    widgets.set(rollKey, cleanup);
  };

  const tagUnsubscribers = ["dice", "DICE"].map((tagName) => (
    ctx.messages.registerTagInterceptor({ tagName, removeFromMessage: true }, handleTag)
  ));
  const backendUnsubscribe = ctx.onBackendMessage((payload) => {
    if (!payload || payload.type !== ROLL_RESULT_TYPE || !payload.rollKey) return;
    pending.delete(payload.rollKey);
  });

  return () => {
    for (const unsubscribe of tagUnsubscribers) unsubscribe();
    backendUnsubscribe();
    for (const cleanup of widgets.values()) cleanup();
    widgets.clear();
  };
}
