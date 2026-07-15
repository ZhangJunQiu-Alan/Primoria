import { z } from "zod";
import type { ImplementedComponent } from "./types";

const StatementKindSchema = z.enum(["reason", "evidence", "objection", "reply"]);
const RelationTypeSchema = z.enum(["supports", "challenges", "responds-to"]);
const StatementSchema = z.object({
  id: z.string().min(1).max(48),
  kind: StatementKindSchema,
  text: z.string().min(1).max(320),
});
const RelationSchema = z.object({
  fromId: z.string().min(1).max(48),
  toId: z.string().min(1).max(48),
  relationType: RelationTypeSchema,
});

const DEFAULT_STATEMENTS = [
  { id: "reason-1", kind: "reason" as const, text: "A general reason supports the claim." },
  { id: "evidence-1", kind: "evidence" as const, text: "A concrete example supports the reason." },
  { id: "objection-1", kind: "objection" as const, text: "An alternative interpretation challenges it." },
];
const DEFAULT_RELATIONS = [
  { fromId: "evidence-1", toId: "reason-1", relationType: "supports" as const },
  { fromId: "reason-1", toId: "central-claim", relationType: "supports" as const },
  { fromId: "objection-1", toId: "central-claim", relationType: "challenges" as const },
];

export const ArgumentMapConfigSchema = z.object({
  centralClaim: z.string().min(1).max(240).default("The proposed conclusion is justified."),
  statements: z.array(StatementSchema).min(3).max(14).default(DEFAULT_STATEMENTS),
  relations: z.array(RelationSchema).min(2).max(20).default(DEFAULT_RELATIONS),
});

export type ArgumentMapConfig = z.infer<typeof ArgumentMapConfigSchema>;

export const ArgumentMapPatchSchema = z
  .object({
    centralClaim: z.string().min(1).max(240),
    statements: z.array(StatementSchema).min(3).max(14),
    relations: z.array(RelationSchema).min(2).max(20),
  })
  .partial();

export const DEFAULT_ARGUMENT_MAP_CONFIG = ArgumentMapConfigSchema.parse({});

export function analyzeArgumentMap(config: ArgumentMapConfig) {
  const statementIds = new Set(config.statements.map((statement) => statement.id));
  const validTargets = new Set([...statementIds, "central-claim"]);
  const validRelations = config.relations.filter(
    (relation) => statementIds.has(relation.fromId) && validTargets.has(relation.toId) && relation.fromId !== relation.toId,
  );
  const invalidRelations = config.relations.filter((relation) => !validRelations.includes(relation));
  const counts = { supports: 0, challenges: 0, "responds-to": 0 };
  for (const relation of validRelations) counts[relation.relationType] += 1;
  return {
    groups: {
      support: config.statements.filter((statement) => statement.kind === "reason" || statement.kind === "evidence"),
      challenge: config.statements.filter((statement) => statement.kind === "objection" || statement.kind === "reply"),
    },
    validRelations,
    invalidRelations,
    counts,
  };
}

export const argumentMapComponent: ImplementedComponent = {
  implemented: true,
  componentId: "humanities.argument-map",
  name: "论证结构图",
  catalogDescription: "围绕中心主张组织理由、证据、反对意见与回应关系",
  configSchema: ArgumentMapConfigSchema,
  patchSchema: ArgumentMapPatchSchema,
  schemaDoc: `humanities.argument-map 的 config 字段(全部字段都有默认值,只写有把握的字段):
- centralClaim: 中心主张,1~240 字符
- statements: 3~14 条陈述;每项含 id、kind(reason|evidence|objection|reply)、text,整体替换
- relations: 2~20 条语义关系;每项含 fromId、toId、relationType(supports|challenges|responds-to),中心主张 id 固定为 "central-claim",整体替换`,
  patchHints: `「反驳这个主张」增加 objection 与 challenges 关系;「补充证据」增加 evidence 并用 supports 连接到对应 reason,不要让证据直接漂浮。`,
};
