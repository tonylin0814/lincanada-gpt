import type { Client } from "pg";
import type {
  Entity,
  Invoice,
  InvoiceItem,
  JsonValue,
  Receipt,
  ReceiptItem,
} from "@/types/licanada_gpt";

type RecordFilters = {
  entity_id?: number;
  is_reviewed?: boolean;
  date_from?: string;
  date_to?: string;
  category?: string;
  search?: string;
  page?: number;
  per_page?: number;
};

type PagedResult<T> = {
  rows: T[];
  total: number;
  page: number;
  per_page: number;
};

type ReceiptRow = Receipt & {
  total_count: string;
};

type InvoiceRow = Invoice & {
  total_count: string;
};

export type ReviewQueueRecord = {
  type: "receipt" | "invoice";
  id: string;
  record_number: string;
  record_date: Date;
  name: string;
  total: string | null;
  currency: string;
};

export type ReceiptUpdateInput = {
  vendor: string;
  vendor_address: string | null;
  receipt_date: string;
  receipt_time: string | null;
  category: string;
  subtotal: string | null;
  taxes: JsonValue;
  tips: string | null;
  grand_total: string | null;
  currency: string;
  payment_method: string | null;
  receipt_number: string | null;
  transaction_number: string | null;
  authorization_code: string | null;
  invoice_number: string | null;
  card_last_four: string | null;
  review_notes: string | null;
    items: Array<{
      id: number;
      item_name: string;
      adjusted_item_name: string | null;
      item_category: string;
      item_qty: string | null;
      item_price: string | null;
    item_total_price: string | null;
  }>;
};

export type InvoiceUpdateInput = {
  buyer_name: string;
  invoice_date: string;
  category: string | null;
  subtotal: string | null;
  taxes: JsonValue;
  grand_total: string | null;
  payment_method: string | null;
  invoice_number: string | null;
  review_notes: string | null;
  items: Array<{
    id: number;
    item_name: string;
    item_category: string | null;
    item_qty: string | null;
    item_price: string | null;
    item_total_price: string | null;
  }>;
};

function addRecordFilters(
  filters: RecordFilters,
  dateColumn: "receipt_date" | "invoice_date",
  searchColumn?: "vendor" | "buyer_name",
) {
  const where: string[] = [];
  const values: Array<string | number | boolean> = [];

  if (filters.entity_id !== undefined) {
    values.push(filters.entity_id);
    where.push(`entity_id = $${values.length}`);
  }

  if (filters.is_reviewed !== undefined) {
    values.push(filters.is_reviewed);
    where.push(`is_reviewed = $${values.length}`);
  }

  if (filters.date_from !== undefined) {
    values.push(filters.date_from);
    where.push(`${dateColumn} >= $${values.length}`);
  }

  if (filters.date_to !== undefined) {
    values.push(filters.date_to);
    where.push(`${dateColumn} <= $${values.length}`);
  }

  if (filters.category !== undefined && filters.category !== "") {
    values.push(filters.category);
    where.push(`category = $${values.length}`);
  }

  if (
    filters.search !== undefined &&
    filters.search.trim() !== "" &&
    searchColumn
  ) {
    values.push(`%${filters.search.trim()}%`);
    where.push(`${searchColumn} ILIKE $${values.length}`);
  }

  return {
    whereClause: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    values,
  };
}

function getPagination(filters: RecordFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const per_page = Math.min(100, Math.max(1, filters.per_page ?? 20));
  const offset = (page - 1) * per_page;

  return { page, per_page, offset };
}

export async function getReceipts(client: Client, filters: RecordFilters = {}) {
  const { whereClause, values } = addRecordFilters(
    filters,
    "receipt_date",
    "vendor",
  );
  const result = await client.query<Receipt>(
    `SELECT * FROM receipts ${whereClause} ORDER BY receipt_date DESC, created_at DESC`,
    values,
  );

  return result.rows;
}

export async function getInvoices(client: Client, filters: RecordFilters = {}) {
  const { whereClause, values } = addRecordFilters(
    filters,
    "invoice_date",
    "buyer_name",
  );
  const result = await client.query<Invoice>(
    `SELECT * FROM invoices ${whereClause} ORDER BY invoice_date DESC, created_at DESC`,
    values,
  );

  return result.rows;
}

