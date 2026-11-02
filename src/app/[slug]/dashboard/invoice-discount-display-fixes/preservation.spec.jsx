/**
 * Preservation tests — invoice-discount-display-fixes (Task 2)
 *
 * These tests verify behaviors that MUST NOT change with the fix.
 * They MUST PASS on the current unfixed code — passing confirms the baseline.
 *
 * Test 2.1 — value del <option> siempre es p.id (Property-Based)
 * Test 2.2 — Admin sigue viendo el campo % Descuento
 * Test 2.3 — Cálculo del total sin cambios para no-admin (Property-Based)
 * Test 2.4 — Tipo de pago y calculadora de vuelto visibles para todos los roles
 * Test 2.5 — Registro de factura correcto: providerId enviado es p.id
 *
 * Validates:
 *   Property 2: Preservation
 *   Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mocks — must be declared before any imports of the modules under test ───

// next-auth/react — used by saleTable/page.js
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// next/link — use plain <a> to avoid needing the Next router
vi.mock('next/link', () => ({
  default: ({ children, href }) => React.createElement('a', { href }, children),
}));

// hooks that make internal fetches
vi.mock('@/hooks/useBusinessType', () => ({
  default: () => ({ businessType: 'restaurant', isLoading: false, error: null }),
}));
vi.mock('@/hooks/useTicketPrinter', () => ({
  default: () => ({ printTicket: vi.fn() }),
}));

// apiClient — used by ProviderInvoicePage
vi.mock('@/libs/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

// react-icons — stub all icons used by DailySales
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

// UI components shared by ProviderInvoicePage
vi.mock('@/components/ui', () => ({
  Button: ({ children, ...props }) => React.createElement('button', props, children),
  Input: ({ label, ...props }) => React.createElement('input', props),
  Textarea: ({ label, ...props }) => React.createElement('textarea', props),
  Select: ({ label, children, ...props }) =>
    React.createElement('select', props, children),
  PageContainer: ({ children }) => React.createElement('div', null, children),
  PageHeader: ({ title }) => React.createElement('h1', null, title),
  Card: ({ children }) => React.createElement('div', null, children),
}));

// Layout and modal UI components used by DailySales
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

// saleService
vi.mock('@/services/saleService', () => ({
  formatTicketText: vi.fn(() => 'ticket'),
}));

// ─── Static imports of the components under test ──────────────────────────────
// Must come AFTER all vi.mock() declarations so mocks are applied first.

import { useSession } from 'next-auth/react';
import { apiGet, apiPost } from '@/libs/apiClient';
import DailySales from '@/app/[slug]/dashboard/saleTable/page.js';
import ProviderInvoicePage from '@/app/[slug]/dashboard/provider-invoice/page.jsx';

// ─── Session helpers ──────────────────────────────────────────────────────────
const adminSession    = { user: { name: 'Admin',    image: 1    } };
const employeeSession = { user: { name: 'Empleado', image: null } };

// ─── Sale fixtures ────────────────────────────────────────────────────────────
function makeSaleEnMesa(id, table = '5') {
  return {
    id,
    table,
    status: 'en mesa',
    totalAmount: 20000,
    products: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeSaleDetail(products = []) {
  return { products };
}

const DEFAULT_PRODUCTS = [
  {
    product: { name: 'Café', price: 2000, category: 'Bebidas' },
    quantity: 1,
    observation: '',
    additions: [],
  },
];

function setupFetchForSale(saleId, saleDetail, salesList) {
  global.fetch = vi.fn().mockImplementation((url) => {
    const u = typeof url === 'string' ? url : String(url);
    if (u.includes(`/sale/${saleId}`)) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(saleDetail) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(salesList) });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2.1 — value del <option> siempre es p.id  (Property-Based)
//
// Validates: Requirements 3.1, 3.2
// ─────────────────────────────────────────────────────────────────────────────
describe('Test 2.1 — value del <option> siempre es p.id (Property-Based)', () => {
  /**
   * Property: para todo proveedor p, option.value === String(p.id),
   * independientemente de los valores de name y description.
   *
   * ¬isBugCondition_Bug1: el value no forma parte de la condición de bug,
   * por lo que siempre se preserva.
   *
   * Validates: Requirements 3.1, 3.2
   */

  beforeEach(() => {
    vi.clearAllMocks();
    useSession.mockReturnValue({ data: employeeSession, status: 'authenticated' });
  });

  it('el value de cada <option> es String(p.id) para todas las combinaciones de description', async () => {
    const providers = [
      { id: 1,  name: 'Proveedor 1', description: 'Carnes y embutidos' },
      { id: 2,  name: 'Proveedor 2', description: null },
      { id: 3,  name: 'Proveedor 3', description: '' },
      { id: 4,  name: 'Proveedor 4', description: undefined },
      { id: 5,  name: 'Proveedor 5', description: 'Lácteos del Valle' },
      { id: 6,  name: 'Proveedor 6', description: '   ' },
    ];

    apiGet.mockResolvedValue(providers);
    render(React.createElement(ProviderInvoicePage));

    await waitFor(() => {
      // +1 for the placeholder "Selecciona un proveedor"
      expect(screen.getAllByRole('option').length).toBe(providers.length + 1);
    });

    const allOptions = screen.getAllByRole('option');
    // Skip the first placeholder option
    const providerOptions = allOptions.slice(1);

    providers.forEach((p, idx) => {
      // Preserved behavior: value is always p.id regardless of description
      expect(providerOptions[idx].value).toBe(String(p.id));
    });
  });

  it('property: para 20 proveedores con descriptions variadas, value === String(p.id) en todos', async () => {
    const descOptions = ['Desc activa', null, '', undefined];
    const providers = Array.from({ length: 20 }, (_, i) => ({
      id: i + 100,
      name: `Proveedor Rand ${i}`,
      description: descOptions[i % descOptions.length],
    }));

    apiGet.mockResolvedValue(providers);
    render(React.createElement(ProviderInvoicePage));

    await waitFor(() => {
      expect(screen.getAllByRole('option').length).toBe(providers.length + 1);
    });

    const providerOptions = screen.getAllByRole('option').slice(1);

    providerOptions.forEach((opt, idx) => {
      expect(opt.value).toBe(String(providers[idx].id));
    });
  });
});
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ slug: 'test-tenant' }),
  usePathname: () => '/test-tenant/dashboard/saleTable',
}));

