# Recht & Compliance (Deutschland/EU) – offene Punkte

**Keine Rechtsberatung.** Alles unten muss von Fachleuten geprüft werden.

| Thema | Technisch vorbereitet | Prüfung durch |
|---|---|---|
| Impressum (§ 5 DDG) | Seite vorhanden (Entwurf) | Anwalt |
| Datenschutzerklärung, DSGVO, AV-Verträge (Supabase, Stripe, Karten, Hosting) | `data_requests` (30-Tage-Frist), Standort gerundet, Marketing-Opt-in mit Zeitstempel | Datenschutz-Anwalt / DSB |
| Cookie-/Einwilligungs-Banner (TDDDG § 25) | aktuell keine Tracking-Cookies | Anwalt |
| AGB Kunden, Restaurants, Fahrer | Seite vorhanden (Entwurf) | Anwalt |
| Preisangaben (PAngV): Endpreise inkl. MwSt., alle Gebühren vor Bestellung | Bruttopreise, Gebühren getrennt ausgewiesen | Anwalt |
| MwSt.: Speisen 7 % (seit 01.01.2026), Getränke 19 %, Liefer-/Servicegebühr? | Steuersatz je Produkt + konfigurierbarer Gebührensatz | **Steuerberater** |
| Allergene (LMIV, 14 Hauptallergene) & Zusatzstoffe | Felder `allergens`/`additives` an Produkt + Zutat, Snapshot in Bestellung | Lebensmittelrecht |
| Widerruf: bei verderblichen Speisen i. d. R. ausgeschlossen (§ 312g BGB) | Stornoregeln im Status-Automaten | Anwalt |
| Plattformpflichten (DSA, P2B-Verordnung, Ranking-Transparenz, „Gesponsert“-Kennzeichnung) | `reports`, `is_sponsored` | Anwalt |
| DAC7-Meldepflicht (Plattformbetreiber) | Daten in `restaurants` (legal_name, vat_id) | Steuerberater |
| Zahlungen: Marktplatz-Modell, Geldwäsche/ZAG | Stripe Connect übernimmt Lizenz-/KYC-Thema | Zahlungsdienst-/Rechtsberatung |
| Fahrer: Scheinselbständigkeit vs. Anstellung | – | Arbeitsrecht |
| Barrierefreiheit (BFSG, seit 28.06.2025 für E-Commerce) | WCAG-2.1-AA-Test automatisiert, 44-px-Touchziele | Audit |
| Markenname | Arbeitstitel „Tellerwerk“ | DPMA/EUIPO-Recherche |