export async function getReceiptsPage(
  client: Client,
  filters: RecordFilters = {},
): Promise<PagedResult<Receipt>> {
  const { page, per_page, offset } = getPagination(filters);
  const { whereClause, values } = addRecordFilters(
    filters,
    "receipt_date",
    "vendor",
  );
  const result = await client.query<ReceiptRow>(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM receipts
     ${whereClause}
     ORDER BY receipt_date DESC, created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, per_page, offset],
  );

  return {
    rows: result.rows.map((row) => {
      const receipt: Receipt = {
        id: row.id,
        entity_id: row.entity_id,
        record_r_number: row.record_r_number,
        vendor: row.vendor,
        vendor_address: row.vendor_address,
        vendor_phone: row.vendor_phone,
        store_number: row.store_number,
        place_id: row.place_id,
        receipt_number: row.receipt_number,
        transaction_number: row.transaction_number,
        authorization_code: row.authorization_code,
        card_last_four: row.card_last_four,
        cashier: row.cashier,
        receipt_date: row.receipt_date,
        receipt_time: row.receipt_time,
        invoice_number: row.invoice_number,
        category: row.category,
        subtotal: row.subtotal,
        taxes: row.taxes,
        tips: row.tips,
        grand_total: row.grand_total,
        currency: row.currency,
        payment_method: row.payment_method,
        attachment_link: row.attachment_link,
        source_filename: row.source_filename,
        photo_taken_at: row.photo_taken_at,
        photo_gps_lat: row.photo_gps_lat,
        photo_gps_lng: row.photo_gps_lng,
        is_reviewed: row.is_reviewed,
        reviewed_at: row.reviewed_at,
        review_notes: row.review_notes,
        created_at: row.created_at,
      };
      return receipt;
    }),
    total: Number(result.rows[0]?.total_count ?? 0),
    page,
    per_page,
  };
}

export async function getInvoicesPage(
  client: Client,
  filters: RecordFilters = {},
): Promise<PagedResult<Invoice>> {
  const { page, per_page, offset } = getPagination(filters);
  const { whereClause, values } = addRecordFilters(
    filters,
    "invoice_date",
    "buyer_name",
  );
  const result = await client.query<InvoiceRow>(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM invoices
     ${whereClause}
     ORDER BY invoice_date DESC, created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, per_page, offset],
  );

  return {
    rows: result.rows.map((row) => {
      const invoice: Invoice = {
        id: row.id,
        entity_id: row.entity_id,
        record_i_number: row.record_i_number,
        invoice_number: row.invoice_number,
        invoice_date: row.invoice_date,
        buyer_name: row.buyer_name,
        person_id: row.person_id,
        category: row.category,
        subtotal: row.subtotal,
        taxes: row.taxes,
        grand_total: row.grand_total,
        currency: row.currency,
        payment_method: row.payment_method,
        attachment_link: row.attachment_link,
        is_reviewed: row.is_reviewed,
        reviewed_at: row.reviewed_at,
        review_notes: row.review_notes,
        created_at: row.created_at,
      };
      return invoice;
    }),
    total: Number(result.rows[0]?.total_count ?? 0),
    page,
    per_page,
  };
}

export async function getEntities(client: Client) {
  const result = await client.query<Entity>(
    "SELECT * FROM entities ORDER BY name ASC",
  );

  return result.rows;
}

export async function getReceiptCategories(client: Client) {
  const result = await client.query<{ category: string }>(
    `SELECT name AS category FROM receipt_categories
     UNION
     SELECT DISTINCT category FROM receipts WHERE category IS NOT NULL
     ORDER BY category ASC`,
  );

  return result.rows.map((row) => row.category);
}

export async function getItemCategories(client: Client) {
  const result = await client.query<{ category: string }>(
    `SELECT name AS category FROM item_categories
     UNION
     SELECT DISTINCT item_category FROM receipt_items WHERE item_category IS NOT NULL
     UNION
     SELECT DISTINCT item_category FROM invoice_items WHERE item_category IS NOT NULL
     ORDER BY category ASC`,
  );

  return result.rows.map((row) => row.category);
}

