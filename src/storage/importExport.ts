/**
 * src/storage/importExport.ts
 * JSON import/export helpers for the ledger document (V1).
 *
 * Notes:
 * - Import is replace-only (no merge).
 * - Domain performs schema/business validation.
 * - This module provides browser-oriented helpers for reading files and downloading exports.
 */

import { ErrorCode } from '@/domain/enums';
import { LedgerDocument, validateLedgerDocumentObject } from '@/domain/ledger';
import { DomainError, Result, err, ok } from '@/domain/result';

/**
 * Serializes the ledger document to a pretty-printed JSON string.
 *
 * @param ledger - Ledger document to serialize.
 */
export function ledgerToJsonString(ledger: LedgerDocument): Result<string, DomainError> {
    try {
        return ok(JSON.stringify(ledger, null, 2));
    } catch {
        return err({ code: ErrorCode.IMPORT_PARSE_ERROR, details: { source: 'stringify' } });
    }
}

/**
 * Parses and validates an imported ledger JSON string.
 *
 * @remarks
 * Import is replace-only in V1; this validates the entire document and its transaction rules.
 *
 * @param json - Raw JSON string.
 */
export function parseLedgerFromJsonString(json: string): Result<LedgerDocument, DomainError> {
    try {
        const parsed = JSON.parse(json) as unknown;
        return validateLedgerDocumentObject(parsed);
    } catch {
        return err({ code: ErrorCode.IMPORT_PARSE_ERROR, details: { source: 'parse' } });
    }
}

/**
 * Reads a File as text using the browser File API.
 *
 * @param file - File chosen by the user.
 */
export async function readTextFile(file: File): Promise<Result<string, DomainError>> {
    try {
        const text = await file.text();
        return ok(text);
    } catch {
        return err({ code: ErrorCode.IMPORT_PARSE_ERROR, details: { source: 'file' } });
    }
}

/**
 * Triggers a client-side download of a JSON string.
 *
 * @param filename - Suggested download filename.
 * @param json - JSON content to download.
 */
export function downloadJson(filename: string, json: string): void {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();

    URL.revokeObjectURL(url);
}
