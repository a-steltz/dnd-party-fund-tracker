# AGENTS.md — D&D Party Fund Tracker (V1)

This file provides **project-specific instructions** for coding agents (Codex, CLI agents, etc.).
Agents must follow these rules unless explicitly overridden.

---

## Project Summary

This project is a **local-first D&D party fund tracker** built as a client-only web app using:

- Next.js (App Router)
- TypeScript
- CSS Modules
- localStorage persistence
- JSON import/export

The app tracks a **party fund ledger** and provides a **loot split calculator**.
There is **no backend, no auth, no database**, and no multi-user sync.

---

## Architecture Rules (CRITICAL)

### Strict Separation of Concerns

The codebase is divided into three layers:

1. **Domain Layer (`src/domain/`)**
   - Pure functions ONLY
   - No React, no browser APIs, no localStorage
   - Contains:
     - currency math
     - ledger rules
     - loot split algorithms
     - validation
     - error handling
   - Domain code must be:
     - deterministic
     - testable
     - heavily commented for algorithms

2. **Storage Layer (`src/storage/`)**
   - Handles loading/saving the ledger JSON
   - localStorage autosave
   - JSON import/export
   - NO business logic here

3. **UI Layer (`src/ui/` and `app/`)**
   - React / Next.js client components
   - Calls domain + storage layers
   - NO calculations or rules implemented in UI
   - Any component touching localStorage must be a `"use client"` component

**Never mix domain logic into UI components.**

---

## Data & Business Rules (DO NOT VIOLATE)

### Currency Rules
- Denominations are FIXED:
  - `pp`, `gp`, `ep`, `sp`, `cp`
- Coins are **discrete**.
- NO coin conversion or “making change” anywhere.
- All denomination counts are integers ≥ 0.
- Currency ratios are fixed constants and are NOT persisted in exports.

### Transactions
- ONLY two transaction types exist in V1:
  - `deposit`
  - `withdraw`
- NO adjustment transactions.
- Reject all-zero transactions.
- Withdrawals must NOT cause any denomination to go negative.
- Direction is implied by transaction type (no negative numbers stored).

### Ledger
- Append-only.
- Balances are ALWAYS derived by replaying transactions.
- Never store balances directly.

### Loot Split Rules
- Party members are anonymous buckets (Party Member 1..N).
- Party fund is **NOT part of fairness**.
- Remainders always go to party fund.
- Pre-allocation modes:
  - none
  - fixed amount (denom vector)
  - percent (UNDER-ONLY, greedy max-under-target)
- Percent pre-allocation must NEVER exceed the target cp value (under-only).
- Loot split algorithms must preserve total coins exactly.
- Current split mode allocates the same `perMemberPayout` to every member (per-denomination split).

---

## Error Handling

- Domain layer uses **Result pattern**.
- DO NOT throw exceptions in domain code.
- Errors must be explicit and typed using string enums.
- UI is responsible for mapping errors to messages.

---

## Code Style & Conventions

- TypeScript everywhere
- Prefer **string enums** over union types
- CSS Modules only (no inline styles)
- Prettier formatting
- ESLint strict
- File headers and function headers preferred
- Algorithms MUST include explanatory comments describing:
  - intent
  - steps
  - edge cases
  - invariants

---

## Testing Requirements

- Use **Vitest**
- Test ONLY the domain layer in V1
- Required test coverage (target; may be in-progress during early development):
  - denomination math
  - ledger replay correctness
  - withdrawal validation
  - pre-allocation (fixed and percent under-only)
  - loot split conservation invariants
  - edge cases (partySize=1, small loot, uneven piles)

UI tests are NOT required in V1.

---

## Development Order (IMPORTANT)

When implementing from scratch, follow this order:

1. Domain layer (types, enums, money math)
2. Ledger engine + validation
3. Pre-allocation logic
4. Fair split algorithm
5. Domain unit tests
6. Storage adapter (localStorage + import/export)
7. UI wiring (tabs + forms)
8. Polish & validation messaging

Do NOT start with UI.

---

## Definition of Done

Before declaring the task complete, the agent MUST:
- Ensure all existing domain tests pass
- Ensure `npm run build` succeeds
- Confirm:
  - deposits/withdrawals work
  - balances are derived from ledger
  - loot split works with all pre-allocation modes
  - commit creates ONE deposit tx for (setAside + remainder)
  - import/export replace-only works
- List any deviations or TODOs explicitly
- If split logic was changed, re-add/restore domain split tests.

---

## Agent Behavior Guidelines

- Do not invent features not in the spec.
- Do not simplify algorithms by introducing conversion or floating-point coin math.
- Do not refactor domain rules without explicit instruction.
- If a rule appears ambiguous, follow `SPEC.md`.
- If still ambiguous, make the **least powerful, most explicit** choice and document it.

---

End of AGENTS.md
