import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getWebAppDb } from "@/lib/db";
import { getGoogleOAuthClient, getGoogleOAuthUrl } from "@/lib/drive";

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(getGoogleOAuthUrl(String(session.user.id)));
  }

  if (state !== String(session.user.id)) {
    return NextResponse.json({ error: "Invalid OAuth state." }, { status: 400 });
  }

  const auth = getGoogleOAuthClient();
  const { tokens } = await auth.getToken(code);
  const db = getWebAppDb();

  await db.query(
    `UPDATE users
     SET google_access_token = $2,
         google_refresh_token = COALESCE($3, google_refresh_token),
         google_token_expiry = CASE
           WHEN $4::bigint IS NULL THEN google_token_expiry
           ELSE to_timestamp($4::bigint / 1000.0)
         END
     WHERE id = $1`,
    [
      session.user.id,
      tokens.access_token ?? null,
      tokens.refresh_token ?? null,
      tokens.expiry_date ?? null,
    ],
  );

  return NextResponse.redirect(new URL("/dashboard/upload", request.url));
}
