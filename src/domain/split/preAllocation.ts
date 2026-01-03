/**
 * src/domain/split/preAllocation.ts
 * Party-fund pre-allocation ("skim") for loot splitting (pure).
 *
 * V1 modes:
 * - none: setAside=0, remaining=loot
 * - fixed: setAside=fixed (must be <= loot per denomination)
 * - percent (UNDER-ONLY): choose setAside by greedy coin selection under a cp target
 *
 * UNDER-ONLY percent rule:
 * - Compute targetCp = floor(totalCp(loot) * percent)
 * - Select coins in deterministic greedy order (pp->gp->ep->sp->cp) without exceeding targetCp
 * - Never exceed targetCp
 *
 * Important: This does NOT make change and does NOT convert coins. It only chooses a subset of the
 * existing discrete coins to route to the party fund.
 */

import { COIN_VALUE_CP } from '@/domain/currency';
import { Denomination, DENOMINATIONS_DESC, ErrorCode, PreAllocationMode } from '@/domain/enums';
import { addDenomVectors, DenomVector, makeZeroDenomVector, subtractDenomVectors, totalCp, validateDenomVector } from '@/domain/money';
import { DomainError, Result, err, ok } from '@/domain/result';

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
 * @param params - Loot, mode, and either fixed amounts or percent (depending on mode).
 * @returns Ok({setAside, remaining}) or an error Result.
 */
export function computePreAllocation(params: Readonly<{
    loot: DenomVector;
    mode: PreAllocationMode;
    fixed?: DenomVector;
    percent?: number;
}>): Result<PreAllocationResult, DomainError> {
    const lootValidated = validateDenomVector(params.loot);
    if (!lootValidated.ok) return lootValidated;

    if (params.mode === PreAllocationMode.None) {
        return ok({ setAside: makeZeroDenomVector(), remaining: params.loot });
    }

    if (params.mode === PreAllocationMode.Fixed) {
        const fixed = params.fixed ?? makeZeroDenomVector();
        const fixedValidated = validateDenomVector(fixed);
        if (!fixedValidated.ok) return fixedValidated;

        for (const denom of DENOMINATIONS_DESC) {
            if (fixed[denom] > params.loot[denom]) {
                return err({
                    code: ErrorCode.FIXED_PREALLOCATION_EXCEEDS_LOOT,
                    details: { denom, fixed: fixed[denom], loot: params.loot[denom] }
                });
            }
        }

        const remaining = subtractDenomVectors(params.loot, fixed);
        if (!remaining.ok) return remaining;
        return ok({ setAside: fixed, remaining: remaining.value });
    }

    // Percent mode (UNDER-ONLY)
    const percent = params.percent;
    if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 1) {
        return err({ code: ErrorCode.INVALID_PERCENT, details: { percent } });
    }

    const lootTotal = totalCp(params.loot);
    const targetCp = Math.floor(lootTotal * percent);

    // Deterministic greedy selection:
    // - Process denominations from highest cp value to lowest (pp->...->cp).
    // - For each denom, take as many coins as fit without exceeding targetCp.
    //
    // This preserves:
    // - Discreteness (we take whole coins only)
    // - Under-only constraint (never exceed the target cp)
    let setAside = makeZeroDenomVector();
    let selectedCp = 0;

    for (const denom of DENOMINATIONS_DESC) {
        const coinValueCp = COIN_VALUE_CP[denom];
        const available = params.loot[denom];
        const remainingTarget = targetCp - selectedCp;

        if (remainingTarget <= 0) break;
        if (coinValueCp <= 0) continue;

        const maxCoinsByTarget = Math.floor(remainingTarget / coinValueCp);
        const take = Math.min(available, maxCoinsByTarget);
        if (take <= 0) continue;

        setAside = addDenomVectors(setAside, {
            [Denomination.PP]: denom === Denomination.PP ? take : 0,
            [Denomination.GP]: denom === Denomination.GP ? take : 0,
            [Denomination.EP]: denom === Denomination.EP ? take : 0,
            [Denomination.SP]: denom === Denomination.SP ? take : 0,
            [Denomination.CP]: denom === Denomination.CP ? take : 0
        });
        selectedCp += take * coinValueCp;
    }

    const remaining = subtractDenomVectors(params.loot, setAside);
    if (!remaining.ok) return remaining;

    return ok({
        setAside,
        remaining: remaining.value,
        percentTargetCp: targetCp,
        percentSelectedCp: selectedCp
    });
}
