import type { Client } from "pg";

export type BloodPressureLog = {
  id: number;
  log_date: Date;
  log_time: string | null;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  arm: string | null;
  position: string | null;
  device: string | null;
  notes: string | null;
  created_at: Date;
};

export type BloodPressureInput = {
  log_date: string;
  log_time: string | null;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  arm: string | null;
  position: string | null;
  device: string | null;
  notes: string | null;
};

export async function ensureBloodPressureTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS blood_pressure_logs (
      id SERIAL PRIMARY KEY,
      log_date DATE NOT NULL DEFAULT CURRENT_DATE,
      log_time TIME,
      person_id INTEGER,
      systolic INTEGER NOT NULL,
      diastolic INTEGER NOT NULL,
      pulse INTEGER,
      arm TEXT,
      "position" TEXT,
      device TEXT,
      extra_readings JSONB,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    ALTER TABLE blood_pressure_logs
    ALTER COLUMN log_time SET DEFAULT CURRENT_TIME
  `);
}

export async function getBloodPressureLogs(client: Client) {
  await ensureBloodPressureTable(client);
  const result = await client.query<BloodPressureLog>(
    `SELECT id,
            log_date,
            log_time,
            systolic,
            diastolic,
            pulse,
            arm,
            "position",
            device,
            notes,
            created_at
     FROM blood_pressure_logs
     ORDER BY log_date DESC, log_time DESC NULLS LAST, created_at DESC
     LIMIT 200`,
  );

  return result.rows;
}

export async function createBloodPressureLog(
  client: Client,
  input: BloodPressureInput,
) {
  await ensureBloodPressureTable(client);
  const result = await client.query<BloodPressureLog>(
    `INSERT INTO blood_pressure_logs (
       log_date,
       log_time,
       systolic,
       diastolic,
       pulse,
       arm,
       "position",
       device,
       notes
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id,
               log_date,
               log_time,
               systolic,
               diastolic,
               pulse,
               arm,
               "position",
               device,
               notes,
               created_at`,
    [
      input.log_date,
      input.log_time,
      input.systolic,
      input.diastolic,
      input.pulse,
      input.arm,
      input.position,
      input.device,
      input.notes,
    ],
  );

  return result.rows[0];
}

export async function fillMissingBloodPressureTimes(client: Client) {
  await ensureBloodPressureTable(client);
  await client.query(`
    UPDATE blood_pressure_logs
    SET log_time = (created_at AT TIME ZONE 'America/Toronto')::time
    WHERE log_time IS NULL
  `);
}
