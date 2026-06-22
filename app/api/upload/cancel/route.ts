import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getWebAppDb, getUserDb } from "@/lib/db";
import {
  deleteFile,
  getGoogleOAuthClient,
  getGoogleTokenExpiryDate,
} from "@/lib/drive";
import {
  clearReceiptAttachment,
  deleteReceipt,
  getReceiptById,
} from "@/lib/queries";

export const runtime = "nodejs";

type WebAppGoogleUser = {
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: Date | null;
};

async function getGoogleUser(userId: number) {
  const db = getWebAppDb();
  const result = await db.query<WebAppGoogleUser>(
    `SELECT google_access_token, google_refresh_token, google_token_expiry
     FROM users
     WHERE id = $1`,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    record_r_number?: string;
    archive_action?: "link" | "create";
  } | null;

  if (!body?.record_r_number || !body.archive_action) {
    return NextResponse.json(
      { error: "Record number and archive action are required." },
      { status: 400 },
    );
  }

  const googleUser = await getGoogleUser(session.user.id);
  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const receipt = await getReceiptById(client, body.record_r_number);

    if (!receipt) {
      return NextResponse.json({ ok: true });
    }

    if (receipt.attachment_link && googleUser) {
      const auth = getGoogleOAuthClient();
      auth.setCredentials({
        access_token: googleUser.google_access_token ?? undefined,
        refresh_token: googleUser.google_refresh_token ?? undefined,
        expiry_date: getGoogleTokenExpiryDate(googleUser.google_token_expiry),
      });
      await deleteFile(auth, receipt.attachment_link).catch((error) => {
        console.error("Could not delete Google Drive upload:", error);
      });
    }

    if (body.archive_action === "create") {
      await deleteReceipt(client, body.record_r_number);
    } else {
      await clearReceiptAttachment(client, body.record_r_number);
    }

    return NextResponse.json({ ok: true });
  } finally {
    await client.end();
  }
}
