import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { UploadClient } from "./upload-client";

export default async function UploadPage() {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/login");

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-normal">
          Receipt Upload
        </h1>
        <p className="mt-2 text-sm text-foreground/65">
          Extract filename, photo time, and GPS metadata before OCR.
        </p>
        <UploadClient />
      </div>
    </main>
  );
}
