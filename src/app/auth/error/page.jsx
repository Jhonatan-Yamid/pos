"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Generic auth error page — shown by NextAuth when authentication fails
 * and no tenant-specific error page is configured.
 */
export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="h-screen flex flex-col justify-center items-center gap-4">
      <h1 className="text-2xl font-bold text-slate-200">
        Error de autenticación
      </h1>
      <p className="text-slate-400">
        {error === "CredentialsSignin"
          ? "Credenciales inválidas. Verifica tu email y contraseña."
          : "Ocurrió un error al iniciar sesión. Intenta de nuevo."}
      </p>
      <Link href="/" className="text-blue-400 underline">
        Volver al inicio
      </Link>
    </div>
  );
}
