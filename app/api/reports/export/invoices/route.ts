import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import {
  getInvoiceExportRows,
  invoicesToCsv,
  type ReportFilters,
} from "@/lib/reports";

function parseFilters(searchParams: URLSearchParams): ReportFilters {
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = searchParams.get("month");
  const entityId = searchParams.get("entity_id");

  return {
    entity_id: entityId ? Number(entityId) : undefined,
    year,
    month: month ? Number(month) : undefined,
  };
}

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await getUserDb(session.user.supabase_connection_string);
  try {
    const invoices = await getInvoiceExportRows(
      client,
      parseFilters(new URL(request.url).searchParams),
    );
    return new NextResponse(invoicesToCsv(invoices), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="invoices.csv"',
      },
    });
  } finally {
    await client.end();
  }
}
