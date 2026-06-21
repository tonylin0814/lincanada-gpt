import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { renameCategory, type CategoryRenameType } from "@/lib/queries";

const categoryTypes: CategoryRenameType[] = [
  "receipt-category",
  "receipt-item-category",
  "invoice-category",
  "invoice-item-category",
];

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    old_name?: string;
    new_name?: string;
    type?: string;
  } | null;
  const type = body?.type as CategoryRenameType | undefined;

  if (!type || !categoryTypes.includes(type)) {
    return NextResponse.json(
      { error: "Valid category type is required." },
      { status: 400 },
    );
  }

  if (!body?.old_name?.trim() || !body.new_name?.trim()) {
    return NextResponse.json(
      { error: "Old and new category names are required." },
      { status: 400 },
    );
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    await renameCategory(client, type, body.old_name, body.new_name);
    return NextResponse.json({ ok: true });
  } finally {
    await client.end();
  }
}
