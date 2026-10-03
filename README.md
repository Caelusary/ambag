# Ambag

A web app for student group projects, built for phones first and widening to a sidebar layout on desktop.

Ambag is built on one premise: **a task only counts as done when proof is attached.** Every state change appends to an immutable activity log, and that log can be shared read-only with a professor.

Sign up to run a real group on Supabase, or open the demo from the log-in page to try a sample group with no account.

## Features

- **Claim tasks from a pool** — open tasks can be claimed ("call dibs") alongside a view of your own tasks.
- **Proof-gated completion** — proof can be submitted as a File, a Link, or Text. Links are checked before they are stored and open in a new tab for the reviewer; files are type- and size-checked and the reviewer can download them.
- **Leader review** — only the group leader accepts or rejects submitted proof, and a rejection requires a non-empty reason. A leader reviewing their own work is called out in the shared log.
- **Immutable activity log** — state changes append to a log rather than overwriting history.
- **Read-only share view** — a standalone public page for a professor. The leader creates links with random tokens and can revoke each one; an unknown or revoked token shows nothing.
- **Contribution ledger** — per-member on-time / late / overdue / swap counts, computed live from the tasks. On time or late is judged by when the proof went in, so a slow review never makes someone late.
- **Task swaps with a 48-hour rule** — a member asks to hand a task to a teammate or release it to the pool, and the leader approves or denies. Requests close 48 hours before the deadline, and a request that has gone stale (proof already in, or now inside the window) can't be approved.
- **Accounts and groups** — email and password sign-up. Whoever creates a group leads it and shares an 8-character invite code; teammates join with it. One account can belong to several groups and switch between them.
- **Live updates** — a teammate's claim, submission or review shows up without reloading.
- **Demo mode** — "Try the demo" on the log-in page opens a sample group kept in the browser, with a switch between Jamie (member) and Maya (leader) to try both sides of each rule.
- **Status stepper** — task detail shows a 4-step progression: Assigned → Seen → Submitted → Accepted.

## Tech stack

| | |
|---|---|
| Framework | Next.js 16.3.8 (App Router, Turbopack) |
| UI | React 19.2.4 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (CSS-based `@theme`) |
| Icons | lucide-react |
| Linting and formatting | ESLint 9, Prettier |
| Backend | Supabase: Postgres with RLS, Auth, Storage, Realtime |
| Testing | Vitest, React Testing Library, jsdom; pgTAP for the database |

Tailwind v4 is configured through CSS, so there is deliberately no `tailwind.config.js`. Design tokens live in [globals.css](app/src/app/globals.css).

## Getting started

Requires Node.js 22.22 or newer (see `engines` in [package.json](app/package.json)), npm, and Docker for the local database.

```bash
git clone https://github.com/Caelusary/ambag.git
cd ambag
npm --prefix app install
npx supabase start
npm --prefix app run dev
```

`npx supabase start` runs Postgres, Auth and Storage in Docker and applies [the migration](supabase/migrations). [seed.sql](supabase/seed.sql) adds a group with two accounts, so both sides of every rule can be tried at once. Their emails and password are at the top of that file.

Then open http://localhost:3000 and log in, or choose **Try the demo**, which needs no database at all.

### Environment

The app reads two variables, listed in [app/.env.example](app/.env.example):

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | The project's API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The project's anon (publishable) key. It's safe in the browser, because RLS does the protecting |

For local development, put the values that `npx supabase status` prints into `app/.env.development.local`. For the cloud project, put them in `app/.env.local` and in your host's environment settings. Both files are gitignored.

### Deploying the database

```bash
npx supabase login
npx supabase link --project-ref <project ref>
npx supabase db push
```

In the Supabase dashboard, set **Authentication → URL Configuration** to the deployed site URL, and add `<site>/auth/callback` as a redirect URL so the confirmation email's link works.

## Routes

