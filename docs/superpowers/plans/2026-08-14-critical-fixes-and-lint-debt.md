# Critical Fixes & Lint Debt — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff invites work for people who are not already signed in; the mechanic board and the owner dashboard show appointment times that agree with the booking screen; removing a mechanic can no longer strand their open tickets; and `pnpm lint` exits 0 so it can gate CI again.

**Architecture:** Four independent fixes on one branch. (1) `proxy.ts` lets `/invite/**` through before the unauthenticated redirect, which activates the sign-in/register branch already written into the invite page. (2) The UTC slot-formatting convention documented in `lib/availability.ts` gets exported as two shared formatters, and the three call sites that format a `scheduledAt` all read from them instead of rolling their own. (3) `DELETE /api/workshop/team/[userId]` refuses to remove a mechanic who still holds open tickets, pointing the admin at the reassignment control the board already has. (4) The 14 lint errors are cleared and `coverage/**` is restored to the ESLint ignore list.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma v7, NextAuth v4, Jest (node env), Tailwind v4, pnpm.

## Global Constraints

- **No new dependencies.** Every fix here is existing code.
- **No database migration.** Nothing in this plan touches `prisma/schema.prisma`.
- **Language split (CLAUDE.md):** all user-facing copy in Latin-American Spanish; all commits, comments, test names, identifiers and this doc in English.
- **Package manager is pnpm** — `pnpm test`, `pnpm lint`, `pnpm build`. Never `npm run`.
- **Next.js 16 is not the Next.js you know (AGENTS.md):** before touching routing or server-component APIs, read the relevant guide under `node_modules/next/dist/docs/`. The root proxy file is `proxy.ts` (the Next 16 rename of `middleware.ts`) and exports a **named** `proxy` function — keep that shape; see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- **Commit after every task**, English `type: subject` messages matching the existing log.
- **Before opening the PR:** `pnpm test` (writes `coverage/lcov.info`), then a SonarQube pass, then the PR in the `## Summary` / `## Test plan` format used since PR #1.

### Verified facts (do not re-derive)

