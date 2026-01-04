'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { ErrorCode, PreAllocationMode, TransactionType } from '@/domain/enums';
import { appendTransaction, computeBalance, createNewLedgerDocument, LedgerDocument, withLastModifiedAt } from '@/domain/ledger';
import { makeZeroDenomVector, totalGpEquivalentRounded } from '@/domain/money';
import { computeLootSplit, createCommitToFundDepositTransaction } from '@/domain/split/fairSplit';
import { LootSplitResult } from '@/domain/split/types';
import { ledgerToJsonString, parseLedgerFromJsonString, readTextFile, downloadJson } from '@/storage/importExport';
import { loadLedgerJsonFromLocalStorage, saveLedgerToLocalStorage, setLastExportedAt } from '@/storage/localLedgerStore';
import { DenomVectorFields } from '@/ui/components/DenomVectorFields';
import { Tabs } from '@/ui/components/Tabs';
import { formatDenomsInline } from '@/ui/format';

import styles from './page.module.css';

type UiBanner =
    | { kind: 'none' }
    | { kind: 'error'; message: string }
    | { kind: 'success'; message: string };

/**
 * Returns the current time as an ISO-UTC string.
 */
function nowIsoUtc(): string {
    return new Date().toISOString();
}

/**
 * Generates a UUID for transaction ids.
 *
 * @remarks
 * Uses `crypto.randomUUID()` when available; otherwise falls back to a best-effort unique string.
 */
