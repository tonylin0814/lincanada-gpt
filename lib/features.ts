import type { Client } from "pg";
import { getWebAppDb } from "@/lib/db";

export type FeatureKey =
  | "personal_expense"
  | "personal_revenue"
  | "company_expense"
  | "company_revenue"
  | "blood_pressure"
  | "weight"
  | "diary"
  | "reminder"
  | "people"
  | "location"
  | "event";

export type FeatureDefinition = {
  key: FeatureKey;
  label: string;
  group: string;
  record_category: string;
  record_type: string;
  default_enabled: boolean;
};

export type UserFeature = FeatureDefinition & {
  is_enabled: boolean;
};

export type UserRecordType = {
  record_category: string;
  record_type: string;
  feature_key: FeatureKey | null;
  record_count: number;
  confidence: string;
  source_table: string;
  last_seen_at: Date | null;
};

export const featureDefinitions: FeatureDefinition[] = [
  {
    key: "personal_expense",
    label: "Personal Expense",
    group: "Personal",
    record_category: "Finance",
    record_type: "Personal Expense",
    default_enabled: true,
  },
  {
    key: "personal_revenue",
    label: "Personal Revenue",
    group: "Personal",
    record_category: "Finance",
    record_type: "Personal Revenue",
    default_enabled: false,
  },
  {
    key: "company_expense",
    label: "Company Expense",
    group: "Company",
    record_category: "Finance",
    record_type: "Company Expense",
    default_enabled: true,
  },
  {
    key: "company_revenue",
    label: "Company Revenue",
    group: "Company",
    record_category: "Finance",
    record_type: "Company Revenue",
    default_enabled: true,
  },
  {
    key: "blood_pressure",
    label: "Blood Pressure",
    group: "Health",
    record_category: "Health",
    record_type: "Blood Pressure",
    default_enabled: false,
  },
  {
    key: "weight",
    label: "Weight",
    group: "Health",
    record_category: "Health",
    record_type: "Weight",
    default_enabled: false,
  },
  {
    key: "diary",
    label: "Diary",
    group: "Personal Records",
    record_category: "Personal",
    record_type: "Diary",
    default_enabled: false,
  },
  {
    key: "reminder",
    label: "Reminder",
    group: "Personal Records",
    record_category: "Reminder",
    record_type: "Reminder",
    default_enabled: false,
  },
  {
    key: "people",
    label: "People",
    group: "Personal Records",
    record_category: "People",
    record_type: "People",
    default_enabled: false,
  },
  {
    key: "location",
    label: "Location",
    group: "Personal Records",
    record_category: "Place",
    record_type: "Location",
    default_enabled: false,
  },
  {
    key: "event",
    label: "Event",
    group: "Personal Records",
    record_category: "Event",
    record_type: "Event",
    default_enabled: false,
  },
];

type RecordDetection = {
  feature_key: FeatureKey;
  record_category: string;
  record_type: string;
  source_table: string;
  record_count: number;
  last_seen_at: Date | null;
};

type CountRow = {
  count: string;
  last_seen_at: Date | null;
};

export async function ensureFeatureTables() {
  const db = getWebAppDb();

  await db.query(`
    CREATE TABLE IF NOT EXISTS features (
      feature_key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      feature_group TEXT NOT NULL,
      record_category TEXT NOT NULL,
      record_type TEXT NOT NULL,
      default_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_features (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feature_key TEXT NOT NULL REFERENCES features(feature_key) ON DELETE CASCADE,
      is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, feature_key)
    );

    CREATE TABLE IF NOT EXISTS user_record_types (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      record_category TEXT NOT NULL,
      record_type TEXT NOT NULL,
      feature_key TEXT REFERENCES features(feature_key) ON DELETE SET NULL,
      record_count INTEGER NOT NULL DEFAULT 0,
      confidence NUMERIC(4,2) NOT NULL DEFAULT 1.00,
      source_table TEXT NOT NULL,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, record_category, record_type, source_table)
    );

    CREATE TABLE IF NOT EXISTS admin_notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      related_feature_key TEXT REFERENCES features(feature_key) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'unread',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    );
  `);

  for (const feature of featureDefinitions) {
    await db.query(
      `INSERT INTO features (
         feature_key,
         label,
         feature_group,
         record_category,
         record_type,
         default_enabled
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (feature_key)
       DO UPDATE SET label = EXCLUDED.label,
                     feature_group = EXCLUDED.feature_group,
                     record_category = EXCLUDED.record_category,
                     record_type = EXCLUDED.record_type,
                     default_enabled = EXCLUDED.default_enabled`,
      [
        feature.key,
        feature.label,
        feature.group,
        feature.record_category,
        feature.record_type,
        feature.default_enabled,
      ],
    );
  }
}

