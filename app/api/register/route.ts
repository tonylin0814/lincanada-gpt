import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { getWebAppDb } from "@/lib/db";

type RegisterBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json()) as RegisterBody;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    const db = getWebAppDb();
    const passwordHash = await hash(password, 12);

    await db.query(
      `INSERT INTO users (
         name,
         email,
         password_hash,
         supabase_connection_string,
         is_admin,
         is_active
       )
       VALUES ($1, $2, $3, '', FALSE, TRUE)`,
      [name, email, passwordHash],
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "This email is already registered." },
        { status: 409 },
      );
    }

    console.error("Could not register user:", error);
    return NextResponse.json(
      { error: "Could not register account." },
      { status: 500 },
    );
  }
}
