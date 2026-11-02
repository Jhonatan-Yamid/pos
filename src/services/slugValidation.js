const SLUG_REGEX = /^[a-z0-9-]{2,63}$/;

/**
 * Validates that a slug matches the required format:
 * lowercase letters, numbers, and hyphens, between 2 and 63 characters.
 * Requirements: 1.4, 1.5
 * @param {string} slug
 * @returns {boolean}
 */
export function validateSlugFormat(slug) {
  return SLUG_REGEX.test(slug);
}

/**
 * Normalizes a slug to lowercase.
 * Requirements: 1.4
 * @param {string} slug
 * @returns {string}
 */
export function normalizeSlug(slug) {
  return slug.toLowerCase();
}
