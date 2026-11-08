-- =====================================================================
-- Initial schema – food marketplace (Phase 1)
-- Target: Supabase (PostgreSQL 15+). All money in integer cents.
-- Security model: Row Level Security on every table. Clients never write
-- prices, orders or payments directly; that is done by server code using
-- the service role or by SECURITY DEFINER functions that re-check rights.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists app;
grant usage on schema app to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.restaurant_status as enum ('pending_verification', 'active', 'suspended', 'closed');
create type public.restaurant_member_role as enum ('owner', 'manager', 'staff');
create type public.configurator_kind as enum ('pizza', 'burger', 'kebab', 'pasta', 'bowl', 'generic');
create type public.selection_mode as enum ('single', 'multiple');
create type public.rule_type as enum ('requires', 'excludes');
create type public.fulfilment_type as enum ('delivery', 'pickup');
create type public.order_status as enum ('received', 'awaiting_acceptance', 'accepted', 'preparing', 'ready', 'picked_up', 'in_delivery', 'delivered', 'collected', 'cancelled', 'rejected');
create type public.order_actor as enum ('system', 'customer', 'restaurant', 'courier', 'admin');
create type public.payment_status as enum ('requires_payment', 'processing', 'authorized', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded');
create type public.refund_status as enum ('requested', 'pending', 'succeeded', 'failed', 'rejected');
create type public.courier_status as enum ('pending_verification', 'verified', 'suspended');
create type public.delivery_status as enum ('unassigned', 'offered', 'assigned', 'at_restaurant', 'picked_up', 'delivered', 'failed', 'cancelled');
create type public.offer_status as enum ('offered', 'accepted', 'declined', 'expired');
create type public.promotion_type as enum ('percent', 'fixed_amount', 'free_delivery');
create type public.ticket_status as enum ('open', 'pending', 'resolved', 'closed');
create type public.report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');
create type public.data_request_type as enum ('export', 'deletion', 'rectification');
create type public.data_request_status as enum ('received', 'in_progress', 'completed', 'rejected');

-- Generic updated_at trigger
create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------
-- Countries & settings
-- ---------------------------------------------------------------------
create table public.countries (
  code char(2) primary key check (code = upper(code)),
  name jsonb not null,
  currency char(3) not null,
  default_locale text not null,
  locales text[] not null,
  active boolean not null default false
);

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- ---------------------------------------------------------------------
-- Users, roles, permissions
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 32),
  locale text not null default 'de' check (locale ~ '^[a-z]{2}$'),
  avatar_url text,
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles for each row execute function app.touch_updated_at();

create table public.roles (
  key text primary key,
  description text not null,
  is_admin boolean not null default false,
  permissions text[] not null default '{}'
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_key text not null references public.roles (key),
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles (id),
  primary key (user_id, role_key)
);
create index user_roles_role_idx on public.user_roles (role_key);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text check (char_length(label) <= 40),
  street text not null check (char_length(street) between 1 and 120),
  house_number text not null check (char_length(house_number) between 1 and 12),
  postal_code text not null check (char_length(postal_code) between 3 and 10),
  city text not null check (char_length(city) between 1 and 80),
  country_code char(2) not null references public.countries (code),
  extra text check (char_length(extra) <= 200),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default on public.addresses (user_id) where is_default;

-- ---------------------------------------------------------------------
-- Restaurants
-- ---------------------------------------------------------------------
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  legal_name text check (char_length(legal_name) <= 200),
  vat_id text check (char_length(vat_id) <= 20),
  description jsonb not null default '{}',
  cuisines text[] not null default '{}',
  status public.restaurant_status not null default 'pending_verification',
  verified_at timestamptz,
  email citext,
  phone text,
  street text not null,
  house_number text not null,
  postal_code text not null,
  city text not null,
  country_code char(2) not null references public.countries (code),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  timezone text not null default 'Europe/Berlin',
  currency char(3) not null default 'EUR',
  prep_time_minutes int not null default 20 check (prep_time_minutes between 1 and 240),
  offers_delivery boolean not null default true,
  offers_pickup boolean not null default true,
  accepting_orders boolean not null default false,
  commission_bp int check (commission_bp between 0 and 10000), -- null = platform default
  stripe_account_id text unique,
  logo_url text,
  cover_url text,
  rating_avg numeric(3, 2) not null default 0,
  rating_count int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index restaurants_status_city_idx on public.restaurants (status, country_code, city);
