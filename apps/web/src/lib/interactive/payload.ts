import { InteractiveComponentPayloadSchema, type InteractiveComponentPayload } from "@primoria/contracts/artifacts/schemas";
import { INTERACTIVE_COMPONENT_CATALOG } from "@primoria/contracts/artifacts/interactive-catalog";
import { getImplementedComponent } from "./components/registry";
import type { ComponentConfig, ImplementedComponent } from "./components/types";
import { z } from "zod";

export class InteractivePayloadError extends Error {
  constructor(readonly code: "unknown_component" | "unsupported_version", message: string) {
    super(message);
    this.name = "InteractivePayloadError";
  }
}

export function assertNoUnknownConfigFields(input: unknown, parsed: unknown): void {
  if (!input || typeof input !== "object" || !parsed || typeof parsed !== "object") return;
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(parsed, key)) throw new z.ZodError([{ code: "custom", path: [key], message: "Unknown configuration field" }]);
    assertNoUnknownConfigFields((input as Record<string, unknown>)[key], (parsed as Record<string, unknown>)[key]);
  }
}

/** Applies each n → n+1 step; a missing step or a newer-than-runtime version is unsupported. */
export function migrateInteractiveConfig(component: Pick<ImplementedComponent, "componentId" | "migrations">, fromVersion: number, toVersion: number, config: ComponentConfig): ComponentConfig {
  if (fromVersion > toVersion) throw new InteractivePayloadError("unsupported_version", `${component.componentId} v${fromVersion} is newer than this runtime (v${toVersion})`);
  let current = config;
  for (let version = fromVersion; version < toVersion; version += 1) {
    const step = component.migrations?.[version];
    if (!step) throw new InteractivePayloadError("unsupported_version", `${component.componentId} has no migration from v${version}`);
    current = step(structuredClone(current));
  }
  return current;
}

/**
 * Validates a stored or generated payload and upgrades it to the running
 * catalog version. Invalid configs throw ZodError; unknown components or
 * versions without a migration path throw InteractivePayloadError.
 */
export function parseInteractivePayload(input: unknown): InteractiveComponentPayload {
  const payload = InteractiveComponentPayloadSchema.parse(input);
  const component = getImplementedComponent(payload.componentId);
  const metadata = INTERACTIVE_COMPONENT_CATALOG.find((entry) => entry.componentId === payload.componentId);
  if (!component || !metadata) throw new InteractivePayloadError("unknown_component", "Unknown interactive component");
  const migrated = migrateInteractiveConfig(component, payload.configVersion, metadata.version, payload.config);
  const config = component.configSchema.parse(migrated) as Record<string, unknown>;
  assertNoUnknownConfigFields(migrated, config);
  return { componentId: payload.componentId, configVersion: metadata.version, config };
}

type VisualBlockLike = { type: string; engine?: string; interactive?: unknown };

/**
 * Read path: upgrades trusted visual blocks in place of the stored version.
 * A block that cannot be upgraded is returned unchanged so the renderer shows
 * its unsupported-version notice instead of failing the whole lesson.
 */
export function upgradeInteractiveBlock<T extends VisualBlockLike>(block: T): T {
  if (block.type !== "visual" || block.engine !== "interactive" || !block.interactive) return block;
  try {
    return { ...block, interactive: parseInteractivePayload(block.interactive) };
  } catch {
    return block;
  }
}

/**
 * Publication path (share snapshot / import): an invalid payload is dropped
 * rather than copied unvalidated; the renderer shows the missing-config notice.
 */
export function sanitizeInteractiveBlock<T extends VisualBlockLike>(block: T): T {
  if (block.type !== "visual" || block.engine !== "interactive") return block;
  try {
    return { ...block, interactive: parseInteractivePayload(block.interactive) };
  } catch {
    const { interactive: _dropped, ...rest } = block;
    return rest as T;
  }
}
