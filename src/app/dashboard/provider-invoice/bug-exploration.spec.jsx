/**
 * Bug Condition Exploration Tests — Task 1
 *
 * IMPORTANT: These tests are EXPECTED TO FAIL on the unfixed code.
 * Failure = confirmation that the bug exists.
 *
 * Test 1.2 — Bug 1: ProviderInvoicePage renders p.name instead of
 *             p.description in the provider <option> elements.
 *
 * Validates: Requirements 1.1, 1.2, 1.3 (bugfix.md)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Module mocks (must be at module scope) ---

vi.mock('@/libs/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

// next/navigation is pulled in transitively by some UI components
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

// UI components — render as simple pass-through wrappers so we avoid
// any internal dependency issues while still testing the option text.
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

import { apiGet } from '@/libs/apiClient';
import ProviderInvoicePage from './page';

const MOCK_PROVIDERS = [
  { id: 1, name: 'Distribuidora XYZ', description: 'Carnes y embutidos' },
  { id: 2, name: 'Lácteos del Valle', description: null },
];

describe('Bug 1 — ProviderInvoicePage: option text shows description, not name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGet.mockResolvedValue(MOCK_PROVIDERS);
  });

  it('Test 1.2 — option text SHOULD be description (currently FAILS because component uses {p.name})', async () => {
    render(React.createElement(ProviderInvoicePage));

    // Wait for the providers to load (apiGet resolves async)
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      // options[0] is the placeholder "Selecciona un proveedor"
      // options[1] → provider id=1, options[2] → provider id=2
      expect(options.length).toBeGreaterThan(1);
    });

    const options = screen.getAllByRole('option');
    const providerOptions = options.filter(
      (o) => o.value === '1' || o.value === '2'
    );

    expect(providerOptions).toHaveLength(2);

    // isBugCondition_Bug1: textoMostrado(p) === p.name  (incorrect)
    // Expected (after fix): textoMostrado(p) === p.description || "sin descripción"
    //
    // Provider with id=1 has description "Carnes y embutidos" — option MUST show
    // "Carnes y embutidos", NOT "Distribuidora XYZ".
    // On unfixed code this assertion FAILS because the component renders {p.name}.
    const opt1 = providerOptions.find((o) => o.value === '1');
    expect(opt1.textContent).toBe('Carnes y embutidos');

    // Provider with id=2 has description null — option MUST show "sin descripción",
    // NOT "Lácteos del Valle".
    const opt2 = providerOptions.find((o) => o.value === '2');
    expect(opt2.textContent).toBe('sin descripción');
  });
});
