import { Client, Pool, type ClientConfig, type PoolConfig } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var webAppDbPool: Pool | undefined;
}

function shouldUseSsl(connectionString: string) {
  try {
    const host = new URL(connectionString).hostname;
    return !["localhost", "127.0.0.1", "::1"].includes(host);
  } catch {
    return true;
  }
}

function createConnectionConfig(connectionString: string): ClientConfig {
  const config: ClientConfig = { connectionString };

  if (shouldUseSsl(connectionString)) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

function getWebAppSchema() {
  const schema = process.env.WEBAPP_DATABASE_SCHEMA || "webapp";

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error("WEBAPP_DATABASE_SCHEMA must be a valid Postgres schema name.");
  }

  return schema;
}

export function getWebAppDb() {
  const connectionString = process.env.WEBAPP_DATABASE_URL;

  if (!connectionString) {
    throw new Error("WEBAPP_DATABASE_URL is not configured.");
  }

  if (!globalThis.webAppDbPool) {
    const poolConfig: PoolConfig = {
      ...createConnectionConfig(connectionString),
      options: `-c search_path=${getWebAppSchema()},public`,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    };

    globalThis.webAppDbPool = new Pool(poolConfig);
    globalThis.webAppDbPool.on("error", (error) => {
      console.error("Unexpected web app database error:", error);
    });
  }

  return globalThis.webAppDbPool;
}

export async function getUserDb(connectionString: string) {
  if (!connectionString) {
    throw new Error("User Supabase connection string is required.");
  }

  const client = new Client(createConnectionConfig(connectionString));

  try {
    await client.connect();
    return client;
  } catch (error) {
    await client.end().catch(() => undefined);
    console.error("Could not connect to user Supabase database:", error);
    throw new Error("Could not connect to the user's Supabase database.");
  }
}