- `proxy.ts`'s matcher is `['/((?!api|_next/static|_next/image|favicon.ico).*)']`, so `/invite/<token>` **is** matched. The `if (!token)` redirect at `proxy.ts:36` fires before anything else can handle that path, which makes `app/invite/[token]/page.tsx:31-56` — the whole "iniciá sesión o creá una cuenta" branch, including its correctly-encoded `callbackUrl` and pre-filled email/role — unreachable dead code.
- `/login` already validates `callbackUrl` against open redirects (`app/(auth)/login/page.tsx:44`), and so does `/select-role` (`:93`). Task 1 does not need to add that check; it already exists.
- Appointment slots are **UTC-anchored naive wall-clock times**. `lib/availability.ts:30-33` documents the decision and `getAvailableSlots` builds every slot with `Date.UTC(...)`. `ScheduleView.tsx:322` is the only caller that currently honors it with `timeZone: 'UTC'`.
- The two call sites that get it wrong are `app/(dashboard)/mechanic/board/AppointmentCard.tsx:16` (no `timeZone`, so a 09:00 turno renders 06:00 at UTC−3) and `app/(dashboard)/owner/page.tsx:60-61` (`toLocaleString` + `getDate()` in server-local time, so the date chip can land on the wrong day).
- Removing a mechanic sets `workshopId: null` (`app/api/workshop/team/[userId]/route.ts:34`). Every board and access query filters on `mechanic: { workshopId }` — `lib/activeRepairs.ts:29`, `lib/vehicleAccess.ts:22,35` — and so does the work-order ownership check at `app/api/workorders/[id]/route.ts:22`. The combined effect is that the removed mechanic's open tickets vanish from the board and become un-PATCHable by anyone, permanently.
- `lib/activeRepairs.ts` already exports `OPEN_WORK_ORDER_STATUSES`. Task 3 reuses it — do not write a second list of "open" statuses.
- The board already has a mechanic reassignment control: `TicketDialog.tsx:55` PATCHes `{ mechanicId }`, and `app/api/workorders/[id]/route.ts:34-39` validates the target is in the same workshop. Task 3 blocks removal and points at that flow; it does **not** build reassignment.
- `pnpm lint` currently exits 1 with 14 errors and 2 warnings: 11 × `no-explicit-any` in `__tests__/lib/workOrderStatusEffects.test.ts`, 1 × in `__tests__/lib/email.test.ts:14`, 1 × `react-hooks/set-state-in-effect` at `app/(auth)/select-role/page.tsx:49`, 1 × `no-require-imports` at `jest.config.js:1`. `tsc --noEmit` and `pnpm build` are both already clean.
- `eslint.config.mjs` calls `globalIgnores([...])` with an explicit list that **replaces** `eslint-config-next`'s defaults and omits `coverage/**`. Because `pnpm test` writes `coverage/lcov-report/*.js`, a test run makes lint report on generated files.
- The codebase's established answer to `react-hooks/set-state-in-effect` is a scoped `eslint-disable-next-line` with a written justification — see `ScheduleView.tsx:380`, `ScheduleView.tsx:589`, and `lib/useAutocompleteSuggestions.ts:30`. Task 4 follows that precedent rather than inventing a fifth pattern.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `proxy.ts` (modify) | Lets the public invite route reach its own page instead of bouncing to `/login` | 1 |
| `lib/availability.ts` (modify) | Owns the UTC slot convention *and* the formatters that render it, so no caller can drift again | 2 |
| `app/(dashboard)/mechanic/board/AppointmentCard.tsx` (modify) | Reads the shared time formatter | 2 |
| `app/(dashboard)/owner/page.tsx` (modify) | Reads the shared formatters for the date chip | 2 |
| `app/(dashboard)/owner/schedule/ScheduleView.tsx` (modify) | Drops its local formatter in favour of the shared one | 2 |
| `app/api/workshop/team/[userId]/route.ts` (modify) | Refuses removal while the mechanic holds open tickets | 3 |
| `__tests__/api/workshop-team-remove.test.ts` (modify) | Covers the new 409 | 3 |
| `__tests__/lib/workOrderStatusEffects.test.ts` (modify) | Replaces `as any` with a typed cast | 4 |
| `__tests__/lib/email.test.ts` (modify) | Replaces `as any` with a typed cast | 4 |
| `app/(auth)/select-role/page.tsx` (modify) | Scoped disable with justification, matching the existing convention | 4 |
| `eslint.config.mjs` (modify) | Restores `coverage/**` to the ignore list; exempts config files from `no-require-imports` | 4 |

---

### Task 1: Let invite links reach the invite page

The bug: the proxy bounces every unauthenticated request to `/login` with no `callbackUrl`. A mechanic who clicks an emailed invite while logged out registers, lands on `/workshop/setup`, and creates a **second workshop** instead of joining the one that invited them.

**Files:**
- Modify: `proxy.ts:30-38`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Allow the invite route through before the auth guard**

In `proxy.ts`, immediately **before** the `// Unauthenticated → login` block, add:

```ts
  // Public invite acceptance: the page itself renders a sign-in / create-account
  // branch for logged-out visitors and validates the token server-side, so the
  // redirect below must not swallow the link.
  if (pathname.startsWith('/invite/')) return NextResponse.next()
```

Placement matters — it must sit after the `isAuthPage` block and before `if (!token)`.

- [ ] **Step 2: Verify the previously dead branch is reachable**

The page at `app/invite/[token]/page.tsx:31-56` needs no change; confirm by reading that it already builds `/login?callbackUrl=…` and `/register?callbackUrl=…&email=…&role=MECHANIC`.

- [ ] **Step 3: Manual check**

With the dev server running, open an invite URL in a private window. Expected: the invite page renders with the workshop name and two buttons, **not** a redirect to `/login`. Signing in from there lands back on the invite page.

