## D&D Party Fund Tracker (V1)

Local-first D&D party fund ledger + loot split calculator.

### Features
- **Party Fund ledger**: append-only `deposit` / `withdraw` transactions, with balances derived by replay.
- **Loot Split**: pre-allocate coins to the party fund, split the remainder across `N` anonymous party members, and “commit to fund” as one deposit.
- **Local persistence**: autosaves to `localStorage`.
- **Backup**: JSON import/export (replace-only).

### Rules (V1)
- Denominations are fixed: `pp`, `gp`, `ep`, `sp`, `cp`.
- Coins are discrete counts (integers ≥ 0).
- No conversion / “making change” anywhere.
- Withdrawals must not make any denomination negative.

### Architecture
Hard separation of concerns:
- `src/domain/`: pure logic (no React, no browser APIs).
- `src/storage/`: `localStorage` + JSON import/export (no business logic).
- `src/ui/` and `src/app/`: UI components only (no domain rules/calculations).

### Development
```bash
npm run dev
npm test
npm run build
```

### Persistence & Import/Export
- `localStorage` key: `dnd_party_fund_ledger_v3`
- Import is **replace-only** (no merge).
- Export is a JSON snapshot of the full ledger document.

#### Export format (current)
```json
{
  "schemaVersion": 3,
  "createdAt": "2026-01-03T19:48:56.526Z",
  "lastModifiedAt": "2026-01-03T20:13:44.866Z",
  "transactions": []
}
```

### Status
This project is in early development; schema/import compatibility is not guaranteed between versions.

See `SPEC.md` for the full V1 specification (note: may lag behind implementation during early development).
