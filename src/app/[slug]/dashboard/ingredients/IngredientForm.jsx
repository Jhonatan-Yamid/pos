"use client";

import { useState } from "react";
import { Button, Input, Select, Card } from "@/components/ui";

const ORIGINS = [
  "Carne",
  "Cerveza Artesanal",
  "D1",
  "Desconocido",
  "Desechables",
  "Gaseosas",
  "Licores",
  "Pulpas",
  "Terceros",
  "Verdura",
];

function normalizeOrigin(value) {
  if (!value) return "Desconocido";
  const match = ORIGINS.find((o) => o.toLowerCase() === value.trim().toLowerCase());
  return match || "Desconocido";
}

function IngredientForm({ ingredient, onSubmit, onCancel, isNewIngredient, providers = [] }) {
  const initialFormData = isNewIngredient
    ? {
        name: "",
        description: "",
        quantity: 0,
        price: 0,
        typeUnity: "",
        Origin: "Desconocido",
        providerId: "",
      }
    : {
        id: ingredient?.id || null,
        name: ingredient.name,
        description: ingredient.description,
        quantity: ingredient.quantity,
        price: ingredient.price,
        typeUnity: ingredient.typeUnity,
        Origin: normalizeOrigin(ingredient.Origin),
        providerId: ingredient.providerId || "",
      };

  const [formData, setFormData] = useState(initialFormData);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      providerId: formData.providerId ? Number(formData.providerId) : null,
    });
  };

  return (
    <Card className="mb-10">
      <form onSubmit={handleSubmit}>
        <h2 className="text-lg font-semibold mb-6">
          {isNewIngredient ? "Nuevo ingrediente" : "Editar ingrediente"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nombre" name="name" value={formData.name} onChange={handleChange} required />

          <Input
            label="Unidad de medida"
            name="typeUnity"
            value={formData.typeUnity}
            onChange={handleChange}
            required
          />

          <Select label="Categoría (Origen)" name="Origin" value={formData.Origin} onChange={handleChange} required>
            {ORIGINS.map((origin) => (
              <option key={origin} value={origin}>
                {origin}
              </option>
            ))}
          </Select>

          <Select label="Proveedor" name="providerId" value={formData.providerId} onChange={handleChange}>
            <option value="">Sin proveedor</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </Select>

          <Input
            label="Cantidad disponible"
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
          />

          <Input
            label="Precio"
            type="number"
            step="0.01"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
          />

          <Input
            label="Descripción"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="md:col-span-2"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button type="submit" className="flex-1">
            Guardar ingrediente
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

export default IngredientForm;
