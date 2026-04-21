# Supabase Client Setup

## Files

### `server.ts` — Service Role Client
Uses `SUPABASE_SERVICE_ROLE_KEY`. Import this in all server-side code:
- Next.js Server Components
- Server Actions
- Route Handlers (`route.ts`)

The service role key bypasses Row Level Security (RLS), giving full database access. Never expose this key to the client.

### `client.ts` — Anon Key Client
Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Use this **only** for:
- Realtime subscriptions on the `screen_state` table (screens receiving live override pushes from admin)

All other data access goes through `server.ts`. The anon key is subject to RLS policies — all tables except `screen_state` deny anon access.

## Auth Pattern

This project does **not** use Supabase Auth. All authentication is handled by Next.js middleware (`src/middleware.ts`) using password-based session logic. Supabase is used purely as a database and realtime layer.

## How to Configure `.env.local`

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Navigate to **Project Settings → API**.
3. Copy the following values into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role / secret key>
ADMIN_PASSWORD=<choose a strong admin password>
GUEST_PASSWORD=<choose a guest password>
```

**Never commit `.env.local` to git.** It is listed in `.gitignore`.

## Applying Migrations

After configuring credentials, apply the schema via the Supabase Dashboard:

1. Open your project in the Supabase Dashboard.
2. Go to **SQL Editor**.
3. Run `supabase/migrations/001_initial_schema.sql` first.
4. Run `supabase/migrations/002_rls.sql` second.

Alternatively, use the Supabase CLI:
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```
