'use client';

import { Denomination, DENOMINATIONS_DESC } from '@/domain/enums';
import { DenomVector } from '@/domain/money';

import styles from './DenomVectorFields.module.css';

/**
 * Coerces a string input into a non-negative integer.
 *
 * @remarks
 * UI-only helper to keep form state aligned with V1 domain invariants.
 */
function coerceNonNegativeInt(value: string): number {
    const asNumber = Number(value);
    if (!Number.isFinite(asNumber)) return 0;
    if (!Number.isInteger(asNumber)) return Math.max(0, Math.floor(asNumber));
    return Math.max(0, asNumber);
}

/**
 * Controlled inputs for a denomination vector.
 *
 * @param props.value - Current denomination vector.
 * @param props.onChange - Called with the next denomination vector when any field changes.
 */
export function DenomVectorFields(props: Readonly<{ value: DenomVector; onChange: (next: DenomVector) => void }>) {
    /**
     * Updates a single denomination field.
     *
     * @param denom - Denomination to update.
     * @param nextValue - Raw input value.
     */
    function set(denom: Denomination, nextValue: string): void {
        const next = { ...props.value, [denom]: coerceNonNegativeInt(nextValue) };
        props.onChange(next);
    }

    function selectAll(input: HTMLInputElement): void {
        try {
            input.select();
        } catch {
            // Some browsers may not fully support selecting on certain input types; ignore.
        }
    }

    return (
        <div className={styles.grid}>
            {DENOMINATIONS_DESC.map((denom) => (
                <label className={styles.label} key={denom}>
                    {denom.toUpperCase()}
                    <input
                        className={styles.input}
                        type="number"
                        min={0}
                        step={1}
                        value={props.value[denom] ?? 0}
                        onChange={(e) => set(denom, e.target.value)}
                        onFocus={(e) => selectAll(e.currentTarget)}
                        onMouseDown={(e) => {
                            // If the field isn't focused yet, prevent the click from placing the caret and
                            // select all so the next typed digit replaces the whole value.
                            if (document.activeElement !== e.currentTarget) {
                                e.preventDefault();
                                e.currentTarget.focus();
                                selectAll(e.currentTarget);
                            }
                        }}
                    />
                </label>
            ))}
        </div>
    );
}
