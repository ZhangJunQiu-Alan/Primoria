import type { z } from "zod";

// Declarative-component engine (QA experiment). A registry entry is either a
// catalog-only planned component or a fully implemented one. The router and
// the QA client are generic over this interface — adding a component must not
// require touching them.

export type PlannedComponent = {
  implemented: false;
  componentId: string;
  name: string;
  /** 目录行:stage-1 路由 LLM 唯一可见的先验,一句话,≤30 字 */
  catalogDescription: string;
};

export type ImplementedComponent = {
  implemented: true;
  componentId: string;
  name: string;
  catalogDescription: string;
  /** 完整 config schema(全字段有默认值) */
  configSchema: z.ZodTypeAny;
  /** 最小补丁 schema(全字段可选,与 configSchema 字段一致) */
  patchSchema: z.ZodTypeAny;
  /** stage-2 系统提示里的 schema 文档:字段、含义、范围、默认值 */
  schemaDoc: string;
  /** stage-2 补丁路径的语义提示(口语 → 字段变化的约定),可选 */
  patchHints?: string;
};

export type RegistryEntry = PlannedComponent | ImplementedComponent;

export type ComponentConfig = Record<string, unknown>;
