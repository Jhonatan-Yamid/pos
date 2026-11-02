/**
 * Task 6.5 — Property test for manifest builder (Property 11)
 * Requirements: 9.4
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildManifest } from './manifestBuilder';

describe('manifestBuilder — Property 11: Per-tenant manifest reflects TenantConfig', () => {
  it('Property 11 — Feature: multi-tenant-architecture, Property 11: Per-tenant manifest reflects TenantConfig', () => {
    const configArb = fc.record({
      slug: fc.stringMatching(/^[a-z0-9-]{2,20}$/),
      app_name: fc.string({ minLength: 1, maxLength: 50 }),
      app_short_name: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
      manifest_icon_192: fc.webUrl(),
      manifest_icon_256: fc.webUrl(),
      manifest_icon_512: fc.webUrl(),
    });

    fc.assert(
      fc.property(configArb, (config) => {
        const manifest = buildManifest(config);

        // Name must match app_name
        expect(manifest.name).toBe(config.app_name);

        // short_name: uses app_short_name if set, falls back to app_name
        if (config.app_short_name) {
          expect(manifest.short_name).toBe(config.app_short_name);
        } else {
          expect(manifest.short_name).toBe(config.app_name);
        }

        // Icon srcs must match config
        const icon192 = manifest.icons.find((i) => i.sizes === '192x192');
        const icon256 = manifest.icons.find((i) => i.sizes === '256x256');
        const icon512 = manifest.icons.find((i) => i.sizes === '512x512');

        expect(icon192?.src).toBe(config.manifest_icon_192);
        expect(icon256?.src).toBe(config.manifest_icon_256);
        expect(icon512?.src).toBe(config.manifest_icon_512);

        // start_url includes the slug
        expect(manifest.start_url).toContain(config.slug);
      }),
      { numRuns: 100 }
    );
  });

  it('null config yields fallback manifest without crashing', () => {
    const manifest = buildManifest(null);
    expect(manifest.name).toBe('POS');
    expect(manifest.icons).toHaveLength(3);
    expect(manifest.icons[0].src).toContain('default');
  });
});