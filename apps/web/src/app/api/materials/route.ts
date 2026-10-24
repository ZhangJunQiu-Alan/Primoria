import { NextResponse } from "next/server";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { MaterialInputError, prepareMaterial, type MaterialInputErrorCode } from "@/lib/materials/ingest";
import { MAX_MATERIAL_FILE_BYTES, MAX_MATERIALS_PER_OWNER } from "@/lib/materials/limits";
import { countMaterials, insertMaterial, listMaterials } from "@/lib/materials/store";

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

// Upload one material (multipart field "file"). Text is extracted and chunked
// synchronously; only the text is stored, never the original bytes.
export async function POST(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("materials");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_MATERIAL_FILE_BYTES + MULTIPART_SLACK_BYTES) {
    return NextResponse.json({ error: "The file is larger than the 8 MB limit.", code: "file_too_large" }, { status: 413 });
  }

  let file: File;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (!(entry instanceof File)) throw new Error("missing file field");
    file = entry;
  } catch {
    return NextResponse.json({ error: "Expected a multipart upload with one file.", code: "invalid_upload" }, { status: 400 });
  }

  try {
    if ((await countMaterials(user.id)) >= MAX_MATERIALS_PER_OWNER) {
      return NextResponse.json(
        { error: `You can keep up to ${MAX_MATERIALS_PER_OWNER} materials. Delete one to upload another.`, code: "quota_exceeded" },
        { status: 409 },
      );
    }
    const prepared = await prepareMaterial({
      fileName: file.name,
      mimeType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    const { material, duplicate } = await insertMaterial(user.id, prepared);
    return NextResponse.json({ material, duplicate }, { status: duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof MaterialInputError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: INPUT_ERROR_STATUS[error.code] });
    }
    console.error("[materials] upload failed", error);
    return NextResponse.json({ error: "Upload failed. Please retry." }, { status: 503 });
  }
}
