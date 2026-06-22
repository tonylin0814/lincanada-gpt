import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getWebAppDb, getUserDb } from "@/lib/db";
import {
  ensureFolderPath,
  getGoogleOAuthClient,
  getGoogleTokenExpiryDate,
  uploadFile,
} from "@/lib/drive";
import type { ExtractedExif } from "@/lib/exif";
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

type DuplicateReceipt = {
  record_r_number: string;
  reason: string;
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

function dateOnly(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);
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

async function ensureArchiveColumns(client: Awaited<ReturnType<typeof getUserDb>>) {
  await client.query(`
    ALTER TABLE receipts
      ADD COLUMN IF NOT EXISTS uploaded_file_size BIGINT,
      ADD COLUMN IF NOT EXISTS uploaded_mime_type TEXT
  `);
}

async function findDuplicateReceipt({
  client,
  exif,
  file,
  receipt,
}: {
  client: Awaited<ReturnType<typeof getUserDb>>;
  exif: ExtractedExif;
  file: File;
  receipt: Receipt;
}) {
  if (receipt.attachment_link) {
    return {
      record_r_number: receipt.record_r_number,
      reason: "This receipt record already has an uploaded file.",
    };
  }

  const checks: Array<{
    reason: string;
    sql: string;
    values: Array<string | number | null>;
  }> = [];

  if (exif.filename) {
    checks.push({
      reason: "Another uploaded receipt has the same original filename and file size.",
      sql: `SELECT record_r_number, $4::text AS reason
            FROM receipts
            WHERE record_r_number <> $1
              AND attachment_link IS NOT NULL
              AND source_filename = $2
              AND uploaded_file_size = $3
            LIMIT 1`,
      values: [receipt.record_r_number, exif.filename, file.size, ""],
    });
  }

  if (receipt.transaction_number) {
    checks.push({
      reason: "Another uploaded receipt has the same transaction number.",
      sql: `SELECT record_r_number, $4::text AS reason
            FROM receipts
            WHERE record_r_number <> $1
              AND attachment_link IS NOT NULL
              AND transaction_number = $2
              AND receipt_date = $3::date
            LIMIT 1`,
      values: [
        receipt.record_r_number,
        receipt.transaction_number,
        dateOnly(receipt.receipt_date),
        "",
      ],
    });
  }

  if (receipt.authorization_code) {
    checks.push({
      reason: "Another uploaded receipt has the same authorization code.",
      sql: `SELECT record_r_number, $4::text AS reason
            FROM receipts
            WHERE record_r_number <> $1
              AND attachment_link IS NOT NULL
              AND authorization_code = $2
              AND receipt_date = $3::date
            LIMIT 1`,
      values: [
        receipt.record_r_number,
        receipt.authorization_code,
        dateOnly(receipt.receipt_date),
        "",
      ],
    });
  }

  if (receipt.receipt_number && receipt.vendor) {
    checks.push({
      reason: "Another uploaded receipt has the same vendor, date, and receipt number.",
      sql: `SELECT record_r_number, $5::text AS reason
            FROM receipts
            WHERE record_r_number <> $1
              AND attachment_link IS NOT NULL
              AND receipt_number = $2
              AND receipt_date = $3::date
              AND vendor ILIKE $4
            LIMIT 1`,
      values: [
        receipt.record_r_number,
        receipt.receipt_number,
        dateOnly(receipt.receipt_date),
        `%${receipt.vendor}%`,
        "",
      ],
    });
  }

  if (exif.photo_taken_at && exif.gps_lat && exif.gps_lng) {
    checks.push({
      reason: "Another uploaded receipt has the same photo time and GPS metadata.",
      sql: `SELECT record_r_number, $5::text AS reason
            FROM receipts
            WHERE record_r_number <> $1
              AND attachment_link IS NOT NULL
              AND photo_taken_at = $2::timestamptz
              AND photo_gps_lat = $3
              AND photo_gps_lng = $4
            LIMIT 1`,
      values: [
        receipt.record_r_number,
        exif.photo_taken_at,
        exif.gps_lat,
        exif.gps_lng,
        "",
      ],
    });
  }

  for (const check of checks) {
    const result = await client.query<DuplicateReceipt>(check.sql, [
      ...check.values.slice(0, -1),
      check.reason,
    ]);
    const duplicate = result.rows[0];

    if (duplicate) {
      return duplicate;
    }
  }

  return null;
}

function getMonthName(date: string | Date) {
  return new Date(date).toLocaleString("en-CA", { month: "long" });
}

function getArchiveFilename(receipt: Receipt) {
  const date = dateOnly(receipt.receipt_date);
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
    const exif = JSON.parse(String(formData.get("exif") ?? "{}")) as ExtractedExif;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "image_file is required." }, { status: 400 });
    }

    if (matchAction !== "link" || !recordNumber) {
      return NextResponse.json(
        { error: "A matching receipt record is required before upload." },
        { status: 400 },
      );
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
      expiry_date: getGoogleTokenExpiryDate(googleUser.google_token_expiry),
    });

    const client = await getUserDb(session.user.supabase_connection_string);
    try {
      await ensureArchiveColumns(client);
      const receipt = await getReceipt(client, recordNumber);

      if (!receipt) {
        return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
      }

      const entity = await getEntity(client, receipt.entity_id);
      if (!entity) {
        return NextResponse.json({ error: "Entity not found." }, { status: 404 });
      }

      const duplicate = await findDuplicateReceipt({
        client,
        exif,
        file,
        receipt,
      });

      if (duplicate) {
        return NextResponse.json(
          {
            duplicate_record_r_number: duplicate.record_r_number,
            error: `Duplicate upload blocked. ${duplicate.reason} (${duplicate.record_r_number})`,
          },
          { status: 409 },
        );
      }

      const receiptDate = dateOnly(receipt.receipt_date);
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
             photo_gps_lng = COALESCE(photo_gps_lng, $6),
             uploaded_file_size = $7,
             uploaded_mime_type = $8
         WHERE record_r_number = $1`,
        [
          receipt.record_r_number,
          driveUrl,
          exif.filename,
          exif.photo_taken_at,
          exif.gps_lat,
          exif.gps_lng,
          file.size,
          getMimeType(file),
        ],
      );

      return NextResponse.json({
        record_r_number: receipt.record_r_number,
        action: "link",
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
