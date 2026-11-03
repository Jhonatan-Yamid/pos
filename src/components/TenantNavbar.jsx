"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useTenantConfig } from "@/context/TenantContext";
import useBusinessType from "@/hooks/useBusinessType";
import { getRole, ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_GUEST } from "@/libs/roles";
import RequireRole from "@/components/RequireRole";
import { useState } from "react";
import { HiMenuAlt2 } from "react-icons/hi";
import { IoClose } from "react-icons/io5";

/**
 * Full navbar for tenant routes — desktop links + mobile hamburger menu.
 * Reads branding from TenantContext and session from NextAuth.
 * Shown inside /[slug]/... via src/app/[slug]/layout.jsx.
 */
export default function TenantNavbar() {
  const { data: session } = useSession();
  const tenantConfig       = useTenantConfig();
  const slug               = session?.user?.slug ?? tenantConfig?.slug ?? "";
  const { businessType }   = useBusinessType(slug);
  const [menuOpen, setMenuOpen] = useState(false);

  const logoUrl  = tenantConfig?.white_logo_url ?? null;
  const appName  = tenantConfig?.app_name ?? "POS";
  const dashHref = slug ? `/${slug}/dashboard`       : "/";
  const loginHref = slug ? `/${slug}/auth/login`     : "/";

  const inventoryPath =
    businessType === "fruver"
      ? `/${slug}/dashboard/ProductInventory`
      : `/${slug}/dashboard/IngredientInventory`;

  const handleSignOut = () => signOut({ callbackUrl: loginHref });

  // ── Desktop nav links (admin only) ────────────────────────────────────────
  const adminLinks = [
    { label: "Ventas",      href: `/${slug}/dashboard/saleTable`     },
    { label: "Reportes",    href: `/${slug}/dashboard/salesDaily`    },
    ...(businessType !== "fruver"
      ? [{ label: "Ingredientes", href: `/${slug}/dashboard/ingredients` }]
      : []),
    { label: "Productos",   href: `/${slug}/dashboard/products`      },
    { label: "Inventario",  href: inventoryPath                       },
    { label: "Apertura",    href: `/${slug}/dashboard/openChecklist` },
    { label: "Proveedores", href: `/${slug}/dashboard/providers`     },
  ];

  const employeeLinks = [
    { label: "Ventas",      href: `/${slug}/dashboard/saleTable`     },
    { label: "Inventario",  href: inventoryPath                       },
    { label: "Apertura",    href: `/${slug}/dashboard/openChecklist` },
  ];

  const currentRole = getRole(session);
  const navLinks =
    currentRole === ROLE_ADMIN
      ? adminLinks
      : currentRole === ROLE_EMPLOYEE || currentRole === ROLE_GUEST
      ? employeeLinks
      : [];

  return (
    <>
      <nav className="flex justify-between items-center bg-canvas text-content px-4 md:px-8 py-2 border-b border-border">

        {/* ── Mobile: hamburger button (only visible on mobile) ───────── */}
        <button
          className="md:hidden text-white mr-3"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
        >
          <HiMenuAlt2 size={28} />
        </button>

        {/* ── Logo (desktop only) ─────────────────────────────────────── */}
        <Link href={dashHref} className="hidden md:flex items-center gap-2 flex-shrink-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={appName} className="h-8 w-auto" />
          ) : (
            <span className="text-lg font-bold text-emerald-400">{appName}</span>
          )}
        </Link>

        {/* ── Desktop nav links ────────────────────────────────────────── */}
        {session?.user && navLinks.length > 0 && (
          <ul className="hidden md:flex items-center gap-x-5 text-sm ml-6 flex-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-content-muted hover:text-content transition"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* ── Right: user name + logout (desktop only) ─────────────────── */}
        <div className="hidden md:flex items-center gap-3 ml-auto">
          {session?.user?.name && (
            <span className="text-content-muted text-sm">
              {session.user.name}
            </span>
          )}
          {session?.user ? (
            <button
              onClick={handleSignOut}
              className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-control transition"
            >
              Logout
            </button>
          ) : (
            <Link
              href={loginHref}
              className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-control transition"
            >
              Login
            </Link>
          )}
        </div>
      </nav>

      {/* ── Mobile slide-out menu ────────────────────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Panel */}
          <div className="w-64 bg-surface h-full flex flex-col shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <Link href={dashHref} onClick={() => setMenuOpen(false)}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={appName} className="h-8 w-auto" />
                ) : (
                  <span className="text-lg font-bold text-emerald-400">{appName}</span>
                )}
              </Link>
              <button onClick={() => setMenuOpen(false)} className="text-white">
                <IoClose size={28} />
              </button>
            </div>

            {/* Links */}
            <ul className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
              {session?.user ? (
                <>
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-4 rounded-lg text-content text-lg hover:bg-surface-hover transition"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  <li className="mt-4">
                    <button
                      onClick={() => { setMenuOpen(false); handleSignOut(); }}
                      className="w-full text-left px-4 py-4 rounded-lg text-danger text-lg hover:bg-surface-hover transition"
                    >
                      Cerrar sesión
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <Link
                    href={loginHref}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-4 rounded-lg text-content text-lg hover:bg-surface-hover transition"
                  >
                    Login
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Backdrop */}
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
        </div>
      )}
    </>
  );
}
