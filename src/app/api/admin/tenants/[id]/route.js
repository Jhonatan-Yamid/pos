import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import masterDb from "@/libs/db";
import { invalidateCachedTenant } from "@/libs/tenantCache";
import { maskSecretField } from "@/libs/publicConfig";
import { validateSlugFormat, normalizeSlug } from "@/services/slugValidation";

/**
 * Admin API — Single tenant operations (GET, PUT, DELETE).
 * Requirements: 7.1, 7.2, 7.6, 7.7, 7.8
 *
 * All handlers verify that the caller has the SUPER_ADMIN role (numeric 2)
 * stored in the JWT token. Any other role receives a 403 response.
 */

/** Numeric role value for Super_Admin (matches user.image === 2 in JWT). */
const SUPER_ADMIN_ROLE = 2;

/**
 * Secret fields that should be masked (not fully omitted) when returning
 * a single tenant record, showing only the last 4 characters.
 * Requirements: 7.8
 */
const SECRET_FIELDS = ["database_url", "cloudinary_api_key", "cloudinary_api_secret"];

/**
 * Apply masking to secret fields in a tenant record.
 * Each secret field is replaced with '********' + last 4 chars.
 * If the field is null or empty it is left as-is.
 *
 * @param {object} tenant - Raw tenant record from Master_DB.
 * @returns {object} Tenant record with secret fields masked.
 */
function maskTenantSecrets(tenant) {
  const result = { ...tenant };
  for (const field of SECRET_FIELDS) {
    if (result[field]) {
      result[field] = maskSecretField(String(result[field]));
    }
  }
  return result;
}

/**
 * Verify that the incoming request carries a valid Super_Admin JWT.
 * Returns the decoded token on success, or null if auth fails.
 *
 * @param {Request} req
 * @returns {Promise<object|null>}
 */
async function requireSuperAdmin(req) {
  const token = await getToken({ req });
  if (!token || token.role !== SUPER_ADMIN_ROLE) {
    return null;
  }
  return token;
}

/**
 * Validate fields supplied on a PUT (update) request.
 * Only checks fields that are present in the body; required fields are not
 * re-validated unless they are being set to an empty value.
 * Slug cannot be changed via PUT.
 *
 * Returns per-field error messages or null if input is valid.
 *
 * @param {object} body - Parsed request body.
 * @returns {object|null}
 */
function validateTenantUpdateInput(body) {
  const errors = {};
  const requiredFields = ["app_name", "email", "database_url"];

  for (const field of requiredFields) {
    if (field in body && (!body[field] || String(body[field]).trim() === "")) {
      errors[field] = "Campo requerido";
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * GET /api/admin/tenants/[id]
 * Returns a single tenant record with secret fields masked.
 *
 * Requirements: 7.2, 7.8
 */
export async function GET(req, { params }) {
  const token = await requireSuperAdmin(req);
  if (!token) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const tenant = await masterDb.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    return NextResponse.json(maskTenantSecrets(tenant));
  } catch (error) {
    console.error(`[admin/tenants/${id} GET] Error:`, error);
    return NextResponse.json(
      { error: "Error al obtener el tenant" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/tenants/[id]
 * Updates an existing tenant's configuration in Master_DB.
 * After saving, invalidates the cache entry for that tenant's slug so
 * subsequent requests read fresh data.
 *
 * Requirements: 7.6
 */
export async function PUT(req, { params }) {
  const token = await requireSuperAdmin(req);
  if (!token) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Prevent slug changes via PUT.
  delete body.id;
  delete body.slug;
  delete body.created_at;
  delete body.updated_at;

  const errors = validateTenantUpdateInput(body);
  if (errors) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  // Verify the tenant exists before attempting the update.
  let existing;
  try {
    existing = await masterDb.tenant.findUnique({ where: { id } });
  } catch (error) {
    console.error(`[admin/tenants/${id} PUT] Error fetching tenant:`, error);
    return NextResponse.json(
      { error: "Error al obtener el tenant" },
      { status: 500 }
    );
  }

  if (!existing) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  }

  try {
    const updated = await masterDb.tenant.update({
      where: { id },
      data: body,
    });

    // Invalidate cache so the next request reads the updated record.
    // Requirements: 7.6
    invalidateCachedTenant(existing.slug);

    return NextResponse.json(maskTenantSecrets(updated));
  } catch (error) {
    console.error(`[admin/tenants/${id} PUT] Error updating tenant:`, error);
    return NextResponse.json(
      { error: "Error al actualizar el tenant" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tenants/[id]
 * Soft-deletes a tenant by setting is_active = false.
 * After the update, invalidates the cache entry for that tenant's slug so
 * the next request for that slug returns the tenant-not-found page.
 *
 * Requirements: 7.7
 */
export async function DELETE(req, { params }) {
  const token = await requireSuperAdmin(req);
  if (!token) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  // Fetch existing record to get the slug for cache invalidation.
  let existing;
  try {
    existing = await masterDb.tenant.findUnique({ where: { id } });
  } catch (error) {
    console.error(`[admin/tenants/${id} DELETE] Error fetching tenant:`, error);
    return NextResponse.json(
      { error: "Error al obtener el tenant" },
      { status: 500 }
    );
  }

  if (!existing) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  }

  try {
    const updated = await masterDb.tenant.update({
      where: { id },
      data: { is_active: false },
    });

    // Invalidate cache so subsequent requests for this slug see the deactivation.
    // Requirements: 7.7
    invalidateCachedTenant(existing.slug);

    return NextResponse.json(maskTenantSecrets(updated));
  } catch (error) {
    console.error(`[admin/tenants/${id} DELETE] Error deactivating tenant:`, error);
    return NextResponse.json(
      { error: "Error al desactivar el tenant" },
      { status: 500 }
    );
  }
}
