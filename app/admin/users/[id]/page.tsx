import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getWebAppUser } from "@/lib/admin-users";
import { getCurrentSession } from "@/lib/auth";
import { EditUserForm } from "./edit-user-form";

type EditUserPageProps = {
  params: {
    id: string;
  };
};

export default async function EditUserPage({ params }: EditUserPageProps) {
  const session = await getCurrentSession();

  if (!session?.user.is_admin) {
    redirect("/dashboard");
  }

  const id = Number(params.id);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const user = await getWebAppUser(id);

  if (!user) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-4xl">
        <Link className="text-sm underline" href="/admin">
          Back to admin
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-normal">
          Edit User
        </h1>
        <EditUserForm user={user} />
      </div>
    </main>
  );
}
