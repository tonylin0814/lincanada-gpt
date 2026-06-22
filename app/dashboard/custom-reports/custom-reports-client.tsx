"use client";

import { useEffect, useMemo, useState } from "react";

type Company = {
  id: number;
  name: string;
};

type ReportType = "expense" | "revenue";

type CustomReportsClientProps = {
  companies: Company[];
  invoiceCategories: string[];
  receiptCategories: string[];
};

const expenseDefaultColumns = [
  "Receipt Number",
  "Date",
  "Vendor",
  "Sub-Total",
  "HST",
  "GST",
  "PST",
  "Total",
];

const revenueDefaultColumns = [
  "Invoice Number",
  "Date",
  "Client",
  "Sub-Total",
  "HST",
  "GST",
  "PST",
  "Total",
];

function storageKey(companyId: number, reportType: ReportType) {
  return `lincanada:custom-report-columns:${companyId}:${reportType}`;
}

function loadColumns(
  companyId: number | null,
  reportType: ReportType,
  fallback: string[],
) {
  if (!companyId || typeof window === "undefined") {
    return fallback;
  }

  const stored = window.localStorage.getItem(storageKey(companyId, reportType));

  if (!stored) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

function persistColumns(
  companyId: number | null,
  reportType: ReportType,
  columns: string[],
) {
  if (!companyId) {
    return;
  }

  window.localStorage.setItem(
    storageKey(companyId, reportType),
    JSON.stringify(columns),
  );
}

export function CustomReportsClient({
  companies,
  invoiceCategories,
  receiptCategories,
}: CustomReportsClientProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    companies[0]?.id ?? null,
  );
  const [activeTab, setActiveTab] = useState<ReportType>("expense");
  const [expenseColumns, setExpenseColumns] = useState(expenseDefaultColumns);
  const [revenueColumns, setRevenueColumns] = useState(revenueDefaultColumns);

  useEffect(() => {
    setExpenseColumns(
      loadColumns(selectedCompanyId, "expense", expenseDefaultColumns),
    );
    setRevenueColumns(
      loadColumns(selectedCompanyId, "revenue", revenueDefaultColumns),
    );
  }, [selectedCompanyId]);

  const activeConfig = useMemo(() => {
    if (activeTab === "expense") {
      return {
        categories: receiptCategories,
        columns: expenseColumns,
        defaultColumns: expenseDefaultColumns,
        label: "Receipt Categories",
        reportType: "expense" as const,
        setColumns: setExpenseColumns,
      };
    }

    return {
      categories: invoiceCategories,
      columns: revenueColumns,
      defaultColumns: revenueDefaultColumns,
      label: "Invoice Categories",
      reportType: "revenue" as const,
      setColumns: setRevenueColumns,
    };
  }, [
    activeTab,
    expenseColumns,
    invoiceCategories,
    receiptCategories,
    revenueColumns,
  ]);

  function changeCompany(nextValue: string) {
    setSelectedCompanyId(nextValue ? Number(nextValue) : null);
  }

  function addColumn(category: string) {
    activeConfig.setColumns((current) => {
      if (current.includes(category)) {
        return current;
      }

      const next = [...current, category];
      persistColumns(selectedCompanyId, activeConfig.reportType, next);
      return next;
    });
  }

  function removeColumn(column: string) {
    activeConfig.setColumns((current) => {
      const next = current.filter((item) => item !== column);
      persistColumns(selectedCompanyId, activeConfig.reportType, next);
      return next;
    });
  }

  return (
    <section className="mt-6 rounded-md border border-green-600 p-4">
      <label className="block max-w-sm text-sm font-medium">
        Company
        <select
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3 text-sm"
          disabled={companies.length === 0}
          onChange={(event) => changeCompany(event.currentTarget.value)}
          value={selectedCompanyId ?? ""}
        >
          {companies.length === 0 ? <option value="">No company yet</option> : null}
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-foreground/10">
        <button
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-foreground/5 ${
            activeTab === "expense"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-foreground/65"
          }`}
          onClick={() => setActiveTab("expense")}
          type="button"
        >
          Expense Report
        </button>
        <button
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-foreground/5 ${
            activeTab === "revenue"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-foreground/65"
          }`}
          onClick={() => setActiveTab("revenue")}
          type="button"
        >
          Revenue Report
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(260px,0.9fr)_minmax(360px,1.1fr)]">
        <div className="rounded-md border border-foreground/10">
          <div className="border-b border-foreground/10 px-4 py-3">
            <h2 className="text-base font-semibold">{activeConfig.label}</h2>
          </div>
          <div className="max-h-[440px] overflow-auto p-3">
            {activeConfig.categories.length === 0 ? (
              <p className="px-1 py-2 text-sm text-foreground/60">
                No categories yet.
              </p>
            ) : (
              <ul className="grid gap-2">
                {activeConfig.categories.map((category) => {
                  const isSelected = activeConfig.columns.includes(category);

                  return (
                    <li key={category}>
                      <button
                        className={`flex min-h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                          isSelected
                            ? "border-green-600 bg-green-50 text-green-900"
                            : "border-foreground/10 hover:border-blue-700 hover:bg-blue-50"
                        }`}
                        onClick={() => addColumn(category)}
                        onDoubleClick={() => addColumn(category)}
                        type="button"
                      >
                        <span className="break-words">{category}</span>
                        {isSelected ? (
                          <span className="ml-3 text-xs font-semibold">Added</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-md border border-foreground/10">
          <div className="border-b border-foreground/10 px-4 py-3">
            <h2 className="text-base font-semibold">Col Order Items</h2>
          </div>
          <ol className="max-h-[440px] overflow-auto p-3">
            {activeConfig.columns.map((column, index) => {
              const removable = !activeConfig.defaultColumns.includes(column);

              return (
                <li
                  className="mb-2 grid min-h-11 grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-md border border-foreground/10 px-3 py-2 text-sm"
                  key={`${column}-${index}`}
                >
                  <span className="text-sm font-semibold text-foreground/55">
                    {index + 1}
                  </span>
                  <span className="break-words">{column}</span>
                  {removable ? (
                    <button
                      aria-label={`Remove ${column}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-foreground/20 text-sm font-semibold transition-colors hover:border-red-700 hover:bg-red-50 hover:text-red-700"
                      onClick={() => removeColumn(column)}
                      type="button"
                    >
                      X
                    </button>
                  ) : (
                    <span className="h-8 w-8" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
