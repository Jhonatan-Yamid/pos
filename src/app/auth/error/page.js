"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

/**
 * Custom NextAuth error page at /auth/error.
 * Registered as `pages.error` in /api/auth/[...nextauth]/route.js.
 *
 * NextAuth appends ?error=<code> to the URL. Known codes:
 *   - Configuration  — server config issue
 *   - AccessDenied   — authorize() returned null / threw
 *   - Verification   — token expiry (magic links)
 *   - Default        — catch-all
 */

const ERROR_MESSAGES = {
  Configuration: "Hay un problema de configuración en el servidor.",
  AccessDenied: "Credenciales inválidas o acceso denegado.",
  Verification: "El enlace de verificación expiró o ya fue usado.",
  Default: "Ocurrió un error al intentar iniciar sesión.",
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error") ?? "Default";
  const message = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default;

  return (
    <div className="h-[calc(100vh-7rem)] flex justify-center items-center">
      <div className="w-full md:w-1/2 lg:w-1/3 p-6 rounded-lg bg-slate-900 text-slate-200 text-center shadow-lg">
        <h1 className="text-3xl font-bold mb-4 text-red-400">Error de autenticación</h1>
        <p className="text-slate-300 mb-6">{message}</p>
        <a
          href="/"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-slate-400">Cargando...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
