import { describe, expect, it } from 'vitest';

import { Denomination, ErrorCode, PreAllocationMode } from '@/domain/enums';
import { makeZeroDenomVector } from '@/domain/money';
import { computeFairSplit, computeLootSplit, createCommitToFundDepositTransaction } from '@/domain/split/fairSplit';

/**
 * Domain unit tests for fair split module wiring.
 *
 * @remarks
 * The actual algorithm is intentionally stubbed out while it is being rewritten.
 */
describe('domain/split/fairSplit (stubbed)', () => {
    it('computeFairSplit returns NOT_IMPLEMENTED', () => {
        const result = computeFairSplit({
            remainingLoot: { ...makeZeroDenomVector(), [Denomination.CP]: 1 },
            partySize: 2
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe(ErrorCode.NOT_IMPLEMENTED);
        }
    });

    it('computeLootSplit returns NOT_IMPLEMENTED', () => {
        const result = computeLootSplit({
            loot: makeZeroDenomVector(),
            partySize: 4,
            mode: PreAllocationMode.None
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe(ErrorCode.NOT_IMPLEMENTED);
        }
    });

    it('createCommitToFundDepositTransaction returns NOT_IMPLEMENTED', () => {
        const result = createCommitToFundDepositTransaction({
            id: 'uuid',
            timestampIsoUtc: '2020-01-01T00:00:00.000Z',
            setAside: makeZeroDenomVector(),
            remainder: makeZeroDenomVector(),
            note: 'Commit'
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe(ErrorCode.NOT_IMPLEMENTED);
        }
    });
});

