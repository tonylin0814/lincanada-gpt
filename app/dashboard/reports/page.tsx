import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import {
  getReportEntities,
  getReportSummary,
  type ReportFilters,
  type SummaryRow,
} from "@/lib/reports";

type ReportsPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

const months = [
  ["1", "January"],
  ["2", "February"],
  ["3", "March"],
  ["4", "April"],
  ["5", "May"],
  ["6", "June"],
  ["7", "July"],
  ["8", "August"],
  ["9", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"],
];

function getParam(searchParams: ReportsPageProps["searchParams"], key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function getFilters(searchParams: ReportsPageProps["searchParams"]): ReportFilters {
  const entityId = getParam(searchParams, "entity_id");
  const month = getParam(searchParams, "month");

  return {
    entity_id: entityId ? Number(entityId) : undefined,
    year: Number(getParam(searchParams, "year") ?? new Date().getFullYear()),
    month: month ? Number(month) : undefined,
  };
}

function buildExportHref(
  type: "receipts" | "invoices",
  filters: ReportFilters,
) {
  const params = new URLSearchParams();
  params.set("year", String(filters.year));
  if (filters.month) params.set("month", String(filters.month));
  if (filters.entity_id) params.set("entity_id", String(filters.entity_id));
  return `/api/reports/export/${type}?${params.toString()}`;
}

function getReportType(searchParams: ReportsPageProps["searchParams"]) {
  return getParam(searchParams, "type") === "revenue" ? "revenue" : "expense";
}

function money(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

function SummaryTable({
  title,
  label,
  rows,
}: {
  title: string;
  label: string;
  rows: SummaryRow[];
}) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
      <div className="mt-4 overflow-x-auto border border-foreground/10">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead className="bg-foreground/5">
            <tr>
              <th className="px-4 py-3 font-medium">{label}</th>
              <th className="px-4 py-3 font-medium">Count</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-foreground/10" key={row.label}>
                <td className="px-4 py-3">{row.label}</td>
                <td className="px-4 py-3">{row.count}</td>
                <td className="px-4 py-3 text-right">{money(row.total)}</td>
              </tr>
            ))}
            <tr className="border-t border-foreground/20 font-semibold">
              <td className="px-4 py-3">Grand Total</td>
              <td className="px-4 py-3">
                {rows.reduce((sum, row) => sum + row.count, 0)}
              </td>
              <td className="px-4 py-3 text-right">{money(total)}</td>
            </tr>
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-foreground/60">No records found.</p>
        ) : null}
      </div>
    </section>
  );
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/login");

  const filters = getFilters(searchParams);
  const reportType = getReportType(searchParams);
  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const [entities, summary] = await Promise.all([
      getReportEntities(client),
      getReportSummary(client, filters),
    ]);

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                {reportType === "expense" ? "Expense Reports" : "Revenue Reports"}
              </h1>
              <p className="mt-2 text-sm text-foreground/65">
                Monthly summaries and CSV exports.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {reportType === "expense" ? (
                <Link
                  className="inline-flex h-10 items-center rounded-md border border-foreground/20 px-4 text-sm font-medium"
                  href={buildExportHref("receipts", filters)}
                >
                  Export Expense CSV
                </Link>
              ) : (
                <Link
                  className="inline-flex h-10 items-center rounded-md border border-foreground/20 px-4 text-sm font-medium"
                  href={buildExportHref("invoices", filters)}
                >
                  Export Revenue CSV
                </Link>
              )}
            </div>
          </div>

          <form
            action="/dashboard/reports"
            className="mt-8 grid gap-4 border border-foreground/10 p-4 md:grid-cols-4"
          >
            <input name="type" type="hidden" value={reportType} />
            <label className="block text-sm">
              Entity
              <select
                className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
                defaultValue={filters.entity_id ?? ""}
                name="entity_id"
              >
                <option value="">All</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Year
              <input
                className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
                defaultValue={filters.year}
                min="2000"
                name="year"
                type="number"
              />
            </label>
            <label className="block text-sm">
              Month
              <select
                className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
                defaultValue={filters.month ?? ""}
                name="month"
              >
                <option value="">Full year</option>
                {months.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background"
                type="submit"
              >
                Apply
              </button>
            </div>
          </form>

          {reportType === "expense" ? (
            <SummaryTable
              label="Category"
              rows={summary.expense_summary}
              title="Expense Summary"
            />
          ) : (
            <SummaryTable
              label="Buyer"
              rows={summary.revenue_summary}
              title="Revenue Summary"
            />
          )}

          <section className="mt-8 border border-foreground/10 p-5">
            <h2 className="text-lg font-semibold tracking-normal">
              Net Position
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Revenue</dt>
                <dd>{money(summary.totals.revenue)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Expenses</dt>
                <dd>{money(summary.totals.expenses)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-foreground/10 pt-3 text-base font-semibold">
                <dt>Net</dt>
                <dd
                  className={
                    summary.totals.net >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {money(summary.totals.net)}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </main>
    );
  } finally {
    await client.end();
  }
}
