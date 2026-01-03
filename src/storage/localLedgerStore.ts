/**
 * src/storage/localLedgerStore.ts
 * localStorage persistence for the full ledger document (V1).
 *
 * Storage layer rules:
 * - Performs load/save to localStorage only.
 * - Does not implement business rules; validation lives in the domain layer.
 */

import { ErrorCode } from '@/domain/enums';
import { LedgerDocument } from '@/domain/ledger';
import { DomainError, Result, err, ok } from '@/domain/result';

/**
 * localStorage key for the persisted ledger document JSON.
 */
export const LEDGER_STORAGE_KEY = 'dnd_party_fund_ledger_v2';

/**
 * localStorage key for the optional "last exported" timestamp.
 */
export const LAST_EXPORTED_AT_KEY = 'dnd_party_fund_lastExportedAt';

/**
 * Reads the raw ledger JSON string from localStorage.
 *
 * @remarks
 * - This is storage-only; schema validation happens in the domain layer.
 * - Returns Ok(null) when running server-side.
 */
export function loadLedgerJsonFromLocalStorage(): Result<string | null, DomainError> {
    if (typeof window === 'undefined') return ok(null);

    try {
        const raw = window.localStorage.getItem(LEDGER_STORAGE_KEY);
        return ok(raw);
    } catch {
        return err({ code: ErrorCode.IMPORT_PARSE_ERROR, details: { source: 'localStorage' } });
    }
}

/**
 * Writes the raw ledger JSON string to localStorage.
 *
 * @remarks
 * Returns Ok(undefined) when running server-side.
 */
export function saveLedgerJsonToLocalStorage(json: string): Result<void, DomainError> {
    if (typeof window === 'undefined') return ok(undefined);

    try {
        window.localStorage.setItem(LEDGER_STORAGE_KEY, json);
        return ok(undefined);
    } catch {
        return err({ code: ErrorCode.IMPORT_PARSE_ERROR, details: { source: 'localStorage' } });
    }
}

/**
 * Serializes and writes the ledger document to localStorage.
 *
 * @remarks
 * Any domain validation should have already occurred before calling this.
 */
export function saveLedgerToLocalStorage(ledger: LedgerDocument): Result<void, DomainError> {
    try {
        const json = JSON.stringify(ledger, null, 2);
        return saveLedgerJsonToLocalStorage(json);
    } catch {
        return err({ code: ErrorCode.IMPORT_PARSE_ERROR, details: { source: 'stringify' } });
    }
}

/**
 * Records a last-exported timestamp in localStorage.
 *
 * @remarks
 * This is informational metadata only.
 */
export function setLastExportedAt(nowIsoUtc: string): Result<void, DomainError> {
    if (typeof window === 'undefined') return ok(undefined);
    try {
        window.localStorage.setItem(LAST_EXPORTED_AT_KEY, nowIsoUtc);
        return ok(undefined);
    } catch {
        return err({ code: ErrorCode.IMPORT_PARSE_ERROR, details: { source: 'localStorage' } });
    }
}
