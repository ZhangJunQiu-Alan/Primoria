import { InteractiveComponentPayloadSchema, type InteractiveComponentPayload } from "@primoria/contracts/artifacts/schemas";
import { INTERACTIVE_COMPONENT_CATALOG } from "@primoria/contracts/artifacts/interactive-catalog";
import { getImplementedComponent } from "./components/registry";
import { z } from "zod";

export function assertNoUnknownConfigFields(input: unknown, parsed: unknown): void {
  if (!input || typeof input !== "object" || !parsed || typeof parsed !== "object") return;
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(parsed, key)) throw new z.ZodError([{ code: "custom", path: [key], message: "Unknown configuration field" }]);
    assertNoUnknownConfigFields((input as Record<string, unknown>)[key], (parsed as Record<string, unknown>)[key]);
  }
}

export function parseInteractivePayload(input: unknown): InteractiveComponentPayload {
  const payload = InteractiveComponentPayloadSchema.parse(input);
  const component = getImplementedComponent(payload.componentId);
  const metadata = INTERACTIVE_COMPONENT_CATALOG.find((entry) => entry.componentId === payload.componentId);
  if (!component || !metadata) throw new Error("Unknown interactive component");
  if (payload.configVersion !== metadata.version) throw new Error("Unsupported interactive configuration version");
  const config = component.configSchema.parse(payload.config) as Record<string, unknown>;
  assertNoUnknownConfigFields(payload.config, config);
  return { ...payload, config };
}
