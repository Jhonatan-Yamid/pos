/**
 * Task 10.1 — Property test for error page data safety (Property 16)
 * Requirements: 10.2
 *
 * Validates: Requirements 10.2
 */
import { describe, it } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import TenantNotFoundPage from './page';

/**
 * Pattern that captures sensitive data that must NEVER appear in the error
 * page HTML:
 *   - DATABASE_URL       (connection string env-var name)
 *   - /src/ or \src\     (internal file-system paths)
 *   - "at word.(js|ts):N" (stack-trace frames)
 *   - P followed by 4 digits (Prisma error codes, e.g. P2002)
 */
const SENSITIVE_PATTERN = /DATABASE_URL|\/src\/|\\src\\|at \w+\.(js|ts):\d+|P\d{4}/i;

describe('TenantNotFoundPage — Property 16: Error page body contains no sensitive data', () => {
  it(
    'Property 16 — Feature: multi-tenant-architecture, Property 16: Error page body contains no sensitive data',
    () => {
      /*
       * The not-found-tenant page is a static component that accepts no props.
       * We generate arbitrary slug strings to simulate a caller passing any
       * kind of slug value (as would happen in a real request context).
       * Even if the component ignores the slug, this confirms no sensitive data
       * leaks regardless of the rendering context.
       */
      const slugArb = fc.oneof(
        // Valid slug format
        fc.stringMatching(/^[a-z0-9-]{2,63}$/),
        // Arbitrary unicode strings (adversarial input)
        fc.string({ minLength: 0, maxLength: 100 }),
        // Strings containing path separators or env-var names to probe for leaks
        fc.constantFrom(
          'DATABASE_URL',
          '/src/app',
          '\\src\\app',
          'at handler.js:42',
          'P2002',
          '',
          'a'.repeat(63),
        ),
      );

      fc.assert(
        fc.property(slugArb, (slug) => {
          /*
           * Render the component. The slug is available in the test scope but
           * not passed to the component because it accepts no props — this
           * mirrors how Next.js renders the page at runtime.
           */
          const { container } = render(<TenantNotFoundPage />);
          const html = container.innerHTML;

          // The rendered HTML must NOT contain any sensitive data pattern.
          const matched = html.match(SENSITIVE_PATTERN);
          if (matched) {
            throw new Error(
              `Sensitive data detected in error page HTML for slug "${slug}": matched "${matched[0]}"`,
            );
          }
        }),
        { numRuns: 200 },
      );
    },
  );
});
