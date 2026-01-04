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
    perMember: DenomVector;
    partyFundSetAside: DenomVector;
    partyFundRemainder: DenomVector;
    partyFundTotalFromOperation: DenomVector;
}>;
