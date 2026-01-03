import { DENOMINATIONS_DESC } from '@/domain/enums';
import { DenomVector, isAllZero } from '@/domain/money';

/**
 * Formats a DenomVector into a compact, human-readable string (e.g., "2gp 5sp 1cp").
 *
 * @remarks
 * - Uses a deterministic denomination order.
 * - Returns "0" for an all-zero vector.
 */
export function formatDenomsInline(denoms: DenomVector): string {
    if (isAllZero(denoms)) return '0';
    const parts: string[] = [];
    for (const denom of DENOMINATIONS_DESC) {
        const count = denoms[denom];
        if (count !== 0) parts.push(`${count}${denom}`);
    }
    return parts.join(' ');
}
