-- Adds the internal "condition" flag to the Data Bank (new | preowned).
-- Customers never see it. Safe to run more than once. Existing rows become 'new'.
alter table public.databank_items
  add column if not exists condition text not null default 'new';

alter table public.databank_items
  drop constraint if exists databank_items_condition_check;
alter table public.databank_items
  add constraint databank_items_condition_check check (condition in ('new', 'preowned'));
