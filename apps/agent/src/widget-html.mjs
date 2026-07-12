/**
 * Keep model-generated widget content iframe-fragment compatible. This does not
 * invent UI; it only removes full-document wrappers when a provider emits them.
 * @param {string} html
 */
export function normalizeWidgetHtml(html) {
  let text = String(html ?? "").trim();
  text = text.replace(/<!doctype[^>]*>/i, "").trim();
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const headMatch = text.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (bodyMatch) {
    const headAssets = headMatch ? headMatch[1].match(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi)?.join("\n") ?? "" : "";
    text = `${headAssets}\n${bodyMatch[1]}`.trim();
  }
  text = text
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .trim();
  return repairWidgetScripts(text);
}

/**
 * @param {string} html
 */
function repairWidgetScripts(html) {
  return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (/** @type {string} */ _match, /** @type {string} */ attrs, /** @type {string} */ script) => {
    return `<script${attrs}>${repairYieldGenerators(script)}</script>`;
  });
}

/**
 * @param {string} script
 */
function repairYieldGenerators(script) {
  return script.replace(
    /(^|[^\w$.*])function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g,
    (/** @type {string} */ match, /** @type {string} */ prefix, /** @type {string} */ name, /** @type {string} */ args, /** @type {number} */ offset, /** @type {string} */ source) => {
      const bodyStart = offset + match.length;
      const bodyEnd = findMatchingBrace(source, bodyStart);
      if (bodyEnd === -1) return match;

      const body = source.slice(bodyStart, bodyEnd);
      if (!containsYieldToken(body)) return match;
      return `${prefix}function* ${name}(${args}) {`;
    },
  );
}

/**
 * @param {string} source
 */
function containsYieldToken(source) {
  return /(^|[^\w$])yield(?![\w$])/.test(stripJsCommentsAndStrings(source));
}

/**
 * @param {string} source
 * @param {number} start
 */
function findMatchingBrace(source, start) {
  let depth = 1;
  /** @type {string | null} */
  let quote = null;
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

/**
 * @param {string} source
 */
function stripJsCommentsAndStrings(source) {
  let out = "";
  let quote = null;
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