create index restaurants_geo_idx on public.restaurants (latitude, longitude);
create index restaurants_cuisines_idx on public.restaurants using gin (cuisines);
create trigger restaurants_touch before update on public.restaurants for each row execute function app.touch_updated_at();

create table public.restaurant_members (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.restaurant_member_role not null,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);
create index restaurant_members_user_idx on public.restaurant_members (user_id);

create table public.restaurant_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Monday (ISO - 1)
  opens_at time not null,
  closes_at time not null, -- closes_at <= opens_at means "past midnight"
  fulfilment public.fulfilment_type -- null = both
);
create index restaurant_hours_idx on public.restaurant_hours (restaurant_id, weekday);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  radius_m int check (radius_m between 100 and 50000),
  postal_codes text[],
  polygon jsonb, -- GeoJSON polygon, optional (PostGIS can be enabled later)
  delivery_fee_cents int not null check (delivery_fee_cents >= 0),
  min_order_cents int not null default 0 check (min_order_cents >= 0),
  eta_minutes int not null check (eta_minutes between 5 and 180),
  active boolean not null default true,
  check (radius_m is not null or postal_codes is not null or polygon is not null)
);
create index delivery_zones_restaurant_idx on public.delivery_zones (restaurant_id);

-- ---------------------------------------------------------------------
-- Catalogue. Child tables carry restaurant_id with composite foreign keys
-- so that rows can never point at another restaurant's data and RLS stays
-- a cheap equality check.
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug citext not null,
  parent_id uuid references public.categories (id) on delete set null,
  restaurant_id uuid references public.restaurants (id) on delete cascade, -- null = global taxonomy
  name jsonb not null check (name ? 'de'),
  configurator_kind public.configurator_kind,
  icon text,
  sort_order int not null default 0,
  active boolean not null default true
);
create unique index categories_global_slug on public.categories (slug) where restaurant_id is null;
create unique index categories_restaurant_slug on public.categories (restaurant_id, slug) where restaurant_id is not null;

create table public.ingredient_models (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_/-]+$'),
  owner_restaurant_id uuid references public.restaurants (id) on delete cascade, -- null = shared library
  glb_url text not null,
  lod_urls jsonb not null default '{}', -- {"low": "...", "medium": "..."}
  fallback_image_url text not null, -- 2D fallback is mandatory
  default_scale numeric not null default 1,
  placement_hint jsonb not null default '{}', -- e.g. {"instances": 12, "jitter": 0.2}
  file_size_bytes int check (file_size_bytes <= 5000000),
  license text not null,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name jsonb not null check (name ? 'de'),
  description jsonb not null default '{}',
  image_url text,
  configurator_kind public.configurator_kind,
  is_configurable boolean not null default false,
  vat_rate_bp int not null check (vat_rate_bp between 0 and 10000),
  allergens text[] not null default '{}',
  additives text[] not null default '{}',
  available boolean not null default true,
  sort_order int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, restaurant_id)
);
create index products_restaurant_idx on public.products (restaurant_id, category_id) where deleted_at is null;
create index products_name_search_idx on public.products using gin (to_tsvector('simple', name ->> 'de'));
create trigger products_touch before update on public.products for each row execute function app.touch_updated_at();

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  restaurant_id uuid not null,
  name jsonb not null check (name ? 'de'),
  price_cents int not null check (price_cents >= 0),
  scale numeric not null default 1 check (scale > 0),
  available boolean not null default true,
  sort_order int not null default 0,
  foreign key (product_id, restaurant_id) references public.products (id, restaurant_id) on delete cascade,
  unique (id, restaurant_id)
);
create index product_variants_product_idx on public.product_variants (product_id);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name jsonb not null check (name ? 'de'),
  image_url text,
  allergens text[] not null default '{}',
  additives text[] not null default '{}',
  model_id uuid references public.ingredient_models (id) on delete set null,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, restaurant_id)
);
create index ingredients_restaurant_idx on public.ingredients (restaurant_id);

create table public.ingredient_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  restaurant_id uuid not null,
  name jsonb not null check (name ? 'de'),
  selection public.selection_mode not null,
  min_select int not null default 0 check (min_select >= 0),
  max_select int check (max_select >= 1),
  max_total_quantity int check (max_total_quantity >= 1),
  free_quantity int not null default 0 check (free_quantity >= 0),
  placement jsonb not null default '{"type": "none"}',
  sort_order int not null default 0,
  foreign key (product_id, restaurant_id) references public.products (id, restaurant_id) on delete cascade,
  unique (id, restaurant_id),
  check (max_select is null or max_select >= min_select),
  check (selection = 'multiple' or coalesce(max_select, 1) = 1)
);
create index ingredient_groups_product_idx on public.ingredient_groups (product_id);

