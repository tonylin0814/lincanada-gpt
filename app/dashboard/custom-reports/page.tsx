import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import {
  getEntities,
  getInvoiceCategories,
  getReceiptCategories,
} from "@/lib/queries";
import { CustomReportsClient } from "./custom-reports-client";

export default async function CustomReportsPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const [entities, receiptCategories, invoiceCategories] = await Promise.all([
      getEntities(client),
      getReceiptCategories(client),
      getInvoiceCategories(client),
    ]);
    const companies = entities
      .filter((entity) => entity.type === "company")
      .map((entity) => ({
        id: entity.id,
        name: entity.name,
      }));

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-semibold tracking-normal">
            Custom Reports
          </h1>
          <p className="mt-2 text-sm text-foreground/65">
            Set company report columns for exported files.
          </p>
          <CustomReportsClient
            companies={companies}
            invoiceCategories={invoiceCategories}
            receiptCategories={receiptCategories}
          />
        </div>
      </main>
    );
  } finally {
    await client.end();
  }
}
