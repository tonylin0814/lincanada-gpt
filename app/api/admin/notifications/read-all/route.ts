import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { markAllAdminNotificationsRead } from "@/lib/features";

export async function POST() {
  const session = await getCurrentSession();

  if (!session?.user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const count = await markAllAdminNotificationsRead();

  return NextResponse.json({ count });
}
