import { describe, expect, it } from 'vitest';

import { Denomination, ErrorCode } from '@/domain/enums';
import { addDenomVectors, makeZeroDenomVector, subtractDenomVectors, totalCp } from '@/domain/money';

/**
 * Domain unit tests for denomination math helpers.
 *
 * @remarks
 * These tests intentionally do not involve any UI or storage.
 */
describe('domain/money', () => {
    it('adds denom vectors per denomination', () => {
        const a = { ...makeZeroDenomVector(), [Denomination.GP]: 2, [Denomination.CP]: 5 };
        const b = { ...makeZeroDenomVector(), [Denomination.GP]: 1, [Denomination.SP]: 3 };

        expect(addDenomVectors(a, b)).toEqual({
            ...makeZeroDenomVector(),
            [Denomination.GP]: 3,
            [Denomination.SP]: 3,
            [Denomination.CP]: 5
        });
    });

    it('subtracts denom vectors when non-negative', () => {
        const a = { ...makeZeroDenomVector(), [Denomination.EP]: 2, [Denomination.CP]: 10 };
        const b = { ...makeZeroDenomVector(), [Denomination.EP]: 1, [Denomination.CP]: 4 };

        const result = subtractDenomVectors(a, b);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value).toEqual({
                ...makeZeroDenomVector(),
                [Denomination.EP]: 1,
                [Denomination.CP]: 6
            });
        }
    });

    it('rejects subtraction that would make a denomination negative', () => {
        const a = { ...makeZeroDenomVector(), [Denomination.SP]: 1 };
        const b = { ...makeZeroDenomVector(), [Denomination.SP]: 2 };

        const result = subtractDenomVectors(a, b);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe(ErrorCode.INSUFFICIENT_FUNDS_DENOM);
            expect(result.error.details).toEqual({ denom: Denomination.SP });
        }
    });

    it('computes totalCp using fixed V1 coin values', () => {
        const denoms = {
            ...makeZeroDenomVector(),
            [Denomination.PP]: 1,
            [Denomination.GP]: 2,
            [Denomination.EP]: 1,
            [Denomination.SP]: 3,
            [Denomination.CP]: 4
        };

        // 1pp=1000, 2gp=200, 1ep=50, 3sp=30, 4cp=4
        expect(totalCp(denoms)).toBe(1284);
    });
});
