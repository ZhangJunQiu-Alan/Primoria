export function formatMessage(
  template: string,
  values: Record<string, string | number | null | undefined> = {},
) {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => String(values[key] ?? ""));
}
