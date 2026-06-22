import Link from "next/link";
import { redirect } from "next/navigation";
import { listWebAppUsers } from "@/lib/admin-users";
import { getCurrentSession } from "@/lib/auth";
import { listUnreadAdminNotifications } from "@/lib/features";

export default async function AdminPage() {
  const session = await getCurrentSession();

  if (!session?.user.is_admin) {
    redirect("/dashboard");
  }

  const [users, notifications] = await Promise.all([
    listWebAppUsers(),
    listUnreadAdminNotifications(),
  ]);

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              User Management
            </h1>
            <p className="mt-2 text-sm text-foreground/65">
              New registered users appear as pending until an admin connects
              and initializes their Supabase database.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background"
            href="/admin/new-user"
          >
            New User
          </Link>
        </div>

        <section className="mt-8 border border-foreground/10 p-5">
          <h2 className="text-lg font-semibold tracking-normal">
            Admin Notifications
          </h2>
          {notifications.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {notifications.map((notification) => (
                <Link
                  className="block rounded-md border border-foreground/10 p-4 transition-colors hover:border-blue-700 hover:bg-blue-50"
                  href={`/admin/users/${notification.user_id}`}
                  key={notification.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{notification.title}</p>
                      <p className="mt-1 text-sm text-foreground/65">
                        {notification.user_name} ({notification.user_email})
                      </p>
                      <p className="mt-2 text-sm text-foreground/75">
                        {notification.message}
                      </p>
                    </div>
                    <span className="text-xs text-foreground/55">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-foreground/60">
              No unread admin notifications.
            </p>
          )}
        </section>

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
                    {user.has_supabase_connection ? "Connected" : "Pending Setup"}
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
