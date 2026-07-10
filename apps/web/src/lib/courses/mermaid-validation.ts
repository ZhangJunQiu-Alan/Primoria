import { JSDOM } from "jsdom";

import type { CourseBlock } from "./types";
import { MERMAID_RUNTIME_VERSION } from "../mermaid-runtime";

const MAX_MERMAID_DEFINITION_LENGTH = 50_000;
type MermaidModule = typeof import("mermaid")["default"];

let mermaidPromise: Promise<MermaidModule> | null = null;
let parseQueue: Promise<unknown> = Promise.resolve();

export class InvalidMermaidDefinitionError extends Error {
  readonly diagnostic: string;

  constructor(diagnostic: string) {
    super("Mermaid diagram syntax is invalid.");
    this.name = "InvalidMermaidDefinitionError";
    this.diagnostic = diagnostic;
  }
}

async function importMermaidParser() {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return (await import("mermaid")).default;
  }

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
  const originalDescriptors = new Map<PropertyKey, PropertyDescriptor | undefined>();

  for (const [key, value] of Object.entries(browserGlobals)) {
    originalDescriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value,
      writable: true,
    });
  }

  try {
    return (await import("mermaid")).default;
  } finally {
    for (const [key, descriptor] of originalDescriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    dom.window.close();
  }
}

function loadMermaidParser() {
  mermaidPromise ??= importMermaidParser();
  return mermaidPromise;
}

function conciseDiagnostic(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim().slice(0, 500) || "parser rejected the definition";
}

async function parseDefinition(definition: string) {
  const run = parseQueue.then(async () => {
    const mermaid = await loadMermaidParser();
    await mermaid.parse(definition);
  });
  parseQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function assertValidMermaidDefinition(definition: string): Promise<void> {
  const trimmed = definition.trim();
  if (!trimmed) throw new InvalidMermaidDefinitionError("definition is empty");
  if (trimmed.length > MAX_MERMAID_DEFINITION_LENGTH) {
    throw new InvalidMermaidDefinitionError(
      `definition exceeds Mermaid ${MERMAID_RUNTIME_VERSION}'s ${MAX_MERMAID_DEFINITION_LENGTH}-character limit`,
    );
  }

  try {
    await parseDefinition(trimmed);
  } catch (error) {
    throw new InvalidMermaidDefinitionError(conciseDiagnostic(error));
  }
}

export async function assertPersistableCourseBlock(block: CourseBlock): Promise<void> {
  if (block.type !== "visual" || block.engine !== "mermaid") return;
  await assertValidMermaidDefinition(block.mermaidDefinition ?? "");
}

export async function assertPersistableCourseBlocks(blocks: CourseBlock[]): Promise<void> {
  for (const block of blocks) await assertPersistableCourseBlock(block);
}
