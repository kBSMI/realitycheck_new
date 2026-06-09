# AI Reality Check Production Enterprise Foundation - Updated Full Project

Generated: 2026-06-08

## Source

Based on `AI_Reality_Check_PRODUCTION_ENTERPRISE_FOUNDATION_FULL_PROJECT.zip`, updated in:

`/Users/kbeg/Documents/Codex/2026-06-08/files-mentioned-by-the-user-ai/enterprise_project`

## Includes

- Editable `src/` source tree
- `docs/`
- `supabase/` migrations
- package and TypeScript/Vite/ESLint/Tailwind config
- `.env.example`

## Excludes

- `node_modules/`
- `dist/`
- local generated review packages

## Verification Passed

- `npx tsc -p tsconfig.app.json --noEmit`
- `npm run test` - 69/69 tests passed
- `npm run lint`
- `npm run build`
- Browser smoke test at `http://127.0.0.1:5173/`
  - `/`
  - `/auth`
  - `/pricing`
  - `/admin`
  - `/enterprise/dashboard`
  - 0 console errors

## Notes

- SMI scoring remains deterministic and local-first.
- No external AI agent is used for scoring.
- Supabase uses the official `@supabase/supabase-js` client.
- Stripe checkout/webhook helpers require server-only secrets before live use.
