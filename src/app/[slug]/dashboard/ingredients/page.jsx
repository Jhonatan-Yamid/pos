"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import IngredientForm from "./IngredientForm";
import IngredientItem from "./IngredientItem";
import { useCrud } from "@/hooks/useCrud";
import { apiGet } from "@/libs/apiClient";
import { Button, PageContainer, PageHeader, SearchInput, EmptyState } from "@/components/ui";

export default function IngredientsPage() {
  const { slug } = useParams();

  const {
    filteredItems: ingredients,
    searchTerm,
    setSearchTerm,
    create,
    update,
    remove,
  } = useCrud({ endpoint: `/api/${slug}/ingredient`, searchFields: ["name"] });

  const [providers, setProviders] = useState([]);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [isNewIngredient, setIsNewIngredient] = useState(false);

  useEffect(() => {
    if (!slug) return;
    apiGet(`/api/${slug}/providers`).then(setProviders);
  }, [slug]);

  const handleEdit = (ingredient) => {
    setEditingIngredient(ingredient);
    setIsNewIngredient(false);
  };

  const handleNewIngredient = () => {
    setEditingIngredient(null);
    setIsNewIngredient(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este ingrediente?")) return;
    await remove(id);
  };

  const closeForm = () => {
    setEditingIngredient(null);
    setIsNewIngredient(false);
  };

  const handleFormSubmit = async (data) => {
    if (isNewIngredient) {
      await create(data);
      closeForm();
    } else {
      const updated = await update({ ...data, actualizar: true });
      setEditingIngredient(updated);
      setIsNewIngredient(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Ingredientes"
        action={<Button onClick={handleNewIngredient}>Nuevo Ingrediente</Button>}
      />

      {(editingIngredient || isNewIngredient) && (
        <IngredientForm
          key={editingIngredient?.id || "new"}
          ingredient={editingIngredient}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          isNewIngredient={isNewIngredient}
          providers={providers}
        />
      )}

      <SearchInput
        placeholder="Buscar ingrediente..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-8"
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {ingredients.map((ingredient) => (
          <IngredientItem
            key={ingredient.id}
            ingredient={ingredient}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        {ingredients.length === 0 && <EmptyState message="No se encontraron ingredientes." />}
      </div>
    </PageContainer>
  );
}
