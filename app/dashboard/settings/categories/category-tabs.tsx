"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type CategoryGroup = {
  id: string;
  label: string;
  categories: string[];
};

type CategoryTabsProps = {
  groups: CategoryGroup[];
};

export function CategoryTabs({ groups }: CategoryTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    groups.some((group) => group.id === initialTab) ? initialTab ?? groups[0].id : groups[0].id,
  );
  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeTab) ?? groups[0],
    [activeTab, groups],
  );

  function selectTab(tab: string) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2 border-b border-foreground/10">
        {groups.map((group) => (
          <button
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-foreground/5 ${
              activeTab === group.id
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-foreground/65"
            }`}
            key={group.id}
            onClick={() => selectTab(group.id)}
            type="button"
          >
            {group.label}
          </button>
        ))}
      </div>
      <CategoryTable
        categories={activeGroup.categories}
        categoryType={activeGroup.id}
        label={activeGroup.label}
        routerRefresh={() => router.refresh()}
      />
    </div>
  );
}

function CategoryTable({
  categories,
  categoryType,
  label,
  routerRefresh,
}: {
  categories: string[];
  categoryType: string;
  label: string;
  routerRefresh: () => void;
}) {
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
    const response = await fetch("/api/categories/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        old_name: oldName,
        new_name: newName,
        type: categoryType,
      }),
    });
    setIsSaving(false);

    if (!response.ok) {
      setError("Could not rename this category.");
      return;
    }

    setEditing("");
    routerRefresh();
  }

  return (
    <div className="mt-5 overflow-hidden border border-foreground/10">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead className="bg-foreground/5">
          <tr>
            <th className="px-4 py-3 font-medium">{label}</th>
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
                      className="h-10 rounded-md border border-foreground/20 px-4 text-sm font-medium transition-colors hover:bg-foreground/5"
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
                    className="h-9 rounded-md border border-foreground/20 px-3 text-sm font-medium transition-colors hover:border-blue-700 hover:bg-blue-50 hover:text-blue-700"
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
        <p className="p-4 text-sm text-foreground/60">No categories yet.</p>
      ) : null}
      {error ? <p className="p-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
