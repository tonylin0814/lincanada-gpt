import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    supabase_connection_string?: unknown;
  } | null;
  const connectionString =
    typeof body?.supabase_connection_string === "string"
      ? body.supabase_connection_string.trim()
      : "";

  if (!connectionString) {
    return NextResponse.json(
      { error: "Supabase connection string is required." },
      { status: 400 },
    );
  }

  const client = await getUserDb(connectionString).catch(() => null);

  if (!client) {
    return NextResponse.json(
      { error: "Could not connect to this Supabase database." },
      { status: 400 },
    );
  }

  try {
    await client.query("SELECT 1");
    return NextResponse.json({ ok: true });
  } finally {
    await client.end();
  }
}
