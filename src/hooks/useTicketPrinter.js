"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { buildPrintRequestBody } from "@/services/saleService";

export default function useTicketPrinter() {
  const params = useParams();
  const slug = params?.slug ?? "";

  const printTicket = useCallback(
    async ({
      products,
      total,
      tableNumber,
      game,
      availableGames = [],
      availableProducts = [],
      generalObservation,
      orderType,
    }) => {
      try {
        // 1. Obtener IP de la impresora usando la ruta con slug
        const ipRes = await fetch(`/api/${slug}/print-ip`);
        if (!ipRes.ok) throw new Error("No se pudo obtener la IP de la impresora");

        const ipData = await ipRes.json();
        const printerIp = ipData.ip;

        if (!printerIp) {
          alert("No hay impresora configurada.");
          return;
        }

        const requestBody = buildPrintRequestBody({
          products,
          total,
          tableNumber,
          game,
          availableGames,
          availableProducts,
          generalObservation,
          orderType,
        });

        // 2. Enviar al servidor de impresión local
        const res = await fetch(`${printerIp}/print`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(requestBody),
        });

        const data = await res.json();

        if (data.success) {
          alert("🖨️ Ticket enviado a la impresora");
        } else {
          alert("Error al imprimir: " + (data.message || "Error desconocido"));
        }
      } catch (err) {
        console.error("Error al imprimir:", err);
        alert("Error al conectar con el servicio de impresión: " + err.message);
      }
    },
    [slug]
  );

  return { printTicket };
}
