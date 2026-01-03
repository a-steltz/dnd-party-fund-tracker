/**
 * src/domain/money.ts
 * Denomination vector math and validation (pure).
 *
 * V1 invariants:
 * - Denominations are discrete counts (integers >= 0).
 * - No conversion/making change.
 */

import { COIN_VALUE_CP } from '@/domain/currency';
import { Denomination, DENOMINATIONS_DESC, ErrorCode } from '@/domain/enums';
import { DomainError, Result, err, ok } from '@/domain/result';

/**
 * A complete denomination vector.
 *
 * @remarks
 * - All denominations must be present.
 * - Values are discrete counts (integers) and must be >= 0.
 * - This type is intentionally immutable at the API boundary; use {@link MutableDenomVector}
 *   for scratch calculations inside algorithms and convert back to {@link DenomVector} for outputs.
 */
export type DenomVector = Readonly<Record<Denomination, number>>;

/**
 * A mutable denomination vector for in-algorithm scratch work.
 *
 * @remarks
 * Domain functions should still expose {@link DenomVector} inputs/outputs to keep invariants easy
 * to reason about. Use this type only for local mutation within an algorithm, then convert back
 * with {@link toDenomVector}.
 */
export type MutableDenomVector = Record<Denomination, number>;

/**
 * Creates a zero-filled denomination vector.
 */
export function makeZeroDenomVector(): DenomVector {
    return {
        [Denomination.PP]: 0,
        [Denomination.GP]: 0,
        [Denomination.EP]: 0,
        [Denomination.SP]: 0,
        [Denomination.CP]: 0
    };
}

/**
 * Creates a mutable zero-filled denomination vector.
 *
 * @remarks
 * Use this when an algorithm benefits from in-place updates (e.g., tight loops), then return an
 * immutable {@link DenomVector} via {@link toDenomVector}.
 */
export function makeMutableZeroDenomVector(): MutableDenomVector {
    return {
        [Denomination.PP]: 0,
        [Denomination.GP]: 0,
        [Denomination.EP]: 0,
        [Denomination.SP]: 0,
        [Denomination.CP]: 0
    };
}

/**
 * Clones an immutable denomination vector into a mutable one.
 */
export function cloneToMutableDenomVector(denoms: DenomVector): MutableDenomVector {
    return {
        [Denomination.PP]: denoms[Denomination.PP],
        [Denomination.GP]: denoms[Denomination.GP],
        [Denomination.EP]: denoms[Denomination.EP],
        [Denomination.SP]: denoms[Denomination.SP],
        [Denomination.CP]: denoms[Denomination.CP]
    };
}

/**
 * Clones a mutable denomination vector into an immutable {@link DenomVector}.
 *
 * @remarks
 * This is a shallow clone; coin counts are primitives.
 */
export function toDenomVector(denoms: MutableDenomVector): DenomVector {
    return {
        [Denomination.PP]: denoms[Denomination.PP],
        [Denomination.GP]: denoms[Denomination.GP],
        [Denomination.EP]: denoms[Denomination.EP],
        [Denomination.SP]: denoms[Denomination.SP],
        [Denomination.CP]: denoms[Denomination.CP]
    };
}

/**
 * Checks whether all denominations are zero.
 *
 * @param denoms - Denomination vector to check.
 */
export function isAllZero(denoms: DenomVector): boolean {
    for (const denom of DENOMINATIONS_DESC) {
        if (denoms[denom] !== 0) return false;
    }
    return true;
}

/**
 * Validates a single coin count as a non-negative safe integer.
 *
 * @param value - Candidate coin count.
 * @param context - Extra diagnostic context (e.g., which denomination).
 * @returns Ok(value) if valid, otherwise an error Result.
 */
