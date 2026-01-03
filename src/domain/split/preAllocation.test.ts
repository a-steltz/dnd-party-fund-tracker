import { describe, expect, it } from 'vitest';

import { Denomination, ErrorCode, PreAllocationMode } from '@/domain/enums';
import { makeZeroDenomVector, totalCp } from '@/domain/money';
import { computePreAllocation } from '@/domain/split/preAllocation';

/**
 * Domain unit tests for pre-allocation (party fund skim) invariants.
 */
describe('domain/split/preAllocation', () => {
    it('fixed pre-allocation rejects when any denom exceeds loot', () => {
        const loot = { ...makeZeroDenomVector(), [Denomination.GP]: 1 };
        const fixed = { ...makeZeroDenomVector(), [Denomination.GP]: 2 };

        const result = computePreAllocation({
            loot,
            mode: PreAllocationMode.Fixed,
            fixed
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe(ErrorCode.FIXED_PREALLOCATION_EXCEEDS_LOOT);
        }
    });

    it('percent under-only never exceeds target cp', () => {
        const loot = {
            ...makeZeroDenomVector(),
            [Denomination.GP]: 1, // 100cp
            [Denomination.SP]: 5 // 50cp
        };
        const percent = 0.6; // target=floor(150*0.6)=90cp

        const result = computePreAllocation({
            loot,
            mode: PreAllocationMode.Percent,
            percent
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            const selected = totalCp(result.value.setAside);
            expect(result.value.percentTargetCp).toBe(90);
            expect(selected).toBeLessThanOrEqual(90);
        }
    });

    it('percent selection is deterministic for the same input', () => {
        const loot = {
            ...makeZeroDenomVector(),
            [Denomination.GP]: 2,
            [Denomination.SP]: 1,
            [Denomination.CP]: 9
        };

        const a = computePreAllocation({
            loot,
            mode: PreAllocationMode.Percent,
            percent: 0.5
        });
        const b = computePreAllocation({
            loot,
            mode: PreAllocationMode.Percent,
            percent: 0.5
        });

        expect(a).toEqual(b);
    });
});