create table public.product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  group_id uuid not null,
  ingredient_id uuid not null,
  restaurant_id uuid not null,
  unit_price_cents int not null default 0 check (unit_price_cents >= 0),
  default_quantity int not null default 0 check (default_quantity >= 0),
  max_quantity int not null default 1 check (max_quantity >= 1),
  removable boolean not null default true,
  available boolean not null default true,
  sort_order int not null default 0,
  foreign key (product_id, restaurant_id) references public.products (id, restaurant_id) on delete cascade,
  foreign key (group_id, restaurant_id) references public.ingredient_groups (id, restaurant_id) on delete cascade,
  foreign key (ingredient_id, restaurant_id) references public.ingredients (id, restaurant_id) on delete cascade,
  unique (product_id, ingredient_id),
  unique (id, restaurant_id),
  check (default_quantity <= max_quantity)
);
create index product_ingredients_group_idx on public.product_ingredients (group_id);

create table public.product_ingredient_prices (
  product_ingredient_id uuid not null,
  variant_id uuid not null,
  restaurant_id uuid not null,
  unit_price_cents int not null check (unit_price_cents >= 0),
  primary key (product_ingredient_id, variant_id),
  foreign key (product_ingredient_id, restaurant_id) references public.product_ingredients (id, restaurant_id) on delete cascade,
  foreign key (variant_id, restaurant_id) references public.product_variants (id, restaurant_id) on delete cascade
);

create table public.configurator_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  restaurant_id uuid not null,
  rule_type public.rule_type not null,
  option_id uuid not null,
  target_option_id uuid not null,
  foreign key (product_id, restaurant_id) references public.products (id, restaurant_id) on delete cascade,
  foreign key (option_id, restaurant_id) references public.product_ingredients (id, restaurant_id) on delete cascade,
  foreign key (target_option_id, restaurant_id) references public.product_ingredients (id, restaurant_id) on delete cascade,
  check (option_id <> target_option_id)
);

-- ---------------------------------------------------------------------
-- Promotions
-- ---------------------------------------------------------------------
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants (id) on delete cascade, -- null = platform-funded
  code citext,
  title jsonb not null check (title ? 'de'),
  type public.promotion_type not null,
  value int not null check (value >= 0), -- bp for percent, cents for fixed
  min_order_cents int not null default 0,
  max_uses int,
  max_uses_per_user int default 1,
  uses int not null default 0,
  is_sponsored boolean not null default false, -- must be labelled "Anzeige"/"Gesponsert" in the UI
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  check (ends_at > starts_at),
  check (type <> 'percent' or value <= 10000)
);
create unique index promotions_code_idx on public.promotions (code) where code is not null;

-- ---------------------------------------------------------------------
-- Couriers
-- ---------------------------------------------------------------------
create table public.couriers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status public.courier_status not null default 'pending_verification',
  vehicle_type text not null check (vehicle_type in ('bicycle', 'ebike', 'scooter', 'car', 'foot')),
  city text not null,
  country_code char(2) not null references public.countries (code),
  is_online boolean not null default false,
  last_latitude double precision,
  last_longitude double precision,
  last_seen_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index couriers_online_idx on public.couriers (city) where is_online and status = 'verified';

