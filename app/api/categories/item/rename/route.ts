import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { renameItemCategory } from "@/lib/queries";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    old_name?: string;
    new_name?: string;
  } | null;

  if (!body?.old_name?.trim() || !body.new_name?.trim()) {
    return NextResponse.json(
      { error: "Old and new category names are required." },
      { status: 400 },
    );
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    await renameItemCategory(client, body.old_name, body.new_name);
    return NextResponse.json({ ok: true });
  } finally {
    await client.end();
  }
}
