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
import { addDenomVectors, cloneToMutableDenomVector, DenomVector, makeMutableZeroDenomVector, makeZeroDenomVector, toDenomVector, validateDenomVector } from '@/domain/money';
import { DomainError, Result, err, ok } from '@/domain/result';
import { LootSplitInput, LootSplitResult } from '@/domain/split/types';
import { totalCp} from '@/domain/money'
import { COIN_VALUE_CP } from '../currency';




/**
 * End-to-end loot split (pre-allocation + fair split).
 *
 * @remarks
 * UI entry point: returns per-member payout plus party-fund amounts (set-aside + remainder).
 */
export function computeLootSplit(input: LootSplitInput): Result<
    Readonly<LootSplitResult>,
    DomainError
> {
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

    const fairSplitResult = computeFairSplitInternal(remainingLoot,input.partySize)

    const perMemberPayout = fairSplitResult.perMemberPayout;
    const partyFundRemainder = fairSplitResult.partyFundRemainder;
    const partyFundTotalFromOperation = addDenomVectors(partyFundSetAside,partyFundRemainder);

    return ok(
        {
            perMemberPayout : perMemberPayout ,
            partyFundSetAside : partyFundSetAside , 
            partyFundRemainder : partyFundRemainder , 
            partyFundTotalFromOperation : partyFundTotalFromOperation
        }
    )
}

/**
 * Fixed-mode pre-allocation: moves `fixedAllocation` to the party fund and returns the remainder.
 *
 * @remarks
 * Fails if any denomination would go negative (i.e., `fixedAllocation[denom] > initialLoot[denom]`).
 */
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
 * Percent-mode pre-allocation: greedily routes coins to the party fund without exceeding `percent`.
 *
 * @remarks
 * Deterministic pass from highest to lowest denomination; no conversion/making change.
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

    // UNDER-ONLY target in cp (no conversion/making change; cp total is informational).
    const targetSetAsideCp = Math.floor(initialLootInCopper * percent);

    // Bussiness Logic

    const remainingLoot = cloneToMutableDenomVector(initialLoot)
    const partyFundAllocation = makeMutableZeroDenomVector();

    let setAsideAmountCp = 0
    for (const denomination of DENOMINATIONS_DESC) {

        while (remainingLoot[denomination] > 0 && setAsideAmountCp < targetSetAsideCp)
        {
            // If adding the next coin would exceed the target, stop taking this denomination.
            const nextCp = setAsideAmountCp + COIN_VALUE_CP[denomination];
            if (nextCp > targetSetAsideCp)
            {
                break;
            }

            // We are good to add the next coin to the party fund without going over the percent. Do so.
            remainingLoot[denomination]--;
            partyFundAllocation[denomination]++;
            setAsideAmountCp = nextCp;
        }
    }

    // All done. Time to format output.
    return ok({
        remainingLoot: toDenomVector(remainingLoot),
        partyFundAllocation: toDenomVector(partyFundAllocation)
    }); 

}





/**
 * Computes a simple per-denomination split.
 *
 * @remarks
 * For each denomination `d`:
 * - per-member payout = `floor(remainingLoot[d] / partySize)`
 * - party-fund remainder = `remainingLoot[d] % partySize`
 *
 * No conversion/making change; deterministic.
 */
function computeFairSplitInternal(
    remainingLoot: DenomVector,
    partySize: number
):
    {
        perMemberPayout: DenomVector;
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
        perMemberPayout: toDenomVector(perMember),
        partyFundRemainder: toDenomVector(remainder)
    };
}





/**
 * Builds the ONE deposit transaction required by V1 "Commit to fund".
 *
 * @remarks
 * Should deposit exactly `partyFundTotalFromOperation` as ONE ledger transaction.
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
