import type { CourseBlock } from "./types";
import { MERMAID_RUNTIME_VERSION } from "../mermaid-runtime";
import { mermaidParserWorkerClient } from "./mermaid-parser-worker-client";

const MAX_MERMAID_DEFINITION_LENGTH = 50_000;

export class InvalidMermaidDefinitionError extends Error {
  readonly diagnostic: string;

  constructor(diagnostic: string) {
    super("Mermaid diagram syntax is invalid.");
    this.name = "InvalidMermaidDefinitionError";
    this.diagnostic = diagnostic;
  }
}

function conciseDiagnostic(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim().slice(0, 500) || "parser rejected the definition";
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
    await mermaidParserWorkerClient.parse(trimmed);
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
