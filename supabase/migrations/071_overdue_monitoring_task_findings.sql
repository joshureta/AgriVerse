-- Keep new monitoring findings visible when an older, unfinished task is overdue.
alter table public.monitoring_task_findings
  add column if not exists blocked_by_task_id bigint references public.tasks(id) on delete set null;

-- Correct findings already marked covered by an overdue pending task (including
-- findings recorded after migration 070 but before this migration).
update public.monitoring_task_findings f
set status = 'queued', task_id = null, blocked_by_task_id = t.id
from public.tasks t
join public.task_statuses ts on ts.id = t.status_id
join public.schedules sch on sch.task_id = t.id
where f.task_id = t.id and f.status = 'covered'
  and ts.code in ('pending', 'in_progress')
  and sch.schedule_date < (f.observed_at at time zone 'Asia/Manila')::date;

create or replace function public.record_monitoring_task_finding(
  p_event_key text, p_field_name text, p_source text, p_kind text,
  p_evidence text, p_observed_at timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_finding public.monitoring_task_findings;
  v_field_id bigint;
  v_category_name text;
  v_category_id bigint;
  v_activity_type text;
  v_priority_id bigint;
  v_pending_id bigint;
  v_scheduled_id bigint;
  v_worker_id uuid;
  v_task_id bigint;
  v_task_status text;
  v_schedule_date date;
  v_block_status text;
  v_block_completed_at timestamptz;
  v_day date;
  v_start time;
  v_end time;
  v_offset integer;
  v_slot time;
  v_now_local timestamp := now() at time zone 'Asia/Manila';
begin
  if p_event_key is null or char_length(p_event_key) not between 1 and 200
    or p_field_name is null or p_source is null or p_kind is null
    or p_source not in ('environmental','crop_health')
    or p_kind not in ('irrigation','wet_soil','environment_check','pest_disease','crop_check')
    or p_evidence is null or char_length(p_evidence) not between 1 and 2000
    or p_observed_at is null or p_observed_at > now() + interval '1 minute' then return null; end if;
  if (p_source = 'environmental' and p_kind not in ('irrigation','wet_soil','environment_check'))
    or (p_source = 'crop_health' and p_kind not in ('pest_disease','crop_check')) then return null; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_field_name), pg_catalog.hashtext(p_kind));
  select * into v_finding from public.monitoring_task_findings where event_key = p_event_key for update;
  if not found and p_observed_at < now() - interval '10 minutes' then return null; end if;
  if found and v_finding.status <> 'queued' then
    return pg_catalog.jsonb_build_object('finding_id', v_finding.id, 'task_id', v_finding.task_id,
      'status', v_finding.status, 'created', false);
  end if;
  select id into v_field_id from public.farm_fields where field_name = p_field_name and status;
  if v_field_id is null then return null; end if;
  if v_finding.id is not null and
    (v_finding.field_id <> v_field_id or v_finding.kind <> p_kind or v_finding.source <> p_source) then return null; end if;
  if v_finding.id is null then
    insert into public.monitoring_task_findings(event_key, field_id, source, kind, evidence, observed_at)
    values(p_event_key, v_field_id, p_source, p_kind, p_evidence, p_observed_at) returning * into v_finding;
  end if;

  -- A blocked task finished after the finding was seen: it really did cover it.
  -- Cancellation or completion before the finding frees the finding for assignment.
  if v_finding.blocked_by_task_id is not null then
    select ts.code, t.completed_at into v_block_status, v_block_completed_at
    from public.tasks t join public.task_statuses ts on ts.id = t.status_id
    where t.id = v_finding.blocked_by_task_id;
    if v_block_status = 'completed' and v_block_completed_at >= v_finding.observed_at then
      update public.monitoring_task_findings
      set status = 'covered', task_id = v_finding.blocked_by_task_id, blocked_by_task_id = null
      where id = v_finding.id;
      return pg_catalog.jsonb_build_object('finding_id', v_finding.id,
        'task_id', v_finding.blocked_by_task_id, 'status', 'covered', 'created', false);
    end if;
    if v_block_status is null or v_block_status in ('completed', 'cancelled') then
      update public.monitoring_task_findings set blocked_by_task_id = null where id = v_finding.id;
    end if;
  end if;

  v_category_name := case p_kind
    when 'irrigation' then 'Irrigation'
    when 'pest_disease' then 'Pest & Disease'
    else 'Monitoring' end;
  v_activity_type := case when p_kind = 'pest_disease' then 'inspection' else null end;
  select id into v_category_id from public.task_categories where category_name = v_category_name and status;
  select id into v_priority_id from public.task_priorities
    where code = case when p_kind in ('irrigation','pest_disease') then 'high' else 'medium' end and status;
  select id into v_pending_id from public.task_statuses where code = 'pending' and status;
  select id into v_scheduled_id from public.schedule_statuses where code = 'scheduled' and status;
  if v_category_id is null or v_priority_id is null or v_pending_id is null or v_scheduled_id is null then
    return pg_catalog.jsonb_build_object('finding_id', v_finding.id, 'status', 'queued', 'created', false);
  end if;

  -- Prefer active work with a current schedule. An overdue pending/in-progress
  -- task blocks a duplicate but does not falsely cover a new observation.
  select t.id, ts.code, sch.schedule_date into v_task_id, v_task_status, v_schedule_date
  from public.tasks t
  join public.task_statuses ts on ts.id = t.status_id
  left join public.schedules sch on sch.task_id = t.id
  left join public.schedule_statuses ss on ss.id = sch.status_id
  where t.field_id = v_field_id and ts.code in ('pending','in_progress','awaiting_approval')
    and (t.automation_kind = p_kind or (p_kind in ('irrigation','pest_disease') and t.category_id = v_category_id))
    and (ss.code is null or ss.code <> 'cancelled')
  order by case when ts.code in ('pending','in_progress')
    and (sch.schedule_date is null or sch.schedule_date < v_now_local::date) then 1 else 0 end,
    t.created_at desc limit 1;
  if v_task_id is not null then
    if v_task_status in ('pending', 'in_progress')
      and (v_schedule_date is null or v_schedule_date < v_now_local::date) then
      update public.monitoring_task_findings
      set status = 'queued', task_id = null, blocked_by_task_id = v_task_id where id = v_finding.id;
      return pg_catalog.jsonb_build_object('finding_id', v_finding.id,
        'blocked_by_task_id', v_task_id, 'status', 'queued', 'created', false);
    end if;
    update public.monitoring_task_findings
    set status = 'covered', task_id = v_task_id, blocked_by_task_id = null where id = v_finding.id;
    return pg_catalog.jsonb_build_object('finding_id', v_finding.id,
      'task_id', v_task_id, 'status', 'covered', 'created', false);
  end if;

  -- Crop workers can work entirely within these one-hour morning/afternoon slots.
  for v_offset in 0..6 loop
    v_day := v_now_local::date + v_offset;
    foreach v_slot in array array[time '08:00',time '09:00',time '10:00',
                                  time '13:00',time '14:00',time '15:00'] loop
      v_start := v_slot;
      v_end := v_start + interval '1 hour';
      if v_day + v_start < v_now_local + interval '15 minutes' then continue; end if;
      for v_worker_id in
        select p.id from public.profiles p
        where p.role = 'farm_worker' and p.worker_category::text = 'crop_management_worker'
          and p.name_confirmed_at is not null and p.onboarding_completed_at is not null
          and coalesce(p.must_change_password, false) = false
        order by (select count(*) from public.tasks recent
          where recent.assigned_worker_id = p.id and recent.created_at >= now() - interval '7 days'), p.id
      loop
        if exists (
          select 1 from public.schedules sch
          join public.tasks t on t.id = sch.task_id
          join public.schedule_statuses ss on ss.id = sch.status_id
          where t.assigned_worker_id = v_worker_id and sch.schedule_date = v_day
            and ss.code <> 'cancelled' and sch.start_time < v_end and sch.end_time > v_start
        ) then continue; end if;
        begin
          insert into public.tasks(assigned_worker_id, category_id, field_id, priority_id, status_id,
            task_name, estimated_duration_minutes, description, activity_type,
            automation_kind, automation_source, automation_observed_at)
          values(v_worker_id, v_category_id, v_field_id, v_priority_id, v_pending_id,
            v_category_name || ' - ' || p_field_name, 60, v_finding.evidence, v_activity_type,
            p_kind, p_source, v_finding.observed_at) returning id into v_task_id;
          insert into public.schedules(task_id, schedule_date, start_time, end_time, location, status_id, notes)
          values(v_task_id, v_day, v_start, v_end, p_field_name, v_scheduled_id,
            'Automatically assigned from ' || p_source || ' monitoring. Verify conditions in the field.');
          update public.monitoring_task_findings
          set status = 'assigned', task_id = v_task_id, blocked_by_task_id = null where id = v_finding.id;
          return pg_catalog.jsonb_build_object('finding_id', v_finding.id, 'task_id', v_task_id,
            'status', 'assigned', 'created', true);
        exception when sqlstate 'P0001' then
          -- Another transaction reserved the same worker and slot. Try another.
          v_task_id := null;
        end;
      end loop;
    end loop;
  end loop;
  return pg_catalog.jsonb_build_object('finding_id', v_finding.id, 'status', 'queued', 'created', false);
end;
$$;
revoke all on function public.record_monitoring_task_finding(text,text,text,text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_monitoring_task_finding(text,text,text,text,text,timestamptz)
  to service_role;
notify pgrst, 'reload schema';

