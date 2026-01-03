import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '@/domain/currency';
import { Denomination, ErrorCode, TransactionType } from '@/domain/enums';
import { appendTransaction, computeBalance, createNewLedgerDocument, validateLedgerDocumentObject } from '@/domain/ledger';
import { makeZeroDenomVector } from '@/domain/money';

/**
 * Domain unit tests for ledger replay and transaction validation rules.
 */
describe('domain/ledger', () => {
    it('computeBalance replays transactions in timestamp order with id tie-break', () => {
        const tx1 = {
            id: 'b',
            timestamp: '2020-01-01T00:00:00.000Z',
            type: TransactionType.Deposit,
            amounts: { ...makeZeroDenomVector(), [Denomination.GP]: 1 }
        };
        const tx2 = {
            id: 'a',
            timestamp: '2020-01-01T00:00:00.000Z',
            type: TransactionType.Deposit,
            amounts: { ...makeZeroDenomVector(), [Denomination.GP]: 2 }
        };

        const balance = computeBalance([tx1, tx2]);
        expect(balance[Denomination.GP]).toBe(3);
    });

    it('appendTransaction rejects all-zero transactions', () => {
        const ledger = createNewLedgerDocument('2020-01-01T00:00:00.000Z');
        const tx = {
            id: '1',
            timestamp: '2020-01-01T00:00:00.000Z',
            type: TransactionType.Deposit,
            amounts: makeZeroDenomVector()
        };

        const result = appendTransaction(ledger, tx);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe(ErrorCode.ZERO_AMOUNT_TRANSACTION);
        }
    });

    it('appendTransaction rejects withdrawals that exceed current balance per denomination', () => {
        const ledger = createNewLedgerDocument('2020-01-01T00:00:00.000Z');
        const withdraw = {
            id: 'w1',
            timestamp: '2020-01-02T00:00:00.000Z',
            type: TransactionType.Withdraw,
            amounts: { ...makeZeroDenomVector(), [Denomination.CP]: 1 }
        };

        const result = appendTransaction(ledger, withdraw);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe(ErrorCode.INSUFFICIENT_FUNDS_DENOM);
            expect(result.error.details).toEqual({ denom: Denomination.CP });
        }
    });

    it('validateLedgerDocumentObject validates imported ledgers and prevents overdraft', () => {
        const imported = {
            schemaVersion: 1,
            createdAt: '2020-01-01T00:00:00.000Z',
            lastModifiedAt: '2020-01-01T00:00:00.000Z',
            settings: DEFAULT_SETTINGS,
            transactions: [
                {
                    id: 'd1',
                    timestamp: '2020-01-01T00:00:00.000Z',
                    type: 'deposit',
                    amounts: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 1 }
                },
                {
                    id: 'w1',
                    timestamp: '2020-01-02T00:00:00.000Z',
                    type: 'withdraw',
                    amounts: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 2 }
                }
            ]
        };

        const result = validateLedgerDocumentObject(imported);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe(ErrorCode.INSUFFICIENT_FUNDS_DENOM);
        }
    });
});
