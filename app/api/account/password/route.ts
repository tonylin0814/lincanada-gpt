import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getWebAppDb } from "@/lib/db";

export async function PUT(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const passwordHash = await hash(password, 12);
  const db = getWebAppDb();
  const result = await db.query<{ id: number }>(
    `UPDATE users
     SET password_hash = $2
     WHERE id = $1
     RETURNING id`,
    [session.user.id, passwordHash],
  );

  if (!result.rows[0]) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
