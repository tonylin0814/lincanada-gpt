"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type DashboardNavigationProps = {
  entities: NavigationEntity[];
  isAdmin: boolean;
  unreviewedCount: number;
};

export type NavigationEntity = {
  id: number;
  name: string;
  type: string;
};

const selectedCompanyKey = "lincanada:selected-company-id";

function buildHref(path: string, params: Record<string, string | number | null>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return `${path}${queryString ? `?${queryString}` : ""}`;
}

function SectionLinks({
  entityId,
  kind,
}: {
  entityId: number | null;
  kind: "expense" | "revenue";
}) {
  const isExpense = kind === "expense";
  const tab = isExpense ? "receipts" : "invoices";
  const mode = isExpense ? "expense" : "revenue";

  return (
    <div className="mt-2 grid gap-1">
      <Link
        className="rounded px-2 py-1.5 hover:bg-foreground/5"
        href={buildHref("/dashboard/records", { tab, entity_id: entityId })}
      >
        {isExpense ? "Expense Records" : "Revenue Records"}
      </Link>
      <Link
        className="rounded px-2 py-1.5 hover:bg-foreground/5"
        href={buildHref("/dashboard/upload", { mode, entity_id: entityId })}
      >
        {isExpense ? "Upload Receipts" : "Upload Invoices"}
      </Link>
      <Link
        className="rounded px-2 py-1.5 hover:bg-foreground/5"
        href={buildHref("/dashboard/reports", { type: kind, entity_id: entityId })}
      >
        {isExpense ? "Expense Reports" : "Revenue Reports"}
      </Link>
    </div>
  );
}

function FinanceMenu({
  title,
  entities,
  selectedCompanyId,
  onCompanyChange,
  kind,
}: {
  title: string;
  entities: NavigationEntity[];
  selectedCompanyId: number | null;
  onCompanyChange: (id: number) => void;
  kind: "expense" | "revenue";
}) {
  const personalEntity = entities.find((entity) => entity.type === "personal");
  const companyEntities = entities.filter((entity) => entity.type === "company");
  const activeCompany =
    companyEntities.find((entity) => entity.id === selectedCompanyId) ??
    companyEntities[0] ??
    null;

  return (
    <div className="group relative">
      <button
        className="h-9 rounded-md px-2 text-foreground/75 hover:bg-foreground/5 hover:text-foreground"
        type="button"
      >
        {title}
      </button>
      <div className="invisible absolute left-0 top-full z-50 w-72 rounded-md border border-foreground/10 bg-background p-3 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
        <div className="rounded-md border border-foreground/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
            Personal
          </p>
          <SectionLinks entityId={personalEntity?.id ?? null} kind={kind} />
        </div>

        <div className="mt-3 rounded-md border border-foreground/10 p-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
            Company
            <select
              className="mt-2 h-9 w-full rounded-md border border-foreground/20 bg-background px-2 text-sm font-normal normal-case tracking-normal text-foreground"
              disabled={companyEntities.length === 0}
              onChange={(event) => onCompanyChange(Number(event.currentTarget.value))}
              value={activeCompany?.id ?? ""}
            >
              {companyEntities.length === 0 ? (
                <option value="">No company yet</option>
              ) : null}
              {companyEntities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </label>
          <SectionLinks entityId={activeCompany?.id ?? null} kind={kind} />
        </div>
      </div>
    </div>
  );
}

export function DashboardNavigation({
  entities,
  isAdmin,
  unreviewedCount,
}: DashboardNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const companyEntities = useMemo(
    () => entities.filter((entity) => entity.type === "company"),
    [entities],
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    companyEntities[0]?.id ?? null,
  );

  useEffect(() => {
    const queryEntityId = searchParams.get("entity_id");
    const stored = window.localStorage.getItem(selectedCompanyKey);
    const queryId = Number(queryEntityId ?? "");
    const storedId = Number(stored ?? "");
    const fallbackId = companyEntities[0]?.id ?? null;
    const nextId = companyEntities.some((entity) => entity.id === queryId)
      ? queryId
      : companyEntities.some((entity) => entity.id === storedId)
        ? storedId
        : fallbackId;

    if (nextId) {
      setSelectedCompanyId(nextId);
      window.localStorage.setItem(selectedCompanyKey, String(nextId));
    }
  }, [companyEntities, searchParams]);

  function changeCompany(id: number) {
    setSelectedCompanyId(id);
    window.localStorage.setItem(selectedCompanyKey, String(id));

    if (
      pathname.startsWith("/dashboard/records") ||
      pathname.startsWith("/dashboard/reports") ||
      pathname.startsWith("/dashboard/upload")
    ) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("entity_id", String(id));
      router.push(`${pathname}?${params.toString()}`);
    }
  }

  return (
    <nav className="mx-auto flex max-w-6xl items-center gap-4">
      <Link className="flex items-center gap-2 font-semibold" href="/dashboard">
        <Image
          alt=""
          className="h-8 w-8 rounded-lg"
          height={32}
          src="/lin-system-logo.png"
          width={32}
        />
        Lin System
      </Link>
      <FinanceMenu
        entities={entities}
        kind="expense"
        onCompanyChange={changeCompany}
        selectedCompanyId={selectedCompanyId}
        title="Expense"
      />
      <FinanceMenu
        entities={entities}
        kind="revenue"
        onCompanyChange={changeCompany}
        selectedCompanyId={selectedCompanyId}
        title="Revenue"
      />
      <Link className="text-foreground/75 hover:text-foreground" href="/dashboard/review">
        Review
        {unreviewedCount > 0 ? (
          <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-xs text-background">
            {unreviewedCount}
          </span>
        ) : null}
      </Link>
      {isAdmin ? (
        <Link className="text-foreground/75 hover:text-foreground" href="/admin">
          Admin Panel
        </Link>
      ) : null}
    </nav>
  );
}
