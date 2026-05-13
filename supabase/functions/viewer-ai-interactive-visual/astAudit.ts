// AST-based deepening of the regex audit. Catches patterns the regex layer
// cannot reliably see — most importantly:
//
//   * Syntax errors (regex can't tell if the script parses at all)
//   * Spread props on gsap calls: `gsap.to(el, { ...common, x, y })`
//   * Variable-target gsap calls where the target was previously bound to a
//     d3 selection that wrote x/y/width/height attributes.
//   * addEventListener handlers passed by identifier that is never bound.
//
// Imported via esm.sh — same allowlist as the AI-generated visuals
// themselves, so no new origin needed in the Edge Function.

import * as acorn from 'https://esm.sh/acorn@8.11.3';
import * as walk from 'https://esm.sh/acorn-walk@8.3.2';

export type AstAuditSeverity = 'blocker' | 'warning';

export type AstAuditIssue = {
  rule: string;
  severity: AstAuditSeverity;
  message: string;
  hint: string;
};

export type AstAuditReport = {
  issues: AstAuditIssue[];
  passed: boolean;
};

type ScriptBlock = {
  raw: string;
  isModule: boolean;
};

const COORD_PROP_KEYS = new Set(['x', 'y', 'width', 'height']);
const D3_POSITIONAL_ATTRS = new Set(['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'd', 'points']);

function extractScripts(html: string): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const attrs = m[1] ?? '';
    const body = m[2] ?? '';
    if (!body.trim()) continue;
    const isModule = /\btype\s*=\s*["']?module["']?/i.test(attrs);
    blocks.push({ raw: body, isModule });
  }
  return blocks;
}

function extractIds(html: string): Set<string> {
  const ids = new Set<string>();
  const re = /\bid\s*=\s*(?:"([^"]+)"|'([^']+)')/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const id = (m[1] ?? m[2] ?? '').trim();
    if (id) ids.add(id);
  }
  return ids;
}

type ParsedScript =
  | { ok: true; ast: acorn.Node; isModule: boolean; raw: string }
  | { ok: false; error: string; isModule: boolean; raw: string };

function parseScript(block: ScriptBlock): ParsedScript {
  try {
    const ast = acorn.parse(block.raw, {
      ecmaVersion: 2022,
      sourceType: block.isModule ? 'module' : 'script',
      allowReturnOutsideFunction: true,
      allowHashBang: true,
    });
    return { ok: true, ast, isModule: block.isModule, raw: block.raw };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      isModule: block.isModule,
      raw: block.raw,
    };
  }
}

function getStaticPropName(prop: acorn.Property): string | null {
  if (prop.computed) return null;
  const key = prop.key as acorn.Node;
  if (key.type === 'Identifier') return (key as acorn.Identifier).name;
  if (key.type === 'Literal') {
    const value = (key as acorn.Literal).value;
    return typeof value === 'string' ? value : null;
  }
  return null;
}

function isGsapCall(node: acorn.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type !== 'MemberExpression') return false;
  const expr = callee as acorn.MemberExpression;
  if (expr.computed) return false;
  const obj = expr.object;
  const propName = expr.property.type === 'Identifier' ? (expr.property as acorn.Identifier).name : null;
  if (!propName || !['to', 'from', 'fromTo', 'set'].includes(propName)) return false;
  if (obj.type === 'Identifier' && (obj as acorn.Identifier).name === 'gsap') return true;
  return false;
}

/**
 * Find the props ObjectExpression for a gsap call: gsap.to(target, propsObj, …)
 * The props is the LAST plain ObjectExpression argument (gsap.fromTo has two).
 */
function getGsapPropsObject(call: acorn.CallExpression): acorn.ObjectExpression | null {
  const args = call.arguments;
  if (args.length < 2) return null;
  for (let i = args.length - 1; i >= 1; i -= 1) {
    if (args[i].type === 'ObjectExpression') {
      return args[i] as acorn.ObjectExpression;
    }
  }
  return null;
}

function propsObjectHasAttrWrapper(obj: acorn.ObjectExpression): boolean {
  for (const prop of obj.properties) {
    if (prop.type !== 'Property') continue;
    const name = getStaticPropName(prop as acorn.Property);
    if (name === 'attr') return true;
  }
  return false;
}

