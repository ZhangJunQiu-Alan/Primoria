export type InteractiveCatalogEntry = {
  componentId: string;
  version: number;
  name: string;
  description: string;
  names: Record<string, string>;
  descriptions: Record<string, string>;
  disciplines: string[];
  capabilities: string[];
  purpose: Record<string, string>;
  examples: Record<string, string>[];
  exclusions: Record<string, string>[];
  search: { aliases?: string[]; concepts?: string[]; stages?: string[]; supports?: string[]; excludes?: string[]; referenceIds?: string[] };
};

export declare const INTERACTIVE_COMPONENT_CATALOG: InteractiveCatalogEntry[];
export declare const INTERACTIVE_COMPONENT_IDS: string[];
export declare const INTERACTIVE_CATALOG_HASH: string;
export declare function formatInteractiveCatalogLines(): string;
