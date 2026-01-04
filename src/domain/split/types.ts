/**
 * src/domain/split/types.ts
 * Types used by the loot split calculator (pure).
 */

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
}>;

/**
 * Outputs of the end-to-end loot split operation.
 *
 * @remarks
 * Conservation invariant:
 * `partySize * perMember + partyFundSetAside + partyFundRemainder == input loot` (by denomination).
 */
export type LootSplitResult = Readonly<{
    /**
     * Per-member payout (same for all members).
     */
    perMemberPayout: DenomVector;
    /**
     * Pre-allocation routed to party fund (before splitting).
     */
    partyFundSetAside: DenomVector;
    /**
     * Per-denomination remainder from splitting.
     */
    partyFundRemainder: DenomVector;
    /**
     * Total routed to party fund: `setAside + remainder`.
     */
    partyFundTotalFromOperation: DenomVector;
}>;
