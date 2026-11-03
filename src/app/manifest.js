/**
 * Generic (non-tenant-specific) web app manifest.
 *
 * Per-tenant manifests are served at /[slug]/manifest.json via
 * src/app/[slug]/manifest.json/route.js, which uses buildManifest()
 * from src/services/manifestBuilder.js to include tenant branding.
 */
export default function manifest() {
  return {
    name: 'POS',
    short_name: 'POS',
    description: 'Sistema de punto de venta',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: '#020712',
    background_color: '#020712',
    icons: [
      {
        src: '/icons/serverHM-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/serverHM-256.png',
        sizes: '256x256',
        type: 'image/png',
      },
      {
        src: '/icons/serverHM-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  }
}