# Snapshare web app

React 18 and Vite frontend for Snapshare.

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env` and add the frontend Supabase project URL and public anon key.
3. Run `npm run dev`.

The anon key is expected in a browser application and is protected by Supabase Row Level Security. Never add a service-role key to this project.

## Required Supabase migrations

Run the migrations from the sibling backend repository in the same project configured by `VITE_SUPABASE_URL`, in filename order:

1. `snapshare-be/supabase/migrations/20260903_reliable_direct_messages.sql`
2. `snapshare-be/supabase/migrations/20260903_reliable_follows.sql`
3. `snapshare-be/supabase/migrations/20260907_explore_feed.sql`
4. `snapshare-be/supabase/migrations/20260908_lock_down_legacy_tables.sql`

The Explore migration is required for `/explore`, saved posts, reliable like counts, secure public profiles, and the recommendation RPC. The Explore page uses cursor pagination and records loaded recommendations as impressions; opening a tile records a click. Post detail remains the canonical post view.

## Verification

- `npm test` runs messaging and Explore state/ordering tests.
- `npm run lint` checks JavaScript and React code.
- `npm run build` creates the production bundle.
