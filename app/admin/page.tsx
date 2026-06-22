import Link from "next/link";
import { redirect } from "next/navigation";
import { listWebAppUsers } from "@/lib/admin-users";
import { getCurrentSession } from "@/lib/auth";
import {
  countUnreadAdminNotifications,
  listUnreadAdminNotifications,
} from "@/lib/features";
import { ReadAllNotificationsButton } from "./read-all-notifications-button";

type AdminPageProps = {
  searchParams?: {
    notification_page?: string | string[];
    tab?: string | string[];
  };
};

const notificationsPerPage = 20;

function getParam(
  searchParams: AdminPageProps["searchParams"],
  key: keyof NonNullable<AdminPageProps["searchParams"]>,
) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function getTab(searchParams: AdminPageProps["searchParams"]) {
  return getParam(searchParams, "tab") === "notifications"
    ? "notifications"
    : "users";
}

function getNotificationPage(searchParams: AdminPageProps["searchParams"]) {
  const page = Number(getParam(searchParams, "notification_page") ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function tabHref(tab: "users" | "notifications") {
  return `/admin?tab=${tab}`;
}

function notificationPageHref(page: number) {
  return `/admin?tab=notifications&notification_page=${page}`;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await getCurrentSession();

  if (!session?.user.is_admin) {
    redirect("/dashboard");
  }

  const tab = getTab(searchParams);
  const notificationPage = getNotificationPage(searchParams);
  const notificationOffset = (notificationPage - 1) * notificationsPerPage;
  const [users, notifications, notificationTotal] = await Promise.all([
    listWebAppUsers(),
    listUnreadAdminNotifications({
      limit: notificationsPerPage,
      offset: notificationOffset,
    }),
    countUnreadAdminNotifications(),
  ]);
  const notificationTotalPages = Math.max(
    1,
    Math.ceil(notificationTotal / notificationsPerPage),
  );

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Admin Settings
            </h1>
            <p className="mt-2 text-sm text-foreground/65">
              Manage users, feature access, and admin notifications.
            </p>
          </div>
        </div>

        <div className="mt-8 flex gap-2 border-b border-foreground/10">
          <Link
            className={`px-4 py-3 text-sm ${
              tab === "users"
                ? "border-b-2 border-foreground font-medium"
                : "text-foreground/65 hover:text-foreground"
            }`}
            href={tabHref("users")}
          >
            Users
          </Link>
          <Link
            className={`px-4 py-3 text-sm ${
              tab === "notifications"
                ? "border-b-2 border-foreground font-medium"
                : "text-foreground/65 hover:text-foreground"
            }`}
            href={tabHref("notifications")}
          >
            Notifications
            {notificationTotal > 0 ? ` (${notificationTotal})` : ""}
          </Link>
        </div>

        {tab === "users" ? (
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-normal">
                  Users
                </h2>
                <p className="mt-1 text-sm text-foreground/65">
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

            <div className="mt-5 overflow-x-auto border border-foreground/10">
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
                        {user.has_supabase_connection
                          ? "Connected"
                          : "Pending Setup"}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          className="underline"
                          href={`/admin/users/${user.id}`}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="mt-8 border border-foreground/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-normal">
                  Notifications
                </h2>
                <p className="mt-1 text-sm text-foreground/65">
                  Unread feature notifications from user data detection.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-foreground/60">
                  Page {notificationPage} of {notificationTotalPages}
                </p>
                <ReadAllNotificationsButton
                  disabled={notificationTotal === 0}
                />
              </div>
            </div>

            <div className="mt-4 max-h-[640px] overflow-y-auto rounded-md border border-foreground/10 p-3">
              {notifications.length > 0 ? (
                <div className="grid gap-3">
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
                            {notification.user_name} (
                            {notification.user_email})
                          </p>
                          <p className="mt-2 text-sm text-foreground/75">
                            {notification.message}
                          </p>
                        </div>
                        <span className="text-xs text-foreground/55">
                          {new Date(
                            notification.created_at,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="p-4 text-sm text-foreground/60">
                  No unread admin notifications.
                </p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-foreground/60">
                {notificationTotal} unread notification
                {notificationTotal === 1 ? "" : "s"}
              </p>
              <div className="flex gap-3">
                {notificationPage > 1 ? (
                  <Link
                    className="underline"
                    href={notificationPageHref(notificationPage - 1)}
                  >
                    Previous
                  </Link>
                ) : null}
                {notificationPage < notificationTotalPages ? (
                  <Link
                    className="underline"
                    href={notificationPageHref(notificationPage + 1)}
                  >
                    Next
                  </Link>
                ) : null}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
