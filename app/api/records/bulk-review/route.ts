import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { markRecordsReviewed } from "@/lib/queries";

type BulkReviewRecord = {
  type: "receipt" | "invoice";
  id: string;
};

export async function PATCH(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { records?: BulkReviewRecord[] };
  const records = body.records ?? [];

  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: "No records selected." }, { status: 400 });
  }

  const validRecords = records.filter(
    (record) =>
      (record.type === "receipt" || record.type === "invoice") && record.id,
  );

  const client = await getUserDb(session.user.supabase_connection_string);
  try {
    await markRecordsReviewed(client, validRecords);
    return NextResponse.json({ updated: validRecords.length });
  } finally {
    await client.end();
  }
}