-- ---------------------------------------------------------------------
-- Orders. Prices are a historical snapshot: later catalogue changes never
-- alter these rows. `checkout_id` groups orders of one checkout so that
-- multi-restaurant baskets can be added later (one order per restaurant).
-- ---------------------------------------------------------------------
create sequence public.order_number_seq start 100000;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique default nextval('public.order_number_seq'),
  checkout_id uuid not null default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  status public.order_status not null default 'received',
  fulfilment public.fulfilment_type not null,
  delivery_address jsonb, -- snapshot
  customer_note text check (char_length(customer_note) <= 500),
  currency char(3) not null default 'EUR',
  items_subtotal_cents int not null check (items_subtotal_cents >= 0),
  discount_cents int not null default 0 check (discount_cents >= 0),
  delivery_fee_cents int not null default 0 check (delivery_fee_cents >= 0),
  service_fee_cents int not null default 0 check (service_fee_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  vat_breakdown jsonb not null default '{}',
  commission_bp int not null check (commission_bp between 0 and 10000),
  commission_cents int not null check (commission_cents >= 0),
  restaurant_share_cents int not null,
  promotion_id uuid references public.promotions (id),
  estimated_ready_at timestamptz,
  estimated_delivery_at timestamptz,
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_cents = items_subtotal_cents - discount_cents + delivery_fee_cents + service_fee_cents),
  check (fulfilment = 'pickup' or delivery_address is not null),
  check (fulfilment = 'delivery' or delivery_fee_cents = 0)
);
create index orders_customer_idx on public.orders (customer_id, placed_at desc);
create index orders_restaurant_status_idx on public.orders (restaurant_id, status, placed_at desc);
create index orders_checkout_idx on public.orders (checkout_id);
create trigger orders_touch before update on public.orders for each row execute function app.touch_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  variant_name text,
  quantity int not null check (quantity between 1 and 99),
  unit_base_cents int not null check (unit_base_cents >= 0),
  unit_extras_cents int not null check (unit_extras_cents >= 0),
  unit_total_cents int not null,
  line_total_cents int not null,
  vat_rate_bp int not null,
  allergens text[] not null default '{}',
  configuration jsonb not null default '{}', -- full selection snapshot for re-ordering
  note text check (char_length(note) <= 300),
  check (unit_total_cents = unit_base_cents + unit_extras_cents),
  check (line_total_cents = unit_total_cents * quantity)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_item_ingredients (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  ingredient_id uuid references public.ingredients (id) on delete set null,
  ingredient_name text not null,
  group_name text not null,
  quantity int not null check (quantity >= 0),
  default_quantity int not null check (default_quantity >= 0),
  charged_quantity int not null check (charged_quantity >= 0),
  free_quantity int not null default 0 check (free_quantity >= 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  total_cents int not null check (total_cents = unit_price_cents * charged_quantity),
  allergens text[] not null default '{}'
);
create index order_item_ingredients_item_idx on public.order_item_ingredients (order_item_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  actor public.order_actor not null,
  actor_id uuid references public.profiles (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- Allowed transitions (mirrors packages/core/src/orders/status.ts – tested).
create table app.order_transitions (
  from_status public.order_status not null,
  to_status public.order_status not null,
  actors public.order_actor[] not null,
  fulfilment public.fulfilment_type,
  primary key (from_status, to_status)
);
insert into app.order_transitions (from_status, to_status, actors, fulfilment) values
  ('received', 'awaiting_acceptance', '{system}', null),
  ('received', 'cancelled', '{system,customer,admin}', null),
  ('awaiting_acceptance', 'accepted', '{restaurant,admin}', null),
  ('awaiting_acceptance', 'rejected', '{restaurant,admin,system}', null),
  ('awaiting_acceptance', 'cancelled', '{customer,admin}', null),
  ('accepted', 'preparing', '{restaurant,admin}', null),
  ('accepted', 'cancelled', '{restaurant,admin}', null),
  ('preparing', 'ready', '{restaurant,admin}', null),
  ('preparing', 'cancelled', '{admin}', null),
  ('ready', 'picked_up', '{courier,admin}', 'delivery'),
  ('ready', 'collected', '{restaurant,admin}', 'pickup'),
  ('ready', 'cancelled', '{admin}', null),
  ('picked_up', 'in_delivery', '{courier,admin}', 'delivery'),
  ('in_delivery', 'delivered', '{courier,admin}', 'delivery');

-- ---------------------------------------------------------------------
-- Payments (provider: Stripe Connect). No card data is ever stored.
-- ---------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider text not null default 'stripe',
  provider_payment_id text not null unique, -- e.g. PaymentIntent id
  status public.payment_status not null,
  amount_cents int not null check (amount_cents >= 0),
  currency char(3) not null,
  application_fee_cents int not null default 0,
  livemode boolean not null default false,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);
create trigger payments_touch before update on public.payments for each row execute function app.touch_updated_at();

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  amount_cents int not null check (amount_cents > 0),
  reason text not null,
  status public.refund_status not null default 'requested',
  provider_refund_id text unique,
  requested_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index refunds_order_idx on public.refunds (order_id);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  provider_payout_id text not null unique,
  amount_cents int not null,
  currency char(3) not null,
  status text not null,
  arrival_date date,
  created_at timestamptz not null default now()
);
create index payouts_restaurant_idx on public.payouts (restaurant_id, created_at desc);

-- Idempotency store for provider webhooks (verified server-side first).
create table app.webhook_events (
  provider text not null,
  event_id text not null,
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  primary key (provider, event_id)
);

-- ---------------------------------------------------------------------
-- Delivery
-- ---------------------------------------------------------------------
create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  courier_id uuid references public.couriers (user_id) on delete set null,
  status public.delivery_status not null default 'unassigned',
  courier_fee_cents int check (courier_fee_cents >= 0),
  pickup_eta timestamptz,
  dropoff_eta timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deliveries_courier_idx on public.deliveries (courier_id, status);
create trigger deliveries_touch before update on public.deliveries for each row execute function app.touch_updated_at();

-- Offers sent to couriers; enables a smarter dispatcher later.
create table public.delivery_offers (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries (id) on delete cascade,
  courier_id uuid not null references public.couriers (user_id) on delete cascade,
  status public.offer_status not null default 'offered',
  expires_at timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (delivery_id, courier_id)
);

-- ---------------------------------------------------------------------
-- Engagement, notifications, support, compliance
-- ---------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  restaurant_reply text check (char_length(restaurant_reply) <= 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index reviews_restaurant_idx on public.reviews (restaurant_id, created_at desc) where not hidden;

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  subject text not null check (char_length(subject) between 3 and 200),
  status public.ticket_status not null default 'open',
  priority smallint not null default 2 check (priority between 1 and 4),
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_tickets_requester_idx on public.support_tickets (requester_id);
create trigger support_tickets_touch before update on public.support_tickets for each row execute function app.touch_updated_at();

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  internal boolean not null default false, -- admin-only note
  created_at timestamptz not null default now()
);
create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

-- Notices under the EU Digital Services Act / user reports ("Signalements").
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('restaurant', 'product', 'review', 'user')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 2000),
  status public.report_status not null default 'open',
  resolution text,
  created_at timestamptz not null default now()
);

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.data_request_type not null,
  status public.data_request_status not null default 'received',
  details text,
  due_at timestamptz not null default (now() + interval '30 days'), -- GDPR Art. 12(3)
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- =====================================================================
-- Authorisation helpers (SECURITY DEFINER, fixed search_path)
-- =====================================================================
create or replace function app.has_permission(perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.key = ur.role_key
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid()
      and p.suspended_at is null
      and r.is_admin
      and (perm = any (r.permissions) or '*' = any (r.permissions))
  );
