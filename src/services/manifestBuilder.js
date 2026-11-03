/**
 * Builds a web app manifest object from a tenant config.
 * Pure function — no side effects, no I/O.
 * @param {Object|null} config - TenantConfig or null
 * @returns {Object} Web App Manifest
 */
export function buildManifest(config) {
  const slug = config?.slug;

  const icon192 = config?.manifest_icon_192 || '/icons/serverHM-192.png';
  const icon256 = config?.manifest_icon_256 || '/icons/serverHM-256.png';
  const icon512 = config?.manifest_icon_512 || '/icons/serverHM-512.png';

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
