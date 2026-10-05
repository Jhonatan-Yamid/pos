"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/libs/apiClient";
import { Button, Input, Textarea, Select, PageContainer, PageHeader, Card } from "@/components/ui";

/**
 * F4: registrar una factura de proveedor para usuarios con role != 1.
 *
 * A propósito es una página separada de /dashboard/providers (la que usa
 * role === 1): aquí el selector de proveedor SOLO trae {id, name} desde
 * /api/providers?minimal=1 — nunca accountNumber ni otros datos sensibles,
 * que siguen siendo visibles solo para role === 1 en /dashboard/providers.
 *
 * Reutiliza el mismo endpoint de siempre (/api/provider-movements) con
 * type: "INVOICE", igual que el flujo existente de role 1.
 */
export default function ProviderInvoicePage() {
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [imageFile, setImageFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    apiGet("/api/providers?minimal=1")
      .then((data) => setProviders(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error cargando proveedores:", err));
  }, []);

  const resetForm = () => {
    setProviderId("");
    setAmount("");
    setDescription("");
    setDate(new Date().toISOString().slice(0, 16));
    setImageFile(null);
    setFileInputKey((k) => k + 1);
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    const formData = new FormData();
    formData.append("file", imageFile);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok || !data?.url) {
      throw new Error(data?.error || "No se pudo subir la imagen. Intenta de nuevo.");
    }
    return data.url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!providerId) {
      setFeedback({ type: "error", text: "Selecciona un proveedor." });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setFeedback({ type: "error", text: "Ingresa un monto válido." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const imageUrl = imageFile ? await uploadImage() : null;
      await apiPost("/api/provider-movements", {
        providerId: parseInt(providerId, 10),
        type: "INVOICE",
        amount,
        description,
        imageUrl,
        createdAt: date,
      });
      setFeedback({ type: "success", text: "Factura registrada correctamente." });
      resetForm();
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "No se pudo registrar la factura." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer maxWidth="max-w-xl">
      <PageHeader title="Registrar factura de proveedor" />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Proveedor"
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
          >
            <option value="">Selecciona un proveedor</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.description ? p.description : "sin descripción"}
              </option>
            ))}
          </Select>

          <Input
            label="Monto"
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ej: 150000"
          />

          <Textarea
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalle de la factura"
            rows={3}
          />

          <Input
            label="Fecha"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <div>
            <label className="block text-sm text-content-muted mb-1">Soporte (opcional)</label>
            <input
              key={fileInputKey}
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </div>

          {feedback && (
            <div
              className={`text-sm rounded-md p-2 ${
                feedback.type === "error"
                  ? "text-red-400 bg-red-900/20"
                  : "text-emerald-400 bg-emerald-900/20"
              }`}
            >
              {feedback.text}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Registrar factura"}
          </Button>
        </form>
      </Card>
    </PageContainer>
  );
}
