import { NextResponse } from "next/server";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { materialDigest, MaterialInputError, prepareMaterial, type MaterialInputErrorCode } from "@/lib/materials/ingest";
import { MAX_MATERIAL_FILE_BYTES, MAX_MATERIALS_PER_OWNER } from "@/lib/materials/limits";
import { ensureUnsortedFolder, getFolder } from "@/lib/materials/folders";
import { scheduleMaterialIndexing } from "@/lib/materials/semantic-index";
import { countMaterials, findMaterialByDigest, insertMaterial, listMaterials } from "@/lib/materials/store";
import { MATERIAL_ROLES, type MaterialRole } from "@/lib/materials/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Multipart framing around one file; anything larger than file + slack is
// rejected before the body is parsed.
const MULTIPART_SLACK_BYTES = 64 * 1024;

const INPUT_ERROR_STATUS: Record<MaterialInputErrorCode, number> = {
  unsupported_type: 415,
  file_too_large: 413,
  empty_file: 400,
  parse_failed: 422,
  no_text: 422,
  too_short: 422,
  too_long: 413,
};

export async function GET() {
  const { denied, user } = await requireConfiguredAuthUser("materials");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ materials: await listMaterials(user.id) });
  } catch (error) {
    console.error("[materials] list failed", error);
    return NextResponse.json({ error: "Failed to load materials." }, { status: 503 });
  }
}

// Upload one material (multipart field "file", optional "folderId" and "role";
// default: the unsorted inbox, as a lecture). Text is extracted and chunked
// synchronously; only the text is stored, never the original bytes.
export async function POST(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("materials");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_MATERIAL_FILE_BYTES + MULTIPART_SLACK_BYTES) {
    return NextResponse.json({ error: "The file is larger than the 8 MB limit.", code: "file_too_large" }, { status: 413 });
  }

  let file: File;
  let folderField: string | null;
  let roleField: string | null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (!(entry instanceof File)) throw new Error("missing file field");
    file = entry;
    folderField = typeof form.get("folderId") === "string" ? String(form.get("folderId")) : null;
    roleField = typeof form.get("role") === "string" ? String(form.get("role")) : null;
  } catch {
    return NextResponse.json({ error: "Expected a multipart upload with one file.", code: "invalid_upload" }, { status: 400 });
  }
  if (roleField !== null && !MATERIAL_ROLES.includes(roleField as MaterialRole)) {
    return NextResponse.json({ error: "Unknown material role.", code: "invalid_role" }, { status: 400 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if ((await countMaterials(user.id)) >= MAX_MATERIALS_PER_OWNER) {
      // Re-uploading a stored file stays idempotent at the cap (and retries
      // its indexing), without extracting it again.
      const existing = await findMaterialByDigest(user.id, materialDigest(bytes));
      if (existing) {
        scheduleMaterialIndexing(user.id, [existing.id]);
        return NextResponse.json({ material: existing, duplicate: true }, { status: 200 });
      }
      return NextResponse.json(
        { error: `You can keep up to ${MAX_MATERIALS_PER_OWNER} materials. Delete one to upload another.`, code: "quota_exceeded" },
        { status: 409 },
      );
    }
    const prepared = await prepareMaterial({ fileName: file.name, mimeType: file.type, bytes });
    const folder = folderField ? await getFolder(user.id, folderField) : await ensureUnsortedFolder(user.id);
    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    const { material, duplicate } = await insertMaterial(user.id, prepared, {
      folderId: folder.id,
      role: (roleField as MaterialRole | null) ?? "lecture",
    });
    // Semantic index for course Tutor Q&A; best-effort after the response, and
    // a duplicate re-upload doubles as a retry for a previously failed pass.
    scheduleMaterialIndexing(user.id, [material.id]);
    return NextResponse.json({ material, duplicate }, { status: duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof MaterialInputError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: INPUT_ERROR_STATUS[error.code] });
    }
    console.error("[materials] upload failed", error);
    return NextResponse.json({ error: "Upload failed. Please retry." }, { status: 503 });
  }
}
