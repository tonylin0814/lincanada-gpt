import { google } from "googleapis";
import { NextResponse } from "next/server";
import {
  PDFDocument,
  PDFImage,
  PDFPage,
  PDFFont,
  StandardFonts,
  rgb,
} from "pdf-lib";
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

const pageWidth = 792;
const pageHeight = 612;
const pageMargin = 36;
const lineColor = rgb(0, 0, 0);

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

function fitText(text: string, font: PDFFont, size: number, width: number) {
  let value = text;
  while (value.length > 3 && font.widthOfTextAtSize(value, size) > width) {
    value = `${value.slice(0, -4)}...`;
  }
  return value;
}

function drawRightText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  size: number,
) {
  const fitted = fitText(text, font, size, width);
  const textWidth = font.widthOfTextAtSize(fitted, size);
  page.drawText(fitted, {
    x: x + width - textWidth,
    y,
    font,
    size,
    color: rgb(0, 0, 0),
  });
}

function drawCell(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fonts: { regular: PDFFont; bold: PDFFont },
  bold = false,
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: lineColor,
    borderWidth: 0.7,
  });
  drawRightText(
    page,
    text,
    x + 5,
    y + height - 14,
    width - 10,
    bold ? fonts.bold : fonts.regular,
    9,
  );
}

function drawDetailRowAt(
  page: PDFPage,
  y: number,
  label: string,
  value: string,
  fonts: { regular: PDFFont; bold: PDFFont },
  x = pageMargin,
  labelWidth = 150,
  valueWidth = 260,
) {
  drawCell(page, label, x, y, labelWidth, 21, fonts, true);
  drawCell(page, value, x + labelWidth, y, valueWidth, 21, fonts);
}

function drawDetails(
  page: PDFPage,
  receipt: Receipt,
  fonts: { regular: PDFFont; bold: PDFFont },
  x = pageMargin,
  startY = pageHeight - 126,
  labelWidth = 150,
  valueWidth = 260,
) {
  const taxes = getTaxes(receipt.taxes);
  let y = startY;
  const rows: Array<[string, string]> = [
    ["Vendor", receipt.vendor],
    ["Receipt Date", formatDate(receipt.receipt_date)],
    ["Receipt Time", receipt.receipt_time ?? ""],
    ["Category", receipt.category],
    ["Sub-Total", formatMoney(receipt.subtotal, receipt.currency)],
  ];

  rows.forEach(([label, value]) => {
    drawDetailRowAt(page, y, label, value, fonts, x, labelWidth, valueWidth);
    y -= 21;
  });

  drawCell(page, "Tax Name", x, y, labelWidth, 21, fonts, true);
  drawCell(page, "Tax Amount", x + labelWidth, y, valueWidth, 21, fonts, true);
  y -= 21;

  const taxRows = Math.max(taxes.length, 2);
  for (let index = 0; index < taxRows; index += 1) {
    drawCell(page, taxes[index]?.name ?? "", x, y, labelWidth, 21, fonts);
    drawCell(
      page,
      taxes[index]?.amount === null || taxes[index] === undefined
        ? ""
        : formatMoney(taxes[index].amount, receipt.currency),
      x + labelWidth,
      y,
      valueWidth,
      21,
      fonts,
    );
    y -= 21;
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
    drawDetailRowAt(page, y, label, value, fonts, x, labelWidth, valueWidth);
    y -= 21;
  });

  return y - 35;
}

function drawHeaderInfo(
  page: PDFPage,
  receipt: Receipt,
  fonts: { regular: PDFFont; bold: PDFFont },
) {
  const y = pageHeight - 92;
  drawCell(page, "Record Number", pageMargin, y, 130, 22, fonts, true);
  drawCell(page, receipt.record_r_number, pageMargin + 130, y, 180, 22, fonts);
  drawCell(page, "Vendor", pageMargin + 340, y, 90, 22, fonts, true);
  drawCell(page, receipt.vendor, pageMargin + 430, y, 290, 22, fonts);
}

