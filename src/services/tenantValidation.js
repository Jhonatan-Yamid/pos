/**
 * Tenant creation and update validation logic.
 * Extracted from src/app/api/admin/tenants/route.js for testability.
 * Requirements: 7.4, 7.5
 */

import { validateSlugFormat, normalizeSlug } from '@/services/slugValidation';

/**
 * Validate input for tenant creation.
 * Returns an object with per-field error messages, or null if valid.
 *
 * @param {object} body - Parsed request body.
 * @param {string[]} existingSlugs - Slugs already present in Master_DB.
 * @returns {object|null} Per-field errors, or null if input is valid.
 */
export function validateTenantCreateInput(body, existingSlugs) {
  const errors = {};
  const requiredFields = ['slug', 'app_name', 'email', 'database_url'];

  for (const field of requiredFields) {
    if (!body[field] || String(body[field]).trim() === '') {
      errors[field] = 'Campo requerido';
    }
  }

  // Slug-specific format and uniqueness checks (only if slug is present).
  if (body.slug && String(body.slug).trim() !== '') {
    const normalized = normalizeSlug(String(body.slug).trim());
    if (!validateSlugFormat(normalized)) {
      errors.slug =
        'El slug solo puede contener letras minúsculas, números y guiones, entre 2 y 63 caracteres';
    } else if (existingSlugs.includes(normalized)) {
      errors.slug = 'slug ya existe';
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}