export async function getInvoiceCategories(client: Client) {
  const result = await client.query<{ category: string }>(
    `SELECT DISTINCT category
     FROM invoices
     WHERE category IS NOT NULL AND category <> ''
     ORDER BY category ASC`,
  );

  return result.rows.map((row) => row.category);
}

export async function getReceiptById(
  client: Client,
  record_r_number: string,
) {
  const result = await client.query<Receipt>(
    "SELECT * FROM receipts WHERE record_r_number = $1",
    [record_r_number],
  );

  return result.rows[0] ?? null;
}

export async function getInvoiceById(
  client: Client,
  record_i_number: string,
) {
  const result = await client.query<Invoice>(
    "SELECT * FROM invoices WHERE record_i_number = $1",
    [record_i_number],
  );

  return result.rows[0] ?? null;
}

export async function getReviewQueue(client: Client) {
  const result = await client.query<ReviewQueueRecord>(
    `SELECT 'receipt' AS type,
            record_r_number AS id,
            record_r_number AS record_number,
            receipt_date AS record_date,
            vendor AS name,
            grand_total AS total,
            currency
     FROM receipts
     WHERE is_reviewed = FALSE
     UNION ALL
     SELECT 'invoice' AS type,
            record_i_number AS id,
            record_i_number AS record_number,
            invoice_date AS record_date,
            buyer_name AS name,
            grand_total AS total,
            currency
     FROM invoices
     WHERE is_reviewed = FALSE
     ORDER BY record_date ASC, record_number ASC`,
  );

  return result.rows;
}

