import { createHash } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { interactiveComponentInstances as instances } from "@/lib/db/schema";
import { parseInteractivePayload } from "./payload";
import type { InteractiveComponentPayload } from "@primoria/contracts/artifacts/schemas";

const DEFAULT_MAX_INSTANCES_PER_OWNER = 2000;

export function getInteractiveInstanceRetentionLimit() {
  const configured = Number(process.env.INTERACTIVE_COMPONENT_INSTANCE_MAX_PER_OWNER ?? "");
  return Number.isInteger(configured) && configured >= 50 && configured <= 100_000 ? configured : DEFAULT_MAX_INSTANCES_PER_OWNER;
}

export async function getInteractiveInstance(ownerId: string, instanceId: string) {
  const [row] = await getDb().select().from(instances).where(and(eq(instances.ownerId, ownerId), eq(instances.instanceId, instanceId))).limit(1);
  return row ?? null;
}

export async function createInteractiveInstance(input: InteractiveComponentPayload & { ownerId: string; instanceId: string; requestHash: string }) {
  const payload = parseInteractivePayload(inputPayload(input));
  const inserted = await getDb().insert(instances).values({
    ...payload, id: createHash("sha256").update(`${input.ownerId}\0${input.instanceId}`).digest("hex"),
    ownerId: input.ownerId, instanceId: input.instanceId, requestHash: input.requestHash,
    initialConfig: payload.config,
  }).onConflictDoNothing({ target: [instances.ownerId, instances.instanceId] }).returning({ id: instances.id });
  if (inserted.length) await pruneInteractiveInstances(input.ownerId);
  return getInteractiveInstance(input.ownerId, input.instanceId);
}

/**
 * Keeps the most recently used instances per owner. A pruned chat card later
 * regenerates through the normal budgeted POST path instead of failing.
 */
export async function pruneInteractiveInstances(ownerId: string, keep = getInteractiveInstanceRetentionLimit()) {
  const stale = getDb().select({ id: instances.id }).from(instances).where(eq(instances.ownerId, ownerId))
    .orderBy(desc(instances.updatedAt), desc(instances.id)).offset(keep);
  await getDb().delete(instances).where(and(eq(instances.ownerId, ownerId), inArray(instances.id, stale)));
}

export async function updateInteractiveInstance(ownerId: string, instanceId: string, revision: number, config: Record<string, unknown>, configVersion?: number) {
  const current = await getInteractiveInstance(ownerId, instanceId);
  if (!current) return { kind: "not_found" as const };
  // The browser edits the upgraded config it received; it reports that version
  // so a stale tab's older config is upgraded instead of mis-validated.
  const payload = parseInteractivePayload({ componentId: current.componentId, configVersion: configVersion ?? current.configVersion, config });
  const [updated] = await getDb().update(instances).set({ config: payload.config, configVersion: payload.configVersion, revision: revision + 1, updatedAt: new Date() })
    .where(and(eq(instances.ownerId, ownerId), eq(instances.instanceId, instanceId), eq(instances.revision, revision))).returning();
  return updated ? { kind: "updated" as const, instance: updated } : { kind: "conflict" as const };
}

function inputPayload(input: InteractiveComponentPayload): InteractiveComponentPayload {
  return { componentId: input.componentId, configVersion: input.configVersion, config: input.config };
}
