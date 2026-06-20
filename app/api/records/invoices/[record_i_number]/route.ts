import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import {
  getInvoiceById,
  getInvoiceItems,
  markInvoiceReviewed,
  updateInvoiceForReview,
  type InvoiceUpdateInput,
} from "@/lib/queries";

type RouteContext = { params: { record_i_number: string } };

async function getAuthedClient() {
  const session = await getCurrentSession();
  if (!session?.user) return null;
  return getUserDb(session.user.supabase_connection_string);
}

export async function GET(_request: Request, { params }: RouteContext) {
  const client = await getAuthedClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = decodeURIComponent(params.record_i_number);
    const [invoice, items] = await Promise.all([
      getInvoiceById(client, id),
      getInvoiceItems(client, id),
    ]);
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ invoice, items });
  } finally {
    await client.end();
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const client = await getAuthedClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as InvoiceUpdateInput;
    const invoice = await updateInvoiceForReview(
      client,
      decodeURIComponent(params.record_i_number),
      body,
    );
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ invoice });
  } finally {
    await client.end();
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
      client,
      decodeURIComponent(params.record_i_number),
      body.review_notes || null,
    );
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ invoice });
  } finally {
    await client.end();
  }
}
