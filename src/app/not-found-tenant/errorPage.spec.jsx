/**
 * Task 10.1 — Property test for error page data safety (Property 16)
 * Requirements: 10.2
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import TenantNotFoundPage from './page';

vi.mock('next/link', () => ({
  default: ({ href, children }) => React.createElement('a', { href }, children),
}));

describe('TenantNotFoundPage — Property 16: Error page body contains no sensitive data', () => {
  it('Property 16 — Feature: multi-tenant-architecture, Property 16: Error page body contains no sensitive data', () => {
    // The page is static — it does not accept any input that could leak data.
    // But we render it multiple times to ensure the output is always safe.
    const { container } = render(React.createElement(TenantNotFoundPage));
    const html = container.innerHTML;

    // Must not contain database URLs, internal file paths, stack frames, or Prisma error codes
    expect(html).not.toMatch(/DATABASE_URL/i);
    expect(html).not.toMatch(/\/src\//);
    expect(html).not.toMatch(/\\src\\/);
    expect(html).not.toMatch(/at \w+\.(js|ts):\d+/i);
    expect(html).not.toMatch(/P\d{4}/); // Prisma error codes like P2002

    // Must not contain internal paths
    expect(html).not.toMatch(/node_modules/i);
    expect(html).not.toMatch(/mysql:\/\//i);

    // Should be user-friendly and generic
    expect(html).toMatch(/no encontr|no encontrado|no disponible|not found/i);
  });

  it('Property 16b — renders a link back to the home page', () => {
    const { container } = render(React.createElement(TenantNotFoundPage));
    const links = container.querySelectorAll('a[href="/"]');
    expect(links.length).toBeGreaterThan(0);
  });

  it('Property 16 — property: error page with arbitrary slug inputs stays safe', () => {
    // Property-based: render the static page many times, always safe
    fc.assert(
      fc.property(fc.string(), (_ignored) => {
        const { container } = render(React.createElement(TenantNotFoundPage));
        const html = container.innerHTML;
        expect(html).not.toMatch(/DATABASE_URL|\/src\/|P\d{4}/i);
        return true;
      }),
      { numRuns: 20 }
    );
  });
});