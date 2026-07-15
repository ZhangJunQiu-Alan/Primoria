#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = resolve(repoRoot, "data/visualization-components/catalog.v1.json");
const schemaPath = resolve(repoRoot, "data/visualization-components/catalog.schema.json");

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
JSON.parse(readFileSync(schemaPath, "utf8"));

const errors = [];
const allowedStatuses = new Set(["implemented", "prototype", "planned", "deprecated"]);
const allowedActions = new Set([
  "observe",
  "adjust",
  "drag",
  "sequence",
  "compare",
  "annotate",
  "construct",
  "classify",
  "simulate",
  "explore-spatial",
]);
const forbiddenConfigFields = new Set([
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "width",
  "height",
  "position",
  "coordinates",
  "color",
  "fill",
  "stroke",
  "fontSize",
  "viewBox",
  "pixels",
]);

function fail(path, message) {
  errors.push(`${path}: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateLocalized(value, path) {
  if (!isPlainObject(value)) {
    fail(path, "must be an object");
    return;
  }
  for (const locale of ["en", "zh-CN"]) {
    if (typeof value[locale] !== "string" || value[locale].trim() === "") {
      fail(`${path}.${locale}`, "must be a non-empty string");
    }
  }
}

function validateValue(value, schema, path) {
  if (!isPlainObject(schema)) {
    fail(path, "field schema must be an object");
    return;
  }
  if (!("default" in schema)) fail(path, "every top-level config field must define default");

  switch (schema.type) {
    case "number":
    case "integer": {
      if (typeof value !== "number" || !Number.isFinite(value)) fail(path, "default must be a finite number");
      if (schema.type === "integer" && !Number.isInteger(value)) fail(path, "default must be an integer");
      if (typeof schema.minimum !== "number" || typeof schema.maximum !== "number") {
        fail(path, "numeric fields must define minimum and maximum");
      } else if (typeof value === "number" && (value < schema.minimum || value > schema.maximum)) {
        fail(path, "default is outside minimum/maximum");
      }
      break;
    }
    case "string":
      if (typeof value !== "string") fail(path, "default must be a string");
      if (!Array.isArray(schema.enum) && typeof schema.maxLength !== "number") {
        fail(path, "string fields must define enum or maxLength");
      }
      if (Array.isArray(schema.enum) && !schema.enum.includes(value)) fail(path, "default is outside enum");
      break;
    case "boolean":
      if (typeof value !== "boolean") fail(path, "default must be a boolean");
      break;
    case "array":
      if (!Array.isArray(value)) fail(path, "default must be an array");
      if (!Number.isInteger(schema.minItems) || !Number.isInteger(schema.maxItems)) {
        fail(path, "array fields must define integer minItems and maxItems");
      } else if (Array.isArray(value) && (value.length < schema.minItems || value.length > schema.maxItems)) {
        fail(path, "default length is outside minItems/maxItems");
      }
      if (!isPlainObject(schema.items)) fail(path, "array fields must define items");
      break;
    default:
      fail(path, `unsupported top-level config type ${JSON.stringify(schema.type)}`);
  }
}

if (catalog.$schema !== "./catalog.schema.json") fail("$schema", "must point to ./catalog.schema.json");
if (catalog.schemaVersion !== "1.0.0") fail("schemaVersion", "must equal 1.0.0");
if (catalog.catalogId !== "primoria.interactive-visualization") {
  fail("catalogId", "must equal primoria.interactive-visualization");
}
if (catalog.scope?.disciplinePolicy !== "all-subjects") fail("scope.disciplinePolicy", "must equal all-subjects");
if (catalog.scope?.selectionUnit !== "one-teaching-scene") fail("scope.selectionUnit", "must equal one-teaching-scene");
if (catalog.scope?.fallbackPolicy !== "sandbox-widget") fail("scope.fallbackPolicy", "must equal sandbox-widget");
if (!Array.isArray(catalog.components) || catalog.components.length === 0) fail("components", "must not be empty");

const componentIds = new Set();
const componentsById = new Map();
const rendererKeys = new Set();
const disciplineTags = new Set();
const statusCounts = new Map();

for (const [index, component] of (catalog.components ?? []).entries()) {
  const path = `components[${index}]`;
  const id = component.componentId;
  if (typeof id !== "string" || !/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/.test(id)) {
    fail(`${path}.componentId`, "must match namespace.component-name");
  } else if (componentIds.has(id)) {
    fail(`${path}.componentId`, `duplicate ${id}`);
  } else {
    componentIds.add(id);
    componentsById.set(id, component);
  }

  if (!Number.isInteger(component.version) || component.version < 1) fail(`${path}.version`, "must be a positive integer");
  validateLocalized(component.name, `${path}.name`);
  validateLocalized(component.catalogDescription, `${path}.catalogDescription`);
  validateLocalized(component.teachingPurpose, `${path}.teachingPurpose`);

  if (!allowedActions.has(component.primaryAction)) fail(`${path}.primaryAction`, "is not a supported interaction archetype");
  if (!Array.isArray(component.disciplineTags) || component.disciplineTags.length === 0) {
    fail(`${path}.disciplineTags`, "must not be empty");
  } else {
    for (const tag of component.disciplineTags) disciplineTags.add(tag);
  }
  if (!Array.isArray(component.capabilityTags) || component.capabilityTags.length < 2) {
    fail(`${path}.capabilityTags`, "must contain at least two tags");
  }

  const implementation = component.implementation;
  if (!isPlainObject(implementation) || !allowedStatuses.has(implementation.status)) {
    fail(`${path}.implementation.status`, "is invalid");
  } else {
    statusCounts.set(implementation.status, (statusCounts.get(implementation.status) ?? 0) + 1);
  }
  if (typeof implementation?.rendererKey !== "string" || !/^[a-z][A-Za-z0-9]*$/.test(implementation.rendererKey)) {
    fail(`${path}.implementation.rendererKey`, "must be lower camelCase");
  } else if (rendererKeys.has(implementation.rendererKey)) {
    fail(`${path}.implementation.rendererKey`, `duplicate ${implementation.rendererKey}`);
  } else {
    rendererKeys.add(implementation.rendererKey);
  }

  const configSchema = component.configSchema;
  if (!isPlainObject(configSchema) || configSchema.type !== "object" || configSchema.additionalProperties !== false) {
    fail(`${path}.configSchema`, "must be a closed object schema");
    continue;
  }
  const properties = configSchema.properties;
  const required = configSchema.required;
  const defaults = configSchema.default;
  if (!isPlainObject(properties)) {
    fail(`${path}.configSchema.properties`, "must be an object");
    continue;
  }
  const fieldNames = Object.keys(properties);
  if (fieldNames.length < 1 || fieldNames.length > 7) fail(`${path}.configSchema.properties`, "must contain 1 to 7 fields");
  if (!Array.isArray(required) || required.length !== fieldNames.length || fieldNames.some((field) => !required.includes(field))) {
    fail(`${path}.configSchema.required`, "must contain every config field exactly once");
  }
  if (!isPlainObject(defaults) || Object.keys(defaults).length !== fieldNames.length) {
    fail(`${path}.configSchema.default`, "must contain every config field");
  }
  for (const field of fieldNames) {
    if (forbiddenConfigFields.has(field)) fail(`${path}.configSchema.properties.${field}`, "is a visual/layout field, not a teaching concept");
    if (!(field in (defaults ?? {}))) fail(`${path}.configSchema.default.${field}`, "is missing");
    validateValue(defaults?.[field], properties[field], `${path}.configSchema.properties.${field}`);
    if (properties[field].default !== defaults?.[field] && JSON.stringify(properties[field].default) !== JSON.stringify(defaults?.[field])) {
      fail(`${path}.configSchema.properties.${field}.default`, "must match configSchema.default");
    }
  }

  for (const key of ["patchHints", "fallbackConditions", "examplePrompts"]) {
    const values = component[key];
    const min = key === "fallbackConditions" ? 1 : 2;
    if (!Array.isArray(values) || values.length < min) {
      fail(`${path}.${key}`, `must contain at least ${min} entries`);
    } else {
      values.forEach((value, valueIndex) => validateLocalized(value, `${path}.${key}[${valueIndex}]`));
    }
  }
}

for (const requiredNonStemTag of ["history", "literature", "language", "philosophy", "civics", "arts", "music"]) {
  if (!disciplineTags.has(requiredNonStemTag)) fail("components", `all-subject catalog is missing ${requiredNonStemTag} coverage`);
}

const qaComponentDir = resolve(repoRoot, "apps/web/src/lib/qa/components");
const qaRegistrySource = readFileSync(resolve(qaComponentDir, "registry.ts"), "utf8");
const implementedModuleSource = readdirSync(qaComponentDir)
  .filter((name) => name.endsWith(".ts") && !["registry.ts", "types.ts"].includes(name))
  .map((name) => readFileSync(resolve(qaComponentDir, name), "utf8"))
  .join("\n");
const qaModuleSources = `${qaRegistrySource}\n${implementedModuleSource}`;
const qaComponentIds = [...qaModuleSources.matchAll(/componentId:\s*"([a-z][a-z0-9-]*\.[a-z][a-z0-9-]*)"/g)].map(
  (match) => match[1],
);
for (const componentId of new Set(qaComponentIds)) {
  if (!componentIds.has(componentId)) fail("components", `missing current QA registry component ${componentId}`);
}
const implementedComponentIds = [...implementedModuleSource.matchAll(/componentId:\s*"([a-z][a-z0-9-]*\.[a-z][a-z0-9-]*)"/g)].map(
  (match) => match[1],
);
for (const componentId of new Set(implementedComponentIds)) {
  if (componentsById.get(componentId)?.implementation?.status !== "implemented") {
    fail("components", `implemented module ${componentId} is not marked implemented in the catalog`);
  }
}

if (errors.length > 0) {
  console.error(`[visualization-catalog] ${errors.length} validation error(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const statusSummary = [...statusCounts.entries()].map(([status, count]) => `${status}=${count}`).join(", ");
console.log(`[visualization-catalog] OK: ${catalog.components.length} components (${statusSummary})`);
console.log(`[visualization-catalog] discipline tags: ${[...disciplineTags].sort().join(", ")}`);
console.log(`[visualization-catalog] current QA registry covered: ${[...new Set(qaComponentIds)].sort().join(", ")}`);
