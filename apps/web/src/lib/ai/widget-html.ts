/**
 * Keep model-generated widget content iframe-fragment compatible. This does not
 * invent UI; it only removes full-document wrappers and repairs a narrow class
 * of provider syntax mistakes that otherwise make the whole widget script fail.
 */
export function normalizeWidgetHtml(html: string) {
  let text = String(html ?? "").trim();
  text = text.replace(/<!doctype[^>]*>/i, "").trim();
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const headMatch = text.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (bodyMatch) {
    const headAssets = headMatch
      ? headMatch[1].match(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi)?.join("\n") ?? ""
      : "";
    text = `${headAssets}\n${bodyMatch[1]}`.trim();
  }
  text = text
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .trim();
  return repairWidgetScripts(text);
}

function repairWidgetScripts(html: string) {
  return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_match, attrs: string, script: string) => {
    return `<script${attrs}>${repairYieldGenerators(script)}</script>`;
  });
}

/**
 * Some Anthropic-compatible providers occasionally emit generator-style code
 * as `function name() { yield ... }` instead of `function* name() { ... }`.
 * Browsers reject the whole script before any initialization runs, which leaves
 * an empty widget shell. Repair only named, non-async, non-generator functions
 * whose own body contains a real `yield` token.
 */
export function repairYieldGenerators(script: string) {
  return script.replace(
    /(^|[^\w$.*])function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g,
    (match: string, prefix: string, name: string, args: string, offset: number, source: string) => {
      const bodyStart = offset + match.length;
      const bodyEnd = findMatchingBrace(source, bodyStart);
      if (bodyEnd === -1) return match;

      const body = source.slice(bodyStart, bodyEnd);
      if (!containsYieldToken(body)) return match;
      return `${prefix}function* ${name}(${args}) {`;
    },
  );
}

function containsYieldToken(source: string) {
  return /(^|[^\w$])yield(?![\w$])/.test(stripJsCommentsAndStrings(source));
}

function findMatchingBrace(source: string, start: number) {
  let depth = 1;
  let quote: "'" | "\"" | "`" | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (ch === "\n" || ch === "\r") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === "/" && next === "/") {
      lineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i++;
      continue;
    }
    if (ch === "'" || ch === "\"" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function stripJsCommentsAndStrings(source: string) {
  let out = "";
  let quote: "'" | "\"" | "`" | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (ch === "\n" || ch === "\r") {
        lineComment = false;
        out += ch;
      } else {
        out += " ";
      }
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        out += "  ";
        i++;
      } else {
        out += ch === "\n" || ch === "\r" ? ch : " ";
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      out += ch === "\n" || ch === "\r" ? ch : " ";
      continue;
    }

    if (ch === "/" && next === "/") {
      lineComment = true;
      out += "  ";
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      out += "  ";
      i++;
      continue;
    }
    if (ch === "'" || ch === "\"" || ch === "`") {
      quote = ch;
      out += " ";
      continue;
    }

    out += ch;
  }

  return out;
}
