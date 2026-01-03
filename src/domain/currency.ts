/**
 * src/domain/currency.ts
 * Currency constants for V1.
 *
 * V1 rule: denomination relationships are fixed (pp/gp/ep/sp/cp) and are NOT persisted.
 * V1 rule: no conversion/making change anywhere; cp values are used only for informational totals.
 */

import { Denomination } from '@/domain/enums';

/**
 * Maps each denomination to its value in copper pieces (cp).
 *
 * @remarks
 * This mapping is a fixed V1 constant and is not exported/imported in the ledger JSON.
 */
export type CoinValueCpByDenomination = Readonly<Record<Denomination, number>>;

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
