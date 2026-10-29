import { parse, type SymbolNode } from "mathjs";
import type { MathExplorerArtifact } from "@primoria/contracts/artifacts";

type Payload = Omit<MathExplorerArtifact, "type" | "title" | "description">;

export function mathExplorerIssues(payload: Payload): string[] {
  const issues: string[] = [];
  const variable = payload.mode === "parametric" ? "t" : "x";
  const expressions = payload.mode === "parametric"
    ? (payload.curves ?? []).flatMap((curve) => [curve.xExpr, curve.yExpr])
    : (payload.functions ?? []).map((fn) => fn.expr);
  if (!expressions.length) issues.push(`Provide at least one ${variable === "t" ? "parametric curve" : "Cartesian function"}.`);
  for (const key of ["xRange", "yRange", ...(variable === "t" ? ["tRange" as const] : [])] as const) {
    const range = payload[key];
    if (!range || range[0] >= range[1]) issues.push(`${key} must explicitly define an increasing, relevant plotting domain.`);
  }
  const names = new Set<string>();
  for (const parameter of payload.parameters) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(parameter.name) || [variable, "pi", "e"].includes(parameter.name) || names.has(parameter.name)) {
      issues.push(`Slider name "${parameter.name}" must be unique and must not shadow ${variable}, pi or e.`);
    }
    names.add(parameter.name);
    if (parameter.min >= parameter.max || parameter.default < parameter.min || parameter.default > parameter.max || (parameter.step !== undefined && parameter.step <= 0)) {
      issues.push(`Slider "${parameter.name}" needs min < max, an in-range default and a positive step.`);
    }
  }
  const symbols = new Set<string>();
  for (const expression of expressions) {
    try {
      const tree = parse(expression);
      tree.traverse((node, path, parent) => {
        if (node.type === "SymbolNode" && !(parent?.type === "FunctionNode" && path === "fn")) {
          symbols.add((node as SymbolNode).name);
        }
      });
    } catch {
      issues.push(`Invalid math expression: ${expression}`);
    }
  }
  for (const name of names) {
    if (!symbols.has(name)) issues.push(`Slider "${name}" does not affect any plotted expression. Use it in the mathematical model, remove it, or use HTML for a movable probe; never change the taught formula just to use a slider.`);
  }
  for (const symbol of symbols) {
    if (![variable, "pi", "e"].includes(symbol) && !names.has(symbol)) issues.push(`Undeclared variable "${symbol}" in plotted expression.`);
  }
  return issues;
}
