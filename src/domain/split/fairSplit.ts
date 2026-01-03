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

import { ErrorCode } from '@/domain/enums';
import { Transaction } from '@/domain/ledger';
import { DenomVector } from '@/domain/money';
import { DomainError, Result, err } from '@/domain/result';
import { LootSplitInput, LootSplitResult, SplitSummaryStats } from '@/domain/split/types';

/**
 * Runs the discrete fair split algorithm on a remaining loot pile.
 *
 * @remarks
 * This is intentionally not implemented yet.
 */
export function computeFairSplit(_params: Readonly<{
    remainingLoot: DenomVector;
    partySize: number;
}>): Result<
    Readonly<{
        members: readonly DenomVector[];
        memberTotalsCp: readonly number[];
        partyFundRemainder: DenomVector;
        summary: SplitSummaryStats;
    }>,
    DomainError
> {
    return err({ code: ErrorCode.NOT_IMPLEMENTED, details: { feature: 'lootSplit.fairSplit' } });
}

/**
 * End-to-end loot split (pre-allocation + fair split).
 *
 * @remarks
 * This is intentionally not implemented yet.
 */
export function computeLootSplit(_input: LootSplitInput): Result<LootSplitResult, DomainError> {
    return err({ code: ErrorCode.NOT_IMPLEMENTED, details: { feature: 'lootSplit.computeLootSplit' } });
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
