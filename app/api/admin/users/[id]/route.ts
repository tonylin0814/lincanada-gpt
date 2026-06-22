import { NextResponse } from "next/server";
import {
  deactivateWebAppUser,
  updateWebAppUser,
  type UpdateAdminUserInput,
} from "@/lib/admin-users";
import { getCurrentSession } from "@/lib/auth";
import { initializeUserDatabase } from "@/lib/user-database-setup";

type RouteContext = {
  params: {
    id: string;
  };
};

async function requireAdmin() {
  const session = await getCurrentSession();

  if (!session?.user.is_admin) {
    return false;
  }

  return true;
}

function parseId(id: string) {
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function PUT(request: Request, { params }: RouteContext) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = parseId(params.id);

  if (!id) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const body = (await request.json()) as Partial<UpdateAdminUserInput> & {
    initialize_database?: boolean;
  };

  const supabaseConnectionString =
    typeof body.supabase_connection_string === "string"
      ? body.supabase_connection_string.trim()
      : "";

  if (body.initialize_database) {
    if (!supabaseConnectionString) {
      return NextResponse.json(
        { error: "Supabase connection string is required to initialize." },
        { status: 400 },
      );
    }

    try {
      await initializeUserDatabase(supabaseConnectionString);
    } catch (error) {
      console.error("Could not initialize user database:", error);
      return NextResponse.json(
        { error: "Could not initialize the user's Supabase database." },
        { status: 500 },
      );
    }
  }

  const user = await updateWebAppUser(id, {
    supabase_connection_string: supabaseConnectionString,
    google_drive_folder_id: body.google_drive_folder_id || null,
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = parseId(params.id);

  if (!id) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const user = await deactivateWebAppUser(id);

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user });
}
