import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { getItemCategories } from "@/lib/queries";
import { ItemCategoryManager } from "./item-category-manager";

export default async function CategoriesPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const itemCategories = await getItemCategories(client);

    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold tracking-normal">
            Categories
          </h1>
          <p className="mt-2 text-sm text-foreground/65">
            Rename item categories used by expense receipts and revenue invoices.
          </p>
          <ItemCategoryManager categories={itemCategories} />
        </div>
      </main>
    );
  } finally {
    await client.end();
  }
}
