import Link from "next/link";
import { redirect } from "next/navigation";
import { listWebAppUsers } from "@/lib/admin-users";
import { getCurrentSession } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getCurrentSession();

  if (!session?.user.is_admin) {
    redirect("/dashboard");
  }

  const users = await listWebAppUsers();

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              User Management
            </h1>
            <p className="mt-2 text-sm text-foreground/65">
              Each user signs in here and connects to their own Supabase
              database.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background"
            href="/admin/new-user"
          >
            New User
          </Link>
        </div>

        <div className="mt-8 overflow-x-auto border border-foreground/10">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-foreground/5">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Supabase</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr className="border-t border-foreground/10" key={user.id}>
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.is_active ? "Active" : "Inactive"}
                  </td>
                  <td className="px-4 py-3">
                    {user.has_supabase_connection ? "Connected" : "Missing"}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link className="underline" href={`/admin/users/${user.id}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
