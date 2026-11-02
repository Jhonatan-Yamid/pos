"use client";
import { registerServiceWorker, subscribeUser } from "@/libs/notifications";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import useBusinessType from "@/hooks/useBusinessType";
import { getRole, ROLE_ADMIN, ROLE_EMPLOYEE } from "@/libs/roles";
import {
  FaCashRegister,
  FaCarrot,
  FaBox,
  FaWarehouse,
  FaClipboardCheck,
  FaTruck,
  FaSignOutAlt,
  FaBell,
} from "react-icons/fa";

const DashboardPage = () => {
  const { slug } = useParams();
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      window.location.href = `/${slug}/auth/login`;
    },
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { businessType } = useBusinessType(slug);

  useEffect(() => {
    const setupNotifications = async () => {
      if (Notification.permission === "granted") {
        setIsSubscribed(true);
      } else if (Notification.permission === "denied") {
        setIsSubscribed(false);
      }
    };
    setupNotifications();
  }, []);

  const handleSubscribe = async () => {
    try {
      await registerServiceWorker();
      await subscribeUser(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
      setIsSubscribed(true);
    } catch (error) {
      console.error("Error al suscribirse:", error);
    }
  };

  const handleRequestPermission = () => {
    if (Notification.permission === "denied") {
      alert(
        "Para recibir notificaciones, por favor, habilita los permisos de notificación en la configuración de tu navegador."
      );
      return;
    }

    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        handleSubscribe();
      } else {
        alert("Las notificaciones están deshabilitadas.");
      }
    });
  };

  const allOptions = [
    {
      label: "Ventas",
      href: `/${slug}/dashboard/saleTable`,
      icon: <FaCashRegister size={48} />,
      roles: [ROLE_ADMIN, ROLE_EMPLOYEE],
    },
    {
      label: "Ingredientes",
      href: `/${slug}/dashboard/ingredients`,
      icon: <FaCarrot size={48} />,
      roles: [ROLE_ADMIN],
      hideIfFruver: true,
    },
    {
      label: "Productos",
      href: `/${slug}/dashboard/products`,
      icon: <FaBox size={48} />,
      roles: [ROLE_ADMIN],
    },
    {
      label: "Inventario",
      href:
        businessType === "fruver"
          ? `/${slug}/dashboard/ProductInventory`
          : `/${slug}/dashboard/IngredientInventory`,
      icon: <FaWarehouse size={48} />,
      roles: [ROLE_ADMIN, ROLE_EMPLOYEE],
    },
    {
      label: "Apertura",
      href: `/${slug}/dashboard/openChecklist`,
      icon: <FaClipboardCheck size={48} />,
      roles: [ROLE_ADMIN, ROLE_EMPLOYEE],
    },
    {
      label: "Proveedores",
      href: `/${slug}/dashboard/providers`,
      icon: <FaTruck size={48} />,
      roles: [ROLE_ADMIN],
    },
    {
      label: "Alertas",
      href: `/${slug}/dashboard/alerts`,
      icon: <FaBell size={48} />,
      roles: [ROLE_ADMIN],
    },
    {
      label: "Cerrar Sesión",
      href: "/api/auth/signout",
      icon: <FaSignOutAlt size={48} />,
      roles: [ROLE_ADMIN, ROLE_EMPLOYEE],
      isAction: true,
    },
  ];

  const currentRole = getRole(session);
  const menuOptions = allOptions.filter((option) => {
    const hasRole = option.roles.includes(currentRole);
    if (businessType === "fruver" && option.hideIfFruver) {
      return false;
    }
    return hasRole;
  });

  return (
    <section className="h-[calc(100vh-7rem)] flex flex-col items-center bg-gray-950 text-slate-200 ">
      {!isSubscribed && (
        <div>
          <button
            onClick={handleRequestPermission}
            className="mt-2 bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-600 transition-colors"
          >
            Activar Notificaciones
          </button>
        </div>
      )}
      <h1 className="text-3xl font-bold mt-6 mb-8 text-center px-4">
        ¿Qué quieres hoy, {session?.user?.name}?
      </h1>
      <div className="grid grid-cols-2 gap-6 px-6 md:grid-cols-3 lg:grid-cols-4 pb-10">
        {menuOptions.map((option, index) => (
          <Link
            key={index}
            href={option.href}
            onClick={
              option.isAction
                ? (e) => {
                    e.preventDefault();
                    signOut({ callbackUrl: `/${slug}/auth/login` });
                  }
                : undefined
            }
            className="flex flex-col items-center justify-center p-6 bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded-xl shadow-xl transition-all transform hover:scale-105"
          >
            <div className="text-white mb-4">{option.icon}</div>
            <span className="text-lg font-semibold text-white">{option.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default DashboardPage;
