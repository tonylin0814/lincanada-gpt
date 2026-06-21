import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { getReceiptById } from "@/lib/queries";
import type { Receipt } from "@/types/licanada_gpt";

type ReceiptDetailPageProps = {
  params: {
    record: string;
  };
};

const receiptFields: Array<{
  key: keyof Receipt;
  label: string;
}> = [
  { key: "record_r_number", label: "Record Number" },
  { key: "vendor", label: "Vendor" },
  { key: "vendor_address", label: "Vendor Address" },
  { key: "receipt_number", label: "Receipt Number" },
  { key: "transaction_number", label: "Transaction Number" },
  { key: "payment_method", label: "Payment Method" },
  { key: "card_last_four", label: "Card Last 4 Digits" },
  { key: "receipt_date", label: "Receipt Date" },
  { key: "receipt_time", label: "Receipt Time" },
  { key: "invoice_number", label: "Invoice Number" },
  { key: "category", label: "Category" },
  { key: "subtotal", label: "Sub-Total" },
  { key: "taxes", label: "Tax" },
  { key: "tips", label: "Tips" },
  { key: "grand_total", label: "Total" },
  { key: "currency", label: "Currency" },
  { key: "created_at", label: "Record Date" },
];

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
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
      const number = entry.tax_number ? ` (${entry.tax_number})` : "";

      return `${name}: ${amount}${number}`;
    })
    .join("\n");
}

function formatValue(key: keyof Receipt, value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (key === "taxes") {
    return formatTaxValue(value);
  }

  if (value instanceof Date) {
    return key === "created_at" ? value.toISOString() : formatDateOnly(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

export default async function ReceiptDetailPage({
  params,
}: ReceiptDetailPageProps) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const receipt = await getReceiptById(
      client,
      decodeURIComponent(params.record),
    );

    if (!receipt) {
      notFound();
    }

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-4xl">
          <Link className="text-sm underline" href="/dashboard/records">
            Back to records
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-normal">
            {receipt.record_r_number}
          </h1>
          <div className="mt-8 overflow-hidden border border-foreground/10">
            {receiptFields.map(({ key, label }) => (
              <div
                className="grid gap-3 border-b border-foreground/10 p-4 text-sm last:border-b-0 sm:grid-cols-[220px_1fr]"
                key={key}
              >
                <dt className="font-medium">{label}</dt>
                <dd className="whitespace-pre-wrap break-words text-foreground/75">
                  {formatValue(key, receipt[key])}
                </dd>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  } finally {
    await client.end();
  }
}
