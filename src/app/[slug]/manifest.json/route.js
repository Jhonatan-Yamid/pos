import { resolveTenantConfig } from '@/libs/tenantConfig';
import { buildManifest } from '@/services/manifestBuilder';

export async function GET(request, { params }) {
  const config = await resolveTenantConfig(params.slug);
  const manifest = buildManifest(config);

  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/json' },
  });
}
