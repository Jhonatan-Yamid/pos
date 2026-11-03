/**
 * Builds a web app manifest object from a tenant config.
 * Pure function — no side effects, no I/O.
 * @param {Object|null} config - TenantConfig or null
 * @returns {Object} Web App Manifest
 */
export function buildManifest(config) {
  return {
    name: config?.app_name || 'POS',
    short_name: config?.app_short_name || config?.app_name || 'POS',
    description: 'Sistema de punto de venta',
    start_url: config?.slug ? `/${config.slug}/dashboard` : '/dashboard',
    scope: config?.slug ? `/${config.slug}/` : '/',
    display: 'standalone',
    theme_color: '#020712',
    background_color: '#020712',
    icons: [
      {
        src: config?.manifest_icon_192 || '/icons/serverHM-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: config?.manifest_icon_256 || '/icons/serverHM-256.png',
        sizes: '256x256',
        type: 'image/png',
      },
      {
        src: config?.manifest_icon_512 || '/icons/serverHM-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