- [ ] **Step 4: Commit**

`fix: let invite links reach the invite page when logged out`

---

### Task 2: One UTC formatter for appointment times

The bug: slots are UTC-anchored by design, but only the booking screen formats them that way. The mechanic's board shows every turno three hours early at UTC−3, and the owner dashboard's date chip can show the wrong day.

**Files:**
- Modify: `lib/availability.ts` (append)
- Modify: `app/(dashboard)/mechanic/board/AppointmentCard.tsx:16,49`
- Modify: `app/(dashboard)/owner/page.tsx:60-61`
- Modify: `app/(dashboard)/owner/schedule/ScheduleView.tsx:320-322`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `SLOT_TIME_FORMATTER`, `SLOT_DAY_FORMATTER`, `SLOT_MONTH_FORMATTER` exported from `lib/availability.ts`.

- [ ] **Step 1: Export the formatters next to the convention they implement**

Append to `lib/availability.ts`:

```ts
// Slots are UTC-anchored naive wall-clock times (see the comment in getAvailableSlots).
// Every surface that renders a scheduledAt must format in UTC or it will show an hour
// the workshop never opened. These live here, beside the anchoring, so a new caller
// reaches for them instead of building a formatter with the wrong timezone.
export const SLOT_TIME_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
})
export const SLOT_DAY_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric', timeZone: 'UTC',
})
export const SLOT_MONTH_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  month: 'short', timeZone: 'UTC',
})
```

- [ ] **Step 2: Point the mechanic board at it**

In `AppointmentCard.tsx`, delete the local `TIME_FORMATTER` const and import `SLOT_TIME_FORMATTER` from `@/lib/availability`, using it at the existing call site (line 49).

- [ ] **Step 3: Point the owner dashboard at it**

In `app/(dashboard)/owner/page.tsx`, replace the two lines building the date chip:

```ts
    month: SLOT_MONTH_FORMATTER.format(a.scheduledAt).toUpperCase(),
    day: SLOT_DAY_FORMATTER.format(a.scheduledAt),
```

- [ ] **Step 4: Collapse ScheduleView's local copy**

In `ScheduleView.tsx`, delete `TIME_LABEL_FORMATTER` (and the now-redundant comment above it) and import `SLOT_TIME_FORMATTER` instead. This is a pure rename — the options are identical, so no rendered output changes here.

- [ ] **Step 5: Verify**

Run `npx tsc --noEmit`. Then, with a booked turno visible on both screens, confirm the hour shown on `/mechanic/board` matches the hour shown when booking on `/owner/schedule`.

- [ ] **Step 6: Commit**

`fix: format appointment times in UTC on the board and owner dashboard`

> **Out of scope, deliberately:** `ScheduleView.tsx:305-318` (`dateKey`) buckets slots by *local* calendar day while labelling them in UTC, and `next14Days` builds local midnights to match. Fixing it properly means giving `components/ui/date-picker.tsx` a UTC mode — it renders every cell with `getFullYear`/`getMonth`/`getDate` — which is a component design change, not a formatter swap. Left for its own pass; it only misfiles slots at positive UTC offsets or for workshops with very early/late hours, whereas the two fixes above are wrong for every non-UTC browser.

---

### Task 3: Refuse to remove a mechanic who still holds open tickets

The bug: clearing `workshopId` detaches the mechanic from every query that finds their work orders. Their open tickets leave the board and no one — not even an admin — can PATCH them again, so they can never be closed.

**Files:**
- Modify: `app/api/workshop/team/[userId]/route.ts:31-35`
- Test: `__tests__/api/workshop-team-remove.test.ts`

**Interfaces:**
- Consumes: `OPEN_WORK_ORDER_STATUSES` from `lib/activeRepairs.ts`.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Count the mechanic's open tickets before removing them**

In the DELETE handler, after the existing `target.workshopRole === 'ADMIN'` check and before the `user.update`, add:

