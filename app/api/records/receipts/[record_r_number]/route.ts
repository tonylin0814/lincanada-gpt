import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb, getWebAppDb } from "@/lib/db";
import {
  deleteFile,
  getGoogleOAuthClient,
  getGoogleTokenExpiryDate,
} from "@/lib/drive";
import {
  getReceiptById,
  getReceiptItems,
  deleteReceipt,
  markReceiptReviewed,
  updateReceiptForReview,
  type ReceiptUpdateInput,
} from "@/lib/queries";

type RouteContext = { params: { record_r_number: string } };

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

async function getAuthedClient() {
  const session = await getCurrentSession();
  if (!session?.user) return null;
  return {
    client: await getUserDb(session.user.supabase_connection_string),
    session,
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const client = await getAuthedClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = decodeURIComponent(params.record_r_number);
    const [receipt, items] = await Promise.all([
      getReceiptById(client.client, id),
      getReceiptItems(client.client, id),
    ]);
    if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ receipt, items });
  } finally {
    await client.client.end();
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const client = await getAuthedClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as ReceiptUpdateInput;
    const receipt = await updateReceiptForReview(
      client.client,
      decodeURIComponent(params.record_r_number),
      body,
    );
    if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ receipt });
  } finally {
    await client.client.end();
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const client = await getAuthedClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      review_notes?: string;
    };
    const receipt = await markReceiptReviewed(
      client.client,
      decodeURIComponent(params.record_r_number),
      body.review_notes || null,
    );
    if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ receipt });
  } finally {
    await client.client.end();
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const client = await getAuthedClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const record = decodeURIComponent(params.record_r_number);
    const existing = await getReceiptById(client.client, record);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.attachment_link) {
      const googleUser = await getGoogleUser(client.session.user.id);

      if (googleUser) {
        const auth = getGoogleOAuthClient();
        auth.setCredentials({
          access_token: googleUser.google_access_token ?? undefined,
          refresh_token: googleUser.google_refresh_token ?? undefined,
          expiry_date: getGoogleTokenExpiryDate(googleUser.google_token_expiry),
        });
        await deleteFile(auth, existing.attachment_link).catch((error) => {
          console.error("Could not delete Google Drive receipt:", error);
        });
      }
    }

    const receipt = await deleteReceipt(
      client.client,
      record,
    );
    if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ receipt });
  } finally {
    await client.client.end();
  }
}
