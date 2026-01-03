/**
 * src/domain/split/fairSplit.ts
 * Discrete fair split algorithm (pure) + end-to-end loot split operation.
 *
 * Key V1 constraints (do not violate):
 * - Coins are discrete (no splitting and no conversion/making change).
 * - Party fund is NOT part of fairness calculations.
 * - Any unassigned coins become party-fund remainder.
 * - Fairness tolerance is fixed (settings.lootSplit.fairnessToleranceCp).
 *
 * Algorithm summary (SPEC §7.6):
 * 1) Expand the remaining loot (after pre-allocation) into a list of individual coins with cp values.
 * 2) Sort coins descending by cp value (deterministic).
 * 3) Maintain N member buckets: each has a DenomVector and a running total cp.
 * 4) For each coin:
 *    - Choose the member with the minimum total cp (tie-break: lowest index).
 *    - Compute current spread S = max(total) - min(total)
 *    - Simulate assigning the coin to that member and compute new spread S'
 *    - If S' <= S + toleranceCp, assign the coin to the member
 *      else route the coin to party-fund remainder.
 *
 * Invariants this preserves:
 * - Conservation: members + remainder + setAside == input loot (by denomination)
 * - Non-negativity: all denom counts remain >= 0
 * - Determinism: ties and ordering are explicitly specified
 */

import { COIN_VALUE_CP, Settings } from '@/domain/currency';
import { Denomination, DENOMINATIONS_DESC, ErrorCode, TransactionType } from '@/domain/enums';
import { Transaction } from '@/domain/ledger';
import { addDenomVectors, DenomVector, isAllZero, makeZeroDenomVector, validateDenomVector } from '@/domain/money';
import { DomainError, Result, err, ok } from '@/domain/result';
import { computePreAllocation } from '@/domain/split/preAllocation';
import { LootSplitInput, LootSplitResult, SplitSummaryStats } from '@/domain/split/types';

/**
 * Expanded single-coin representation used internally by the fair split algorithm.
 */
type Coin = Readonly<{ denom: Denomination; valueCp: number }>;

/**
 * Initializes empty member buckets for N party members.
 *
 * @param partySize - Number of members (must be >= 1).
 */
function makeMemberBuckets(partySize: number): { members: DenomVector[]; totalsCp: number[] } {
    const members: DenomVector[] = [];
    const totalsCp: number[] = [];
    for (let i = 0; i < partySize; i++) {
        members.push(makeZeroDenomVector());
        totalsCp.push(0);
    }
    return { members, totalsCp };
}

/**
 * Finds the index of the member with the smallest total cp.
 *
 * @remarks
 * Tie-break is deterministic: lowest index wins.
 */
function indexOfMinTotal(totalsCp: readonly number[]): number {
    let minIndex = 0;
    let minValue = totalsCp[0] ?? 0;
    for (let i = 1; i < totalsCp.length; i++) {
        const value = totalsCp[i] ?? 0;
        if (value < minValue) {
            minValue = value;
            minIndex = i;
        }
    }
    return minIndex;
}

/**
 * Computes min, max, and spread of member totals (in cp).
 */
function minMaxSpread(totalsCp: readonly number[]): { min: number; max: number; spread: number } {
    let min = totalsCp[0] ?? 0;
    let max = totalsCp[0] ?? 0;
    for (let i = 1; i < totalsCp.length; i++) {
        const v = totalsCp[i] ?? 0;
        if (v < min) min = v;
        if (v > max) max = v;
    }
    return { min, max, spread: max - min };
}

/**
 * Computes the spread (max-min) if a coin were assigned to a specific member.
 *
 * @param totalsCp - Current member totals (cp).
 * @param memberIndex - Index of member to simulate assignment to.
 * @param coinValueCp - Coin value in cp.
 */
function computeNewSpreadIfAssigned(
    totalsCp: readonly number[],
    memberIndex: number,
    coinValueCp: number
): number {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < totalsCp.length; i++) {
        const base = totalsCp[i] ?? 0;
        const simulated = i === memberIndex ? base + coinValueCp : base;
        if (simulated < min) min = simulated;
        if (simulated > max) max = simulated;
    }

    return max - min;
}

/**
 * Expands a DenomVector into an array of individual coin entries.
 *
 * @remarks
 * The result is deterministically sorted by cp value descending, then denomination rank.
 */
function expandCoins(loot: DenomVector): Coin[] {
    const coins: Coin[] = [];

    // Expand in deterministic denom order (pp->...->cp).
    // Sorting below by valueCp keeps behavior explicit and deterministic.
    for (const denom of DENOMINATIONS_DESC) {
        const count = loot[denom];
        const valueCp = COIN_VALUE_CP[denom];
        for (let i = 0; i < count; i++) {
            coins.push({ denom, valueCp });
        }
    }

    const denomRank: Readonly<Record<Denomination, number>> = {
        [Denomination.PP]: 5,
        [Denomination.GP]: 4,
        [Denomination.EP]: 3,
        [Denomination.SP]: 2,
        [Denomination.CP]: 1
    };

    coins.sort((a, b) => {
        if (a.valueCp !== b.valueCp) return b.valueCp - a.valueCp;
        return (denomRank[b.denom] ?? 0) - (denomRank[a.denom] ?? 0);
    });

    return coins;
}

