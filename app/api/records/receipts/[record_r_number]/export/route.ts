import ExcelJS from "exceljs";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb, getWebAppDb } from "@/lib/db";
import { getDriveFileId, getGoogleOAuthClient } from "@/lib/drive";
import { getReceiptById, getReceiptItems } from "@/lib/queries";
import type { Entity, JsonValue, Receipt } from "@/types/licanada_gpt";

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

const currencyFormat = '"$"#,##0.00';
const dateFormat = "yyyy-mm-dd";

function safeSheetName(value: string) {
  return (value || "Receipt")
    .replace(/[:\\/?*[\]]/g, "-")
    .slice(0, 31);
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value: Date | string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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

function setThinBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
}

function styleRange(
  worksheet: ExcelJS.Worksheet,
  fromRow: number,
  toRow: number,
  fromCol: number,
  toCol: number,
) {
  for (let rowNumber = fromRow; rowNumber <= toRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    for (let columnNumber = fromCol; columnNumber <= toCol; columnNumber += 1) {
      const cell = row.getCell(columnNumber);
      setThinBorder(cell);
      cell.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
    }
  }
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

  const googleUser = await getGoogleUser(userId);
  if (!googleUser) return null;

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
  const type = String(file.headers["content-type"] ?? "");
  const extension = type.includes("png") ? "png" : "jpeg";

  if (!type.includes("png") && !type.includes("jpeg") && !type.includes("jpg")) {
    return null;
  }

  return {
    buffer: Buffer.from(file.data as ArrayBuffer),
    extension: extension as "jpeg" | "png",
  };
}

function addDetailRow(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  label: string,
  value: string | number | Date | null,
  numFmt?: string,
) {
  const row = worksheet.getRow(rowNumber);
  row.getCell(1).value = label;
  row.getCell(2).value = value ?? "";
  row.getCell(1).font = { bold: true };
  row.getCell(2).numFmt = numFmt ?? row.getCell(2).numFmt;
  styleRange(worksheet, rowNumber, rowNumber, 1, 2);
}

