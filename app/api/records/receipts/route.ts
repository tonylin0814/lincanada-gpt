import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { getReceiptsPage } from "@/lib/queries";

function getFilters(searchParams: URLSearchParams) {
  const entityId = searchParams.get("entity_id");
  const reviewed = searchParams.get("is_reviewed");

  return {
    entity_id: entityId ? Number(entityId) : undefined,
    is_reviewed:
      reviewed === "true" ? true : reviewed === "false" ? false : undefined,
    date_from: searchParams.get("date_from") || undefined,
    date_to: searchParams.get("date_to") || undefined,
    category: searchParams.get("category") || undefined,
    search: searchParams.get("search") || undefined,
    page: Number(searchParams.get("page") || 1),
    per_page: 20,
  };
}

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const { searchParams } = new URL(request.url);
    const receipts = await getReceiptsPage(client, getFilters(searchParams));
    return NextResponse.json(receipts);
  } finally {
    await client.end();
  }
}
