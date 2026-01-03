import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '@/domain/currency';
import { Denomination, ErrorCode, PreAllocationMode } from '@/domain/enums';
import { addDenomVectors, makeZeroDenomVector } from '@/domain/money';
import { computeFairSplit, computeLootSplit, createCommitToFundDepositTransaction } from '@/domain/split/fairSplit';

/**
 * Sums a list of member allocations into a single DenomVector.
 *
 * @remarks
 * Used to assert conservation invariants in tests.
 */
function sumMembers(members: readonly ReturnType<typeof makeZeroDenomVector>[]) {
    return members.reduce((acc, m) => addDenomVectors(acc, m), makeZeroDenomVector());
}

/**
 * Domain unit tests for the fair split algorithm and end-to-end split behavior.
 */
describe('domain/split/fairSplit', () => {
    it('partySize=1 assigns all remaining loot to the sole member', () => {
        const remainingLoot = { ...makeZeroDenomVector(), [Denomination.GP]: 1, [Denomination.CP]: 3 };
        const result = computeFairSplit({ remainingLoot, partySize: 1, settings: DEFAULT_SETTINGS });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.partyFundRemainder).toEqual(makeZeroDenomVector());
            expect(result.value.members).toHaveLength(1);
            expect(result.value.members[0]).toEqual(remainingLoot);
        }
    });

    it('tie-break assigns first coin to lowest index member when totals are equal', () => {
        const remainingLoot = { ...makeZeroDenomVector(), [Denomination.CP]: 1 };
        const result = computeFairSplit({ remainingLoot, partySize: 2, settings: DEFAULT_SETTINGS });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.members[0][Denomination.CP]).toBe(1);
            expect(result.value.members[1][Denomination.CP]).toBe(0);
        }
    });

    it('routes a too-large coin to remainder when it would exceed fairness tolerance', () => {
        const remainingLoot = { ...makeZeroDenomVector(), [Denomination.GP]: 1 }; // 100cp
        const result = computeFairSplit({ remainingLoot, partySize: 2, settings: DEFAULT_SETTINGS });

        expect(result.ok).toBe(true);
        if (result.ok) {
            // From (0,0), assigning 100cp yields spread 100 which is > 0+10 tolerance, so it goes to remainder.
            expect(result.value.members[0]).toEqual(makeZeroDenomVector());
            expect(result.value.members[1]).toEqual(makeZeroDenomVector());
            expect(result.value.partyFundRemainder).toEqual(remainingLoot);
        }
    });

    it('conserves total coins across members + remainder + setAside', () => {
        const loot = {
            ...makeZeroDenomVector(),
            [Denomination.PP]: 1,
            [Denomination.GP]: 2,
            [Denomination.EP]: 3,
            [Denomination.SP]: 4,
            [Denomination.CP]: 5
        };

        const result = computeLootSplit({
            loot,
            partySize: 3,
            mode: PreAllocationMode.Percent,
            percent: 0.2,
            settings: DEFAULT_SETTINGS
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            const membersSum = sumMembers(result.value.members);
            const total = addDenomVectors(
                addDenomVectors(membersSum, result.value.partyFundRemainder),
                result.value.partyFundSetAside
            );
            expect(total).toEqual(loot);
        }
    });

    it('rejects invalid party sizes', () => {
        const remainingLoot = { ...makeZeroDenomVector(), [Denomination.CP]: 1 };
        const result = computeFairSplit({ remainingLoot, partySize: 0, settings: DEFAULT_SETTINGS });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe(ErrorCode.INVALID_PARTY_SIZE);
        }
    });

    it('creates a commit-to-fund deposit that is one transaction and non-zero', () => {
        const setAside = { ...makeZeroDenomVector(), [Denomination.CP]: 2 };
        const remainder = { ...makeZeroDenomVector(), [Denomination.SP]: 1 };

        const txResult = createCommitToFundDepositTransaction({
            id: 'uuid',
            timestampIsoUtc: '2020-01-01T00:00:00.000Z',
            setAside,
            remainder,
            note: 'Commit'
        });

        expect(txResult.ok).toBe(true);
        if (txResult.ok) {
            expect(txResult.value.type).toBe('deposit');
            expect(txResult.value.amounts[Denomination.SP]).toBe(1);
            expect(txResult.value.amounts[Denomination.CP]).toBe(2);
        }
    });
});
