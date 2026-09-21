-- Removes the Tools, Seeds, and Insecticides inventory categories.
--
-- inventory_items.inventory_category_id is "on delete restrict", and the stock ledger
-- (inventory_stock_movements) also restricts deleting an item, so the items in these
-- categories and their stock history are deleted first. At the time of writing that is one
-- item, a "Hoe" (2 pcs) in Tools, with 3 stock-history entries. Seeds and Insecticides are empty.
-- Item details (fertilizer/pesticide/equipment rows) are removed automatically with the item.
--
-- This permanently deletes that history. Back up the database before running it.
-- If any of these items is still used by a buyer order or a task, the delete fails and nothing changes.

begin;

delete from public.inventory_stock_movements
where inventory_item_id in (
  select i.id
  from public.inventory_items i
  join public.inventory_categories c on c.id = i.inventory_category_id
  where c.code in ('tools', 'seeds', 'insecticides')
);

delete from public.inventory_items
where inventory_category_id in (
  select id from public.inventory_categories where code in ('tools', 'seeds', 'insecticides')
);

delete from public.inventory_categories
where code in ('tools', 'seeds', 'insecticides');

commit;
