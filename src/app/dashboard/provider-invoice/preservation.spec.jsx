/**
 * Preservation Tests — Task 2
 *
 * These tests MUST PASS on the current UNFIXED code.
 * Passing confirms the baseline behaviors that must NOT regress after the fix.
 *
 * Test 2.1 — `value` del `<option>` no cambia (Property-Based)
 * Test 2.5 — Registro de factura correcto: providerId enviado en POST
 *
 * Validates: Requirements 3.1, 3.2 (bugfix.md)
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Module mocks ---

vi.mock('@/libs/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, type, disabled, onClick }) =>
    React.createElement('button', { type, disabled, onClick }, children),
  Input: ({ label, type, min, value, onChange, placeholder }) =>
    React.createElement('input', { 'aria-label': label, type, min, value, onChange, placeholder }),
  Textarea: ({ label, value, onChange, placeholder, rows }) =>
    React.createElement('textarea', { 'aria-label': label, value, onChange, placeholder, rows }),
  Select: ({ label, value, onChange, children }) =>
    React.createElement('select', { 'aria-label': label, value, onChange }, children),
  PageContainer: ({ children }) => React.createElement('div', null, children),
  PageHeader: ({ title }) => React.createElement('h1', null, title),
  Card: ({ children }) => React.createElement('div', null, children),
}));

import { apiGet, apiPost } from '@/libs/apiClient';
import ProviderInvoicePage from './page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * A set of providers covering every interesting description variant:
 * - non-empty string
 * - null
 * - empty string ""
 * - undefined (simulates a provider object where the key is missing)
 */
const PROVIDER_VARIANTS = [
  { id: 1, name: 'Distribuidora ABC',   description: 'Carnes y embutidos' },
  { id: 2, name: 'Lácteos del Valle',   description: null },
  { id: 3, name: 'Frutas Colombia',     description: '' },
  { id: 4, name: 'Bebidas del Sur',     description: undefined },
];

// ---------------------------------------------------------------------------
// Test 2.1 — `value` del <option> no cambia (Property-Based)
// ---------------------------------------------------------------------------

describe('Preservation 2.1 — <option> value is always p.id regardless of description', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 2.1 — option.value === String(p.id) for providers with any description variant', async () => {
    apiGet.mockResolvedValue(PROVIDER_VARIANTS);

    render(React.createElement(ProviderInvoicePage));

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      // At least the placeholder + 4 provider options
      expect(options.length).toBeGreaterThan(1);
    });

    const options = screen.getAllByRole('option');
    const providerOptions = options.filter((o) =>
      ['1', '2', '3', '4'].includes(o.value)
    );

    expect(providerOptions).toHaveLength(4);

    // Property: for every provider p, option.value === String(p.id)
    // This MUST hold regardless of what description contains.
    PROVIDER_VARIANTS.forEach((p) => {
      const opt = providerOptions.find((o) => o.value === String(p.id));
      expect(opt).toBeTruthy();
      expect(opt.value).toBe(String(p.id));
    });
  });

  it('Test 2.1b — option.value equals p.id for a single provider with non-null description', async () => {
    apiGet.mockResolvedValue([{ id: 99, name: 'Solo Provider', description: 'Descripción larga' }]);

    render(React.createElement(ProviderInvoicePage));

    await waitFor(() => {
      const opts = screen.getAllByRole('option');
      expect(opts.length).toBeGreaterThan(1);
    });

    const options = screen.getAllByRole('option');
    const provOpt = options.find((o) => o.value === '99');
    expect(provOpt).toBeTruthy();
    expect(provOpt.value).toBe('99');
  });
});

// ---------------------------------------------------------------------------
// Test 2.5 — Registro de factura: providerId en el payload POST
// ---------------------------------------------------------------------------

describe('Preservation 2.5 — providerId in POST payload is p.id (unaffected by display bug)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 2.5 — submitting the form sends providerId === p.id to /api/provider-movements', async () => {
    apiGet.mockResolvedValue([
      { id: 1, name: 'Distribuidora XYZ', description: 'Carnes y embutidos' },
      { id: 2, name: 'Lácteos del Valle', description: null },
    ]);
    apiPost.mockResolvedValue({ id: 100 });

    render(React.createElement(ProviderInvoicePage));

    // Wait for the provider options to load
    await waitFor(() => {
      const opts = screen.getAllByRole('option');
      expect(opts.length).toBeGreaterThan(1);
    });

    // Select provider id=1
    const selectEl = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(selectEl, { target: { value: '1' } });
    });

    // Fill in a valid amount
    const amountInput = screen.getByRole('spinbutton');
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: '150000' } });
    });

    // Submit the form
    const submitBtn = screen.getByRole('button', { name: /registrar factura/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Verify that apiPost was called with providerId: 1
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledTimes(1);
    });

    const [, payload] = apiPost.mock.calls[0];
    expect(payload).toMatchObject({ providerId: 1 });
    // Ensure accountNumber and other sensitive fields are not in the payload
    expect(payload).not.toHaveProperty('accountNumber');
  });
});