$$;

create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.key = ur.role_key
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid() and r.is_admin and p.suspended_at is null
  );
$$;

create or replace function app.is_restaurant_member(rid uuid, allowed public.restaurant_member_role[] default '{owner,manager,staff}')
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.restaurant_members m
    join public.profiles p on p.id = m.user_id
    where m.restaurant_id = rid and m.user_id = auth.uid() and m.role = any (allowed) and p.suspended_at is null
  );
$$;

create or replace function app.restaurant_is_public(rid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.restaurants r where r.id = rid and r.status = 'active');
$$;

create or replace function app.can_read_order(oid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.orders o
    where o.id = oid and (
      o.customer_id = auth.uid()
      or app.is_restaurant_member(o.restaurant_id)
      or exists (select 1 from public.deliveries d where d.order_id = o.id and d.courier_id = auth.uid())
      or app.has_permission('orders.read')
    )
  );
$$;

grant execute on all functions in schema app to anon, authenticated, service_role;

-- =====================================================================
-- Triggers: new user, restaurant ownership, guarded columns, audit
-- =====================================================================
create or replace function app.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (new.id, new.raw_user_meta_data ->> 'full_name', coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'de'));
  insert into public.user_roles (user_id, role_key) values (new.id, 'customer');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function app.handle_new_user();

-- Restaurant creator becomes owner; status can only be changed by admins.
create or replace function app.restaurant_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not app.has_permission('restaurants.manage') then
    if tg_op = 'INSERT' then
      new.status := 'pending_verification';
      new.verified_at := null;
      new.commission_bp := null;
      new.stripe_account_id := null;
      new.accepting_orders := false;
      new.created_by := auth.uid();
    else
      if new.status is distinct from old.status
         or new.verified_at is distinct from old.verified_at
         or new.commission_bp is distinct from old.commission_bp
         or new.stripe_account_id is distinct from old.stripe_account_id
         or new.rating_avg is distinct from old.rating_avg
         or new.rating_count is distinct from old.rating_count then
        raise exception 'Only platform administrators can change status, verification, commission, payout account or ratings'
          using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger restaurants_guard before insert or update on public.restaurants for each row execute function app.restaurant_before_write();