function propsObjectMentionsBareCoord(obj: acorn.ObjectExpression): boolean {
  for (const prop of obj.properties) {
    if (prop.type !== 'Property') continue;
    const name = getStaticPropName(prop as acorn.Property);
    if (name && COORD_PROP_KEYS.has(name)) return true;
  }
  return false;
}

function propsObjectHasSpread(obj: acorn.ObjectExpression): boolean {
  return obj.properties.some((p) => p.type === 'SpreadElement');
}

function scriptUsesD3PositionalAttr(ast: acorn.Node): boolean {
  let found = false;
  walk.simple(ast, {
    CallExpression(node: acorn.CallExpression) {
      if (found) return;
      const callee = node.callee;
      if (callee.type !== 'MemberExpression') return;
      const propName =
        (callee as acorn.MemberExpression).property.type === 'Identifier'
          ? ((callee as acorn.MemberExpression).property as acorn.Identifier).name
          : null;
      if (propName !== 'attr') return;
      if (node.arguments.length < 1) return;
      const first = node.arguments[0];
      if (first.type !== 'Literal') return;
      const v = (first as acorn.Literal).value;
      if (typeof v === 'string' && D3_POSITIONAL_ATTRS.has(v)) {
        found = true;
      }
    },
  });
  return found;
}

/**
 * Collect every identifier the script reads as a callable handler — i.e.
 * the second arg of `addEventListener("evt", handler)` where handler is a
 * bare Identifier (not an inline FunctionExpression / ArrowFunctionExpression).
 */
function collectAddEventListenerHandlerNames(ast: acorn.Node): Array<{ name: string; raw: acorn.Node }> {
  const refs: Array<{ name: string; raw: acorn.Node }> = [];
  walk.simple(ast, {
    CallExpression(node: acorn.CallExpression) {
      const callee = node.callee;
      if (callee.type !== 'MemberExpression') return;
      const propName =
        (callee as acorn.MemberExpression).property.type === 'Identifier'
          ? ((callee as acorn.MemberExpression).property as acorn.Identifier).name
          : null;
      if (propName !== 'addEventListener') return;
      if (node.arguments.length < 2) return;
      const handler = node.arguments[1];
      if (handler.type !== 'Identifier') return;
      refs.push({ name: (handler as acorn.Identifier).name, raw: handler });
    },
  });
  return refs;
}

/** All function-shaped bindings reachable as values within a script. */
function collectFunctionBindings(ast: acorn.Node): Set<string> {
  const names = new Set<string>();
  walk.simple(ast, {
    FunctionDeclaration(node: acorn.FunctionDeclaration | { id: acorn.Identifier | null }) {
      if (node.id) names.add(node.id.name);
    },
    VariableDeclaration(node: acorn.VariableDeclaration) {
      for (const decl of node.declarations) {
        if (decl.id.type !== 'Identifier') continue;
        const init = decl.init;
        if (
          init &&
          (init.type === 'FunctionExpression' || init.type === 'ArrowFunctionExpression')
        ) {
          names.add((decl.id as acorn.Identifier).name);
        }
      }
    },
    // Imported bindings (`import handler from "..."`) — treat as defined.
    ImportSpecifier(node: acorn.ImportSpecifier) {
      names.add(node.local.name);
    },
    ImportDefaultSpecifier(node: acorn.ImportDefaultSpecifier) {
      names.add(node.local.name);
    },
    ImportNamespaceSpecifier(node: acorn.ImportNamespaceSpecifier) {
      names.add(node.local.name);
    },
  });
  return names;
}

/** All ids referenced via document.getElementById("X") / querySelector("#X"). */
function collectDomIdLookups(ast: acorn.Node): string[] {
  const ids: string[] = [];
  walk.simple(ast, {
    CallExpression(node: acorn.CallExpression) {
      const callee = node.callee;
      if (callee.type !== 'MemberExpression') return;
      const expr = callee as acorn.MemberExpression;
      const propName = expr.property.type === 'Identifier' ? (expr.property as acorn.Identifier).name : null;
      if (propName === 'getElementById') {
        const arg = node.arguments[0];
        if (arg?.type === 'Literal' && typeof (arg as acorn.Literal).value === 'string') {
          ids.push((arg as acorn.Literal).value as string);
        }
        return;
      }
      if (propName === 'querySelector' || propName === 'querySelectorAll') {
        const arg = node.arguments[0];
        if (arg?.type === 'Literal' && typeof (arg as acorn.Literal).value === 'string') {
          const sel = (arg as acorn.Literal).value as string;
          // Only flag selectors that are a plain `#id` — composite selectors
          // can't be statically validated without a full CSS parser.
          const idMatch = /^#([A-Za-z_-][\w-]*)$/.exec(sel.trim());
          if (idMatch) ids.push(idMatch[1]);
        }
      }
    },
  });
  return ids;
}

