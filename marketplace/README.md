# Food-Marketplace mit 3D-Konfigurator (Arbeitstitel „Tellerwerk“)

Status: **Phase 1** (Architektur, Datenbank, Kernlogik, erster Bildschirm). Noch nicht produktionsreif.

## Installation

```bash
cd marketplace
corepack enable            # aktiviert pnpm
pnpm install
cp apps/web/.env.example apps/web/.env.local   # Supabase-Werte eintragen (optional in Phase 1)
pnpm dev                   # http://localhost:3000
```

## Tests

```bash
pnpm test                  # Unit-Tests (Preise, Konfigurator, Status, i18n, Design-Tokens)
pnpm typecheck
pnpm build
pnpm test:db               # Migration + RLS-Sicherheitstests gegen lokales PostgreSQL (psql/createdb nötig)
pnpm --filter @app/web exec playwright install chromium   # einmalig
pnpm test:e2e              # Browser-Tests (Handy + Desktop, inkl. Barrierefreiheit)
```

## Datenbank auf Supabase einspielen

```bash
npx supabase link --project-ref <ref>
npx supabase db push        # spielt supabase/migrations ein
psql "$DATABASE_URL" -f supabase/seed.sql
```

Dokumentation: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/DATABASE.md](docs/DATABASE.md) · [docs/COMPLIANCE.md](docs/COMPLIANCE.md) · [docs/ROADMAP.md](docs/ROADMAP.md)
