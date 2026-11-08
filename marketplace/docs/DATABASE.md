# Datenbankschema (PostgreSQL / Supabase)

Datei: `supabase/migrations/20261108000000_init.sql` – 39 Tabellen, alle mit RLS.

| Bereich | Tabellen |
|---|---|
| Benutzer | `profiles` (1:1 auth.users), `roles` (Rechte-Liste), `user_roles`, `addresses` |
| Restaurants | `restaurants`, `restaurant_members` (owner/manager/staff), `restaurant_hours`, `delivery_zones` |
| Katalog | `categories` (global oder je Restaurant, beliebig erweiterbar), `products`, `product_variants` (Größen) |
| Konfigurator | `ingredients`, `ingredient_groups` (single/multiple, min/max, Gratis-Menge, 3D-Platzierung), `product_ingredients` (Preis, Standardmenge, max), `product_ingredient_prices` (Preis je Größe), `configurator_rules` (requires/excludes), `ingredient_models` (GLB, LOD, 2D-Fallback, Lizenz) |
| Bestellungen | `orders` (Summen-Check per Constraint, `checkout_id` für spätere Multi-Restaurant-Körbe), `order_items`, `order_item_ingredients` (Snapshot), `order_status_history`, `app.order_transitions` |
| Geld | `payments`, `refunds`, `payouts`, `app.webhook_events` (Idempotenz) |
| Lieferung | `couriers`, `deliveries`, `delivery_offers` (Grundlage für Dispatching) |
| Sonstiges | `promotions` (inkl. `is_sponsored`), `reviews`, `favorites`, `notifications`, `push_tokens`, `support_tickets`, `support_messages`, `reports` (DSA-Meldungen), `data_requests` (DSGVO), `audit_log`, `countries`, `platform_settings` |

Admin-Rollen: `admin_super`, `admin_operations`, `admin_support`, `admin_finance`, `admin_privacy`, `admin_marketing` – Rechte als Liste in `roles.permissions`, geprüft mit `app.has_permission()`.
