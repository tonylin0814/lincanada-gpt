import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { getUserFeatures, syncUserRecordTypes } from "@/lib/features";
import { getBloodPressureLogs } from "@/lib/health";
import type { Entity } from "@/types/licanada_gpt";
import { DashboardClient } from "./dashboard-client";

function SetupMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-4xl">
        <section className="border border-foreground/10 p-5">
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-3 text-sm text-foreground/65">{message}</p>
        </section>
      </div>
    </main>
  );
}

type DashboardPageProps = {
  searchParams?: {
    year?: string | string[];
  };
};

function parseYear(value: string | string[] | undefined) {
  const year = Array.isArray(value) ? value[0] : value;
  if (year === "all") return "all";
  const parsed = Number(year);
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100
    ? parsed
    : null;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.supabase_connection_string) {
    return (
      <SetupMessage
        message={`Your account is registered, but it still needs a Supabase database connection before records, uploads, and reports can be used. Ask an admin to add the Supabase connection string for ${session.user.email}.`}
        title="Account Registered"
      />
    );
  }

  const requestedYear = parseYear(searchParams?.year);
  const currentYear = new Date().getFullYear();
  const client = await getUserDb(
    session.user.supabase_connection_string,
  ).catch(() => null);

  if (!client) {
    return (
      <SetupMessage
        message={`Your account is connected, but the app could not open your Supabase database. Please ask an admin to check the Supabase connection string for ${session.user.email}.`}
        title="Database Connection Needs Attention"
      />
    );
  }

  try {
    await syncUserRecordTypes(session.user.id, client).catch((error) => {
      console.error("Could not sync user record types:", error);
    });
    const enabledFeatures = await getUserFeatures(session.user.id);
    const showBloodPressure = enabledFeatures.some(
      (feature) => feature.key === "blood_pressure" && feature.is_enabled,
    );

    const yearsResult = await client.query<{ year: string }>(
      `SELECT DISTINCT EXTRACT(YEAR FROM receipt_date)::int AS year
       FROM receipts
       WHERE receipt_date IS NOT NULL
       ORDER BY year DESC`,
    );
    const availableYears = yearsResult.rows.map((row) => Number(row.year));
    const selectedYear =
      requestedYear ??
      (availableYears.includes(currentYear) ? currentYear : availableYears[0]) ??
      currentYear;

    if (typeof selectedYear === "number" && !availableYears.includes(selectedYear)) {
      availableYears.unshift(selectedYear);
    }

    const summarySql =
      selectedYear === "all"
        ? `SELECT entity_id,
                  COUNT(*) AS count,
                  COALESCE(SUM(grand_total), 0) AS total
           FROM receipts
           GROUP BY entity_id`
        : `SELECT entity_id,
                  COUNT(*) AS count,
                  COALESCE(SUM(grand_total), 0) AS total
           FROM receipts
           WHERE receipt_date >= $1::date
             AND receipt_date < $2::date
           GROUP BY entity_id`;
    const pendingSql =
      selectedYear === "all"
        ? `SELECT entity_id,
                  record_r_number,
                  vendor,
                  receipt_date,
                  grand_total,
                  currency
           FROM receipts
           WHERE attachment_link IS NULL OR attachment_link = ''
           ORDER BY receipt_date DESC, created_at DESC`
        : `SELECT entity_id,
                  record_r_number,
                  vendor,
                  receipt_date,
                  grand_total,
                  currency
           FROM receipts
           WHERE (attachment_link IS NULL OR attachment_link = '')
             AND receipt_date >= $1::date
             AND receipt_date < $2::date
           ORDER BY receipt_date DESC, created_at DESC`;
    const yearValues =
      selectedYear === "all"
        ? []
        : [`${selectedYear}-01-01`, `${selectedYear + 1}-01-01`];

    const [
      entitiesResult,
      summariesResult,
      pendingResult,
      bloodPressureLogs,
    ] = await Promise.all([
      client.query<Entity>(
        `SELECT *
         FROM entities
         WHERE is_active = TRUE
         ORDER BY type ASC, name ASC`,
      ),
      client.query<{
        entity_id: number;
        count: string;
        total: string | null;
      }>(summarySql, yearValues),
      client.query<{
        entity_id: number;
        record_r_number: string;
        vendor: string;
        receipt_date: Date;
        grand_total: string | null;
        currency: string;
      }>(pendingSql, yearValues),
      showBloodPressure ? getBloodPressureLogs(client) : Promise.resolve([]),
    ]);
    const averageSystolic =
      bloodPressureLogs.length > 0
        ? Math.round(
            bloodPressureLogs.reduce((sum, log) => sum + log.systolic, 0) /
              bloodPressureLogs.length,
          )
        : null;
    const averageDiastolic =
      bloodPressureLogs.length > 0
        ? Math.round(
            bloodPressureLogs.reduce((sum, log) => sum + log.diastolic, 0) /
              bloodPressureLogs.length,
          )
        : null;
    const latestBloodPressure = bloodPressureLogs[0] ?? null;

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-6xl">
          <section className="border border-foreground/10 p-5">
            <h1 className="text-2xl font-semibold tracking-normal">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-foreground/65">
              Expense summary and receipts waiting for upload.
          </p>
          </section>

          <DashboardClient
            availableYears={availableYears}
            bloodPressureSummary={
              showBloodPressure
                ? {
                    averageDiastolic,
                    averageSystolic,
                    latestDate: latestBloodPressure
                      ? latestBloodPressure.log_date.toISOString()
                      : null,
                    latestDiastolic: latestBloodPressure?.diastolic ?? null,
                    latestSystolic: latestBloodPressure?.systolic ?? null,
                    totalReadings: bloodPressureLogs.length,
                  }
                : null
            }
            entities={entitiesResult.rows.map((entity) => ({
              id: entity.id,
              name: entity.name,
              type: entity.type,
            }))}
            pendingReceipts={pendingResult.rows.map((receipt) => ({
              ...receipt,
              receipt_date: receipt.receipt_date.toISOString(),
            }))}
            summaries={summariesResult.rows.map((summary) => ({
              entity_id: summary.entity_id,
              count: Number(summary.count),
              total: Number(summary.total ?? 0),
            }))}
            year={selectedYear}
          />
        </div>
      </main>
    );
  } catch (error) {
    console.error("Could not load dashboard data:", error);
    return (
      <SetupMessage
        message="Your database is connected, but the app could not read the required tables. If you just reset this Supabase database, run schema.sql first, then new_user_seed.sql for a blank user."
        title="Database Schema Needs Attention"
      />
    );
  } finally {
    await client.end();
  }
}
