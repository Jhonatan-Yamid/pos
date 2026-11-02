"use client";
import useTicketPrinter from "@/hooks/useTicketPrinter";
import useBusinessType from "@/hooks/useBusinessType";
import { useState, useEffect, useCallback } from "react";
import {
  FaCashRegister,
  FaEdit,
  FaEye,
  FaTrashAlt,
  FaExchangeAlt,
  FaEyeSlash,
  FaShareAlt,
} from "react-icons/fa";
import { useSession } from "next-auth/react";
import { getRole, ROLE_ADMIN } from "@/libs/roles";
import Link from "next/link";
import { FaPrint } from "react-icons/fa";
import { useParams } from "next/navigation";
import { PageContainer } from "@/components/ui/Layout";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatTicketText } from "@/services/saleService";

function DailySales() {
  const { slug } = useParams();
  const { printTicket } = useTicketPrinter();
  const { data: session } = useSession();
  const { businessType } = useBusinessType(slug);
  const [subTab, setSubTab] = useState("pendientes");
  const [sales, setSales] = useState([]);
  const [todaySales, setTodaySales] = useState([]);
  const [pastSales, setPastSales] = useState([]);
  const [showTotal, setShowTotal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [cashReceived, setCashReceived] = useState("");
  const handleCashReceivedChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw === "") {
      setCashReceived("");
      return;
    }
    setCashReceived(
      new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(
        Number(raw)
      )
    );
  };

  const [paymentType, setPaymentType] = useState("efectivo");
  const [cashAmountInput, setCashAmountInput] = useState("");
  const handleCashAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw === "") {
      setCashAmountInput("");
      return;
    }
    setCashAmountInput(
      new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(
        Number(raw)
      )
    );
  };
  const [discountPercentInput, setDiscountPercentInput] = useState("0");
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const [pastStartDate, setPastStartDate] = useState("");
  const [pastEndDate, setPastEndDate] = useState("");
  const [hasSearchedPast, setHasSearchedPast] = useState(false);
  const [loadingPastSales, setLoadingPastSales] = useState(false);

  const [showTransfers, setShowTransfers] = useState(false);
  const [lastTransfers, setLastTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  useEffect(() => {
    if (businessType === "fruver") {
      setSubTab("domicilios pendientes");
    }
  }, [businessType]);

  useEffect(() => {
    if (showPreview || showTransfers) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showPreview, showTransfers]);

  const getOperationalDayRange = () => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      5
    );
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    endOfToday.setHours(4, 0, 0, 0);
    if (now < endOfToday && now.getHours() < 4) {
      startOfToday.setDate(startOfToday.getDate() - 1);
      endOfToday.setDate(endOfToday.getDate() - 1);
    }
    return { start: startOfToday, end: endOfToday };
  };

  const fetchTodaySales = useCallback(async () => {
    if (!slug) return;
    try {
      const { start, end } = getOperationalDayRange();
      const res = await fetch(
        `/api/${slug}/sale?startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}`
      );
      const data = await res.json();
      setTodaySales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener las ventas de hoy:", error);
    }
  }, [slug]);

  const fetchPastSales = useCallback(
    async (start, end) => {
      if (!slug) return;
      setLoadingPastSales(true);
      try {
        const startDate = new Date(`${start}T00:00:00`);
        const endDate = new Date(`${end}T23:59:59.999`);
        const res = await fetch(
          `/api/${slug}/sale?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`
        );
        const data = await res.json();
        setPastSales(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error al obtener las ventas anteriores:", error);
      } finally {
        setLoadingPastSales(false);
      }
    },
    [slug]
  );

  const handleSearchPastSales = () => {
    if (!pastStartDate || !pastEndDate) return;
    setHasSearchedPast(true);
    fetchPastSales(pastStartDate, pastEndDate);
  };

  const fetchSalesData = useCallback(async () => {
    await fetchTodaySales();
    if (hasSearchedPast && pastStartDate && pastEndDate) {
      await fetchPastSales(pastStartDate, pastEndDate);
    }
  }, [
    fetchTodaySales,
    fetchPastSales,
    hasSearchedPast,
    pastStartDate,
    pastEndDate,
  ]);

  useEffect(() => {
    fetchTodaySales();
  }, [fetchTodaySales]);

  useEffect(() => {
    const byId = new Map();
    [...todaySales, ...pastSales].forEach((s) => byId.set(s.id, s));
    setSales(Array.from(byId.values()));
  }, [todaySales, pastSales]);

  const handleCheckTransfers = async () => {
    if (!slug) return;
    setLoadingTransfers(true);
    try {
      const res = await fetch(`/api/${slug}/mail-verify`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        cache: "no-store",
      });
      const result = await res.json();

      if (result.success) {
        setLastTransfers(result.data);
        setShowTransfers(true);
      } else {
        alert("Error al consultar correos: " + result.error);
      }
    } catch (error) {
      console.error("Error al obtener transferencias:", error);
      alert("No se pudo conectar con el servidor de correos.");
    } finally {
      setLoadingTransfers(false);
    }
  };

  const handlePreview = async (sale) => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/${slug}/sale/${sale.id}`);
      if (!res.ok) throw new Error("Error al obtener detalles de la venta");
      const data = await res.json();

      setSelectedSaleId(sale.id);
      setSelectedProducts(data.products || []);
      setCashReceived("");
      setPaymentType("efectivo");
      setCashAmountInput("");
      setDiscountPercentInput("0");
      setShowPreview(true);
    } catch (error) {
      console.error("Error al obtener venta:", error);
      alert("No se pudo cargar la vista previa de la comanda");
    }
  };

  const closePreviewModal = () => setShowPreview(false);

  const handleShareSale = async (sale) => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/${slug}/sale/${sale.id}`);
      const data = await res.json();
      const rawProducts = data.products || [];

      const mappedProducts = rawProducts.map((p) => ({
        id: p.product?.id ?? p.id,
        name: p.product?.name || p.name || "Producto",
        price: p.product?.price ?? p.price ?? 0,
        category: p.product?.category || p.category || "Otros",
        quantity: p.quantity || 1,
        observation: p.observation || "",
        additions: p.additions || [],
      }));

      const ticketText = formatTicketText({
        products: mappedProducts,
        total: sale.totalAmount,
        tableNumber: sale.table,
        orderType: sale.orderType || "En mesa",
        generalObservation:
          data.generalObservation || sale.generalObservation || "",
        game: sale.gameId?.toString() || "",
        availableGames: [],
        availableProducts: [],
        date: new Date(sale.createdAt),
      });

      const encoded = encodeURIComponent(ticketText);
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    } catch (error) {
      console.error("Error al compartir la venta:", error);
      alert("No se pudo generar el ticket para compartir.");
    }
  };

  const totalToday = todaySales.reduce(
    (acc, sale) => acc + sale.totalAmount,
    0
  );

  const handleStatusAdvance = async (sale, extraPayload = null) => {
    if (!slug) return;
    let newStatus = "";

    if (businessType === "fruver") {
      if (sale.status?.toLowerCase() === "domicilio") newStatus = "hecho";
      else return;
    } else {
      if (sale.status === "en proceso") newStatus = "en mesa";
      else if (sale.status === "en mesa") newStatus = "pagada";
      else return;
    }

    try {
      const res = await fetch(`/api/${slug}/sale/${sale.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...(extraPayload || {}) }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al actualizar el estado.");
      }

      fetchSalesData();
    } catch (error) {
      console.error("Error al actualizar el estado:", error);
      alert(`No se pudo actualizar el estado: ${error.message}`);
    }
  };

  const handleConfirmPayment = async (sale, subtotal) => {
    const discountPct = Math.min(
      100,
      Math.max(0, Number(discountPercentInput) || 0)
    );
    const finalTotal = subtotal * (1 - discountPct / 100);
    const mixedCash = Number(cashAmountInput.replace(/\./g, "")) || 0;

    if (paymentType === "mixto" && mixedCash <= 0) {
      alert(
        "Ingresa el monto pagado en efectivo para un pago mixto."
      );
      return;
    }
    if (paymentType === "mixto" && mixedCash >= finalTotal) {
      alert(
        "El monto en efectivo no puede ser mayor o igual al total para un pago mixto (usa 'Efectivo')."
      );
      return;
    }

    const cashAmount =
      paymentType === "efectivo"
        ? finalTotal
        : paymentType === "mixto"
        ? mixedCash
        : 0;

    setIsConfirmingPayment(true);
    try {
      await handleStatusAdvance(sale, {
        paymentType,
        cashAmount,
        discountPercent: discountPct,
        totalAmount: finalTotal,
      });
      setShowPreview(false);
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const handleDeleteSale = async (saleId) => {
    if (!slug) return;
    if (!window.confirm("¿Seguro que deseas eliminar esta venta?")) return;
    try {
      const res = await fetch(`/api/${slug}/sale?id=${saleId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al eliminar la venta.");
      }
      alert("Venta eliminada exitosamente.");
      fetchSalesData();
    } catch (error) {
      console.error("Error al eliminar la venta:", error);
      alert(`No se pudo eliminar la venta: ${error.message}`);
    }
  };

  const renderSaleList = (salesList) => (
    <div className="flex flex-col gap-4 border border-border-hover rounded-md p-5">
      <h1 className="text-content font-medium text-xl">Ventas Registradas</h1>

      {getRole(session) === ROLE_ADMIN && activeTab === "today" && (
        <div className="text-green-300 font-bold text-lg flex items-center gap-2">
          <span>Total de hoy:</span>
          <span>
            {showTotal ? (
              new Intl.NumberFormat("es-CL", {
                style: "currency",
                currency: "CLP",
              }).format(totalToday)
            ) : (
              "****"
            )}
          </span>
          <button
            onClick={() => setShowTotal(!showTotal)}
            className="text-gray-400 hover:text-white transition-colors ml-2"
            title={showTotal ? "Ocultar total" : "Mostrar total"}
          >
            {showTotal ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
          </button>
        </div>
      )}

      {salesList.length === 0 ? (
        <p className="text-content">No hay ventas registradas</p>
      ) : (
        salesList.map((sale) => {
          const isEdited =
            Math.abs(
              new Date(sale.updatedAt) - new Date(sale.createdAt)
            ) > 1000;

          return (
            <div
              key={sale.id}
              className="flex items-start mb-4 cursor-pointer p-4 bg-surface-hover rounded-control shadow-md"
            >
              <div className="flex items-center justify-center w-14 h-14 bg-border rounded-md mr-4 flex-shrink-0 mt-1">
                <FaCashRegister className="text-white" size={20} />
              </div>

              <div className="flex flex-col sm:flex-row justify-between w-full">
                <div className="flex flex-col items-start flex-grow">
                  <h3 className="text-green-400 text-4xl font-extrabold leading-none mb-2">
                    Mesa: {sale.table}
                  </h3>
                  <h2 className="text-content text-xl font-semibold flex flex-wrap items-center gap-2">
                    <span>
                      Venta -{" "}
                      {new Date(sale.createdAt).toLocaleDateString("es-CL")} /{" "}
                      {new Date(sale.createdAt).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isEdited && (
                      <span className="bg-yellow-700 text-white text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                        Editada
                      </span>
                    )}
                  </h2>
                  <span className="text-content-muted text-sm">
                    Productos: {sale.products?.length || 0}
                  </span>
                  <div className="text-content-muted text-sm">
                    Estado: {sale.status}
                  </div>
                  {businessType === "fruver" ? (
                    sale.status?.toLowerCase() === "domicilio" && (
                      <Button
                        variant="success"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleStatusAdvance(sale)}
                      >
                        Marcar como Hecho
                      </Button>
                    )
                  ) : (
                    ["en proceso", "en mesa"].includes(sale.status) && (
                      <Button
                        variant="success"
                        size="sm"
                        className="mt-2"
                        onClick={() =>
                          sale.status === "en proceso"
                            ? handleStatusAdvance(sale)
                            : handlePreview(sale)
                        }
                      >
                        {sale.status === "en proceso"
                          ? "Orden lista"
                          : "Marcar como pagada"}
                      </Button>
                    )
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center mt-4 sm:mt-0 sm:ml-4 flex-shrink-0">
                  <div className="flex items-center mb-4 sm:mb-0 mr-4">
                    <span className="text-content text-lg font-semibold mr-2">
                      Total:
                    </span>
                    <span className="text-content-muted text-lg font-semibold">
                      {new Intl.NumberFormat("es-CL", {
                        style: "currency",
                        currency: "CLP",
                      }).format(sale.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-start sm:justify-end w-full sm:w-auto">
                    <Link href={`/${slug}/dashboard/sales/${sale.id}`}>
                      <button className="ml-4 text-gray-400 hover:text-white text-3xl">
                        <FaEdit />
                      </button>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(sale);
                      }}
                      className="ml-4 text-gray-400 hover:text-white text-3xl"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareSale(sale);
                      }}
                      className="ml-4 text-gray-400 hover:text-white text-3xl"
                      title="Compartir por WhatsApp"
                    >
                      <FaShareAlt />
                    </button>
                    {getRole(session) === ROLE_ADMIN && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSale(sale.id);
                        }}
                        className="ml-4 text-red-500 hover:text-red-300 text-3xl"
                      >
                        <FaTrashAlt />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-content font-semibold text-3xl">Ventas</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            icon={FaExchangeAlt}
            onClick={handleCheckTransfers}
            disabled={loadingTransfers}
          >
            {loadingTransfers ? "Verificando..." : "Verificar transferencias"}
          </Button>
          <Link href={`/${slug}/dashboard/sales`}>
            <Button variant="secondary">+ Nueva venta</Button>
          </Link>
        </div>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab("today")}
          className={`px-4 py-2 rounded-t-md ${
            activeTab === "today"
              ? "bg-primary text-white"
              : "bg-surface-hover text-content-muted"
          }`}
        >
          Ventas de Hoy
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`px-4 py-2 rounded-t-md ${
            activeTab === "past"
              ? "bg-primary text-white"
              : "bg-surface-hover text-content-muted"
          }`}
        >
          Ventas Anteriores
        </button>
      </div>

      {activeTab === "today" ? (
        <>
          <div className="flex space-x-3 mb-4">
            <button
              onClick={() => setSubTab("todas")}
              className={`px-3 py-1 rounded-full text-sm ${
                subTab === "todas"
                  ? "bg-primary text-white"
                  : "bg-surface-hover text-content-muted"
              }`}
            >
              Todas
            </button>

            {businessType === "fruver" ? (
              <>
                <button
                  onClick={() => setSubTab("domicilios pendientes")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    subTab === "domilios pendientes" ||
                    subTab === "domicilios pendientes"
                      ? "bg-primary text-white"
                      : "bg-surface-hover text-content-muted"
                  }`}
                >
                  Domicilios Pendientes
                </button>
                <button
                  onClick={() => setSubTab("domicilios hechos")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    subTab === "domicilios hechos"
                      ? "bg-primary text-white"
                      : "bg-surface-hover text-content-muted"
                  }`}
                >
                  Domicilios Hechos
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSubTab("pendientes")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    subTab === "pendientes"
                      ? "bg-primary text-white"
                      : "bg-surface-hover text-content-muted"
                  }`}
                >
                  En proceso / En mesa
                </button>
                <button
                  onClick={() => setSubTab("pagadas")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    subTab === "pagadas"
                      ? "bg-primary text-white"
                      : "bg-surface-hover text-content-muted"
                  }`}
                >
                  Pagadas
                </button>
              </>
            )}
          </div>

          {renderSaleList(
            todaySales.filter((sale) => {
              if (subTab === "todas") return true;

              if (businessType === "fruver") {
                if (subTab === "domicilios pendientes")
                  return sale.status?.toLowerCase() === "domicilio";
                if (subTab === "domicilios hechos")
                  return sale.status?.toLowerCase() === "hecho";
              } else {
                if (subTab === "pendientes")
                  return (
                    sale.status === "en proceso" ||
                    sale.status === "en mesa"
                  );
                if (subTab === "pagadas") return sale.status === "pagada";
              }
              return true;
            })
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 mb-4 bg-surface border border-border rounded-md p-3">
            <div>
              <label className="block text-xs text-content-muted mb-1">
                Desde
              </label>
              <input
                type="date"
                value={pastStartDate}
                max={pastEndDate || todayIso}
                onChange={(e) => setPastStartDate(e.target.value)}
                className="bg-surface-hover border border-border rounded-md px-2 py-1 text-content text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-content-muted mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={pastEndDate}
                min={pastStartDate}
                max={todayIso}
                onChange={(e) => setPastEndDate(e.target.value)}
                className="bg-surface-hover border border-border rounded-md px-2 py-1 text-content text-sm"
              />
            </div>
            <Button
              variant="success"
              size="sm"
              onClick={handleSearchPastSales}
              disabled={!pastStartDate || !pastEndDate || loadingPastSales}
            >
              {loadingPastSales ? "Buscando..." : "Buscar"}
            </Button>
            {hasSearchedPast && !loadingPastSales && (
              <span className="text-xs text-gray-500">
                {pastSales.length} venta
                {pastSales.length !== 1 ? "s" : ""} en el rango
              </span>
            )}
          </div>
          {hasSearchedPast ? (
            renderSaleList(pastSales)
          ) : (
            <p className="text-content-muted text-sm px-1">
              Elige un rango de fechas y presiona &ldquo;Buscar&rdquo; para
              consultar las ventas anteriores.
            </p>
          )}
        </>
      )}

      {/* Modal de transferencias */}
      <Modal
        open={showTransfers}
        onClose={() => setShowTransfers(false)}
        title="Últimas 3 Transferencias"
        maxWidth="max-w-md"
      >
        <div className="flex flex-col gap-4">
          {lastTransfers.length > 0 ? (
            lastTransfers.map((t, idx) => (
              <div
                key={t.id_interno || idx}
                className="bg-surface-hover p-4 rounded-control border border-border flex justify-between items-center"
              >
                <div className="max-w-[60%]">
                  <p className="text-content font-bold truncate capitalize">
                    {t.quien.toLowerCase()}
                  </p>
                  <p className="text-content-muted text-xs">{t.fecha}</p>
                  <p className="text-content-subtle text-[10px] truncate">
                    {t.sujeto}
                  </p>
                </div>
                <p className="text-green-400 font-bold text-lg whitespace-nowrap">
                  {t.monto}
                </p>
              </div>
            ))
          ) : (
            <p className="text-content-muted text-center">
              No se encontraron transferencias recientes.
            </p>
          )}
        </div>
        <div className="mt-4 text-center">
          <Button variant="secondary" onClick={() => setShowTransfers(false)}>
            Cerrar
          </Button>
        </div>
      </Modal>

      {/* Modal de vista previa */}
      <Modal
        open={showPreview}
        onClose={closePreviewModal}
        title="Vista Previa de la Comanda"
        maxWidth="max-w-3xl"
        fullScreen
      >
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {(() => {
            const grouped = [];
            selectedProducts.forEach((p) => {
              const existing = grouped.find(
                (g) =>
                  g.name === p.name &&
                  g.observation === p.observation &&
                  JSON.stringify(g.additions) ===
                    JSON.stringify(p.additions)
              );
              if (existing) existing.quantity += p.quantity;
              else grouped.push({ ...p });
            });

            if (grouped.length === 0)
              return (
                <p className="text-content-muted text-center mt-10">
                  No hay productos en esta venta
                </p>
              );

            return (
              <ul className="space-y-4 pb-40">
                {grouped.map((product, index) => (
                  <li
                    key={index}
                    className="bg-surface-hover p-3 rounded-control shadow-sm border border-border"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-semibold text-content">
                        {product.name}
                      </h3>
                      <span className="text-sm text-content-muted">
                        x{product.quantity}
                      </span>
                    </div>

                    {product.observation && (
                      <p className="text-sm text-content-muted italic mb-1">
                        Obs: {product.observation}
                      </p>
                    )}

                    {product.additions?.length > 0 && (
                      <ul className="text-sm text-content-muted mt-1 pl-4 list-disc">
                        {product.additions.map((add, i) => (
                          <li key={i}>
                            + {add.name} (
                            {new Intl.NumberFormat("es-CL", {
                              style: "currency",
                              currency: "CLP",
                            }).format(add.price)}
                            )
                          </li>
                        ))}
                      </ul>
                    )}

                    <p className="text-right text-green-400 font-semibold mt-2">
                      {new Intl.NumberFormat("es-CL", {
                        style: "currency",
                        currency: "CLP",
                      }).format(
                        (product.price +
                          (product.additions?.reduce(
                            (sum, a) => sum + a.price,
                            0
                          ) || 0)) *
                          product.quantity
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>

        {(() => {
          const subtotal = selectedProducts.reduce((acc, p) => {
            const adds = p.additions?.reduce((s, a) => s + a.price, 0) || 0;
            return acc + (p.price + adds) * p.quantity;
          }, 0);

          const received =
            Number(cashReceived.replace(/\./g, "")) || 0;

          const currentSale = sales.find((s) => s.id === selectedSaleId);
          const isAboutToBePaid = currentSale?.status === "en mesa";
          const discountPct = Math.min(
            100,
            Math.max(0, Number(discountPercentInput) || 0)
          );
          const finalTotal = subtotal * (1 - discountPct / 100);
          const changeBase = isAboutToBePaid ? finalTotal : subtotal;
          const change = received - changeBase;
          const cashPart =
            paymentType === "efectivo"
              ? finalTotal
              : paymentType === "mixto"
              ? Number(cashAmountInput.replace(/\./g, "")) || 0
              : 0;
          const transferPart = Math.max(0, finalTotal - cashPart);

          return (
            <div className="bg-surface-hover border-t border-border-hover px-6 py-4 flex flex-col gap-3 sticky bottom-0">
              <div className="flex justify-between items-center">
                <p className="text-content font-semibold text-lg">
                  Subtotal:{" "}
                  {new Intl.NumberFormat("es-CL", {
                    style: "currency",
                    currency: "CLP",
                  }).format(subtotal)}
                </p>

                {currentSale?.status === "en proceso" && (
                  <Button
                    variant="success"
                    onClick={() => handleStatusAdvance(currentSale)}
                  >
                    Orden lista
                  </Button>
                )}
              </div>

              {isAboutToBePaid && (
                <div className="bg-surface border border-border rounded-md p-3 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div>
                      <label className="block text-xs text-content-muted mb-1">
                        Tipo de pago
                      </label>
                      <select
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value)}
                        className="bg-surface-hover border border-border text-content px-3 py-2 rounded-md"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="mixto">Mixto</option>
                      </select>
                    </div>

                    {paymentType === "mixto" && (
                      <div>
                        <label className="block text-xs text-content-muted mb-1">
                          Monto en efectivo
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={cashAmountInput}
                          onChange={handleCashAmountChange}
                          placeholder="Ej: 30.000"
                          className="bg-surface-hover border border-border text-content px-3 py-2 rounded-md w-32 text-right"
                        />
                      </div>
                    )}

                    {getRole(session) === ROLE_ADMIN && (
                      <div>
                        <label className="block text-xs text-content-muted mb-1">
                          % Descuento
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={discountPercentInput}
                          onChange={(e) =>
                            setDiscountPercentInput(e.target.value)
                          }
                          className="bg-surface-hover border border-border text-content px-3 py-2 rounded-md w-24 text-right"
                        />
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-content-muted space-y-1">
                    {getRole(session) === ROLE_ADMIN && discountPct > 0 && (
                      <p>
                        Total con descuento ({discountPct}%):{" "}
                        <span className="text-emerald-400 font-semibold">
                          {new Intl.NumberFormat("es-CL", {
                            style: "currency",
                            currency: "CLP",
                          }).format(finalTotal)}
                        </span>
                      </p>
                    )}
                    {paymentType === "efectivo" && (
                      <p>
                        Se registrará como pagado 100% en efectivo:{" "}
                        <span className="text-emerald-400 font-semibold">
                          {new Intl.NumberFormat("es-CL", {
                            style: "currency",
                            currency: "CLP",
                          }).format(finalTotal)}
                        </span>
                      </p>
                    )}
                    {paymentType === "transferencia" && (
                      <p>
                        Se registrará como pagado 100% por transferencia:{" "}
                        <span className="text-emerald-400 font-semibold">
                          {new Intl.NumberFormat("es-CL", {
                            style: "currency",
                            currency: "CLP",
                          }).format(finalTotal)}
                        </span>
                      </p>
                    )}
                    {paymentType === "mixto" && (
                      <p>
                        Transferencia inferida (diferencia):{" "}
                        <span className="text-emerald-400 font-semibold">
                          {new Intl.NumberFormat("es-CL", {
                            style: "currency",
                            currency: "CLP",
                          }).format(transferPart)}
                        </span>
                      </p>
                    )}
                  </div>

                  <Button
                    variant="success"
                    onClick={() =>
                      handleConfirmPayment(currentSale, subtotal)
                    }
                    disabled={isConfirmingPayment}
                    className="self-start"
                  >
                    {isConfirmingPayment
                      ? "Guardando..."
                      : "Confirmar pago y marcar como pagada"}
                  </Button>

                  {(paymentType === "efectivo" ||
                    paymentType === "mixto") && (
                    <div className="flex items-center gap-3 pt-2 border-t border-border mt-1">
                      <div>
                        <label className="block text-xs text-content-muted mb-1">
                          Efectivo recibido (para calcular vuelto)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={cashReceived}
                          onChange={handleCashReceivedChange}
                          placeholder="Ej: 30.000"
                          className="bg-surface-hover border border-border text-content px-3 py-2 rounded-md w-36 text-right"
                        />
                      </div>
                      {cashReceived && (
                        <div className="mt-4">
                          <p
                            className={`font-semibold text-sm ${
                              change >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {change >= 0
                              ? `Vuelto: ${new Intl.NumberFormat("es-CL", {
                                  style: "currency",
                                  currency: "CLP",
                                }).format(change)}`
                              : `Faltan: ${new Intl.NumberFormat("es-CL", {
                                  style: "currency",
                                  currency: "CLP",
                                }).format(Math.abs(change))}`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="success"
                  icon={FaPrint}
                  onClick={() =>
                    printTicket({
                      products: selectedProducts,
                      total: subtotal,
                      tableNumber: sales.find(
                        (s) => s.id === selectedSaleId
                      )?.table,
                      game: sales
                        .find((s) => s.id === selectedSaleId)
                        ?.gameId?.toString(),
                      availableGames: [],
                      availableProducts: [],
                      generalObservation: sales.find(
                        (s) => s.id === selectedSaleId
                      )?.generalObservation,
                      orderType: sales.find((s) => s.id === selectedSaleId)
                        ?.orderType,
                    })
                  }
                >
                  Imprimir
                </Button>
                {currentSale && (
                  <Button
                    variant="secondary"
                    icon={FaShareAlt}
                    onClick={() => handleShareSale(currentSale)}
                  >
                    Compartir
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </PageContainer>
  );
}

export default DailySales;
