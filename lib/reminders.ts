import type { Client } from "pg";

export type Reminder = {
  id: number;
  reminder_text: string;
  reminder_type: string;
  trigger_date: Date | null;
  trigger_month: number | null;
  trigger_day: number | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  is_active: boolean;
  triggered_at: Date | null;
  created_at: Date;
};

export type ReminderInput = {
  reminder_text: string;
  trigger_date: string;
};

export async function ensureRemindersTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS reminders (
      id SERIAL PRIMARY KEY,
      reminder_text TEXT NOT NULL,
      reminder_type TEXT NOT NULL DEFAULT 'date',
      trigger_date DATE,
      trigger_month INTEGER,
      trigger_day INTEGER,
      trigger_person_id INTEGER,
      trigger_place_id INTEGER,
      is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
      recurrence_pattern TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      triggered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function getReminders(client: Client, limit = 500) {
  await ensureRemindersTable(client);
  const result = await client.query<Reminder>(
    `SELECT id,
            reminder_text,
            reminder_type,
            trigger_date,
            trigger_month,
            trigger_day,
            is_recurring,
            recurrence_pattern,
            is_active,
            triggered_at,
            created_at
     FROM reminders
     WHERE is_active IS DISTINCT FROM FALSE
        OR triggered_at IS NOT NULL
     ORDER BY is_active DESC,
              COALESCE(trigger_date, triggered_at::date) ASC NULLS LAST,
              created_at DESC
     LIMIT $1`,
    [limit],
  );

  return result.rows;
}

export async function createReminder(client: Client, input: ReminderInput) {
  await ensureRemindersTable(client);
  const result = await client.query<Reminder>(
    `INSERT INTO reminders (
       reminder_text,
       reminder_type,
       trigger_date
     ) VALUES ($1, 'date', $2)
     RETURNING id,
               reminder_text,
               reminder_type,
               trigger_date,
               trigger_month,
               trigger_day,
               is_recurring,
               recurrence_pattern,
               is_active,
               created_at`,
    [input.reminder_text, input.trigger_date],
  );

  return result.rows[0];
}

export async function updateReminder(
  client: Client,
  id: number,
  input: ReminderInput,
) {
  await ensureRemindersTable(client);
  const result = await client.query<Reminder>(
    `UPDATE reminders
     SET reminder_text = $2,
         trigger_date = $3,
         trigger_month = NULL,
         trigger_day = NULL,
         is_recurring = FALSE,
         is_active = TRUE,
         triggered_at = NULL,
         recurrence_pattern = NULL
     WHERE id = $1
     RETURNING id,
               reminder_text,
               reminder_type,
               trigger_date,
               trigger_month,
               trigger_day,
               is_recurring,
               recurrence_pattern,
               is_active,
               triggered_at,
               created_at`,
    [id, input.reminder_text, input.trigger_date],
  );

  return result.rows[0] ?? null;
}

export async function deleteReminder(client: Client, id: number) {
  await ensureRemindersTable(client);
  const result = await client.query<{ id: number }>(
    `UPDATE reminders
     SET is_active = FALSE
     WHERE id = $1
       AND (
         is_active IS DISTINCT FROM FALSE
         OR triggered_at IS NOT NULL
       )
     RETURNING id`,
    [id],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function getDashboardReminders(client: Client) {
  await ensureRemindersTable(client);
  const todayResult = await client.query<Reminder>(
    `SELECT id,
            reminder_text,
            reminder_type,
            COALESCE(trigger_date, CURRENT_DATE) AS trigger_date,
            trigger_month,
            trigger_day,
            is_recurring,
            recurrence_pattern,
            is_active,
            created_at
     FROM reminders
     WHERE is_active IS DISTINCT FROM FALSE
       AND (
         trigger_date = CURRENT_DATE
         OR (
           is_recurring = TRUE
           AND trigger_month = EXTRACT(MONTH FROM CURRENT_DATE)::int
           AND trigger_day = EXTRACT(DAY FROM CURRENT_DATE)::int
         )
       )
     ORDER BY created_at DESC
     LIMIT 5`,
  );
  const upcomingResult = await client.query<Reminder>(
    `SELECT id,
            reminder_text,
            reminder_type,
            COALESCE(
              trigger_date,
              CASE
                WHEN make_date(
                  EXTRACT(YEAR FROM CURRENT_DATE)::int,
                  trigger_month,
                  trigger_day
                ) > CURRENT_DATE THEN make_date(
                  EXTRACT(YEAR FROM CURRENT_DATE)::int,
                  trigger_month,
                  trigger_day
                )
                ELSE make_date(
                  EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
                  trigger_month,
                  trigger_day
                )
              END
            ) AS trigger_date,
            trigger_month,
            trigger_day,
            is_recurring,
            recurrence_pattern,
            is_active,
            created_at
     FROM reminders
     WHERE is_active IS DISTINCT FROM FALSE
       AND (
         trigger_date > CURRENT_DATE
         OR (
           is_recurring = TRUE
           AND trigger_month IS NOT NULL
           AND trigger_day IS NOT NULL
           AND NOT (
             trigger_month = EXTRACT(MONTH FROM CURRENT_DATE)::int
             AND trigger_day = EXTRACT(DAY FROM CURRENT_DATE)::int
           )
         )
       )
     ORDER BY trigger_date ASC NULLS LAST, created_at DESC
     LIMIT 5`,
  );

  return {
    today: todayResult.rows,
    upcoming: upcomingResult.rows,
  };
}
