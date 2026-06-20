import type { Client } from "pg";
import type { ExtractedExif } from "@/lib/exif";
import type { ReceiptOcrResult } from "@/lib/ocr";
import type { Receipt } from "@/types/licanada_gpt";

export type MatchResult = {
  confidence: number;
  match: Receipt | null;
  candidates: Receipt[] | null;
  action: "auto" | "pick" | "create";
};

function auto(match: Receipt, confidence: number): MatchResult {
  return { confidence, match, candidates: null, action: "auto" };
}

function pick(candidates: Receipt[], confidence: number): MatchResult {
  return { confidence, match: null, candidates, action: "pick" };
}

function create(): MatchResult {
  return { confidence: 0, match: null, candidates: null, action: "create" };
}

async function firstReceipt(
  client: Client,
  sql: string,
  values: Array<string | number>,
) {
  const result = await client.query<Receipt>(sql, values);
  return result.rows[0] ?? null;
}

async function receiptCandidates(
  client: Client,
  sql: string,
  values: Array<string | number>,
) {
  const result = await client.query<Receipt>(sql, values);
  return result.rows;
}

export async function matchReceipt(
  client: Client,
  exif: ExtractedExif,
  ocr: ReceiptOcrResult,
): Promise<MatchResult> {
  const vendorPattern = ocr.vendor ? `%${ocr.vendor}%` : null;
  const addressPattern = ocr.vendor_address ? `%${ocr.vendor_address}%` : null;

  if (exif.filename) {
    const match = await firstReceipt(
      client,
      "SELECT * FROM receipts WHERE source_filename = $1 LIMIT 1",
      [exif.filename],
    );
    if (match) return auto(match, 99);
  }

  if (exif.gps_lat && exif.gps_lng && exif.photo_taken_at) {
    const match = await firstReceipt(
      client,
      `SELECT r.*
       FROM receipts r
       LEFT JOIN places p ON p.id = r.place_id
       WHERE r.photo_gps_lat IS NOT NULL
         AND r.photo_gps_lng IS NOT NULL
         AND r.photo_taken_at IS NOT NULL
         AND ABS(EXTRACT(EPOCH FROM (r.photo_taken_at - $3::timestamptz))) <= 900
         AND (
           6371000 * acos(
             LEAST(1, GREATEST(-1,
               cos(radians($1::numeric)) * cos(radians(r.photo_gps_lat)) *
               cos(radians(r.photo_gps_lng) - radians($2::numeric)) +
               sin(radians($1::numeric)) * sin(radians(r.photo_gps_lat))
             ))
           )
         ) <= COALESCE(p.gps_radius_m, 100)
       ORDER BY r.photo_taken_at DESC
       LIMIT 1`,
      [exif.gps_lat, exif.gps_lng, exif.photo_taken_at],
    );
    if (match) return auto(match, 99);
  }

  if (ocr.transaction_number) {
    const match = await firstReceipt(
      client,
      "SELECT * FROM receipts WHERE transaction_number = $1 LIMIT 1",
      [ocr.transaction_number],
    );
    if (match) return auto(match, 100);
  }

  if (ocr.authorization_code) {
    const match = await firstReceipt(
      client,
      "SELECT * FROM receipts WHERE authorization_code = $1 LIMIT 1",
      [ocr.authorization_code],
    );
    if (match) return auto(match, 100);
  }

  if (ocr.receipt_number && vendorPattern) {
    const match = await firstReceipt(
      client,
      "SELECT * FROM receipts WHERE receipt_number = $1 AND vendor ILIKE $2 LIMIT 1",
      [ocr.receipt_number, vendorPattern],
    );
    if (match) return auto(match, 99);
  }

  if (vendorPattern && ocr.receipt_date && ocr.receipt_time && ocr.grand_total) {
    const match = await firstReceipt(
      client,
      `SELECT * FROM receipts
       WHERE vendor ILIKE $1
         AND receipt_date = $2::date
         AND receipt_time = $3::time
         AND grand_total = $4::numeric
       LIMIT 1`,
      [vendorPattern, ocr.receipt_date, ocr.receipt_time, ocr.grand_total],
    );
    if (match) return auto(match, 95);
  }

  if (addressPattern && ocr.receipt_date && ocr.grand_total) {
    const match = await firstReceipt(
      client,
      `SELECT * FROM receipts
       WHERE vendor_address ILIKE $1
         AND receipt_date = $2::date
         AND grand_total = $3::numeric
       LIMIT 1`,
      [addressPattern, ocr.receipt_date, ocr.grand_total],
    );
    if (match) return auto(match, 90);
  }

  if (vendorPattern && ocr.receipt_date && ocr.grand_total) {
    const candidates = await receiptCandidates(
      client,
      `SELECT * FROM receipts
       WHERE vendor ILIKE $1
         AND receipt_date = $2::date
         AND grand_total = $3::numeric
       ORDER BY created_at DESC`,
      [vendorPattern, ocr.receipt_date, ocr.grand_total],
    );
    if (candidates.length === 1) return auto(candidates[0], 85);
    if (candidates.length > 1) return pick(candidates, 80);
  }

  if (vendorPattern && ocr.receipt_date) {
    const candidates = await receiptCandidates(
      client,
      `SELECT * FROM receipts
       WHERE vendor ILIKE $1
         AND receipt_date = $2::date
       ORDER BY created_at DESC`,
      [vendorPattern, ocr.receipt_date],
    );
    if (candidates.length > 0) return pick(candidates, 60);
  }

  return create();
}
