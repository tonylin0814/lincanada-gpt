import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import {
  getInvoiceCategories,
  getInvoiceItemCategories,
  getReceiptCategories,
  getReceiptItemCategories,
} from "@/lib/queries";
import { CategoryTabs } from "./category-tabs";

export default async function CategoriesPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const [
      receiptCategories,
      receiptItemCategories,
      invoiceCategories,
      invoiceItemCategories,
    ] = await Promise.all([
      getReceiptCategories(client),
      getReceiptItemCategories(client),
      getInvoiceCategories(client),
      getInvoiceItemCategories(client),
    ]);

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold tracking-normal">
            Categories
          </h1>
          <p className="mt-2 text-sm text-foreground/65">
            Manage categories used by expense receipts and revenue invoices.
          </p>
          <CategoryTabs
            groups={[
              {
                categories: receiptCategories,
                editable: false,
                id: "receipt-category",
                label: "Receipt Category",
              },
              {
                categories: receiptItemCategories,
                editable: true,
                id: "receipt-item-category",
                label: "Receipt Item Category",
              },
              {
                categories: invoiceCategories,
                editable: false,
                id: "invoice-category",
                label: "Invoice Category",
              },
              {
                categories: invoiceItemCategories,
                editable: true,
                id: "invoice-item-category",
                label: "Invoice Item Category",
              },
            ]}
          />
        </div>
      </main>
    );
  } finally {
    await client.end();
  }
}
