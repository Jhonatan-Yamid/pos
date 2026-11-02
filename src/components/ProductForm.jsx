"use client";
import { useState, useEffect } from "react";
import { apiGet } from "@/libs/apiClient";
import { Button, Input, Select, Textarea, Card } from "@/components/ui";

const RESTAURANT_CATEGORIES = [
  "Adiciones",
  "Asados",
  "Bebidas Calientes",
  "Bebidas Frías y Refrescantes",
  "Cerveza Artesanal",
  "Cocktails de Autor",
  "Entradas",
  "Hamburguesas Artesanales",
  "Licores",
  "Los Platos de la Casa",
];

const FRUVER_CATEGORIES = ["Mercado", "Fruver", "Fijos", "Otros"];

function ProductForm({ initialData, onSubmit, isNewProduct, slug }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    quantity: "",
    typeUnity: "",
    barcode: "",
    ingredients: [],
    ...initialData,
  });

  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientSuggestions, setIngredientSuggestions] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [businessType, setBusinessType] = useState("restaurant");

  useEffect(() => {
    const fetchIngredients = async () => {
      const data = await apiGet(`/api/${slug}/ingredient`);
      setAllIngredients(data);

      if (!isNewProduct && initialData?.ingredients?.length > 0) {
        const enrichedIngredients = initialData.ingredients.map((i) => {
          const fullIngredient = data.find((ing) => ing.id === i.ingredientId);
          return {
            id: i.ingredientId,
            name: fullIngredient?.name || "Ingrediente desconocido",
            quantity: i.quantity,
          };
        });
        setFormData((prev) => ({ ...prev, ingredients: enrichedIngredients }));
      }
    };

    fetchIngredients();
  }, [isNewProduct, initialData, slug]);

  useEffect(() => {
    const fetchBusinessConfig = async () => {
      try {
        const data = await apiGet(`/api/${slug}/business`);
        if (data?.type) {
          setBusinessType(data.type.toLowerCase());
        }
      } catch (err) {
        console.error("Error cargando configuración de negocio:", err);
      }
    };
    fetchBusinessConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key === "Enter") {
      // Evita que el escáner de código de barras envíe el formulario al presionar Enter.
      e.preventDefault();
    }
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setIngredientSearch(term);
    if (term.length > 0) {
      setIngredientSuggestions(
        allIngredients.filter((ingredient) => ingredient.name.toLowerCase().includes(term.toLowerCase()))
      );
    } else {
      setIngredientSuggestions([]);
    }
  };

  const handleAddIngredient = (ingredient) => {
    if (formData.ingredients.some((ing) => ing.id === ingredient.id)) return;
    setFormData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { ...ingredient, quantity: 1 }],
    }));
    setIngredientSearch("");
    setIngredientSuggestions([]);
  };

  const handleIngredientQuantityChange = (id, quantity) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing) => (ing.id === id ? { ...ing, quantity } : ing)),
    }));
  };

  const handleRemoveIngredient = (id) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((ing) => ing.id !== id),
    }));
  };

  const isFruver = businessType === "fruver";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const processedData = {
      ...formData,
      price: parseFloat(formData.price),
      quantity: isFruver ? parseFloat(formData.quantity) : null,
      typeUnity: isFruver ? formData.typeUnity : "",
      ingredients: isFruver
        ? []
        : formData.ingredients.map((i) => ({
            ingredientId: i.id,
            quantity: Number(i.quantity),
          })),
    };
    await onSubmit(processedData);
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-2xl font-bold mb-2">{isNewProduct ? "Nuevo Producto" : "Editar Producto"}</h2>

        <Input label="Nombre" name="name" value={formData.name} onChange={handleChange} />

        <Textarea
          label="Descripción"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe el producto..."
        />

        <Input
          label="Precio"
          type="number"
          step="0.01"
          name="price"
          value={formData.price}
          onChange={handleChange}
        />

        <Input
          label="Código de Barras"
          type="number"
          name="barcode"
          value={formData.barcode}
          onChange={handleChange}
          onKeyDown={handleBarcodeKeyDown}
        />

        {/* SECCIÓN FRUVER: Cantidad y Unidad (Solo si es fruver) */}
        {isFruver && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cantidad Stock"
              type="number"
              step="0.1"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="Ej: 50"
            />
            <Input
              label="Unidad"
              name="typeUnity"
              value={formData.typeUnity}
              onChange={handleChange}
              placeholder="Ej: kg, gr, lb"
            />
          </div>
        )}

        <Select label="Categoría" name="category" value={formData.category} onChange={handleChange}>
          {isFruver ? (
            <>
              <option value="">Seleccione una categoría</option>
              {FRUVER_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </>
          ) : (
            RESTAURANT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))
          )}
        </Select>

        {/* SECCIÓN INGREDIENTES: Se oculta si es fruver */}
        {!isFruver && (
          <div className="p-4 rounded-control border border-border">
            <h3 className="text-lg font-semibold mb-2">Ingredientes</h3>

            <Input
              label="Buscar Ingredientes"
              value={ingredientSearch}
              onChange={handleSearchChange}
              placeholder="Escribe para buscar..."
            />

            {ingredientSuggestions.length > 0 && (
              <ul className="mt-2 bg-surface-hover border border-border rounded-control overflow-hidden">
                {ingredientSuggestions.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    onClick={() => handleAddIngredient(ingredient)}
                    className="p-2 hover:bg-border cursor-pointer"
                  >
                    {ingredient.name}
                  </li>
                ))}
              </ul>
            )}

            {formData.ingredients.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-content-muted mb-2">Ingredientes asignados</label>
                <ul className="space-y-2">
                  {formData.ingredients.map((ing) => (
                    <li
                      key={ing.id}
                      className="flex items-center justify-between bg-surface-hover p-2 rounded-control"
                    >
                      <span>{ing.name}</span>
                      <input
                        type="number"
                        min={1}
                        value={ing.quantity}
                        onChange={(e) => handleIngredientQuantityChange(ing.id, e.target.value)}
                        className="w-20 ml-4 mr-2 p-1 bg-surface border border-border rounded text-content"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(ing.id)}
                        className="text-danger hover:text-danger-hover text-sm"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <Button type="submit" fullWidth>
          Guardar Producto
        </Button>
      </form>
    </Card>
  );
}

export default ProductForm;
