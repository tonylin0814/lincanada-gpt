import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import { getWebAppDb } from "../lib/db";

loadEnvConfig(process.cwd());

async function main() {
  const [email, name, password, supabaseConnectionStringArg] =
    process.argv.slice(2);
  const supabaseConnectionString =
    supabaseConnectionStringArg ??
    process.env.ADMIN_SUPABASE_CONNECTION_STRING ??
    process.env.SUPABASE_CONNECTION_STRING;

  if (!email || !name || !password) {
    throw new Error(
      "Usage: npm run create-admin -- <email> <name> <password> [supabase_connection_string]",
    );
  }

  if (!supabaseConnectionString) {
    throw new Error(
      "Provide the admin Supabase connection string as the fourth arg or ADMIN_SUPABASE_CONNECTION_STRING.",
    );
  }

  const passwordHash = await hash(password, 12);
  const db = getWebAppDb();

  try {
    await db.query(
      `INSERT INTO users (
         name,
         email,
         password_hash,
         supabase_connection_string,
         is_admin
       ) VALUES ($1, $2, $3, $4, TRUE)`,
      [name, email.toLowerCase(), passwordHash, supabaseConnectionString],
    );

    console.log(`Admin created: ${email.toLowerCase()}`);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
