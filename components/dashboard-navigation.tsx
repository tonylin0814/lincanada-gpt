"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { startPageLoading } from "@/components/page-loading-indicator";

type DashboardNavigationProps = {
  enabledFeatures: string[];
  entities: NavigationEntity[];
  isAdmin: boolean;
  userName: string;
};

export type NavigationEntity = {
  id: number;
  name: string;
  type: string;
};

const selectedCompanyKey = "lincanada:selected-company-id";
const menuItemClass =
  "block rounded-md px-3 py-2 text-foreground/75 hover:bg-blue-700 hover:text-white focus-visible:bg-blue-700 focus-visible:text-white";

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

function FinanceActionLinks({
  entityId,
  showExpense,
  showRevenue,
}: {
  entityId: number | null;
  showExpense: boolean;
  showRevenue: boolean;
}) {
  return (
    <div className="mt-2 grid gap-1">
      {showExpense ? (
        <div>
          <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/45">
            Expense
          </p>
          <Link
            className={menuItemClass}
            href={buildHref("/dashboard/records", {
              entity_id: entityId,
              tab: "receipts",
            })}
          >
            Expense Records
          </Link>
          <Link
            className={menuItemClass}
            href={buildHref("/dashboard/upload", {
              entity_id: entityId,
              mode: "expense",
            })}
          >
            Upload Receipts
          </Link>
          <Link
            className={menuItemClass}
            href={buildHref("/dashboard/reports", {
              entity_id: entityId,
              type: "expense",
            })}
          >
            Expense Reports
          </Link>
        </div>
      ) : null}
      {showRevenue ? (
        <div
          className={
            showExpense ? "mt-2 border-t border-foreground/10 pt-2" : ""
          }
        >
          <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/45">
            Revenue
          </p>
          <Link
            className={menuItemClass}
            href={buildHref("/dashboard/records", {
              entity_id: entityId,
              tab: "invoices",
            })}
          >
            Revenue Records
          </Link>
          <Link
            className={menuItemClass}
            href={buildHref("/dashboard/upload", {
              entity_id: entityId,
              mode: "revenue",
            })}
          >
            Upload Invoices
          </Link>
          <Link
            className={menuItemClass}
            href={buildHref("/dashboard/reports", {
              entity_id: entityId,
              type: "revenue",
            })}
          >
            Revenue Reports
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function FinanceMenu({
  entities,
  selectedCompanyId,
  onCompanyChange,
  showCompanyExpense,
  showCompanyRevenue,
  showPersonalExpense,
  showPersonalRevenue,
}: {
  entities: NavigationEntity[];
  selectedCompanyId: number | null;
  onCompanyChange: (id: number) => void;
  showCompanyExpense: boolean;
  showCompanyRevenue: boolean;
  showPersonalExpense: boolean;
  showPersonalRevenue: boolean;
}) {
  const personalEntity = entities.find((entity) => entity.type === "personal");
  const companyEntities = entities.filter((entity) => entity.type === "company");
  const activeCompany =
    companyEntities.find((entity) => entity.id === selectedCompanyId) ??
    companyEntities[0] ??
    null;
  const showPersonal = showPersonalExpense || showPersonalRevenue;
  const showCompany = showCompanyExpense || showCompanyRevenue;

  return (
    <div className="group relative">
      <button
        className="h-9 rounded-md px-2 text-foreground/75 group-hover:bg-foreground/5 group-hover:text-foreground hover:bg-foreground/5 hover:text-foreground"
        type="button"
      >
        Finance
      </button>
      <div className="invisible absolute left-0 top-full z-50 w-72 rounded-md border border-foreground/10 bg-background p-3 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
        {showPersonal ? (
          <div className="rounded-md border border-foreground/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
              Personal
            </p>
            <FinanceActionLinks
              entityId={personalEntity?.id ?? null}
              showExpense={showPersonalExpense}
              showRevenue={showPersonalRevenue}
            />
          </div>
        ) : null}

        {showCompany ? (
          <div className={showPersonal ? "mt-3 rounded-md border border-foreground/10 p-3" : "rounded-md border border-foreground/10 p-3"}>
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
            <FinanceActionLinks
              entityId={activeCompany?.id ?? null}
              showExpense={showCompanyExpense}
              showRevenue={showCompanyRevenue}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HealthMenu({ showBloodPressure }: { showBloodPressure: boolean }) {
  if (!showBloodPressure) {
    return null;
  }

  return (
    <div className="group relative">
      <button
        className="h-9 rounded-md px-2 text-foreground/75 group-hover:bg-foreground/5 group-hover:text-foreground hover:bg-foreground/5 hover:text-foreground"
        type="button"
      >
        Health
      </button>
      <div className="invisible absolute left-0 top-full z-50 w-64 rounded-md border border-foreground/10 bg-background p-3 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
        <Link className={menuItemClass} href="/dashboard/health/blood-pressure">
          Blood Pressure
        </Link>
      </div>
    </div>
  );
}

export function DashboardNavigation({
  enabledFeatures,
  entities,
  isAdmin,
  userName,
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
    } else {
      setSelectedCompanyId(null);
      window.localStorage.removeItem(selectedCompanyKey);
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
      startPageLoading();
      router.push(`${pathname}?${params.toString()}`);
    }
  }

  const hasFeature = (featureKey: string) => enabledFeatures.includes(featureKey);
  const showFinance =
    hasFeature("personal_expense") ||
    hasFeature("personal_revenue") ||
    hasFeature("company_expense") ||
    hasFeature("company_revenue");

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
      {showFinance ? (
        <FinanceMenu
          entities={entities}
          onCompanyChange={changeCompany}
          selectedCompanyId={selectedCompanyId}
          showCompanyExpense={hasFeature("company_expense")}
          showCompanyRevenue={hasFeature("company_revenue")}
          showPersonalExpense={hasFeature("personal_expense")}
          showPersonalRevenue={hasFeature("personal_revenue")}
        />
      ) : null}
      <HealthMenu showBloodPressure={hasFeature("blood_pressure")} />
      <Link className="text-foreground/75 hover:text-foreground" href="/dashboard/categories">
        Categories
      </Link>
      <Link className="text-foreground/75 hover:text-foreground" href="/dashboard/settings">
        Settings
      </Link>
      {isAdmin ? (
        <Link className="text-foreground/75 hover:text-foreground" href="/admin">
          Admin Panel
        </Link>
      ) : null}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm font-medium text-foreground/70">
          Welcome, {userName}
        </span>
        <button
          className="h-9 rounded-md border border-foreground/20 px-3 text-sm font-medium text-foreground/75 transition-colors hover:border-red-700 hover:bg-red-50 hover:text-red-700"
          onClick={() => signOut({ callbackUrl: "/login" })}
          type="button"
        >
          Log Out
        </button>
      </div>
    </nav>
  );
}
