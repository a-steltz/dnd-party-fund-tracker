/**
 * src/domain/ledger.ts
 * Ledger document types and core ledger operations (pure).
 *
 * V1 invariants:
 * - Ledger is append-only.
 * - Current balances are derived by replaying transactions.
 * - Only two transaction types exist: deposit and withdraw.
 * - No conversion/making change; withdraw cannot make any denomination negative.
 * - Domain code must not throw; errors are returned via Result.
 */

import { Denomination, ErrorCode, TransactionType } from '@/domain/enums';
import { addDenomVectors, DenomVector, isAllZero, makeZeroDenomVector, subtractDenomVectors, validateDenomVector } from '@/domain/money';
import { DomainError, Result, err, ok } from '@/domain/result';

/**
 * Supported ledger schema versions for V1.
 *
 * @remarks
 * V1.2 (schemaVersion=3) removes all persisted settings; behavior is hard-coded in the domain.
 */
export type SchemaVersion = 3;

/**
 * Ledger schema version constant for V1.
 */
export const SCHEMA_VERSION_V3: SchemaVersion = 3;

/**
 * A single append-only ledger transaction.
 *
 * @remarks
 * - `amounts` is always non-negative; direction is implied by `type`.
 * - In V1, withdrawals must not overdraft any denomination.
 */
export type Transaction = Readonly<{
    id: string;
    timestamp: string; // ISO-UTC string (caller supplied)
    type: TransactionType;
    amounts: DenomVector;
    note?: string;
    meta?: unknown;
}>;

/**
 * Root persisted ledger document stored in localStorage and exported/imported as JSON.
 *
 * @remarks
 * Balances are never stored; they are derived by replaying `transactions`.
 */
export type LedgerDocument = Readonly<{
    schemaVersion: SchemaVersion;
    createdAt: string; // ISO-UTC string (caller supplied)
    lastModifiedAt: string; // ISO-UTC string (caller supplied)
    transactions: readonly Transaction[];
}>;

/**
 * Creates a new, empty V1 ledger document.
 *
 * @param nowIsoUtc - ISO-UTC timestamp to use for createdAt/lastModifiedAt.
 */
export function createNewLedgerDocument(nowIsoUtc: string): LedgerDocument {
    return {
        schemaVersion: SCHEMA_VERSION_V3,
        createdAt: nowIsoUtc,
        lastModifiedAt: nowIsoUtc,
        transactions: []
    };
}

function compareTransactions(a: Transaction, b: Transaction): number {
    // ISO timestamps sort lexicographically in chronological order.
    if (a.timestamp < b.timestamp) return -1;
    if (a.timestamp > b.timestamp) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
}

/**
 * Computes the current balance by replaying transactions in timestamp order.
 *
 * @remarks
 * The ledger is append-only; balance must always be derived (never stored).
 *
 * @param transactions - List of transactions to replay.
 * @returns Derived denomination vector balance.
 */
export function computeBalance(transactions: readonly Transaction[]): DenomVector {
    // Assumes transactions have already been validated.
    const sorted = [...transactions].sort(compareTransactions);
    let balance = makeZeroDenomVector();
    for (const tx of sorted) {
        if (tx.type === TransactionType.Deposit) {
            balance = addDenomVectors(balance, tx.amounts);
        } else {
            // Valid ledgers never overdraw.
            const next = subtractDenomVectors(balance, tx.amounts);
            if (!next.ok) {
                // computeBalance is specified as total function in SPEC, so we treat invalid ledgers as zeroing.
                // Import/append validation must prevent reaching this state.
                return makeZeroDenomVector();
            }
            balance = next.value;
        }
    }
    return balance;
}

function validateTransaction(tx: Transaction): Result<Transaction, DomainError> {
    const validatedAmounts = validateDenomVector(tx.amounts);
    if (!validatedAmounts.ok) return validatedAmounts;

    if (isAllZero(tx.amounts)) {
        return err({ code: ErrorCode.ZERO_AMOUNT_TRANSACTION });
    }

    return ok(tx);
}

/**
 * Appends a transaction to the ledger after validating V1 rules.
 *
 * Validation rules:
 * - Amounts must be integers >= 0
 * - Reject all-zero transactions
 * - Withdrawals must not overdraft any denomination of the current derived balance
 *
 * @param ledger - Existing ledger document.
 * @param tx - Candidate transaction to append.
 * @returns Ok(updatedLedger) on success, otherwise a typed DomainError.
 */
