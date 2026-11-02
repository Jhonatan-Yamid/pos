"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";

const ProductInventory = () => {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [groupedProducts, setGroupedProducts] = useState({});
  const [modifiedFields, setModifiedFields] = useState(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState({});

  const daysAgo = (date) => {
    if (!date) return 0;
    const dateString = typeof date === "string" ? date.replace(" ", "T") : date;
    const lastUpdated = new Date(dateString);
    if (isNaN(lastUpdated.getTime())) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(lastUpdated);
    compareDate.setHours(0, 0, 0, 0);
    const diffTime = today - compareDate;
    return Math.max(0, Math.floor(diffTime / (1000 * 3600 * 24)));
  };

  useEffect(() => {
    if (!slug) return;
    const fetchProducts = async () => {
      try {
        const response = await fetch(`/api/${slug}/products`);
        const data = await response.json();

        if (Array.isArray(data)) {
          setProducts(data);

          const grouped = data.reduce((acc, product) => {
            const category = product.category || "Desconocida";
            if (!acc[category]) acc[category] = [];
            acc[category].push(product);
            return acc;
          }, {});

          setGroupedProducts(grouped);

          const initState = {};
          Object.keys(grouped).forEach((cat) => (initState[cat] = true));
          setCollapsed(initState);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, [slug]);

  const filteredGrouped = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    const result = {};

    Object.keys(groupedProducts).forEach((category) => {
      result[category] = groupedProducts[category].filter((prod) =>
        prod.name.toLowerCase().includes(lower)
      );
    });

    return result;
  }, [searchTerm, groupedProducts]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      const allClosed = {};
      Object.keys(groupedProducts).forEach((cat) => (allClosed[cat] = true));
      setCollapsed(allClosed);
      return;
    }

    const expanded = {};
    Object.keys(groupedProducts).forEach((category) => {
      expanded[category] = groupedProducts[category].some((prod) =>
        prod.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
        ? false
        : true;
    });

    setCollapsed(expanded);
  }, [searchTerm]);

  const handleQuantityChange = (e, productId) => {
    const newValue = e.target.value;

    setProducts((prev) =>
      prev.map((prod) =>
        prod.id === productId ? { ...prod, quantity: newValue } : prod
      )
    );

    setGroupedProducts((prev) => {
      const updated = {};
      Object.keys(prev).forEach((cat) => {
        updated[cat] = prev[cat].map((prod) =>
          prod.id === productId ? { ...prod, quantity: newValue } : prod
        );
      });
      return updated;
    });

    setModifiedFields((prev) => {
      const updated = new Map(prev);
      updated.set(productId, true);
      return updated;
    });
  };

  const handleQuantityBlur = (e, productId) => {
    const finalValue = e.target.value.trim();

    if (!/^(\d+(\.\d{0,2})?|Insuficiente)?$/.test(finalValue)) {
      alert("Por favor, ingresa un valor válido (número o 'Insuficiente').");
      return;
    }

    const parsedValue =
      finalValue === "Insuficiente" ? null : parseFloat(finalValue) || 0;

    setProducts((prev) =>
      prev.map((prod) =>
        prod.id === productId ? { ...prod, quantity: parsedValue } : prod
      )
    );

    setGroupedProducts((prev) => {
      const updated = {};
      Object.keys(prev).forEach((cat) => {
        updated[cat] = prev[cat].map((prod) =>
          prod.id === productId ? { ...prod, quantity: parsedValue } : prod
        );
      });
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const modifiedData = Array.from(modifiedFields.entries())
      .filter(([, modified]) => modified)
      .map(([id]) => {
        const product = products.find((p) => p.id === id);
        return { id, quantity: product.quantity };
      });

    if (modifiedData.length === 0) {
      alert("No hay cambios para guardar.");
      return;
    }

    try {
      const response = await fetch(`/api/${slug}/products`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modifiedData),
      });

      if (response.ok) {
        alert("Inventario actualizado exitosamente.");
        setModifiedFields(new Map());
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Error enviando datos:", error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-slate-200">
        Inventario de Productos
      </h1>

      <input
        type="text"
        placeholder="Buscar producto..."
        className="mb-6 p-2 rounded border border-white text-slate-200 bg-gray-700 w-full"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <form onSubmit={handleSubmit} className="space-y-3">
        {Object.keys(groupedProducts).map((category) => {
          const productsInCategory = filteredGrouped[category];

          return (
            <div
              key={category}
              className="p-3 rounded-lg border border-white bg-gray-950"
            >
              <div
                className="flex justify-between items-center cursor-pointer py-2"
                onClick={() =>
                  setCollapsed((prev) => ({
                    ...prev,
                    [category]: !prev[category],
                  }))
                }
              >
                <h2 className="text-slate-200 text-md font-semibold">
                  {category}
                </h2>
                <span className="text-slate-300 text-sm">
                  {collapsed[category] ? "▶" : "▼"}
                </span>
              </div>

              <div
                className={`transition-all duration-300 ${
                  collapsed[category]
                    ? "max-h-0 overflow-hidden opacity-0"
                    : "max-h-none opacity-100"
                }`}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 py-2">
                  {productsInCategory.length === 0 ? (
                    <p className="text-slate-500 text-sm col-span-full px-2">
                      No hay coincidencias...
                    </p>
                  ) : (
                    productsInCategory.map((product) => {
                      const isModified = modifiedFields.get(product.id) || false;
                      const daysSinceUpdate = daysAgo(product.updatedAt);

                      return (
                        <div key={product.id} className="flex flex-col">
                          <div className="flex justify-between items-center mb-1">
                            <div
                              className={`text-sm font-medium ${
                                isModified ? "text-red-500" : "text-slate-300"
                              }`}
                            >
                              {product.name}{" "}
                              <small className="text-[0.6rem] text-slate-400">
                                {product.typeUnity}
                              </small>
                            </div>
                            <small className="text-[0.65rem] text-slate-400">
                              {daysSinceUpdate === 0
                                ? "(Hoy)"
                                : `(${daysSinceUpdate} días)`}
                            </small>
                          </div>

                          <input
                            type="text"
                            value={
                              product.quantity === null
                                ? "Insuficiente"
                                : product.quantity
                            }
                            onChange={(e) =>
                              handleQuantityChange(e, product.id)
                            }
                            onBlur={(e) => handleQuantityBlur(e, product.id)}
                            className={`border p-2 rounded bg-gray-700 text-slate-200 ${
                              isModified ? "border-red-500" : "border-white"
                            }`}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4"
        >
          Enviar
        </button>
      </form>
    </div>
  );
};

export default ProductInventory;
