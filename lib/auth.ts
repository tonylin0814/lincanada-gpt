import { compare } from "bcryptjs";
import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getWebAppDb } from "@/lib/db";

type WebAppUserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  supabase_connection_string: string;
  google_drive_folder_id: string | null;
  is_admin: boolean;
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
  supabase_connection_string: string;
  google_drive_folder_id: string | null;
  is_admin: boolean;
};

function mapAuthUser(user: WebAppUserRow): AuthUser {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    supabase_connection_string: user.supabase_connection_string,
    google_drive_folder_id: user.google_drive_folder_id,
    is_admin: user.is_admin,
  };
}

async function getActiveUserByEmail(email: string) {
  const db = getWebAppDb();
  const result = await db.query<WebAppUserRow>(
    `SELECT id, name, email, password_hash, supabase_connection_string,
            google_drive_folder_id, is_admin
     FROM users
     WHERE lower(email) = $1 AND is_active = TRUE
     LIMIT 1`,
    [email.trim().toLowerCase()],
  );

  return result.rows[0] ? mapAuthUser(result.rows[0]) : null;
}

async function getOrCreateGoogleUser(email: string, name?: string | null) {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await getActiveUserByEmail(normalizedEmail);

  if (existingUser) {
    return existingUser;
  }

  const db = getWebAppDb();
  const result = await db.query<WebAppUserRow>(
    `INSERT INTO users (
       name,
       email,
       password_hash,
       supabase_connection_string,
       is_admin,
       is_active
     )
     VALUES ($1, $2, '', '', FALSE, TRUE)
     RETURNING id, name, email, password_hash, supabase_connection_string,
               google_drive_folder_id, is_admin`,
    [name?.trim() || normalizedEmail.split("@")[0], normalizedEmail],
  );

  return mapAuthUser(result.rows[0]);
}

async function refreshTokenFromUserEmail(token: JWT) {
  if (!token.email) {
    return token;
  }

  const appUser = await getActiveUserByEmail(token.email);

  if (!appUser) {
    return token;
  }

  token.id = Number(appUser.id);
  token.supabase_connection_string = appUser.supabase_connection_string;
  token.google_drive_folder_id = appUser.google_drive_folder_id;
  token.is_admin = appUser.is_admin;

  return token;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        try {
          const db = getWebAppDb();
          const result = await db.query<WebAppUserRow>(
            `SELECT id, name, email, password_hash, supabase_connection_string,
                    google_drive_folder_id, is_admin
             FROM users
             WHERE lower(email) = $1 AND is_active = TRUE
             LIMIT 1`,
            [email],
          );
          const user = result.rows[0];

          if (!user) {
            return null;
          }

          if (!user.password_hash) {
            return null;
          }

          const passwordMatches = await compare(password, user.password_hash);

          if (!passwordMatches) {
            return null;
          }

          return mapAuthUser(user);
        } catch (error) {
          console.error("Login failed:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return true;
      }

      if (!user.email) {
        return false;
      }

      try {
        const appUser = await getOrCreateGoogleUser(user.email, user.name);
        user.id = appUser.id;
        user.name = appUser.name;
        user.email = appUser.email;
        user.supabase_connection_string =
          appUser.supabase_connection_string;
        user.google_drive_folder_id = appUser.google_drive_folder_id;
        user.is_admin = appUser.is_admin;
        return true;
      } catch (error) {
        console.error("Google login failed:", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        const appUser =
          user.supabase_connection_string !== undefined
            ? (user as AuthUser)
            : user.email
              ? await getActiveUserByEmail(user.email)
              : null;

        if (appUser) {
          token.id = Number(appUser.id);
          token.supabase_connection_string =
            appUser.supabase_connection_string;
          token.google_drive_folder_id = appUser.google_drive_folder_id;
          token.is_admin = appUser.is_admin;
        }
      }

      return refreshTokenFromUserEmail(token);
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.supabase_connection_string =
          token.supabase_connection_string;
        session.user.google_drive_folder_id = token.google_drive_folder_id;
        session.user.is_admin = token.is_admin;
      }

      return session;
    },
  },
};

export function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function requireSession(): Promise<Session> {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Authentication required.");
  }

  return session;
}

export async function requireAdminSession(): Promise<Session> {
  const session = await requireSession();

  if (!session.user.is_admin) {
    throw new Error("Admin access required.");
  }

  return session;
}
