import { describe, expect, it } from "vitest";

import {
  assertPersistableCourseBlock,
  assertValidMermaidDefinition,
  InvalidMermaidDefinitionError,
} from "../src/lib/courses/mermaid-validation";
import { MERMAID_CDN_URL, MERMAID_RUNTIME_VERSION } from "../src/lib/mermaid-runtime";
import type { CourseBlock } from "../src/lib/courses/types";
import packageJson from "../package.json";

describe("Mermaid persistence validation", () => {
  it("keeps the installed parser and browser runtime on the same version", () => {
    expect(packageJson.dependencies.mermaid).toContain(MERMAID_RUNTIME_VERSION);
    expect(MERMAID_CDN_URL).toContain(`mermaid@${MERMAID_RUNTIME_VERSION}/`);
  });

  it("restores Node globals after initializing the parser", async () => {
    const beforeWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const beforeDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

    await assertValidMermaidDefinition("flowchart LR\nA-->B");

    expect(Object.getOwnPropertyDescriptor(globalThis, "window")).toEqual(beforeWindow);
    expect(Object.getOwnPropertyDescriptor(globalThis, "document")).toEqual(beforeDocument);
  });

  it.each([
    "flowchart LR\nA-->B",
    "sequenceDiagram\nAlice->>Bob: Hello",
    "stateDiagram-v2\n[*] --> Ready\nReady --> [*]",
  ])("accepts parser-valid Mermaid DSL", async (definition) => {
    await expect(assertValidMermaidDefinition(definition)).resolves.toBeUndefined();
  });

  it("rejects non-empty but parser-invalid Mermaid DSL", async () => {
    await expect(assertValidMermaidDefinition("flowchart LR\nA[Broken --> B")).rejects.toBeInstanceOf(
      InvalidMermaidDefinitionError,
    );
  });

  it("rejects empty and oversized definitions before parsing", async () => {
    await expect(assertValidMermaidDefinition("   ")).rejects.toBeInstanceOf(InvalidMermaidDefinitionError);
    await expect(assertValidMermaidDefinition(`flowchart LR\nA[${"x".repeat(50_001)}]`)).rejects.toBeInstanceOf(
      InvalidMermaidDefinitionError,
    );
  });

  it("validates only Mermaid visual blocks", async () => {
    const text = { id: "t1", type: "text", title: "Text", markdown: "Body" } as CourseBlock;
    const invalidMermaid = {
      id: "v1",
      type: "visual",
      title: "Broken",
      description: "Broken diagram",
      engine: "mermaid",
      mermaidDefinition: "flowchart LR\nA[Broken --> B",
    } as CourseBlock;

    await expect(assertPersistableCourseBlock(text)).resolves.toBeUndefined();
    await expect(assertPersistableCourseBlock(invalidMermaid)).rejects.toBeInstanceOf(
      InvalidMermaidDefinitionError,
    );
  });

  it("serializes concurrent parser calls safely", async () => {
    await expect(
      Promise.all([
        assertValidMermaidDefinition("flowchart TB\nA-->B"),
        assertValidMermaidDefinition("sequenceDiagram\nA->>B: hi"),
        assertValidMermaidDefinition("classDiagram\nclass Animal"),
      ]),
    ).resolves.toHaveLength(3);
  });
});