export async function ensureUserFeatureDefaults(userId: number) {
  await ensureFeatureTables();
  const db = getWebAppDb();

  for (const feature of featureDefinitions) {
    await db.query(
      `INSERT INTO user_features (user_id, feature_key, is_enabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, feature_key) DO NOTHING`,
      [userId, feature.key, feature.default_enabled],
    );
  }
}

export async function getUserFeatures(userId: number) {
  await ensureUserFeatureDefaults(userId);
  const db = getWebAppDb();
  const result = await db.query<UserFeature>(
    `SELECT f.feature_key AS key,
            f.label,
            f.feature_group AS group,
            f.record_category,
            f.record_type,
            f.default_enabled,
            COALESCE(uf.is_enabled, f.default_enabled) AS is_enabled
     FROM features f
     LEFT JOIN user_features uf
       ON uf.feature_key = f.feature_key
      AND uf.user_id = $1
     ORDER BY f.feature_group ASC, f.label ASC`,
    [userId],
  );

  return result.rows;
}

export async function updateUserFeatures(
  userId: number,
  enabledFeatureKeys: string[],
) {
  await ensureUserFeatureDefaults(userId);
  const db = getWebAppDb();
  const enabled = new Set(enabledFeatureKeys);

  for (const feature of featureDefinitions) {
    await db.query(
      `UPDATE user_features
       SET is_enabled = $3,
           updated_at = NOW()
       WHERE user_id = $1 AND feature_key = $2`,
      [userId, feature.key, enabled.has(feature.key)],
    );
  }
}

