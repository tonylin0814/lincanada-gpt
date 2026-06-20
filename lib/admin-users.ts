import { hash } from "bcryptjs";
import { getWebAppDb } from "@/lib/db";

export type AdminUserListItem = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  has_supabase_connection: boolean;
  created_at: Date;
};

export type AdminUserDetail = AdminUserListItem & {
  supabase_connection_string: string;
  google_drive_folder_id: string | null;
  is_admin: boolean;
};

export type CreateAdminUserInput = {
  name: string;
  email: string;
  password: string;
  supabase_connection_string: string;
  google_drive_folder_id?: string | null;
  is_admin: boolean;
};

export type UpdateAdminUserInput = {
  supabase_connection_string?: string;
  google_drive_folder_id?: string | null;
};

export async function listWebAppUsers() {
  const db = getWebAppDb();
  const result = await db.query<AdminUserListItem>(
    `SELECT id, name, email, is_active,
            supabase_connection_string <> '' AS has_supabase_connection,
            created_at
     FROM users
     ORDER BY created_at DESC`,
  );

  return result.rows;
}

export async function getWebAppUser(id: number) {
  const db = getWebAppDb();
  const result = await db.query<AdminUserDetail>(
    `SELECT id, name, email, is_active,
            supabase_connection_string <> '' AS has_supabase_connection,
            supabase_connection_string, google_drive_folder_id, is_admin,
            created_at
     FROM users
     WHERE id = $1`,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function createWebAppUser(input: CreateAdminUserInput) {
  const db = getWebAppDb();
  const passwordHash = await hash(input.password, 12);
  const result = await db.query<AdminUserDetail>(
    `INSERT INTO users (
       name,
       email,
       password_hash,
       supabase_connection_string,
       google_drive_folder_id,
       is_admin
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, email, is_active,
       supabase_connection_string <> '' AS has_supabase_connection,
       supabase_connection_string, google_drive_folder_id, is_admin,
       created_at`,
    [
      input.name,
      input.email.toLowerCase(),
      passwordHash,
      input.supabase_connection_string,
      input.google_drive_folder_id || null,
      input.is_admin,
    ],
  );

  return result.rows[0];
}

export async function updateWebAppUser(
  id: number,
  input: UpdateAdminUserInput,
) {
  const db = getWebAppDb();
  const result = await db.query<AdminUserDetail>(
    `UPDATE users
     SET supabase_connection_string = COALESCE($2, supabase_connection_string),
         google_drive_folder_id = $3
     WHERE id = $1
     RETURNING id, name, email, is_active,
       supabase_connection_string <> '' AS has_supabase_connection,
       supabase_connection_string, google_drive_folder_id, is_admin,
       created_at`,
    [
      id,
      input.supabase_connection_string,
      input.google_drive_folder_id ?? null,
    ],
  );

  return result.rows[0] ?? null;
}

export async function deactivateWebAppUser(id: number) {
  const db = getWebAppDb();
  const result = await db.query<AdminUserDetail>(
    `UPDATE users
     SET is_active = FALSE
     WHERE id = $1
     RETURNING id, name, email, is_active,
       supabase_connection_string <> '' AS has_supabase_connection,
       supabase_connection_string, google_drive_folder_id, is_admin,
       created_at`,
    [id],
  );

  return result.rows[0] ?? null;
}
