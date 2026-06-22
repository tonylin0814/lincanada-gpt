"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { FormEvent, MouseEvent, useMemo, useState } from "react";
import type { Invoice, InvoiceItem } from "@/types/licanada_gpt";

type InvoiceRecordClientProps = {
  invoice: Invoice;
  items: InvoiceItem[];
  invoiceCategories: string[];
  itemCategories: string[];
};

const taxOptions = ["HST", "GST", "PST", "QST", "Other"];

function toDateInputValue(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function formatDateTime(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 19).replace("T", " ");
}

function getTaxRows(taxes: unknown) {
  const rows = Array.isArray(taxes) ? taxes : [];
  return [0, 1].map((index) => {
    const tax = rows[index];
    if (!tax || typeof tax !== "object") return { name: "", amount: "" };
    const entry = tax as Record<string, unknown>;
    return {
      name: String(entry.name ?? entry.type ?? ""),
      amount: String(entry.amount ?? ""),
    };
  });
}

function getDriveFileId(url: string | null) {
  if (!url) return null;
  const fileMatch = url.match(/\/file\/d\/([^/]+)/);
  const openMatch = url.match(/[?&]id=([^&]+)/);
  return fileMatch?.[1] ?? openMatch?.[1] ?? null;
}

function getDrivePreviewUrl(url: string | null) {
  const id = getDriveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : url;
}

function getDriveDownloadUrl(url: string | null) {
  const id = getDriveFileId(url);
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : url;
}

function toNullableString(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text || null;
}

