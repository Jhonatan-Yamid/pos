"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { apiGet, apiPost, apiDelete } from "@/libs/apiClient";
import { Button, Input, Textarea, PageContainer, Card, Modal } from "@/components/ui";

export default function ProviderDetail() {
  const { slug, id } = useParams();

  const [movements, setMovements] = useState([]);
  const [balance, setBalance] = useState(0);
  const [providerName, setProviderName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movementType, setMovementType] = useState("INVOICE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [isImageOpen, setIsImageOpen] = useState(false);

  useEffect(() => {
    if (!id || !slug) return;

    const fetchData = async () => {
      const movData = await apiGet(
        `/api/${slug}/provider-movements?providerId=${id}`
      );
      const providers = await apiGet(`/api/${slug}/providers`);
      const provider = providers.find((p) => p.id === parseInt(id));
      setProviderName(provider?.name || "Proveedor");
      setMovements(movData);

      const total = movData.reduce((acc, mov) => {
        if (mov.type === "INVOICE") return acc + mov.amount;
        if (mov.type === "PAYMENT") return acc - mov.amount;
        return acc;
      }, 0);
      setBalance(total);
    };

    fetchData();
  }, [id, slug]);

  const uploadImage = async () => {
    if (!imageFile) return null;
    const formData = new FormData();
    formData.append("file", imageFile);
    const res = await fetch(`/api/${slug}/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data?.url) {
      throw new Error(
        data?.error || "No se pudo subir la imagen. Intenta de nuevo."
      );
    }
    return data.url;
  };

  const createMovement = async () => {
    if (isSubmitting) return;
    if (!amount || Number(amount) <= 0) {
      setModalError("Ingresa un monto válido.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      const imageUrl = imageFile ? await uploadImage() : null;

      await apiPost(`/api/${slug}/provider-movements`, {
        providerId: parseInt(id),
        type: movementType,
        amount,
        description,
        imageUrl,
        createdAt: date,
      });

      setIsModalOpen(false);
      setAmount("");
      setDescription("");
      setImageFile(null);
      setFileInputKey((k) => k + 1);
      window.location.reload();
    } catch (error) {
      setModalError(error.message || "No se pudo guardar el movimiento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteMovement = async (movId) => {
    if (!confirm("¿Seguro que quieres eliminar este movimiento?")) return;
    await apiDelete(`/api/${slug}/provider-movements?id=${movId}`);
    window.location.reload();
  };

  return (
    <PageContainer maxWidth="max-w-2xl">
      <p className="text-sm text-content-muted">Proveedor</p>
      <h1 className="text-2xl font-semibold mb-4">{providerName}</h1>

      <p className="text-sm text-content-muted">Saldo actual</p>
      <div
        className={`text-4xl font-bold mt-1 mb-6 ${
          balance > 0 ? "text-danger" : "text-success"
        }`}
      >
        ${balance.toLocaleString("es-CO")}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Button
          variant="secondary"
          size="none"
          className="flex-col p-4"
          onClick={() => {
            setMovementType("INVOICE");
            setModalError(null);
            setIsModalOpen(true);
          }}
        >
          <ArrowUpRight className="w-6 h-6 text-success" />
          <span className="text-sm">Registrar Factura</span>
        </Button>

        <Button
          variant="secondary"
          size="none"
          className="flex-col p-4"
          onClick={() => {
            setMovementType("PAYMENT");
            setModalError(null);
            setIsModalOpen(true);
          }}
        >
          <ArrowDownLeft className="w-6 h-6 text-danger" />
          <span className="text-sm">Registrar Pago</span>
        </Button>
      </div>

      <h2 className="text-lg font-semibold mb-4">Actividad</h2>

      <div className="space-y-3">
        {movements.map((mov) => (
          <Card
            key={mov.id}
            className="relative hover:bg-surface-hover transition flex justify-between items-center cursor-pointer p-4"
            onClick={() => setSelectedMovement(mov)}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${
                  mov.type === "INVOICE" ? "bg-success-soft" : "bg-danger-soft"
                }`}
              >
                {mov.type === "INVOICE" ? (
                  <ArrowUpRight className="w-4 h-4 text-success" />
                ) : (
                  <ArrowDownLeft className="w-4 h-4 text-danger" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {mov.type === "INVOICE"
                    ? "Factura registrada"
                    : "Pago realizado"}
                </p>
                <p className="text-xs text-content-subtle">
                  {new Date(mov.createdAt).toLocaleDateString("es-CO")}
                </p>
              </div>
            </div>

            <div
              className={`font-semibold ${
                mov.type === "INVOICE" ? "text-success" : "text-danger"
              }`}
            >
              {mov.type === "INVOICE" ? "+" : "-"}$
              {mov.amount.toLocaleString("es-CO")}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteMovement(mov.id);
              }}
              className="absolute top-2 right-2 text-content-subtle hover:text-danger text-xs"
            >
              ✕
            </button>
          </Card>
        ))}
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalError(null);
        }}
        title={movementType === "INVOICE" ? "Nueva Factura" : "Nuevo Pago"}
        maxWidth="max-w-md"
      >
        <div className="space-y-3">
          <Input
            type="number"
            placeholder="Valor"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Textarea
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            className="w-full text-sm"
          />
          {modalError && (
            <p className="text-danger text-sm">{modalError}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button
            variant="ghost"
            onClick={() => setIsModalOpen(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={createMovement} disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!selectedMovement}
        onClose={() => setSelectedMovement(null)}
        title={
          selectedMovement?.type === "INVOICE" ? "Factura" : "Pago"
        }
        maxWidth="max-w-md"
      >
        {selectedMovement && (
          <>
            <p className="text-sm text-content-muted -mt-2 mb-4">
              {new Date(selectedMovement.createdAt).toLocaleString("es-CO")}
            </p>

            <p className="text-2xl font-bold mb-4">
              ${selectedMovement.amount.toLocaleString("es-CO")}
            </p>

            {selectedMovement.description && (
              <p className="text-sm text-content-muted mb-4">
                {selectedMovement.description}
              </p>
            )}

            {selectedMovement.imageUrl && (
              <div className="mb-4">
                <img
                  src={selectedMovement.imageUrl}
                  onClick={() => setIsImageOpen(true)}
                  className="rounded-control border border-border cursor-zoom-in w-full object-cover max-h-64"
                  alt="Soporte de movimiento"
                />
                <p className="text-xs text-content-subtle mt-1 text-center">
                  Toca la imagen para ampliar
                </p>
              </div>
            )}

            <Button fullWidth onClick={() => setSelectedMovement(null)}>
              Cerrar
            </Button>
          </>
        )}
      </Modal>

      {isImageOpen && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setIsImageOpen(false)}
        >
          <button
            onClick={() => setIsImageOpen(false)}
            className="absolute top-6 right-6 text-white text-3xl font-bold"
          >
            ✕
          </button>
          <img
            onClick={(e) => e.stopPropagation()}
            src={selectedMovement?.imageUrl}
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-control"
            alt="Soporte ampliado"
          />
        </div>
      )}
    </PageContainer>
  );
}