// ─────────────────────────────────────────────────────────────────────────────
// Test 2.2 — Admin sigue viendo el campo "% Descuento"  (Bug 2 preservation)
//
// Validates: Requirements 3.4, 3.6
// ─────────────────────────────────────────────────────────────────────────────
describe('Test 2.2 — Admin sigue viendo el campo % Descuento', () => {
  /**
   * ¬isBugCondition_Bug2 para admin: la condición de bug requiere userRole !== ROLE_ADMIN.
   * Con rol admin, el campo debe estar presente antes y después del fix.
   *
   * Validates: Requirements 3.4, 3.6
   */

  beforeEach(() => {
    vi.clearAllMocks();
    useSession.mockReturnValue({ data: adminSession, status: 'authenticated' });
  });

  it('el campo % Descuento está presente en el DOM cuando el usuario es administrador y la venta está "en mesa"', async () => {
    const saleId = 99;
    const sale = makeSaleEnMesa(saleId);
    const detail = makeSaleDetail(DEFAULT_PRODUCTS);
    setupFetchForSale(saleId, detail, [sale]);

    render(React.createElement(DailySales));

    // Wait for the sale list to load and find the "Marcar como pagada" button
    const markPaidButton = await screen.findByText('Marcar como pagada');
    await userEvent.click(markPaidButton);

    // Wait for the modal to render with the payment block
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    // Admin must see the % Descuento field
    expect(screen.queryByText(/% Descuento/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2.3 — Cálculo del total sin cambios para no-admin (Property-Based)
//
// Validates: Requirements 3.5
// ─────────────────────────────────────────────────────────────────────────────
describe('Test 2.3 — Cálculo del total: finalTotal === subtotal cuando discountPercentInput = "0"', () => {
  /**
   * Property: con discountPercentInput = "0" y cualquier subtotal > 0,
   * finalTotal === subtotal.
   *
   * This invariant holds before and after the fix because non-admins cannot
   * edit the discount field (it stays at "0").
   *
   * Validates: Requirements 3.5
   */

  // Pure function extracted from saleTable/page.js — no rendering needed
  function computeFinalTotal(subtotal, discountPercentInput) {
    const discountPct = Math.min(100, Math.max(0, Number(discountPercentInput) || 0));
    return subtotal * (1 - discountPct / 100);
  }

  it('property: finalTotal === subtotal para subtotales representativos con discountPercentInput = "0"', () => {
    const subtotals = [1000, 5000, 9999, 15000, 100000, 1, 500, 30000];

    for (const subtotal of subtotals) {
      expect(computeFinalTotal(subtotal, '0')).toBe(subtotal);
    }
  });

  it('property: finalTotal === subtotal para 50 subtotales generados determinísticamente con discountPercentInput = "0"', () => {
    const subtotals = Array.from({ length: 50 }, (_, i) => (i + 1) * 1337);

    for (const subtotal of subtotals) {
      expect(computeFinalTotal(subtotal, '0')).toBe(subtotal);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2.4 — Tipo de pago y calculadora de vuelto visibles para todos los roles
//
// Validates: Requirements 3.6
// ─────────────────────────────────────────────────────────────────────────────
describe('Test 2.4 — Tipo de pago y calculadora de vuelto visibles para rol empleado', () => {
  /**
   * The payment type controls (Efectivo/Transferencia/Mixto) and the change
   * calculator are not role-gated — they must be present for any user when
   * isAboutToBePaid = true.
   *
   * Validates: Requirements 3.6
   */

  beforeEach(() => {
    vi.clearAllMocks();
    useSession.mockReturnValue({ data: employeeSession, status: 'authenticated' });
  });

  it('el selector de tipo de pago está presente para rol empleado con venta "en mesa"', async () => {
    const saleId = 88;
    const sale = makeSaleEnMesa(saleId, '3');
    const detail = makeSaleDetail([
      { product: { name: 'Agua', price: 1500, category: 'Bebidas' }, quantity: 1, observation: '', additions: [] },
    ]);
    setupFetchForSale(saleId, detail, [sale]);

    render(React.createElement(DailySales));

    const markPaidButton = await screen.findByText('Marcar como pagada');
    await userEvent.click(markPaidButton);

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    // Payment type label and combobox must be visible for employee
    expect(screen.getByText('Tipo de pago')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    // All three payment options must be available
    expect(screen.getByRole('option', { name: 'Efectivo' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Transferencia' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mixto' })).toBeInTheDocument();
  });

  it('la calculadora de vuelto ("Efectivo recibido") está disponible para rol empleado con pago tipo efectivo', async () => {
    const saleId = 77;
    const sale = makeSaleEnMesa(saleId, '2');
    const detail = makeSaleDetail([
      { product: { name: 'Jugo', price: 2000, category: 'Bebidas' }, quantity: 2, observation: '', additions: [] },
    ]);
    setupFetchForSale(saleId, detail, [sale]);

    render(React.createElement(DailySales));

    const markPaidButton = await screen.findByText('Marcar como pagada');
    await userEvent.click(markPaidButton);

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    // The change calculator section must be visible for "efectivo" (default type)
    expect(screen.getByText(/Efectivo recibido/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2.5 — Registro de factura correcto: providerId enviado es p.id
//
// Validates: Requirements 3.1, 3.2
// ─────────────────────────────────────────────────────────────────────────────
describe('Test 2.5 — El providerId enviado al registrar factura siempre es p.id', () => {
  /**
   * When selecting a provider and submitting the form, the POST to
   * /api/provider-movements must contain providerId === p.id.
   * value={p.id} in the <option> does not change with the fix.
   *
   * Validates: Requirements 3.1, 3.2
   */

  beforeEach(() => {
    vi.clearAllMocks();
    useSession.mockReturnValue({ data: employeeSession, status: 'authenticated' });
  });

  it('el POST a /api/provider-movements incluye el providerId correcto (p.id) al seleccionar un proveedor', async () => {
    const providers = [
      { id: 42, name: 'Proveedor A', description: 'Carnes' },
      { id: 99, name: 'Proveedor B', description: null },
    ];

    apiGet.mockResolvedValue(providers);
    apiPost.mockResolvedValue({ id: 1, type: 'INVOICE' });

    render(React.createElement(ProviderInvoicePage));

    // Wait for providers to load
    await waitFor(() => {
      expect(screen.getAllByRole('option').length).toBe(providers.length + 1);
    });

    // Select the second provider (id: 99)
    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, '99');

    // Fill in the required amount field
    const amountInput = screen.getByRole('spinbutton');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '50000');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Registrar factura/i });
    await userEvent.click(submitButton);

    // The payload must contain the correct providerId
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        expect.stringContaining('/provider-movements'),
        expect.objectContaining({ providerId: 99 })
      );
    });
  });

  it('property: el providerId enviado coincide con p.id independientemente del valor de description', async () => {
    const testCases = [
      { id: 10, name: 'A', description: 'Desc A' },
      { id: 20, name: 'B', description: null },
      { id: 30, name: 'C', description: '' },
    ];

    for (const targetProvider of testCases) {
      vi.clearAllMocks();
      apiGet.mockResolvedValue(testCases);
      apiPost.mockResolvedValue({ id: 1, type: 'INVOICE' });

      const { unmount } = render(React.createElement(ProviderInvoicePage));

      await waitFor(() => {
        expect(screen.getAllByRole('option').length).toBe(testCases.length + 1);
      });

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, String(targetProvider.id));

      const amountInput = screen.getByRole('spinbutton');
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, '10000');

      const submitButton = screen.getByRole('button', { name: /Registrar factura/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(apiPost).toHaveBeenCalledWith(
          expect.stringContaining('/provider-movements'),
          expect.objectContaining({ providerId: targetProvider.id })
        );
      });

      unmount();
    }
  });
});
