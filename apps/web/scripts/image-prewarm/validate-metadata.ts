import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { imageTextIssues } from "../../src/lib/ai/media/image-text-quality";

async function main() {
  const recordsArg = process.argv.find(arg => arg.startsWith("--records="))?.slice(10);
  const root = recordsArg ? resolve(recordsArg) : resolve(__dirname, "../../../../.private/image-prewarm/en/records");
  const graph = process.argv.find(arg => arg.startsWith("--graph="))?.slice(8);
  const findings = [];
  let checked = 0;
  for (const file of (await readdir(root)).filter(name => name.endsWith(".json")).sort()) {
    const record = JSON.parse(await readFile(resolve(root, file), "utf8"));
    if (graph && record.graphId !== graph) continue;
    checked++;
    const title = record.brief.prompt.match(/\bTitle\s+['"]([^'"]+)['"]/i)?.[1];
    const issues = imageTextIssues({ ...record.brief, title });
    if (issues.length) findings.push({ conceptId: record.conceptId, graphId: record.graphId, issues });
  }
  const errors = findings.reduce((sum, row) => sum + row.issues.filter(issue => issue.severity === "error").length, 0);
  console.log(JSON.stringify({ checked, errors, review: findings.reduce((sum, row) => sum + row.issues.filter(issue => issue.severity === "review").length, 0), findings }, null, 2));
  if (!checked || errors) process.exitCode = 1;
}

void main().catch(() => { console.error("Image metadata validation failed"); process.exitCode = 1; });
