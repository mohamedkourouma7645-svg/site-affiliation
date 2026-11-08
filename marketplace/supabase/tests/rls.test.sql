-- Security / RLS tests. Run with: bash supabase/tests/run-local.sh
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on
\pset format unaligned

create schema test;
grant usage on schema test to public;

create function test.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice 'PASS (denied as expected): %', label;
    return;
  end;
  raise exception 'FAIL: expected error for: %', label;
end $$;

create function test.expect(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end $$;
grant execute on all functions in schema test to public;

create function test.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
end $$;

-- ---------- fixtures (as superuser = "server") ----------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.invalid', '{"full_name":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.invalid', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@test.invalid', '{}'),
  ('00000000-0000-0000-0000-00000000000d', 'dave@test.invalid', '{}'),
  ('00000000-0000-0000-0000-00000000000e', 'eve@test.invalid', '{}');
insert into public.user_roles (user_id, role_key) values ('00000000-0000-0000-0000-00000000000e', 'admin_operations');

select test.expect((select count(*) = 5 from public.profiles), 'profiles created by auth trigger');
select test.expect((select full_name = 'Alice' from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 'profile takes metadata');

-- ---------- restaurant onboarding ----------
set role authenticated;
select test.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.restaurants (id, slug, name, street, house_number, postal_code, city, country_code, latitude, longitude, status, commission_bp)
values ('10000000-0000-0000-0000-000000000001', 'test-bob', 'Test Bob', 'Teststr.', '1', '10115', 'Berlin', 'DE', 52.53, 13.38, 'active', 0);
select test.expect((select status = 'pending_verification' and commission_bp is null from public.restaurants where slug = 'test-bob'), 'self-registered restaurant is forced to pending, no commission override');
select test.expect(app.is_restaurant_member('10000000-0000-0000-0000-000000000001', '{owner}'), 'creator becomes owner');
select test.expect_error($$update public.restaurants set status = 'active' where slug = 'test-bob'$$, 'owner cannot self-activate');

select test.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.restaurants (id, slug, name, street, house_number, postal_code, city, country_code, latitude, longitude)
values ('10000000-0000-0000-0000-000000000002', 'test-carol', 'Test Carol', 'Teststr.', '2', '10115', 'Berlin', 'DE', 52.53, 13.38);

select test.as_user('00000000-0000-0000-0000-00000000000e');
update public.restaurants set status = 'active', verified_at = now() where slug = 'test-bob';
select test.expect((select status = 'active' from public.restaurants where slug = 'test-bob'), 'admin activates restaurant');

-- ---------- catalogue ----------
select test.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.products (id, restaurant_id, name, vat_rate_bp, is_configurable, configurator_kind)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '{"de":"Pizza"}', 700, true, 'pizza');
insert into public.product_variants (product_id, restaurant_id, name, price_cents)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '{"de":"26 cm"}', 1200);

select test.as_user('00000000-0000-0000-0000-00000000000c');
select test.expect((select name ->> 'de' = 'Pizza' from public.products where id = '20000000-0000-0000-0000-000000000001'), 'bob''s product unchanged by carol');
select test.expect_error($$insert into public.product_variants (product_id, restaurant_id, name, price_cents) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '{"de":"x"}', 1)$$, 'cross-restaurant variant blocked by composite FK');
select test.expect_error($$insert into public.products (restaurant_id, name, vat_rate_bp) values ('10000000-0000-0000-0000-000000000001', '{"de":"x"}', 700)$$, 'carol cannot add products to bob''s restaurant');

reset role;
-- RLS UPDATE on invisible rows affects 0 rows rather than erroring; verify explicitly:
set role authenticated;
select test.as_user('00000000-0000-0000-0000-00000000000c');
do $$ declare n int; begin
  update public.products set available = false where id = '20000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  perform test.expect(n = 0, 'carol update affects 0 rows');
end $$;

-- ---------- public visibility ----------
set role anon;
select test.as_user(null);
select test.expect((select count(*) = 1 from public.restaurants), 'anon sees only active restaurants');
select test.expect((select count(*) = 1 from public.products), 'anon sees products of active restaurants');
select test.expect((select count(*) = 0 from public.profiles), 'anon sees no profiles');
select test.expect((select count(*) > 20 from public.categories), 'anon sees global categories');
select test.expect_error($$insert into public.restaurants (slug, name, street, house_number, postal_code, city, country_code, latitude, longitude) values ('x', 'xx', 's', '1', '10115', 'B', 'DE', 1, 1)$$, 'anon cannot create restaurants');

