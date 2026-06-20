import { NextResponse } from "next/server";
import {
  createWebAppUser,
  listWebAppUsers,
  type CreateAdminUserInput,
} from "@/lib/admin-users";
import { getCurrentSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getCurrentSession();

  if (!session?.user.is_admin) {
    return false;
  }

  return true;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await listWebAppUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<CreateAdminUserInput>;

  if (
    !body.name ||
    !body.email ||
    !body.password ||
    !body.supabase_connection_string
  ) {
    return NextResponse.json(
      { error: "Name, email, password, and Supabase connection are required." },
      { status: 400 },
    );
  }

  try {
    const user = await createWebAppUser({
      name: body.name,
      email: body.email,
      password: body.password,
      supabase_connection_string: body.supabase_connection_string,
      google_drive_folder_id: body.google_drive_folder_id || null,
      is_admin: Boolean(body.is_admin),
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Could not create user:", error);
    return NextResponse.json(
      { error: "Could not create user." },
      { status: 500 },
    );
  }
}
