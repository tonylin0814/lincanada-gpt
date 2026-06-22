import { google } from "googleapis";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getWebAppDb } from "@/lib/db";
import { getGoogleOAuthClient } from "@/lib/drive";
import { AccountForm } from "./account-form";

type GoogleSettingsRow = {
  google_drive_folder_id: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: Date | null;
};

type FolderInfo = {
  name: string | null;
  webViewLink: string | null;
  error: string | null;
};

async function getGoogleSettings(userId: number) {
  const db = getWebAppDb();
  const result = await db.query<GoogleSettingsRow>(
    `SELECT google_drive_folder_id,
            google_access_token,
            google_refresh_token,
            google_token_expiry
     FROM users
     WHERE id = $1`,
    [userId],
  );

  return result.rows[0] ?? null;
}

async function getFolderInfo(settings: GoogleSettingsRow): Promise<FolderInfo> {
  if (!settings.google_drive_folder_id) {
    return { name: null, webViewLink: null, error: null };
  }

  if (!settings.google_access_token && !settings.google_refresh_token) {
    return {
      name: null,
      webViewLink: null,
      error: "Google Drive is not connected.",
    };
  }

  try {
    const auth = getGoogleOAuthClient();
    auth.setCredentials({
      access_token: settings.google_access_token ?? undefined,
      refresh_token: settings.google_refresh_token ?? undefined,
      expiry_date: settings.google_token_expiry
        ? settings.google_token_expiry.getTime()
        : undefined,
    });

    const drive = google.drive({ version: "v3", auth });
    const folder = await drive.files.get({
      fileId: settings.google_drive_folder_id,
      fields: "name, webViewLink",
    });

    return {
      name: folder.data.name ?? null,
      webViewLink: folder.data.webViewLink ?? null,
      error: null,
    };
  } catch (error) {
    console.error("Could not read Google Drive folder info:", error);
    return {
      name: null,
      webViewLink: null,
      error: "Could not read the Google Drive folder name.",
    };
  }
}

export default async function SettingsPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  const googleSettings = await getGoogleSettings(session.user.id);
  const folderInfo = googleSettings
    ? await getFolderInfo(googleSettings)
    : { name: null, webViewLink: null, error: null };

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
        <p className="mt-2 text-sm text-foreground/65">
          Manage user information and Google Drive storage.
        </p>

        <section className="mt-8 border border-foreground/10 p-5">
          <h2 className="text-lg font-semibold tracking-normal">
            User Information
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            Update the name shown in the navigation and generated records.
          </p>
          <AccountForm
            email={session.user.email ?? ""}
            name={session.user.name ?? ""}
          />
        </section>

        <section className="mt-8 border border-foreground/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-normal">
                Google Drive Storage
              </h2>
              <p className="mt-1 text-sm text-foreground/60">
                This folder is used by Lin System to store uploaded receipt and
                invoice files.
              </p>
            </div>
          </div>

          <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
            <div className="rounded-md border border-foreground/10 p-4">
              <dt className="text-foreground/60">Drive folder name</dt>
              <dd className="mt-1 break-words font-medium">
                {folderInfo.name ?? "Not available"}
              </dd>
            </div>
            <div className="rounded-md border border-foreground/10 p-4">
              <dt className="text-foreground/60">Drive folder ID</dt>
              <dd className="mt-1 break-words font-mono text-xs">
                {googleSettings?.google_drive_folder_id ?? "Not configured"}
              </dd>
            </div>
          </dl>

          {folderInfo.webViewLink ? (
            <a
              className="mt-4 inline-flex h-10 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85"
              href={folderInfo.webViewLink}
              rel="noreferrer"
              target="_blank"
            >
              Open Drive Folder
            </a>
          ) : null}

          {folderInfo.error ? (
            <p className="mt-4 text-sm text-red-600">{folderInfo.error}</p>
          ) : null}

          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-medium">Do not edit, move, rename, or delete this folder.</p>
            <p className="mt-1">
              Changing this folder in Google Drive can break receipt previews,
              downloads, duplicate checks, and future uploads.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
