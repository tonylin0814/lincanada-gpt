import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getWebAppDb, getUserDb } from "@/lib/db";
import { ensureFolderPath, getGoogleOAuthClient, uploadFile } from "@/lib/drive";
import type { ExtractedExif } from "@/lib/exif";
import type { ReceiptOcrResult } from "@/lib/ocr";
import type { Receipt } from "@/types/licanada_gpt";

export const runtime = "nodejs";

type WebAppGoogleUser = {
  google_drive_folder_id: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: Date | null;
};

type EntityRow = {
  id: number;
  name: string;
  short_code: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getMimeType(file: File) {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

function normalizeAmount(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function getReceiptDate(ocr: ReceiptOcrResult, exif: ExtractedExif) {
  if (ocr.receipt_date) return ocr.receipt_date;
  if (exif.photo_taken_at) return exif.photo_taken_at.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

async function getGoogleUser(userId: number) {
  const db = getWebAppDb();
  const result = await db.query<WebAppGoogleUser>(
    `SELECT google_drive_folder_id, google_access_token,
            google_refresh_token, google_token_expiry
     FROM users
     WHERE id = $1`,
    [userId],
  );

  return result.rows[0] ?? null;
}

async function getEntity(client: Awaited<ReturnType<typeof getUserDb>>, id: number) {
  const result = await client.query<EntityRow>(
    "SELECT id, name, short_code FROM entities WHERE id = $1",
    [id],
  );

  return result.rows[0] ?? null;
}

async function getReceipt(client: Awaited<ReturnType<typeof getUserDb>>, id: string) {
  const result = await client.query<Receipt>(
    "SELECT * FROM receipts WHERE record_r_number = $1",
    [id],
  );

  return result.rows[0] ?? null;
}

async function createReceipt(
  client: Awaited<ReturnType<typeof getUserDb>>,
  entityId: number,
  ocr: ReceiptOcrResult,
  exif: ExtractedExif,
) {
  await client.query("BEGIN");
  try {
    await client.query(
      `INSERT INTO record_sequences (entity_id, record_type, last_sequence)
       VALUES ($1, 'receipt', 0)
       ON CONFLICT DO NOTHING`,
      [entityId],
    );

    const sequence = await client.query<{ last_sequence: number }>(
      `SELECT last_sequence
       FROM record_sequences
       WHERE entity_id = $1 AND record_type = 'receipt'
       FOR UPDATE`,
      [entityId],
    );
    const entity = await getEntity(client, entityId);

    if (!entity) {
      throw new Error("Entity not found.");
    }

    const newSequence = Number(sequence.rows[0]?.last_sequence ?? 0) + 1;
    const recordNumber = `${entity.short_code}-R-${String(newSequence).padStart(4, "0")}`;
    const receiptDate = getReceiptDate(ocr, exif);

    const inserted = await client.query<Receipt>(
      `INSERT INTO receipts (
         entity_id, record_r_number, vendor, vendor_address, store_number,
         receipt_number, transaction_number, authorization_code,
         receipt_date, receipt_time, category, subtotal, taxes, tips,
         grand_total, currency, payment_method, source_filename,
         photo_taken_at, photo_gps_lat, photo_gps_lng
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8,
         $9, $10, $11, $12, $13::jsonb, $14,
         $15, 'CAD', $16, $17,
         $18, $19, $20
       )
       RETURNING *`,
      [
        entityId,
        recordNumber,
        ocr.vendor ?? "Unknown Vendor",
        ocr.vendor_address,
        ocr.store_number,
        ocr.receipt_number,
        ocr.transaction_number,
        ocr.authorization_code,
        receiptDate,
        ocr.receipt_time,
        ocr.category ?? "Other",
        normalizeAmount(ocr.subtotal),
        JSON.stringify(ocr.taxes ?? []),
        normalizeAmount(ocr.tips),
        normalizeAmount(ocr.grand_total),
        ocr.payment_method,
        exif.filename,
        exif.photo_taken_at,
        exif.gps_lat,
        exif.gps_lng,
      ],
    );

    await client.query(
      `UPDATE record_sequences
       SET last_sequence = $2
       WHERE entity_id = $1 AND record_type = 'receipt'`,
      [entityId, newSequence],
    );
    await client.query("COMMIT");

    return inserted.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

function getMonthName(date: string | Date) {
  return new Date(date).toLocaleString("en-CA", { month: "long" });
}

function getArchiveFilename(receipt: Receipt) {
  const date = String(receipt.receipt_date).slice(0, 10);
  return `${receipt.record_r_number}_${slugify(receipt.vendor)}_${date}.jpg`;
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image_file");
    const matchAction = formData.get("match_action");
    const recordNumber = String(formData.get("record_r_number") ?? "");
    const entityId = Number(formData.get("entity_id") ?? 1);
    const exif = JSON.parse(String(formData.get("exif") ?? "{}")) as ExtractedExif;
    const ocr = JSON.parse(String(formData.get("ocr_data") ?? "{}")) as ReceiptOcrResult;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "image_file is required." }, { status: 400 });
    }

    if (matchAction !== "link" && matchAction !== "create") {
      return NextResponse.json({ error: "Invalid match_action." }, { status: 400 });
    }

    const googleUser = await getGoogleUser(session.user.id);
    if (!googleUser?.google_drive_folder_id) {
      return NextResponse.json(
        { error: "Google Drive root folder is not configured." },
        { status: 400 },
      );
    }
    if (!googleUser.google_access_token && !googleUser.google_refresh_token) {
      return NextResponse.json(
        { error: "Google Drive is not connected.", connect_url: "/api/auth/google" },
        { status: 401 },
      );
    }

    const auth = getGoogleOAuthClient();
    auth.setCredentials({
      access_token: googleUser.google_access_token ?? undefined,
      refresh_token: googleUser.google_refresh_token ?? undefined,
      expiry_date: googleUser.google_token_expiry
        ? googleUser.google_token_expiry.getTime()
        : undefined,
    });

    const client = await getUserDb(session.user.supabase_connection_string);
    try {
      const receipt =
        matchAction === "link"
          ? await getReceipt(client, recordNumber)
          : await createReceipt(client, entityId || 1, ocr, exif);

      if (!receipt) {
        return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
      }

      const entity = await getEntity(client, receipt.entity_id);
      if (!entity) {
        return NextResponse.json({ error: "Entity not found." }, { status: 404 });
      }

      const receiptDate = String(receipt.receipt_date).slice(0, 10);
      const folderId = await ensureFolderPath(
        auth,
        googleUser.google_drive_folder_id,
        entity.name,
        receiptDate.slice(0, 4),
        getMonthName(receiptDate),
      );
      const buffer = Buffer.from(await file.arrayBuffer());
      const driveUrl = await uploadFile(
        auth,
        folderId,
        getArchiveFilename(receipt),
        buffer,
        getMimeType(file),
      );

      await client.query(
        `UPDATE receipts
         SET attachment_link = $2,
             source_filename = COALESCE(source_filename, $3),
             photo_taken_at = COALESCE(photo_taken_at, $4),
             photo_gps_lat = COALESCE(photo_gps_lat, $5),
             photo_gps_lng = COALESCE(photo_gps_lng, $6)
         WHERE record_r_number = $1`,
        [
          receipt.record_r_number,
          driveUrl,
          exif.filename,
          exif.photo_taken_at,
          exif.gps_lat,
          exif.gps_lng,
        ],
      );

      return NextResponse.json({
        record_r_number: receipt.record_r_number,
        action: matchAction,
        attachment_link: driveUrl,
      });
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error("Archive failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Archive failed.",
      },
      { status: 500 },
    );
  }
}
