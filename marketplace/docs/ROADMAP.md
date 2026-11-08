# Status & nächste Schritte

## Phase 1 – erledigt und getestet
- Monorepo (pnpm), TypeScript strict
- Fachlogik `@app/core`: Geld, Konfigurator-Engine, Preise, Bestellsumme, Status-Automat, i18n (de/en/fr), Kategorien, Allergene – 31 Unit-Tests
- Design-System `@app/design-tokens` mit Kontrast-Test
- Datenbankschema (39 Tabellen) + RLS + Trigger + `transition_order()` – 35 Sicherheitstests auf PostgreSQL 16
- Startseite (Adresse, Lieferung/Abholung, Standort, Kategorien), Ergebnisseite mit ehrlichem Leerzustand, Rechtsseiten-Entwürfe, `/api/health` – 14 Browser-Tests (Handy + Desktop, Barrierefreiheit)

## Noch nicht gemacht
- Phase 1b: Anmelden/Registrieren/Passwort vergessen (UI) + Session-Middleware → braucht Supabase-Projekt
- Geocoding/Entfernungssuche (Kartendienst wählen)
- Alle weiteren Phasen 2–12

## Benötigte externe Dienste / Konten
| Dienst | Wofür | Ab Phase | Kosten |
|---|---|---|---|
| Supabase (Region Frankfurt, eu-central-1) | DB, Auth, Storage, Realtime | 1b | Free → Pro ca. 25 $/Monat |
| Vercel oder anderes EU-Hosting | Web-App | 2 | Free/Pro |
| Kartendienst (Mapbox, Google Maps oder HERE) | Geocoding, Karten, Routen | 2/9 | nutzungsabhängig |
| Stripe Connect (Testmodus zuerst) | Zahlungen, Provision, Auszahlungen | 8 | Gebühren pro Transaktion |
| E-Mail (z. B. Resend, Postmark) | Bestätigungen, Passwort | 1b | Free-Tier |
| Expo / EAS, Apple Developer (99 $/Jahr), Google Play (25 $) | Mobile Apps | 10 | ja |
| 3D-Modelle (3D-Artist / Fotogrammetrie / lizenzierte Assets) | Konfigurator | 5 | Budget nötig |
