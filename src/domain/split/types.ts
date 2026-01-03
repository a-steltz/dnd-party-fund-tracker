/**
 * src/domain/split/types.ts
 * Types used by the loot split calculator (pure).
 */

import { Settings } from '@/domain/currency';
import { PreAllocationMode } from '@/domain/enums';
import { DenomVector } from '@/domain/money';

/**
 * Inputs to the end-to-end loot split operation (pre-allocation + fair split).
 */
export type LootSplitInput = Readonly<{
    loot: DenomVector;
    partySize: number;
    mode: PreAllocationMode;
    fixed?: DenomVector;
    percent?: number; // 0..1
    settings: Settings;
}>;

/**
 * Summary statistics describing fairness in cp terms.
 *
 * @remarks
 * These are informational totals; they do not imply coin conversion.
 */
export type SplitSummaryStats = Readonly<{
    avgCp: number;
    minCp: number;
    maxCp: number;
    spreadCp: number;
}>;

/**
 * Outputs of the end-to-end loot split operation.
 *
 * @remarks
 * Conservation invariant:
 * `members + partyFundSetAside + partyFundRemainder == input loot` (by denomination).
 */
export type LootSplitResult = Readonly<{
    members: readonly DenomVector[];
    memberTotalsCp: readonly number[];
    partyFundSetAside: DenomVector;
    partyFundRemainder: DenomVector;
    partyFundTotalFromOperation: DenomVector;
    summary: SplitSummaryStats;
    percentTargetCp?: number;
    percentSelectedCp?: number;
}>;
