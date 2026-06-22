import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import {
  getInvoiceById,
  getInvoiceCategories,
  getInvoiceItemCategories,
  getInvoiceItems,
} from "@/lib/queries";
import type { Invoice, InvoiceItem } from "@/types/licanada_gpt";
import { InvoiceRecordClient } from "./invoice-record-client";

type InvoiceDetailPageProps = {
  params: {
    record: string;
  };
};

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
    const [invoice, items, invoiceCategories, itemCategories] =
      await Promise.all([
        getInvoiceById(client, record),
        getInvoiceItems(client, record),
        getInvoiceCategories(client),
        getInvoiceItemCategories(client),
      ]);

    if (!invoice) {
      notFound();
    }

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <InvoiceRecordClient
          invoice={serialize<Invoice>(invoice)}
          invoiceCategories={invoiceCategories}
          itemCategories={itemCategories}
          items={serialize<InvoiceItem[]>(items)}
        />
      </main>
    );
  } finally {
    await client.end();
  }
}
