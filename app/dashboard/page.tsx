import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { getEntities } from "@/lib/queries";
import { getReportSummary } from "@/lib/reports";

function money(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

function SummaryBlock({
  title,
  total,
  count,
  recordsHref,
  reportsHref,
}: {
  title: string;
  total: number;
  count: number;
  recordsHref: string;
  reportsHref: string;
}) {
  return (
    <section className="rounded-md border border-foreground/10 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
          <p className="mt-1 text-sm text-foreground/60">
            {count} record{count === 1 ? "" : "s"} this year
          </p>
        </div>
        <p className="text-xl font-semibold">{money(total)}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="inline-flex h-10 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background"
          href={recordsHref}
        >
          Open Records
        </Link>
        <Link
          className="inline-flex h-10 items-center rounded-md border border-foreground/20 px-4 text-sm font-medium"
          href={reportsHref}
        >
          Open Reports
        </Link>
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.supabase_connection_string) {
    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-4xl">
          <section className="border border-foreground/10 p-5">
            <h1 className="text-2xl font-semibold tracking-normal">
              Account Created
            </h1>
            <p className="mt-3 text-sm text-foreground/65">
              Your Google account is registered. This user still needs a
              Supabase database connection before records, uploads, and reports
              can be used.
            </p>
            <p className="mt-4 text-sm font-medium">
              Ask an admin to add the Supabase connection string for{" "}
              {session.user.email}.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const year = new Date().getFullYear();
  const client = await getUserDb(
    session.user.supabase_connection_string,
  ).catch(() => null);

  if (!client) {
    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-4xl">
          <section className="border border-red-200 p-5">
            <h1 className="text-2xl font-semibold tracking-normal">
              Database Connection Needs Attention
            </h1>
            <p className="mt-3 text-sm text-foreground/65">
              Your account is connected, but the app could not open your
              Supabase database. Please ask an admin to check the Supabase
              connection string for {session.user.email}.
            </p>
          </section>
        </div>
      </main>
    );
  }

  try {
    const [summary, entities] = await Promise.all([
      getReportSummary(client, { year }),
      getEntities(client),
    ]);
    const expenseCount = summary.expense_summary.reduce(
      (total, row) => total + row.count,
      0,
    );
    const revenueCount = summary.revenue_summary.reduce(
      (total, row) => total + row.count,
      0,
    );

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-6xl">
          <section className="border border-foreground/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-normal">
                  Dashboard
                </h1>
                <p className="mt-2 text-sm text-foreground/65">
                  Current year summary for your finance records.
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="text-foreground/60">Net position</p>
                <p
                  className={
                    summary.totals.net >= 0
                      ? "text-xl font-semibold text-green-700"
                      : "text-xl font-semibold text-red-700"
                  }
                >
                  {money(summary.totals.net)}
                </p>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <SummaryBlock
              count={expenseCount}
              recordsHref="/dashboard/records?tab=receipts"
              reportsHref="/dashboard/reports?type=expense"
              title="Expenses"
              total={summary.totals.expenses}
            />
            <SummaryBlock
              count={revenueCount}
              recordsHref="/dashboard/records?tab=invoices"
              reportsHref="/dashboard/reports?type=revenue"
              title="Revenue"
              total={summary.totals.revenue}
            />
          </div>

          <section className="mt-6 border border-foreground/10 p-5">
            <h2 className="text-lg font-semibold tracking-normal">
              Data Sources
            </h2>
            <p className="mt-1 text-sm text-foreground/60">
              Personal and company names are loaded from your connected data.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {entities.map((entity) => (
                <div
                  className="rounded-md border border-foreground/10 px-4 py-3 text-sm"
                  key={entity.id}
                >
                  <p className="font-medium">{entity.name}</p>
                  <p className="mt-1 text-foreground/60">
                    {entity.type === "company" ? "Company" : "Personal"} ·{" "}
                    {entity.currency}
                  </p>
                </div>
              ))}
              {entities.length === 0 ? (
                <p className="text-sm text-foreground/60">
                  No entities found in your data yet.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    );
  } finally {
    await client.end();
  }
}
