import PDFDocument from "pdfkit";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb, getWebAppDb } from "@/lib/db";
import { getDriveFileId, getGoogleOAuthClient } from "@/lib/drive";
import { getReceiptById, getReceiptItems } from "@/lib/queries";
import type { Entity, JsonValue, Receipt, ReceiptItem } from "@/types/licanada_gpt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { record_r_number: string } };

type WebAppGoogleUser = {
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: Date | null;
};

type TaxRow = {
  name: string;
  amount: number | null;
};

const pageMargin = 36;
const tableStroke = "#111111";

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: string | number | null | undefined, currency = "CAD") {
  const amount = toNumber(value);
  if (amount === null) return "";

  return new Intl.NumberFormat("en-CA", {
    currency,
    style: "currency",
  }).format(amount);
}

function formatDate(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function getTaxes(taxes: JsonValue[] | unknown): TaxRow[] {
  if (!Array.isArray(taxes)) return [];

  return taxes
    .map((tax) => {
      if (!tax || typeof tax !== "object") {
        return { name: "", amount: null };
      }

      const row = tax as Record<string, unknown>;
      return {
        name: String(row.name ?? row.type ?? ""),
        amount: toNumber(String(row.amount ?? "")),
      };
    })
    .filter((tax) => tax.name || tax.amount !== null);
}

async function getGoogleUser(userId: number) {
  const db = getWebAppDb();
  const result = await db.query<WebAppGoogleUser>(
    `SELECT google_access_token, google_refresh_token, google_token_expiry
     FROM users
     WHERE id = $1`,
    [userId],
  );

  return result.rows[0] ?? null;
}

async function getEntity(client: Awaited<ReturnType<typeof getUserDb>>, id: number) {
  const result = await client.query<Entity>(
    "SELECT * FROM entities WHERE id = $1",
    [id],
  );

  return result.rows[0] ?? null;
}

async function getDriveImageBuffer(userId: number, fileUrl: string | null) {
  const fileId = getDriveFileId(fileUrl);
  if (!fileId) return null;

  const fromResponse = async (type: string, data: ArrayBuffer) => {
    const lowerType = type.toLowerCase();
    if (
      !lowerType.includes("png") &&
      !lowerType.includes("jpeg") &&
      !lowerType.includes("jpg")
    ) {
      return null;
    }

    return Buffer.from(data);
  };

  const googleUser = await getGoogleUser(userId);
  if (googleUser) {
    try {
      const auth = getGoogleOAuthClient();
      auth.setCredentials({
        access_token: googleUser.google_access_token ?? undefined,
        refresh_token: googleUser.google_refresh_token ?? undefined,
        expiry_date: googleUser.google_token_expiry
          ? googleUser.google_token_expiry.getTime()
          : undefined,
      });

      const drive = google.drive({ version: "v3", auth });
      const file = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" },
      );
      const mediaImage = await fromResponse(
        String(file.headers["content-type"] ?? ""),
        file.data as ArrayBuffer,
      );

      if (mediaImage) return mediaImage;
    } catch (error) {
      console.error("Could not fetch Drive image for PDF:", error);
    }
  }

  const urls = [
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
  ];

  for (const url of urls) {
    const response = await fetch(url);
    if (!response.ok) continue;

    const publicImage = await fromResponse(
      response.headers.get("content-type") ?? "",
      await response.arrayBuffer(),
    );

    if (publicImage) return publicImage;
  }

  return null;
}

function collectPdfBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function drawCell(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  bold = false,
) {
  doc.rect(x, y, width, height).stroke(tableStroke);
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(9)
    .text(text, x + 5, y + 5, {
      align: "right",
      height: height - 8,
      width: width - 10,
    });
}

function drawDetailRow(
  doc: PDFKit.PDFDocument,
  y: number,
  label: string,
  value: string,
) {
  drawCell(doc, label, pageMargin, y, 150, 21, true);
  drawCell(doc, value, pageMargin + 150, y, 260, 21);
}

