/**
 * src/ui/interaction/selectAllOnFirstClick.ts
 * Shared input interaction helpers for the UI layer.
 *
 * @remarks
 * When a user clicks into a numeric input that isn't focused yet, browsers typically place the
 * caret at the click position (which can override a select-all-on-focus behavior).
 * These helpers implement a common pattern:
 * - on focus: select the whole value
 * - on first mouse down: prevent default caret placement, focus, and select all
 */

function selectAllIfPossible(input: HTMLInputElement): void {
    try {
        input.select();
    } catch {
        // Ignore selection failures (varies by browser/input type).
    }
}

/**
 * Selects the whole input value on focus.
 */
export function selectAllOnFocus(e: { currentTarget: HTMLInputElement }): void {
    selectAllIfPossible(e.currentTarget);
}

/**
 * On the first click (when not already focused), focuses and selects the whole input value.
 *
 * @remarks
 * Uses `preventDefault()` to avoid the browser placing the caret where the mouse was clicked,
 * which would otherwise clear the selection.
 */
export function selectAllOnFirstMouseDown(e: { currentTarget: HTMLInputElement; preventDefault(): void }): void {
    if (typeof document === 'undefined') return;
    if (document.activeElement === e.currentTarget) return;

    e.preventDefault();
    e.currentTarget.focus();
    selectAllIfPossible(e.currentTarget);
}

