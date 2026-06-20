import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { getReviewQueue } from "@/lib/queries";
import { BulkReviewForm } from "./bulk-review-form";

export default async function ReviewQueuePage() {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/login");

  const client = await getUserDb(session.user.supabase_connection_string);
  try {
    const records = await getReviewQueue(client);
    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-semibold tracking-normal">Review Queue</h1>
          <p className="mt-2 text-sm text-foreground/65">
            Oldest unreviewed receipts and invoices first.
          </p>
          <BulkReviewForm records={records} />
        </div>
      </main>
    );
  } finally {
    await client.end();
  }
}
