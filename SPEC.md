# D&D Party Fund Tracker (V1) — SPEC

## 1) Overview

### Problem
D&D parties need a reliable, simple way to:
1) Track shared party funds across multiple denominations (cp/sp/ep/gp/pp)
2) Record deposits and withdrawals as an auditable ledger
3) Split loot fairly among N party members (anonymous buckets), without splitting or converting coins, and route leftovers to the party fund

### Solution (V1)
A local-first web app (Next.js + TypeScript) that runs client-only, autosaves to localStorage, and supports JSON import/export for backup/sharing.

UI: single page with tabs:
- Party Fund (ledger + balances)
- Loot Split (calculator + commit-to-fund)

---

## 2) Goals and Non-Goals

### Goals (V1)
- Maintain party fund balances by denomination (integer counts)
- Record transactions:
  - `deposit` (adds coins)
  - `withdraw` (removes coins)
- Validate that withdrawals do not produce negative denomination counts (no conversion/borrowing)
- Loot Split tool:
  - Input loot pile (denom vector)
  - Optional pre-allocation to party fund:
    - none
    - fixed amount (denom vector)
    - percent “under-only”
  - Discrete fair split across N members with no conversion
  - Remainders go to party fund
  - “Commit to fund” posts a deposit transaction for pre-allocation + remainder
- Domain logic is separated from UI (pure functions)

### Non-Goals (V1)
- No user accounts, auth, shared DB, multi-user sync
- No per-member persistent balances/ledgers
- No coin conversion (“making change”) anywhere
- No “adjustment” transaction type
- No item inventory/gems/gear valuation
- Denominations fixed to pp/gp/ep/sp/cp (currency ratios exist in settings but not editable in v1 UI)

---

## 3) Platform & Technology Decisions (Locked)

### Stack
- Next.js (App Router) + TypeScript
- Single page UI with tabs
- CSS Modules for styling
- Prettier enabled
- ESLint strict
- Unit tests using Vitest (domain layer only)

### Runtime/Deployment
- Client-only static behavior (no server-side data)
- Designed to work when deployed as static files (e.g., GitHub Pages/Netlify). Persistence remains local to the browser.

---

## 4) Architecture

### Layering
Hard separation between:
1) Domain Layer (`src/domain/`)
   - Pure functions only
   - No `window`, no `localStorage`, no React
   - Money math, ledger rules, split algorithms, validation, error types
2) Storage Layer (`src/storage/`)
   - Load/save ledger JSON to localStorage
   - Import/export JSON file helpers
3) UI Layer (`src/ui/` + Next page)
   - Client components
   - Calls domain and storage adapters
   - No business logic beyond mapping results to UI

### Complexity isolation
- Algorithms in dedicated modules
- Storage helpers in dedicated modules
- Prefer clear, commented implementations

---

## 5) Data Model

### 5.1 Denominations
Fixed set: `pp`, `gp`, `ep`, `sp`, `cp`
Prefer enums over union types.
Use string enums for JSON friendliness.

### 5.2 DenomVector
Represents discrete coins:
`{ pp: number, gp: number, ep: number, sp: number, cp: number }`
All fields required; integers >= 0.

### 5.3 Ledger Document
Stored in memory, localStorage, and export file:

- `schemaVersion: 1`
- `createdAt: ISO-UTC string`
- `lastModifiedAt: ISO-UTC string`
- `settings`
- `transactions: Transaction[]`

### 5.4 Settings (V1)
Not editable in v1 UI (present for forward compatibility).

- currency (value in cp):
  - pp=1000, gp=100, ep=50, sp=10, cp=1
- lootSplit:
  - fairnessToleranceCp = 10 (constant v1)
  - percentageMode = "under-only"

### 5.5 Transaction (V1)
Only two types: `deposit`, `withdraw` (no adjustments)

Fields:
- `id: UUIDv4 string`
- `timestamp: ISO-UTC string`
- `type: "deposit" | "withdraw"`
- `amounts: DenomVector`
- `note?: string` (optional but encouraged)
- `meta?: object` (optional; never used for computation)

Rules:
- all amounts integers >= 0
- reject all-zero amounts
- withdraw validation: cannot result in negative denom counts (no conversion/borrowing)

### 5.6 Derived fields (never stored)
- current party fund balance computed by replaying transactions
- totalCp derived from DenomVector using currency settings

---

## 6) Persistence & Import/Export

### Local autosave
Serialize entire ledger to localStorage after:
- any successful transaction append
- successful import (replace)

localStorage key:
- `dnd_party_fund_ledger_v1`

Optional additional metadata:
- `dnd_party_fund_lastExportedAt` (ISO-UTC string)

