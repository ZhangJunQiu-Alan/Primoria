import { WidgetRendererArgsSchema } from "@primoria/contracts/artifacts/schemas";
import { assembleWidgetStandaloneHtml } from "../../src/components/generative-ui/export-utils";

export function assembleOfflineWidget(value: unknown): { title: string; html: string } | null {
  const parsed = WidgetRendererArgsSchema.safeParse(value);
  if (!parsed.success || parsed.data.dependencies?.length) return null;
  const title = parsed.data.title ?? "Captured visualization";
  const policy = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
  const html = assembleWidgetStandaloneHtml({ ...parsed.data, title }).replace("<head>", `<head><meta http-equiv="Content-Security-Policy" content="${policy}">`);
  return { title, html };
}
