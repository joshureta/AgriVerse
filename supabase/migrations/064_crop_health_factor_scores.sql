-- Apply in the main AgriVerse Supabase project. Existing inspections remain intact.
alter table public.crop_health_inspections
  add column if not exists factor_scores jsonb,
  add column if not exists assessment_source text;

comment on column public.crop_health_inspections.factor_scores is
  'Four numeric image factor scores from a Gemini crop diagnosis; NULL for older or unscored inspections.';
comment on column public.crop_health_inspections.assessment_source is
  'Identifies Gemini diagnoses separately from task proof photos and manual records.';
