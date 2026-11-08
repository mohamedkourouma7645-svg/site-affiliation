-- Reference data only. No restaurants, products or users are created here:
-- partner restaurants register themselves and are verified by an admin.

insert into public.countries (code, name, currency, default_locale, locales, active) values
  ('DE', '{"de":"Deutschland","en":"Germany","fr":"Allemagne"}', 'EUR', 'de', '{de,en,fr}', true),
  ('AT', '{"de":"Österreich","en":"Austria","fr":"Autriche"}', 'EUR', 'de', '{de,en}', false),
  ('FR', '{"de":"Frankreich","en":"France","fr":"France"}', 'EUR', 'fr', '{fr,en}', false)
on conflict (code) do nothing;

insert into public.roles (key, description, is_admin, permissions) values
  ('customer', 'Kund:in', false, '{}'),
  ('courier', 'Fahrer:in', false, '{}'),
  ('restaurant_partner', 'Restaurant-Partner:in (Mitgliedschaft je Restaurant in restaurant_members)', false, '{}'),
  ('admin_super', 'Super-Admin – alle Rechte', true, '{*}'),
  ('admin_operations', 'Betrieb: Restaurants, Fahrer, Bestellungen, Lieferungen',
    true, '{restaurants.read,restaurants.manage,couriers.read,couriers.manage,orders.read,orders.manage,deliveries.manage,catalog.manage,users.read}'),
  ('admin_support', 'Support & Moderation',
    true, '{users.read,orders.read,support.manage,moderation.manage,restaurants.read}'),
  ('admin_finance', 'Finanzen: Zahlungen, Erstattungen, Provisionen',
    true, '{payments.read,payments.manage,orders.read,restaurants.read,settings.manage}'),
  ('admin_privacy', 'Datenschutz (DSGVO-Anfragen) & Audit',
    true, '{privacy.manage,audit.read,users.read,users.manage}'),
  ('admin_marketing', 'Promotions & Gesponserte Platzierungen',
    true, '{promotions.manage,restaurants.read}')
on conflict (key) do nothing;

-- Placeholder business values – MUST be confirmed by the business owner before launch.
insert into public.platform_settings (key, value) values
  ('commission_default_bp', '1500'),
  ('service_fee', '{"type":"fixed","cents":0}'),
  ('fees_vat_rate_bp', '1900')
on conflict (key) do nothing;

insert into public.categories (slug, name, configurator_kind, icon, sort_order) values
  ('pizza', '{"de":"Pizza","en":"Pizza","fr":"Pizzas"}', 'pizza', '🍕', 10),
  ('burger', '{"de":"Burger","en":"Burgers","fr":"Burgers"}', 'burger', '🍔', 20),
  ('doener-kebab', '{"de":"Döner & Türkisch","en":"Kebab & Turkish","fr":"Kebabs & turc"}', 'kebab', '🥙', 30),
  ('sandwiches-wraps', '{"de":"Sandwiches & Wraps","en":"Sandwiches & wraps","fr":"Sandwichs & wraps"}', null, '🥪', 40),
  ('pasta', '{"de":"Pasta","en":"Pasta","fr":"Pâtes"}', 'pasta', '🍝', 50),
  ('sushi', '{"de":"Sushi & Japanisch","en":"Sushi & Japanese","fr":"Sushis & japonais"}', null, '🍣', 60),
  ('bowls-salate', '{"de":"Bowls & Salate","en":"Bowls & salads","fr":"Bowls & salades"}', 'bowl', '🥗', 70),
  ('chicken', '{"de":"Chicken","en":"Chicken","fr":"Poulet"}', null, '🍗', 80),
  ('tacos-burritos', '{"de":"Tacos & Burritos","en":"Tacos & burritos","fr":"Tacos & burritos"}', null, '🌮', 90),
  ('pommes-snacks', '{"de":"Pommes & Snacks","en":"Fries & snacks","fr":"Frites & snacks"}', null, '🍟', 100),
  ('indisch', '{"de":"Indisch","en":"Indian","fr":"Indien"}', null, '🍛', 110),
  ('chinesisch', '{"de":"Chinesisch","en":"Chinese","fr":"Chinois"}', null, '🥡', 120),
  ('thai', '{"de":"Thailändisch","en":"Thai","fr":"Thaïlandais"}', null, '🍜', 130),
  ('italienisch', '{"de":"Italienisch","en":"Italian","fr":"Italien"}', null, '🇮🇹', 140),
  ('afrikanisch', '{"de":"Afrikanisch","en":"African","fr":"Africain"}', null, '🍲', 150),
  ('traditionell', '{"de":"Hausmannskost","en":"Traditional","fr":"Plats traditionnels"}', null, '🥘', 160),
  ('desserts', '{"de":"Desserts","en":"Desserts","fr":"Desserts"}', null, '🍰', 170),
  ('eis', '{"de":"Eis","en":"Ice cream","fr":"Glaces"}', null, '🍨', 180),
  ('crepes-waffeln', '{"de":"Crêpes & Waffeln","en":"Crêpes & waffles","fr":"Crêpes & gaufres"}', null, '🧇', 190),
  ('baeckerei', '{"de":"Bäckerei & Konditorei","en":"Bakery & pastry","fr":"Boulangerie & pâtisserie"}', null, '🥐', 200),
  ('getraenke', '{"de":"Getränke","en":"Drinks","fr":"Boissons"}', null, '🥤', 210),
  ('kindermenues', '{"de":"Kindermenüs","en":"Kids'' menus","fr":"Menus enfants"}', null, '🧒', 220)
on conflict do nothing;

-- Sub-categories (examples from the product brief; extendable at runtime)
insert into public.categories (slug, parent_id, name, configurator_kind, sort_order)
select v.slug, p.id, v.name::jsonb, v.kind::public.configurator_kind, v.sort
from (values
  ('pizza-margherita', 'pizza', '{"de":"Margherita"}', 'pizza', 1),
  ('pizza-salami', 'pizza', '{"de":"Salami"}', 'pizza', 2),
  ('pizza-vegetarisch', 'pizza', '{"de":"Vegetarisch"}', 'pizza', 3),
  ('pizza-eigene', 'pizza', '{"de":"Eigene Pizza"}', 'pizza', 99),
  ('burger-cheeseburger', 'burger', '{"de":"Cheeseburger"}', 'burger', 1),
  ('burger-smash', 'burger', '{"de":"Smash Burger"}', 'burger', 2),
  ('burger-chicken', 'burger', '{"de":"Chicken Burger"}', 'burger', 3),
  ('burger-veggie', 'burger', '{"de":"Veggie Burger"}', 'burger', 4),
  ('burger-eigener', 'burger', '{"de":"Eigener Burger"}', 'burger', 99),
  ('kebab-doener', 'doener-kebab', '{"de":"Döner"}', 'kebab', 1),
  ('kebab-duerum', 'doener-kebab', '{"de":"Dürüm"}', 'kebab', 2),
  ('kebab-pide', 'doener-kebab', '{"de":"Pide"}', null, 3),
  ('kebab-lahmacun', 'doener-kebab', '{"de":"Lahmacun"}', null, 4),
  ('bowls-poke', 'bowls-salate', '{"de":"Poke Bowls"}', 'bowl', 1),
  ('bowls-eigene', 'bowls-salate', '{"de":"Eigene Bowl"}', 'bowl', 99)
) as v(slug, parent, name, kind, sort)
join public.categories p on p.slug = v.parent and p.restaurant_id is null
on conflict do nothing;
