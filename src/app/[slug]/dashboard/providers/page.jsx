"use client";

import { useState } from "react";
import { Copy, ShoppingCart, Pencil, Trash2, Phone } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useCrud } from "@/hooks/useCrud";
import {
  Button,
  Input,
  PageContainer,
  PageHeader,
  Card,
  SearchInput,
  EmptyState,
  Modal,
} from "@/components/ui";

const emptyProvider = {
  id: null,
  name: "",
  description: "",
  accountNumber: "",
  phone: "",
};

export default function ProvidersPage() {
  const router = useRouter();
  const { slug } = useParams();

  const {
    filteredItems: providers,
    searchTerm,
    setSearchTerm,
    create,
    update,
    remove,
  } = useCrud({
    endpoint: `/api/${slug}/providers`,
    searchFields: ["name"],
    refetchAfterMutation: true,
  });

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(emptyProvider);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [orderItems, setOrderItems] = useState({});

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const resetForm = () => {
    setFormData(emptyProvider);
    setIsEditing(false);
    setIsFormVisible(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEditing) {
      await update(formData);
    } else {
      await create(formData);
    }
    resetForm();
  };

  const handleEdit = (provider) => {
    setFormData({
      id: provider.id,
      name: provider.name || "",
      description: provider.description || "",
      accountNumber: provider.accountNumber || "",
      phone: provider.phone || "",
    });
    setIsEditing(true);
    setIsFormVisible(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este proveedor?")) return;
    await remove(id);
  };

  const handleCopy = (accountNumber) =>
    navigator.clipboard.writeText(accountNumber);

  const toggleForm = () => {
    if (isFormVisible) {
      resetForm();
    } else {
      setIsFormVisible(true);
      setIsEditing(false);
    }
  };

  const openOrderModal = (provider) => {
    setSelectedProvider(provider);
    setOrderItems({});
  };

  const sendOrder = () => {
    if (!selectedProvider.phone) {
      alert("Este proveedor no tiene número registrado");
      return;
    }

    const items = Object.values(orderItems).filter(
      (item) => item.quantity && item.quantity > 0
    );

    if (items.length === 0) {
      alert("Selecciona al menos un ingrediente");
      return;
    }

    let message = `${selectedProvider.name}, Pedido:\n\n`;
    items.forEach((item) => {
      message += `• ${item.quantity} - ${item.name}\n`;
    });

    const encoded = encodeURIComponent(message);
    window.open(
      `https://wa.me/${selectedProvider.phone}?text=${encoded}`,
      "_blank"
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Proveedores"
        action={
          <Button variant="secondary" onClick={toggleForm}>
            {isFormVisible ? "Cancelar" : "Agregar proveedor"}
          </Button>
        }
      />

      {isFormVisible && (
        <Card className="mb-10">
          <form onSubmit={handleSubmit}>
            <h2 className="text-lg font-semibold mb-6">
              {isEditing ? "Editar proveedor" : "Nuevo proveedor"}
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nombre"
                required
              />
              <Input
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                placeholder="Número de cuenta"
                required
              />
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Celular (57300...)"
              />
              <Input
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Descripción"
              />
            </div>

            <Button type="submit" className="mt-6">
              {isEditing ? "Actualizar" : "Guardar"}
            </Button>
          </form>
        </Card>
      )}

      <SearchInput
        placeholder="Buscar proveedor..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-8"
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {providers.map((provider) => (
          <Card
            key={provider.id}
            className="hover:border-border-hover transition"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg">{provider.name}</h3>
                {provider.phone && (
                  <p className="text-sm text-content-muted flex items-center gap-2 mt-1">
                    <Phone size={14} />
                    {provider.phone}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Pencil
                  size={18}
                  className="cursor-pointer text-content-muted hover:text-content"
                  onClick={() => handleEdit(provider)}
                />
                <Trash2
                  size={18}
                  className="cursor-pointer text-content-muted hover:text-danger"
                  onClick={() => handleDelete(provider.id)}
                />
              </div>
            </div>

            <p className="text-sm text-content-muted mb-2">
              {provider.description || "Sin descripción"}
            </p>
            <p className="text-sm text-content-subtle mb-4">
              Cuenta: {provider.accountNumber}
            </p>

            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                icon={Copy}
                onClick={() => handleCopy(provider.accountNumber)}
              >
                Copiar cuenta
              </Button>

              {provider.ingredients?.length > 0 && (
                <Button
                  variant="secondary"
                  icon={ShoppingCart}
                  onClick={() => openOrderModal(provider)}
                >
                  Realizar pedido
                </Button>
              )}

              <Button
                onClick={() =>
                  router.push(`/${slug}/dashboard/providers/${provider.id}`)
                }
              >
                Ver movimientos
              </Button>
            </div>
          </Card>
        ))}
        {providers.length === 0 && (
          <EmptyState message="No se encontraron proveedores." />
        )}
      </div>

      <Modal
        open={!!selectedProvider}
        onClose={() => setSelectedProvider(null)}
        title={
          selectedProvider ? `Pedido a ${selectedProvider.name}` : ""
        }
      >
        {selectedProvider && (
          <>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {selectedProvider.ingredients.map((ing) => (
                <div key={ing.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setOrderItems((prev) => ({
                          ...prev,
                          [ing.id]: { quantity: "", name: ing.name },
                        }));
                      } else {
                        const copy = { ...orderItems };
                        delete copy[ing.id];
                        setOrderItems(copy);
                      }
                    }}
                  />
                  <div className="flex-1">
                    <div>{ing.name}</div>
                    <div className="text-xs text-content-muted">
                      Stock: {ing.quantity ?? "Insuficiente"}
                    </div>
                  </div>
                  {orderItems[ing.id] && (
                    <input
                      type="number"
                      placeholder="Cantidad"
                      className="w-20 p-1 rounded bg-surface-hover border border-border"
                      onChange={(e) =>
                        setOrderItems((prev) => ({
                          ...prev,
                          [ing.id]: {
                            ...prev[ing.id],
                            quantity: e.target.value,
                          },
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setSelectedProvider(null)}
              >
                Cancelar
              </Button>
              <Button variant="success" onClick={sendOrder}>
                Enviar pedido
              </Button>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
