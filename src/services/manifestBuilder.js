/**
 * Builds a web app manifest object from a tenant config.
 * Pure function — no side effects, no I/O.
 * @param {Object|null} config - TenantConfig or null
 * @returns {Object} Web App Manifest
 */
export function buildManifest(config) {
  const slug = config?.slug;

  // Prefer explicit icon URLs stored in the DB.
  // If not set, fall back to the tenant's slug-based icon path,
  // then to a generic placeholder.
  const slugIcon = (size) =>
    slug ? `/icons/${slug}-${size}.png` : `/icons/default-${size}.png`;

  const icon192 = config?.manifest_icon_192 || slugIcon('192');
  const icon256 = config?.manifest_icon_256 || slugIcon('256');
  const icon512 = config?.manifest_icon_512 || slugIcon('512');

  return {
    name: config?.app_name || 'POS',
    short_name: config?.app_short_name || config?.app_name || 'POS',
    description: 'Sistema de punto de venta',
    start_url: slug ? `/${slug}/dashboard` : '/',
    scope: slug ? `/${slug}/` : '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#020712',
    background_color: '#020712',
    icons: [
      {
        src: icon192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icon192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: icon256,
        sizes: '256x256',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icon512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icon512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
