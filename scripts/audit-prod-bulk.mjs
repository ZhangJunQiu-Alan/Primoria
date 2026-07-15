#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const SEVERITY_ORDER = new Map([
  ["info", 0],
  ["low", 1],
  ["moderate", 2],
  ["high", 3],
  ["critical", 4],
]);

function parseArgs(argv) {
  let auditLevel = "high";
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--audit-level" && argv[index + 1]) {
      auditLevel = argv[index + 1];
      index += 1;
    } else if (arg.startsWith("--audit-level=")) {
      auditLevel = arg.slice("--audit-level=".length);
    }
  }
  if (!SEVERITY_ORDER.has(auditLevel)) {
    throw new Error(`Unsupported audit level: ${auditLevel}`);
  }
  return { auditLevel };
}

function normalizeRegistry(value) {
  const registry = (value || "https://registry.npmjs.org/").replace(/\/+$/, "");
  return `${registry}/-/npm/v1/security/advisories/bulk`;
}

function collectVersionsFromNode(node, versions) {
  for (const [name, dep] of Object.entries(node?.dependencies ?? {})) {
    if (!dep || typeof dep !== "object") continue;
    if (typeof dep.version === "string" && /^\d+\.\d+\.\d+/.test(dep.version)) {
      const current = versions.get(name) ?? new Set();
      current.add(dep.version);
      versions.set(name, current);
    }
    collectVersionsFromNode(dep, versions);
  }
}

function productionDependencyVersions() {
  const output = execFileSync(
    "pnpm",
    ["-r", "list", "--prod", "--json", "--depth", "Infinity"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
  );
  const workspaces = JSON.parse(output);
  const versions = new Map();
  for (const workspace of workspaces) collectVersionsFromNode(workspace, versions);
  return Object.fromEntries(
    [...versions.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, values]) => [name, [...values].sort()]),
  );
}

async function fetchAdvisories(payload) {
  const endpoint = normalizeRegistry(process.env.npm_config_registry || process.env.NPM_CONFIG_REGISTRY);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "npm-command": "audit",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bulk advisory endpoint failed with ${response.status}: ${body}`);
  }
  return response.json();
}

function flattenAdvisories(response) {
  return Object.entries(response ?? {}).flatMap(([name, advisories]) =>
    (Array.isArray(advisories) ? advisories : []).map((advisory) => ({ name, ...advisory })),
  );
}

function severityCounts(advisories) {
  const counts = new Map();
  for (const advisory of advisories) {
    const severity = advisory.severity || "unknown";
    counts.set(severity, (counts.get(severity) ?? 0) + 1);
  }
  return [...counts.entries()].sort(
    ([left], [right]) => (SEVERITY_ORDER.get(right) ?? -1) - (SEVERITY_ORDER.get(left) ?? -1),
  );
}

function isBlocking(advisory, auditLevel) {
  return (SEVERITY_ORDER.get(advisory.severity) ?? -1) >= SEVERITY_ORDER.get(auditLevel);
}

function formatAdvisory(advisory) {
  const range = advisory.vulnerable_versions || advisory.range || "unknown range";
  const url = advisory.url || advisory.source || "no URL";
  return `- ${advisory.name}@${range} [${advisory.severity}] ${advisory.title || advisory.overview || "Untitled"} (${url})`;
}

async function main() {
  const { auditLevel } = parseArgs(process.argv.slice(2));
  const payload = productionDependencyVersions();
  const packageCount = Object.keys(payload).length;
  const versionCount = Object.values(payload).reduce((count, versions) => count + versions.length, 0);
  const advisories = flattenAdvisories(await fetchAdvisories(payload));
  const blocking = advisories.filter((advisory) => isBlocking(advisory, auditLevel));

  const summary = severityCounts(advisories)
    .map(([severity, count]) => `${severity}=${count}`)
    .join(", ") || "none";
  console.log(`[audit:prod] checked ${packageCount} packages / ${versionCount} versions via npm bulk advisory endpoint`);
  console.log(`[audit:prod] advisories: ${summary}`);

  if (blocking.length > 0) {
    console.error(`[audit:prod] ${blocking.length} advisory/advisories at or above ${auditLevel}:`);
    for (const advisory of blocking) console.error(formatAdvisory(advisory));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[audit:prod] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
