export type LearningAppTemplate =
  | { type: "html"; source: string }
  | { type: "generator"; prompt: string };

export type LearningAppOrigin =
  | { kind: "agent_generated"; sourceQuestion?: string; sourceSessionId?: string }
  | { kind: "user_forked"; parentAppId: string }
  | { kind: "system_seed"; seedId: string };

export type LearningAppComposition = {
  consumes?: string[];
  produces?: string[];
  embeds?: string[];
};

export type LearningAppMetadata = {
  createdAt: number;
  lastUsedAt: number;
  usageCount: number;
};

export type LearningApp = {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  tags: string[];
  template: LearningAppTemplate;
  origin: LearningAppOrigin;
  composition?: LearningAppComposition;
  capabilities?: string[];
  metadata: LearningAppMetadata;
  archivedAt?: number | null;
  version: number;
};

export type LearningAppSummary = {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  tags: string[];
  origin: LearningAppOrigin;
  metadata: LearningAppMetadata;
  templateType: LearningAppTemplate["type"];
  archivedAt?: number | null;
  version: number;
};

export function summarizeApp(app: LearningApp): LearningAppSummary {
  return {
    id: app.id,
    name: app.name,
    displayName: app.displayName,
    description: app.description,
    tags: app.tags,
    origin: app.origin,
    metadata: app.metadata,
    templateType: app.template.type,
    archivedAt: app.archivedAt ?? null,
    version: app.version ?? 1,
  };
}
