import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import {
  getReceiptById,
  getReceiptCategories,
  getReceiptItemCategories,
  getReceiptItems,
} from "@/lib/queries";
import type { Receipt, ReceiptItem } from "@/types/licanada_gpt";
import { ReceiptRecordClient } from "./receipt-record-client";

type ReceiptDetailPageProps = {
  params: {
    record: string;
  };
};

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
    const record = decodeURIComponent(params.record);
    const [receipt, items, receiptCategories, itemCategories] =
      await Promise.all([
        getReceiptById(client, record),
        getReceiptItems(client, record),
        getReceiptCategories(client),
        getReceiptItemCategories(client),
      ]);

    if (!receipt) {
      notFound();
    }

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <ReceiptRecordClient
          itemCategories={itemCategories}
          items={serialize<ReceiptItem[]>(items)}
          receipt={serialize<Receipt>(receipt)}
          receiptCategories={receiptCategories}
        />
      </main>
    );
  } finally {
    await client.end();
  }
}
