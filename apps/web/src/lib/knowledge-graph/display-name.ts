// Single point for resolving the user-facing display name of a KG node.
// Names live on the source KG (data/knowledge-graphs/source/*.json -> generated artifact) as English
// `name` plus Chinese `nameZh`; everything that shows a topic/concept to the
// user — menus, learning paths, course-generation context — must go through
// here instead of writing `nameZh ?? name` inline, so the fallback rule stays
// in one place.
//
// Pure module: no server-only imports, safe on client and server.

export type KgLanguage = string | null | undefined;

export type KgNamedNode = { name: string; nameZh?: string | null };

// Treat zh / zh-CN / zh-Hans / "chinese" as the Chinese locale. Anything else
// (incl. undefined) keeps the English name.
export function isZhLanguage(language: KgLanguage): boolean {
  if (!language) return false;
  return /^zh\b|^zh[-_]|chinese|中文/i.test(language.trim());
}

// Cheap language inference from free text: any CJK character => "zh". Used to
// default the locale from a user's query when the caller didn't pass one.
export function detectKgLanguage(text: string | null | undefined): "zh" | "en" {
  if (text && /[一-鿿㐀-䶿]/.test(text)) return "zh";
  return "en";
}

export function resolveKgDisplayName(node: KgNamedNode, language: KgLanguage): string {
  if (isZhLanguage(language)) {
    const zh = node.nameZh;
    if (typeof zh === "string" && zh.trim()) return zh;
  }
  return node.name;
}

// Localize a concept list in place of its display `name`, preserving every other
// field (conceptId, defaultOrder, nameZh).
export function localizeConcepts<T extends KgNamedNode>(concepts: T[], language: KgLanguage): T[] {
  return concepts.map((c) => ({ ...c, name: resolveKgDisplayName(c, language) }));
}
