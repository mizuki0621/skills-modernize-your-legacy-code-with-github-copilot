'use strict';

/**
 * Unit tests for the Student Account Management System (src/accounting/index.js).
 *
 * Tests are mapped directly to the test cases defined in docs/TESTPLAN.md.
 * Each describe block corresponds to a logical module from the original COBOL:
 *   - DataProgram  (data.cob)       → dataRead / dataWrite / resetBalance
 *   - Operations core (operations.cob) → getBalance / creditAccount / debitAccount
 *   - Session behaviour             → persistence and restart rules
 */

const {
  dataRead,
  dataWrite,
  resetBalance,
  getBalance,
  creditAccount,
  debitAccount,
} = require('./index');

// Restore the default balance before every test to ensure full isolation.
beforeEach(() => {
  resetBalance();
});

// ── DataProgram (data.cob) ────────────────────────────────────────────────────

describe('DataProgram — dataRead / dataWrite', () => {
  test('TC-001: program starts with default balance of 1000.00', () => {
    expect(dataRead()).toBe(1000.00);
  });

  test('TC-017: dataRead returns the currently stored balance', () => {
    dataWrite(750.00);
    expect(dataRead()).toBe(750.00);
  });

  test('TC-018: dataWrite persists balance — subsequent READ returns written value', () => {
    dataWrite(2000.00);
    expect(dataRead()).toBe(2000.00);
  });
});

// ── getBalance (TOTAL operation) ──────────────────────────────────────────────

describe('getBalance — view balance (TOTAL)', () => {
  test('TC-002: returns current balance', () => {
    expect(getBalance()).toBe(1000.00);
  });

  test('TC-002: returns updated balance after a credit', () => {
    creditAccount(250.00);
    expect(getBalance()).toBe(1250.00);
  });
});

// ── creditAccount (CREDIT operation) ─────────────────────────────────────────

describe('creditAccount — credit account (CREDIT)', () => {
  test('TC-003: credit valid positive amount increases balance', () => {
    const result = creditAccount(500.00);
    expect(result.success).toBe(true);
    expect(result.balance).toBe(1500.00);
    expect(getBalance()).toBe(1500.00);
  });

  test('TC-004: credit of zero leaves balance unchanged', () => {
    const result = creditAccount(0.00);
    expect(result.success).toBe(true);
    expect(result.balance).toBe(1000.00);
  });

  test('TC-005: credit large amount up to field maximum (999999.99)', () => {
    dataWrite(0.00);
    const result = creditAccount(999999.99);
    expect(result.success).toBe(true);
    expect(result.balance).toBe(999999.99);
  });

  test('TC-006: multiple sequential credits are cumulative', () => {
    creditAccount(200.00);
    creditAccount(300.00);
    expect(getBalance()).toBe(1500.00);
  });

  test('invalid: NaN amount is rejected, balance unchanged', () => {
    const result = creditAccount(NaN);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid amount. Please enter a positive number.');
    expect(getBalance()).toBe(1000.00);
  });

  test('invalid: negative amount is rejected, balance unchanged', () => {
    const result = creditAccount(-100.00);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid amount. Please enter a positive number.');
    expect(getBalance()).toBe(1000.00);
  });
});

// ── debitAccount (DEBIT operation) ───────────────────────────────────────────

describe('debitAccount — debit account (DEBIT)', () => {
  test('TC-007: debit valid amount less than balance', () => {
    const result = debitAccount(200.00);
    expect(result.success).toBe(true);
    expect(result.balance).toBe(800.00);
    expect(getBalance()).toBe(800.00);
  });

  test('TC-008: debit exact balance — boundary condition (balance >= amount is true when equal)', () => {
    const result = debitAccount(1000.00);
    expect(result.success).toBe(true);
    expect(result.balance).toBe(0.00);
    expect(getBalance()).toBe(0.00);
  });

  test('TC-009: debit exceeds balance — overdraft protection rejects transaction', () => {
    const result = debitAccount(1500.00);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Insufficient funds for this debit.');
    expect(getBalance()).toBe(1000.00); // balance unchanged
  });

  test('TC-010: debit of zero is accepted, balance unchanged', () => {
    const result = debitAccount(0.00);
    expect(result.success).toBe(true);
    expect(result.balance).toBe(1000.00);
  });

  test('TC-011: debit from zero balance is blocked', () => {
    dataWrite(0.00);
    const result = debitAccount(0.01);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Insufficient funds for this debit.');
    expect(getBalance()).toBe(0.00);
  });

  test('TC-012: balance persists correctly across multiple mixed operations', () => {
    creditAccount(250.00);  // 1000 + 250 = 1250
    debitAccount(100.00);   // 1250 - 100 = 1150
    expect(getBalance()).toBe(1150.00);
  });

  test('TC-020: credit then equal debit returns to original balance (net-zero)', () => {
    creditAccount(500.00);  // 1500
    debitAccount(500.00);   // 1000
    expect(getBalance()).toBe(1000.00);
  });

  test('invalid: NaN amount is rejected, balance unchanged', () => {
    const result = debitAccount(NaN);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid amount. Please enter a positive number.');
    expect(getBalance()).toBe(1000.00);
  });

  test('invalid: negative amount is rejected, balance unchanged', () => {
    const result = debitAccount(-50.00);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid amount. Please enter a positive number.');
    expect(getBalance()).toBe(1000.00);
  });
});

// ── Session / persistence behaviour ──────────────────────────────────────────

describe('Session persistence', () => {
  test('TC-013: resetBalance restores default balance (mirrors program restart)', () => {
    creditAccount(500.00);
    expect(getBalance()).toBe(1500.00);
    resetBalance();
    expect(getBalance()).toBe(1000.00);
  });

  test('TC-019: upper boundary — balance at 999999.98 + 0.01 = 999999.99', () => {
    dataWrite(999999.98);
    const result = creditAccount(0.01);
    expect(result.success).toBe(true);
    expect(getBalance()).toBe(999999.99);
  });
});
