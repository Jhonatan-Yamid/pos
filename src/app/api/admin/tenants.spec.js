/**
 * Task 9.2 — Unit + property tests for tenant admin validation (Property 13)
 * Requirements: 7.4, 7.5
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateTenantCreateInput } from '@/services/tenantValidation';

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('validateTenantCreateInput — unit tests', () => {
  it('returns null for a fully valid input', () => {
    const input = {
      slug: 'mi-negocio',
      app_name: 'Mi Negocio',
      email: 'admin@mi.com',
      database_url: 'mysql://user:pass@host/db',
    };
    expect(validateTenantCreateInput(input, [])).toBeNull();
  });

  it('returns errors when required fields are missing', () => {
    const errors = validateTenantCreateInput({}, []);
    expect(errors).not.toBeNull();
    expect(errors.slug).toBeDefined();
    expect(errors.app_name).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.database_url).toBeDefined();
  });

  it('returns slug error for bad format', () => {
    const input = {
      slug: 'INVALID SLUG!',
      app_name: 'Test',
      email: 'a@b.com',
      database_url: 'mysql://host/db',
    };
    const errors = validateTenantCreateInput(input, []);
    expect(errors?.slug).toBeDefined();
  });

  it('returns slug error for duplicate slug', () => {
    const input = {
      slug: 'existing',
      app_name: 'Test',
      email: 'a@b.com',
      database_url: 'mysql://host/db',
    };
    const errors = validateTenantCreateInput(input, ['existing']);
    expect(errors?.slug).toMatch(/ya existe/i);
  });

  it('returns null for a slug with numbers and hyphens', () => {
    const input = {
      slug: 'my-shop-2024',
      app_name: 'My Shop',
      email: 'shop@test.com',
      database_url: 'mysql://host/db',
    };
    expect(validateTenantCreateInput(input, [])).toBeNull();
  });
});

// ─── Property tests ───────────────────────────────────────────────────────────

describe('validateTenantCreateInput — Property 13: Tenant creation validation rejects any invalid input', () => {
  it('Property 13 — Feature: multi-tenant-architecture, Property 13: Tenant creation validation rejects any invalid input', () => {
    // Arbitrary invalid inputs: missing required fields, bad slug format, or duplicate slug
    const invalidInputArb = fc.oneof(
      // Missing required fields
      fc.record({
        slug: fc.constant(''),
        app_name: fc.constant(''),
        email: fc.constant(''),
        database_url: fc.constant(''),
      }),
      // Bad slug format (uppercase, spaces, special chars)
      fc.record({
        slug: fc.oneof(
          fc.string({ minLength: 1, maxLength: 1 }), // too short
          fc.string({ minLength: 64, maxLength: 80 }).map(s => s.replace(/[^a-z]/g, 'x')), // too long
          fc.constant('UPPER_CASE'),
          fc.constant('has space'),
          fc.constant('has@special'),
        ),
        app_name: fc.constant('Valid Name'),
        email: fc.constant('valid@email.com'),
        database_url: fc.constant('mysql://host/db'),
      }),
    );

    fc.assert(
      fc.property(invalidInputArb, (input) => {
        const errors = validateTenantCreateInput(input, ['already-taken']);
        // At least one field error must be present
        expect(errors).not.toBeNull();
        expect(Object.keys(errors).length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 13b — valid slugs never produce a slug format error (when not duplicate)', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z0-9-]{2,63}$/),
        (slug) => {
          const input = {
            slug,
            app_name: 'Test App',
            email: 'a@b.com',
            database_url: 'mysql://host/db',
          };
          const errors = validateTenantCreateInput(input, []);
          if (errors) {
            expect(errors.slug).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});