import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <h1 className="text-2xl font-semibold tracking-normal">
        Welcome, {session.user.name}
      </h1>
      <Link className="mt-6 inline-block text-sm underline" href="/dashboard/records">
        Browse records
      </Link>
    </main>
  );
}
