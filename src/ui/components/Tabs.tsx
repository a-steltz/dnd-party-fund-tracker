'use client';

import styles from './Tabs.module.css';

/**
 * Simple tab bar component (client-only).
 *
 * @param props.tabs - Tabs to render.
 * @param props.activeTabId - Currently selected tab id.
 * @param props.onTabChange - Called when the user selects a tab.
 */
export function Tabs<T extends string>(props: Readonly<{
    tabs: readonly { id: T; label: string }[];
    activeTabId: T;
    onTabChange: (id: T) => void;
}>) {
    return (
        <nav className={styles.nav} aria-label="Tabs">
            {props.tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    className={tab.id === props.activeTabId ? styles.tabActive : styles.tab}
                    onClick={() => props.onTabChange(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </nav>
    );
}
