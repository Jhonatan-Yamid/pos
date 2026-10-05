"use client";

import { useState } from "react";
import useBusinessType from "@/hooks/useBusinessType";
import { getRole, ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_GUEST } from "@/libs/roles";
import RequireRole from "@/components/RequireRole";
import Link from "next/link";
import { IoClose } from "react-icons/io5";
import { HiMenuAlt2 } from "react-icons/hi";
import Image from "next/image";

const Menu = ({ session }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { businessType } = useBusinessType();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  // Definimos la ruta de inventario dinámicamente
  const inventoryPath = businessType === "fruver"
    ? "/dashboard/ProductInventory"
    : "/dashboard/IngredientInventory";

  return (
    <div className="flex md:hidden justify-between items-center w-full">
      <button onClick={toggleMenu} className="text-white">
        <HiMenuAlt2 size={30} />
      </button>

      {isOpen && (
        <div className="fixed top-0 left-0 w-1/2 h-full bg-gray-800 z-50 flex flex-col pl-6 pt-5">
          <div className="flex justify-between items-center p-4">
            <Link href="/dashboard">
              <Image
                src={process.env.NEXT_PUBLIC_WHITE_LOGO}
                alt="Logo"
                width={180}
                height={180}
                className="mr-3"
              />
            </Link>
            <button onClick={toggleMenu} className="text-white">
              <IoClose size={40} />
            </button>
          </div>

          <ul className="flex flex-col gap-y-4 p-4 flex-1 text-xl space-y-8">
            {!session?.user ? (
              <>
                <li><Link href="/" className="text-white" onClick={closeMenu}>Home</Link></li>
                <li><Link href="/auth/login" className="text-white" onClick={closeMenu}>Login</Link></li>
                <li><Link href="/auth/register" className="text-white" onClick={closeMenu}>Register</Link></li>
              </>
            ) : (
              <>
                <RequireRole allowed={ROLE_ADMIN} session={session}>
                  <>
                    <li><Link href="/dashboard/saleTable" className="text-white" onClick={closeMenu}>Ventas</Link></li>
                    <li><Link href="/dashboard/salesDaily" className="text-white" onClick={closeMenu}>Reportes</Link></li>

                    {/* Solo mostrar Ingredientes si NO es fruver */}
                    {businessType !== "fruver" && (
                      <li><Link href="/dashboard/ingredients" className="text-white" onClick={closeMenu}>Ingredientes</Link></li>
                    )}

                    <li><Link href="/dashboard/products" className="text-white" onClick={closeMenu}>Productos</Link></li>
                    <li><Link href={inventoryPath} className="text-white" onClick={closeMenu}>Inventario</Link></li>
                    <li><Link href="/dashboard/openChecklist" className="text-white" onClick={closeMenu}>Apertura</Link></li>
                    <li><Link href="/dashboard/providers" className="text-white" onClick={closeMenu}>Proveedores</Link></li>
                    <li><Link href="/api/auth/signout" className="text-white" onClick={closeMenu}>Logout</Link></li>
                    <li><Link href="/dashboard/provider-invoice" className="text-white" onClick={closeMenu}>Facturar Proveedor</Link></li>
                  </>
                </RequireRole>

                <RequireRole allowed={[ROLE_EMPLOYEE, ROLE_GUEST]} session={session}>
                  <>
                    <li><Link href="/dashboard/saleTable" className="text-white" onClick={closeMenu}>Ventas</Link></li>
                    <li><Link href={inventoryPath} className="text-white" onClick={closeMenu}>Inventario</Link></li>
                    <li><Link href="/dashboard/openChecklist" className="text-white" onClick={closeMenu}>Apertura</Link></li>
                    <li><Link href="/dashboard/provider-invoice" className="text-white" onClick={closeMenu}>Facturar Proveedor</Link></li>
                    <li><Link href="/api/auth/signout" className="text-white" onClick={closeMenu}>Logout</Link></li>
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