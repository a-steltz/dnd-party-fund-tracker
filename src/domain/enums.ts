/**
 * src/domain/enums.ts
 * Domain enums for V1.
 *
 * Notes:
 * - These are string enums for JSON friendliness and explicitness.
 * - Denomination order is fixed for V1 (no conversion/making change).
 */

/**
 * Fixed D&D currency denominations for V1.
 *
 * @remarks
 * - Denominations are a fixed set in V1.
 * - Coin conversion / making change is explicitly forbidden in V1.
 */
export enum Denomination {
    /** Platinum pieces (`pp`). */
    PP = 'pp',
    /** Gold pieces (`gp`). */
    GP = 'gp',
    /** Electrum pieces (`ep`). */
    EP = 'ep',
    /** Silver pieces (`sp`). */
    SP = 'sp',
    /** Copper pieces (`cp`). */
    CP = 'cp'
}

/**
 * Denominations ordered from lowest-value to highest-value for deterministic iteration.
 *
 * @remarks
 * Used where the specific order matters for determinism; this does not imply conversion.
 */
export const DENOMINATIONS_ASC: readonly Denomination[] = [
    Denomination.CP,
    Denomination.SP,
    Denomination.EP,
    Denomination.GP,
    Denomination.PP
] as const;

/**
 * Denominations ordered from highest-value to lowest-value for deterministic iteration.
 *
 * @remarks
 * Used by greedy selection and display ordering; this does not imply conversion.
 */
export const DENOMINATIONS_DESC: readonly Denomination[] = [
    Denomination.PP,
    Denomination.GP,
    Denomination.EP,
    Denomination.SP,
    Denomination.CP
] as const;

/**
 * Ledger transaction types for V1.
 *
 * @remarks
 * V1 allows only deposits and withdrawals (no adjustments).
 */
export enum TransactionType {
    /** Adds coins to the fund. */
    Deposit = 'deposit',
    /** Removes coins from the fund (must not overdraft any denomination). */
    Withdraw = 'withdraw'
}

/**
 * Loot split party-fund pre-allocation modes for V1.
 */
export enum PreAllocationMode {
    /** No pre-allocation; split uses the full loot pile. */
    None = 'none',
    /** Set aside a fixed denomination vector (must be <= loot per denomination). */
    Fixed = 'fixed',
    /** Set aside up to a percentage of total cp (under-only, greedy max-under-target). */
    Percent = 'percent'
}

/**
 * Percent mode constraints for V1.
 */
export enum PercentageMode {
    /** Percent pre-allocation must never exceed the cp target value. */
    UnderOnly = 'under-only'
}

/**
 * Domain error codes (string enum) used by the Result pattern.
 *
 * @remarks
 * Domain code must not throw; instead it returns explicit, typed errors.
 */
export enum ErrorCode {
    /** Party size is not a valid integer ≥ 1. */
    INVALID_PARTY_SIZE = 'INVALID_PARTY_SIZE',
    /** A coin count is negative (invalid in V1). */
    INVALID_AMOUNT_NEGATIVE = 'INVALID_AMOUNT_NEGATIVE',
    /** A coin count is not an integer (invalid in V1). */
    INVALID_AMOUNT_NON_INTEGER = 'INVALID_AMOUNT_NON_INTEGER',
    /** A coin count is not finite (NaN/Infinity). */
    INVALID_AMOUNT_NOT_FINITE = 'INVALID_AMOUNT_NOT_FINITE',
    /** A transaction attempted to move zero coins in all denominations. */
    ZERO_AMOUNT_TRANSACTION = 'ZERO_AMOUNT_TRANSACTION',
    /** A withdrawal would make at least one denomination negative. */
    INSUFFICIENT_FUNDS_DENOM = 'INSUFFICIENT_FUNDS_DENOM',
    /** Fixed pre-allocation exceeds available loot in at least one denomination. */
    FIXED_PREALLOCATION_EXCEEDS_LOOT = 'FIXED_PREALLOCATION_EXCEEDS_LOOT',
    /** Percent input is invalid (not in [0,1]). */
    INVALID_PERCENT = 'INVALID_PERCENT',
    /** JSON parse/read/stringify error during import/export/storage. */
    IMPORT_PARSE_ERROR = 'IMPORT_PARSE_ERROR',
    /** Imported JSON fails schema validation. */
    IMPORT_INVALID_SCHEMA = 'IMPORT_INVALID_SCHEMA',
    /** Imported JSON uses an unsupported schema version. */
    IMPORT_UNSUPPORTED_SCHEMA_VERSION = 'IMPORT_UNSUPPORTED_SCHEMA_VERSION',
    /** Feature is intentionally not implemented yet. */
    NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
    /** A required input field is missing for the chosen mode. */
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
    /** Pre-allocation mode value is invalid/unsupported. */
    INVALID_PREALLOCATION_MODE = 'INVALID_PREALLOCATION_MODE',
    /** When we are trying to determine a percent allocation for a loot pile worth 0 or less */
    INVALID_LOOT_DENOMINATOR = "INVALID_LOOT_DENOMINATOR"
}
