import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb, getWebAppDb } from "@/lib/db";
import {
  getDriveFileId,
  getGoogleOAuthClient,
  getGoogleTokenExpiryDate,
} from "@/lib/drive";
import { getReceiptById, getReceiptItems } from "@/lib/queries";
import type { Entity, JsonValue, Receipt, ReceiptItem } from "@/types/licanada_gpt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: { record_r_number: string } };

type WebAppGoogleUser = {
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: Date | null;
};

type TaxRow = {
  name: string;
  amount: string;
};

const chromiumPackUrls = {
  arm64:
    "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.arm64.tar",
  x64:
    "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar",
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: string | number | null | undefined) {
  const amount = toNumber(value);
  if (amount === null) return "";
  return `$${amount.toFixed(2)}`;
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
        return { name: "", amount: "" };
      }

      const row = tax as Record<string, unknown>;
      return {
        name: String(row.name ?? row.type ?? ""),
        amount: formatMoney(String(row.amount ?? "")),
      };
    })
    .filter((tax) => tax.name || tax.amount);
}

async function getExecutablePath(chromium: typeof import("@sparticuz/chromium").default) {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  if (process.env.VERCEL || process.env.AWS_REGION) {
    const chromiumPackUrl =
      process.env.CHROMIUM_PACK_URL ??
      (process.arch === "arm64" ? chromiumPackUrls.arm64 : chromiumPackUrls.x64);

    return chromium.executablePath(chromiumPackUrl);
  }

  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];

  const { existsSync } = await import("fs");
  return candidates.find((candidate) => existsSync(candidate));
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

async function getDriveImageDataUrl(userId: number, fileUrl: string | null) {
  const fileId = getDriveFileId(fileUrl);
  if (!fileId) return null;

  const toDataUrl = async (contentType: string, data: ArrayBuffer) => {
    const lowerType = contentType.toLowerCase();
    const mimeType = lowerType.includes("png")
      ? "image/png"
      : lowerType.includes("jpeg") || lowerType.includes("jpg")
        ? "image/jpeg"
        : "";

    if (!mimeType) return null;

    return `data:${mimeType};base64,${Buffer.from(data).toString("base64")}`;
  };

  const googleUser = await getGoogleUser(userId);
  if (googleUser) {
    try {
      const auth = getGoogleOAuthClient();
      auth.setCredentials({
        access_token: googleUser.google_access_token ?? undefined,
        refresh_token: googleUser.google_refresh_token ?? undefined,
        expiry_date: getGoogleTokenExpiryDate(googleUser.google_token_expiry),
      });

      const drive = google.drive({ version: "v3", auth });
      const file = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" },
      );
      const apiImage = await toDataUrl(
        String(file.headers["content-type"] ?? ""),
        file.data as ArrayBuffer,
      );

      if (apiImage) return apiImage;
    } catch (error) {
      console.error("Could not fetch Drive image through API:", error);
    }
  }

  const publicUrls = [
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
  ];

  for (const url of publicUrls) {
    const response = await fetch(url);
    if (!response.ok) continue;

    const publicImage = await toDataUrl(
      response.headers.get("content-type") ?? "",
      await response.arrayBuffer(),
    );

    if (publicImage) return publicImage;
  }

  return null;
}

function detailRow(label: string, value: unknown) {
  const displayValue = value === null || value === undefined ? "" : value;
  return `
    <div class="detail-label">${escapeHtml(label)}</div>
    <div class="detail-value">${escapeHtml(displayValue)}</div>
  `;
}

function taxRows(taxes: TaxRow[]) {
  const rows = taxes.length > 0 ? taxes : [{ name: "", amount: "" }];

  return rows
    .map(
      (tax) => `
        <div class="detail-label">${escapeHtml(tax.name || "Tax")}</div>
        <div class="detail-value">${escapeHtml(tax.amount)}</div>
      `,
    )
    .join("");
}

