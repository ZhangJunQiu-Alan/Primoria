#!/usr/bin/env node

import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import {
  compactPastMessages,
  capHistoryMessages,
  trimAgentHistory,
} from "../src/context-trim.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const BIG_HTML = `<div>${"x".repeat(9000)}</div>`;

function widgetTurn(question) {
  return [
    new HumanMessage(question),
    new AIMessage({
      content: "Building it now.",
      tool_calls: [
        { id: "call1", name: "widgetRenderer", args: { title: "Pendulum", description: "swing demo", html: BIG_HTML } },
      ],
    }),
    new ToolMessage({
      tool_call_id: "call1",
      name: "widgetRenderer",
      content: JSON.stringify({ type: "html_widget", title: "Pendulum", description: "swing demo", html: BIG_HTML }),
    }),
  ];
}

// ── compaction: past turns shrink, current turn stays intact ─────────────
{
  const messages = [...widgetTurn("show me a pendulum"), ...widgetTurn("now a double pendulum")];
  const compacted = compactPastMessages(messages);

  const pastAi = compacted[1];
  const pastArgs = JSON.stringify(pastAi.tool_calls[0].args);
  assert(!pastArgs.includes("x".repeat(100)), "past tool-call args drop the bulky html");
  assert(pastArgs.includes("Pendulum"), "past tool-call args keep the title");

  const pastTool = compacted[2];
  const pastToolText = String(pastTool.content);
  assert(pastToolText.length < 1000, "past tool result is compacted");
  assert(pastToolText.includes("html_widget"), "past tool result keeps its type");
  assert(pastToolText.includes("trimmed"), "past tool result is marked as trimmed");

  assert(compacted[3] === messages[3], "latest human message is untouched");
  assert(compacted[4] === messages[4], "current-turn AI message is untouched");
  assert(compacted[5] === messages[5], "current-turn tool result is untouched");

  const again = compactPastMessages(compacted);
  assert(
    JSON.stringify(again.map((m) => String(m.content))) === JSON.stringify(compacted.map((m) => String(m.content))),
    "compaction is idempotent so the request prefix stays byte-stable",
  );
}

// ── single-turn history is never compacted ───────────────────────────────
{
  const messages = widgetTurn("show me a pendulum");
  assert(compactPastMessages(messages) === messages, "current run keeps full payloads");
}

// ── capping: drops whole oldest turns at human boundaries, keeps the last ─
{
  const messages = [];
  for (let i = 0; i < 6; i += 1) {
    messages.push(new HumanMessage(`question ${i}`));
    messages.push(new AIMessage({ content: `answer ${i} ${"y".repeat(5000)}` }));
  }
  const capped = capHistoryMessages(messages, { maxChars: 20_000, trimToChars: 12_000 });
  assert(capped.length < messages.length, "over-budget history is trimmed");
  assert(capped[0].getType() === "human", "trimmed history starts at a human boundary");
  assert(String(capped[capped.length - 1].content).startsWith("answer 5"), "latest turn is kept");
  assert(
    capHistoryMessages(capped, { maxChars: 20_000, trimToChars: 12_000 }) === capped,
    "capping is idempotent between trims",
  );
}

// ── under budget: same array instance (no needless prefix churn) ─────────
{
  const messages = [new HumanMessage("hi"), new AIMessage("hello")];
  assert(capHistoryMessages(messages) === messages, "under-budget history is returned as-is");
  assert(trimAgentHistory(messages) === messages, "trim pass is a no-op on small histories");
}

process.stdout.write("[context-trim.unit] ALL CHECKS PASSED\n");
