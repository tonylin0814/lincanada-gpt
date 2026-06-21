import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getWebAppDb } from "@/lib/db";
import { UploadClient } from "./upload-client";

export default async function UploadPage() {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/login");

  const db = getWebAppDb();
  const google = await db.query<{
    google_drive_folder_id: string | null;
    google_access_token: string | null;
    google_refresh_token: string | null;
  }>(
    `SELECT google_drive_folder_id, google_access_token, google_refresh_token
     FROM users
     WHERE id = $1`,
    [session.user.id],
  );
  const googleUser = google.rows[0];
  const hasGoogleFolder = Boolean(googleUser?.google_drive_folder_id);
  const hasGoogleConnection = Boolean(
    googleUser?.google_access_token || googleUser?.google_refresh_token,
  );

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-normal">
          Receipt Upload
        </h1>
        <p className="mt-2 text-sm text-foreground/65">
          Extract filename, photo time, and GPS metadata before OCR.
        </p>
        <UploadClient
          hasGoogleConnection={hasGoogleConnection}
          hasGoogleFolder={hasGoogleFolder}
        />
      </div>
    </main>
  );
}
