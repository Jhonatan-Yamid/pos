import { getServerSessionForTenant } from "@/libs/getServerSessionForTenant";
import { redirect } from "next/navigation";

/**
 * Admin panel layout — server component.
 *
 * Verifies that the current session belongs to a Super_Admin user
 * (session.user.image === 2). Any other user, including unauthenticated
 * visitors, is redirected to /403.
 *
 * Requirements: 7.1, 7.2
 */
export const metadata = {
  title: "Admin Panel — POS",
};

export default async function AdminLayout({ children }) {
  const session = await getServerSessionForTenant();

  // Numeric role value 2 means SUPER_ADMIN (see src/libs/roles.js).
  if (!session || session.user?.image !== 2) {
    redirect("/403");
  }

  return (
    <div className="min-h-screen bg-gray-950 text-slate-200">
      {/* Admin top bar */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-emerald-400">POS Admin</span>
          <span className="text-gray-500 text-sm">Panel de Super Administración</span>
        </div>
        <div className="text-sm text-gray-400">
          {session.user?.name ?? session.user?.email}
        </div>
      </header>

      {/* Page content */}
      <main className="p-6">{children}</main>
    </div>
  );
}
