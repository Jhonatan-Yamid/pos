/**
 * Strips secret fields from a TenantConfig object before sending to the client.
 * Removes: database_url, cloudinary_api_key, cloudinary_api_secret, email_pass
 * @param {Object} tenantConfig
 * @returns {Object} PublicTenantConfig
 */
export function toPublicConfig(tenantConfig) {
  const {
    database_url,
    cloudinary_api_key,
    cloudinary_api_secret,
    email_pass,          // never expose mail password to client
    ...publicConfig
  } = tenantConfig;
  return publicConfig;
}

/**
 * Masks a secret field value, showing only the last 4 characters.
 * @param {string} value
 * @returns {string} '********' + last 4 chars
 */
export function maskSecretField(value) {
  return '********' + value.slice(-4);
}
