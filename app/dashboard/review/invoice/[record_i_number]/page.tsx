import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { getInvoiceById, getInvoiceItems } from "@/lib/queries";
import { InvoiceReviewForm } from "./invoice-review-form";

type PageProps = { params: { record_i_number: string } };

export default async function InvoiceReviewPage({ params }: PageProps) {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/login");

  const record = decodeURIComponent(params.record_i_number);
  const client = await getUserDb(session.user.supabase_connection_string);
  try {
    const [invoice, items] = await Promise.all([
      getInvoiceById(client, record),
      getInvoiceItems(client, record),
    ]);
    if (!invoice) notFound();

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-7xl">
          <Link className="text-sm underline" href="/dashboard/review">
            Back to review queue
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-normal">
            Review Invoice {invoice.record_i_number}
          </h1>
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(320px,1fr)_minmax(0,1.4fr)]">
            <section className="border border-foreground/10 p-4">
              {invoice.attachment_link ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`Invoice ${invoice.record_i_number}`}
                  className="max-h-[720px] w-full object-contain"
                  src={invoice.attachment_link}
                />
              ) : (
                <p className="text-sm text-foreground/60">No image yet</p>
              )}
            </section>
            <section>
              <InvoiceReviewForm invoice={invoice} items={items} />
            </section>
          </div>
        </div>
      </main>
    );
  } finally {
    await client.end();
  }
}