| Route | Description |
|---|---|
| `/login`, `/signup` | Email and password, plus **Try the demo** |
| `/onboarding` | Create a group, or join one with an invite code |
| `/<space>/pool` | Open tasks to claim, plus your own; the leader adds tasks here |
| `/<space>/review` | Leader only: accept or reject submitted proof, and approve or deny swap requests |
| `/<space>/ledger` | Per-member on-time / late / overdue / swap counts |
| `/<space>/share` | The invite code, share links for the leader, and the read-only professor view |
| `/<space>/task/[id]` | Task detail with the 4-step status stepper |
| `/<space>/task/[id]/proof` | Submit proof as File, Link, or Text |
| `/<space>/task/[id]/swap` | Request a targeted swap, or ask to release the task back to the pool |
| `/s/[token]` | Standalone public read-only view, shown only for a live token (`/s/demo` is the demo's) |

`<space>` is `demo` for the demo, or a group's id. Both run the same page files.

## Project structure

```
ambag/
├── README.md
├── .github/workflows/    CI: the app's checks, and the database tests
├── supabase/
│   ├── migrations/       The whole schema: tables, RLS, RPCs, storage
│   ├── tests/            pgTAP tests for every rule the database enforces
│   └── seed.sql          Local-only accounts and a sample group
└── app/                  Next.js application
    └── src/
        ├── proxy.ts      Refreshes the session; sends signed-out visitors to /login
        ├── actions/      Server actions: sign-up, log-in, log-out, create and join a group
        ├── app/
        │   ├── [space]/  The app's pages, for the demo and for real groups alike
        │   ├── login/, signup/, onboarding/, auth/callback/
        │   ├── s/        Standalone public share view
        │   └── globals.css
        ├── components/
        │   ├── Shell.tsx, Sidebar.tsx, TabBar.tsx, Header.tsx, nav.ts
        │   ├── AccountMenu.tsx    Group switcher and log-out (the demo's account switch in demo mode)
        │   ├── ShareLinks.tsx, InviteCard.tsx, ShareContent.tsx  The Share page
        │   ├── auth/     The card shared by the log-in, sign-up and onboarding pages
        │   ├── task/     Pieces shared by the task pages (card header, proof view, add task)
        │   └── ui/       Button, Card, Dialog, Avatar, Stepper, Tag, fields, feedback
        └── lib/
            ├── store-context.ts  The interface every page uses, whichever store backs it
            ├── store.tsx         The demo's in-memory store
            ├── live-store.tsx    A real group's store: RPCs, uploads, live updates
            ├── group-data.ts     Reads a group from Supabase into the store's shapes
            ├── space.tsx         Demo or group, and the URL prefix links are built from
            ├── supabase/         Server and browser clients, the current user
            ├── rules.ts          Every permission rule, swap approval and the ledger calculation
            ├── auth-errors.ts    The only messages the auth pages will show
            └── clock.ts, constants.ts, types.ts, validation.ts, useRouteTask.ts
```

Tests sit next to what they cover as `*.test.ts(x)`.

## Design

Ambag uses an "Organic" design system: a cream ground, a terracotta primary accent, a sage secondary accent, Caprasimo headings over Figtree body text, and pill-shaped buttons and inputs.

The layout changes at the `lg` breakpoint (1024px), in [Shell.tsx](app/src/components/Shell.tsx):

- **Phones and tablets** get a native-app layout: a centred header with a small Ambag wordmark over the section title and the account switcher on the right, content capped at 640px, and a bottom tab bar.
- **Desktop** swaps the tab bar for a [sidebar](app/src/components/Sidebar.tsx) and widens the content to 1080px. Each page then uses the room it has:
  - The pool puts open tasks and your tasks side by side.
  - Review lays submissions out in a grid.
  - Task detail moves its actions into a sticky "Next step" panel.
  - The share view sets the summary beside the activity log.
  - The proof and swap forms stay at a single-column width, because a form stretched to 1080px is harder to fill in.

Both navigations read from one list in [nav.ts](app/src/components/nav.ts), so they can't drift apart. Layout was checked at 375, 768 and 1366px with no horizontal overflow. The ledger fits all five columns at 375px without scrolling.

## Notes on implementation

Pages don't know whether they're in the demo or a real group. They read [store-context.ts](app/src/lib/store-context.ts), which two providers implement: [store.tsx](app/src/lib/store.tsx) keeps the demo in memory, and [live-store.tsx](app/src/lib/live-store.tsx) sends each action through a database function, then refetches. It also refetches when a teammate changes something, over Supabase Realtime.

[clock.ts](app/src/lib/clock.ts) draws the first frame from a fixed instant on both server and client, so hydration matches: the demo's seed epoch, or the moment a real group's data was read. After mounting, the clock advances in real time, so deadline-derived rules such as the 48-hour swap cutoff recompute live.

Every rule about who may do what lives in [rules.ts](app/src/lib/rules.ts). These rules are checked at three levels:

- **Task detail page:** uses them to decide which buttons to show. Inside the swap window it says swaps are closed rather than linking to a page that would refuse.
- **Proof, swap and review pages:** check them again, so typing `/task/5/proof` into the address bar can't resubmit an accepted task. The swap page also re-checks the cutoff on confirm, since the clock keeps moving while it's open.
- **Store actions:** refuse anything the rules don't allow, which covers a double click or a stale tab.
- **The database:** checks every rule again inside the function that makes the change, since anyone can skip the browser. See [Backend](#backend).

Untrusted input is checked in [validation.ts](app/src/lib/validation.ts):

- **Proof links:** only `http` and `https` are allowed, and a bare host gets `https://` added. The check runs again when a link is rendered ([ProofView](app/src/components/task/ProofView.tsx)), so a `javascript:` value can never become a clickable link.
- **Proof files:** must be a PDF, image, Office or text file of up to 10 MB, and the browser-reported type must match the extension.
- **Proof text and reject reasons:** have length limits.

A task moves from Assigned to Seen when its assignee opens the task detail page; that is the only thing the "Seen" step records.

Auth follows the same pattern as the trip-planner project: server actions for sign-up and log-in, rate limited per client; [proxy.ts](app/src/proxy.ts) guarding every page except the auth pages, the demo and share links; and [auth-errors.ts](app/src/lib/auth-errors.ts), so an `?error=` in the URL can only ever show one of a fixed set of messages.

Share tokens are 128 random bits. A token that never existed and one that was revoked get the same answer, so nobody can tell which tokens were ever real. Share pages are sent with `X-Robots-Tag: noindex` and `Referrer-Policy: no-referrer`, so tokens stay out of search engines and out of the Referer sent to sites a viewer clicks through to. Those headers, plus the security headers on every page, are set in [next.config.ts](app/next.config.ts).

## Backend

[The migration](supabase/migrations/20261001120000_groups_tasks_and_rules.sql) enforces every rule from [rules.ts](app/src/lib/rules.ts) on its own:

| Rule | How the database enforces it |
|---|---|
| Only an open task can be claimed, and it goes to the caller | `claim_task` RPC (a database function the client calls), locking the row first |
| Only the leader adds tasks | `create_task` checks the caller's role in `group_members` |
| Only the assignee submits proof, and only while assigned, seen or rejected | `submit_proof`, which also checks that an uploaded file is in that task's folder |
| Only the leader accepts or rejects, and only submitted work | `accept_task` and `reject_task` |
| A swap request needs the assignee, an in-progress task and no pending request, outside 48 hours | `request_swap`, judged by the database clock, plus a partial unique index for one pending request per task |
| Approving a swap re-checks that the request still applies | `resolve_swap` repeats `swapApprovalBlocker` |
| The activity log only grows | Only the RPCs write it; clients get no insert, update or delete |
| Length limits and http(s)-only links | `CHECK` constraints on the columns |
| Share links are random, revocable and scoped to one group | Only the leader can read `share_links`; the public view calls `get_shared_group`, which returns one group's names, task statuses and log for a live token, and null otherwise |
| Proof files are private | A private `proofs` bucket with a 10 MB limit and a type allowlist, readable only by the group, served through hour-long signed URLs |

Row-level security (RLS: Postgres rules on which rows each user can read and write) lets members read their own groups and nothing else. No table grants any write, so the RPCs are the only way in.

## Testing

```bash
npm --prefix app test
npx supabase test db
```

The app has 122 tests across 12 files:
- `lib/rules.test.ts` covers deadline formatting, every permission rule, the 48-hour cutoff boundary, stale swap approvals, and the ledger calculation.
- `lib/store.test.tsx` covers:
  - claiming, the Seen transition and resubmission after rejection;
  - on time and late judged by submission;
  - the log only ever growing;
  - every action refusing what the rules forbid;
  - share links being leader-only and unguessable.
- `lib/validation.test.ts` covers the link check against scheme tricks and the length limits, and `components/task/ProofView.test.tsx` checks a stored `javascript:` value never renders as a link.
- `lib/auth-errors.test.ts` checks a crafted `?error=` can't put its own text on the page.
- `components/PublicShare.test.tsx` checks a live, an unknown and a revoked token, and `components/task/AddTask.test.tsx` covers adding a task.
- The page tests under `app/[space]/` render each page with the demo store and cover:
  - claiming and the empty states;
  - leader-only review, the reject reason, and Escape closing the dialog with focus returned;
  - approving and denying both kinds of swap, and refusing a stale one;
  - the proof and swap guards, file type checks, and the swap cutoff passing mid-confirm;
  - the Seen transition.

[The database tests](supabase/tests/rules.test.sql) sign in as a leader, a member and an outsider, then run 27 checks: each RPC's rule, the column checks, no direct writes, an outsider seeing nothing, and share links going dark when revoked. CI runs both suites.

## Limitations

Known gaps:

- **A leader's own work has no second reviewer.** The leader can accept their own task; the shared log says so, but nobody else checks it.
- **The leader can't be handed over.** Each group has one leader, fixed at creation.
- **Tasks can't be edited or deleted** once added.
- **Sign-up and log-in limits are per server instance.** They're kept in memory, so they're not exact once the app scales across instances.
- **Demo data lives in the browser.** A hard refresh resets it, and its share links only work in that browser, apart from `/s/demo`.

## Planned

Not yet implemented:

- A co-reviewer for the leader's own work
- Handing the leader role to someone else, and leaving a group
- Editing and deleting tasks

## License

[MIT](LICENSE) © 2026 Zachary Scott Ruiz
