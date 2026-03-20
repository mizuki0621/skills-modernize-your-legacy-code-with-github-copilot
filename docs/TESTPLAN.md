# Test Plan — Student Account Management System

**Application:** Student Account Management System (COBOL → Node.js migration)  
**Version:** 1.0  
**Date:** 2026-03-20  
**Purpose:** Validate the business logic of the current COBOL implementation and provide a baseline for equivalent Node.js unit and integration tests.

---

## Scope

This test plan covers all business logic implemented across the three COBOL source files:

- `src/cobol/main.cob` — menu routing and input validation
- `src/cobol/operations.cob` — account operations (view, credit, debit)
- `src/cobol/data.cob` — in-memory balance storage (read/write)

---

## Test Cases

| Test Case ID | Test Case Description | Pre-conditions | Test Steps | Expected Result | Actual Result | Status (Pass/Fail) | Comments |
|---|---|---|---|---|---|---|---|
| TC-001 | Initial balance on program start | Program has just been launched; no prior operations performed | 1. Start the application. 2. Select option **1** (View Balance). | Balance displayed is `1000.00`. | | | Default `STORAGE-BALANCE` is initialised to `1000.00` in `data.cob`. |
| TC-002 | View balance — displays current balance | Application is running; balance is at default `1000.00`. | 1. Select option **1** (View Balance). | Console output: `Current balance: 000001000.00` (or equivalent formatted value). | | | Validates the `TOTAL` operation path in `operations.cob` and the `READ` path in `data.cob`. |
| TC-003 | Credit account — valid positive amount | Application is running; balance is `1000.00`. | 1. Select option **2** (Credit Account). 2. Enter credit amount `500.00`. 3. Select option **1** (View Balance). | After credit: balance is `1500.00`. View Balance confirms `1500.00`. | | | Validates ADD logic and subsequent WRITE + READ round-trip. |
| TC-004 | Credit account — zero amount | Application is running; balance is `1000.00`. | 1. Select option **2** (Credit Account). 2. Enter credit amount `0.00`. | Balance remains `1000.00`. No error is displayed. | | | COBOL does not validate for zero; system adds `0.00`. Node.js implementation may choose to reject this. |
| TC-005 | Credit account — large amount within field limit | Application is running; balance is `0.00` (after full debit). | 1. Select option **2** (Credit Account). 2. Enter credit amount `999999.99`. | Balance becomes `999999.99`. | | | Tests upper boundary of `PIC 9(6)V99`. |
| TC-006 | Credit account — multiple sequential credits | Application is running; balance is `1000.00`. | 1. Credit `200.00`. 2. Credit `300.00`. 3. View Balance. | Balance is `1500.00`. | | | Verifies that each WRITE correctly persists the new balance for the next READ. |
| TC-007 | Debit account — valid amount less than balance | Application is running; balance is `1000.00`. | 1. Select option **3** (Debit Account). 2. Enter debit amount `200.00`. 3. Select option **1** (View Balance). | After debit: balance is `800.00`. View Balance confirms `800.00`. | | | Validates SUBTRACT logic and WRITE + READ round-trip. |
| TC-008 | Debit account — exact balance (debit equals balance) | Application is running; balance is `1000.00`. | 1. Select option **3** (Debit Account). 2. Enter debit amount `1000.00`. 3. Select option **1** (View Balance). | Debit is accepted. Balance becomes `0.00`. | | | Boundary condition: `FINAL-BALANCE >= AMOUNT` is `true` when equal. |
| TC-009 | Debit account — insufficient funds (amount exceeds balance) | Application is running; balance is `1000.00`. | 1. Select option **3** (Debit Account). 2. Enter debit amount `1500.00`. | Console output: `"Insufficient funds for this debit."` Balance remains `1000.00`. | | | Core overdraft-protection rule in `operations.cob`. |
| TC-010 | Debit account — zero amount | Application is running; balance is `1000.00`. | 1. Select option **3** (Debit Account). 2. Enter debit amount `0.00`. | Debit is accepted (`0.00 <= 1000.00`). Balance remains `1000.00`. | | | COBOL does not validate for zero debit. Node.js implementation may choose to reject this. |
| TC-011 | Debit account — balance is zero, attempt any debit | Application is running; perform enough debits to bring balance to `0.00`. | 1. Select option **3** (Debit Account). 2. Enter debit amount `0.01`. | Console output: `"Insufficient funds for this debit."` Balance remains `0.00`. | | | Ensures overdraft protection works at zero balance. |
| TC-012 | Balance persists between operations within a session | Application is running; balance is `1000.00`. | 1. Credit `250.00`. 2. Debit `100.00`. 3. View Balance. | Balance is `1150.00`. | | | Validates that `STORAGE-BALANCE` in `data.cob` correctly retains state across multiple CALL cycles. |
| TC-013 | Balance resets on program restart | A session ended with balance at `1500.00`. | 1. Restart the application. 2. Select option **1** (View Balance). | Balance is `1000.00` (default), not `1500.00`. | | | Session-only persistence rule: no disk storage. Critical migration note for Node.js (decide on persistence strategy). |
| TC-014 | Menu — invalid choice is rejected gracefully | Application is running. | 1. Enter `5` at the menu prompt. | Console output: `"Invalid choice, please select 1-4."` Menu is re-displayed. | | | Validates the `WHEN OTHER` branch in `main.cob`. |
| TC-015 | Menu — choice 4 exits the application | Application is running. | 1. Select option **4** (Exit). | Console output: `"Exiting the program. Goodbye!"` Program terminates. | | | Validates `CONTINUE-FLAG` is set to `NO` and the `PERFORM UNTIL` loop ends. |
| TC-016 | Menu — loops back after each valid operation | Application is running. | 1. Select option **1**. 2. Note menu is shown again. 3. Select option **2**, enter `100.00`. 4. Note menu is shown again. | Menu is re-displayed after every completed operation until option **4** is chosen. | | | Validates the `PERFORM UNTIL CONTINUE-FLAG = 'NO'` loop in `main.cob`. |
| TC-017 | DataProgram READ — returns current stored balance | `STORAGE-BALANCE` has been set to a known value (e.g., `750.00`) via a prior WRITE. | 1. Call `DataProgram` with operation code `READ` and a receiving variable. | Receiving variable contains `750.00`. | | | Unit-level test of the `data.cob` READ path. |
| TC-018 | DataProgram WRITE — stores updated balance | Initial `STORAGE-BALANCE` is `1000.00`. | 1. Call `DataProgram` with operation code `WRITE` and value `2000.00`. 2. Call `DataProgram` with operation code `READ`. | READ returns `2000.00`. | | | Unit-level test of the `data.cob` WRITE → READ round-trip. |
| TC-019 | Balance field overflow boundary | Application is running; current balance is `999999.98`. | 1. Credit `0.01`. 2. View Balance. | Balance is `999999.99` (maximum). | | | Tests the upper boundary of `PIC 9(6)V99`. Overflow behaviour beyond this value is undefined in COBOL; Node.js must guard against this. |
| TC-020 | Credit then debit in sequence — net zero change | Application is running; balance is `1000.00`. | 1. Credit `500.00`. 2. Debit `500.00`. 3. View Balance. | Balance is `1000.00`. | | | Ensures credit and debit operations are inverses and the balance round-trips correctly. |

---

## Out of Scope

The following are not covered by the current COBOL implementation and are therefore out of scope for this test plan. They should be considered for the Node.js implementation:

- Negative amount input (COBOL `PIC 9` fields cannot store negatives; the Node.js layer should validate and reject negative amounts)
- Decimal precision beyond two places
- Concurrent access / multi-user scenarios
- Persistent storage across program restarts (database, file I/O)
- Authentication and authorisation
- Audit logging of transactions

---

## Notes for Node.js Migration

- TC-004, TC-010: Decide whether the Node.js implementation should reject zero-value transactions.
- TC-013: The Node.js app must define a persistence strategy (database or file) to replace in-memory COBOL `WORKING-STORAGE`.
- TC-019: Enforce a maximum balance cap in the Node.js layer to prevent JavaScript floating-point or integer overflow.
- All negative-input cases should have explicit test coverage added to the Node.js test suite.