-- ---------- privilege escalation ----------
set role authenticated;
select test.as_user('00000000-0000-0000-0000-00000000000a');
select test.expect_error($$insert into public.user_roles (user_id, role_key) values ('00000000-0000-0000-0000-00000000000a', 'admin_super')$$, 'customer cannot grant herself admin');
select test.expect_error($$update public.profiles set suspended_at = now() where id = '00000000-0000-0000-0000-00000000000a'$$, 'customer cannot change suspension');
select test.expect((select count(*) = 1 from public.profiles), 'customer sees only own profile');
select test.expect_error($$insert into public.orders (customer_id, restaurant_id, fulfilment, items_subtotal_cents, total_cents, commission_bp, commission_cents, restaurant_share_cents) values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'pickup', 1, 1, 0, 0, 1)$$, 'clients cannot insert orders directly (server-side pricing)');

-- ---------- orders ----------
reset role;
insert into public.orders (id, customer_id, restaurant_id, fulfilment, status, items_subtotal_cents, total_cents, commission_bp, commission_cents, restaurant_share_cents)
values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'pickup', 'awaiting_acceptance', 1780, 1780, 1500, 267, 1513);
select test.expect_error($$insert into public.orders (customer_id, restaurant_id, fulfilment, items_subtotal_cents, total_cents, commission_bp, commission_cents, restaurant_share_cents) values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'pickup', 1000, 999, 0, 0, 1000)$$, 'total must equal subtotal - discount + fees');

set role authenticated;
select test.as_user('00000000-0000-0000-0000-00000000000a');
select test.expect((select count(*) = 1 from public.orders), 'customer sees own order');
select test.as_user('00000000-0000-0000-0000-00000000000c');
select test.expect((select count(*) = 0 from public.orders), 'other restaurant cannot see the order');
select test.as_user('00000000-0000-0000-0000-00000000000b');
select test.expect((select count(*) = 1 from public.orders), 'restaurant sees its order');
select test.expect_error($$update public.orders set total_cents = 0$$, 'restaurant cannot edit order amounts');
select test.expect_error($$select public.transition_order('30000000-0000-0000-0000-000000000001', 'delivered')$$, 'invalid transition rejected');
select test.expect((select public.transition_order('30000000-0000-0000-0000-000000000001', 'accepted') = 'accepted'), 'restaurant accepts order');
select test.as_user('00000000-0000-0000-0000-00000000000a');
select test.expect_error($$select public.transition_order('30000000-0000-0000-0000-000000000001', 'cancelled')$$, 'customer cannot cancel after acceptance');
select test.expect_error($$insert into public.reviews (order_id, customer_id, restaurant_id, rating) values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 5)$$, 'review only after completion');
select test.as_user('00000000-0000-0000-0000-00000000000b');
select public.transition_order('30000000-0000-0000-0000-000000000001', 'preparing');
select public.transition_order('30000000-0000-0000-0000-000000000001', 'ready');
select test.expect_error($$select public.transition_order('30000000-0000-0000-0000-000000000001', 'picked_up')$$, 'pickup order cannot go to courier states');
select test.expect((select public.transition_order('30000000-0000-0000-0000-000000000001', 'collected') = 'collected'), 'pickup order collected');
select test.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.reviews (order_id, customer_id, restaurant_id, rating) values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 5);
select test.expect((select count(*) = 4 from public.order_status_history), 'status history recorded');

-- ---------- couriers ----------
select test.as_user('00000000-0000-0000-0000-00000000000d');
insert into public.couriers (user_id, vehicle_type, city, country_code, status, is_online) values ('00000000-0000-0000-0000-00000000000d', 'bicycle', 'Berlin', 'DE', 'verified', true);
select test.expect((select status = 'pending_verification' and not is_online from public.couriers), 'courier self-signup forced to pending/offline');
select test.expect_error($$update public.couriers set is_online = true$$, 'unverified courier cannot go online');

reset role;
select test.expect((select count(*) >= 3 from public.audit_log where entity = 'restaurants'), 'restaurant changes are audited');
\echo 'ALL RLS TESTS PASSED'
