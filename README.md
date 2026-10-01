# Ambag

A web app for student group projects, built for phones first and widening to a sidebar layout on desktop.

Ambag is built on one premise: **a task only counts as done when proof is attached.** Every state change appends to an immutable activity log, and that log can be shared read-only with a professor.

> **Status: early prototype.** There is no backend and no authentication yet. All data is mock data held in an in-memory React context, so a hard page refresh resets all state. See [Limitations](#limitations).

## Features

- **Claim tasks from a pool** — open tasks can be claimed ("call dibs") alongside a view of your own tasks.
- **Proof-gated completion** — proof can be submitted as a File, a Link, or Text. Links are checked before they are stored and open in a new tab for the reviewer; files are type- and size-checked and the reviewer can download them.
- **Leader review** — only the group leader accepts or rejects submitted proof, and a rejection requires a non-empty reason. A leader reviewing their own work is called out in the shared log.
- **Immutable activity log** — state changes append to a log rather than overwriting history.
- **Read-only share view** — a standalone public page for a professor. The leader creates links with random tokens and can revoke each one; an unknown or revoked token shows nothing.
- **Contribution ledger** — per-member on-time / late / overdue / swap counts, computed live from the tasks. On time or late is judged by when the proof went in, so a slow review never makes someone late.
- **Task swaps with a 48-hour rule** — a member asks to hand a task to a teammate or release it to the pool, and the leader approves or denies. Requests close 48 hours before the deadline, and a request that has gone stale (proof already in, or now inside the window) can't be approved.
- **Demo accounts** — switch between Jamie (member) and Maya (leader) from the sidebar or the avatar in the phone header, to try both sides of each rule.
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
| Testing | Vitest, React Testing Library, jsdom |

Tailwind v4 is configured through CSS, so there is deliberately no `tailwind.config.js`. Design tokens live in [globals.css](app/src/app/globals.css).

## Getting started

Requires Node.js 22.22 or newer (see `engines` in [package.json](app/package.json)) and npm.

```bash
git clone https://github.com/Caelusary/ambag.git
cd ambag
npm --prefix app install
npm --prefix app run dev
```

Then open http://localhost:3000. The root route redirects to `/pool`.

You can also run commands from inside the app directory:

```bash
cd app
npm install
npm run dev
```

### Scripts

Run from `app/` (or prefix with `npm --prefix app`):

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format everything with Prettier |
| `npm run format:check` | Fail if anything isn't formatted |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run the Vitest suite on change |

[CI](.github/workflows/ci.yml) runs lint, the format check, the tests, the build and a type check on every push and pull request to `main`.

## Routes

| Route | Description |
|---|---|
| `/pool` | Open tasks to claim, plus your own tasks |
| `/review` | Leader only: accept or reject submitted proof, and approve or deny swap requests |
| `/ledger` | Per-member on-time / late / overdue / swap counts |
| `/share` | Leader manages share links; everyone sees the read-only professor view |
| `/task/[id]` | Task detail with the 4-step status stepper |
| `/task/[id]/proof` | Submit proof as File, Link, or Text |
| `/task/[id]/swap` | Request a targeted swap, or ask to release the task back to the pool |
| `/s/[token]` | Standalone public read-only view, shown only for a live token (`/s/demo` exists from the start) |

## Project structure

```
ambag/
├── README.md
├── .github/workflows/    CI
└── app/                  Next.js application (the only source directory)
    └── src/
        ├── app/
        │   ├── (shell)/  Routes inside the app shell (sidebar or tab bar, plus header)
        │   ├── s/        Standalone public share view
        │   └── globals.css
        ├── components/
        │   ├── Shell.tsx, Sidebar.tsx, TabBar.tsx, Header.tsx, nav.ts
        │   ├── DemoUserSwitch.tsx  Jamie / Maya account switch
        │   ├── ShareLinks.tsx, PublicShare.tsx  Creating, revoking and checking share links
        │   ├── task/     Pieces shared by the task pages (card header, proof view, not-found)
        │   └── ui/       Button, Card, Dialog, SegmentedControl, Stepper, Tag, fields, feedback
        └── lib/
            ├── clock.ts       Demo clock anchored to a fixed epoch
            ├── constants.ts   Hour length, swap cutoff, stepper labels
            ├── store.tsx      In-memory mock data store (React context)
            ├── rules.ts       Every permission rule, swap approval and the ledger calculation
            ├── types.ts       Types and display helpers
            ├── validation.ts  Length limits and the proof link check
            └── useRouteTask.ts
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

[clock.ts](app/src/lib/clock.ts) anchors the demo to a fixed epoch so that the server and the client render identically, avoiding a hydration mismatch. Once mounted, the clock advances in real time so deadline-derived rules such as the 48-hour swap cutoff recompute live.

Every rule about who may do what lives in [rules.ts](app/src/lib/rules.ts). These rules are checked at three levels:

- **Task detail page:** uses them to decide which buttons to show. Inside the swap window it says swaps are closed rather than linking to a page that would refuse.
- **Proof, swap and review pages:** check them again, so typing `/task/5/proof` into the address bar can't resubmit an accepted task. The swap page also re-checks the cutoff on confirm, since the clock keeps moving while it's open.
- **Store actions** in [store.tsx](app/src/lib/store.tsx): refuse anything the rules don't allow, which covers a double click or a stale tab.

Untrusted input is checked in [validation.ts](app/src/lib/validation.ts):

- **Proof links:** only `http` and `https` are allowed, and a bare host gets `https://` added. The check runs again when a link is rendered ([ProofView](app/src/components/task/ProofView.tsx)), so a `javascript:` value can never become a clickable link.
- **Proof files:** must be a PDF, image, Office or text file of up to 10 MB, and the browser-reported type must match the extension.
- **Proof text and reject reasons:** have length limits.

A task moves from Assigned to Seen when its assignee opens the task detail page; that is the only thing the "Seen" step records.

Share tokens are 128 random bits. A token that never existed and one that was revoked get the same answer, so nobody can tell which tokens were ever real. Share pages are sent with `X-Robots-Tag: noindex` and `Referrer-Policy: no-referrer`, so tokens stay out of search engines and out of the Referer sent to sites a viewer clicks through to. Those headers, plus the security headers on every page, are set in [next.config.ts](app/next.config.ts).

## Backend contract

Everything above runs in the browser, so anyone with dev tools can skip it. When Supabase lands, the database has to enforce the same rules on its own. Each one below lives in [rules.ts](app/src/lib/rules.ts) today:

| Rule | Where the backend should enforce it |
|---|---|
| Only an open task can be claimed, and it goes to the caller | `claim_task` RPC (a database function the client calls) with a conditional update on `status = 'open'` |
| Only the assignee submits proof, and only while assigned, seen or rejected | `submit_proof` RPC checking `assignee = auth.uid()` |
| Only the leader accepts or rejects, and only submitted work | RPCs checking the caller's role in `group_members` |
| A swap request needs the assignee, an in-progress task and no pending request, outside 48 hours | `request_swap` RPC, plus a partial unique index allowing one pending request per task |
| Approving a swap re-checks that the request still applies | `resolve_swap` RPC repeating `swapApprovalBlocker` |
| The activity log only grows | Insert-only table written by the RPCs; no update or delete grants |
| Length limits and http(s)-only links | `CHECK` constraints on the columns |
| Share links are random, revocable and scoped to one group | `share_links` table with a hashed token; the public view reads through an RPC that returns one group's log for a live token |
| Proof files are private | A private Storage bucket per group, short-lived signed URLs, a server-side size and type check |

Row-level security (RLS: Postgres rules on which rows each user can read and write) should deny direct writes to every table, so the RPCs are the only way in.
## Testing

```bash
npm --prefix app test
```

116 tests across 10 files:
- `lib/rules.test.ts` covers deadline formatting, every permission rule, the 48-hour cutoff boundary, stale swap approvals, and the ledger calculation.
- `lib/store.test.tsx` covers:
  - claiming, the Seen transition and resubmission after rejection;
  - on time and late judged by submission;
  - the log only ever growing;
  - every action refusing what the rules forbid;
  - share links being leader-only and unguessable.
- `lib/validation.test.ts` covers the link check against scheme tricks and the length limits, and `components/task/ProofView.test.tsx` checks a stored `javascript:` value never renders as a link.
- `components/PublicShare.test.tsx` checks a live, an unknown and a revoked token.
- The page tests under `app/(shell)/` render each page with the real store and cover:
  - claiming and the empty states;
  - leader-only review, the reject reason, and Escape closing the dialog with focus returned;
  - approving and denying both kinds of swap, and refusing a stale one;
  - the proof and swap guards, file type checks, and the swap cutoff passing mid-confirm;
  - the Seen transition.

## Limitations

This is a prototype. Known gaps:

- **No backend and no authentication.** All data is mock data in an in-memory React context ([store.tsx](app/src/lib/store.tsx)), so a hard page refresh resets it. The rules are enforced only in the browser until the [backend contract](#backend-contract) is built.
- **Accounts are a demo switch.** Jamie and Maya are hardcoded, and anyone can switch to the leader.
- **Share links only work in the browser that made them.** New links live in that browser's memory, so a professor opening one elsewhere sees "not valid". Only `/s/demo` works everywhere.
- **Uploaded files last for the session.** A file proof is kept as an in-memory object URL, not uploaded anywhere.
- **A leader's own work has no second reviewer.** The leader can accept their own task; the shared log says so, but nobody else checks it.
- **The ledger only knows this demo's tasks.** It has no history from before the seed data.

## Planned

Not yet implemented:

- Supabase authentication, with the [backend contract](#backend-contract) enforced in the database
- Groups joined via invite code, with leader/member roles from the group
- Proof files in private Storage
- A co-reviewer for the leader's own work

## License

[MIT](LICENSE) © 2026 Zachary Scott Ruiz
