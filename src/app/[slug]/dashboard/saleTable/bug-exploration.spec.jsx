/**
 * Bug Condition Exploration Tests — Task 1
 *
 * IMPORTANT: These tests are EXPECTED TO FAIL on the unfixed code.
 * Failure = confirmation that the bug exists.
 *
 * Test 1.3 — Bug 2: "% Descuento" input is visible for employee role
 *             when isAboutToBePaid=true.
 *
 * Test 1.4 — Bug 2: "Total con descuento" summary is visible for employee
 *             role when discountPercentInput > 0 and isAboutToBePaid=true.
 *
 * Validates: Requirements 1.4, 1.5 (bugfix.md)
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Module mocks ----

// next-auth: employee session (image === null → ROLE_EMPLOYEE)

// next/navigation — mock useParams and useRouter for slug pages
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ slug: 'test-tenant' }),
  usePathname: () => '/test-tenant/dashboard/saleTable',
}));
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: { user: { name: 'Empleado Test', image: null } },
    status: 'authenticated',
  })),
}));

// next/link — render as plain <a>
vi.mock('next/link', () => ({
  default: ({ href, children }) => React.createElement('a', { href }, children),
}));

// react-icons — stub icons to avoid svg rendering issues
vi.mock('react-icons/fa', () => ({
  FaCashRegister: () => null,
  FaEdit: () => null,
  FaEye: () => null,
  FaTrashAlt: () => null,
  FaExchangeAlt: () => null,
  FaEyeSlash: () => null,
  FaShareAlt: () => null,
  FaPrint: () => null,
}));

// useTicketPrinter
vi.mock('@/hooks/useTicketPrinter', () => ({
  default: () => ({ printTicket: vi.fn() }),
}));

// useBusinessType — restaurant (default flow)
vi.mock('@/hooks/useBusinessType', () => ({
  default: () => ({ businessType: 'restaurant' }),
}));

// UI components
vi.mock('@/components/ui/Layout', () => ({
  PageContainer: ({ children }) => React.createElement('div', null, children),
}));
vi.mock('@/components/ui/Button', () => ({
  default: ({ children, onClick, disabled, variant, icon, className }) =>
    React.createElement('button', { onClick, disabled, className }, children),
}));
vi.mock('@/components/ui/Modal', () => ({
  default: ({ open, children, title }) =>
    open ? React.createElement('div', { 'data-testid': 'modal' }, children) : null,
}));

// saleService (used for ticket formatting)
vi.mock('@/services/saleService', () => ({
  formatTicketText: vi.fn(() => 'ticket'),
}));

// ---- Helpers ----

// A sale that is "en mesa" — triggers isAboutToBePaid = true when previewed
const SALE_EN_MESA = {
  id: 42,
  table: '5',
  status: 'en mesa',
  totalAmount: 30000,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  products: [],
  orderType: 'En mesa',
};

// Products returned by /api/sale/42
const SALE_PRODUCTS = [
  {
    id: 1,
    name: 'Hamburguesa',
    price: 15000,
    category: 'Platos',
    quantity: 2,
    observation: '',
    additions: [],
  },
];

/**
 * Sets up the global fetch mock so:
 *  - GET /api/sale?...  → returns [SALE_EN_MESA]
 *  - GET /api/sale/42   → returns { ...SALE_EN_MESA, products: SALE_PRODUCTS }
 */
function mockFetch() {
  global.fetch = vi.fn((url) => {
    const urlStr = typeof url === 'string' ? url : url.toString();

    if (urlStr.includes('/sale/42')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...SALE_EN_MESA, products: SALE_PRODUCTS }),
      });
    }

    if (urlStr.includes('/sale')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([SALE_EN_MESA]),
      });
    }

    // Default fallback
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });
}

// DailySales is imported dynamically inside each test to avoid Vite's static
// import-analysis phase choking on the JSX-in-.js file before esbuild runs.

describe('Bug 2 — DailySales: discount field and summary visible to employee role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch();
  });

  it('Test 1.3 — "% Descuento" input SHOULD NOT be visible for employee role (currently FAILS — no role guard)', async () => {
    const { default: DailySales } = await import('./page');
    render(React.createElement(DailySales));

    // Wait for today's sales to load and render
    await waitFor(() => {
      expect(screen.getByText(/Marcar como pagada/i)).toBeInTheDocument();
    });

    // Click "Marcar como pagada" to trigger handlePreview → opens modal
    // which renders the payment block with isAboutToBePaid=true
    const markPaidButton = screen.getByText(/Marcar como pagada/i);
    await act(async () => {
      fireEvent.click(markPaidButton);
    });

    // Wait for the modal to open with product data
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    // isBugCondition_Bug2: isAboutToBePaid === true AND userRole !== ROLE_ADMIN
    // AND "% Descuento" input IS in the DOM.
    //
    // The expected fix: "% Descuento" should NOT be in the DOM for an employee.
    // On unfixed code this assertion FAILS because there is no role guard.
    const discountLabel = screen.queryByText(/% Descuento/i);
    expect(discountLabel).not.toBeInTheDocument();
  });

  it('Test 1.4 — "Total con descuento" summary SHOULD NOT be visible for employee role (currently FAILS — no role guard)', async () => {
    const { default: DailySales } = await import('./page');
    render(React.createElement(DailySales));

    // Wait for today's sales list
    await waitFor(() => {
      expect(screen.getByText(/Marcar como pagada/i)).toBeInTheDocument();
    });

    // Open the payment preview modal
    const markPaidButton = screen.getByText(/Marcar como pagada/i);
    await act(async () => {
      fireEvent.click(markPaidButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    // At this point discountPercentInput is "0" by default (no discount visible
    // to employee), but on unfixed code the input field exists and is editable.
    // To trigger the "Total con descuento" summary we need discountPct > 0.
    // On unfixed code the input is rendered, so we can change its value.
    const discountInput = screen.queryByDisplayValue('0');

    if (discountInput) {
      // Input exists (bug is present) — set value to 10 to expose the summary
      await act(async () => {
        fireEvent.change(discountInput, { target: { value: '10' } });
      });

      // isBugCondition_Bug2: "Total con descuento" text visible for non-admin
      // Expected (after fix): NOT in DOM for employee role.
      // On unfixed code this FAILS because the <p> only guards discountPct > 0.
      const summary = screen.queryByText(/Total con descuento/i);
      expect(summary).not.toBeInTheDocument();
    } else {
      // If the discount input was NOT found, Bug 2 is already partially fixed
      // for the field — verify the summary is also absent.
      const summary = screen.queryByText(/Total con descuento/i);
      expect(summary).not.toBeInTheDocument();
    }
  });
});