### Export
Download full ledger JSON.

### Import (V1)
Replace-only (no merge)
Validate:
- parseable JSON
- schemaVersion === 1
- required fields
On success:
- overwrite in-memory ledger + localStorage
- update lastModifiedAt

---

## 7) Domain Logic

### 7.1 Money math (pure)
- totalCp(denoms, currencySettings) -> number
- add(a,b) -> DenomVector
- subtract(a,b) -> Result<DenomVector> (error if denom would go negative)
- isAllZero(denoms) -> boolean
- validation helpers (integer checks, >=0 checks)

### 7.2 Ledger replay
computeBalance(transactions) -> DenomVector
- start at zero
- apply in timestamp order (stable tie-break by id)
- deposit => add
- withdraw => subtract

### 7.3 Append transaction
appendTransaction(ledger, tx) -> Result<Ledger>
Validate:
- not all-zero
- integer >=0
- withdraw does not exceed current balance (per denom)
On success:
- append tx
- update lastModifiedAt

### 7.4 Loot split: inputs/outputs
Inputs:
- loot: DenomVector
- partySize: number >= 1
- preAllocationMode: none | fixed | percent
- fixed amounts (DenomVector) if fixed
- percent (0..1) if percent
- fairnessToleranceCp: 10 constant

Outputs:
- members: DenomVector[] length N
- memberTotalsCp: number[]
- partyFundSetAside: DenomVector (A)
- partyFundRemainder: DenomVector (B)
- partyFundTotalFromOperation: DenomVector (A+B)
- summary stats (avg/ min/ max/ spread)

### 7.5 Pre-allocation (Party fund skim)

None:
- A = 0, R = loot

Fixed:
- require fixed <= loot per denom (no conversion)
- A = fixed
- R = loot - fixed

Percent (Under-only):
- target T = floor(totalCp(loot) * pct)
- choose A using deterministic greedy selection:
  - iterate pp, gp, ep, sp, cp (descending value)
  - take as many coins as fit without exceeding T
- R = loot - A

### 7.6 Discrete fair split (no conversion)
Constraints:
- no splitting coins
- no conversion/making change
- party fund not part of fairness
- leftover coins go to party fund remainder B

Algorithm:
1) Expand R into list of individual coins with cp values.
2) Sort descending by value.
3) Keep N member buckets (alloc DenomVector + totalCp).
4) For each coin:
   - pick member with minimum totalCp (tie-break lowest index)
   - current spread S = max - min
   - simulate new spread S' if coin assigned
   - if S' <= S + fairnessToleranceCp (10cp):
       assign to member
     else:
       add coin to party fund remainder B

This algorithm must be heavily commented.

### 7.7 Commit split to fund
On commit:
- Create ONE deposit transaction with amounts = A + B
- note includes brief summary
- meta may include structured info (input loot, partySize, pre-allocation mode/value, totals cp)
Per-member allocations are display-only in v1.

---

## 8) Error Handling (Locked)

Domain uses Result pattern (no throwing).

Provide ErrorCode string enum + typed payload:
- INVALID_PARTY_SIZE
- INVALID_AMOUNT_NEGATIVE
- INVALID_AMOUNT_NON_INTEGER
- ZERO_AMOUNT_TRANSACTION
- INSUFFICIENT_FUNDS_DENOM
- FIXED_PREALLOCATION_EXCEEDS_LOOT
- IMPORT_PARSE_ERROR
- IMPORT_INVALID_SCHEMA
etc.

---

## 9) Testing (Vitest)

Domain-only unit tests required.

Money/Ledger:
- add/subtract correctness
- subtract rejects negatives
- computeBalance replay
- withdraw rejects exceeding denom
- reject all-zero transactions

Pre-allocation:
- fixed rejects when exceeds loot per denom
- percent under-only never exceeds target
- deterministic behavior

Split:
- conservation: members + remainder + setAside == input loot (by denom)
- partySize=1 edge case
- tie-break determinism
- tolerance routes coins to remainder as expected
- invariants around totals and non-negativity

---

## 10) Code Style Requirements

- TypeScript everywhere
- string enums for Denomination / TxType / ErrorCode / PreAllocationMode
- CSS Modules
- Prettier + strict ESLint
- File headers + function headers
- Algorithms must include clear explanatory comments

---

## 11) Folder Layout (Recommended)

- src/domain/
  - enums.ts
  - money.ts
  - currency.ts
  - ledger.ts
  - split/
    - types.ts
    - preAllocation.ts
    - fairSplit.ts
- src/storage/
  - localLedgerStore.ts
  - importExport.ts
- src/ui/ (later)
- app/page.tsx (tabs; client)
