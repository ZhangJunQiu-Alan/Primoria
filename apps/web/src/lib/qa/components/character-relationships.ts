import { z } from "zod";
import type { ImplementedComponent } from "./types";

const CharacterSchema = z.object({ id: z.string().min(1).max(48), name: z.string().min(1).max(100), role: z.string().min(1).max(100), goal: z.string().min(1).max(220) });
const RelationshipSchema = z.object({ fromCharacterId: z.string().min(1).max(48), toCharacterId: z.string().min(1).max(48), relationship: z.string().min(1).max(240), phase: z.string().min(1).max(80) });
const DEFAULT_CHARACTERS = [
  { id: "character-a", name: "Character A", role: "Protagonist", goal: "Protect the existing order" },
  { id: "character-b", name: "Character B", role: "Challenger", goal: "Change the existing order" },
];
const DEFAULT_RELATIONSHIPS = [{ fromCharacterId: "character-a", toCharacterId: "character-b", relationship: "Opposition shaped by mutual dependence", phase: "Middle" }];
export const CharacterRelationshipsConfigSchema = z.object({
  workTitle: z.string().min(1).max(160).default("A work with an ensemble cast"),
  characters: z.array(CharacterSchema).min(2).max(10).default(DEFAULT_CHARACTERS),
  relationships: z.array(RelationshipSchema).min(1).max(18).default(DEFAULT_RELATIONSHIPS),
  selectedPhase: z.string().min(1).max(80).default("Middle"),
});
export type CharacterRelationshipsConfig = z.infer<typeof CharacterRelationshipsConfigSchema>;
export const CharacterRelationshipsPatchSchema = z.object({ workTitle: z.string().min(1).max(160), characters: z.array(CharacterSchema).min(2).max(10), relationships: z.array(RelationshipSchema).min(1).max(18), selectedPhase: z.string().min(1).max(80) }).partial();
export const DEFAULT_CHARACTER_RELATIONSHIPS_CONFIG = CharacterRelationshipsConfigSchema.parse({});

export function deriveCharacterRelationships(config: CharacterRelationshipsConfig) {
  const ids = new Set(config.characters.map((character) => character.id));
  const validRelationships = config.relationships.filter((relationship) => ids.has(relationship.fromCharacterId) && ids.has(relationship.toCharacterId) && relationship.fromCharacterId !== relationship.toCharacterId);
  return { visibleRelationships: validRelationships.filter((relationship) => relationship.phase === config.selectedPhase), validRelationships, invalidRelationshipCount: config.relationships.length - validRelationships.length, phases: [...new Set(validRelationships.map((relationship) => relationship.phase))] };
}

export const characterRelationshipsComponent: ImplementedComponent = {
  implemented: true, componentId: "literature.character-relationships", name: "人物关系",
  catalogDescription: "按叙事阶段查看人物目标、角色与关系变化",
  configSchema: CharacterRelationshipsConfigSchema, patchSchema: CharacterRelationshipsPatchSchema,
  schemaDoc: `literature.character-relationships 的 config 字段(全部字段都有默认值,只写有把握的字段):
- workTitle: 作品名,1~160 字符,默认 "A work with an ensemble cast"
- characters: 2~10 个人物;每项含 id、name、role(角色定位)、goal(目标),整体替换
- relationships: 1~18 条关系;每项含 fromCharacterId、toCharacterId、relationship(关系描述)、phase(所属叙事阶段),id 必须引用已有人物,整体替换
- selectedPhase: 当前查看的叙事阶段,默认 "Middle"`,
  patchHints: `「看结局时的关系」只改 selectedPhase;「两人关系恶化了」增加或更新对应 phase 的 relationship,不要覆盖人物稳定的 goal;「加一个人物」同时补 characters 与相关 relationships。`,
};