function drawDetails(doc: PDFKit.PDFDocument, receipt: Receipt) {
  const taxes = getTaxes(receipt.taxes);
  let y = 82;
  const rows: Array<[string, string]> = [
    ["Vendor", receipt.vendor],
    ["Receipt Date", formatDate(receipt.receipt_date)],
    ["Receipt Time", receipt.receipt_time ?? ""],
    ["Category", receipt.category],
    ["Sub-Total", formatMoney(receipt.subtotal, receipt.currency)],
  ];

  rows.forEach(([label, value]) => {
    drawDetailRow(doc, y, label, value);
    y += 21;
  });

  drawCell(doc, "Tax Name", pageMargin, y, 150, 21, true);
  drawCell(doc, "Tax Amount", pageMargin + 150, y, 260, 21, true);
  y += 21;

  const taxRows = Math.max(taxes.length, 2);
  for (let index = 0; index < taxRows; index += 1) {
    drawCell(doc, taxes[index]?.name ?? "", pageMargin, y, 150, 21);
    drawCell(
      doc,
      taxes[index]?.amount === null || taxes[index] === undefined
        ? ""
        : formatMoney(taxes[index].amount, receipt.currency),
      pageMargin + 150,
      y,
      260,
      21,
    );
    y += 21;
  }

  const bottomRows: Array<[string, string]> = [
    ["Tips", formatMoney(receipt.tips, receipt.currency)],
    ["Total", formatMoney(receipt.grand_total, receipt.currency)],
    ["Currency", receipt.currency],
    ["Payment Method", receipt.payment_method ?? ""],
    ["Card Last 4 Digits", receipt.card_last_four ?? ""],
    ["Receipt Number", receipt.receipt_number ?? ""],
    ["Invoice Number", receipt.invoice_number ?? ""],
    ["Transaction Number", receipt.transaction_number ?? ""],
    ["Record Date", formatDateTime(receipt.created_at)],
  ];

  bottomRows.forEach(([label, value]) => {
    drawDetailRow(doc, y, label, value);
    y += 21;
  });

  return y + 32;
}

function drawItemsTable(
  doc: PDFKit.PDFDocument,
  startY: number,
  items: ReceiptItem[],
  currency: string,
) {
  let y = startY;
  const columns = [
    { label: "Item", width: 150 },
    { label: "Adjusted Item", width: 150 },
    { label: "Category", width: 120 },
    { label: "Qty", width: 60 },
    { label: "Price", width: 75 },
    { label: "Total", width: 75 },
  ];

  doc.font("Helvetica-Bold").fontSize(15).text("Items", pageMargin, y, {
    align: "left",
    width: 720,
  });
  y += 28;

  let x = pageMargin;
  columns.forEach((column) => {
    drawCell(doc, column.label, x, y, column.width, 24, true);
    x += column.width;
  });
  y += 24;

  items.forEach((item) => {
    if (y > doc.page.height - pageMargin - 28) {
      doc.addPage();
      y = pageMargin;
    }

    x = pageMargin;
    const values = [
      item.item_name,
      item.adjusted_item_name ?? item.item_name,
      item.item_category,
      String(toNumber(item.item_qty) ?? ""),
      formatMoney(item.item_price, currency),
      formatMoney(item.item_total_price, currency),
    ];

    values.forEach((value, index) => {
      drawCell(doc, value, x, y, columns[index].width, 28);
      x += columns[index].width;
    });
    y += 28;
  });
}

async function buildReceiptPdf({
  receipt,
  entity,
  userName,
  image,
  items,
}: {
  receipt: Receipt;
  entity: Entity | null;
  userName: string;
  image: Buffer | null;
  items: ReceiptItem[];
}) {
  const doc = new PDFDocument({
    layout: "landscape",
    margin: pageMargin,
    size: "LETTER",
  });
  const pdfBuffer = collectPdfBuffer(doc);
  const ownerName =
    entity?.type === "company" ? entity.name : userName || entity?.name || "Personal";

  doc.font("Helvetica-Bold").fontSize(18).text(`${ownerName} Receipt`, {
    align: "left",
  });

  const itemStartY = drawDetails(doc, receipt);
  drawItemsTable(doc, itemStartY, items, receipt.currency);

  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(16).text("Receipt Image", {
    align: "left",
  });

  if (image) {
    doc.image(image, pageMargin, 76, {
      align: "center",
      fit: [doc.page.width - pageMargin * 2, doc.page.height - 112],
    });
  } else {
    doc
      .font("Helvetica")
      .fontSize(11)
      .text("Receipt image could not be embedded.", pageMargin, 80);
  }

  doc.end();
  return pdfBuffer;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const record = decodeURIComponent(params.record_r_number);
    const receipt = await getReceiptById(client, record);

    if (!receipt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [items, entity, image] = await Promise.all([
      getReceiptItems(client, record),
      getEntity(client, receipt.entity_id),
      getDriveImageBuffer(session.user.id, receipt.attachment_link).catch(() => null),
    ]);

    let pdf: Buffer;
    try {
      pdf = await buildReceiptPdf({
        receipt,
        entity,
        userName: session.user.name ?? session.user.email ?? "Personal",
        image,
        items,
      });
    } catch (error) {
      console.error("Could not build receipt PDF:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not build receipt PDF.",
        },
        { status: 500 },
      );
    }

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Disposition": `attachment; filename="${record}.pdf"`,
        "Content-Type": "application/pdf",
      },
    });
  } finally {
    await client.end();
  }
}