function itemRows(items: ReceiptItem[]) {
  if (items.length === 0) {
    return `<tr><td colspan="6" class="empty-row">No item rows.</td></tr>`;
  }

  return items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.item_name)}</td>
          <td>${escapeHtml(item.adjusted_item_name ?? item.item_name)}</td>
          <td>${escapeHtml(item.item_category)}</td>
          <td>${escapeHtml(item.item_qty ?? "")}</td>
          <td>${escapeHtml(formatMoney(item.item_price))}</td>
          <td>${escapeHtml(formatMoney(item.item_total_price))}</td>
        </tr>
      `,
    )
    .join("");
}

function buildPrintHtml({
  entity,
  imageDataUrl,
  items,
  receipt,
  userName,
}: {
  entity: Entity | null;
  imageDataUrl: string | null;
  items: ReceiptItem[];
  receipt: Receipt;
  userName: string;
}) {
  const ownerName =
    entity?.type === "company" ? entity.name : userName || entity?.name || "Personal";
  const taxes = getTaxes(receipt.taxes);

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(receipt.record_r_number)}</title>
        <style>
          @page {
            margin: 0.35in;
            size: letter portrait;
          }

          * {
            box-sizing: border-box;
          }

          body {
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            margin: 0;
          }

          h1 {
            font-size: 18px;
            margin: 0 0 18px;
            text-align: left;
          }

          .summary {
            display: grid;
            gap: 8px;
            grid-template-columns: 150px 1fr;
          }

          .layout {
            display: block;
          }

          .preview {
            align-items: center;
            border: 2px solid #0e7490;
            display: flex;
            justify-content: center;
            margin-bottom: 18px;
            min-height: 340px;
            padding: 10px;
          }

          .preview img {
            max-height: 500px;
            max-width: 100%;
            object-fit: contain;
          }

          .preview-empty {
            color: #0e7490;
            font-size: 20px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .details {
            display: grid;
            gap: 8px 20px;
            grid-template-columns: 170px 1fr;
          }

          .detail-label {
            font-weight: 700;
          }

          .detail-value {
            color: #374151;
            min-height: 14px;
            white-space: pre-wrap;
          }

          .section-gap {
            grid-column: 1 / -1;
            height: 12px;
          }

          .items-section {
            break-inside: avoid;
            margin-top: 24px;
          }

          h2 {
            font-size: 16px;
            margin: 0 0 10px;
            text-align: right;
          }

          table {
            border-collapse: collapse;
            width: 100%;
          }

          th,
          td {
            border: 1px solid #111827;
            padding: 5px 6px;
            text-align: right;
            vertical-align: top;
          }

          th {
            font-weight: 700;
          }

          td:first-child,
          td:nth-child(2),
          td:nth-child(3) {
            text-align: left;
          }

          tr {
            break-inside: avoid;
          }

          .empty-row {
            color: #6b7280;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(ownerName)} Receipt</h1>

        <div class="summary">
          ${detailRow("Record Number", receipt.record_r_number)}
          ${detailRow("Vendor", receipt.vendor)}
        </div>

        <div class="layout">
          <section class="preview">
            ${
              imageDataUrl
                ? `<img alt="Receipt image" src="${imageDataUrl}" />`
                : `<span class="preview-empty">Receipt Preview Area</span>`
            }
          </section>

          <section>
            <div class="details">
              ${detailRow("Receipt Date", formatDate(receipt.receipt_date))}
              ${detailRow("Receipt Time", receipt.receipt_time)}
              ${detailRow("Category", receipt.category)}
              ${detailRow("Sub-Total", formatMoney(receipt.subtotal))}
              ${taxRows(taxes)}
              ${detailRow("Tips", formatMoney(receipt.tips))}
              ${detailRow("Total", formatMoney(receipt.grand_total))}
              ${detailRow("Currency", receipt.currency)}
              <div class="section-gap"></div>
              ${detailRow("Vendor Address", receipt.vendor_address)}
              ${detailRow("Receipt Number", receipt.receipt_number)}
              ${detailRow("Invoice Number", receipt.invoice_number)}
              <div class="section-gap"></div>
              ${detailRow("Transaction Number", receipt.transaction_number)}
              ${detailRow("Payment Method", receipt.payment_method)}
              ${detailRow("Card Last 4 Digits", receipt.card_last_four)}
              ${detailRow("Authorization Code", receipt.authorization_code)}
              <div class="section-gap"></div>
              ${detailRow("Record Date", formatDateTime(receipt.created_at))}
              ${detailRow("Review Notes", receipt.review_notes)}
            </div>

            <div class="items-section">
              <h2>Items</h2>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Adjusted Item</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>${itemRows(items)}</tbody>
              </table>
            </div>
          </section>
        </div>
      </body>
    </html>
  `;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await getUserDb(session.user.supabase_connection_string);
  let browser: Awaited<ReturnType<typeof import("puppeteer-core").default.launch>> | null =
    null;

  try {
    const record = decodeURIComponent(params.record_r_number);
    const receipt = await getReceiptById(client, record);

    if (!receipt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [chromiumModule, puppeteerModule, items, entity, imageDataUrl] =
      await Promise.all([
        import("@sparticuz/chromium"),
        import("puppeteer-core"),
        getReceiptItems(client, record),
        getEntity(client, receipt.entity_id),
        getDriveImageDataUrl(session.user.id, receipt.attachment_link).catch(
          () => null,
        ),
      ]);

    const chromium = chromiumModule.default;
    const puppeteer = puppeteerModule.default;
    const executablePath = await getExecutablePath(chromium);

    if (!executablePath) {
      return NextResponse.json(
        { error: "Chromium executable is not available for PDF rendering." },
        { status: 500 },
      );
    }

    browser = await puppeteer.launch({
      args: [...chromium.args, "--font-render-hinting=none"],
      defaultViewport: {
        height: 1100,
        width: 1440,
      },
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(
      buildPrintHtml({
        entity,
        imageDataUrl,
        items,
        receipt,
        userName: session.user.name ?? session.user.email ?? "Personal",
      }),
      { timeout: 15000, waitUntil: "domcontentloaded" },
    );
    await page.emulateMediaType("print");
    await page.waitForFunction(() => document.fonts.ready, { timeout: 5000 }).catch(
      () => undefined,
    );

    const pdf = await page.pdf({
      format: "letter",
      landscape: false,
      margin: {
        bottom: "0.35in",
        left: "0.35in",
        right: "0.35in",
        top: "0.35in",
      },
      printBackground: true,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${record}.pdf"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("Could not render receipt PDF with Chromium:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not render receipt PDF.",
      },
      { status: 500 },
    );
  } finally {
    await browser?.close().catch(() => undefined);
    await client.end().catch(() => undefined);
  }
}
