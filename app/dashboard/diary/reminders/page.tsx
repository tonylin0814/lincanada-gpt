import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { getUserFeatures, syncUserRecordTypes } from "@/lib/features";
import { getReminders } from "@/lib/reminders";
import { RemindersClient } from "./reminders-client";

function serializeDateOnly(value: Date | string | null) {
  if (!value) return null;
  return typeof value === "string"
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10);
}

export default async function RemindersPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  const features = await getUserFeatures(session.user.id);
  const enabled = features.some(
    (feature) => feature.key === "reminder" && feature.is_enabled,
  );

  if (!enabled && !session.user.is_admin) {
    redirect("/dashboard");
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const reminders = await getReminders(client);
    await syncUserRecordTypes(session.user.id, client).catch((error) => {
      console.error("Could not sync reminder record type:", error);
    });

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-6xl">
          <section className="border border-foreground/10 p-5">
            <h1 className="text-2xl font-semibold tracking-normal">
              Reminders
            </h1>
            <p className="mt-2 text-sm text-foreground/65">
              Select a date to review reminders, or view all active reminders.
            </p>
          </section>

          <RemindersClient
            reminders={reminders.map((reminder) => ({
              id: reminder.id,
              is_recurring: reminder.is_recurring,
              recurrence_pattern: reminder.recurrence_pattern,
              reminder_text: reminder.reminder_text,
              trigger_day: reminder.trigger_day,
              trigger_date: serializeDateOnly(reminder.trigger_date),
              trigger_month: reminder.trigger_month,
            }))}
          />
        </div>
      </main>
    );
  } finally {
    await client.end();
  }
}
