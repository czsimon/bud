"use client";

import { CategoryList } from "@/components/category-list";
import { useHousehold } from "@/components/household-provider";

export default function CategoriesPage() {
  const { categories, events, profile, saveCategory, deleteCategory } =
    useHousehold();

  return (
    <CategoryList
      categories={categories}
      events={events}
      currency={profile.currency}
      onSave={saveCategory}
      onDelete={deleteCategory}
    />
  );
}
