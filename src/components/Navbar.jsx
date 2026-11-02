import Link from "next/link";
import { getServerSessionForTenant } from "@/libs/getServerSessionForTenant";
import NavButton from "@/components/ui/NavButton";
import MenuToggle from "./Menu";

/**
 * Root Navbar — shown on every page.
 *
 * Reads whichever per-tenant session cookie is present in the request so
 * it works correctly when the user is logged into any tenant.
 */
async function Navbar() {
  const session = await getServerSessionForTenant();
  const slug = session?.user?.slug ?? null;

  return (
    <nav className="flex justify-between items-center bg-canvas text-content px-4 md:px-12 py-2 text-sm">
      <div className="hidden md:flex items-center gap-3">
        <Link href={slug ? `/${slug}/dashboard` : "/"}>
          <span className="text-lg font-bold text-emerald-400">POS</span>
        </Link>
        {session?.user?.name && (
          <span className="text-slate-400 text-sm">
            — {session.user.name}
          </span>
        )}
      </div>

      <ul className="hidden md:flex gap-x-2 space-x-5 items-center">
        {!session?.user ? (
          <>
            <li>
              <Link href="/">Inicio</Link>
            </li>
            <li>
              <NavButton href="/auth/login" variant="primary">
                Login
              </NavButton>
            </li>
          </>
        ) : (
          <li>
            <NavButton href="/api/auth/signout" variant="primary">
              Logout
            </NavButton>
          </li>
        )}
      </ul>

      <MenuToggle session={session} />
    </nav>
  );
}

export default Navbar;
