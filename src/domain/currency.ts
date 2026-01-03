/**
 * src/domain/currency.ts
 * Currency constants and loot split settings.
 *
 * V1 rule: denomination relationships are fixed (pp/gp/ep/sp/cp) and are NOT persisted.
 * V1 rule: no conversion/making change anywhere; cp values are used only for informational totals,
 * percent pre-allocation targeting, and fairness tolerance comparisons.
 */

import { Denomination, PercentageMode } from '@/domain/enums';

/**
 * Maps each denomination to its value in copper pieces (cp).
 *
 * @remarks
 * This mapping is a fixed V1 constant and is not exported/imported in the ledger JSON.
 */
export type CoinValueCpByDenomination = Readonly<Record<Denomination, number>>;

/**
 * Settings governing the loot split behavior.
 */
export type LootSplitSettings = Readonly<{
    fairnessToleranceCp: number;
    percentageMode: PercentageMode;
}>;

/**
 * Root settings object persisted in the ledger document.
 *
 * @remarks
 * V1 UI does not allow editing settings; these exist for forward compatibility.
 */
export type Settings = Readonly<{
    lootSplit: LootSplitSettings;
}>;

/**
 * Fixed D&D coin values in cp for V1.
 *
 * @remarks
 * pp=1000, gp=100, ep=50, sp=10, cp=1
 */
export const COIN_VALUE_CP: CoinValueCpByDenomination = {
    [Denomination.PP]: 1000,
    [Denomination.GP]: 100,
    [Denomination.EP]: 50,
    [Denomination.SP]: 10,
    [Denomination.CP]: 1
};

/**
 * Default loot split settings for V1.
 */
export const DEFAULT_LOOT_SPLIT_SETTINGS: LootSplitSettings = {
    fairnessToleranceCp: 10,
    percentageMode: PercentageMode.UnderOnly
};

/**
 * Default settings stored in a new ledger document.
 */
export const DEFAULT_SETTINGS: Settings = {
    lootSplit: DEFAULT_LOOT_SPLIT_SETTINGS
};
