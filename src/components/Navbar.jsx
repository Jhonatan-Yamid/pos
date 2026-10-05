import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Image from "next/image";
import MenuToggle from "./Menu";
import db from "@/libs/db"; // Importamos tu conexión a la base de datos
import { getRole, ROLE_ADMIN, ROLE_EMPLOYEE } from "@/libs/roles";
import NavButton from "@/components/ui/NavButton";

async function Navbar() {
  const session = await getServerSession(authOptions);
  
  // Consultamos la DB directamente en el servidor
  let businessType = "restaurant";
  try {
    const business = await db.business.findFirst();
    if (business && business.type) {
      businessType = business.type.toLowerCase();
    }
  } catch (error) {
    console.error("Error obteniendo businessType en Navbar:", error);
  }

  const inventoryPath = businessType === "fruver" 
    ? "/dashboard/ProductInventory" 
    : "/dashboard/IngredientInventory";

  return (
    <nav className="flex justify-between items-center bg-canvas text-content px-4 md:px-12 py-2 text-sm">
      <div className="hidden md:flex">
        <Link href="/dashboard">
          <Image
            src = {process.env.NEXT_PUBLIC_WHITE_LOGO}
            alt="Logo"
            width={100}
            height={100}
            className="mr-3"
          />
        </Link>
      </div>

      <ul className="hidden md:flex gap-x-2 space-x-5 items-center">
        {!session?.user ? (
          <>
            <li><Link href="/">Inicio</Link></li>
            <li>
              <Link
                target="_blank"
                href="https://drive.google.com/file/d/1H1BqvwUrJaqk9l_zJBXoO3yeyixRrG6m/view?usp=sharing"
              >
                Menú
              </Link>
            </li>
            <li>
              <NavButton href="/auth/login" variant="primary">Login</NavButton>
            </li>
          </>
        ) : (
          <>
            {getRole(session) === ROLE_ADMIN ? (
              <>
                <li><Link href="/dashboard/saleTable">Ventas</Link></li>
                <li><Link href="/dashboard/salesDaily">Reportes</Link></li>
                <li><Link href={inventoryPath}>Inventario</Link></li>
                <li><Link href="/dashboard/openChecklist">Apertura</Link></li>
                <li><Link href="/dashboard/providers">Proveedores</Link></li>
                <li><Link href="/dashboard/provider-invoice">Facturar Proveedor</Link></li>

                {businessType !== "fruver" && (
                  <li><Link href="/dashboard/ingredients">Ingredientes</Link></li>
                )}

                <li><Link href="/dashboard/products">Productos</Link></li>
                <li>
                  <NavButton href="/api/auth/signout" variant="primary">Logout</NavButton>
                </li>
              </>
            ) : (
              <>
                <li><Link href="/dashboard/saleTable">Ventas</Link></li>
                <li><Link href={inventoryPath}>Inventario</Link></li>
                <li><Link href="/dashboard/openChecklist">Apertura</Link></li>
                <li><Link href="/dashboard/provider-invoice">Facturar Proveedor</Link></li>
                <li>
                  <NavButton href="/api/auth/signout" variant="primary">Logout</NavButton>
                </li>
              </>
            )}
          </>
        )}
      </ul>

      <MenuToggle session={session} />
    </nav>
  );
}

export default Navbar;