```ts
  const openTickets = await prisma.workOrder.count({
    where: { mechanicId: userId, status: { in: OPEN_WORK_ORDER_STATUSES } },
  })
  if (openTickets > 0) {
    return NextResponse.json(
      {
        error: `Este mecánico tiene ${openTickets} ${openTickets === 1 ? 'ticket abierto' : 'tickets abiertos'}. Reasignalos desde el tablero antes de quitarlo del equipo.`,
      },
      { status: 409 }
    )
  }
```

Import `OPEN_WORK_ORDER_STATUSES` from `@/lib/activeRepairs`. Filtering on `mechanicId` alone is correct and sufficient: a mechanic belongs to exactly one workshop, and the handler has already confirmed this one is `target.workshopId === session.user.workshopId`.

- [ ] **Step 2: Add the test**

In `__tests__/api/workshop-team-remove.test.ts`, the `@/lib/prisma` mock factory (line 3) currently stubs **only** `user` — extend it, or the new guard dereferences `undefined`:

```ts
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    workOrder: { count: jest.fn() },
  },
}))
```

Add `const mockCount = prisma.workOrder.count as jest.Mock` beside the existing handles, and default it to `0` in the shared `beforeEach` so the existing success-path cases keep passing. Then add a case where `mockCount` resolves `2` and assert the `409` plus that `prisma.user.update` was never called. Assert whole `where()` objects rather than casting to `any` (the convention set by commit `5ddfdbf`).

- [ ] **Step 3: Surface the error in the roster UI**

`TeamRoster.tsx:104` currently ignores `res.ok` on removal (recorded as a known Minor in `.superpowers/sdd/progress.md`). Read the JSON body and show `data.error` through the existing `FormErrorBanner`, so the admin sees why the removal was refused instead of nothing happening.

- [ ] **Step 4: Check for already-orphaned data**

Run once against the dev database:

```sql
SELECT w.id, w.title, w.status FROM "WorkOrder" w
JOIN "User" u ON u.id = w."mechanicId"
WHERE u."workshopId" IS NULL AND w.status IN ('PENDING','IN_PROGRESS');
```

Any rows are work orders already stranded by a past removal. There is **no backfill possible** — the workshop link lived on the mechanic and is gone — so if rows come back, list them in the PR description so they can be closed by hand.

- [ ] **Step 5: Commit**

`fix: block removing a mechanic who still holds open work orders`

---

### Task 4: Clear the lint errors and restore the coverage ignore

The bug: `pnpm lint` exits 1, so it cannot gate CI, and the SonarQube step CLAUDE.md requires before every PR runs against a red baseline.

**Files:**
- Modify: `__tests__/lib/workOrderStatusEffects.test.ts` (11 sites)
- Modify: `__tests__/lib/email.test.ts:14`
- Modify: `app/(auth)/select-role/page.tsx:46-53`
- Modify: `eslint.config.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a green `pnpm lint`, which Task 5 depends on.

- [ ] **Step 1: Type the transaction mock**

In `__tests__/lib/workOrderStatusEffects.test.ts`, give the factory an explicit return type and replace every `tx as any` with `tx as unknown as Prisma.TransactionClient`:

```ts
import type { Prisma, WorkOrder } from '@prisma/client'

function makeTx() {
  return {
    workOrder: { update: jest.fn() },
    appointment: { update: jest.fn() },
    historyEntry: { findFirst: jest.fn(), create: jest.fn() },
  }
}