create or replace function app.restaurant_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is not null then
    insert into public.restaurant_members (restaurant_id, user_id, role) values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger restaurants_owner after insert on public.restaurants for each row execute function app.restaurant_after_insert();

create or replace function app.courier_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not app.has_permission('couriers.manage') then
    if tg_op = 'INSERT' then
      new.status := 'pending_verification';
      new.verified_at := null;
      new.is_online := false;
    elsif new.status is distinct from old.status or new.verified_at is distinct from old.verified_at then
      raise exception 'Only administrators can verify couriers' using errcode = '42501';
    elsif new.is_online and new.status <> 'verified' then
      raise exception 'Courier must be verified to go online' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger couriers_guard before insert or update on public.couriers for each row execute function app.courier_before_write();

create or replace function app.profile_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and new.suspended_at is distinct from old.suspended_at and not app.has_permission('users.manage') then
    raise exception 'Only administrators can suspend accounts' using errcode = '42501';
  end if;
  if new.marketing_opt_in and not old.marketing_opt_in then new.marketing_opt_in_at := now(); end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function app.profile_before_update();

create or replace function app.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, data)
  values (auth.uid(), lower(tg_op), tg_table_name,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id',
                   (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'user_id'),
          case when tg_op = 'UPDATE' then jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
               when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return coalesce(new, old);
end $$;
create trigger audit_restaurants after insert or update or delete on public.restaurants for each row execute function app.audit();
create trigger audit_user_roles after insert or update or delete on public.user_roles for each row execute function app.audit();
create trigger audit_refunds after insert or update on public.refunds for each row execute function app.audit();
create trigger audit_settings after insert or update or delete on public.platform_settings for each row execute function app.audit();
create trigger audit_couriers after update on public.couriers for each row execute function app.audit();

-- =====================================================================
-- Order status transitions (the only way clients change an order)
-- =====================================================================
create or replace function public.transition_order(p_order_id uuid, p_to public.order_status, p_reason text default null)
returns public.order_status
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  t app.order_transitions;
  actor public.order_actor;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '28000'; end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;

  select * into t from app.order_transitions
  where from_status = o.status and to_status = p_to and (fulfilment is null or fulfilment = o.fulfilment);
  if not found then raise exception 'Transition % -> % not allowed', o.status, p_to using errcode = '22023'; end if;

  -- Pick the first role the caller actually holds that is allowed for this transition.
  if 'restaurant' = any (t.actors) and app.is_restaurant_member(o.restaurant_id) then actor := 'restaurant';
  elsif 'courier' = any (t.actors) and exists (select 1 from public.deliveries d where d.order_id = o.id and d.courier_id = auth.uid()) then actor := 'courier';
  elsif 'customer' = any (t.actors) and o.customer_id = auth.uid() then actor := 'customer';
  elsif 'admin' = any (t.actors) and app.has_permission('orders.manage') then actor := 'admin';
  else raise exception 'Not allowed to perform % -> %', o.status, p_to using errcode = '42501';
  end if;

  update public.orders set status = p_to where id = o.id;
  insert into public.order_status_history (order_id, from_status, to_status, actor, actor_id, reason)
  values (o.id, o.status, p_to, actor, auth.uid(), p_reason);
  return p_to;
end $$;
revoke all on function public.transition_order(uuid, public.order_status, text) from public, anon;
grant execute on function public.transition_order(uuid, public.order_status, text) to authenticated;

-- =====================================================================
-- Row Level Security
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'countries','platform_settings','profiles','roles','user_roles','addresses','restaurants','restaurant_members',
    'restaurant_hours','delivery_zones','categories','ingredient_models','products','product_variants','ingredients',
    'ingredient_groups','product_ingredients','product_ingredient_prices','configurator_rules','promotions','couriers',
    'orders','order_items','order_item_ingredients','order_status_history','payments','refunds','payouts','deliveries',
    'delivery_offers','reviews','favorites','notifications','push_tokens','support_tickets','support_messages','reports',
    'data_requests','audit_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- Countries / roles: public reference data
create policy countries_read on public.countries for select using (true);
create policy countries_admin on public.countries for all using (app.has_permission('settings.manage')) with check (app.has_permission('settings.manage'));
create policy roles_read on public.roles for select to authenticated using (true);
create policy settings_admin on public.platform_settings for all using (app.has_permission('settings.manage')) with check (app.has_permission('settings.manage'));

-- Profiles
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or app.has_permission('users.read'));
create policy profiles_self_update on public.profiles for update using (id = auth.uid() or app.has_permission('users.manage')) with check (id = auth.uid() or app.has_permission('users.manage'));