function drawReceiptPreview(
  page: PDFPage,
  image: PDFImage | null,
  fonts: { regular: PDFFont; bold: PDFFont },
) {
  const x = pageMargin;
  const y = 76;
  const width = 320;
  const height = 380;

  page.drawText("Receipt Preview", {
    x,
    y: y + height + 12,
    font: fonts.bold,
    size: 12,
  });
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: lineColor,
    borderWidth: 0.7,
  });

  if (!image) {
    page.drawText("Receipt image could not be embedded.", {
      x: x + 16,
      y: y + height / 2,
      font: fonts.regular,
      size: 10,
    });
    return;
  }

  const scale = Math.min((width - 16) / image.width, (height - 16) / image.height);
  const imageWidth = image.width * scale;
  const imageHeight = image.height * scale;

  page.drawImage(image, {
    x: x + (width - imageWidth) / 2,
    y: y + (height - imageHeight) / 2,
    width: imageWidth,
    height: imageHeight,
  });
}

function drawItemsTable(
  pdfDoc: PDFDocument,
  firstPage: PDFPage,
  startY: number,
  items: ReceiptItem[],
  currency: string,
  fonts: { regular: PDFFont; bold: PDFFont },
) {
  let page = firstPage;
  let y = startY;
  const columns = [
    { label: "Item", width: 150 },
    { label: "Adjusted Item", width: 150 },
    { label: "Category", width: 120 },
    { label: "Qty", width: 60 },
    { label: "Price", width: 75 },
    { label: "Total", width: 75 },
  ];

  function drawHeader() {
    page.drawText("Items", {
      x: pageMargin,
      y,
      font: fonts.bold,
      size: 15,
    });
    y -= 28;

    let x = pageMargin;
    columns.forEach((column) => {
      drawCell(page, column.label, x, y, column.width, 24, fonts, true);
      x += column.width;
    });
    y -= 24;
  }

  drawHeader();

  items.forEach((item) => {
    if (y < pageMargin + 32) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - pageMargin;
      drawHeader();
    }

    let x = pageMargin;
    const values = [
      item.item_name,
      item.adjusted_item_name ?? item.item_name,
      item.item_category,
      String(toNumber(item.item_qty) ?? ""),
      formatMoney(item.item_price, currency),
      formatMoney(item.item_total_price, currency),
    ];

    values.forEach((value, index) => {
      drawCell(page, value, x, y, columns[index].width, 28, fonts);
      x += columns[index].width;
    });
    y -= 28;
  });
}

async function embedReceiptImage(pdfDoc: PDFDocument, image: Buffer | null) {
  if (!image) return null;

  try {
    return await pdfDoc.embedPng(new Uint8Array(image));
  } catch {
    try {
      return await pdfDoc.embedJpg(new Uint8Array(image));
    } catch {
      return null;
    }
  }
}

function drawImagePage(
  pdfDoc: PDFDocument,
  image: PDFImage | null,
  fonts: { regular: PDFFont; bold: PDFFont },
) {
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  page.drawText("Receipt Image", {
    x: pageMargin,
    y: pageHeight - 56,
    font: fonts.bold,
    size: 16,
  });

  if (!image) {
    page.drawText("Receipt image could not be embedded.", {
      x: pageMargin,
      y: pageHeight - 86,
      font: fonts.regular,
      size: 11,
    });
    return;
  }

  const maxWidth = pageWidth - pageMargin * 2;
  const maxHeight = pageHeight - 112;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  page.drawImage(image, {
    x: pageMargin + (maxWidth - width) / 2,
    y: pageMargin,
    width,
    height,
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
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  const embeddedImage = await embedReceiptImage(pdfDoc, image);
  const ownerName =
    entity?.type === "company" ? entity.name : userName || entity?.name || "Personal";

  page.drawText(`${ownerName} Receipt`, {
    x: pageMargin,
    y: pageHeight - 56,
    font: fonts.bold,
    size: 18,
  });

  drawHeaderInfo(page, receipt, fonts);
  drawReceiptPreview(page, embeddedImage, fonts);
  drawDetails(page, receipt, fonts, 390, pageHeight - 126, 140, 225);

  const itemPage = pdfDoc.addPage([pageWidth, pageHeight]);
  drawItemsTable(pdfDoc, itemPage, pageHeight - 56, items, receipt.currency, fonts);
  drawImagePage(pdfDoc, embeddedImage, fonts);

  return Buffer.from(await pdfDoc.save());
}

export async function GET(request: Request, { params }: RouteContext) {
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

    const isDownload = new URL(request.url).pathname.endsWith("/download");

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${record}.pdf"`,
        "Content-Type": "application/pdf",
      },
    });
  } finally {
    await client.end();
  }
}
