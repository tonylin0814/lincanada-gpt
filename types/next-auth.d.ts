import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      supabase_connection_string: string;
      google_drive_folder_id: string | null;
      is_admin: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    supabase_connection_string: string;
    google_drive_folder_id: string | null;
    is_admin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: number;
    supabase_connection_string: string;
    google_drive_folder_id: string | null;
    is_admin: boolean;
  }
}
