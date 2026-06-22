"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type DashboardEntity = {
  id: number;
  name: string;
  type: string;
};

type ExpenseSummary = {
  entity_id: number;
  count: number;
  total: number;
};

type PendingReceipt = {
  entity_id: number;
};

type DashboardClientProps = {
  availableYears: number[];
  entities: DashboardEntity[];
  summaries: ExpenseSummary[];
  pendingReceipts: PendingReceipt[];
  year: number;
};

function money(value: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(value);
}

function getSummary(summaries: ExpenseSummary[], entityId?: number) {
  if (!entityId) return { entity_id: 0, count: 0, total: 0 };
  return (
    summaries.find((summary) => summary.entity_id === entityId) ?? {
      entity_id: entityId,
      count: 0,
      total: 0,
    }
  );
}

function ExpenseBlock({
  title,
  entity,
  summary,
  year,
  children,
}: {
  title: string;
  entity?: DashboardEntity;
  summary: ExpenseSummary;
  year: number;
  children?: React.ReactNode;
}) {
  const dateFrom = `${year}-01-01`;
  const dateTo = `${year}-12-31`;
  const recordsHref = entity
    ? `/dashboard/records?tab=receipts&entity_id=${entity.id}&date_from=${dateFrom}&date_to=${dateTo}`
    : `/dashboard/records?tab=receipts&date_from=${dateFrom}&date_to=${dateTo}`;
  const reportsHref = entity
    ? `/dashboard/reports?type=expense&entity_id=${entity.id}&year=${year}`
    : `/dashboard/reports?type=expense&year=${year}`;

  return (
    <section className="rounded-md border border-foreground/10 p-5">
      <div className="flex min-h-24 flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
            <p className="mt-1 text-sm text-foreground/60">
              {summary.count} expense record{summary.count === 1 ? "" : "s"}{" "}
              in {year}
            </p>
          </div>
          <p className="text-xl font-semibold">{money(summary.total)}</p>
        </div>
        {children}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="inline-flex h-10 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85"
          href={recordsHref}
        >
          Open Records
        </Link>
        <Link
          className="inline-flex h-10 items-center rounded-md border border-foreground/20 px-4 text-sm font-medium transition-colors hover:border-foreground/45 hover:bg-foreground/5"
          href={reportsHref}
        >
          Open Reports
        </Link>
      </div>
    </section>
  );
}

function PendingBlock({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <section className="rounded-md border border-foreground/10 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
          <p className="mt-1 text-sm text-foreground/60">
            Receipts waiting for Google Drive upload
          </p>
        </div>
        <p
          className={
            count > 0
              ? "text-3xl font-semibold text-red-700"
              : "text-3xl font-semibold text-green-700"
          }
        >
          {count}
        </p>
      </div>
    </section>
  );
}

export function DashboardClient({
  availableYears,
  entities,
  summaries,
  pendingReceipts,
  year,
}: DashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const personalEntity =
    entities.find((entity) => entity.type === "personal") ?? entities[0];
  const companies = entities.filter((entity) => entity.type === "company");
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    String(companies[0]?.id ?? ""),
  );
  const selectedCompany = companies.find(
    (company) => String(company.id) === selectedCompanyId,
  );
  const personalSummary = getSummary(summaries, personalEntity?.id);
  const companySummary = getSummary(summaries, selectedCompany?.id);
  const personalPending = useMemo(
    () =>
      pendingReceipts.filter(
        (receipt) => receipt.entity_id === personalEntity?.id,
      ),
    [pendingReceipts, personalEntity?.id],
  );
  const companyPending = useMemo(
    () =>
      selectedCompany
        ? pendingReceipts.filter(
            (receipt) => receipt.entity_id === selectedCompany.id,
          )
        : [],
    [pendingReceipts, selectedCompany],
  );

  function changeYear(nextYear: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", nextYear);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <label className="block w-full max-w-48">
          <span className="text-sm font-medium">Year</span>
          <select
            className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3 text-sm outline-none transition-colors hover:border-foreground/45 focus:border-foreground"
            onChange={(event) => changeYear(event.target.value)}
            value={year}
          >
            {availableYears.map((availableYear) => (
              <option key={availableYear} value={availableYear}>
                {availableYear}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ExpenseBlock
          entity={personalEntity}
          summary={personalSummary}
          title="Personal Expenses"
          year={year}
        />
        <ExpenseBlock
          entity={selectedCompany}
          summary={companySummary}
          title="Company Expenses"
          year={year}
        >
          <label className="block max-w-sm">
            <span className="text-sm font-medium">Company</span>
            <select
              className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3 text-sm outline-none transition-colors hover:border-foreground/45 focus:border-foreground"
              disabled={companies.length === 0}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              value={selectedCompanyId}
            >
              {companies.length > 0 ? (
                companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))
              ) : (
                <option value="">No company found</option>
              )}
            </select>
          </label>
        </ExpenseBlock>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <PendingBlock
          count={personalPending.length}
          title="Personal Expenses Upload Pending"
        />
        <PendingBlock
          count={companyPending.length}
          title="Company Expenses Upload Pending"
        />
      </div>
    </>
  );
}
