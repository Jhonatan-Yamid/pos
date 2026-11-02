"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Create new tenant form — client component.
 *
 * Calls POST /api/admin/tenants. On 422 response, displays per-field
 * validation errors. On success, redirects to the tenant list.
 *
 * Requirements: 7.4, 7.5
 */

const INITIAL_FORM = {
  slug: "",
  name: "",
  app_name: "",
  app_short_name: "",
  email: "",
  phone: "",
  database_url: "",
  cloudinary_cloud_name: "",
  cloudinary_api_key: "",
  cloudinary_api_secret: "",
  manifest_icon_192: "",
  manifest_icon_256: "",
  manifest_icon_512: "",
  white_logo_url: "",
  is_active: true,
};

/**
 * Simple labeled input component.
 */
function FormField({ label, name, type = "text", form, onChange, errors, placeholder, required }) {
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
        value={form[name]}
        onChange={onChange}
        placeholder={placeholder ?? ""}
        className={`w-full bg-gray-900 border rounded-lg px-3 py-2 text-slate-200 text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
          errors?.[name] ? "border-red-500" : "border-gray-700"
        }`}
      />
      {errors?.[name] && (
        <p className="text-red-400 text-xs mt-1">{errors[name]}</p>
      )}
    </div>
  );
}

export default function NewTenantPage() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setGlobalError(null);

    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.status === 422) {
        const data = await res.json();
        setErrors(data.errors ?? {});
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setGlobalError(data.error ?? "Error al crear el tenant.");
        return;
      }

      // Success — navigate back to tenant list
      router.push("/admin/tenants");
      router.refresh();
    } catch (err) {
      setGlobalError("Error de red al crear el tenant.");
    } finally {
      setIsSubmitting(false);
    }
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
        <h1 className="text-2xl font-bold text-slate-100">Nuevo Tenant</h1>
      </div>

      {globalError && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-4 mb-4 text-sm">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Required fields ──────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Campos Requeridos
          </h2>

          <FormField
            label="Slug"
            name="slug"
            form={form}
            onChange={handleChange}
            errors={errors}
            placeholder="mi-negocio"
            required
          />
          <p className="text-xs text-gray-600 -mt-2">
            Solo letras minúsculas, números y guiones. Entre 2 y 63 caracteres.
          </p>

          <FormField
            label="Nombre de la App"
            name="app_name"
            form={form}
            onChange={handleChange}
            errors={errors}
            placeholder="Mi Negocio POS"
            required
          />

          <FormField
            label="Email"
            name="email"
            type="email"
            form={form}
            onChange={handleChange}
            errors={errors}
            placeholder="admin@minegocio.com"
            required
          />

          <FormField
            label="URL de la Base de Datos"
            name="database_url"
            form={form}
            onChange={handleChange}
            errors={errors}
            placeholder="mysql://user:pass@host:3306/dbname"
            required
          />
        </section>

        {/* ── Optional fields ───────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Campos Opcionales
          </h2>

          <FormField
            label="Nombre (interno)"
            name="name"
            form={form}
            onChange={handleChange}
            errors={errors}
            placeholder="Nombre interno del tenant"
          />

          <FormField
            label="Nombre Corto de la App"
            name="app_short_name"
            form={form}
            onChange={handleChange}
            errors={errors}
            placeholder="MiPOS"
          />

          <FormField
            label="Teléfono"
            name="phone"
            form={form}
            onChange={handleChange}
            errors={errors}
            placeholder="+57 300 000 0000"
          />
        </section>

        {/* ── Cloudinary ────────────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Cloudinary
          </h2>

          <FormField
            label="Cloud Name"
            name="cloudinary_cloud_name"
            form={form}
            onChange={handleChange}
            errors={errors}
            placeholder="mi-cloud"
          />
          <FormField
            label="API Key"
            name="cloudinary_api_key"
            form={form}
            onChange={handleChange}
            errors={errors}
            placeholder="123456789012345"
          />
          <FormField
            label="API Secret"
            name="cloudinary_api_secret"
            form={form}
            onChange={handleChange}
            errors={errors}
            placeholder="AbCdEfGhIjKlMnOpQrStUvWx"
          />
        </section>

        {/* ── Manifest icons ────────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Íconos del Manifest (URLs)
          </h2>

          <FormField
            label="Ícono 192×192"
            name="manifest_icon_192"
            form={form}
            onChange={handleChange}
            errors={errors}
            placeholder="https://..."
          />
          <FormField
            label="Ícono 256×256"
            name="manifest_icon_256"
            form={form}
            onChange={handleChange}
            errors={errors}
            placeholder="https://..."
          />
          <FormField
            label="Ícono 512×512"
            name="manifest_icon_512"
            form={form}
            onChange={handleChange}
            errors={errors}
            placeholder="https://..."
          />
          <FormField
            label="Logo Blanco (URL)"
            name="white_logo_url"
            form={form}
            onChange={handleChange}
            errors={errors}
            placeholder="https://..."
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

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {isSubmitting ? "Creando..." : "Crear Tenant"}
          </button>
          <Link
            href="/admin/tenants"
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
