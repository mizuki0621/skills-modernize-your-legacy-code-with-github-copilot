'use strict';

/**
 * Student Account Management System
 *
 * Node.js port of the legacy COBOL application (main.cob, operations.cob, data.cob).
 * Preserves all original business logic, data flow, and menu structure.
 *
 * COBOL → Node.js mapping:
 *   DataProgram  (data.cob)       → dataRead() / dataWrite() / resetBalance()
 *   Operations   (operations.cob) → getBalance() / creditAccount() / debitAccount() / operations()
 *   MainProgram  (main.cob)       → mainProgram()
 */

const readlineSync = require('readline-sync');

// ── DataProgram (data.cob) ───────────────────────────────────────────────────
// Mirrors: STORAGE-BALANCE PIC 9(6)V99 VALUE 1000.00
// Session-only in-memory store — no disk persistence (matches COBOL behaviour).
const DEFAULT_BALANCE = 1000.00;
let storageBalance = DEFAULT_BALANCE;

/**
 * Read the current stored balance.
 * Mirrors: CALL 'DataProgram' USING 'READ', FINAL-BALANCE
 * @returns {number}
 */
function dataRead() {
  return storageBalance;
}

/**
 * Persist an updated balance to in-memory storage.
 * Mirrors: CALL 'DataProgram' USING 'WRITE', FINAL-BALANCE
 * @param {number} balance
 */
function dataWrite(balance) {
  storageBalance = parseFloat(balance.toFixed(2));
}

/**
 * Reset balance to the default starting value.
 * Used for test isolation — mirrors program restart behaviour (TC-013).
 */
function resetBalance() {
  storageBalance = DEFAULT_BALANCE;
}

// ── Pure business logic (testable, no I/O) ───────────────────────────────────

/**
 * Return the current account balance.
 * Mirrors: CALL 'Operations' USING 'TOTAL ' → CALL 'DataProgram' USING 'READ'
 * @returns {number}
 */
function getBalance() {
  return dataRead();
}

/**
 * Credit the account by the given amount.
 * Mirrors credit branch of operations.cob.
 * @param {number} amount
 * @returns {{ success: boolean, balance?: number, message: string }}
 */
function creditAccount(amount) {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    return { success: false, message: 'Invalid amount. Please enter a positive number.' };
  }
  let balance = dataRead();
  balance = parseFloat((balance + amount).toFixed(2));
  dataWrite(balance);
  return { success: true, balance, message: `Amount credited. New balance: ${balance.toFixed(2)}` };
}

/**
 * Debit the account by the given amount.
 * Business rule: debit is only processed when balance >= amount.
 * Mirrors: IF FINAL-BALANCE >= AMOUNT ... ELSE DISPLAY "Insufficient funds"
 * @param {number} amount
 * @returns {{ success: boolean, balance?: number, message: string }}
 */
function debitAccount(amount) {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    return { success: false, message: 'Invalid amount. Please enter a positive number.' };
  }
  let balance = dataRead();
  if (balance >= amount) {
    balance = parseFloat((balance - amount).toFixed(2));
    dataWrite(balance);
    return { success: true, balance, message: `Amount debited. New balance: ${balance.toFixed(2)}` };
  }
  return { success: false, balance, message: 'Insufficient funds for this debit.' };
}

// ── Operations (operations.cob) — interactive I/O layer ─────────────────────

/**
 * Execute an account operation (with user prompts).
 * Delegates business logic to the pure functions above.
 * Mirrors the PROCEDURE DIVISION of operations.cob.
 * @param {'TOTAL'|'CREDIT'|'DEBIT'} operationType
 */
function operations(operationType) {
  if (operationType === 'TOTAL') {
    const balance = getBalance();
    console.log(`Current balance: ${balance.toFixed(2)}`);

  } else if (operationType === 'CREDIT') {
    const input = readlineSync.question('Enter credit amount: ');
    const result = creditAccount(parseFloat(input));
    console.log(result.message);

  } else if (operationType === 'DEBIT') {
    const input = readlineSync.question('Enter debit amount: ');
    const result = debitAccount(parseFloat(input));
    console.log(result.message);
  }
}

// ── MainProgram (main.cob) ───────────────────────────────────────────────────

/**
 * Entry point — presents the interactive menu and routes user input.
 * Mirrors the PERFORM UNTIL CONTINUE-FLAG = 'NO' loop in main.cob.
 */
function mainProgram() {
  let continueFlag = true; // mirrors: CONTINUE-FLAG PIC X(3) VALUE 'YES'

  while (continueFlag) {
    console.log('--------------------------------');
    console.log('Account Management System');
    console.log('1. View Balance');
    console.log('2. Credit Account');
    console.log('3. Debit Account');
    console.log('4. Exit');
    console.log('--------------------------------');

    const choice = readlineSync.question('Enter your choice (1-4): ');

    switch (choice.trim()) {
      case '1':
        operations('TOTAL');
        break;
      case '2':
        operations('CREDIT');
        break;
      case '3':
        operations('DEBIT');
        break;
      case '4':
        continueFlag = false; // mirrors: MOVE 'NO' TO CONTINUE-FLAG
        break;
      default:
        // Mirrors: WHEN OTHER DISPLAY "Invalid choice, please select 1-4."
        console.log('Invalid choice, please select 1-4.');
    }
  }

  console.log('Exiting the program. Goodbye!');
}

// Export pure functions for unit testing.
module.exports = { dataRead, dataWrite, resetBalance, getBalance, creditAccount, debitAccount };

// Only start the interactive program when run directly (not when required by tests).
if (require.main === module) {
  mainProgram();
}
