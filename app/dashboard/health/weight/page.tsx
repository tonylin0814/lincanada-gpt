import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { getUserFeatures, syncUserRecordTypes } from "@/lib/features";
import { fillMissingWeightTimes, getWeightLogs } from "@/lib/health";
import { WeightForm } from "./weight-form";
import { WeightTrendChart } from "./weight-trend-chart";

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString();
}

function formatTime(value: string | null) {
  return value ? String(value).slice(0, 5) : "";
}

function formatWeight(value: string | number | null) {
  if (value === null) return "--";
  return `${Number(value).toFixed(1)} kg`;
}

export default async function WeightPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  const features = await getUserFeatures(session.user.id);
  const enabled = features.some(
    (feature) => feature.key === "weight" && feature.is_enabled,
  );

  if (!enabled && !session.user.is_admin) {
    redirect("/dashboard");
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    await fillMissingWeightTimes(client);
    const logs = await getWeightLogs(client);
    await syncUserRecordTypes(session.user.id, client).catch((error) => {
      console.error("Could not sync weight record type:", error);
    });

    const latest = logs[0];
    const averageWeight =
      logs.length > 0
        ? logs.reduce((sum, log) => sum + Number(log.weight_kg), 0) /
          logs.length
        : null;

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-6xl">
          <section className="border border-foreground/10 p-5">
            <h1 className="text-2xl font-semibold tracking-normal">Weight</h1>
            <p className="mt-2 text-sm text-foreground/65">
              Record and review weight readings.
            </p>
          </section>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <section className="rounded-md border border-foreground/10 p-5">
              <h2 className="text-sm font-medium text-foreground/60">
                Latest
              </h2>
              <p className="mt-2 text-2xl font-semibold">
                {latest ? formatWeight(latest.weight_kg) : "--"}
              </p>
              <p className="mt-1 text-sm text-foreground/60">
                {latest ? formatDate(latest.log_date) : "No readings yet"}
              </p>
            </section>
            <section className="rounded-md border border-foreground/10 p-5">
              <h2 className="text-sm font-medium text-foreground/60">
                Average
              </h2>
              <p className="mt-2 text-2xl font-semibold">
                {formatWeight(averageWeight)}
              </p>
              <p className="mt-1 text-sm text-foreground/60">
                Last {logs.length} reading{logs.length === 1 ? "" : "s"}
              </p>
            </section>
            <section className="rounded-md border border-foreground/10 p-5">
              <h2 className="text-sm font-medium text-foreground/60">
                Total Readings
              </h2>
              <p className="mt-2 text-2xl font-semibold">{logs.length}</p>
            </section>
          </div>

          <WeightTrendChart
            points={logs.map((log) => ({
              date: `${new Date(log.log_date).toISOString().slice(0, 10)}T${
                log.log_time ? String(log.log_time).slice(0, 8) : "00:00:00"
              }`,
              weightKg: Number(log.weight_kg),
            }))}
          />

          <WeightForm />

          <div className="mt-6 overflow-x-auto border border-foreground/10">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead className="bg-foreground/5">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Weight</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr className="border-t border-foreground/10" key={log.id}>
                      <td className="px-4 py-3">{formatDate(log.log_date)}</td>
                      <td className="px-4 py-3">{formatTime(log.log_time)}</td>
                      <td className="px-4 py-3">{formatWeight(log.weight_kg)}</td>
                      <td className="px-4 py-3">{log.notes ?? ""}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-5 text-foreground/60" colSpan={4}>
                      No weight readings yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    );
  } finally {
    await client.end();
  }
}
