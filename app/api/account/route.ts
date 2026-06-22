import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getWebAppDb } from "@/lib/db";

export async function PUT(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json(
      { error: "Name is required." },
      { status: 400 },
    );
  }

  const db = getWebAppDb();
  const result = await db.query<{ id: number; name: string; email: string }>(
    `UPDATE users
     SET name = $2
     WHERE id = $1
     RETURNING id, name, email`,
    [session.user.id, name],
  );

  const user = result.rows[0];

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user });
}
