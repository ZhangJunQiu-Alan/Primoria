import { parentPort } from "node:worker_threads";

import { JSDOM } from "jsdom";

if (!parentPort) {
  throw new Error("Mermaid validation worker requires a parent port.");
}

// Mermaid's full parser surface still initializes browser-only sanitizers for
// diagram types such as mindmap. Keep those globals inside this dedicated
// worker so concurrent Next.js requests can never observe them.
const dom = new JSDOM("<!doctype html><html><body></body></html>");
const browserGlobals = {
  window: dom.window,
  document: dom.window.document,
  DOMParser: dom.window.DOMParser,
  XMLSerializer: dom.window.XMLSerializer,
  HTMLElement: dom.window.HTMLElement,
  SVGElement: dom.window.SVGElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
};

for (const [key, value] of Object.entries(browserGlobals)) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value,
    writable: true,
  });
}

let mermaidPromise;
let parseQueue = Promise.resolve();

function loadMermaid() {
  mermaidPromise ??= import("mermaid").then((module) => module.default);
  return mermaidPromise;
}

function conciseDiagnostic(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim().slice(0, 500) || "parser rejected the definition";
}

parentPort.on("message", (request) => {
  if (!request || typeof request.id !== "number" || typeof request.definition !== "string") return;

  const run = parseQueue.then(async () => {
    const mermaid = await loadMermaid();
    await mermaid.parse(request.definition);
  });
  parseQueue = run.then(
    () => undefined,
    () => undefined,
  );

  void run.then(
    () => parentPort.postMessage({ id: request.id, ok: true }),
    (error) => parentPort.postMessage({ id: request.id, ok: false, diagnostic: conciseDiagnostic(error) }),
  );
});
