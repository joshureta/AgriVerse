-- ========================================================================
-- 018: CROP HEALTH INSPECTIONS & IMAGE STORAGE FOR AGRIVERSE (CLEAN / NO SEED DATA)
-- ========================================================================

create extension if not exists "pgcrypto";

-- Table: crop_health_inspections
create table if not exists public.crop_health_inspections (
  id uuid primary key default gen_random_uuid(),
  
  -- Farm Field information
  field_name text not null, -- e.g. 'Field A', 'Field B'
  field_id bigint references public.farm_fields(id) on delete set null,
  crop_type text not null default 'Pineapple',
  
  -- AI Diagnosis & Health metrics
  health_score integer not null check (health_score >= 0 and health_score <= 100),
  health_status text not null default 'Healthy',
  disease_or_issue_name text not null,
  visual_summary text,
  identified_symptoms jsonb not null default '[]'::jsonb,
  action_recommendations jsonb not null default '[]'::jsonb,
  
  -- Image metadata & Supabase Storage public URL
  image_url text,
  image_storage_path text,
  image_name text,
  image_mime_type text default 'image/png',
  
  -- Inspection lifecycle & audit
  status text not null default 'COMPLETED',
  ai_model text default 'gemini-3.6-flash',
  analyzed_by uuid references auth.users(id) on delete set null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexing for fast queries and filtering
create index if not exists idx_crop_health_field on public.crop_health_inspections (field_name);
create index if not exists idx_crop_health_created_at on public.crop_health_inspections (created_at desc);
create index if not exists idx_crop_health_score on public.crop_health_inspections (health_score);

-- Row Level Security (RLS)
alter table public.crop_health_inspections enable row level security;

create policy "Authenticated users can read crop inspections"
  on public.crop_health_inspections
  for select
  to authenticated
  using (true);

create policy "Authenticated users can create crop inspections"
  on public.crop_health_inspections
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update crop inspections"
  on public.crop_health_inspections
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete crop inspections"
  on public.crop_health_inspections
  for delete
  to authenticated
  using (true);

-- Storage bucket for crop photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crop-inspections',
  'crop-inspections',
  true,
  10485760, -- 10MB upload limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- Storage bucket security policies
create policy "Public read access for crop inspection images"
  on storage.objects for select
  using (bucket_id = 'crop-inspections');

create policy "Authenticated users can upload crop inspection images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'crop-inspections');

create policy "Authenticated users can update their crop images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'crop-inspections');

create policy "Authenticated users can delete crop images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'crop-inspections');
