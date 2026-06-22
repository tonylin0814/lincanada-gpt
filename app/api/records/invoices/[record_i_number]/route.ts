import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb, getWebAppDb } from "@/lib/db";
import {
  deleteFile,
  getGoogleOAuthClient,
  getGoogleTokenExpiryDate,
} from "@/lib/drive";
import {
  deleteInvoice,
  getInvoiceById,
  getInvoiceItems,
  markInvoiceReviewed,
  updateInvoiceForReview,
  type InvoiceUpdateInput,
} from "@/lib/queries";

type RouteContext = { params: { record_i_number: string } };

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
    const id = decodeURIComponent(params.record_i_number);
    const [invoice, items] = await Promise.all([
      getInvoiceById(client.client, id),
      getInvoiceItems(client.client, id),
    ]);
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ invoice, items });
  } finally {
    await client.client.end();
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const client = await getAuthedClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as InvoiceUpdateInput;
    const invoice = await updateInvoiceForReview(
      client.client,
      decodeURIComponent(params.record_i_number),
      body,
    );
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ invoice });
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
    const invoice = await markInvoiceReviewed(
      client.client,
      decodeURIComponent(params.record_i_number),
      body.review_notes || null,
    );
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ invoice });
  } finally {
    await client.client.end();
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const client = await getAuthedClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const record = decodeURIComponent(params.record_i_number);
    const existing = await getInvoiceById(client.client, record);

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
          console.error("Could not delete Google Drive invoice:", error);
        });
      }
    }

    const invoice = await deleteInvoice(client.client, record);
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ invoice });
  } finally {
    await client.client.end();
  }
}
