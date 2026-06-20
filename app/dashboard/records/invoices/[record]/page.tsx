import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { getInvoiceById } from "@/lib/queries";

type InvoiceDetailPageProps = {
  params: {
    record: string;
  };
};

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
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
    const invoice = await getInvoiceById(
      client,
      decodeURIComponent(params.record),
    );

    if (!invoice) {
      notFound();
    }

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-4xl">
          <Link className="text-sm underline" href="/dashboard/records?tab=invoices">
            Back to records
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-normal">
            {invoice.record_i_number}
          </h1>
          <div className="mt-8 overflow-hidden border border-foreground/10">
            {Object.entries(invoice).map(([key, value]) => (
              <div
                className="grid gap-3 border-b border-foreground/10 p-4 text-sm last:border-b-0 sm:grid-cols-[220px_1fr]"
                key={key}
              >
                <dt className="font-medium">{key}</dt>
                <dd className="whitespace-pre-wrap break-words text-foreground/75">
                  {formatValue(value)}
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