-- User roles: a user sees their own roles; only user managers grant roles
create policy user_roles_read on public.user_roles for select using (user_id = auth.uid() or app.has_permission('users.read'));
create policy user_roles_manage on public.user_roles for all using (app.has_permission('users.manage')) with check (app.has_permission('users.manage'));

-- Addresses
create policy addresses_owner on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Restaurants
create policy restaurants_public_read on public.restaurants for select using (status = 'active' or app.is_restaurant_member(id) or app.has_permission('restaurants.read'));
create policy restaurants_create on public.restaurants for insert to authenticated with check (true); -- trigger forces pending status + owner
create policy restaurants_update on public.restaurants for update using (app.is_restaurant_member(id, '{owner,manager}') or app.has_permission('restaurants.manage')) with check (app.is_restaurant_member(id, '{owner,manager}') or app.has_permission('restaurants.manage'));
create policy restaurants_delete on public.restaurants for delete using (app.has_permission('restaurants.manage'));

create policy members_read on public.restaurant_members for select using (user_id = auth.uid() or app.is_restaurant_member(restaurant_id, '{owner,manager}') or app.has_permission('restaurants.read'));
create policy members_manage on public.restaurant_members for all using (app.is_restaurant_member(restaurant_id, '{owner}') or app.has_permission('restaurants.manage')) with check (app.is_restaurant_member(restaurant_id, '{owner}') or app.has_permission('restaurants.manage'));

-- Restaurant-owned data: public read when the restaurant is active, members manage.
do $$
declare t text;
begin
  foreach t in array array['restaurant_hours','delivery_zones','products','product_variants','ingredients','ingredient_groups','product_ingredients','product_ingredient_prices','configurator_rules']
  loop
    execute format('create policy %I on public.%I for select using (app.restaurant_is_public(restaurant_id) or app.is_restaurant_member(restaurant_id) or app.has_permission(''restaurants.read''))', t || '_read', t);
    execute format('create policy %I on public.%I for insert with check (app.is_restaurant_member(restaurant_id, ''{owner,manager}'') or app.has_permission(''restaurants.manage''))', t || '_insert', t);
    execute format('create policy %I on public.%I for update using (app.is_restaurant_member(restaurant_id, ''{owner,manager}'') or app.has_permission(''restaurants.manage'')) with check (app.is_restaurant_member(restaurant_id, ''{owner,manager}'') or app.has_permission(''restaurants.manage''))', t || '_update', t);
    execute format('create policy %I on public.%I for delete using (app.is_restaurant_member(restaurant_id, ''{owner,manager}'') or app.has_permission(''restaurants.manage''))', t || '_delete', t);
  end loop;
end $$;
-- Staff may toggle availability (sold out) on products/ingredients via a dedicated
-- function in Phase 3; they get no direct write access here.

-- Categories: global ones by catalogue admins, restaurant ones by members
create policy categories_read on public.categories for select using (
  (restaurant_id is null and active) or app.restaurant_is_public(restaurant_id) or app.is_restaurant_member(restaurant_id) or app.has_permission('catalog.manage'));
create policy categories_write on public.categories for all using (
  (restaurant_id is null and app.has_permission('catalog.manage')) or (restaurant_id is not null and app.is_restaurant_member(restaurant_id, '{owner,manager}')))
  with check ((restaurant_id is null and app.has_permission('catalog.manage')) or (restaurant_id is not null and app.is_restaurant_member(restaurant_id, '{owner,manager}')));

-- 3D model library
create policy models_read on public.ingredient_models for select using (true);
create policy models_write on public.ingredient_models for all using (
  (owner_restaurant_id is null and app.has_permission('catalog.manage')) or (owner_restaurant_id is not null and app.is_restaurant_member(owner_restaurant_id, '{owner,manager}')))
  with check ((owner_restaurant_id is null and app.has_permission('catalog.manage')) or (owner_restaurant_id is not null and app.is_restaurant_member(owner_restaurant_id, '{owner,manager}')));

-- Promotions
create policy promotions_read on public.promotions for select using (
  (active and now() between starts_at and ends_at and (restaurant_id is null or app.restaurant_is_public(restaurant_id)))
  or app.is_restaurant_member(restaurant_id) or app.has_permission('promotions.manage'));
