export type InteractiveSearchInput = { query: string; discipline?: string; stage?: string; limit?: number };
export type InteractiveSearchResult = {
  componentId: string; configVersion: number; name: string; description: string;
  disciplines: string[]; supports: string[]; exclusions: string[]; score: number; matchedTerms: string[];
};
export declare function searchInteractiveComponents(input: InteractiveSearchInput): InteractiveSearchResult[];
export declare function formatInteractiveDirectory(): string;
export declare function normalizeInteractiveDiscipline(value: string): string;
export declare const INTERACTIVE_CATALOG_HASH: string;
