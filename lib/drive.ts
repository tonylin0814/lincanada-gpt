import { Readable } from "stream";
import { google } from "googleapis";

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!clientId || !clientSecret) {
    const missing = [
      !clientId ? "GOOGLE_CLIENT_ID" : null,
      !clientSecret ? "GOOGLE_CLIENT_SECRET" : null,
    ].filter(Boolean);
    throw new Error(
      `Google OAuth credentials are not configured. Missing: ${missing.join(
        ", ",
      )}.`,
    );
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${baseUrl}/api/auth/google`,
  );
}

type GoogleOAuthClient = ReturnType<typeof getGoogleOAuthClient>;

export function getGoogleOAuthUrl(state: string) {
  const auth = getGoogleOAuthClient();
  return auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive"],
    state,
  });
}

export async function getOrCreateFolder(
  auth: GoogleOAuthClient,
  parentId: string,
  folderName: string,
): Promise<string> {
  const drive = google.drive({ version: "v3", auth });
  const escapedName = folderName.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    fields: "files(id, name)",
    q: [
      `'${parentId}' in parents`,
      "mimeType = 'application/vnd.google-apps.folder'",
      `name = '${escapedName}'`,
      "trashed = false",
    ].join(" and "),
    spaces: "drive",
  });
  const folder = existing.data.files?.[0];

  if (folder?.id) {
    return folder.id;
  }

  const created = await drive.files.create({
    fields: "id",
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
  });

  if (!created.data.id) {
    throw new Error(`Could not create Google Drive folder: ${folderName}`);
  }

  return created.data.id;
}

export async function ensureFolderPath(
  auth: GoogleOAuthClient,
  rootFolderId: string,
  entityName: string,
  year: string | number,
  monthName: string,
): Promise<string> {
  const entityFolderId = await getOrCreateFolder(auth, rootFolderId, entityName);
  const yearFolderId = await getOrCreateFolder(
    auth,
    entityFolderId,
    String(year),
  );

  return getOrCreateFolder(auth, yearFolderId, monthName);
}

export async function uploadFile(
  auth: GoogleOAuthClient,
  folderId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const drive = google.drive({ version: "v3", auth });
  const uploaded = await drive.files.create({
    fields: "id, webViewLink",
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    requestBody: {
      name: filename,
      parents: [folderId],
    },
  });
  const fileId = uploaded.data.id;

  if (!fileId) {
    throw new Error("Google Drive upload failed.");
  }

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  if (uploaded.data.webViewLink) {
    return uploaded.data.webViewLink;
  }

  const file = await drive.files.get({
    fileId,
    fields: "webViewLink",
  });

  return file.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`;
}
