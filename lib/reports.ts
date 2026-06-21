import type { Client } from "pg";
import type { Entity, Invoice, JsonValue, Receipt } from "@/types/licanada_gpt";

export type ReportFilters = {
  entity_id?: number;
  year: number;
  month?: number;
};

export type SummaryRow = {
  label: string;
  count: number;
  total: number;
};

export type ReportSummary = {
  expense_summary: SummaryRow[];
  revenue_summary: SummaryRow[];
  totals: {
    expenses: number;
    revenue: number;
    net: number;
  };
};

function getDateRange(filters: ReportFilters) {
  const startMonth = filters.month ?? 1;
  const endMonth = filters.month ?? 12;
  const dateFrom = `${filters.year}-${String(startMonth).padStart(2, "0")}-01`;
  const dateTo =
    endMonth === 12
      ? `${filters.year + 1}-01-01`
      : `${filters.year}-${String(endMonth + 1).padStart(2, "0")}-01`;

  return { dateFrom, dateTo };
}

function buildPeriodWhere(
  filters: ReportFilters,
  dateColumn: "receipt_date" | "invoice_date",
) {
  const { dateFrom, dateTo } = getDateRange(filters);
  const where = [`${dateColumn} >= $1`, `${dateColumn} < $2`];
  const values: Array<string | number> = [dateFrom, dateTo];

  if (filters.entity_id) {
    values.push(filters.entity_id);
    where.push(`entity_id = $${values.length}`);
  }

  return {
    whereClause: `WHERE ${where.join(" AND ")}`,
    values,
  };
}

export async function getReportSummary(
  client: Client,
  filters: ReportFilters,
): Promise<ReportSummary> {
  const receiptWhere = buildPeriodWhere(filters, "receipt_date");
  const invoiceWhere = buildPeriodWhere(filters, "invoice_date");

  const [expenses, revenue] = await Promise.all([
    client.query<{ label: string; count: string; total: string | null }>(
      `SELECT category AS label, COUNT(*) AS count, COALESCE(SUM(grand_total), 0) AS total
       FROM receipts
       ${receiptWhere.whereClause}
       GROUP BY category
       ORDER BY category ASC`,
      receiptWhere.values,
    ),
    client.query<{ label: string; count: string; total: string | null }>(
      `SELECT buyer_name AS label, COUNT(*) AS count, COALESCE(SUM(grand_total), 0) AS total
       FROM invoices
       ${invoiceWhere.whereClause}
       GROUP BY buyer_name
       ORDER BY buyer_name ASC`,
      invoiceWhere.values,
    ),
  ]);

  const expenseSummary = expenses.rows.map((row) => ({
    label: row.label,
    count: Number(row.count),
    total: Number(row.total ?? 0),
  }));
  const revenueSummary = revenue.rows.map((row) => ({
    label: row.label,
    count: Number(row.count),
    total: Number(row.total ?? 0),
  }));
  const expenseTotal = expenseSummary.reduce((sum, row) => sum + row.total, 0);
  const revenueTotal = revenueSummary.reduce((sum, row) => sum + row.total, 0);

  return {
    expense_summary: expenseSummary,
    revenue_summary: revenueSummary,
    totals: {
      expenses: expenseTotal,
      revenue: revenueTotal,
      net: revenueTotal - expenseTotal,
    },
  };
}

export async function getReportEntities(client: Client) {
  const result = await client.query<Entity>(
    "SELECT * FROM entities ORDER BY name ASC",
  );
  return result.rows;
}

export async function getReceiptExportRows(
  client: Client,
  filters: ReportFilters,
) {
  const { whereClause, values } = buildPeriodWhere(filters, "receipt_date");
  const result = await client.query<Receipt>(
    `SELECT * FROM receipts ${whereClause} ORDER BY receipt_date ASC, record_r_number ASC`,
    values,
  );
  return result.rows;
}

export async function getInvoiceExportRows(
  client: Client,
  filters: ReportFilters,
) {
  const { whereClause, values } = buildPeriodWhere(filters, "invoice_date");
  const result = await client.query<Invoice>(
    `SELECT * FROM invoices ${whereClause} ORDER BY invoice_date ASC, record_i_number ASC`,
    values,
  );
  return result.rows;
}

function getTaxAmount(taxes: JsonValue[] | JsonValue | null, name: string) {
  if (!Array.isArray(taxes)) return "";
  const found = taxes.find((tax) => {
    return (
      tax &&
      typeof tax === "object" &&
      !Array.isArray(tax) &&
      String(tax.name).toLowerCase() === name.toLowerCase()
    );
  });

  if (!found || typeof found !== "object" || Array.isArray(found)) return "";
  const amount = found.amount;
  return typeof amount === "number" || typeof amount === "string"
    ? String(amount)
    : "";
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function dateOnly(value: Date | string) {
  return String(value).slice(0, 10);
}

function reportDate(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return dateOnly(value);

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function receiptsToCsv(receipts: Receipt[]) {
  const categories = Array.from(
    new Set(
      receipts
        .map((receipt) => receipt.category?.trim())
        .filter((category): category is string => Boolean(category)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const rows = [
    [
      "Record #",
      "Date",
      "Vendor",
      ...categories,
      "Subtotal",
      "GST",
      "PST",
      "Tips",
      "Grand Total",
      "Payment Method",
    ],
    ...receipts.map((receipt) => [
      receipt.record_r_number,
      reportDate(receipt.receipt_date),
      receipt.vendor,
      ...categories.map((category) =>
        receipt.category === category ? receipt.grand_total ?? "" : "",
      ),
      receipt.subtotal ?? "",
      getTaxAmount(receipt.taxes, "GST"),
      getTaxAmount(receipt.taxes, "PST"),
      receipt.tips ?? "",
      receipt.grand_total ?? "",
      receipt.payment_method ?? "",
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function invoicesToCsv(invoices: Invoice[]) {
  const rows = [
    [
      "Record #",
      "Date",
      "Invoice #",
      "Buyer",
      "Category",
      "Subtotal",
      "GST",
      "Grand Total",
      "Payment Method",
      "Reviewed",
    ],
    ...invoices.map((invoice) => [
      invoice.record_i_number,
      dateOnly(invoice.invoice_date),
      invoice.invoice_number ?? "",
      invoice.buyer_name,
      invoice.category ?? "",
      invoice.subtotal ?? "",
      getTaxAmount(invoice.taxes, "GST"),
      invoice.grand_total ?? "",
      invoice.payment_method ?? "",
      invoice.is_reviewed ? "Yes" : "No",
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}