function buildSavePayload(form: HTMLFormElement, items: InvoiceItem[]) {
  const formData = new FormData(form);
  const taxes = [0, 1]
    .map((index) => ({
      name: String(formData.get(`tax_name_${index}`) || "").trim(),
      amount: String(formData.get(`tax_amount_${index}`) || "").trim(),
    }))
    .filter((tax) => tax.name || tax.amount);

  return {
    buyer_name: String(formData.get("buyer_name") ?? ""),
    invoice_date: String(formData.get("invoice_date") ?? ""),
    category: toNullableString(formData.get("category")),
    subtotal: toNullableString(formData.get("subtotal")),
    taxes,
    grand_total: toNullableString(formData.get("grand_total")),
    payment_method: toNullableString(formData.get("payment_method")),
    invoice_number: toNullableString(formData.get("invoice_number")),
    review_notes: toNullableString(formData.get("review_notes")),
    items: items.map((item) => ({
      id: item.id,
      item_name: String(formData.get(`item_name_${item.id}`) ?? ""),
      item_category: toNullableString(formData.get(`item_category_${item.id}`)),
      item_qty: toNullableString(formData.get(`item_qty_${item.id}`)),
      item_price: toNullableString(formData.get(`item_price_${item.id}`)),
      item_total_price: toNullableString(
        formData.get(`item_total_price_${item.id}`),
      ),
    })),
  };
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getReturnTo(searchParams: URLSearchParams, fallback: string) {
  const returnTo = searchParams.get("returnTo");
  return returnTo?.startsWith("/dashboard/records") ? returnTo : fallback;
}

function Field({
  label,
  name,
  value,
  editMode,
  type = "text",
  children,
}: {
  label: string;
  name: string;
  value: string;
  editMode: boolean;
  type?: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-2 text-sm sm:grid-cols-[190px_1fr] sm:items-center">
      <span className="font-semibold">{label}</span>
      {editMode ? (
        children ?? (
          <input
            className="h-10 rounded-md border border-foreground/20 bg-background px-3"
            defaultValue={value}
            name={name}
            type={type}
          />
        )
      ) : (
        <span className="min-h-6 break-words text-foreground/75">{value}</span>
      )}
    </div>
  );
}

function CategorySelect({
  name,
  value,
  categories,
  onAdd,
  allowBlank = false,
}: {
  name: string;
  value: string;
  categories: string[];
  onAdd: (value: string) => void;
  allowBlank?: boolean;
}) {
  const options = categories.includes(value) || !value ? categories : [value, ...categories];

  function addCategory() {
    const next = window.prompt("New category name");
    if (next?.trim()) onAdd(next.trim());
  }

  return (
    <div className="flex gap-2">
      <select
        className="h-10 min-w-0 flex-1 rounded-md border border-foreground/20 bg-background px-3"
        defaultValue={value}
        name={name}
      >
        {allowBlank ? <option value="">Uncategorized</option> : null}
        {options.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <button
        className="h-10 rounded-md border border-foreground/20 px-3 text-sm font-medium"
        onClick={addCategory}
        type="button"
      >
        + Add
      </button>
    </div>
  );
}

export function InvoiceRecordClient({
  invoice,
  items,
  invoiceCategories,
  itemCategories,
}: InvoiceRecordClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editMode, setEditMode] = useState(searchParams.get("edit") === "1");
  const [localInvoiceCategories, setLocalInvoiceCategories] =
    useState(invoiceCategories);
  const [localItemCategories, setLocalItemCategories] = useState(itemCategories);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const taxRows = useMemo(() => getTaxRows(invoice.taxes), [invoice.taxes]);
  const previewUrl = getDrivePreviewUrl(invoice.attachment_link);
  const invoiceDownloadUrl = getDriveDownloadUrl(invoice.attachment_link);
  const invoiceDate = toDateInputValue(invoice.invoice_date);
  const backToRecords = getReturnTo(searchParams, "/dashboard/records?tab=invoices");

  function printInvoice() {
    if (!previewUrl) return;
    const printWindow = window.open("", "_blank", "width=900,height=900");
    if (!printWindow) return;
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head><title>${escapeHtml(invoice.record_i_number)}</title></head>
        <body style="margin:0">
          <iframe src="${escapeHtml(previewUrl)}" style="border:0;width:100%;height:100vh"></iframe>
          <script>setTimeout(() => window.print(), 1200);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function downloadRecordExcel() {
    const taxes = getTaxRows(invoice.taxes)
      .filter((tax) => tax.name || tax.amount)
      .map((tax) => `${tax.name}: ${tax.amount}`)
      .join("<br>");
    const itemRows = items
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.item_number)}</td>
            <td>${escapeHtml(item.item_name)}</td>
            <td>${escapeHtml(item.item_category)}</td>
            <td>${escapeHtml(item.item_qty)}</td>
            <td>${escapeHtml(item.item_price)}</td>
            <td>${escapeHtml(item.item_total_price)}</td>
          </tr>
        `,
      )
      .join("");
    const html = `
      <html>
        <body>
          <h1>${escapeHtml(invoice.record_i_number)}</h1>
          <table border="1">
            <tr><th>Buyer</th><td>${escapeHtml(invoice.buyer_name)}</td></tr>
            <tr><th>Invoice Date</th><td>${escapeHtml(invoiceDate)}</td></tr>
            <tr><th>Category</th><td>${escapeHtml(invoice.category)}</td></tr>
            <tr><th>Sub-Total</th><td>${escapeHtml(invoice.subtotal)}</td></tr>
            <tr><th>Tax</th><td>${taxes}</td></tr>
            <tr><th>Total</th><td>${escapeHtml(invoice.grand_total)}</td></tr>
            <tr><th>Currency</th><td>${escapeHtml(invoice.currency)}</td></tr>
            <tr><th>Invoice Image</th><td><a href="${escapeHtml(invoice.attachment_link)}">${escapeHtml(invoice.attachment_link)}</a></td></tr>
          </table>
          <h2>Items</h2>
          <table border="1">
            <tr><th>Item #</th><th>Item</th><th>Category</th><th>Qty</th><th>Price</th><th>Total</th></tr>
            ${itemRows}
          </table>
        </body>
      </html>
    `;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoice.record_i_number}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    const response = await fetch(
      `/api/records/invoices/${encodeURIComponent(invoice.record_i_number)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSavePayload(event.currentTarget, items)),
      },
    );
    setIsSaving(false);

    if (!response.ok) {
      setError("Could not save invoice changes.");
      return;
    }

    setEditMode(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    const query = params.toString();
    window.history.replaceState(null, "", `${pathname}${query ? `?${query}` : ""}`);
    router.refresh();
  }

  function enterEditMode(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const params = new URLSearchParams(searchParams.toString());
    params.set("edit", "1");
    const query = params.toString();
    window.history.replaceState(null, "", `${pathname}${query ? `?${query}` : ""}`);
    setEditMode(true);
  }

  async function deleteRecord() {
    setError("");
    setIsDeleting(true);
    const response = await fetch(
      `/api/records/invoices/${encodeURIComponent(invoice.record_i_number)}`,
      { method: "DELETE" },
    );
    setIsDeleting(false);

    if (!response.ok) {
      setError("Could not delete this record.");
      return;
    }

    router.push(backToRecords);
    router.refresh();
  }

  return (
    <form className="mx-auto max-w-7xl" onSubmit={save}>
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <button
          className="text-sm underline"
          onClick={() => router.push(backToRecords)}
          type="button"
        >
          Back to records
        </button>
        <div className="flex flex-wrap gap-3">
          <button
            className="h-10 rounded-md border border-foreground/20 px-4 text-sm font-medium"
            onClick={() => window.print()}
            type="button"
          >
            Print Record
          </button>
          <button
            className="h-10 rounded-md border border-foreground/20 px-4 text-sm font-medium"
            onClick={downloadRecordExcel}
            type="button"
          >
            Download Record
          </button>
          {!editMode ? (
            <button
              className="h-10 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white"
              onClick={enterEditMode}
              type="button"
            >
              Edit
            </button>
          ) : (
            <button
              className="h-10 rounded-md bg-green-700 px-4 text-sm font-semibold text-white disabled:bg-green-700/40"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          )}
          <button
            className="h-10 rounded-md border border-red-600 px-4 text-sm font-semibold text-red-600 disabled:opacity-60"
            disabled={isDeleting}
            onClick={() => setIsDeleteConfirmOpen(true)}
            type="button"
          >
            {isDeleting ? "Deleting..." : "Delete Record"}
          </button>
        </div>
      </div>

      {isDeleteConfirmOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:hidden"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-lg border border-foreground/10 bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Delete record?</h2>
            <p className="mt-3 text-sm text-foreground/70">
              This will delete {invoice.record_i_number} from Google Drive and
              remove the database record.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="h-10 rounded-md border border-foreground/20 px-4 text-sm font-medium"
                disabled={isDeleting}
                onClick={() => setIsDeleteConfirmOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-md bg-red-700 px-4 text-sm font-semibold text-white disabled:bg-red-700/40"
                disabled={isDeleting}
                onClick={deleteRecord}
                type="button"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 grid gap-6 text-sm font-semibold sm:grid-cols-2">
        <div className="grid grid-cols-[160px_1fr] gap-4">
          <span>Record Number</span>
          <span className="text-foreground/75">{invoice.record_i_number}</span>
        </div>
        <div className="grid grid-cols-[120px_1fr] gap-4">
          <span>Buyer</span>
          <span className="text-foreground/75">{invoice.buyer_name}</span>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(320px,510px)_1fr]">
        <section className="overflow-hidden border border-foreground/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/10 px-4 py-3 print:hidden">
            <p className="text-sm font-semibold">Invoice Preview</p>
            <div className="flex flex-wrap gap-2">
              <button
                className="h-9 rounded-md border border-foreground/20 px-3 text-sm"
                disabled={!previewUrl}
                onClick={printInvoice}
                type="button"
              >
                Print Invoice
              </button>
              {invoiceDownloadUrl ? (
                <a
                  className="inline-flex h-9 items-center rounded-md border border-foreground/20 px-3 text-sm"
                  href={invoiceDownloadUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Download Invoice
                </a>
              ) : null}
            </div>
          </div>
          <div className="flex min-h-[620px] items-center justify-center bg-foreground/[0.02]">
            {previewUrl ? (
              <iframe
                className="h-[620px] w-full"
                src={previewUrl}
                title={`Invoice preview ${invoice.record_i_number}`}
              />
            ) : (
              <span className="text-xl font-semibold uppercase tracking-wide text-cyan-700">
                Revenue Preview Area
              </span>
            )}
          </div>
        </section>

        <section className="space-y-8">
          <div className="grid gap-4">
            <Field editMode={editMode} label="Invoice Date" name="invoice_date" type="date" value={invoiceDate} />
            <Field editMode={editMode} label="Category" name="category" value={invoice.category ?? ""}>
              <CategorySelect
                allowBlank
                categories={localInvoiceCategories}
                name="category"
                onAdd={(value) =>
                  setLocalInvoiceCategories((current) =>
                    current.includes(value) ? current : [...current, value],
                  )
                }
                value={invoice.category ?? ""}
              />
            </Field>
            <Field editMode={editMode} label="Sub-Total" name="subtotal" value={invoice.subtotal ?? ""} />
            <Field editMode={editMode} label="Total" name="grand_total" value={invoice.grand_total ?? ""} />
            <Field editMode={editMode} label="Currency" name="currency" value={invoice.currency} />
            <fieldset className="grid gap-3 text-sm sm:grid-cols-[190px_1fr]">
              <legend className="font-semibold">Tax</legend>
              <div className="grid gap-3">
                {taxRows.map((tax, index) => {
                  const taxSelectOptions = taxOptions.includes(tax.name)
                    ? taxOptions
                    : [tax.name, ...taxOptions];
                  return (
                    <div className="grid gap-3 sm:grid-cols-2" key={index}>
                      {editMode ? (
                        <>
                          <select
                            className="h-10 rounded-md border border-foreground/20 bg-background px-3"
                            defaultValue={tax.name}
                            name={`tax_name_${index}`}
                          >
                            <option value="">No tax</option>
                            {taxSelectOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <input
                            className="h-10 rounded-md border border-foreground/20 bg-background px-3"
                            defaultValue={tax.amount}
                            name={`tax_amount_${index}`}
                            placeholder="Amount"
                          />
                        </>
                      ) : (
                        <span className="text-foreground/75">
                          {tax.name || tax.amount ? `${tax.name}: ${tax.amount}` : ""}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="grid gap-4">
            <Field editMode={editMode} label="Buyer" name="buyer_name" value={invoice.buyer_name} />
            <Field editMode={editMode} label="Invoice Number" name="invoice_number" value={invoice.invoice_number ?? ""} />
            <Field editMode={editMode} label="Payment Method" name="payment_method" value={invoice.payment_method ?? ""} />
            <Field editMode={editMode} label="Record Date" name="created_at" value={formatDateTime(invoice.created_at)} />
            <label className="grid gap-2 text-sm sm:grid-cols-[190px_1fr]">
              <span className="font-semibold">Review Notes</span>
              {editMode ? (
                <textarea
                  className="min-h-20 rounded-md border border-foreground/20 bg-background px-3 py-2"
                  defaultValue={invoice.review_notes ?? ""}
                  name="review_notes"
                />
              ) : (
                <span className="text-foreground/75">{invoice.review_notes ?? ""}</span>
              )}
            </label>
          </div>

          <div className="overflow-x-auto border border-foreground/10">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-foreground/5">
                <tr>
                  <th className="px-3 py-2">Item #</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((item) => (
                    <tr className="border-t border-foreground/10" key={item.id}>
                      <td className="px-3 py-2">{item.item_number ?? ""}</td>
                      <td className="px-3 py-2">
                        {editMode ? (
                          <input className="h-9 w-full rounded-md border border-foreground/20 bg-background px-2" defaultValue={item.item_name} name={`item_name_${item.id}`} />
                        ) : (
                          item.item_name
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editMode ? (
                          <CategorySelect
                            allowBlank
                            categories={localItemCategories}
                            name={`item_category_${item.id}`}
                            onAdd={(value) =>
                              setLocalItemCategories((current) =>
                                current.includes(value) ? current : [...current, value],
                              )
                            }
                            value={item.item_category ?? ""}
                          />
                        ) : (
                          item.item_category ?? ""
                        )}
                      </td>
                      {[
                        ["item_qty", item.item_qty ?? ""],
                        ["item_price", item.item_price ?? ""],
                        ["item_total_price", item.item_total_price ?? ""],
                      ].map(([field, value]) => (
                        <td className="px-3 py-2" key={field}>
                          {editMode ? (
                            <input className="h-9 w-full rounded-md border border-foreground/20 bg-background px-2" defaultValue={String(value)} name={`${field}_${item.id}`} />
                          ) : (
                            String(value)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-4 text-foreground/60" colSpan={6}>
                      No item rows.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </form>
  );
}
