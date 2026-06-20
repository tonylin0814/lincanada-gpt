import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { NewUserForm } from "./new-user-form";

export default async function NewUserPage() {
  const session = await getCurrentSession();

  if (!session?.user.is_admin) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-4xl">
        <Link className="text-sm underline" href="/admin">
          Back to admin
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-normal">
          Create User
        </h1>
        <NewUserForm />
      </div>
    </main>
  );
}
