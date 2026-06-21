"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ItemCategoryManagerProps = {
  categories: string[];
};

export function ItemCategoryManager({ categories }: ItemCategoryManagerProps) {
  const router = useRouter();
  const [editing, setEditing] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const oldName = String(formData.get("old_name") || "");
    const newName = String(formData.get("new_name") || "").trim();

    if (!newName) {
      setError("Enter a new category name.");
      return;
    }

    setError("");
    setIsSaving(true);
    const response = await fetch("/api/categories/item/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_name: oldName, new_name: newName }),
    });
    setIsSaving(false);

    if (!response.ok) {
      setError("Could not rename this item category.");
      return;
    }

    setEditing("");
    router.refresh();
  }

  return (
    <div className="mt-6 overflow-hidden border border-foreground/10">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead className="bg-foreground/5">
          <tr>
            <th className="px-4 py-3 font-medium">Item Category</th>
            <th className="px-4 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr className="border-t border-foreground/10" key={category}>
              <td className="px-4 py-3">
                {editing === category ? (
                  <form className="flex flex-wrap gap-2" onSubmit={rename}>
                    <input name="old_name" type="hidden" value={category} />
                    <input
                      className="h-10 min-w-56 rounded-md border border-foreground/20 bg-background px-3"
                      defaultValue={category}
                      name="new_name"
                    />
                    <button
                      className="h-10 rounded-md bg-green-700 px-4 text-sm font-semibold text-white disabled:bg-green-700/40"
                      disabled={isSaving}
                      type="submit"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      className="h-10 rounded-md border border-foreground/20 px-4 text-sm font-medium"
                      onClick={() => setEditing("")}
                      type="button"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  category
                )}
              </td>
              <td className="px-4 py-3">
                {editing === category ? null : (
                  <button
                    className="h-9 rounded-md border border-foreground/20 px-3 text-sm font-medium"
                    onClick={() => setEditing(category)}
                    type="button"
                  >
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {categories.length === 0 ? (
        <p className="p-4 text-sm text-foreground/60">No item categories yet.</p>
      ) : null}
      {error ? <p className="p-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
