import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { getInvoiceById, getInvoiceItems } from "@/lib/queries";
import type { Invoice, InvoiceItem } from "@/types/licanada_gpt";

type InvoiceDetailPageProps = {
  params: {
    record: string;
  };
};

type InvoiceField = {
  label: string;
  value: string;
};

function formatRecordDate(value: Date | string) {
  return new Date(value).toISOString().slice(0, 19).replace("T", " ");
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function formatTaxValue(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return "";
  }

  return value
    .map((tax) => {
      if (!tax || typeof tax !== "object") {
        return String(tax);
      }

      const entry = tax as Record<string, unknown>;
      const name = entry.name ?? entry.type ?? "Tax";
      const amount = entry.amount ?? "";

      return `${name}: ${amount}`;
    })
    .join("\n");
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function getDrivePreviewUrl(url: string | null) {
  if (!url) return null;

  const fileMatch = url.match(/\/file\/d\/([^/]+)/);
  const openMatch = url.match(/[?&]id=([^&]+)/);
  const id = fileMatch?.[1] ?? openMatch?.[1];

  if (!id) {
    return url;
  }

  return `https://drive.google.com/file/d/${id}/preview`;
}

function buildInvoiceFields(invoice: Invoice): InvoiceField[][] {
  return [
    [
      { label: "Invoice Date", value: formatDate(invoice.invoice_date) },
      { label: "Category", value: formatValue(invoice.category) },
      { label: "Sub-Total", value: formatValue(invoice.subtotal) },
      { label: "Tax", value: formatTaxValue(invoice.taxes) },
      { label: "Total", value: formatValue(invoice.grand_total) },
      { label: "Currency", value: formatValue(invoice.currency) },
    ],
    [
      { label: "Invoice Number", value: formatValue(invoice.invoice_number) },
      { label: "Payment Method", value: formatValue(invoice.payment_method) },
    ],
    [{ label: "Record Date", value: formatRecordDate(invoice.created_at) }],
  ];
}

function ItemsTable({ items }: { items: InvoiceItem[] }) {
  return (
    <div className="mt-10 overflow-x-auto border border-foreground/10">
      <table className="w-full min-w-[760px] text-left text-sm">
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
                <td className="px-3 py-2">{item.item_name}</td>
                <td className="px-3 py-2">{item.item_category ?? ""}</td>
                <td className="px-3 py-2">{item.item_qty ?? ""}</td>
                <td className="px-3 py-2">{item.item_price ?? ""}</td>
                <td className="px-3 py-2">{item.item_total_price ?? ""}</td>
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
  );
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const record = decodeURIComponent(params.record);
    const [invoice, items] = await Promise.all([
      getInvoiceById(client, record),
      getInvoiceItems(client, record),
    ]);

    if (!invoice) {
      notFound();
    }

    const previewUrl = getDrivePreviewUrl(invoice.attachment_link);
    const invoiceFieldGroups = buildInvoiceFields(invoice);

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-6xl">
          <Link className="text-sm underline" href="/dashboard/records?tab=invoices">
            Back to records
          </Link>
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

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(320px,510px)_1fr]">
            <div className="flex min-h-[520px] items-center justify-center overflow-hidden border-2 border-cyan-700 bg-foreground/[0.02]">
              {previewUrl ? (
                <iframe
                  className="h-[520px] w-full"
                  src={previewUrl}
                  title={`Invoice preview ${invoice.record_i_number}`}
                />
              ) : (
                <span className="text-xl font-semibold uppercase tracking-wide text-cyan-700">
                  Revenue Preview Area
                </span>
              )}
            </div>

            <div className="space-y-10">
              {invoiceFieldGroups.map((group, index) => (
                <dl className="grid gap-y-2 text-base" key={index}>
                  {group.map((field) => (
                    <div
                      className="grid gap-4 sm:grid-cols-[260px_1fr]"
                      key={field.label}
                    >
                      <dt className="font-semibold">{field.label}</dt>
                      <dd className="whitespace-pre-wrap break-words text-foreground/75">
                        {field.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ))}
              <ItemsTable items={items} />
            </div>
          </div>
        </div>
      </main>
    );
  } finally {
    await client.end();
  }
}
