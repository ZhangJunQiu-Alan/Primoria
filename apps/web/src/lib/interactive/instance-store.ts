import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { interactiveComponentInstances as instances } from "@/lib/db/schema";
import { parseInteractivePayload } from "./payload";
import type { InteractiveComponentPayload } from "@primoria/contracts/artifacts/schemas";

export async function getInteractiveInstance(ownerId: string, instanceId: string) {
  const [row] = await getDb().select().from(instances).where(and(eq(instances.ownerId, ownerId), eq(instances.instanceId, instanceId))).limit(1);
  return row ?? null;
}

export async function createInteractiveInstance(input: InteractiveComponentPayload & { ownerId: string; instanceId: string; requestHash: string }) {
  const payload = parseInteractivePayload(inputPayload(input));
  await getDb().insert(instances).values({
    ...payload, id: createHash("sha256").update(`${input.ownerId}\0${input.instanceId}`).digest("hex"),
    ownerId: input.ownerId, instanceId: input.instanceId, requestHash: input.requestHash,
    initialConfig: payload.config,
  }).onConflictDoNothing({ target: [instances.ownerId, instances.instanceId] });
  return getInteractiveInstance(input.ownerId, input.instanceId);
}

export async function updateInteractiveInstance(ownerId: string, instanceId: string, revision: number, config: Record<string, unknown>) {
  const current = await getInteractiveInstance(ownerId, instanceId);
  if (!current) return { kind: "not_found" as const };
  const payload = parseInteractivePayload({ componentId: current.componentId, configVersion: current.configVersion, config });
  const [updated] = await getDb().update(instances).set({ config: payload.config, revision: revision + 1, updatedAt: new Date() })
    .where(and(eq(instances.ownerId, ownerId), eq(instances.instanceId, instanceId), eq(instances.revision, revision))).returning();
  return updated ? { kind: "updated" as const, instance: updated } : { kind: "conflict" as const };
}

function inputPayload(input: InteractiveComponentPayload): InteractiveComponentPayload {
  return { componentId: input.componentId, configVersion: input.configVersion, config: input.config };
}
