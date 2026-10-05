/**
 * Bug Condition Exploration Tests — Task 1
 *
 * IMPORTANT: These tests are EXPECTED TO FAIL on the unfixed code.
 * Failure = confirmation that the bug exists.
 *
 * Test 1.1 — Bug 1: GET /api/providers?minimal=1 response omits `description`
 *
 * Validates: Requirements 1.1, 1.2, 1.3 (bugfix.md)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

vi.mock('@/libs/db', () => ({
  default: {
    provider: {
      findMany: vi.fn(),
    },
  },
}));

import db from '@/libs/db';

describe('Bug 1 — Endpoint projection: GET /api/providers?minimal=1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1.1 — response SHOULD include description field (currently FAILS because it is omitted)', async () => {
    // Arrange: db returns providers WITH description, as the fixed code projects
    // them using select: { id: true, name: true, description: true }.
    // The assertion verifies the endpoint projection now includes description.
    db.provider.findMany.mockResolvedValue([
      { id: 1, name: 'Distribuidora XYZ', description: 'Carnes y embutidos' },
      { id: 2, name: 'Lácteos del Valle', description: null },
    ]);

    const request = new Request('http://localhost/api/providers?minimal=1');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);

    // BUG CONDITION: the current code does NOT include description in the
    // select projection, so description is never returned. This assertion
    // WILL FAIL on unfixed code, confirming the bug.
    // isBugCondition_Bug1: endpoint returns { id, name } without description
    expect(body[0]).toHaveProperty('description');
    expect(body[1]).toHaveProperty('description');
  });
});
