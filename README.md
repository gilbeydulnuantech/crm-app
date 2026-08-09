# CRM (React rewrite)

## Setup

```bash
npm install
cp .env.example .env.local   # then set VITE_API_BASE_URL to your real backend
npm run dev
```

Opens at http://localhost:5173

## What's built so far

- **Auth**: Login / Sign up page (`src/pages/Login.tsx`), session verification
  on load, token + current user stored in `localStorage` (same keys as the
  old vanilla app: `authToken`, `currentUser`) so nothing else on your backend
  needs to change.
- **Routing**: React Router with real URLs (`/dashboard`, `/contacts`,
  `/pipeline`, etc.) instead of show/hide divs. `RequireAuth` redirects to
  `/login` when there's no valid session.
- **App shell**: Sidebar (matches `sidebar.rtf` order: Dashboard, Contacts
  [with All/Archived/Tags/Import sub-links], Companies, Sales Pipeline,
  Tasks, Calendar, Reports, Settings) + top bar.
- **Dashboard**: static layout matching `dashboard.rtf` — stat cards,
  pipeline funnel, upcoming tasks, recent activity, recent contacts. Not
  wired to live data yet (all placeholder numbers).
- **Placeholder pages**: Contacts, Companies, Pipeline, Tasks, Calendar,
  Reports, Settings — routes exist, layouts come next.

## Next up

- Contacts page (stat bar, tabs, table, archived view, contact detail modal)
- Companies page
- Pipeline (kanban board + list view)
- Tasks (list + kanban toggle)
- Calendar (month/week/day/agenda views)
- Reports (tabbed sub-reports)
- Wiring React Query hooks to the webhook endpoints listed in `src/api/`
