export type InteractiveCatalogEntry = {
  componentId: string;
  name: string;
  description: string;
};

export declare const INTERACTIVE_COMPONENT_CATALOG: InteractiveCatalogEntry[];
export declare const INTERACTIVE_COMPONENT_IDS: string[];
export declare function formatInteractiveCatalogLines(): string;
