'use client';

import { PreAllocationMode } from '@/domain/enums';
import { DenomVector } from '@/domain/money';
import { LootSplitResult } from '@/domain/split/types';
import { DenomVectorFields } from '@/ui/components/DenomVectorFields';
import { selectAllOnFirstMouseDown, selectAllOnFocus } from '@/ui/interaction/selectAllOnFirstClick';
import { formatDenomsInline, formatGpEquivalent } from '@/ui/format';

import styles from '@/app/page.module.css';

/**
 * Props for {@link LootSplitCalculator}.
 *
 * @remarks
 * All inputs are controlled by the parent; this component renders UI only.
 */
export interface LootSplitCalculatorProps {
    /** Current party size input value. */
    partySize: number;
    /** Current loot pile denomination vector. */
    lootPile: DenomVector;
    /** Selected pre-allocation mode. */
    preMode: PreAllocationMode;
    /** Fixed set-aside vector when using fixed pre-allocation. */
    fixedSetAside: DenomVector;
    /** Percent set-aside value (0-100) when using percent pre-allocation. */
    percentSetAside: number;
    /** Current split result, if calculated. */
    splitResult: LootSplitResult | null;
    /** Called when the party size changes. */
    onPartySizeChange: (nextPartySize: number) => void;
    /** Called when the loot pile changes. */
    onLootPileChange: (nextLootPile: DenomVector) => void;
    /** Called when the pre-allocation mode changes. */
    onPreModeChange: (nextMode: PreAllocationMode) => void;
    /** Called when the fixed set-aside vector changes. */
    onFixedSetAsideChange: (nextSetAside: DenomVector) => void;
    /** Called when the percent set-aside value changes. */
    onPercentSetAsideChange: (nextPercent: number) => void;
    /** Called when the user requests a calculation. */
    onCalculate: () => void;
    /** Called when the user commits the split to the party fund. */
    onCommit: () => void;
}

/**
 * Renders the loot split inputs and results UI.
 *
 * @param props - See {@link LootSplitCalculatorProps}.
 */
export function LootSplitCalculator(props: Readonly<LootSplitCalculatorProps>) {
    const split = props.splitResult;

    return (
        <>
            <h2 className={styles.sectionTitle}>Inputs</h2>

            <div className={styles.formGrid}>
                <label className={styles.label}>
                    Party size
                    <input
                        className={styles.input}
                        type="number"
                        min={1}
                        step={1}
                        value={props.partySize}
                        onChange={(e) => props.onPartySizeChange(Number(e.target.value))}
                        onFocus={selectAllOnFocus}
                        onMouseDown={selectAllOnFirstMouseDown}
                    />
                </label>

                <label className={styles.label}>
                    Pre-allocation mode
                    <select
                        className={styles.select}
                        value={props.preMode}
                        onChange={(e) => props.onPreModeChange(e.target.value as PreAllocationMode)}
                    >
                        <option value={PreAllocationMode.None}>None</option>
                        <option value={PreAllocationMode.Fixed}>Fixed</option>
                        <option value={PreAllocationMode.Percent}>Percent (under-only, greedy)</option>
                    </select>
                </label>
            </div>

            <h3 className={styles.subTitle}>Loot pile</h3>
            <DenomVectorFields value={props.lootPile} onChange={props.onLootPileChange} />

            {props.preMode === PreAllocationMode.Fixed ? (
                <>
                    <h3 className={styles.subTitle}>Set aside to party fund (fixed)</h3>
                    <DenomVectorFields value={props.fixedSetAside} onChange={props.onFixedSetAsideChange} />
                </>
            ) : null}

            {props.preMode === PreAllocationMode.Percent ? (
                <div className={styles.formGrid}>
                    <label className={styles.label}>
                        Percent to set aside (0-100, under-only)
                        <input
                            className={styles.input}
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={props.percentSetAside}
                            onChange={(e) => props.onPercentSetAsideChange(Number(e.target.value))}
                            onFocus={selectAllOnFocus}
                            onMouseDown={selectAllOnFirstMouseDown}
                        />
                    </label>
                </div>
            ) : null}

            <div className={styles.row}>
                <button className={styles.buttonPrimary} type="button" onClick={props.onCalculate}>
                    Calculate
                </button>
            </div>

            {split ? (
                <>
                    <h2 className={styles.sectionTitle}>Results</h2>
                    <div className={styles.cards}>
                        <div className={styles.card}>
                            <div className={styles.cardLabel}>Party fund set-aside</div>
                            <div className={styles.valueRow}>
                                <div className={styles.mono}>{formatDenomsInline(split.partyFundSetAside)}</div>
                                <div className={styles.valueApprox}>{formatGpEquivalent(split.partyFundSetAside)}</div>
                            </div>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardLabel}>Party fund remainder</div>
                            <div className={styles.valueRow}>
                                <div className={styles.mono}>{formatDenomsInline(split.partyFundRemainder)}</div>
                                <div className={styles.valueApprox}>{formatGpEquivalent(split.partyFundRemainder)}</div>
                            </div>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardLabel}>Total to party fund</div>
                            <div className={styles.valueRow}>
                                <div className={styles.mono}>{formatDenomsInline(split.partyFundTotalFromOperation)}</div>
                                <div className={styles.valueApprox}>
                                    {formatGpEquivalent(split.partyFundTotalFromOperation)}
                                </div>
                            </div>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardLabel}>Per member</div>
                            <div className={styles.valueRow}>
                                <div className={styles.mono}>{formatDenomsInline(split.perMemberPayout)}</div>
                                <div className={styles.valueApprox}>{formatGpEquivalent(split.perMemberPayout)}</div>
                            </div>
                        </div>
                    </div>

                    <h3 className={styles.subTitle}>Member allocations</h3>
                    <div className={styles.muted}>Each party member receives the same per-denomination payout.</div>

                    <div className={styles.row}>
                        <button className={styles.buttonPrimary} type="button" onClick={props.onCommit}>
                            Commit to fund (one deposit)
                        </button>
                    </div>
                </>
            ) : (
                <div className={styles.muted}>No calculation yet.</div>
            )}
        </>
    );
}
