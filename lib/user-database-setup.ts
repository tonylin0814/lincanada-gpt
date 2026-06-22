import { readFileSync } from "fs";
import path from "path";
import { getUserDb } from "@/lib/db";

const resetPublicSchemaSql = `
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
`;

function readTemplate(filename: string) {
  return readFileSync(path.join(process.cwd(), "lib", filename), "utf8")
    .split(/\r?\n/)
    .filter((line) => !/^\\(un)?restrict(\s|$)/.test(line))
    .join("\n");
}

export async function initializeUserDatabase(connectionString: string) {
  const client = await getUserDb(connectionString);

  try {
    await client.query(resetPublicSchemaSql);
    await client.query(readTemplate("user-database-schema.sql"));
    await client.query(readTemplate("new-user-seed.sql"));
  } finally {
    await client.end();
  }
}