export async function getUnreviewedCount(client: Client) {
  const result = await client.query<{ count: string }>(
    `SELECT
       (SELECT COUNT(*) FROM receipts WHERE is_reviewed = FALSE) +
       (SELECT COUNT(*) FROM invoices WHERE is_reviewed = FALSE) AS count`,
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function getReceiptItems(client: Client, record_r_number: string) {
  const result = await client.query<ReceiptItem>(
    `SELECT * FROM receipt_items
     WHERE record_r_number = $1
     ORDER BY id ASC`,
    [record_r_number],
  );

  return result.rows;
}

export async function getInvoiceItems(client: Client, record_i_number: string) {
  const result = await client.query<InvoiceItem>(
    `SELECT * FROM invoice_items
     WHERE record_i_number = $1
     ORDER BY id ASC`,
    [record_i_number],
  );

  return result.rows;
}

export async function updateReceiptForReview(
  client: Client,
  record_r_number: string,
  input: ReceiptUpdateInput,
) {
  await client.query("BEGIN");
  try {
    if (input.category.trim()) {
      await client.query(
        `INSERT INTO receipt_categories (name)
         SELECT $1
         WHERE NOT EXISTS (
           SELECT 1 FROM receipt_categories WHERE LOWER(name) = LOWER($1)
         )`,
        [input.category.trim()],
      );
    }

    const receiptResult = await client.query<Receipt>(
      `UPDATE receipts
       SET vendor = $2,
           vendor_address = $3,
           receipt_date = $4,
           receipt_time = $5,
           category = $6,
           subtotal = $7,
           taxes = $8::jsonb,
           tips = $9,
           grand_total = $10,
           currency = $11,
           payment_method = $12,
           receipt_number = $13,
           transaction_number = $14,
           authorization_code = $15,
           invoice_number = $16,
           card_last_four = $17,
           review_notes = $18
       WHERE record_r_number = $1
       RETURNING *`,
      [
        record_r_number,
        input.vendor,
        input.vendor_address,
        input.receipt_date,
        input.receipt_time,
        input.category,
        input.subtotal,
        JSON.stringify(input.taxes),
        input.tips,
        input.grand_total,
        input.currency || "CAD",
        input.payment_method,
        input.receipt_number,
        input.transaction_number,
        input.authorization_code,
        input.invoice_number,
        input.card_last_four,
        input.review_notes,
      ],
    );

    for (const item of input.items) {
      if (item.item_category.trim()) {
        await client.query(
          `INSERT INTO item_categories (name)
           SELECT $1
           WHERE NOT EXISTS (
             SELECT 1 FROM item_categories WHERE LOWER(name) = LOWER($1)
           )`,
          [item.item_category.trim()],
        );
      }
      await client.query(
          `UPDATE receipt_items
           SET item_name = $2,
               adjusted_item_name = $3,
               item_category = $4,
               item_qty = $5,
               item_price = $6,
               item_total_price = $7
           WHERE id = $1 AND record_r_number = $8`,
          [
            item.id,
            item.item_name,
            item.adjusted_item_name || item.item_name,
            item.item_category,
            item.item_qty,
            item.item_price,
            item.item_total_price,
            record_r_number,
        ],
      );
    }

    await client.query("COMMIT");
    return receiptResult.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function deleteReceipt(client: Client, record_r_number: string) {
  await client.query("BEGIN");
  try {
    await client.query(
      "DELETE FROM receipt_items WHERE record_r_number = $1",
      [record_r_number],
    );
    const result = await client.query<Receipt>(
      `DELETE FROM receipts
       WHERE record_r_number = $1
       RETURNING *`,
      [record_r_number],
    );
    await client.query("COMMIT");
    return result.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function clearReceiptAttachment(
  client: Client,
  record_r_number: string,
) {
  const result = await client.query<Receipt>(
    `UPDATE receipts
     SET attachment_link = NULL
     WHERE record_r_number = $1
     RETURNING *`,
    [record_r_number],
  );

  return result.rows[0] ?? null;
}

export async function updateInvoiceForReview(
  client: Client,
  record_i_number: string,
  input: InvoiceUpdateInput,
) {
  await client.query("BEGIN");
  try {
    const invoiceResult = await client.query<Invoice>(
      `UPDATE invoices
       SET buyer_name = $2,
           invoice_date = $3,
           category = $4,
           subtotal = $5,
           taxes = $6::jsonb,
           grand_total = $7,
           payment_method = $8,
           invoice_number = $9,
           review_notes = $10
       WHERE record_i_number = $1
       RETURNING *`,
      [
        record_i_number,
        input.buyer_name,
        input.invoice_date,
        input.category,
        input.subtotal,
        JSON.stringify(input.taxes),
        input.grand_total,
        input.payment_method,
        input.invoice_number,
        input.review_notes,
      ],
    );

    for (const item of input.items) {
      await client.query(
        `UPDATE invoice_items
         SET item_name = $2,
             item_category = $3,
             item_qty = $4,
             item_price = $5,
             item_total_price = $6
         WHERE id = $1 AND record_i_number = $7`,
        [
          item.id,
          item.item_name,
          item.item_category,
          item.item_qty,
          item.item_price,
          item.item_total_price,
          record_i_number,
        ],
      );
    }

    await client.query("COMMIT");
    return invoiceResult.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function markReceiptReviewed(
  client: Client,
  record_r_number: string,
  review_notes?: string | null,
) {
  const result = await client.query<Receipt>(
    `UPDATE receipts
     SET is_reviewed = TRUE,
         reviewed_at = NOW(),
         review_notes = COALESCE($2, review_notes)
     WHERE record_r_number = $1
     RETURNING *`,
    [record_r_number, review_notes ?? null],
  );

  return result.rows[0] ?? null;
}

export async function markInvoiceReviewed(
  client: Client,
  record_i_number: string,
  review_notes?: string | null,
) {
  const result = await client.query<Invoice>(
    `UPDATE invoices
     SET is_reviewed = TRUE,
         reviewed_at = NOW(),
         review_notes = COALESCE($2, review_notes)
     WHERE record_i_number = $1
     RETURNING *`,
    [record_i_number, review_notes ?? null],
  );

  return result.rows[0] ?? null;
}

export async function markRecordsReviewed(
  client: Client,
  records: Array<{ type: "receipt" | "invoice"; id: string }>,
) {
  await client.query("BEGIN");
  try {
    for (const record of records) {
      if (record.type === "receipt") {
        await markReceiptReviewed(client, record.id);
      } else {
        await markInvoiceReviewed(client, record.id);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
