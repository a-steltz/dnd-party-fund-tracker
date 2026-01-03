# V1 Implementation Checklist

## Domain (src/domain/)
- [ ] Define enums + core types (Denomination, TxType, ErrorCode, PreAllocationMode, DenomVector, LedgerDocument)
- [ ] Implement Result pattern (no throws in domain)
- [ ] Money math: add/subtract/totalCp + validation helpers
- [ ] Ledger engine: computeBalance + appendTransaction + schema validation helpers
- [ ] Loot split: pre-allocation (none/fixed/percent under-only) + fair split algorithm + commit-to-fund helper

## Tests (Vitest, domain-only)
- [ ] Money math correctness + subtract rejects negatives
- [ ] Ledger replay correctness + withdraw validation + reject all-zero tx
- [ ] Pre-allocation fixed/percent invariants (under-only)
- [ ] Fair split invariants (conservation, non-negativity, determinism, partySize edge cases)

## Storage (src/storage/)
- [ ] localStorage load/save (single key)
- [ ] Import (replace-only) + export JSON download helpers

## UI (src/ui/ + src/app/page.tsx)
- [ ] Single page with tabs: Party Fund + Loot Split
- [ ] Party Fund: show derived balance, add deposit/withdraw, show ledger
- [ ] Loot Split: inputs, show split outputs, commit-to-fund creates ONE deposit tx
- [ ] Import/Export controls

## Verification
- [ ] `npm test` passes (domain tests)
- [ ] `npm run build` succeeds
