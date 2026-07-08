import type { CourseBlock, ImageBlock, PedagogicalRole } from "@/lib/courses/types";
import type { ImageBrief } from "./image-brief";
import { generateGeminiImage } from "./gemini-image";
import {
  dbMediaAssetStore,
  resolveImageAsset,
  type GeneratedImage,
  type MediaAssetStore,
} from "./media-assets";

// Image Builder: the lesson-generation `imaging` stage. The Block Writer emits an
// image *brief* (not an asset); this turns each pending image block into a final
// ImageBlock backed by a cached media asset. Generation runs in parallel and a
// single failure never fails the lesson — that block renders an inline error so
// generation instability stays visible (user decision, dev phase).

/** Pre-asset image block carried through the writer/checkpoint stages — an
 * ImageBlock that still carries its `brief`. Never persisted: the imaging stage
 * replaces it with a ready/error ImageBlock (brief stripped) before validation. */
export type PendingImageBlock = ImageBlock & { brief: ImageBrief };

export function isPendingImageBlock(block: CourseBlock): block is PendingImageBlock {
  return block.type === "image" && !!block.brief;
}

export type ImageGenerate = (brief: ImageBrief) => Promise<GeneratedImage>;

/** Production generator — calls Gemini. Injectable so the pipeline and tests can
 * substitute a mock (tests never hit the real API). */
export const defaultImageGenerate: ImageGenerate = (brief) => generateGeminiImage(brief);

export type FinalizeImageOptions = {
  /** null → global asset; otherwise owner-scoped. Lesson images pass null so
   * brief-keyed cache hits remain readable across users. */
  ownerId: string | null;
  model: string;
  language?: string | null;
  generate?: ImageGenerate;
  store?: MediaAssetStore;
  provider?: string;
};

function readyBlock(pending: PendingImageBlock, asset: { assetId: string; imageUrl: string }, model: string): ImageBlock {
  return {
    id: pending.id,
    type: "image",
    title: pending.title,
    conceptIds: pending.conceptIds,
    pedagogicalRole: pending.pedagogicalRole,
    assetId: asset.assetId,
    imageUrl: asset.imageUrl,
    alt: pending.alt,
    caption: pending.caption,
    imageKind: pending.imageKind,
    prompt: pending.brief.prompt,
    model,
    aspectRatio: pending.aspectRatio,
    status: "ready",
  };
}

function errorBlock(pending: PendingImageBlock, message: string): ImageBlock {
  return {
    id: pending.id,
    type: "image",
    title: pending.title,
    conceptIds: pending.conceptIds,
    pedagogicalRole: pending.pedagogicalRole,
    assetId: "",
    imageUrl: "",
    alt: pending.alt,
    caption: pending.caption,
    imageKind: pending.imageKind,
    prompt: pending.brief.prompt,
    aspectRatio: pending.aspectRatio,
    status: "error",
    errorMessage: message,
  };
}

/** Resolve every pending image block in `blocks` to a ready/error ImageBlock,
 * preserving order and passing non-image blocks through untouched. */
export async function finalizeImageBlocks(blocks: CourseBlock[], opts: FinalizeImageOptions): Promise<CourseBlock[]> {
  const generate = opts.generate ?? defaultImageGenerate;
  const store = opts.store ?? dbMediaAssetStore;
  const out = [...blocks];

  const pending = blocks
    .map((block, index) => ({ block, index }))
    .filter((entry): entry is { block: PendingImageBlock; index: number } => isPendingImageBlock(entry.block));

  await Promise.all(
    pending.map(async ({ block, index }) => {
      const brief: ImageBrief = { ...block.brief, language: block.brief.language ?? opts.language ?? undefined };
      try {
        const resolved = await resolveImageAsset(
          { brief, model: opts.model, provider: opts.provider, ownerId: opts.ownerId, generate: () => generate(brief) },
          store,
        );
        out[index] = readyBlock(block, resolved, opts.model);
      } catch (error) {
        const message = error instanceof Error ? error.message : "image generation failed";
        // Don't fail the lesson; surface the failure on the block itself.
        console.error(`[image-builder] image generation failed for block ${block.id}:`, message);
        out[index] = errorBlock(block, message);
      }
    }),
  );

  return out;
}

/** Builds the pending block the writer/compiler hands to the imaging stage. */
export function makePendingImageBlock(args: {
  id: string;
  title?: string;
  conceptIds: string[];
  pedagogicalRole?: PedagogicalRole;
  brief: ImageBrief;
}): PendingImageBlock {
  return {
    id: args.id,
    type: "image",
    title: args.title,
    conceptIds: args.conceptIds,
    pedagogicalRole: args.pedagogicalRole,
    assetId: "",
    imageUrl: "",
    alt: args.brief.alt,
    caption: args.brief.caption,
    imageKind: args.brief.imageKind,
    prompt: args.brief.prompt,
    aspectRatio: "16:9",
    brief: args.brief,
  };
}
