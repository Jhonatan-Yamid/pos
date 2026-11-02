"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Legend,
} from "recharts";
import {
  FaMoneyBillWave,
  FaChartLine,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
} from "react-icons/fa";
import { PageContainer } from "@/components/ui/Layout";
import { Select } from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export default function SalesDailyPage() {
  const { slug } = useParams();
  const [dailySales, setDailySales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30");
  const [movingAvgDays, setMovingAvgDays] = useState(7);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!slug) return;
    async function fetchDailySales() {
      try {
        setLoading(true);
        const res = await fetch(`/api/${slug}/sale/daily?days=${range}`);
        const data = await res.json();

        if (!data || !Array.isArray(data)) {
          console.error("Error: formato inesperado en datos", data);
          setDailySales([]);
          setLoading(false);
          return;
        }

        let processed = data.map((d) => {
          const [year, month, day] = d.date.split("-").map(Number);
          const dateObj = new Date(year, month - 1, day);

          return {
            ...d,
            dateObj,
            dateLabel: dateObj.toLocaleDateString("es-CO", {
              weekday: "long",
              day: "2-digit",
              month: "short",
            }),
            dayOfWeek: translateDay(d.dayOfWeek),
          };
        });

        processed = processed.sort((a, b) => b.dateObj - a.dateObj);
        processed = calculateMovingAverage(processed, movingAvgDays);
        processed = calculateVariation(processed);

        setDailySales(processed);
        setLoading(false);
      } catch (error) {
        console.error("Error cargando ventas:", error);
        setDailySales([]);
        setLoading(false);
      }
    }

    fetchDailySales();
  }, [range, movingAvgDays, slug]);

  const summary = useMemo(() => {
    if (dailySales.length === 0) return { total: 0, average: 0 };
    const total = dailySales.reduce((acc, d) => acc + d.totalSales, 0);
    const average = total / dailySales.length;
    return { total, average };
  }, [dailySales]);

  function calculatePockets(total) {
    return {
      operacion: total * 0.65,
      arriendo: total * 0.15,
      deuda: total * 0.1,
      emergencia: total * 0.05,
      socios: total * 0.05,
    };
  }

  const movingAvgColor =
    movingAvgDays === 3 ? "#f87171" : movingAvgDays === 7 ? "#38bdf8" : "#c084fc";

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-content font-semibold text-2xl sm:text-3xl">
          Ventas Diarias
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-content-muted text-sm">Rango:</label>
            <Select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="60">Últimos 2 meses</option>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-content-muted text-sm">Promedio móvil:</label>
            <Select
              value={movingAvgDays}
              onChange={(e) => setMovingAvgDays(Number(e.target.value))}
            >
              <option value="3">3 días</option>
              <option value="7">7 días</option>
              <option value="14">14 días</option>
            </Select>
          </div>
        </div>
      </div>

      {!loading && dailySales.length > 0 && (
        <div className="bg-gradient-to-br from-green-700 to-emerald-600 rounded-xl shadow-lg p-4 sm:p-6 mb-8 text-white flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-3">
            <FaMoneyBillWave className="text-3xl sm:text-4xl" />
            <div>
              <h3 className="text-sm sm:text-base opacity-90">Total del rango</h3>
              <p className="text-xl sm:text-2xl font-bold">
                {formatCurrency(summary.total)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FaChartLine className="text-3xl sm:text-4xl" />
            <div>
              <h3 className="text-sm sm:text-base opacity-90">Promedio diario</h3>
              <p className="text-xl sm:text-2xl font-bold">
                {formatCurrency(summary.average)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FaCalendarAlt className="text-3xl sm:text-4xl" />
            <div>
              <h3 className="text-sm sm:text-base opacity-90">Rango analizado</h3>
              <p className="text-xl sm:text-2xl font-bold">
                {range === "7"
                  ? "7 días"
                  : range === "30"
                  ? "30 días"
                  : "60 días"}
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-content-muted">Cargando ventas...</p>
      ) : dailySales.length === 0 ? (
        <p className="text-content-muted">No hay ventas registradas.</p>
      ) : (
        <>
          <div className="bg-surface rounded-control p-3 sm:p-5 shadow-lg mb-8 border border-border">
            <h2 className="text-content text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              Total de Ventas y Tendencia (Promedio {movingAvgDays} días)
            </h2>
            <div className="w-full h-[300px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dailySales}
                  margin={{ top: 10, right: 10, left: -20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#cbd5e1", fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    interval={Math.ceil(dailySales.length / 8)}
                  />
                  <YAxis
                    tick={{ fill: "#cbd5e1", fontSize: 10 }}
                    tickFormatter={(val) =>
                      new Intl.NumberFormat("es-CL", {
                        style: "currency",
                        currency: "CLP",
                        maximumFractionDigits: 0,
                      }).format(val)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                      color: "#e2e8f0",
                      fontSize: "0.85rem",
                    }}
                    formatter={(value) =>
                      new Intl.NumberFormat("es-CL", {
                        style: "currency",
                        currency: "CLP",
                      }).format(value)
                    }
                    labelFormatter={(label) => `Fecha: ${label}`}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ color: "#e2e8f0", fontSize: "0.8rem" }}
                  />
                  <Bar
                    dataKey="totalSales"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    name="Ventas Diarias"
                  />
                  <Line
                    type="monotone"
                    dataKey="movingAvg"
                    stroke={movingAvgColor}
                    strokeWidth={3}
                    dot={false}
                    name={`Promedio ${movingAvgDays} días`}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface rounded-control p-4 sm:p-6 shadow-lg border border-border overflow-x-auto">
            <h2 className="text-content text-lg font-semibold mb-4">
              Detalle Diario
            </h2>
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="text-content-muted border-b border-border-hover text-sm">
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-right">Total Ventas</th>
                  <th className="p-2 text-right">Promedio Móvil</th>
                  <th className="p-2 text-right">% Variación</th>
                </tr>
              </thead>
              <tbody>
                {dailySales.map((item, i) => (
                  <tr
                    key={i}
                    onClick={() => {
                      setSelectedDay(item);
                      setShowModal(true);
                    }}
                    className="border-b border-border hover:bg-surface-hover/40 transition"
                  >
                    <td className="p-2 text-sm">
                      <b>{item.dayOfWeek}: </b>
                      {item.date}
                    </td>
                    <td className="p-2 text-right text-green-400 font-semibold">
                      {formatCurrency(item.totalSales)}
                    </td>
                    <td className="p-2 text-right text-sky-400">
                      {item.movingAvg ? formatCurrency(item.movingAvg) : "-"}
                    </td>
                    <td className="p-2 text-right text-sm font-semibold">
                      {item.variation !== null ? (
                        <span
                          className={`inline-flex items-center justify-end gap-1 ${
                            item.variation > 0
                              ? "text-green-400"
                              : item.variation < 0
                              ? "text-red-400"
                              : "text-content-muted"
                          }`}
                        >
                          {item.variation > 0 ? (
                            <FaArrowUp className="inline text-xs" />
                          ) : item.variation < 0 ? (
                            <FaArrowDown className="inline text-xs" />
                          ) : (
                            <FaMinus className="inline text-xs" />
                          )}
                          {item.variation.toFixed(1)}%
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {showModal && selectedDay && (
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title="División del día"
          maxWidth="max-w-md"
        >
          <p className="text-content-muted mb-2">
            <b>{selectedDay.dayOfWeek}:</b> {selectedDay.date}
          </p>

          <p className="text-success text-lg font-bold mb-6">
            Total: {formatCurrency(selectedDay.totalSales)}
          </p>

          {(() => {
            const pockets = calculatePockets(selectedDay.totalSales);
            return (
              <div className="space-y-3 text-sm">
                <PocketRow label="Operación (65%)" value={pockets.operacion} />
                <PocketRow label="Arriendo (15%)" value={pockets.arriendo} />
                <PocketRow label="Deuda (10%)" value={pockets.deuda} />
                <PocketRow label="Emergencia (5%)" value={pockets.emergencia} />
                <PocketRow label="Socios (5%)" value={pockets.socios} />
              </div>
            );
          })()}

          <Button
            variant="danger"
            fullWidth
            onClick={() => setShowModal(false)}
            className="mt-6"
          >
            Cerrar
          </Button>
        </Modal>
      )}
    </PageContainer>
  );
}

function calculateMovingAverage(data, period) {
  return data.map((entry, index) => {
    if (index < period - 1) return { ...entry, movingAvg: null };
    const window = data.slice(index - period + 1, index + 1);
    const avg =
      window.reduce((sum, d) => sum + d.totalSales, 0) / window.length;
    return { ...entry, movingAvg: avg };
  });
}

function PocketRow({ label, value }) {
  return (
    <div className="flex justify-between bg-surface-hover px-4 py-2 rounded-control border border-border">
      <span className="text-content-muted">{label}</span>
      <span className="font-semibold text-content">{formatCurrency(value)}</span>
    </div>
  );
}

function calculateVariation(data) {
  return data.map((entry, index) => {
    if (index === 0) return { ...entry, variation: null };
    const prev = data[index - 1].totalSales;
    const variation = ((entry.totalSales - prev) / prev) * 100;
    return { ...entry, variation: isFinite(variation) ? variation : null };
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function translateDay(day) {
  const days = {
    Monday: "Lunes",
    Tuesday: "Martes",
    Wednesday: "Miércoles",
    Thursday: "Jueves",
    Friday: "Viernes",
    Saturday: "Sábado",
    Sunday: "Domingo",
  };
  return days[day] || day;
}
