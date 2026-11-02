import Link from 'next/link';

export const metadata = {
  title: 'Página no disponible',
  description: 'El negocio que buscas no está disponible.',
};

export default function TenantNotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Negocio no encontrado
        </h1>
        <p className="text-gray-500 mb-8">
          El negocio que estás buscando no existe o no está disponible en este momento.
        </p>
        <Link
          href="/"
          className="inline-block bg-indigo-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