/**
 * Runs the discrete fair split algorithm on a remaining loot pile.
 *
 * @param params - Remaining loot, party size, and settings.
 * @returns Ok with member allocations and party-fund remainder, or an error Result.
 */
export function computeFairSplit(params: Readonly<{
    remainingLoot: DenomVector;
    partySize: number;
    settings: Settings;
}>): Result<
    Readonly<{
        members: readonly DenomVector[];
        memberTotalsCp: readonly number[];
        partyFundRemainder: DenomVector;
        summary: SplitSummaryStats;
    }>,
    DomainError
> {
    if (!Number.isInteger(params.partySize) || params.partySize < 1) {
        return err({ code: ErrorCode.INVALID_PARTY_SIZE, details: { partySize: params.partySize } });
    }

    const lootValidated = validateDenomVector(params.remainingLoot);
    if (!lootValidated.ok) return lootValidated;

    const { members, totalsCp } = makeMemberBuckets(params.partySize);
    let remainder = makeZeroDenomVector();

    const toleranceCp = params.settings.lootSplit.fairnessToleranceCp;
    const coins = expandCoins(params.remainingLoot);

    for (const coin of coins) {
        const minIndex = indexOfMinTotal(totalsCp);
        const current = minMaxSpread(totalsCp);
        const newSpread = computeNewSpreadIfAssigned(totalsCp, minIndex, coin.valueCp);

        if (newSpread <= current.spread + toleranceCp) {
            const member = members[minIndex] ?? makeZeroDenomVector();
            members[minIndex] = {
                ...member,
                [coin.denom]: member[coin.denom] + 1
            };
            totalsCp[minIndex] = (totalsCp[minIndex] ?? 0) + coin.valueCp;
        } else {
            remainder = { ...remainder, [coin.denom]: remainder[coin.denom] + 1 };
        }
    }

    const totals = minMaxSpread(totalsCp);
    const sum = totalsCp.reduce((acc, v) => acc + v, 0);

    return ok({
        members,
        memberTotalsCp: totalsCp,
        partyFundRemainder: remainder,
        summary: {
            avgCp: params.partySize === 0 ? 0 : Math.floor(sum / params.partySize),
            minCp: totals.min,
            maxCp: totals.max,
            spreadCp: totals.spread
        }
    });
}

/**
 * End-to-end loot split (pre-allocation + fair split).
 *
 * @param input - Loot pile and configuration.
 * @returns Ok(LootSplitResult) or an error Result.
 */
export function computeLootSplit(input: LootSplitInput): Result<LootSplitResult, DomainError> {
    const pre = computePreAllocation({
        loot: input.loot,
        mode: input.mode,
        fixed: input.fixed,
        percent: input.percent
    });
    if (!pre.ok) return pre;

    const split = computeFairSplit({
        remainingLoot: pre.value.remaining,
        partySize: input.partySize,
        settings: input.settings
    });
    if (!split.ok) return split;

    const totalFromOperation = addDenomVectors(pre.value.setAside, split.value.partyFundRemainder);

    return ok({
        members: split.value.members,
        memberTotalsCp: split.value.memberTotalsCp,
        partyFundSetAside: pre.value.setAside,
        partyFundRemainder: split.value.partyFundRemainder,
        partyFundTotalFromOperation: totalFromOperation,
        summary: split.value.summary,
        percentTargetCp: pre.value.percentTargetCp,
        percentSelectedCp: pre.value.percentSelectedCp
    });
}

/**
 * Builds the ONE deposit transaction required by V1 "Commit to fund".
 * The UI is responsible for generating the UUID and timestamp.
 *
 * @param params - Inputs needed to build the transaction.
 * @returns Ok(Transaction) or ZERO_AMOUNT_TRANSACTION if the combined amounts are all-zero.
 */
export function createCommitToFundDepositTransaction(params: Readonly<{
    id: string;
    timestampIsoUtc: string;
    setAside: DenomVector;
    remainder: DenomVector;
    note: string;
    meta?: unknown;
}>): Result<Transaction, DomainError> {
    const amounts = addDenomVectors(params.setAside, params.remainder);
    const validated = validateDenomVector(amounts);
    if (!validated.ok) return validated;
    if (isAllZero(amounts)) {
        return err({ code: ErrorCode.ZERO_AMOUNT_TRANSACTION });
    }
    return ok({
        id: params.id,
        timestamp: params.timestampIsoUtc,
        type: TransactionType.Deposit,
        amounts,
        note: params.note,
        meta: params.meta
    });
}
