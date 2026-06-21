import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb, getWebAppDb } from "@/lib/db";
import { getItemCategories, getReceiptCategories } from "@/lib/queries";
import { UploadClient } from "./upload-client";

type UploadPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function getParam(searchParams: UploadPageProps["searchParams"], key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/login");

  const mode = getParam(searchParams, "mode") === "revenue" ? "revenue" : "expense";
  const selectedEntityId = Number(getParam(searchParams, "entity_id") ?? 1);

  if (mode === "revenue") {
    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-semibold tracking-normal">
            Invoice Upload
          </h1>
          <p className="mt-2 text-sm text-foreground/65">
            Revenue invoice upload is the next module. Expense receipt upload is
            ready now.
          </p>
        </div>
      </main>
    );
  }

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
  const userDb = await getUserDb(session.user.supabase_connection_string);
  let categories: string[] = [];
  let itemCategories: string[] = [];

  try {
    [categories, itemCategories] = await Promise.all([
      getReceiptCategories(userDb),
      getItemCategories(userDb),
    ]);
  } finally {
    await userDb.end();
  }

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
          categories={categories}
          hasGoogleConnection={hasGoogleConnection}
          hasGoogleFolder={hasGoogleFolder}
          itemCategories={itemCategories}
          selectedEntityId={Number.isFinite(selectedEntityId) ? selectedEntityId : 1}
        />
      </div>
    </main>
  );
}