function randomUuid(): string {
    const maybe = globalThis.crypto?.randomUUID?.();
    if (maybe) return maybe;
    return `uuid_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

/**
 * Maps a domain ErrorCode to a user-friendly UI message.
 *
 * @param code - Domain error code.
 */
function errorToMessage(code: ErrorCode): string {
    switch (code) {
        case ErrorCode.ZERO_AMOUNT_TRANSACTION:
            return 'Transaction must include at least one coin.';
        case ErrorCode.INSUFFICIENT_FUNDS_DENOM:
            return 'Withdrawal exceeds current balance for at least one denomination.';
        case ErrorCode.INVALID_PARTY_SIZE:
            return 'Party size must be an integer ≥ 1.';
        case ErrorCode.FIXED_PREALLOCATION_EXCEEDS_LOOT:
            return 'Fixed pre-allocation exceeds the loot pile in at least one denomination.';
        case ErrorCode.INVALID_PERCENT:
            return 'Percent must be between 0 and 100.';
        case ErrorCode.IMPORT_PARSE_ERROR:
            return 'Could not read or parse the imported JSON.';
        case ErrorCode.IMPORT_INVALID_SCHEMA:
        case ErrorCode.IMPORT_UNSUPPORTED_SCHEMA_VERSION:
            return 'Imported JSON is not a valid ledger document.';
        case ErrorCode.NOT_IMPLEMENTED:
            return 'This feature is still under construction.';
        case ErrorCode.MISSING_REQUIRED_FIELD:
            return 'Some required inputs are missing.';
        case ErrorCode.INVALID_PREALLOCATION_MODE:
            return 'Invalid pre-allocation mode.';
        default:
            return 'An unexpected error occurred.';
    }
}

function formatGpEquivalentForTransaction(type: TransactionType, amounts: Parameters<typeof totalGpEquivalentRounded>[0]): string {
    const gp = totalGpEquivalentRounded(amounts);
    const sign = type === TransactionType.Withdraw ? -1 : 1;
    const signed = gp * sign;
    if (signed === 0) return '0 gp';
    return `${signed > 0 ? '+' : ''}${signed.toLocaleString()} gp`;
}

function formatGpEquivalent(amounts: Parameters<typeof totalGpEquivalentRounded>[0]): string {
    const gp = totalGpEquivalentRounded(amounts);
    return `≈ ${gp.toLocaleString()} gp`;
}

function selectAllInput(input: HTMLInputElement): void {
    try {
        input.select();
    } catch {
        // Ignore selection failures (varies by browser/input type).
    }
}

function focusAndSelectOnMouseDown(e: React.MouseEvent<HTMLInputElement>): void {
    // If the field isn't focused yet, prevent the click from placing the caret and select all so the
    // next typed digit replaces the whole value.
    if (document.activeElement !== e.currentTarget) {
        e.preventDefault();
        e.currentTarget.focus();
        selectAllInput(e.currentTarget);
    }
}

/**
 * Single-page V1 UI containing two tabs:
 * - Party Fund (ledger + derived balance)
 * - Loot Split (calculator + commit-to-fund)
 */
export default function HomePage() {
    const [activeTab, setActiveTab] = useState<'fund' | 'split'>('fund');
    const [ledger, setLedger] = useState<LedgerDocument>(() => createNewLedgerDocument(nowIsoUtc()));
    const [banner, setBanner] = useState<UiBanner>({ kind: 'none' });
    const canAutosaveRef = useRef(false);
    const initialLedgerRef = useRef<LedgerDocument>(ledger);
    const importFileInputRef = useRef<HTMLInputElement | null>(null);

    const balance = useMemo(() => computeBalance(ledger.transactions), [ledger.transactions]);
    const balanceGpEquivalent = useMemo(() => totalGpEquivalentRounded(balance), [balance]);

    // Party fund transaction form state
    const [txType, setTxType] = useState<TransactionType>(TransactionType.Deposit);
    const [txAmounts, setTxAmounts] = useState(makeZeroDenomVector());
    const [txNote, setTxNote] = useState('');

    // Loot split form state
    const [partySize, setPartySize] = useState<number>(4);
    const [lootPile, setLootPile] = useState(makeZeroDenomVector());
    const [preMode, setPreMode] = useState<PreAllocationMode>(PreAllocationMode.None);
    const [fixedSetAside, setFixedSetAside] = useState(makeZeroDenomVector());
    const [percentSetAside, setPercentSetAside] = useState<number>(10);
    const [splitResult, setSplitResult] = useState<LootSplitResult | null>(null);

    useEffect(() => {
        if (!canAutosaveRef.current) return;
        saveLedgerToLocalStorage(ledger);
    }, [ledger]);

    useEffect(() => {
        const loaded = loadLedgerJsonFromLocalStorage();
        if (loaded.ok && loaded.value) {
            const parsed = parseLedgerFromJsonString(loaded.value);
            if (parsed.ok) {
                canAutosaveRef.current = true;
                queueMicrotask(() => setLedger(parsed.value));
                return;
            }
        }

        canAutosaveRef.current = true;
        saveLedgerToLocalStorage(initialLedgerRef.current);
    }, []);

    /**
     * Validates and appends a deposit/withdraw transaction to the ledger.
     */
    function handleAppendTransaction(): void {
        setBanner({ kind: 'none' });

        const tx = {
            id: randomUuid(),
            timestamp: nowIsoUtc(),
            type: txType,
            amounts: txAmounts,
            note: txNote.trim() === '' ? undefined : txNote.trim()
        };

        const next = appendTransaction(ledger, tx);
        if (!next.ok) {
            setBanner({ kind: 'error', message: errorToMessage(next.error.code) });
            return;
        }

        setLedger(next.value);
        setTxAmounts(makeZeroDenomVector());
        setTxNote('');
        setBanner({ kind: 'success', message: 'Transaction added.' });
    }

    /**
     * Runs the loot split calculator and stores the result in component state.
     */
    function handleCalculateSplit(): void {
        setBanner({ kind: 'none' });

        const result = computeLootSplit({
            loot: lootPile,
            partySize,
            mode: preMode,
            fixed: preMode === PreAllocationMode.Fixed ? fixedSetAside : undefined,
            percent: preMode === PreAllocationMode.Percent ? percentSetAside / 100 : undefined
        });

        if (!result.ok) {
            setSplitResult(null);
            setBanner({ kind: 'error', message: errorToMessage(result.error.code) });
            return;
        }

        setSplitResult(result.value);
    }

    /**
     * Commits the split's party-fund (set-aside + remainder) as ONE deposit transaction.
     */
    function handleCommitSplit(): void {
        if (!splitResult) return;
        setBanner({ kind: 'none' });

        const note = `Loot split commit: partySize=${partySize}, mode=${preMode}, fund=${formatDenomsInline(
            splitResult.partyFundTotalFromOperation
        )}`;

        const txResult = createCommitToFundDepositTransaction({
            id: randomUuid(),
            timestampIsoUtc: nowIsoUtc(),
            setAside: splitResult.partyFundSetAside,
            remainder: splitResult.partyFundRemainder,
            note,
            meta: {
                loot: lootPile,
                partySize,
                mode: preMode,
                fixed: preMode === PreAllocationMode.Fixed ? fixedSetAside : undefined,
                percent: preMode === PreAllocationMode.Percent ? percentSetAside / 100 : undefined
            }
        });

        if (!txResult.ok) {
            setBanner({ kind: 'error', message: errorToMessage(txResult.error.code) });
            return;
        }

        const next = appendTransaction(ledger, txResult.value);
        if (!next.ok) {
            setBanner({ kind: 'error', message: errorToMessage(next.error.code) });
            return;
        }

        setLedger(next.value);
        setBanner({ kind: 'success', message: 'Committed to party fund (one deposit transaction).' });
    }

    /**
     * Imports a ledger JSON file (replace-only) and updates local state.
     *
     * @param file - Selected JSON file.
     */
    async function handleImport(file: File | null): Promise<void> {
        if (!file) return;
        setBanner({ kind: 'none' });

        const text = await readTextFile(file);
        if (!text.ok) {
            setBanner({ kind: 'error', message: errorToMessage(text.error.code) });
            return;
        }

        const parsed = parseLedgerFromJsonString(text.value);
        if (!parsed.ok) {
            setBanner({ kind: 'error', message: errorToMessage(parsed.error.code) });
            return;
        }

        setLedger(withLastModifiedAt(parsed.value, nowIsoUtc()));
        setSplitResult(null);
        setBanner({ kind: 'success', message: 'Import succeeded (replace-only).' });
    }

    /**
     * Exports the current ledger document as a downloaded JSON file.
     */
    function handleExport(): void {
        setBanner({ kind: 'none' });

        const json = ledgerToJsonString(ledger);
        if (!json.ok) {
            setBanner({ kind: 'error', message: errorToMessage(json.error.code) });
            return;
        }

        const filename = `dnd_party_fund_ledger_v1_${nowIsoUtc().replaceAll(':', '-')}.json`;
        downloadJson(filename, json.value);
        setLastExportedAt(nowIsoUtc());
        setBanner({ kind: 'success', message: 'Export downloaded.' });
    }

    return (
        <main className={styles.main}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>D&amp;D Party Fund Tracker</h1>
                    <p className={styles.subtitle}>Local-first ledger + loot split (V1)</p>
                </div>

                <div className={styles.actions}>
                    <input
                        ref={importFileInputRef}
                        className={styles.fileInput}
                        type="file"
                        accept="application/json"
                        onChange={(e) => void handleImport(e.target.files?.[0] ?? null)}
                    />
                    <button
                        className={styles.button}
                        type="button"
                        onClick={() => importFileInputRef.current?.click()}
                    >
                        Import JSON
                    </button>
                    <button className={styles.button} type="button" onClick={handleExport}>
                        Export JSON
                    </button>
                </div>
            </header>

            {banner.kind !== 'none' ? (
                <div className={banner.kind === 'error' ? styles.bannerError : styles.bannerSuccess}>
                    {banner.message}
                </div>
            ) : null}

            <Tabs
                tabs={[
                    { id: 'fund', label: 'Party Fund' },
                    { id: 'split', label: 'Loot Split' }
                ]}
                activeTabId={activeTab}
                onTabChange={(id) => setActiveTab(id as 'fund' | 'split')}
            />

            {activeTab === 'fund' ? (
                <section className={styles.section}>
	                    <h2 className={styles.sectionTitle}>Current Balance</h2>
	                    <div className={styles.balanceRow}>
	                        <div className={styles.balanceCard}>
	                            <div className={styles.balanceLabel}>Balance</div>
	                            <div className={styles.valueRow}>
	                                <div className={styles.balanceValue}>{formatDenomsInline(balance)}</div>
	                                <div className={styles.valueApprox}>{formatGpEquivalent(balance)}</div>
	                            </div>
	                        </div>
	                    </div>

                    <h2 className={styles.sectionTitle}>Add Transaction</h2>
                    <div className={styles.formGrid}>
                        <label className={styles.label}>
                            Type
                            <select
                                className={styles.select}
                                value={txType}
                                onChange={(e) => setTxType(e.target.value as TransactionType)}
                            >
                                <option value={TransactionType.Deposit}>Deposit</option>
                                <option value={TransactionType.Withdraw}>Withdraw</option>
                            </select>
                        </label>

                        <label className={styles.label}>
                            Note (optional)
                            <input
                                className={styles.input}
                                value={txNote}
                                onChange={(e) => setTxNote(e.target.value)}
                                placeholder="e.g., Sold treasure, bought supplies…"
                            />
                        </label>
                    </div>

                    <DenomVectorFields value={txAmounts} onChange={setTxAmounts} />

                    <div className={styles.row}>
                        <button className={styles.buttonPrimary} type="button" onClick={handleAppendTransaction}>
                            Add
                        </button>
                    </div>

	                    <h2 className={styles.sectionTitle}>Ledger</h2>
	                    <div className={styles.tableWrap}>
	                        <table className={styles.table}>
	                            <thead>
	                                <tr>
	                                    <th>Time</th>
	                                    <th>Type</th>
	                                    <th>Amounts</th>
	                                    <th>≈ GP</th>
	                                    <th>Note</th>
	                                </tr>
	                            </thead>
	                            <tbody>
	                                {ledger.transactions.length === 0 ? (
	                                    <tr>
	                                        <td colSpan={5} className={styles.mutedCell}>
	                                            No transactions yet.
	                                        </td>
	                                    </tr>
	                                ) : (
	                                    ledger.transactions
	                                        .slice()
                                        .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
	                                        .map((tx) => (
	                                            <tr key={tx.id}>
	                                                <td className={styles.mono}>{tx.timestamp}</td>
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
                </section>
            ) : (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Inputs</h2>

                    <div className={styles.formGrid}>
                        <label className={styles.label}>
                            Party size
	                            <input
	                                className={styles.input}
	                                type="number"
	                                min={1}
	                                step={1}
	                                value={partySize}
	                                onChange={(e) => setPartySize(Number(e.target.value))}
	                                onFocus={(e) => selectAllInput(e.currentTarget)}
	                                onMouseDown={focusAndSelectOnMouseDown}
	                            />
	                        </label>

                        <label className={styles.label}>
                            Pre-allocation mode
                            <select
                                className={styles.select}
                                value={preMode}
                                onChange={(e) => setPreMode(e.target.value as PreAllocationMode)}
                            >
                                <option value={PreAllocationMode.None}>None</option>
                                <option value={PreAllocationMode.Fixed}>Fixed</option>
                                <option value={PreAllocationMode.Percent}>Percent (under-only, greedy)</option>
                            </select>
                        </label>
                    </div>

                    <h3 className={styles.subTitle}>Loot pile</h3>
                    <DenomVectorFields value={lootPile} onChange={setLootPile} />

                    {preMode === PreAllocationMode.Fixed ? (
                        <>
                            <h3 className={styles.subTitle}>Set aside to party fund (fixed)</h3>
                            <DenomVectorFields value={fixedSetAside} onChange={setFixedSetAside} />
                        </>
                    ) : null}

                    {preMode === PreAllocationMode.Percent ? (
                        <div className={styles.formGrid}>
                            <label className={styles.label}>
                                Percent to set aside (0–100, under-only)
	                                <input
	                                    className={styles.input}
	                                    type="number"
	                                    min={0}
	                                    max={100}
	                                    step={1}
	                                    value={percentSetAside}
	                                    onChange={(e) => setPercentSetAside(Number(e.target.value))}
	                                    onFocus={(e) => selectAllInput(e.currentTarget)}
	                                    onMouseDown={focusAndSelectOnMouseDown}
	                                />
	                            </label>
	                        </div>
	                    ) : null}

                    <div className={styles.row}>
                        <button className={styles.buttonPrimary} type="button" onClick={handleCalculateSplit}>
                            Calculate
                        </button>
                    </div>

                    {splitResult ? (
                        <>
                            <h2 className={styles.sectionTitle}>Results</h2>
                            <div className={styles.cards}>
                                <div className={styles.card}>
                                    <div className={styles.cardLabel}>Party fund set-aside</div>
                                    <div className={styles.valueRow}>
                                        <div className={styles.mono}>{formatDenomsInline(splitResult.partyFundSetAside)}</div>
                                        <div className={styles.valueApprox}>{formatGpEquivalent(splitResult.partyFundSetAside)}</div>
                                    </div>
                                </div>
                                <div className={styles.card}>
                                    <div className={styles.cardLabel}>Party fund remainder</div>
                                    <div className={styles.valueRow}>
                                        <div className={styles.mono}>{formatDenomsInline(splitResult.partyFundRemainder)}</div>
                                        <div className={styles.valueApprox}>{formatGpEquivalent(splitResult.partyFundRemainder)}</div>
                                    </div>
                                </div>
                                <div className={styles.card}>
                                    <div className={styles.cardLabel}>Total to party fund</div>
                                    <div className={styles.valueRow}>
                                        <div className={styles.mono}>
                                            {formatDenomsInline(splitResult.partyFundTotalFromOperation)}
                                        </div>
                                        <div className={styles.valueApprox}>
                                            {formatGpEquivalent(splitResult.partyFundTotalFromOperation)}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.card}>
                                    <div className={styles.cardLabel}>Per member</div>
                                    <div className={styles.valueRow}>
                                        <div className={styles.mono}>{formatDenomsInline(splitResult.perMemberPayout)}</div>
                                        <div className={styles.valueApprox}>{formatGpEquivalent(splitResult.perMemberPayout)}</div>
                                    </div>
                                </div>
                            </div>

                            <h3 className={styles.subTitle}>Member allocations</h3>
                            <div className={styles.muted}>Each party member receives the same per-denomination payout.</div>

                            <div className={styles.row}>
                                <button className={styles.buttonPrimary} type="button" onClick={handleCommitSplit}>
                                    Commit to fund (one deposit)
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className={styles.muted}>No calculation yet.</div>
                    )}
                </section>
            )}
        </main>
    );
}
