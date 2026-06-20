import { NextResponse } from "next/server";
import heicConvert from "heic-convert";
import { getCurrentSession } from "@/lib/auth";
import type { ExtractedExif } from "@/lib/exif";
import { getUserDb } from "@/lib/db";
import { matchReceipt } from "@/lib/matcher";
import { ocrReceipt } from "@/lib/ocr";

export const runtime = "nodejs";

function getMimeType(file: File) {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  return "application/octet-stream";
}

function isHeicMimeType(mimeType: string) {
  return mimeType === "image/heic" || mimeType === "image/heif";
}

async function prepareImage(file: File) {
  const mimeType = getMimeType(file);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (!isHeicMimeType(mimeType)) {
    return { buffer, mimeType };
  }

  const converted = await heicConvert({
    buffer,
    format: "JPEG",
    quality: 1,
  });

  return { buffer: Buffer.from(converted), mimeType: "image/jpeg" };
}

function suggestedAction(action: "auto" | "pick" | "create") {
  if (action === "auto") return "matched";
  if (action === "pick") return "pick_candidate";
  return "create_new_record";
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const exifRaw = formData.get("exif");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  if (getMimeType(file) === "application/pdf") {
    return NextResponse.json(
      { error: "PDF OCR requires a rendering step and is not supported yet." },
      { status: 400 },
    );
  }

  const exif = exifRaw
    ? (JSON.parse(String(exifRaw)) as ExtractedExif)
    : ({
        filename: file.name,
        photo_taken_at: null,
        gps_lat: null,
        gps_lng: null,
      } satisfies ExtractedExif);

  const image = await prepareImage(file);
  const dataUrl = `data:${image.mimeType};base64,${image.buffer.toString("base64")}`;
  const ocr = await ocrReceipt(dataUrl);
  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const match_result = await matchReceipt(client, exif, ocr);
    return NextResponse.json({
      ocr,
      match_result,
      suggested_action: suggestedAction(match_result.action),
    });
  } finally {
    await client.end();
  }
}
