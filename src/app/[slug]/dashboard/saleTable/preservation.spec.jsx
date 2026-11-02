/**
 * Preservation Tests — Task 2
 *
 * These tests MUST PASS on the current UNFIXED code.
 * Passing confirms the baseline behaviors that must NOT regress after the fix.
 *
 * Test 2.2 — Admin sigue viendo el campo "% Descuento"
 * Test 2.3 — Cálculo del total sin cambios para no-admin (discountPercentInput="0")
 * Test 2.4 — Tipo de pago visible para todos los roles
 *
 * Validates: Requirements 3.4, 3.5, 3.6 (bugfix.md)
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Module mocks (hoisted) ----

// Mutable ref so individual tests can flip between admin / employee sessions.
const mockUseSession = vi.fn();


// next/navigation — mock useParams and useRouter for slug pages
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ slug: 'test-tenant' }),
  usePathname: () => '/test-tenant/dashboard/saleTable',
}));
vi.mock('next-auth/react', () => ({
  useSession: mockUseSession,
}));

vi.mock('next/link', () => ({
  default: ({ href, children }) => React.createElement('a', { href }, children),
}));

vi.mock('react-icons/fa', () => ({
  FaCashRegister: () => null,
  FaEdit:         () => null,
  FaEye:          () => null,
  FaTrashAlt:     () => null,
  FaExchangeAlt:  () => null,
  FaEyeSlash:     () => null,
  FaShareAlt:     () => null,
  FaPrint:        () => null,
}));

vi.mock('@/hooks/useTicketPrinter', () => ({
  default: () => ({ printTicket: vi.fn() }),
}));

vi.mock('@/hooks/useBusinessType', () => ({
  default: () => ({ businessType: 'restaurant' }),
}));

vi.mock('@/components/ui/Layout', () => ({
  PageContainer: ({ children }) => React.createElement('div', null, children),
}));

vi.mock('@/components/ui/Button', () => ({
  default: ({ children, onClick, disabled, type }) =>
    React.createElement('button', { onClick, disabled, type }, children),
}));

vi.mock('@/components/ui/Modal', () => ({
  default: ({ open, children }) =>
    open ? React.createElement('div', { 'data-testid': 'modal' }, children) : null,
}));

vi.mock('@/services/saleService', () => ({
  formatTicketText: vi.fn(() => 'ticket'),
}));

// ---- Session helpers ----
// ROLE_ADMIN: session.user.image === 1
// ROLE_EMPLOYEE: session.user.image === null

const ADMIN_SESSION    = { data: { user: { name: 'Admin Test',    image: 1    } }, status: 'authenticated' };
const EMPLOYEE_SESSION = { data: { user: { name: 'Empleado Test', image: null } }, status: 'authenticated' };

// ---- Data fixtures ----

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

// ---- Fetch mock ----

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
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  });
}

// ---- Helper: open the payment modal ----

async function openPaymentModal() {
  await waitFor(() => {
    expect(screen.getByText(/Marcar como pagada/i)).toBeInTheDocument();
  });

  const markPaidButton = screen.getByText(/Marcar como pagada/i);
  await act(async () => {
    fireEvent.click(markPaidButton);
  });

  await waitFor(() => {
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });
}

// DailySales is imported lazily inside each test so the session mock is
// already set before the component renders (same pattern as the exploration spec).

// ===========================================================================
// Test 2.2 — Admin always sees the "% Descuento" field
// ===========================================================================

describe('Preservation 2.2 — Admin always sees the "% Descuento" field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch();
  });

  it('Test 2.2 — "% Descuento" input IS in the DOM for admin role (isAboutToBePaid=true)', async () => {
    mockUseSession.mockReturnValue(ADMIN_SESSION);

    const { default: DailySales } = await import('./page');
    render(React.createElement(DailySales));

    await openPaymentModal();

    // Admin MUST see the discount label — no role guard on unfixed code.
    const discountLabel = screen.queryByText(/% Descuento/i);
    expect(discountLabel).toBeInTheDocument();
  });
});

// ===========================================================================
// Test 2.3 — finalTotal equals subtotal when discountPercentInput is "0" for non-admin
// ===========================================================================

describe('Preservation 2.3 — finalTotal equals subtotal when discountPercentInput is "0" for non-admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch();
  });

  it('Test 2.3 — subtotal is shown and no discount summary appears for employee with default input', async () => {
    mockUseSession.mockReturnValue(EMPLOYEE_SESSION);

    const { default: DailySales } = await import('./page');
    render(React.createElement(DailySales));

    await openPaymentModal();

    // Subtotal: 15000 × 2 = 30000. The component shows "Subtotal: $30.000" (es-CL).
    const subtotalEl = screen.getByText(/Subtotal/i);
    expect(subtotalEl).toBeInTheDocument();
    expect(subtotalEl.textContent).toMatch(/30/);

    // With discountPercentInput="0" (default), discountPct=0, so the
    // "Total con descuento" conditional block (discountPct > 0) never fires.
    // This passes on unfixed code because the guard is only about the value, not the role.
    const discountSummary = screen.queryByText(/Total con descuento/i);
    expect(discountSummary).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Test 2.4 — Payment type selector visible to all roles
// ===========================================================================

describe('Preservation 2.4 — Payment type selector is visible to all roles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch();
  });

  it('Test 2.4 — payment type options (efectivo/transferencia/mixto) are present for employee role', async () => {
    mockUseSession.mockReturnValue(EMPLOYEE_SESSION);

    const { default: DailySales } = await import('./page');
    render(React.createElement(DailySales));

    await openPaymentModal();

    // The <select> for payment type has no role guard — must be present for employees.
    expect(screen.queryByRole('option', { name: /Efectivo/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Transferencia/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Mixto/i })).toBeInTheDocument();
  });

  it('Test 2.4b — "Tipo de pago" label is present for employee role', async () => {
    mockUseSession.mockReturnValue(EMPLOYEE_SESSION);

    const { default: DailySales } = await import('./page');
    render(React.createElement(DailySales));

    await openPaymentModal();

    expect(screen.queryByText(/Tipo de pago/i)).toBeInTheDocument();
  });
});
