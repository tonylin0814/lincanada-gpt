import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import {
  getEntities,
  getInvoiceCategories,
  getInvoicesPage,
  getReceiptCategories,
  getReceiptsPage,
} from "@/lib/queries";
import type { Entity, Invoice, Receipt } from "@/types/licanada_gpt";

type RecordsPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function getParam(
  searchParams: RecordsPageProps["searchParams"],
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function getCurrentTab(searchParams: RecordsPageProps["searchParams"]) {
  return getParam(searchParams, "tab") === "invoices" ? "invoices" : "receipts";
}

function parseYear(searchParams: RecordsPageProps["searchParams"]) {
  const year = getParam(searchParams, "year");
  if (!year || year === "all") return null;

  const parsed = Number(year);
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100
    ? parsed
    : null;
}

function getFilters(searchParams: RecordsPageProps["searchParams"]) {
  const reviewed = getParam(searchParams, "is_reviewed");
  const entityId = getParam(searchParams, "entity_id");
  const year = parseYear(searchParams);
  const sortDir = getParam(searchParams, "sort_dir");
  const sortDirection: "asc" | "desc" = sortDir === "asc" ? "asc" : "desc";

  return {
    entity_id: entityId ? Number(entityId) : undefined,
    is_reviewed:
      reviewed === "true" ? true : reviewed === "false" ? false : undefined,
    date_from:
      year !== null
        ? `${year}-01-01`
        : getParam(searchParams, "date_from") || undefined,
    date_to:
      year !== null
        ? `${year}-12-31`
        : getParam(searchParams, "date_to") || undefined,
    category: getParam(searchParams, "category") || undefined,
    search: getParam(searchParams, "search") || undefined,
    sort_by: getParam(searchParams, "sort_by") || undefined,
    sort_dir: sortDirection,
    page: Number(getParam(searchParams, "page") || 1),
    per_page: 20,
  };
}

function buildHref(
  searchParams: RecordsPageProps["searchParams"],
  updates: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    const firstValue = Array.isArray(value) ? value[0] : value;
    if (firstValue) {
      params.set(key, firstValue);
    }
  });

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return `/dashboard/records${query ? `?${query}` : ""}`;
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString();
}

function formatMoney(value: string | null, currency: string) {
  if (value === null) {
    return "";
  }

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(Number(value));
}

