import { resolveTenantConfig } from '@/libs/tenantConfig';
import { toPublicConfig } from '@/libs/publicConfig';
import { TenantProvider } from '@/context/TenantContext';
import TenantNavbar from '@/components/TenantNavbar';

/**
 * Fallback config used when tenant resolution fails (Requirement 9.3).
 * Safe empty values — no crash, no secrets exposed.
 */
const FALLBACK_CONFIG = {
  id: 0,
  slug: '',
  name: '',
  app_name: 'POS',
  app_short_name: null,
  email: '',
  phone: null,
  manifest_icon_192: null,
  manifest_icon_256: null,
  manifest_icon_512: null,
  white_logo_url: null,
  cloudinary_cloud_name: null,
  is_active: false,
  created_at: new Date(0),
  updated_at: new Date(0),
};

/**
 * Slug-scoped layout (server component).
 *
 * - Resolves tenant config from Master_DB (with cache).
 * - Strips secret fields via toPublicConfig before passing to client context.
 * - Falls back to FALLBACK_CONFIG on resolution failure (Req 9.3).
 * - Renders TenantNavbar which reads branding from TenantContext.
 *
 * Requirements: 5.1, 9.1, 9.2, 9.3
 */
export default async function SlugLayout({ params, children }) {
  let tenantConfig;

  try {
    const resolved = await resolveTenantConfig(params.slug);
    tenantConfig = resolved ? toPublicConfig(resolved) : FALLBACK_CONFIG;
  } catch {
    tenantConfig = FALLBACK_CONFIG;
  }

  return (
    <TenantProvider tenantConfig={tenantConfig}>
      <TenantNavbar />
      {children}
    </TenantProvider>
  );
}
