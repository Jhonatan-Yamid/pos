import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import masterDb from "@/libs/db";
import { invalidateCachedTenant } from "@/libs/tenantCache";
import { maskSecretField } from "@/libs/publicConfig";
import { validateSlugFormat, normalizeSlug } from "@/services/slugValidation";

/**
 * Admin API — Tenant list and creation.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 *
 * All handlers verify that the caller has the SUPER_ADMIN role (numeric 2)
 * stored in the JWT token. Any other role receives a 403 response.
 */

/** Numeric role value for Super_Admin (matches user.image === 2 in JWT). */
const SUPER_ADMIN_ROLE = 2;

/**
 * Fields that must be masked when returning tenant data to the admin panel.
 * Requirements: 7.8
 */
const SECRET_FIELDS = ["database_url", "cloudinary_api_key", "cloudinary_api_secret"];

/**
 * Fields that are never included in any list or GET response.
 * Requirements: 7.3
 */
const OMIT_FIELDS = new Set(SECRET_FIELDS);

/**
 * Apply masking to a tenant record for responses where partial display
 * of secret fields is needed (e.g. single-tenant GET in [id] route).
 * For the list view we simply omit them entirely.
 *
 * @param {object} tenant - Raw tenant record from Master_DB.
 * @returns {object} Tenant record with secret fields omitted.
 */
function omitSecretFields(tenant) {
  const result = { ...tenant };
  for (const field of OMIT_FIELDS) {
    delete result[field];
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
 * Validate input for tenant creation.
 * Returns an object with per-field error messages, or null if valid.
 *
 * Requirements: 7.4, 7.5
 *
 * @param {object} body - Parsed request body.
 * @param {string[]} existingSlugs - Slugs already present in Master_DB.
 * @returns {object|null} Per-field errors, or null if input is valid.
 */
function validateTenantCreateInput(body, existingSlugs) {
  const errors = {};
  const requiredFields = ["slug", "app_name", "email", "database_url"];

  for (const field of requiredFields) {
    if (!body[field] || String(body[field]).trim() === "") {
      errors[field] = "Campo requerido";
    }
  }

  // Slug-specific format and uniqueness checks (only if slug is present).
  if (body.slug && String(body.slug).trim() !== "") {
    const normalized = normalizeSlug(String(body.slug).trim());
    if (!validateSlugFormat(normalized)) {
      errors.slug =
        "El slug solo puede contener letras minúsculas, números y guiones, entre 2 y 63 caracteres";
    } else if (existingSlugs.includes(normalized)) {
      errors.slug = "slug ya existe";
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * GET /api/admin/tenants
 * Returns the list of all tenants stored in Master_DB.
 * Secret fields (database_url, cloudinary_api_key, cloudinary_api_secret)
 * are omitted from every record in the response.
 *
 * Requirements: 7.2, 7.3
 */
export async function GET(req) {
  const token = await requireSuperAdmin(req);
  if (!token) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const tenants = await masterDb.tenant.findMany({
      orderBy: { created_at: "desc" },
    });

    const safeTenants = tenants.map(omitSecretFields);
    return NextResponse.json(safeTenants);
  } catch (error) {
    console.error("[admin/tenants GET] Error fetching tenants:", error);
    return NextResponse.json(
      { error: "Error al obtener los tenants" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tenants
 * Creates a new tenant in Master_DB after validating all required fields.
 * Returns 201 with the created record (secrets omitted) on success,
 * or 422 with per-field error messages on validation failure.
 *
 * Requirements: 7.4, 7.5
 */
export async function POST(req) {
  const token = await requireSuperAdmin(req);
  if (!token) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Normalize slug before validation.
  if (body.slug) {
    body.slug = normalizeSlug(String(body.slug).trim());
  }

  // Fetch existing slugs to check uniqueness.
  let existingSlugs = [];
  try {
    const existing = await masterDb.tenant.findMany({ select: { slug: true } });
    existingSlugs = existing.map((t) => t.slug);
  } catch (error) {
    console.error("[admin/tenants POST] Error fetching existing slugs:", error);
    return NextResponse.json(
      { error: "Error al verificar slugs existentes" },
      { status: 500 }
    );
  }

  const errors = validateTenantCreateInput(body, existingSlugs);
  if (errors) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  try {
    const created = await masterDb.tenant.create({
      data: {
        slug: body.slug,
        name: body.name || body.app_name,
        app_name: body.app_name,
        app_short_name: body.app_short_name || null,
        email: body.email,
        phone: body.phone || null,
        database_url: body.database_url,
        cloudinary_cloud_name: body.cloudinary_cloud_name || null,
        cloudinary_api_key: body.cloudinary_api_key || null,
        cloudinary_api_secret: body.cloudinary_api_secret || null,
        manifest_icon_192: body.manifest_icon_192 || null,
        manifest_icon_256: body.manifest_icon_256 || null,
        manifest_icon_512: body.manifest_icon_512 || null,
        white_logo_url: body.white_logo_url || null,
        is_active: body.is_active !== undefined ? body.is_active : true,
      },
    });

    return NextResponse.json(omitSecretFields(created), { status: 201 });
  } catch (error) {
    console.error("[admin/tenants POST] Error creating tenant:", error);
    // Handle unique constraint violation (race condition on slug).
    if (error.code === "P2002" && error.meta?.target?.includes("slug")) {
      return NextResponse.json(
        { errors: { slug: "slug ya existe" } },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "Error al crear el tenant" },
      { status: 500 }
    );
  }
}
