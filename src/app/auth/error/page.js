import { Suspense } from "react";
import AuthErrorContent from "./AuthErrorContent";

export const dynamic = "force-dynamic";

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center text-slate-400">
          Cargando...
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