function SortHeader({
  label,
  searchParams,
  sortKey,
}: {
  label: string;
  searchParams: RecordsPageProps["searchParams"];
  sortKey: string;
}) {
  const currentSort = getParam(searchParams, "sort_by");
  const currentDir = getParam(searchParams, "sort_dir") === "asc" ? "asc" : "desc";
  const isActive = currentSort === sortKey;
  const nextDir = isActive && currentDir === "asc" ? "desc" : "asc";
  const marker = isActive ? (currentDir === "asc" ? "ASC" : "DESC") : "Sort";

  return (
    <Link
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-blue-700 hover:text-white ${
        isActive ? "bg-foreground text-background" : ""
      }`}
      href={buildHref(searchParams, {
        page: 1,
        sort_by: sortKey,
        sort_dir: nextDir,
      })}
    >
      <span>{label}</span>
      <span aria-hidden="true">{marker}</span>
    </Link>
  );
}

function FilterBar({
  entities,
  categories,
  availableYears,
  searchParams,
  tab,
}: {
  entities: Entity[];
  categories: string[];
  availableYears: number[];
  searchParams: RecordsPageProps["searchParams"];
  tab: "receipts" | "invoices";
}) {
  return (
    <form
      action="/dashboard/records"
      className="mt-8 grid gap-4 border border-foreground/10 p-4 md:grid-cols-7"
    >
      <input name="tab" type="hidden" value={tab} />
      <input name="sort_by" type="hidden" value={getParam(searchParams, "sort_by") ?? ""} />
      <input name="sort_dir" type="hidden" value={getParam(searchParams, "sort_dir") ?? ""} />
      <label className="block text-sm">
        Year
        <select
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          defaultValue={getParam(searchParams, "year") ?? "all"}
          name="year"
        >
          <option value="all">All Years</option>
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Entity
        <select
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          defaultValue={getParam(searchParams, "entity_id") ?? ""}
          name="entity_id"
        >
          <option value="">All</option>
          {entities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {entity.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        From
        <input
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          defaultValue={getParam(searchParams, "date_from") ?? ""}
          name="date_from"
          type="date"
        />
      </label>
      <label className="block text-sm">
        To
        <input
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          defaultValue={getParam(searchParams, "date_to") ?? ""}
          name="date_to"
          type="date"
        />
      </label>
      <label className="block text-sm">
        Category
        <select
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          defaultValue={getParam(searchParams, "category") ?? ""}
          name="category"
        >
          <option value="">All</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Reviewed
        <select
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          defaultValue={getParam(searchParams, "is_reviewed") ?? ""}
          name="is_reviewed"
        >
          <option value="">All</option>
          <option value="false">Unreviewed</option>
          <option value="true">Reviewed</option>
        </select>
      </label>
      <label className="block text-sm">
        Search
        <input
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          defaultValue={getParam(searchParams, "search") ?? ""}
          name="search"
          placeholder={tab === "receipts" ? "Vendor" : "Buyer"}
        />
      </label>
      <div className="flex items-end gap-3 md:col-span-7">
        <button
          className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background"
          type="submit"
        >
          Apply filters
        </button>
        <Link className="text-sm underline" href={`/dashboard/records?tab=${tab}`}>
          Clear
        </Link>
      </div>
    </form>
  );
}

function ReceiptsTable({
  receipts,
  searchParams,
}: {
  receipts: Receipt[];
  searchParams: RecordsPageProps["searchParams"];
}) {
  return (
    <div className="mt-6 overflow-x-auto border border-foreground/10">
      <table className="w-full min-w-[880px] border-collapse text-left text-sm">
        <thead className="bg-foreground/5">
          <tr>
            <th className="px-2 py-3 font-medium">
              <SortHeader label="Record #" searchParams={searchParams} sortKey="record" />
            </th>
            <th className="px-2 py-3 font-medium">
              <SortHeader label="Date" searchParams={searchParams} sortKey="date" />
            </th>
            <th className="px-2 py-3 font-medium">
              <SortHeader label="Vendor" searchParams={searchParams} sortKey="vendor" />
            </th>
            <th className="px-2 py-3 font-medium">
              <SortHeader label="Category" searchParams={searchParams} sortKey="category" />
            </th>
            <th className="px-2 py-3 font-medium">
              <SortHeader label="Total" searchParams={searchParams} sortKey="total" />
            </th>
            <th className="px-2 py-3 font-medium">
              <SortHeader label="Payment Method" searchParams={searchParams} sortKey="payment_method" />
            </th>
            <th className="px-2 py-3 font-medium">
              <SortHeader label="Uploaded" searchParams={searchParams} sortKey="uploaded" />
            </th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((receipt) => (
            <tr className="border-t border-foreground/10" key={receipt.id}>
              <td className="px-4 py-3">{receipt.record_r_number}</td>
              <td className="px-4 py-3">{formatDate(receipt.receipt_date)}</td>
              <td className="px-4 py-3">{receipt.vendor}</td>
              <td className="px-4 py-3">{receipt.category}</td>
              <td className="px-4 py-3">
                {formatMoney(receipt.grand_total, receipt.currency)}
              </td>
              <td className="px-4 py-3">{receipt.payment_method ?? ""}</td>
              <td className="px-4 py-3">{receipt.attachment_link ? "✓" : "✗"}</td>
              <td className="px-4 py-3">
                <Link
                  className="underline"
                  href={`/dashboard/records/receipts/${encodeURIComponent(
                    receipt.record_r_number,
                  )}`}
                >
                  Review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {receipts.length === 0 ? (
        <p className="p-4 text-sm text-foreground/60">No receipts found.</p>
      ) : null}
    </div>
  );
}

function InvoicesTable({
  invoices,
  searchParams,
}: {
  invoices: Invoice[];
  searchParams: RecordsPageProps["searchParams"];
}) {
  return (
    <div className="mt-6 overflow-x-auto border border-foreground/10">
      <table className="w-full min-w-[880px] border-collapse text-left text-sm">
        <thead className="bg-foreground/5">
          <tr>
            <th className="px-2 py-3 font-medium">
              <SortHeader label="Record #" searchParams={searchParams} sortKey="record" />
            </th>
            <th className="px-2 py-3 font-medium">
              <SortHeader label="Date" searchParams={searchParams} sortKey="date" />
            </th>
            <th className="px-2 py-3 font-medium">
              <SortHeader label="Buyer" searchParams={searchParams} sortKey="buyer" />
            </th>
            <th className="px-2 py-3 font-medium">
              <SortHeader label="Category" searchParams={searchParams} sortKey="category" />
            </th>
            <th className="px-2 py-3 font-medium">
              <SortHeader label="Total" searchParams={searchParams} sortKey="total" />
            </th>
            <th className="px-2 py-3 font-medium">
              <SortHeader label="Payment Method" searchParams={searchParams} sortKey="payment_method" />
            </th>
            <th className="px-2 py-3 font-medium">
              <SortHeader label="Uploaded" searchParams={searchParams} sortKey="uploaded" />
            </th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr className="border-t border-foreground/10" key={invoice.id}>
              <td className="px-4 py-3">{invoice.record_i_number}</td>
              <td className="px-4 py-3">{formatDate(invoice.invoice_date)}</td>
              <td className="px-4 py-3">{invoice.buyer_name}</td>
              <td className="px-4 py-3">{invoice.category ?? ""}</td>
              <td className="px-4 py-3">
                {formatMoney(invoice.grand_total, invoice.currency)}
              </td>
              <td className="px-4 py-3">{invoice.payment_method ?? ""}</td>
              <td className="px-4 py-3">{invoice.attachment_link ? "✓" : "✗"}</td>
              <td className="px-4 py-3">
                <Link
                  className="underline"
                  href={`/dashboard/records/invoices/${encodeURIComponent(
                    invoice.record_i_number,
                  )}`}
                >
                  Review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {invoices.length === 0 ? (
        <p className="p-4 text-sm text-foreground/60">No invoices found.</p>
      ) : null}
    </div>
  );
}

function Pagination({
  page,
  perPage,
  total,
  searchParams,
}: {
  page: number;
  perPage: number;
  total: number;
  searchParams: RecordsPageProps["searchParams"];
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="mt-5 flex items-center justify-between text-sm">
      <p className="text-foreground/65">
        Page {page} of {totalPages} · {total} records
      </p>
      <div className="flex gap-3">
        {page > 1 ? (
          <Link
            className="underline"
            href={buildHref(searchParams, { page: page - 1 })}
          >
            Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            className="underline"
            href={buildHref(searchParams, { page: page + 1 })}
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default async function RecordsPage({ searchParams }: RecordsPageProps) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  const tab = getCurrentTab(searchParams);
  const filters = getFilters(searchParams);
  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const [
      entities,
      receiptCategories,
      invoiceCategories,
      receiptYears,
      invoiceYears,
    ] = await Promise.all([
      getEntities(client),
      getReceiptCategories(client),
      getInvoiceCategories(client),
      client.query<{ year: string }>(
        `SELECT DISTINCT EXTRACT(YEAR FROM receipt_date)::int AS year
         FROM receipts
         WHERE receipt_date IS NOT NULL
         ORDER BY year DESC`,
      ),
      client.query<{ year: string }>(
        `SELECT DISTINCT EXTRACT(YEAR FROM invoice_date)::int AS year
         FROM invoices
         WHERE invoice_date IS NOT NULL
         ORDER BY year DESC`,
      ),
    ]);
    const categories = tab === "receipts" ? receiptCategories : invoiceCategories;
    const selectedYear = parseYear(searchParams);
    const availableYears = (
      tab === "receipts" ? receiptYears.rows : invoiceYears.rows
    ).map((row) => Number(row.year));

    if (selectedYear !== null && !availableYears.includes(selectedYear)) {
      availableYears.unshift(selectedYear);
    }

    const result =
      tab === "receipts"
        ? await getReceiptsPage(client, filters)
        : await getInvoicesPage(client, filters);

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Records
              </h1>
              <p className="mt-2 text-sm text-foreground/65">
                Browse expense and revenue records from your Supabase database.
              </p>
            </div>
          </div>

          <div className="mt-8 flex gap-2 border-b border-foreground/10">
            <Link
              className={`px-4 py-3 text-sm ${
                tab === "receipts"
                  ? "border-b-2 border-foreground font-medium"
                  : "text-foreground/65"
              }`}
              href={buildHref(searchParams, { tab: "receipts", page: 1 })}
            >
              Expense
            </Link>
            <Link
              className={`px-4 py-3 text-sm ${
                tab === "invoices"
                  ? "border-b-2 border-foreground font-medium"
                  : "text-foreground/65"
              }`}
              href={buildHref(searchParams, { tab: "invoices", page: 1 })}
            >
              Revenue
            </Link>
          </div>

          <FilterBar
            availableYears={availableYears}
            categories={categories}
            entities={entities}
            searchParams={searchParams}
            tab={tab}
          />

          {tab === "receipts" ? (
            <ReceiptsTable
              receipts={result.rows as Receipt[]}
              searchParams={searchParams}
            />
          ) : (
            <InvoicesTable
              invoices={result.rows as Invoice[]}
              searchParams={searchParams}
            />
          )}
          <Pagination
            page={result.page}
            perPage={result.per_page}
            searchParams={searchParams}
            total={result.total}
          />
        </div>
      </main>
    );
  } finally {
    await client.end();
  }
}
