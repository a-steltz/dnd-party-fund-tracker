/**
 * src/domain/split/preAllocation.ts
 * Party-fund pre-allocation ("skim") for loot splitting (pure).
 *
 * NOTE (early development):
 * The current loot split algorithm is intentionally being rewritten. To avoid shipping buggy
 * behavior, the domain implementation has been stubbed out.
 *
 * TODO(domain): Replace `computePreAllocation` with the finalized pre-allocation algorithm.
 * The UI wiring will be re-enabled once the new domain functions are implemented and tested.
 */

import { ErrorCode, PreAllocationMode } from '@/domain/enums';
import { DenomVector } from '@/domain/money';
import { DomainError, Result, err } from '@/domain/result';

/**
 * Outputs of pre-allocation.
 *
 * @remarks
 * - `setAside` is routed directly to the party fund on commit.
 * - `remaining` proceeds into the fair split algorithm.
 */
export type PreAllocationResult = Readonly<{
    setAside: DenomVector;
    remaining: DenomVector;
    percentTargetCp?: number;
    percentSelectedCp?: number;
}>;

/**
 * Computes party-fund pre-allocation for the loot split calculator.
 *
 * @remarks
 * This is intentionally not implemented yet.
 */
export function computePreAllocation(_params: Readonly<{
    loot: DenomVector;
    mode: PreAllocationMode;
    fixed?: DenomVector;
    percent?: number;
}>): Result<PreAllocationResult, DomainError> {
    return err({ code: ErrorCode.NOT_IMPLEMENTED, details: { feature: 'lootSplit.preAllocation' } });
}

