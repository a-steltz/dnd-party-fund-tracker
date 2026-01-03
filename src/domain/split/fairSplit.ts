/**
 * src/domain/split/fairSplit.ts
 * Discrete fair split algorithm (pure) + end-to-end loot split operation.
 *
 * NOTE (early development):
 * The existing loot split logic is known to be buggy and is being replaced. For now, we keep the
 * exported function signatures so the UI can remain intact, but the implementations are stubs.
 *
 * TODO(domain): Implement the finalized loot split algorithms here:
 * - pre-allocation (none/fixed/percent under-only)
 * - fair split (discrete coins, remainder to party fund)
 * - commit-to-fund deposit transaction builder (ONE deposit tx)
 *
 * TODO(ui): Re-enable Calculate/Commit actions once the new domain logic exists.
 */

import { DENOMINATIONS_DESC, ErrorCode, PreAllocationMode } from '@/domain/enums';
import { Transaction } from '@/domain/ledger';
import { DenomVector, makeMutableZeroDenomVector, toDenomVector, validateDenomVector } from '@/domain/money';
import { DomainError, Result, err, ok } from '@/domain/result';
import { LootSplitInput, LootSplitResult, SplitSummaryStats } from '@/domain/split/types';




/**
 * End-to-end loot split (pre-allocation + fair split).
 *
 * @remarks
 * This is intentionally not implemented yet.
 */
export function computeLootSplit(input: LootSplitInput): Result<LootSplitResult, DomainError> {
    // First, do some basic validation that applies to all cases. 
    if (!Number.isInteger(input.partySize) || input.partySize < 1) {
        return err({ code: ErrorCode.INVALID_PARTY_SIZE, details: { partySize: input.partySize } });
    }
    const lootValidated = validateDenomVector(input.loot);
    if (!lootValidated.ok) {
        return lootValidated;
    }

    let remainingLoot : DenomVector;
    // Next, handle validation and then execution of  the different pre-allocation modes. 
    switch (input.mode) {
        case PreAllocationMode.None :
            let remainingLoot = input.loot;
        case PreAllocationMode.Fixed:
            //Validation
            if (input.fixed === undefined) {
                return err({
                    code: ErrorCode.MISSING_REQUIRED_FIELD,
                    details: { field: 'fixed', mode: PreAllocationMode.Fixed }
                });
            }
            const fixedValidated = validateDenomVector(input.fixed);
            if (!fixedValidated.ok) {
                return fixedValidated;
            }

            //Execution - TODO
       case PreAllocationMode.Percent:
            //Validation
            if (input.percent === undefined) {
                return err({
                    code: ErrorCode.MISSING_REQUIRED_FIELD,
                    details: { field: 'percent', mode: PreAllocationMode.Percent }
                });
            }
            const percent = input.percent;
            if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 1) {
                return err({ code: ErrorCode.INVALID_PERCENT, details: { percent } });
            }

            //Execution - TODO



    }
    


    return err({ code: ErrorCode.NOT_IMPLEMENTED, details: { feature: 'lootSplit.computeLootSplit' } });
}

function computeFixesPreAllocationInternal(
    initialLoot: DenomVector,
    fixedAllocation: DenomVector
): { remainingLoot: DenomVector; partyFundAllocation: DenomVector } 
{
    const remainingLoot = makeMutableZeroDenomVector();

    for (const denomination of DENOMINATIONS_DESC) {
        const coinsRemaining = initialLoot[denomination] - fixedAllocation[denomination]
        if (coinsRemaining < 0) {
            //TODO - Error Case - return with error
        }

        remainingLoot[denomination] = coinsRemaining;
    }

    return {
        remainingLoot: toDenomVector(remainingLoot),
        partyFundAllocation: toDenomVector(fixedAllocation)
    };

}




/**
 * Computes a simple "fair split" of a loot vector by splitting each denomination independently.
 *
 * @remarks
 * This algorithm:
 * - does NOT make change / exchange across denominations
 * - gives each member a split of coins per denomination
 * - routes per-denomination remainders to the party fund remainder
 *
 * Assumptions (enforced by the wrapper function, not here):
 * - `partySize` is an integer >= 1
 * - `remainingLoot` is a valid {@link DenomVector}
 *
 * Steps (per denomination):
 * 1) Read the available coin count `coins` for that denomination.
 * 2) Compute each member's payout for that denomination as `floor(coins / partySize)`.
 * 3) Compute the party-fund remainder for that denomination as `coins % partySize`.
 *
 * Invariants preserved:
 * - No conversion/making change: each denomination is processed independently.
 * - Conservation (per denomination): `coins == partySize * perMember + remainder`.
 * - Non-negativity: outputs are always >= 0 when inputs are valid.
 * - Determinism: no randomness and no ordering dependencies.
 *
 * Edge cases:
 * - If `coins < partySize`, then `perMember=0` and `remainder=coins`.
 * - If `coins === 0`, outputs remain zero for that denomination.
 *
 * TODO(domain): Replace with finalized fair split algorithm.
 */
function computeFairSplitInternal(
    remainingLoot: DenomVector,
    partySize: number
):
    {
        memberPayoutVector: DenomVector;
        partyFundRemainder: DenomVector;
    } {
    
    const perMember = makeMutableZeroDenomVector();
    const remainder = makeMutableZeroDenomVector();
    for (const denomination of DENOMINATIONS_DESC) {
        const coins = remainingLoot[denomination];
        if (coins > 0) {
            perMember[denomination] = Math.floor(coins / partySize);
            remainder[denomination] = coins % partySize;
        }
    }

    return {
        memberPayoutVector: toDenomVector(perMember),
        partyFundRemainder: toDenomVector(remainder)
    };
}





/**
 * Builds the ONE deposit transaction required by V1 "Commit to fund".
 *
 * @remarks
 * This is intentionally not implemented yet.
 */
export function createCommitToFundDepositTransaction(_params: Readonly<{
    id: string;
    timestampIsoUtc: string;
    setAside: DenomVector;
    remainder: DenomVector;
    note: string;
    meta?: unknown;
}>): Result<Transaction, DomainError> {
    return err({ code: ErrorCode.NOT_IMPLEMENTED, details: { feature: 'lootSplit.commitToFund' } });
}
