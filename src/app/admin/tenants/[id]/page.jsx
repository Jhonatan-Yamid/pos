"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { maskSecretField } from "@/libs/publicConfig";

/**
 * Edit tenant form — client component.
 *
 * Loads the tenant from GET /api/admin/tenants/[id] (API returns masked secret
 * fields). On submit, calls PUT /api/admin/tenants/[id].
 *
 * Secret field handling:
 *   - The displayed value is the masked string from the API (e.g. "********1234").
 *   - The user can leave it blank to keep the current value, or type a new value
 *     to replace it. We track a separate "dirty" set of secret fields.
 *   - Fields that are blank (user cleared them) are omitted from the PUT body
 *     so the server keeps the existing value.
 *
 * Requirements: 7.6, 7.7, 7.8
 */

const SECRET_FIELDS = ["database_url", "cloudinary_api_key", "cloudinary_api_secret"];

/**
 * Returns true if the value looks like a masked value (i.e. was NOT changed
 * by the user — it starts with "********" and is exactly as returned by the API).
 */
function isMaskedValue(value) {
  return typeof value === "string" && value.startsWith("********");
}

/**
 * Labeled input field.
 */
function FormField({ label, name, type = "text", value, onChange, errors, placeholder, required, hint }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-400 mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder ?? ""}
        className={`w-full bg-gray-900 border rounded-lg px-3 py-2 text-slate-200 text-sm placeholder-gray-600 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
          errors?.[name] ? "border-red-500" : "border-gray-700"
        }`}
      />
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
      {errors?.[name] && (
        <p className="text-red-400 text-xs mt-1">{errors[name]}</p>
      )}
    </div>
  );
}

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params?.id;

  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Load tenant on mount
  useEffect(() => {
    if (!tenantId) return;

    async function loadTenant() {
      try {
        const res = await fetch(`/api/admin/tenants/${tenantId}`);
        if (res.status === 404) {
          setLoadError("Tenant no encontrado.");
          return;
        }
        if (!res.ok) {
          setLoadError("Error al cargar el tenant.");
          return;
        }
        const data = await res.json();
        setForm(data);
      } catch {
        setLoadError("Error de red al cargar el tenant.");
      }
    }

    loadTenant();
  }, [tenantId]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setSuccessMessage(null);
    setGlobalError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setGlobalError(null);
    setSuccessMessage(null);

    // Build the PUT body.
    // For secret fields: if the current value is still the masked string
    // (i.e. unchanged) or is blank, omit the field so the server keeps the
    // existing value. Only send the field if the user typed a new plain value.
    const body = { ...form };

    for (const field of SECRET_FIELDS) {
      const val = body[field];
      if (!val || isMaskedValue(val)) {
        // Unchanged or cleared — do not send; server keeps existing value
        delete body[field];
      }
      // Otherwise, the user typed a new value — include it
    }

    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 422) {
        const data = await res.json();
        setErrors(data.errors ?? {});
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setGlobalError(data.error ?? "Error al actualizar el tenant.");
        return;
      }

      const updated = await res.json();
      // Refresh form with the new masked values returned by the API
      setForm(updated);
      setSuccessMessage("Tenant actualizado correctamente.");
    } catch {
      setGlobalError("Error de red al actualizar el tenant.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm("¿Seguro que deseas desactivar este tenant? Los usuarios no podrán acceder.")) {
      return;
    }
    setIsDeactivating(true);
    setGlobalError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setGlobalError(data.error ?? "Error al desactivar el tenant.");
        return;
      }

      setSuccessMessage("Tenant desactivado. La caché ha sido invalidada.");
      setForm((prev) => ({ ...prev, is_active: false }));
    } catch {
      setGlobalError("Error de red al desactivar el tenant.");
    } finally {
      setIsDeactivating(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────
  if (!form && !loadError) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-gray-400 animate-pulse">Cargando tenant…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-4">
          {loadError}
        </div>
        <Link href="/admin/tenants" className="mt-4 inline-block text-gray-400 hover:text-gray-200 text-sm">
          ← Volver a la lista
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/tenants"
          className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-slate-100">
          Editar Tenant
          <span className="ml-2 font-mono text-emerald-400 text-lg">{form.slug}</span>
        </h1>
        {!form.is_active && (
          <span className="bg-red-900 text-red-300 text-xs px-2 py-1 rounded-full font-semibold">
            Inactivo
          </span>
        )}
      </div>

      {successMessage && (
        <div className="bg-emerald-900/40 border border-emerald-700 text-emerald-300 rounded-lg p-4 mb-4 text-sm">
          {successMessage}
        </div>
      )}

      {globalError && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-4 mb-4 text-sm">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Identity (slug is read-only) ─────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Identidad
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Slug</label>
            <div className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-emerald-400 text-sm font-mono">
              {form.slug}
            </div>
            <p className="text-xs text-gray-600 mt-1">El slug no puede modificarse.</p>
          </div>

          <FormField
            label="Nombre de la App"
            name="app_name"
            value={form.app_name}
            onChange={handleChange}
            errors={errors}
            required
          />

          <FormField
            label="Nombre Corto de la App"
            name="app_short_name"
            value={form.app_short_name ?? ""}
            onChange={handleChange}
            errors={errors}
          />

          <FormField
            label="Nombre (interno)"
            name="name"
            value={form.name ?? ""}
            onChange={handleChange}
            errors={errors}
          />

          <FormField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            errors={errors}
            required
          />

          <FormField
            label="Teléfono"
            name="phone"
            value={form.phone ?? ""}
            onChange={handleChange}
            errors={errors}
          />
        </section>

        {/* ── Secret fields ─────────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Credenciales
          </h2>
          <p className="text-xs text-gray-500">
            Los campos marcados con 🔒 están enmascarados. Déjalos en blanco para conservar el valor actual,
            o escribe un valor nuevo para reemplazarlo.
          </p>

          <FormField
            label="🔒 URL de la Base de Datos"
            name="database_url"
            value={form.database_url ?? ""}
            onChange={handleChange}
            errors={errors}
            placeholder="Dejar en blanco para conservar el valor actual"
            hint="Valor actual enmascarado. Ingresa uno nuevo para actualizarlo."
            required
          />

          <FormField
            label="🔒 Cloudinary API Key"
            name="cloudinary_api_key"
            value={form.cloudinary_api_key ?? ""}
            onChange={handleChange}
            errors={errors}
            placeholder="Dejar en blanco para conservar el valor actual"
            hint="Valor actual enmascarado. Ingresa uno nuevo para actualizarlo."
          />

          <FormField
            label="🔒 Cloudinary API Secret"
            name="cloudinary_api_secret"
            value={form.cloudinary_api_secret ?? ""}
            onChange={handleChange}
            errors={errors}
            placeholder="Dejar en blanco para conservar el valor actual"
            hint="Valor actual enmascarado. Ingresa uno nuevo para actualizarlo."
          />
        </section>

        {/* ── Cloudinary public fields ──────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Cloudinary
          </h2>

          <FormField
            label="Cloud Name"
            name="cloudinary_cloud_name"
            value={form.cloudinary_cloud_name ?? ""}
            onChange={handleChange}
            errors={errors}
          />
        </section>

        {/* ── Manifest & branding ───────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Íconos y Branding
          </h2>

          <FormField
            label="Ícono 192×192 (URL)"
            name="manifest_icon_192"
            value={form.manifest_icon_192 ?? ""}
            onChange={handleChange}
            errors={errors}
          />
          <FormField
            label="Ícono 256×256 (URL)"
            name="manifest_icon_256"
            value={form.manifest_icon_256 ?? ""}
            onChange={handleChange}
            errors={errors}
          />
          <FormField
            label="Ícono 512×512 (URL)"
            name="manifest_icon_512"
            value={form.manifest_icon_512 ?? ""}
            onChange={handleChange}
            errors={errors}
          />
          <FormField
            label="Logo Blanco (URL)"
            name="white_logo_url"
            value={form.white_logo_url ?? ""}
            onChange={handleChange}
            errors={errors}
          />
        </section>

        {/* ── Estado ────────────────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              className="w-4 h-4 rounded accent-emerald-500"
            />
            <span className="text-sm text-slate-300">Tenant activo</span>
          </label>
        </section>

        <div className="flex gap-3 flex-wrap">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </button>
          <Link
            href="/admin/tenants"
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Cancelar
          </Link>
          {form.is_active && (
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={isDeactivating}
              className="ml-auto bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-red-200 px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {isDeactivating ? "Desactivando..." : "Desactivar Tenant"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
