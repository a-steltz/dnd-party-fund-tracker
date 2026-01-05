'use client';

import { TransactionType } from '@/domain/enums';
import { DenomVector } from '@/domain/money';
import { DenomVectorFields } from '@/ui/components/DenomVectorFields';

import styles from '@/app/page.module.css';

/**
 * Props for {@link TransactionForm}.
 *
 * @remarks
 * This is a fully controlled form; the parent owns all state.
 */
export interface TransactionFormProps {
    /** Current transaction type selection. */
    type: TransactionType;
    /** Current note input text (optional). */
    note: string;
    /** Current denomination vector for the transaction. */
    amounts: DenomVector;
    /** Called when the transaction type changes. */
    onTypeChange: (nextType: TransactionType) => void;
    /** Called when the note input changes. */
    onNoteChange: (nextNote: string) => void;
    /** Called when the denomination inputs change. */
    onAmountsChange: (nextAmounts: DenomVector) => void;
    /** Called when the user submits the transaction. */
    onSubmit: () => void;
}

/**
 * Renders the "Add Transaction" input controls.
 *
 * @param props - See {@link TransactionFormProps}.
 */
export function TransactionForm(props: Readonly<TransactionFormProps>) {
    return (
        <>
            <div className={styles.formGrid}>
                <label className={styles.label}>
                    Type
                    <select
                        className={styles.select}
                        value={props.type}
                        onChange={(e) => props.onTypeChange(e.target.value as TransactionType)}
                    >
                        <option value={TransactionType.Deposit}>Deposit</option>
                        <option value={TransactionType.Withdraw}>Withdraw</option>
                    </select>
                </label>

                <label className={styles.label}>
                    Note (optional)
                    <input
                        className={styles.input}
                        value={props.note}
                        onChange={(e) => props.onNoteChange(e.target.value)}
                        placeholder="e.g., Sold treasure, bought supplies..."
                    />
                </label>
            </div>

            <DenomVectorFields value={props.amounts} onChange={props.onAmountsChange} />

            <div className={styles.row}>
                <button className={styles.buttonPrimary} type="button" onClick={props.onSubmit}>
                    Add
                </button>
            </div>
        </>
    );
}