function buildReceiptWorkbook({
  receipt,
  entity,
  userName,
  image,
  items,
}: {
  receipt: Receipt;
  entity: Entity | null;
  userName: string;
  image: Awaited<ReturnType<typeof getDriveImageBuffer>>;
  items: Awaited<ReturnType<typeof getReceiptItems>>;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Lin System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(safeSheetName(receipt.record_r_number), {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    },
    views: [{ showGridLines: false }],
  });

  worksheet.columns = [
    { width: 22 },
    { width: 32 },
    { width: 18 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
  ];

  const ownerName =
    entity?.type === "company" ? entity.name : userName || entity?.name || "Personal";
  worksheet.mergeCells("A1:F1");
  const title = worksheet.getCell("A1");
  title.value = `${ownerName} Receipt`;
  title.font = { bold: true, size: 18 };
  title.alignment = { horizontal: "right", vertical: "middle" };
  worksheet.getRow(1).height = 30;

  addDetailRow(worksheet, 3, "Record Number", receipt.record_r_number);
  addDetailRow(worksheet, 4, "Vendor", receipt.vendor);
  addDetailRow(worksheet, 5, "Receipt Date", toDate(receipt.receipt_date), dateFormat);
  addDetailRow(worksheet, 6, "Receipt Time", receipt.receipt_time);
  addDetailRow(worksheet, 7, "Category", receipt.category);
  addDetailRow(worksheet, 8, "Sub-Total", toNumber(receipt.subtotal), currencyFormat);

  const taxes = getTaxes(receipt.taxes);
  worksheet.getRow(9).getCell(1).value = "Tax Name";
  worksheet.getRow(9).getCell(2).value = "Tax Amount";
  worksheet.getRow(9).getCell(1).font = { bold: true };
  worksheet.getRow(9).getCell(2).font = { bold: true };
  styleRange(worksheet, 9, 9, 1, 2);

  const taxStart = 10;
  const taxRows = Math.max(taxes.length, 2);
  for (let index = 0; index < taxRows; index += 1) {
    const rowNumber = taxStart + index;
    const row = worksheet.getRow(rowNumber);
    row.getCell(1).value = taxes[index]?.name ?? "";
    row.getCell(2).value = taxes[index]?.amount ?? "";
    row.getCell(2).numFmt = currencyFormat;
    styleRange(worksheet, rowNumber, rowNumber, 1, 2);
  }

  const detailStart = taxStart + taxRows;
  addDetailRow(worksheet, detailStart, "Tips", toNumber(receipt.tips), currencyFormat);
  addDetailRow(worksheet, detailStart + 1, "Total", toNumber(receipt.grand_total), currencyFormat);
  addDetailRow(worksheet, detailStart + 2, "Currency", receipt.currency);
  addDetailRow(worksheet, detailStart + 3, "Payment Method", receipt.payment_method);
  addDetailRow(worksheet, detailStart + 4, "Card Last 4 Digits", receipt.card_last_four);
  addDetailRow(worksheet, detailStart + 5, "Receipt Number", receipt.receipt_number);
  addDetailRow(worksheet, detailStart + 6, "Invoice Number", receipt.invoice_number);
  addDetailRow(worksheet, detailStart + 7, "Transaction Number", receipt.transaction_number);
  addDetailRow(worksheet, detailStart + 8, "Record Date", toDate(receipt.created_at), "yyyy-mm-dd hh:mm:ss");

  const itemsTitleRow = detailStart + 10;
  worksheet.mergeCells(itemsTitleRow, 1, itemsTitleRow, 6);
  const itemsTitle = worksheet.getCell(itemsTitleRow, 1);
  itemsTitle.value = "Items";
  itemsTitle.font = { bold: true, size: 14 };
  itemsTitle.alignment = { horizontal: "right" };

  const itemHeaderRow = itemsTitleRow + 2;
  const headers = ["Item", "Adjusted Item", "Category", "Qty", "Price", "Total"];
  headers.forEach((header, index) => {
    const cell = worksheet.getRow(itemHeaderRow).getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true };
  });
  styleRange(worksheet, itemHeaderRow, itemHeaderRow, 1, 6);

  items.forEach((item, index) => {
    const rowNumber = itemHeaderRow + 1 + index;
    const row = worksheet.getRow(rowNumber);
    row.values = [
      undefined,
      item.item_name,
      item.adjusted_item_name ?? item.item_name,
      item.item_category,
      toNumber(item.item_qty),
      toNumber(item.item_price),
      toNumber(item.item_total_price),
    ];
    row.getCell(4).numFmt = "#,##0.##";
    row.getCell(5).numFmt = currencyFormat;
    row.getCell(6).numFmt = currencyFormat;
    styleRange(worksheet, rowNumber, rowNumber, 1, 6);
  });

  const imageTitleRow = itemHeaderRow + Math.max(items.length, 1) + 3;
  worksheet.getRow(imageTitleRow - 1).addPageBreak();
  worksheet.mergeCells(imageTitleRow, 1, imageTitleRow, 6);
  const imageTitle = worksheet.getCell(imageTitleRow, 1);
  imageTitle.value = "Receipt Image";
  imageTitle.font = { bold: true, size: 14 };
  imageTitle.alignment = { horizontal: "right" };

  if (image) {
    const imageId = workbook.addImage({
      base64: image.buffer.toString("base64"),
      extension: image.extension,
    });
    worksheet.addImage(imageId, {
      tl: { col: 0, row: imageTitleRow + 1 },
      ext: { width: 560, height: 760 },
    });
    for (let rowNumber = imageTitleRow + 2; rowNumber <= imageTitleRow + 39; rowNumber += 1) {
      worksheet.getRow(rowNumber).height = 18;
    }
  } else {
    addDetailRow(worksheet, imageTitleRow + 2, "Receipt Image Link", receipt.attachment_link);
  }

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = {
        horizontal: "right",
        vertical: "middle",
        wrapText: true,
      };
    });
  });

  worksheet.pageSetup.printArea = `A1:F${imageTitleRow + 42}`;

  return workbook;
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

    const workbook = buildReceiptWorkbook({
      receipt,
      entity,
      userName: session.user.name ?? session.user.email ?? "Personal",
      image,
      items,
    });
    const data = await workbook.xlsx.writeBuffer();
    const filename = `${record}.xlsx`;

    return new NextResponse(Buffer.from(data), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } finally {
    await client.end();
  }
}