const asTx = (tx: ReturnType<typeof makeTx>) => tx as unknown as Prisma.TransactionClient
```

Then each call reads `await ON_STATUS_CHANGE.IN_PROGRESS!(asTx(tx), …)`. This keeps the mock's `jest.fn()` types intact for the assertions below each call — a plain widening cast would lose them.

- [ ] **Step 2: Type the resend mock**

In `__tests__/lib/email.test.ts:14`, replace `resendModule as any` with:

```ts
const { __mockSend: mockSend } = resendModule as unknown as { __mockSend: jest.Mock }
```

- [ ] **Step 3: Document the sessionStorage effect**

`app/(auth)/select-role/page.tsx:49` reads `sessionStorage` on mount, which cannot move to a lazy `useState` initializer — that runs during SSR, where `sessionStorage` is undefined. Follow the convention already used four times in this codebase and add a scoped disable with a real justification directly above line 49:

```ts
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is browser-only, so the registration hand-off cannot be read in a lazy useState initializer during SSR
```

- [ ] **Step 4: Fix the ESLint config**

In `eslint.config.mjs`, add `"coverage/**"` to the `globalIgnores` list (its omission is why `pnpm test` makes `pnpm lint` complain about generated report files), and exempt CommonJS config files from the TypeScript-only import rule:

```js
  {
    files: ["*.config.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
```

`jest.config.js` must stay CommonJS — `next/jest` is a CJS module and the Jest config is loaded outside the TypeScript pipeline.

- [ ] **Step 5: Verify**

Run `pnpm lint`. Expected: exit 0, zero errors, zero warnings. Then `pnpm test` and `pnpm lint` again in that order, to confirm a fresh `coverage/` no longer reintroduces findings.

- [ ] **Step 6: Commit**

`chore: clear lint errors and restore the coverage ignore`

---

### Task 5: Full verification, SonarQube pass, and PR

**Files:** none modified unless the checks below surface something.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: a PR against `dev`.

- [ ] **Step 1: Run the full gate**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: lint exits 0; every Jest test passes; `coverage/lcov.info` is regenerated; the build completes.

- [ ] **Step 2: Manual QA against a running app**

Run `docker compose up -d db` then `pnpm dev` (do not run the app container at the same time — both bind port 3000).

1. As an admin, invite a mechanic whose email has no account. Open the emailed link in a private window → the invite page renders with both buttons, **no** bounce to `/login`.
2. Register from that page → after `/select-role` you land back on the invite page, not `/workshop/setup`. Accept → you are STAFF at that workshop.
3. As an owner, book a turno for 09:00. Open `/mechanic/board` → the "Programado" card reads **09:00**, matching the booking screen.
4. Check the owner dashboard's upcoming-appointment chip shows the same calendar day the owner picked.
5. Check that mechanic in on a vehicle so they hold an open ticket, then try to remove them from `/mechanic/team` → 409, and the roster shows the Spanish message naming the ticket count.
6. Reassign the ticket to another mechanic from the board's ticket dialog, then remove them again → succeeds.

- [ ] **Step 3: SonarQube review (required by CLAUDE.md before a PR)**

Use the `sonarqube:sonarqube-reviewer` agent against the branch diff. Fix any new Critical/Blocker issue or quality-gate failure before continuing; `sonarqube:sonar-fix-issue` handles rule-specific ones. Run `pnpm test` first so `coverage/lcov.info` is not stale.

- [ ] **Step 4: Branch and open the PR**

All work lands on `dev`, so the PR targets `dev`.

```bash
git checkout -b fix/invite-links-timezones-and-staff-removal
git push -u origin fix/invite-links-timezones-and-staff-removal
gh pr create --base dev --title "fix: invite links, appointment timezones, staff removal, and lint" --body "$(cat <<'EOF'
## Summary

- Invite links now reach the invite page when the recipient is not signed in — the proxy was bouncing them to `/login` with no callback, so a new mechanic ended up creating a second workshop instead of joining the one that invited them
- Appointment times are formatted in UTC on the mechanic board and the owner dashboard, matching the UTC anchoring `lib/availability.ts` has always used for slots; the formatters now live beside that convention so a new caller cannot drift again
- Removing a mechanic who still holds open work orders is refused with a Spanish 409 naming the count, instead of silently stranding those tickets off the board where no one could close them
- Cleared the 14 ESLint errors and restored `coverage/**` to the ignore list, so `pnpm lint` exits 0 and can gate CI again

## Test plan
EOF
)"
```

Fill the `## Test plan` section with checked boxes for each verification actually run, following PRs #8 and #10.
