import { describe, expect, it } from 'vitest';

import { ErrorCode, PreAllocationMode } from '@/domain/enums';
import { makeZeroDenomVector } from '@/domain/money';
import { computePreAllocation } from '@/domain/split/preAllocation';

/**
 * Domain unit tests for pre-allocation module wiring.
 *
 * @remarks
 * The actual algorithm is intentionally stubbed out while it is being rewritten.
 */
describe('domain/split/preAllocation (stubbed)', () => {
    it('returns NOT_IMPLEMENTED while algorithm is being rewritten', () => {
        const result = computePreAllocation({
            loot: makeZeroDenomVector(),
            mode: PreAllocationMode.None
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe(ErrorCode.NOT_IMPLEMENTED);
        }
    });
});

