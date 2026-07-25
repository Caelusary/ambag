# Ambag

A mobile-first web app for student group projects.

Ambag is built on one premise: **a task only counts as done when proof is attached.** Every state change appends to an immutable activity log, and that log can be shared read-only with a professor.

> **Status: early prototype.** There is no backend and no authentication yet. All data is mock data held in an in-memory React context, so a hard page refresh resets all state. See [Limitations](#limitations).

## Features

- **Claim tasks from a pool** — open tasks can be claimed ("call dibs") alongside a view of your own tasks.
- **Proof-gated completion** — proof can be submitted as a File, a Link, or Text.
- **Leader review** — submitted proof is accepted or rejected, and a rejection requires a non-empty reason.
- **Immutable activity log** — state changes append to a log rather than overwriting history.
- **Read-only share view** — a standalone public page with no navigation and no interactive controls, for sharing with a professor.
- **Contribution ledger** — per-member on-time / late / overdue / swap counts.
- **Task swaps with a 48-hour rule** — a swap request is blocked when the deadline is under 48 hours away. The cutoff is recomputed live rather than cached.
- **Status stepper** — task detail shows a 4-step progression: Assigned → Seen → Submitted → Accepted.

## Tech stack

| | |
|---|---|
| Framework | Next.js 16.2.12 (App Router, Turbopack) |
| UI | React 19.2.4 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (CSS-based `@theme`) |
| Icons | lucide-react |
| Linting | ESLint 9 |

Tailwind v4 is configured through CSS, so there is deliberately no `tailwind.config.js`. Design tokens live in `app/src/app/globals.css`.

## Getting started

Requires Node.js and npm.

```bash
git clone https://github.com/Caelusary/ambag.git
cd ambag
npm --prefix app install
npm --prefix app run dev
```

Then open http://localhost:3000 — the root route redirects to `/pool`.

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

## Routes

| Route | Description |
|---|---|
| `/pool` | Open tasks to claim, plus your own tasks |
| `/review` | Leader accepts or rejects submitted proof; rejection requires a reason |
| `/ledger` | Per-member on-time / late / overdue / swap counts |
| `/share` | In-app preview of the read-only professor view |
| `/task/[id]` | Task detail with the 4-step status stepper |
| `/task/[id]/proof` | Submit proof as File, Link, or Text |
| `/task/[id]/swap` | Request a targeted swap, or release the task back to the pool |
| `/s/[token]` | Standalone public read-only share view |

## Project structure

```
ambag/
├── README.md
└── app/                  Next.js application (the only source directory)
    └── src/
        ├── app/
        │   ├── (shell)/  Routes rendered inside the app shell (header + tab bar)
        │   ├── s/        Standalone public share view
        │   └── globals.css
        ├── components/
        │   └── ui/       Button, Card, Dialog, SegmentedControl, Stepper, Tag
        └── lib/
            ├── clock.ts  Demo clock anchored to a fixed epoch
            ├── store.tsx In-memory mock data store (React context)
            └── types.ts
```

## Design

Ambag uses an "Organic" design system: a cream ground, a terracotta primary accent, a sage secondary accent, Caprasimo headings over Figtree body text, and pill-shaped buttons and inputs.

Content caps at 480px and centers with equal gutters, becoming a rounded card on larger screens. Layout was verified with no horizontal overflow at 320, 375, 768, 1280, and 1920px. The ledger table scrolls inside its own container rather than breaking the page.

## Notes on implementation

`app/src/lib/clock.ts` anchors the demo to a fixed epoch so that the server and the client render identically, avoiding a hydration mismatch. Once mounted, the clock advances in real time so deadline-derived rules such as the 48-hour swap cutoff recompute live.

## Limitations

This is a prototype. Known gaps:

- **No backend and no authentication.** All data is mock data in an in-memory React context (`app/src/lib/store.tsx`). A hard page refresh resets all state.
- **The current user is hardcoded as "Jamie".** There are no real accounts, no groups, and no leader/member roles.
- **No tests.**
- **Leader approval/denial of swaps is not implemented.** Swap requests only reach a "pending" state.

## Planned

Not yet implemented:

- Supabase authentication
- Groups joined via invite code
- Per-group leader/member roles enforced with row-level security
- A desktop-first sidebar layout

## License

TODO: no license file is present in the repository.