create policy promotions_write on public.promotions for all using (
  (restaurant_id is not null and app.is_restaurant_member(restaurant_id, '{owner,manager}')) or app.has_permission('promotions.manage'))
  with check ((restaurant_id is not null and app.is_restaurant_member(restaurant_id, '{owner,manager}') and not is_sponsored) or app.has_permission('promotions.manage'));

-- Couriers
create policy couriers_self_read on public.couriers for select using (user_id = auth.uid() or app.has_permission('couriers.read'));
create policy couriers_self_insert on public.couriers for insert with check (user_id = auth.uid());
create policy couriers_self_update on public.couriers for update using (user_id = auth.uid() or app.has_permission('couriers.manage')) with check (user_id = auth.uid() or app.has_permission('couriers.manage'));

-- Orders & children: read-only for clients. Writes happen server-side.
create policy orders_read on public.orders for select using (app.can_read_order(id));
create policy order_items_read on public.order_items for select using (app.can_read_order(order_id));
create policy order_item_ingredients_read on public.order_item_ingredients for select using (
  exists (select 1 from public.order_items i where i.id = order_item_id and app.can_read_order(i.order_id)));
create policy order_history_read on public.order_status_history for select using (app.can_read_order(order_id));

-- Payments & money
create policy payments_read on public.payments for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or app.is_restaurant_member(o.restaurant_id, '{owner,manager}')))
  or app.has_permission('payments.read'));
create policy refunds_read on public.refunds for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or app.is_restaurant_member(o.restaurant_id, '{owner,manager}')))
  or app.has_permission('payments.read'));
create policy payouts_read on public.payouts for select using (app.is_restaurant_member(restaurant_id, '{owner}') or app.has_permission('payments.read'));

-- Deliveries
create policy deliveries_read on public.deliveries for select using (courier_id = auth.uid() or app.can_read_order(order_id));
create policy offers_read on public.delivery_offers for select using (courier_id = auth.uid() or app.has_permission('deliveries.manage'));

-- Reviews: only for own, completed orders
create policy reviews_read on public.reviews for select using (not hidden or customer_id = auth.uid() or app.has_permission('moderation.manage'));
create policy reviews_insert on public.reviews for insert with check (
  customer_id = auth.uid() and exists (
    select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()
      and o.restaurant_id = reviews.restaurant_id and o.status in ('delivered', 'collected')));
create policy reviews_moderate on public.reviews for update using (app.has_permission('moderation.manage')) with check (app.has_permission('moderation.manage'));

-- Favourites, notifications, push tokens
create policy favorites_owner on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_owner_read on public.notifications for select using (user_id = auth.uid());
create policy notifications_owner_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_tokens_owner on public.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Support
create policy tickets_read on public.support_tickets for select using (requester_id = auth.uid() or app.has_permission('support.manage'));
create policy tickets_create on public.support_tickets for insert with check (requester_id = auth.uid() and status = 'open' and assigned_to is null);
create policy tickets_admin on public.support_tickets for update using (app.has_permission('support.manage')) with check (app.has_permission('support.manage'));
create policy messages_read on public.support_messages for select using (
  app.has_permission('support.manage') or (not internal and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.requester_id = auth.uid())));
create policy messages_create on public.support_messages for insert with check (
  author_id = auth.uid() and (
    app.has_permission('support.manage')
    or (not internal and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.requester_id = auth.uid()))));

-- Reports & data requests
create policy reports_create on public.reports for insert with check (reporter_id = auth.uid() and status = 'open');
create policy reports_read on public.reports for select using (reporter_id = auth.uid() or app.has_permission('moderation.manage'));
create policy reports_admin on public.reports for update using (app.has_permission('moderation.manage')) with check (app.has_permission('moderation.manage'));
create policy data_requests_owner on public.data_requests for select using (user_id = auth.uid() or app.has_permission('privacy.manage'));
create policy data_requests_create on public.data_requests for insert with check (user_id = auth.uid() and status = 'received');
create policy data_requests_admin on public.data_requests for update using (app.has_permission('privacy.manage')) with check (app.has_permission('privacy.manage'));

-- Audit log: read-only for auditors, written only by triggers
create policy audit_read on public.audit_log for select using (app.has_permission('audit.read'));

-- Table privileges (RLS still applies on top)
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.orders, public.order_items, public.order_item_ingredients, public.order_status_history,
  public.payments, public.refunds, public.payouts, public.audit_log, public.deliveries, public.delivery_offers from authenticated;
grant usage on all sequences in schema public to authenticated;
