import db from "@/libs/db";
import { ok, fail, withErrorHandling } from "@/libs/apiResponse";
import {
  buildProviderCreateInput,
  buildProviderUpdateInput,
  normalizeProviderPayload,
  validateProviderPayload,
} from "@/services/providerService";

export const GET = withErrorHandling(async (request) => {
  const { searchParams } = new URL(request.url);

  // F4: para el selector de "factura de proveedor" que ven roles != 1,
  // solo se exponen id + name (nunca accountNumber ni otros datos
  // sensibles) — el filtrado ocurre en el servidor, no ocultando campos
  // en el cliente.
  if (searchParams.get("minimal") === "1") {
    const providers = await db.provider.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: "asc" },
    });
    return ok(providers);
  }

  const providers = await db.provider.findMany({
    include: { ingredients: true },
  });
  return ok(providers);
}, "Error al obtener proveedores");

export const POST = withErrorHandling(async (request) => {
  const data = await request.json();
  const payload = normalizeProviderPayload(data);
  const validationError = validateProviderPayload(payload);

  if (validationError) {
    return fail(validationError, 400);
  }

  const newProvider = await db.provider.create({
    data: buildProviderCreateInput(payload),
  });
  return ok(newProvider, 201);
}, "Error al crear proveedor");

export const PUT = withErrorHandling(async (request) => {
  const body = await request.json();
  const id = parseInt(body.id);

  if (!id || isNaN(id)) {
    return fail("El ID es requerido para actualizar un proveedor", 400);
  }

  const payload = normalizeProviderPayload(body);
  const validationError = validateProviderPayload(payload);

  if (validationError) {
    return fail(validationError, 400);
  }

  const updatedProvider = await db.provider.update({
    where: { id },
    data: buildProviderUpdateInput(payload),
  });

  return ok(updatedProvider);
}, "Error al actualizar proveedor");

export const DELETE = withErrorHandling(async (request) => {
  const body = await request.json();

  if (!body?.id) {
    return fail("El ID es requerido para eliminar un proveedor", 400);
  }

  await db.provider.delete({ where: { id: body.id } });
  return ok({ message: "Proveedor eliminado" });
}, "Error al eliminar proveedor");
