'use client';

import { TransactionType } from '@/domain/enums';
import { Transaction } from '@/domain/ledger';
import { totalGpEquivalentRounded } from '@/domain/money';
import { formatDenomsInline } from '@/ui/format';

import styles from '@/app/page.module.css';

/**
 * Props for {@link LedgerTable}.
 *
 * @remarks
 * The table renders transactions in reverse-chronological order.
 */
export interface LedgerTableProps {
    /** Transactions to display in the ledger table. */
    transactions: readonly Transaction[];
}

/**
 * Formats an ISO-UTC timestamp for display in the user's local timezone.
 *
 * @remarks
 * Ledger timestamps remain stored in UTC (ISO strings). This is display-only formatting.
 */
function formatTimestampLocalForLedgerDisplay(isoUtc: string): string {
    const date = new Date(isoUtc);
    if (Number.isNaN(date.getTime())) return isoUtc;
    const formatted = new Intl.DateTimeFormat('en-US', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).format(date);
    return formatted.replace(',', '');
}

/**
 * Formats a signed gp equivalent based on the transaction type.
 *
 * @param type - Ledger transaction type.
 * @param amounts - Denomination vector used to compute the gp total.
 */
function formatGpEquivalentForTransaction(
    type: TransactionType,
    amounts: Parameters<typeof totalGpEquivalentRounded>[0]
): string {
    const gp = totalGpEquivalentRounded(amounts);
    const sign = type === TransactionType.Withdraw ? -1 : 1;
    const signed = gp * sign;
    if (signed === 0) return '0 gp';
    return `${signed > 0 ? '+' : ''}${signed.toLocaleString()} gp`;
}

/**
 * Renders the ledger transaction history as a table.
 *
 * @param props - See {@link LedgerTableProps}.
 */
export function LedgerTable(props: Readonly<LedgerTableProps>) {
    const sorted = props.transactions.slice().sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    return (
        <div className={styles.tableWrap}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Amounts</th>
                        <th>~ GP</th>
                        <th>Note</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.length === 0 ? (
                        <tr>
                            <td colSpan={5} className={styles.mutedCell}>
                                No transactions yet.
                            </td>
                        </tr>
                    ) : (
                        sorted.map((tx) => (
                            <tr key={tx.id}>
                                <td className={styles.mono}>
                                    <time dateTime={tx.timestamp} title={tx.timestamp}>
                                        {formatTimestampLocalForLedgerDisplay(tx.timestamp)}
                                    </time>
                                </td>
                                <td>{tx.type}</td>
                                <td className={styles.mono}>{formatDenomsInline(tx.amounts)}</td>
                                <td className={styles.mutedCell}>
                                    {formatGpEquivalentForTransaction(tx.type, tx.amounts)}
                                </td>
                                <td>{tx.note ?? ''}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