async function tableExists(client: Client, tableName: string) {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = $1
     )`,
    [tableName],
  );

  return Boolean(result.rows[0]?.exists);
}

async function getTableCount(
  client: Client,
  tableName: string,
  dateColumn: string,
) {
  if (!(await tableExists(client, tableName))) {
    return { count: 0, last_seen_at: null };
  }

  const result = await client.query<CountRow>(
    `SELECT COUNT(*) AS count,
            MAX(${dateColumn}) AS last_seen_at
     FROM ${tableName}`,
  );

  return {
    count: Number(result.rows[0]?.count ?? 0),
    last_seen_at: result.rows[0]?.last_seen_at ?? null,
  };
}

async function getFinanceDetections(client: Client) {
  const detections: RecordDetection[] = [];

  if (await tableExists(client, "receipts")) {
    const result = await client.query<
      CountRow & { entity_type: "personal" | "company" }
    >(
      `SELECT e.type AS entity_type,
              COUNT(*) AS count,
              MAX(r.created_at) AS last_seen_at
       FROM receipts r
       JOIN entities e ON e.id = r.entity_id
       GROUP BY e.type`,
    );

    for (const row of result.rows) {
      const isCompany = row.entity_type === "company";
      detections.push({
        feature_key: isCompany ? "company_expense" : "personal_expense",
        record_category: "Finance",
        record_type: isCompany ? "Company Expense" : "Personal Expense",
        source_table: "receipts",
        record_count: Number(row.count),
        last_seen_at: row.last_seen_at,
      });
    }
  }

  if (await tableExists(client, "invoices")) {
    const result = await client.query<
      CountRow & { entity_type: "personal" | "company" }
    >(
      `SELECT e.type AS entity_type,
              COUNT(*) AS count,
              MAX(i.created_at) AS last_seen_at
       FROM invoices i
       JOIN entities e ON e.id = i.entity_id
       GROUP BY e.type`,
    );

    for (const row of result.rows) {
      const isCompany = row.entity_type === "company";
      detections.push({
        feature_key: isCompany ? "company_revenue" : "personal_revenue",
        record_category: "Finance",
        record_type: isCompany ? "Company Revenue" : "Personal Revenue",
        source_table: "invoices",
        record_count: Number(row.count),
        last_seen_at: row.last_seen_at,
      });
    }
  }

  return detections;
}

export async function syncUserRecordTypes(userId: number, client: Client) {
  await ensureUserFeatureDefaults(userId);
  const db = getWebAppDb();
  const detections: RecordDetection[] = await getFinanceDetections(client);
  const simpleTables: Array<{
    feature_key: FeatureKey;
    record_category: string;
    record_type: string;
    source_table: string;
    date_column: string;
  }> = [
    {
      feature_key: "blood_pressure",
      record_category: "Health",
      record_type: "Blood Pressure",
      source_table: "blood_pressure_logs",
      date_column: "created_at",
    },
    {
      feature_key: "weight",
      record_category: "Health",
      record_type: "Weight",
      source_table: "weight_logs",
      date_column: "created_at",
    },
    {
      feature_key: "reminder",
      record_category: "Reminder",
      record_type: "Reminder",
      source_table: "reminders",
      date_column: "created_at",
    },
    {
      feature_key: "people",
      record_category: "People",
      record_type: "People",
      source_table: "people",
      date_column: "created_at",
    },
    {
      feature_key: "location",
      record_category: "Place",
      record_type: "Location",
      source_table: "places",
      date_column: "created_at",
    },
    {
      feature_key: "event",
      record_category: "Event",
      record_type: "Event",
      source_table: "events",
      date_column: "created_at",
    },
  ];

  for (const table of simpleTables) {
    const count = await getTableCount(client, table.source_table, table.date_column);
    if (count.count > 0) {
      detections.push({
        feature_key: table.feature_key,
        record_category: table.record_category,
        record_type: table.record_type,
        source_table: table.source_table,
        record_count: count.count,
        last_seen_at: count.last_seen_at,
      });
    }
  }

  for (const detection of detections.filter((item) => item.record_count > 0)) {
    await db.query(
      `INSERT INTO user_record_types (
         user_id,
         record_category,
         record_type,
         feature_key,
         record_count,
         confidence,
         source_table,
         last_seen_at
       ) VALUES ($1, $2, $3, $4, $5, 1.00, $6, $7)
       ON CONFLICT (user_id, record_category, record_type, source_table)
       DO UPDATE SET feature_key = EXCLUDED.feature_key,
                     record_count = EXCLUDED.record_count,
                     confidence = EXCLUDED.confidence,
                     last_seen_at = EXCLUDED.last_seen_at,
                     updated_at = NOW()`,
      [
        userId,
        detection.record_category,
        detection.record_type,
        detection.feature_key,
        detection.record_count,
        detection.source_table,
        detection.last_seen_at,
      ],
    );

    const feature = featureDefinitions.find(
      (entry) => entry.key === detection.feature_key,
    );
    const featureState = await db.query<{ is_enabled: boolean }>(
      `SELECT is_enabled
       FROM user_features
       WHERE user_id = $1 AND feature_key = $2`,
      [userId, detection.feature_key],
    );

    if (feature && featureState.rows[0]?.is_enabled === false) {
      await db.query(
        `INSERT INTO admin_notifications (
           user_id,
           type,
           title,
           message,
           related_feature_key
         )
         SELECT $1, 'feature_detected', $2, $3, $4
         WHERE NOT EXISTS (
           SELECT 1
           FROM admin_notifications
           WHERE user_id = $1
             AND related_feature_key = $4
             AND status = 'unread'
         )`,
        [
          userId,
          `${feature.label} data detected`,
          `${detection.record_count} ${feature.label} record${detection.record_count === 1 ? "" : "s"} found. Admin can enable this feature for the user.`,
          detection.feature_key,
        ],
      );
    }
  }

  return getUserRecordTypes(userId);
}

export async function getUserRecordTypes(userId: number) {
  await ensureFeatureTables();
  const db = getWebAppDb();
  const result = await db.query<UserRecordType>(
    `SELECT record_category,
            record_type,
            feature_key,
            record_count,
            confidence,
            source_table,
            last_seen_at
     FROM user_record_types
     WHERE user_id = $1
     ORDER BY record_category ASC, record_type ASC`,
    [userId],
  );

  return result.rows;
}

export async function listUnreadAdminNotifications({
  limit = 20,
  offset = 0,
}: {
  limit?: number;
  offset?: number;
} = {}) {
  await ensureFeatureTables();
  const db = getWebAppDb();
  const result = await db.query<{
    id: number;
    user_id: number;
    user_name: string;
    user_email: string;
    title: string;
    message: string;
    related_feature_key: string | null;
    created_at: Date;
  }>(
    `SELECT n.id,
            n.user_id,
            u.name AS user_name,
            u.email AS user_email,
            n.title,
            n.message,
            n.related_feature_key,
            n.created_at
     FROM admin_notifications n
     JOIN users u ON u.id = n.user_id
     WHERE n.status = 'unread'
     ORDER BY n.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return result.rows;
}

export async function countUnreadAdminNotifications() {
  await ensureFeatureTables();
  const db = getWebAppDb();
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM admin_notifications
     WHERE status = 'unread'`,
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function markAllAdminNotificationsRead() {
  await ensureFeatureTables();
  const db = getWebAppDb();
  const result = await db.query<{ id: number }>(
    `UPDATE admin_notifications
     SET status = 'read',
         resolved_at = NOW()
     WHERE status = 'unread'
     RETURNING id`,
  );

  return result.rowCount ?? 0;
}