export function appendTransaction(ledger: LedgerDocument, tx: Transaction): Result<LedgerDocument, DomainError> {
    const validatedTx = validateTransaction(tx);
    if (!validatedTx.ok) return validatedTx;

    const currentBalance = computeBalance(ledger.transactions);
    if (tx.type === TransactionType.Withdraw) {
        const check = subtractDenomVectors(currentBalance, tx.amounts);
        if (!check.ok) return check;
    } else if (tx.type !== TransactionType.Deposit) {
        // Defensive: TransactionType is an enum, but imports can create unknown values.
        return err({ code: ErrorCode.IMPORT_INVALID_SCHEMA, details: { field: 'type' } });
    }

    return ok({
        ...ledger,
        transactions: [...ledger.transactions, tx],
        lastModifiedAt: tx.timestamp
    });
}

/**
 * Returns a new ledger document with an updated lastModifiedAt timestamp.
 *
 * @remarks
 * This is used by import (replace-only) to stamp the document.
 */
export function withLastModifiedAt(ledger: LedgerDocument, nowIsoUtc: string): LedgerDocument {
    return { ...ledger, lastModifiedAt: nowIsoUtc };
}

/**
 * Validates a ledger object produced by import (unknown input).
 * This is intentionally strict for V1: import is replace-only and requires required fields.
 */
export function validateLedgerDocumentObject(value: unknown): Result<LedgerDocument, DomainError> {
    if (typeof value !== 'object' || value === null) {
        return err({ code: ErrorCode.IMPORT_INVALID_SCHEMA });
    }

    const record = value as Record<string, unknown>;

    const schemaVersion = record.schemaVersion;
    if (schemaVersion !== SCHEMA_VERSION_V3) {
        return err({
            code: ErrorCode.IMPORT_UNSUPPORTED_SCHEMA_VERSION,
            details: { schemaVersion }
        });
    }

    const createdAt = record.createdAt;
    const lastModifiedAt = record.lastModifiedAt;
    if (typeof createdAt !== 'string' || typeof lastModifiedAt !== 'string') {
        return err({ code: ErrorCode.IMPORT_INVALID_SCHEMA, details: { field: 'createdAt/lastModifiedAt' } });
    }

    // V1.2: Settings are not persisted; they are hard-coded in the domain.

    const transactionsValue = record.transactions;
    if (!Array.isArray(transactionsValue)) {
        return err({ code: ErrorCode.IMPORT_INVALID_SCHEMA, details: { field: 'transactions' } });
    }

    const transactions: Transaction[] = [];
    let balance = makeZeroDenomVector();

    // Validation invariants:
    // - Every tx has required fields and a valid DenomVector.
    // - No all-zero transactions.
    // - Withdraw never overdrafts the running balance (per denomination).
    for (const txValue of transactionsValue) {
        if (typeof txValue !== 'object' || txValue === null) {
            return err({ code: ErrorCode.IMPORT_INVALID_SCHEMA, details: { field: 'transactions[]' } });
        }
        const txRecord = txValue as Record<string, unknown>;

        const id = txRecord.id;
        const timestamp = txRecord.timestamp;
        const type = txRecord.type;
        const amounts = txRecord.amounts;

        if (typeof id !== 'string' || typeof timestamp !== 'string') {
            return err({ code: ErrorCode.IMPORT_INVALID_SCHEMA, details: { field: 'transactions[].id/timestamp' } });
        }
        if (type !== TransactionType.Deposit && type !== TransactionType.Withdraw) {
            return err({ code: ErrorCode.IMPORT_INVALID_SCHEMA, details: { field: 'transactions[].type' } });
        }
        if (typeof amounts !== 'object' || amounts === null) {
            return err({ code: ErrorCode.IMPORT_INVALID_SCHEMA, details: { field: 'transactions[].amounts' } });
        }

        // DenomVector: require all denominations to be present.
        const a = amounts as Record<string, unknown>;
        const txAmounts: DenomVector = {
            [Denomination.PP]: Number(a.pp),
            [Denomination.GP]: Number(a.gp),
            [Denomination.EP]: Number(a.ep),
            [Denomination.SP]: Number(a.sp),
            [Denomination.CP]: Number(a.cp)
        };

        const validated = validateTransaction({
            id,
            timestamp,
            type,
            amounts: txAmounts,
            note: typeof txRecord.note === 'string' ? txRecord.note : undefined,
            meta: txRecord.meta
        });
        if (!validated.ok) return validated;

        if (validated.value.type === TransactionType.Deposit) {
            balance = addDenomVectors(balance, validated.value.amounts);
        } else {
            const next = subtractDenomVectors(balance, validated.value.amounts);
            if (!next.ok) return next;
            balance = next.value;
        }

        transactions.push(validated.value);
    }

    return ok({
        schemaVersion: SCHEMA_VERSION_V3,
        createdAt,
        lastModifiedAt,
        transactions
    });
}
