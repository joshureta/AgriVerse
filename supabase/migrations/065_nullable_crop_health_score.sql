-- A photo may provide too little evidence to score any image factor.
-- Such an inspection must not be stored with an invented health score.
alter table public.crop_health_inspections
  alter column health_score drop not null;

comment on column public.crop_health_inspections.health_score is
  'Calculated image score (0-100), or NULL when no image factor is assessable.';

comment on column public.crop_health_inspections.factor_scores is
  'Numeric image factor scores plus severity ratings, visible evidence, and scoring method for new diagnoses; NULL for older inspections.';
