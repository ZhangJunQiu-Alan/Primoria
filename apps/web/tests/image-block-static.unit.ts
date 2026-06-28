#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function main() {
  const types = read("src/lib/courses/types.ts");
  const blockRenderer = read("src/components/course/block-renderer.tsx");
  const detail = read("src/components/course/course-detail-client.tsx");
  const styles = read("src/app/globals.css");
  const editRoute = read("src/app/api/courses/[id]/edit/route.ts");
  const editor = read("src/lib/ai/deepagent/course-editor.ts");
  const generator = read("src/lib/ai/deepagent/course-generator.ts");
  const processor = read("src/lib/courses/lesson-generation-processor.ts");

  // ── Type surface ──────────────────────────────────────────────────
  assert(/export type BlockType =[^;]*"image"/.test(types), "BlockType union includes image");
  assert(types.includes("export type ImageBlock = BlockBase & {"), "ImageBlock type is declared");
  assert(/type CourseBlock =[^;]*\bImageBlock\b/.test(types), "CourseBlock union includes ImageBlock");
  assert(/status\?:\s*"ready"\s*\|\s*"error"/.test(types), "ImageBlock carries a ready/error status");
  assert(types.includes("assetId: string;") && types.includes("imageUrl: string;"), "ImageBlock references a stable asset, not inline bytes");
  assert(!/dataBase64|base64/.test(types), "block JSONB never carries image bytes");
  assert(types.includes('case "image":'), "defaultTitleFor handles image blocks");

  // ── Renderer ─────────────────────────────────────────────────────
  assert(blockRenderer.includes('block.type === "image"'), "BlockRenderer dispatches image blocks");
  assert(blockRenderer.includes("function ImageBlockView"), "ImageBlockView component exists");
  assert(blockRenderer.includes("course-image-block"), "image renders inside a figure shell");
  assert(blockRenderer.includes('loading="lazy"') && blockRenderer.includes('decoding="async"'), "image is lazily loaded and async-decoded");
  assert(blockRenderer.includes('block.status === "error"'), "renderer shows an inline error state on generation failure");
  assert(blockRenderer.includes("course-image-error"), "image error state has a dedicated container");
  assert(blockRenderer.includes("<figcaption"), "image renders a caption");
  assert(/kind="image"/.test(blockRenderer), "image block uses the image BlockShell kind");

  // ── Chat context ─────────────────────────────────────────────────
  assert(detail.includes('block.type === "image"'), "tutor context serializes image alt/caption");
  assert(/imageKind: block.imageKind/.test(detail), "image context carries imageKind");

  // ── Styles ───────────────────────────────────────────────────────
  assert(styles.includes(".course-block-tag-image"), "image block has an outline/tag chip color");
  assert(styles.includes(".course-image {"), "image element has dedicated styling");
  assert(styles.includes("object-fit: contain"), "image never crops teaching content");
  assert(/\.course-image\s*{[^}]*width:\s*100%/.test(styles.replace(/\n/g, "")), "image spans the lesson width");
  assert(styles.includes(".course-image-error"), "image error state has dedicated styling");
  assert(styles.includes(".course-image-caption"), "image caption has dedicated styling");

  // ── Course Editor surface ────────────────────────────────────────
  assert(/GeneratableBlockTypeSchema = z\.enum\(\[[^\]]*"image"/s.test(editRoute), "edit API accepts image as a generatable type");
  assert(/BLOCK_TYPE_ENUM = z\.enum\(\[[^\]]*"image"/s.test(detail), "course detail add/transform tools allow image");
  assert(editor.includes("const ImageEdit = z.object"), "editor has a text-only image edit schema");
  assert(!editor.includes("Image blocks cannot be edited"), "image blocks are now editable (text only)");
  assert(/previous\.type === "image"/.test(editor), "editor preserves the asset and edits only image text");
  assert(!/Exclude<BlockType,[^>]*"image"/.test(generator), "generator no longer excludes image from generatable types");
  assert(generator.includes("function generateImageBlock"), "generator has a dedicated image brief→asset path");
  assert(generator.includes("finalizeImageBlocks"), "generator finalizes image blocks via the imaging step");

  // ── Cross-user cache safety: images are GLOBAL (ownerId null) so a brief-keyed
  // cache hit is readable by every user (an owner-scoped asset would 404 on reuse).
  assert(/finalizeImageBlocks\([\s\S]*?ownerId: null/.test(processor), "lesson images are stored global (ownerId null)");
  assert(/finalizeImageBlocks\(\[pending\], \{ ownerId: null/.test(generator), "editor images are stored global (ownerId null)");

  process.stdout.write("[image-block-static.unit] ALL CHECKS PASSED\n");
}

main();
