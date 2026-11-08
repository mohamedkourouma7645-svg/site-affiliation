# Architektur

## Entscheidung: modularer Monolith im Monorepo
Keine Microservices am Anfang. Ein Next.js-Server (Web + API-Routen/Server Actions), eine PostgreSQL-Datenbank (Supabase), gemeinsame Fachlogik in Paketen, die Web **und** Mobile-App wiederverwenden.

```
marketplace/
├─ apps/
│  ├─ web/                 Next.js (App Router, TypeScript) – Kunde, Restaurant-, Fahrer-, Admin-Bereich
│  └─ mobile/              (Phase 10) Expo / React Native – nutzt @app/core + @app/design-tokens
├─ packages/
│  ├─ core/                reine Fachlogik, ohne Framework – auf Server UND Client lauffähig
│  │  ├─ money/            Cent-Arithmetik, Rundung, MwSt.-Herausrechnung
│  │  ├─ configurator/     universelle Konfigurator-Engine (Gruppen, Regeln, Mengen, 3D-Platzierung)
│  │  ├─ pricing/          Produktpreis + Bestellsumme (Rabatt, Gebühren, MwSt., Provision)
│  │  ├─ orders/           Bestellstatus-Automat (gespiegelt in SQL)
│  │  ├─ catalog/          Referenz-Kategorien, 14 EU-Allergene
│  │  └─ i18n/             de (Standard), en, fr
│  ├─ design-tokens/       Farben, Abstände, Schrift – CSS-Variablen + TS (für React Native)
│  └─ configurator-3d/     (Phase 5) React Three Fiber Renderer + 2D-Fallback
├─ supabase/
│  ├─ migrations/          vollständiges Schema + RLS
│  ├─ seed.sql             nur Referenzdaten (Länder, Rollen, Kategorien) – keine Fake-Restaurants
│  └─ tests/               RLS-/Sicherheitstests (plain PostgreSQL)
└─ docs/
```

## Module (Grenzen im Code)
| Modul | Ort | Status |
|---|---|---|
| Authentifizierung | Supabase Auth, Trigger `handle_new_user` | DB-Seite fertig, UI Phase 1b |
| Benutzer & Rollen | `profiles`, `roles`, `user_roles`, `app.has_permission` | fertig (DB) |
| Restaurants | `restaurants`, `restaurant_members`, Guard-Trigger | fertig (DB) |
| Katalog / Zutaten | `products`, `ingredients`, `ingredient_groups`, … | Schema fertig, UI Phase 3 |
| Konfigurator | `@app/core/configurator` | Engine fertig + getestet |
| Preise | `@app/core/pricing` | fertig + getestet |
| Warenkorb / Bestellungen | Schema + `transition_order()` | Checkout Phase 7 |
| Zahlungen | Schema `payments/refunds/payouts`, Webhook-Idempotenz | Stripe Phase 8 |
| Lieferung | `deliveries`, `delivery_offers`, `couriers` | Phase 9 |
| Benachrichtigungen | `notifications`, `push_tokens` | Phase 9/10 |
| Administration | Rollen mit Rechten, `audit_log`, `reports`, `data_requests` | UI Phase 11 |

## Sicherheitsprinzipien
1. **Row Level Security auf jeder Tabelle** (`force row level security`). Getestet in `supabase/tests/rls.test.sql`.
2. **Clients schreiben nie Preise, Bestellungen oder Zahlungen.** Bestellungen erstellt der Server (Service-Role) nach erneuter Validierung + Preisberechnung mit `@app/core`. Statuswechsel nur über `transition_order()` (prüft Rolle + erlaubten Übergang).
3. Kritische Spalten (Restaurant-Status, Provision, Stripe-Konto, Fahrer-Verifizierung, Sperrung) sind per Trigger nur für Admins änderbar.
4. Restaurant-Daten sind über zusammengesetzte Fremdschlüssel `(id, restaurant_id)` verbunden – ein Restaurant kann nicht auf Daten eines anderen verweisen.
5. Geld nur als ganze Cent (`int`), kaufmännische Rundung, Bestellungen speichern einen Preis-**Snapshot**.
6. Security-Header (CSP, HSTS, frame-ancestors none), Eingaben mit `zod` validiert.
7. Geplant: Rate-Limiting (Phase 7, z. B. Upstash/Redis oder Supabase Edge), Stripe-Webhook-Signaturprüfung (Phase 8), Backups (Supabase PITR – kostenpflichtiger Plan).

## Preisregeln (Konfigurator)
- Standardzutaten sind im Grundpreis enthalten; Entfernen senkt den Preis **nicht**.
- Jede Einheit über der Standardmenge kostet den Einheitspreis (optional je Größe).
- `freeQuantity` einer Gruppe wird auf die **günstigsten** Einheiten angerechnet.
- Server-Prüfung: `validateSelection()` + `priceProduct()` laufen vor jeder Bestellung erneut auf dem Server.

## 3D-Konzept (Phase 5)
- Three.js + React Three Fiber + drei; glTF/GLB mit Draco/Meshopt-Kompression, KTX2-Texturen, PBR-Materialien.
- **Ein Modell pro Zutat** (`ingredient_models`), keine verschmolzenen Gesamtmodelle.
- Platzierung datengetrieben pro Gruppe: `scatter_disc` (Pizza-Beläge), `stack` (Burger-Schichten), `fill` (Bowl/Döner), `none`.
- Lazy Loading + LOD; Pflicht-Fallbild (`fallback_image_url`) → 2D-Ansicht bei fehlendem WebGL oder schwachen Geräten.
- Realistische Lebensmittel-Modelle müssen **beschafft oder erstellt** werden (Fotogrammetrie/3D-Artist, Lizenz klären). Das ist der größte Aufwand der Phase 5.
