import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { extractExifFromFile } from "@/lib/exif";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
  }

  const results = await Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      return extractExifFromFile(buffer, file.name, file.type);
    }),
  );

  return NextResponse.json({ files: results });
}
