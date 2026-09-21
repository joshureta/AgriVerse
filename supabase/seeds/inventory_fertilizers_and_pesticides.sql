-- Fertilizers and pesticides the farm uses, taken from "UXPrime - Chapter 1-3.V2.pdf".
--
-- Run this by hand in the Supabase SQL editor. It is NOT a migration: it holds starting stock
-- numbers that are placeholders, so it should not run automatically on every new database.
--
-- Source (Chapter 1, farm profile and Definition of Terms):
--   Urea (21-0-0)                    nitrogen-rich fertilizer, applied every three months
--   Complete Fertilizer (14-14-14)   balanced nitrogen, phosphorus, and potassium fertilizer
--   Furadan                          pesticide for mealybugs, scale insects, and white grubs ("ulalo")
-- The interview also mentions "herbicide" and "insecticide" but names no products, so none were invented.
--
-- Edit the list below before running:
--   quantity     PLACEHOLDER starting stock. The thesis gives no stock numbers, so set the real ones.
--   unit_abbr    bags, kg, L, bottles, pcs, or units. Must exist in measurement_units.
--   detail       fertilizer formulation, or the pesticide type.
--
-- Safe to run twice: an item is skipped if an active item with the same name already exists in the category.
-- Expiration dates are left empty (the thesis gives none). Add them from the Inventory page.

with seed (kind, item_name, unit_abbr, quantity, detail) as (
  values
    ('fertilizer', 'Urea (21-0-0)',                  'bags', 20, '21-0-0'),
    ('fertilizer', 'Complete Fertilizer (14-14-14)', 'bags', 20, '14-14-14'),
    ('pesticide',  'Furadan',                        'kg',   10, 'Insecticide')
),
new_items as (
  insert into public.inventory_items (inventory_category_id, unit_id, item_name, quantity)
  select c.id, u.id, s.item_name, s.quantity
  from seed s
  join public.inventory_categories c on c.code = s.kind and c.status = true
  join public.measurement_units u on u.abbreviation = s.unit_abbr and u.status = true
  where not exists (
    select 1 from public.inventory_items i
    where lower(i.item_name) = lower(s.item_name)
      and i.inventory_category_id = c.id
      and i.archived_at is null
  )
  returning id, item_name, inventory_category_id
),
fertilizers as (
  insert into public.fertilizer_inventory (inventory_id, formulation)
  select n.id, s.detail
  from new_items n
  join seed s on lower(s.item_name) = lower(n.item_name)
  where s.kind = 'fertilizer'
  returning inventory_id
),
pesticides as (
  insert into public.pesticide_inventory (inventory_id, pesticide_type)
  select n.id, s.detail
  from new_items n
  join seed s on lower(s.item_name) = lower(n.item_name)
  where s.kind = 'pesticide'
  returning inventory_id
)
select
  (select count(*) from fertilizers) as fertilizers_added,
  (select count(*) from pesticides)  as pesticides_added;
