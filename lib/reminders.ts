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
            created_at
     FROM reminders
     WHERE is_active = TRUE
     ORDER BY trigger_date ASC NULLS LAST, created_at DESC
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

export async function getDashboardReminders(client: Client) {
  await ensureRemindersTable(client);
  const todayResult = await client.query<Reminder>(
    `SELECT id,
            reminder_text,
            reminder_type,
            trigger_date,
            trigger_month,
            trigger_day,
            is_recurring,
            recurrence_pattern,
            is_active,
            created_at
     FROM reminders
     WHERE is_active = TRUE
       AND trigger_date = CURRENT_DATE
     ORDER BY created_at DESC
     LIMIT 5`,
  );
  const upcomingResult = await client.query<Reminder>(
    `SELECT id,
            reminder_text,
            reminder_type,
            trigger_date,
            trigger_month,
            trigger_day,
            is_recurring,
            recurrence_pattern,
            is_active,
            created_at
     FROM reminders
     WHERE is_active = TRUE
       AND trigger_date > CURRENT_DATE
     ORDER BY trigger_date ASC, created_at DESC
     LIMIT 5`,
  );

  return {
    today: todayResult.rows,
    upcoming: upcomingResult.rows,
  };
}
