/**
 * src/domain/currency.ts
 * Currency settings for V1.
 *
 * V1 rule: ratios exist but the UI does not expose editing.
 * V1 rule: no conversion/making change anywhere; these values are only used for cp totals and
 * percent pre-allocation targeting.
 */

import { Denomination, PercentageMode } from '@/domain/enums';

/**
 * Maps each denomination to its value in copper pieces (cp).
 *
 * @remarks
 * This is used for totals and percent targeting only; V1 forbids conversion/making change.
 */
export type CurrencySettings = Readonly<Record<Denomination, number>>;

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
    currency: CurrencySettings;
    lootSplit: LootSplitSettings;
}>;

/**
 * Default D&D coin values in cp for V1.
 *
 * @remarks
 * pp=1000, gp=100, ep=50, sp=10, cp=1
 */
export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
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
    currency: DEFAULT_CURRENCY_SETTINGS,
    lootSplit: DEFAULT_LOOT_SPLIT_SETTINGS
};
