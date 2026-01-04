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
import { cloneToMutableDenomVector, DenomVector, makeMutableZeroDenomVector, makeZeroDenomVector, toDenomVector, validateDenomVector } from '@/domain/money';
import { DomainError, Result, err, ok } from '@/domain/result';
import { LootSplitInput, LootSplitResult } from '@/domain/split/types';
import { totalCp} from '@/domain/money'
import { COIN_VALUE_CP } from '../currency';




/**
 * End-to-end loot split (pre-allocation + fair split).
 *
 * @remarks
 * IMplementation in progress
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

    let remainingLoot: DenomVector = input.loot;
    let partyFundSetAside: DenomVector = makeZeroDenomVector();

    // Next, handle validation and then execution of  the different pre-allocation modes.
    switch (input.mode) {
        case PreAllocationMode.None: {
            remainingLoot = input.loot;
            partyFundSetAside = makeZeroDenomVector();
            break;
        }
        case PreAllocationMode.Fixed: {
            // Validation: fixed-mode-specific validation (including per-denomination negative remainder)
            // happens inside `computeFixesPreAllocationInternal` because it requires iterating the data.
            if (input.fixed === undefined) {
                return err({
                    code: ErrorCode.MISSING_REQUIRED_FIELD,
                    details: { field: 'fixed', mode: PreAllocationMode.Fixed }
                });
            }

            const fixedAllocationResult = computeFixedPreAllocationInternal(input.loot, input.fixed);
            if (!fixedAllocationResult.ok) return fixedAllocationResult;

            remainingLoot = fixedAllocationResult.value.remainingLoot;
            partyFundSetAside = fixedAllocationResult.value.partyFundAllocation;
            break;
        }
        case PreAllocationMode.Percent: {
            //Validation
            if (input.percent === undefined) {
                return err({
                    code: ErrorCode.MISSING_REQUIRED_FIELD,
                    details: { field: 'percent', mode: PreAllocationMode.Percent }
                });
            }

            //Execution
            const percentageAllocationResult = computePercentPreAllocationInternal(input.loot, input.percent);
            if (!percentageAllocationResult.ok) return percentageAllocationResult;

            remainingLoot = percentageAllocationResult.value.remainingLoot
            partyFundSetAside = percentageAllocationResult.value.partyFundAllocation;
            break;
        }
        default: {
            return err({ code: ErrorCode.INVALID_PREALLOCATION_MODE, details: { mode: input.mode } });
        }
    }


    // Split up the reamining loot;
    

    void remainingLoot;
    void partyFundSetAside;
    


    return err({ code: ErrorCode.NOT_IMPLEMENTED, details: { feature: 'lootSplit.computeLootSplit' } });
}

function computeFixedPreAllocationInternal(
    initialLoot: DenomVector,
    fixedAllocation: DenomVector
): Result<Readonly<{ remainingLoot: DenomVector; partyFundAllocation: DenomVector }>, DomainError>
{
    // Fixed-mode specific validation lives here because we cannot verify non-negative remainders
    // without iterating denomination-by-denomination.
    const initialValidated = validateDenomVector(initialLoot);
    if (!initialValidated.ok) return initialValidated;

    const fixedValidated = validateDenomVector(fixedAllocation);
    if (!fixedValidated.ok) return fixedValidated;

    const remainingLoot = makeMutableZeroDenomVector();

    for (const denomination of DENOMINATIONS_DESC) {
        const lootCoins = initialLoot[denomination];
        const fixedCoins = fixedAllocation[denomination];
        const coinsRemaining = lootCoins - fixedCoins;
        if (coinsRemaining < 0) {
            return err({
                code: ErrorCode.FIXED_PREALLOCATION_EXCEEDS_LOOT,
                details: { denom: denomination, fixed: fixedCoins, loot: lootCoins }
            });
        }

        remainingLoot[denomination] = coinsRemaining;
    }

    return ok({
        remainingLoot: toDenomVector(remainingLoot),
        partyFundAllocation: fixedAllocation
    });

}

/**
 * This function take in the initial loot provided (before any subtractions), as well as
 * teh percentage of said loot we plan to allocate to the party fund, then calculates the amount to 
 * allocate. It takes a top down approach, and will get as close the the percent without exceeding it.
 * @param initialLoot 
 * @param percent 
 * @returns 
 */
function computePercentPreAllocationInternal(initialLoot: DenomVector , percent: number)
: Result<Readonly<{ remainingLoot: DenomVector; partyFundAllocation: DenomVector }>, DomainError>
{

    // Validation

    
    const initialValidated = validateDenomVector(initialLoot);
    if (!initialValidated.ok) 
    {
        return initialValidated;
    }
    
    
    if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 1) {
        return err({ code: ErrorCode.INVALID_PERCENT, details: { percent } });
    }

    const initialLootInCopper = totalCp(initialLoot);

    if (initialLootInCopper <= 0 ) {
        return err({ code: ErrorCode.INVALID_LOOT_DENOMINATOR })
    }


    // Bussiness Logic

    const remainingLoot = cloneToMutableDenomVector(initialLoot)
    const partyFundAllocation = makeMutableZeroDenomVector();

    let setAsideAmountCp = 0
    for (const denomination of DENOMINATIONS_DESC) {

        while ( remainingLoot[denomination] > 0)
        {
            // If the amount we are going to add would put us over, we are done.
            if ((initialLootInCopper / (setAsideAmountCp + COIN_VALUE_CP[denomination])  ) > percent )
            {
                break;
            }

            // We are good to add the next coin to the party fund without going over the percent. Do so.
            remainingLoot[denomination]--;
            partyFundAllocation[denomination]++;
            setAsideAmountCp += COIN_VALUE_CP[denomination];
        }
    }

    // All done. Time to format output.
    return ok({
        remainingLoot: toDenomVector(remainingLoot),
        partyFundAllocation: toDenomVector(partyFundAllocation)
    }); 

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
