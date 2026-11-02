"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { signOut } from "next-auth/react";
import useBusinessType from "@/hooks/useBusinessType";
import { getRole, ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_GUEST } from "@/libs/roles";
import RequireRole from "@/components/RequireRole";
import Link from "next/link";
import { IoClose } from "react-icons/io5";
import { HiMenuAlt2 } from "react-icons/hi";
import { useTenantConfig } from "@/context/TenantContext";

const Menu = ({ session }) => {
  const [isOpen, setIsOpen] = useState(false);
  const params = useParams();
  const slug = params?.slug ?? "";
  const { businessType } = useBusinessType(slug);
  const tenantConfig = useTenantConfig();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const inventoryPath =
    businessType === "fruver"
      ? `/${slug}/dashboard/ProductInventory`
      : `/${slug}/dashboard/IngredientInventory`;

  const logoSrc = tenantConfig?.white_logo_url ?? null;

  return (
    <div className="flex md:hidden justify-between items-center w-full">
      <button onClick={toggleMenu} className="text-white">
        <HiMenuAlt2 size={30} />
      </button>

      {isOpen && (
        <div className="fixed top-0 left-0 w-1/2 h-full bg-gray-800 z-50 flex flex-col pl-6 pt-5">
          <div className="flex justify-between items-center p-4">
            <Link href={slug ? `/${slug}/dashboard` : "/"} onClick={closeMenu}>
              {logoSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoSrc}
                  alt="Logo"
                  width={180}
                  height={180}
                  className="mr-3"
                />
              ) : (
                <span className="text-emerald-400 text-lg font-bold">POS</span>
              )}
            </Link>
            <button onClick={toggleMenu} className="text-white">
              <IoClose size={40} />
            </button>
          </div>

          <ul className="flex flex-col gap-y-4 p-4 flex-1 text-xl space-y-8">
            {!session?.user ? (
              <>
                <li>
                  <Link href="/" className="text-white" onClick={closeMenu}>
                    Home
                  </Link>
                </li>
                {slug && (
                  <li>
                    <Link href={`/${slug}/auth/login`} className="text-white" onClick={closeMenu}>
                      Login
                    </Link>
                  </li>
                )}
              </>
            ) : (
              <>
                <RequireRole allowed={ROLE_ADMIN} session={session}>
                  <>
                    <li>
                      <Link href={`/${slug}/dashboard/saleTable`} className="text-white" onClick={closeMenu}>
                        Ventas
                      </Link>
                    </li>
                    <li>
                      <Link href={`/${slug}/dashboard/salesDaily`} className="text-white" onClick={closeMenu}>
                        Reportes
                      </Link>
                    </li>

                    {businessType !== "fruver" && (
                      <li>
                        <Link href={`/${slug}/dashboard/ingredients`} className="text-white" onClick={closeMenu}>
                          Ingredientes
                        </Link>
                      </li>
                    )}

                    <li>
                      <Link href={`/${slug}/dashboard/products`} className="text-white" onClick={closeMenu}>
                        Productos
                      </Link>
                    </li>
                    <li>
                      <Link href={inventoryPath} className="text-white" onClick={closeMenu}>
                        Inventario
                      </Link>
                    </li>
                    <li>
                      <Link href={`/${slug}/dashboard/openChecklist`} className="text-white" onClick={closeMenu}>
                        Apertura
                      </Link>
                    </li>
                    <li>
                      <Link href={`/${slug}/dashboard/providers`} className="text-white" onClick={closeMenu}>
                        Proveedores
                      </Link>
                    </li>
                    <li>
                      <Link href={`/${slug}/dashboard/provider-invoice`} className="text-white" onClick={closeMenu}>
                        Facturar Proveedor
                      </Link>
                    </li>
                    <li>
                      <button
                        className="text-white"
                        onClick={() => {
                          closeMenu();
                          signOut({ callbackUrl: `/${slug}/auth/login` });
                        }}
                      >
                        Logout
                      </button>
                    </li>
                  </>
                </RequireRole>

                <RequireRole allowed={[ROLE_EMPLOYEE, ROLE_GUEST]} session={session}>
                  <>
                    <li>
                      <Link href={`/${slug}/dashboard/saleTable`} className="text-white" onClick={closeMenu}>
                        Ventas
                      </Link>
                    </li>
                    <li>
                      <Link href={inventoryPath} className="text-white" onClick={closeMenu}>
                        Inventario
                      </Link>
                    </li>
                    <li>
                      <Link href={`/${slug}/dashboard/openChecklist`} className="text-white" onClick={closeMenu}>
                        Apertura
                      </Link>
                    </li>
                    <li>
                      <Link href={`/${slug}/dashboard/provider-invoice`} className="text-white" onClick={closeMenu}>
                        Facturar Proveedor
                      </Link>
                    </li>
                    <li>
                      <button
                        className="text-white"
                        onClick={() => {
                          closeMenu();
                          signOut({ callbackUrl: `/${slug}/auth/login` });
                        }}
                      >
                        Logout
                      </button>
                    </li>
                  </>
                </RequireRole>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Menu;