export function validateNonNegativeSafeInteger(
    value: number,
    context: Readonly<Record<string, unknown>>
): Result<number, DomainError> {
    if (!Number.isFinite(value)) {
        return err({ code: ErrorCode.INVALID_AMOUNT_NOT_FINITE, details: context });
    }
    if (!Number.isInteger(value)) {
        return err({ code: ErrorCode.INVALID_AMOUNT_NON_INTEGER, details: context });
    }
    if (value < 0) {
        return err({ code: ErrorCode.INVALID_AMOUNT_NEGATIVE, details: context });
    }
    if (!Number.isSafeInteger(value)) {
        return err({ code: ErrorCode.INVALID_AMOUNT_NON_INTEGER, details: context });
    }
    return ok(value);
}

/**
 * Validates a full denomination vector for V1 invariants (all fields present, integers, >= 0).
 *
 * @param denoms - Denomination vector to validate.
 * @returns Ok(denoms) if valid, otherwise an error Result.
 */
export function validateDenomVector(denoms: DenomVector): Result<DenomVector, DomainError> {
    for (const denom of DENOMINATIONS_DESC) {
        const validated = validateNonNegativeSafeInteger(denoms[denom], { denom });
        if (!validated.ok) return validated;
    }
    return ok(denoms);
}

/**
 * Adds two denomination vectors (per-denomination).
 *
 * @remarks
 * This does not convert/make change; it simply sums counts in each denomination.
 */
export function addDenomVectors(a: DenomVector, b: DenomVector): DenomVector {
    return {
        [Denomination.PP]: a[Denomination.PP] + b[Denomination.PP],
        [Denomination.GP]: a[Denomination.GP] + b[Denomination.GP],
        [Denomination.EP]: a[Denomination.EP] + b[Denomination.EP],
        [Denomination.SP]: a[Denomination.SP] + b[Denomination.SP],
        [Denomination.CP]: a[Denomination.CP] + b[Denomination.CP]
    };
}

/**
 * Subtracts a denomination vector from another (per-denomination).
 *
 * @remarks
 * V1 forbids borrowing/making change, so any negative denomination is an error.
 *
 * @returns Ok(result) if all denominations remain non-negative, otherwise
 * an INSUFFICIENT_FUNDS_DENOM error indicating the first denomination that would go negative.
 */
export function subtractDenomVectors(a: DenomVector, b: DenomVector): Result<DenomVector, DomainError> {
    const pp = a[Denomination.PP] - b[Denomination.PP];
    const gp = a[Denomination.GP] - b[Denomination.GP];
    const ep = a[Denomination.EP] - b[Denomination.EP];
    const sp = a[Denomination.SP] - b[Denomination.SP];
    const cp = a[Denomination.CP] - b[Denomination.CP];

    if (pp < 0) return err({ code: ErrorCode.INSUFFICIENT_FUNDS_DENOM, details: { denom: Denomination.PP } });
    if (gp < 0) return err({ code: ErrorCode.INSUFFICIENT_FUNDS_DENOM, details: { denom: Denomination.GP } });
    if (ep < 0) return err({ code: ErrorCode.INSUFFICIENT_FUNDS_DENOM, details: { denom: Denomination.EP } });
    if (sp < 0) return err({ code: ErrorCode.INSUFFICIENT_FUNDS_DENOM, details: { denom: Denomination.SP } });
    if (cp < 0) return err({ code: ErrorCode.INSUFFICIENT_FUNDS_DENOM, details: { denom: Denomination.CP } });

    return ok({
        [Denomination.PP]: pp,
        [Denomination.GP]: gp,
        [Denomination.EP]: ep,
        [Denomination.SP]: sp,
        [Denomination.CP]: cp
    });
}

/**
 * Computes the total value of a denomination vector in copper pieces (cp).
 *
 * @remarks
 * This does not imply conversion; it is a computed total used for percent targeting and reporting.
 */
export function totalCp(denoms: DenomVector): number {
    // This is safe because V1 uses small integers; callers can treat this as informational only.
    let sum = 0;
    for (const denom of DENOMINATIONS_DESC) {
        sum += denoms[denom] * COIN_VALUE_CP[denom];
    }
    return sum;
}