export function auditHtmlWithAst(html: string): AstAuditReport {
  const scripts = extractScripts(html);
  const issues: AstAuditIssue[] = [];
  const domIds = extractIds(html);

  for (const block of scripts) {
    const parsed = parseScript(block);
    if (!parsed.ok) {
      issues.push({
        rule: 'js-parse-error',
        severity: 'blocker',
        message: `JavaScript syntax error: ${parsed.error}`,
        hint: 'The script will not execute in the browser. Fix the syntax error before relying on any inline behaviour.',
      });
      continue;
    }

    const ast = parsed.ast;
    const usesD3PositionalAttr = scriptUsesD3PositionalAttr(ast);

    walk.simple(ast, {
      CallExpression(node: acorn.CallExpression) {
        if (!isGsapCall(node)) return;
        const props = getGsapPropsObject(node);
        if (!props) return;
        if (propsObjectHasAttrWrapper(props)) return;

        const bare = propsObjectMentionsBareCoord(props);
        const spread = propsObjectHasSpread(props);

        if (usesD3PositionalAttr && bare) {
          issues.push({
            rule: 'ast:gsap-svg-attr-conflict',
            severity: 'blocker',
            message:
              'AST sees gsap.to(...) with bare {x|y|width|height} on an element family whose script also writes those attributes via d3 .attr(). Wrap coords in `attr: { x, y, … }` or animate with d3.transition().',
            hint:
              'Strategy A: gsap.to(el, { attr: { x: 100, y: 50, width: 30, height: 80 }, duration: 0.22 }). Strategy B: d3.select(el).transition().duration(220).attr("x", 100)…',
          });
        } else if (usesD3PositionalAttr && spread) {
          issues.push({
            rule: 'ast:gsap-spread-on-d3-target',
            severity: 'warning',
            message:
              'gsap.to(...) spreads a props object on a script that also writes SVG positional attributes — verify the spread does not include bare {x|y|width|height} keys.',
            hint:
              'Inline coords with `attr: { x, y, width, height }` instead of spreading a props bag, or audit the spread source to ensure it does not collide with d3-managed attributes.',
          });
        }
      },
    });

    // Event handler reachability: addEventListener handler must be defined somewhere.
    const handlerRefs = collectAddEventListenerHandlerNames(ast);
    if (handlerRefs.length > 0) {
      const functionBindings = collectFunctionBindings(ast);
      for (const ref of handlerRefs) {
        // Global / browser-provided callbacks like `console.log` won't appear as Identifier
        // args here (those would be MemberExpressions); a bare Identifier handler that
        // isn't bound in the script is almost certainly a typo.
        if (!functionBindings.has(ref.name)) {
          issues.push({
            rule: 'ast:addeventlistener-undefined-handler',
            severity: 'blocker',
            message: `addEventListener was passed handler identifier "${ref.name}", but no function with that name is defined in the script.`,
            hint:
              'Define the handler with `function name(event) {…}` or `const name = (event) => {…}` before the addEventListener call, or pass the handler inline.',
          });
        }
      }
    }

    // DOM id lookups must resolve to an id present in the HTML.
    for (const id of collectDomIdLookups(ast)) {
      if (!domIds.has(id)) {
        issues.push({
          rule: 'ast:dom-id-missing',
          severity: 'blocker',
          message: `Script references id "${id}" via document.getElementById/querySelector but no element in the HTML carries that id.`,
          hint: 'Either add `id="' + id + '"` to the intended element or update the lookup to target an existing id.',
        });
      }
    }
  }

  return {
    issues,
    passed: !issues.some((i) => i.severity === 'blocker'),
  };
}

export function formatAstAuditIssuesForRepair(issues: AstAuditIssue[]): string[] {
  return issues.map((issue) => `[${issue.rule}] ${issue.message} HINT: ${issue.hint}`);
}
