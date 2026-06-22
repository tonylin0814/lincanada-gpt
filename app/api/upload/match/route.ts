import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import type { ExtractedExif } from "@/lib/exif";
import { matchReceipt } from "@/lib/matcher";
import { normalizeOcrResult, type ReceiptOcrResult } from "@/lib/ocr";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    exif?: ExtractedExif;
    ocr?: ReceiptOcrResult;
  } | null;

  if (!body?.exif || !body.ocr) {
    return NextResponse.json(
      { error: "EXIF and OCR data are required." },
      { status: 400 },
    );
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const ocr = normalizeOcrResult(body.ocr);
    const match_result = await matchReceipt(client, body.exif, ocr);
    return NextResponse.json({ match_result, ocr });
  } finally {
    await client.end();
  }
}
