-- Overdue is an audited exception, not a replacement for the task lifecycle.
begin;
create table public.operation_incidents (
  id bigint generated always as identity primary key,
  task_id bigint references public.tasks(id) on delete restrict,
  order_id bigint references public.buyer_orders(id) on delete restrict,
  assignee_id uuid not null references public.profiles(id),
  label text not null,
  scheduled_at timestamptz not null,
  original_status text not null,
  detected_at timestamptz not null default now(),
  reason_code text check (reason_code in ('vehicle_breakdown','traffic_road_closure','customer_unavailable','weather','supplies_unavailable','illness_emergency','other')),
  reason_notes text check (char_length(reason_notes) <= 2000),
  reason_submitted_at timestamptz,
  classification text not null default 'pending' check (classification in ('pending','excused','unexcused')),
  review_notes text check (char_length(review_notes) <= 2000),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  recovery_action text check (recovery_action in ('reschedule','reassign','completed','cancelled')),
  recovered_by uuid references public.profiles(id),
  recovered_at timestamptz,
  new_scheduled_at timestamptz,
  new_assignee_id uuid references public.profiles(id),
  buyer_requested_at timestamptz,
  buyer_requested_date date,
  buyer_request_notes text check (char_length(buyer_request_notes) <= 1000),
  constraint operation_incident_entity check ((task_id is null) <> (order_id is null)),
  unique(task_id, scheduled_at, assignee_id),
  unique(order_id, scheduled_at, assignee_id)
);
create index on public.operation_incidents(assignee_id) where reason_submitted_at is null;
create index on public.operation_incidents(detected_at desc);

-- Explicit linked operational holds; these never freeze refunds or payments.
create table public.operation_dependencies (
  id bigint generated always as identity primary key,
  incident_id bigint not null references public.operation_incidents(id),
  step text not null check (char_length(trim(step)) between 1 and 200),
  kind text not null check (kind in ('warehouse','billing')),
  released_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.operation_reports (
  id bigint generated always as identity primary key,
  incident_id bigint not null unique references public.operation_incidents(id),
  assignee_id uuid not null references public.profiles(id),
  generated_at timestamptz not null default now(),
  generated_by uuid references public.profiles(id),
  status text not null default 'awaiting_hr_review' check (status in ('awaiting_hr_review','reviewed')),
  snapshot jsonb not null,
  hr_notes text check (char_length(hr_notes) <= 4000),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz
);
-- Transactional in-app notifications with a retryable push outbox.
create table public.operation_notification_outbox (
  id bigint generated always as identity primary key,
  notification_id bigint not null references public.notifications(id) on delete cascade,
  delivered_at timestamptz,
  claimed_at timestamptz,
  attempts integer not null default 0
);

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'task_assigned','task_starting_soon','harvest_approved','harvest_rejected',
  'task_reassigned','task_cancelled','admin_broadcast','weather_alert',
  'delivery_assigned','delivery_cancelled','delivery_window_approaching','order_cancelled',
  'dispute_opened','cod_confirmed','rating_received','order_status_updated',
  'operation_overdue','operation_recovery','operation_reason','operation_incident'
));

create function public.operation_notify(p_recipient uuid, p_type text, p_title text, p_body text, p_task bigint, p_order bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare n bigint;
begin
  if p_recipient is null then return; end if;
  insert into public.notifications(recipient_id,type,title,body,entity_type,entity_id)
  values(p_recipient,p_type,p_title,left(p_body,500),case when p_task is not null then 'task' else 'order' end,coalesce(p_task,p_order)) returning id into n;
  insert into public.operation_notification_outbox(notification_id) values(n);
end $$;

create function public.detect_overdue_operations(p_assignee uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; a record; i bigint; total integer := 0;
begin
  -- Close operational exceptions after completion/cancellation; retain all KPI history.
  update public.operation_incidents i set recovered_at=now(), recovery_action=case when ts.code='cancelled' then 'cancelled' else 'completed' end
  from public.tasks t join public.task_statuses ts on ts.id=t.status_id
  where i.task_id=t.id and i.recovered_at is null and ts.code in ('awaiting_approval','completed','cancelled');
  update public.operation_incidents i set recovered_at=now(), recovery_action=case when o.order_status='cancelled' or o.delivery_assignment_status='declined' then 'cancelled' else 'completed' end
  from public.buyer_orders o where i.order_id=o.id and i.recovered_at is null
    and (o.order_status in ('delivered','completed','cancelled') or o.delivery_assignment_status in ('delivered','declined'));
  update public.operation_dependencies d set released_at=now() from public.operation_incidents i
    where d.incident_id=i.id and d.released_at is null and i.recovered_at is not null;
  -- A full day's completion opportunity in Philippine time, including after hours.
  for r in
    select t.id task_id, null::bigint order_id, t.assigned_worker_id assignee_id,
      t.task_name label, (s.schedule_date + s.start_time) at time zone 'Asia/Manila' scheduled_at, ts.code original_status, null::uuid buyer_id
    from public.tasks t join public.schedules s on s.task_id=t.id
    join public.task_statuses ts on ts.id=t.status_id
    where ts.code in ('pending','in_progress') and s.schedule_date < (now() at time zone 'Asia/Manila')::date
      and (p_assignee is null or t.assigned_worker_id=p_assignee)
    union all
    select null::bigint,o.id,o.assigned_driver_id,o.order_number,o.delivery_scheduled_at,o.delivery_assignment_status,o.buyer_id
    from public.buyer_orders o
    where o.assigned_driver_id is not null and o.order_status in ('ready_for_delivery','out_for_delivery')
      and o.delivery_assignment_status in ('assigned','accepted','picked_up','out_for_delivery')
      and (o.delivery_scheduled_at at time zone 'Asia/Manila')::date < (now() at time zone 'Asia/Manila')::date
      and (p_assignee is null or o.assigned_driver_id=p_assignee)
  loop
    i := null;
    insert into public.operation_incidents(task_id,order_id,assignee_id,label,scheduled_at,original_status)
    values(r.task_id,r.order_id,r.assignee_id,r.label,r.scheduled_at,r.original_status)
    on conflict do nothing returning id into i;
    if i is null then continue; end if;
    total := total + 1;
    perform public.operation_notify(r.assignee_id,'operation_overdue','Overdue work',r.label || ' missed its scheduled date. Submit a delay reason before closing work or starting another job.',r.task_id,r.order_id);
    for a in select id from public.profiles where role='admin' loop
      perform public.operation_notify(a.id,'operation_overdue','Overdue operation',r.label || ' missed its scheduled date. Review Operations Recovery.',r.task_id,r.order_id);
    end loop;
    if r.order_id is not null then
      perform public.operation_notify(r.buyer_id,'order_status_updated','Delivery delayed','We are sorry your delivery was delayed. We will notify you when a new delivery schedule is confirmed. Order ' || r.label,r.task_id,r.order_id);
    end if;
  end loop;
  return total;
end $$;

-- Enforce reason requirements in the database too, including alternate clients.
create function public.guard_operation_progress()
returns trigger language plpgsql security definer set search_path = '' as $$
declare worker uuid; needs_check boolean; code text;
begin
  if tg_table_name='tasks' then
    select s.code into code from public.task_statuses s where s.id=new.status_id;
    worker := old.assigned_worker_id;
    needs_check := new.status_id is distinct from old.status_id and code in ('in_progress','awaiting_approval','completed');
  else
    worker := old.assigned_driver_id;
    needs_check := new.delivery_assignment_status is distinct from old.delivery_assignment_status
      and new.delivery_assignment_status in ('accepted','picked_up','out_for_delivery','delivered');
  end if;
  if needs_check and worker is not null then
    perform public.detect_overdue_operations(worker);
    if exists(select 1 from public.operation_incidents where assignee_id=worker and reason_submitted_at is null) then
      raise exception 'Submit a delay reason in Operations before closing work or starting another job.' using errcode='P0001';
    end if;
  end if;
  return new;
end $$;
create trigger tasks_operation_guard before update of status_id on public.tasks for each row execute function public.guard_operation_progress();
create trigger orders_operation_guard before update of delivery_assignment_status on public.buyer_orders for each row execute function public.guard_operation_progress();

-- Older assignment editors cannot silently erase an overdue deadline.
create function public.guard_operation_schedule()
returns trigger language plpgsql security definer set search_path = '' as $$
declare worker uuid; blocked boolean;
begin
  if current_setting('app.operation_recovery',true)='true' then return new; end if;
  if tg_table_name='schedules' then
    if (new.schedule_date,new.start_time,new.end_time) is not distinct from (old.schedule_date,old.start_time,old.end_time) then return new; end if;
    select assigned_worker_id into worker from public.tasks where id=old.task_id;
    perform public.detect_overdue_operations(worker);
    select exists(select 1 from public.operation_incidents where task_id=old.task_id and recovered_at is null) into blocked;
  elsif tg_table_name='tasks' then
    if new.assigned_worker_id is not distinct from old.assigned_worker_id then return new; end if;
    perform public.detect_overdue_operations(old.assigned_worker_id);
    select exists(select 1 from public.operation_incidents where task_id=old.id and recovered_at is null) into blocked;
  else
    if (new.assigned_driver_id,new.delivery_scheduled_at,new.delivery_window_end_at) is not distinct from (old.assigned_driver_id,old.delivery_scheduled_at,old.delivery_window_end_at) then return new; end if;
    -- Cancellation remains supported by the existing audited cancellation flow.
    if new.assigned_driver_id is null then return new; end if;
    perform public.detect_overdue_operations(old.assigned_driver_id);
    select exists(select 1 from public.operation_incidents where order_id=old.id and recovered_at is null) into blocked;
  end if;
  if blocked then raise exception 'Use Operations Recovery to change an overdue assignment or schedule.' using errcode='P0001'; end if;
  return new;
end $$;
create trigger schedules_operation_recovery before update of schedule_date,start_time,end_time on public.schedules for each row execute function public.guard_operation_schedule();
create trigger tasks_operation_recovery before update of assigned_worker_id on public.tasks for each row execute function public.guard_operation_schedule();
create trigger orders_operation_recovery before update of assigned_driver_id,delivery_scheduled_at,delivery_window_end_at on public.buyer_orders for each row execute function public.guard_operation_schedule();

create function public.recover_operation(p_incident bigint,p_admin uuid,p_assignee uuid,p_start timestamptz,p_end timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.operation_incidents; t public.tasks; o public.buyer_orders; code text; category text; buyer uuid;
begin
  if not exists(select 1 from public.profiles where id=p_admin and role='admin') then raise exception 'Admin access required'; end if;
  if p_start is null or p_end is null or p_end<=p_start or (p_start at time zone 'Asia/Manila')::date < (now() at time zone 'Asia/Manila')::date then
    raise exception 'Choose today or a future date and a valid time window.' using errcode='P0001';
  end if;
  select * into i from public.operation_incidents where id=p_incident;
  if i.task_id is not null then
    perform 1 from public.tasks where id=i.task_id for update;
  elsif i.order_id is not null then
    perform 1 from public.buyer_orders where id=i.order_id for update;
  end if;
  select * into i from public.operation_incidents where id=p_incident for update;
  if not found or i.recovered_at is not null then raise exception 'This incident no longer needs recovery.' using errcode='P0001'; end if;
  perform set_config('app.operation_recovery','true',true);
  if i.task_id is not null then
    select * into t from public.tasks where id=i.task_id for update;
    select s.code into code from public.task_statuses s where s.id=t.status_id;
    if code not in ('pending','in_progress') then raise exception 'This task is no longer active.' using errcode='P0001'; end if;
    if t.assigned_worker_id<>i.assignee_id then raise exception 'Assignment changed. Refresh the queue.' using errcode='P0001'; end if;
    if code='in_progress' and p_assignee<>t.assigned_worker_id then raise exception 'Started work must remain with its current worker.' using errcode='P0001'; end if;
    select worker_category into category from public.profiles where id=t.assigned_worker_id;
    if not exists(select 1 from public.profiles where id=p_assignee and role='farm_worker' and worker_category=category) then raise exception 'Choose a worker in the same category.' using errcode='P0001'; end if;
    if (p_start at time zone 'Asia/Manila')::date<>(p_end at time zone 'Asia/Manila')::date then raise exception 'Task window must fit one day.' using errcode='P0001'; end if;
    -- Existing scheduling triggers enforce conflicts under a per-worker lock.
    update public.tasks set assigned_worker_id=p_assignee where id=i.task_id;
    update public.schedules set schedule_date=(p_start at time zone 'Asia/Manila')::date,
      start_time=(p_start at time zone 'Asia/Manila')::time,end_time=(p_end at time zone 'Asia/Manila')::time where task_id=i.task_id;
  else
    select * into o from public.buyer_orders where id=i.order_id for update;
    if o.delivery_assignment_status not in ('assigned','accepted','picked_up','out_for_delivery') or o.order_status not in ('ready_for_delivery','out_for_delivery') then raise exception 'This delivery is no longer active.' using errcode='P0001'; end if;
    if o.assigned_driver_id<>i.assignee_id then raise exception 'Assignment changed. Refresh the queue.' using errcode='P0001'; end if;
    if o.delivery_assignment_status<>'assigned' and p_assignee<>o.assigned_driver_id then raise exception 'Accepted deliveries must remain with the current driver.' using errcode='P0001'; end if;
    if not exists(select 1 from public.profiles where id=p_assignee and role='farm_worker' and worker_category='driver') then raise exception 'Choose a driver.' using errcode='P0001'; end if;
    buyer := o.buyer_id;
    update public.buyer_orders set assigned_driver_id=p_assignee,delivery_scheduled_at=p_start,delivery_window_end_at=p_end,
      estimated_delivery_at=p_end,driver_assigned_at=case when p_assignee<>o.assigned_driver_id then now() else driver_assigned_at end where id=i.order_id;
  end if;
  update public.operation_incidents set recovered_at=now(),recovered_by=p_admin,new_scheduled_at=p_start,new_assignee_id=p_assignee,
    recovery_action=case when p_assignee=i.assignee_id then 'reschedule' else 'reassign' end where id=i.id;
  update public.operation_dependencies set released_at=now() where incident_id=i.id and released_at is null;
  perform public.operation_notify(p_assignee,'operation_recovery','Recovery schedule confirmed',i.label || ': ' || to_char(p_start at time zone 'Asia/Manila','DD Mon YYYY HH24:MI') || ' Philippine time.',i.task_id,i.order_id);
  if p_assignee<>i.assignee_id then
    perform public.operation_notify(i.assignee_id,'operation_recovery','Work reassigned',i.label || ' has been reassigned. Your delay report remains in the incident history.',i.task_id,i.order_id);
  end if;
  if buyer is not null then
    perform public.operation_notify(buyer,'order_status_updated','New delivery schedule confirmed','We are sorry for the delay. Order ' || i.label || ': ' || to_char(p_start at time zone 'Asia/Manila','DD Mon YYYY HH24:MI') || '–' || to_char(p_end at time zone 'Asia/Manila','HH24:MI') || ' Philippine time. Open the order to request another date.',null,i.order_id);
  end if;
end $$;

create function public.generate_operation_report(p_incident bigint,p_admin uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.operation_incidents; a record;
begin
  select * into i from public.operation_incidents where id=p_incident for update;
  if not found or i.classification<>'unexcused' then raise exception 'Review this incident as unexcused before generating a report.' using errcode='P0001'; end if;
  insert into public.operation_reports(incident_id,assignee_id,generated_by,snapshot)
  values(i.id,i.assignee_id,p_admin,jsonb_build_object('incident',to_jsonb(i),'history',(
    select coalesce(jsonb_agg(to_jsonb(h) order by h.detected_at),'[]') from public.operation_incidents h where h.assignee_id=i.assignee_id
  ),'policy','HR review required. No automatic warning or suspension.')) on conflict(incident_id) do nothing;
  if found then
    for a in select id from public.profiles where role='admin' loop
      perform public.operation_notify(a.id,'operation_incident','Incident report awaiting review',i.label || ': review evidence and company policy before deciding any HR action.',i.task_id,i.order_id);
    end loop;
  end if;
end $$;

create function public.complete_operation_dependency(p_dependency bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.operation_dependencies set completed_at=now() where id=p_dependency and released_at is not null and completed_at is null;
  if not found then raise exception 'This step is paused until recovery is confirmed, already completed, or not found.' using errcode='P0001'; end if;
end $$;

create function public.review_operation_incident(p_incident bigint,p_admin uuid,p_classification text,p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.operation_incidents; misses integer;
begin
  select * into i from public.operation_incidents where id=p_incident for update;
  if not found or i.reviewed_at is not null then raise exception 'Incident already reviewed or not found.' using errcode='P0001'; end if;
  -- Serialize classifications for a person so threshold crossings cannot be lost.
  perform pg_advisory_xact_lock(hashtextextended('incident-review:' || i.assignee_id::text,0));
  update public.operation_incidents set classification=p_classification,review_notes=p_notes,reviewed_by=p_admin,reviewed_at=now() where id=i.id;
  select count(*) into misses from public.operation_incidents where assignee_id=i.assignee_id and classification='unexcused';
  if p_classification='unexcused' and misses>=3 then perform public.generate_operation_report(i.id,p_admin); end if;
end $$;

create function public.add_operation_dependency(p_incident bigint,p_step text,p_kind text)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.operation_incidents;
begin
  select * into i from public.operation_incidents where id=p_incident for update;
  if not found or i.recovered_at is not null then raise exception 'Only unresolved operations can hold linked steps.' using errcode='P0001'; end if;
  insert into public.operation_dependencies(incident_id,step,kind) values(i.id,p_step,p_kind);
end $$;

create function public.request_operation_delivery_date(p_order bigint,p_buyer uuid,p_date date,p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.operation_incidents; a record;
begin
  perform 1 from public.buyer_orders where id=p_order and buyer_id=p_buyer and order_status in ('ready_for_delivery','out_for_delivery') for update;
  if not found then raise exception 'This delivery cannot be rescheduled.' using errcode='P0001'; end if;
  if p_date<(now() at time zone 'Asia/Manila')::date then raise exception 'Choose today or a future date.' using errcode='P0001'; end if;
  select * into i from public.operation_incidents where order_id=p_order order by detected_at desc limit 1 for update;
  if not found then raise exception 'No delayed delivery was found.' using errcode='P0001'; end if;
  update public.operation_incidents set buyer_requested_at=now(),buyer_requested_date=p_date,buyer_request_notes=p_notes where id=i.id;
  for a in select id from public.profiles where role='admin' loop
    perform public.operation_notify(a.id,'operation_recovery','Buyer requested another date',i.label || ': requested ' || p_date::text || '. Confirm a schedule with the buyer.',null,p_order);
  end loop;
end $$;

-- Rates use completed jobs as denominator and retain original missed dates after recovery.
create function public.operation_performance()
returns jsonb language sql security definer set search_path = '' as $$
  with jobs as (
    select t.assigned_worker_id person,t.id task_id,null::bigint order_id,
      (t.completed_at at time zone 'Asia/Manila')::date finished,
      s.schedule_date scheduled
    from public.tasks t join public.schedules s on s.task_id=t.id join public.task_statuses st on st.id=t.status_id
    where st.code in ('completed','awaiting_approval')
    union all
    select assigned_driver_id,null::bigint,id,(delivered_at at time zone 'Asia/Manila')::date,
      (delivery_scheduled_at at time zone 'Asia/Manila')::date from public.buyer_orders
    where delivery_assignment_status='delivered' and assigned_driver_id is not null
  ), rates as (
    select person,count(*) completed,count(*) filter(where finished<=scheduled and not exists(
      select 1 from public.operation_incidents i where i.assignee_id=jobs.person and (i.task_id=jobs.task_id or i.order_id=jobs.order_id)
    )) on_time from jobs group by person
  ), misses as (
    select assignee_id,count(*) missed,count(*) filter(where classification='excused') excused,
      count(*) filter(where classification='unexcused') unexcused from public.operation_incidents group by assignee_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('assignee_id',p.id,'name',p.full_name,'completed',coalesce(r.completed,0),
    'on_time_rate',case when r.completed>0 then round(100.0*r.on_time/r.completed,1) else null end,
    'missed',coalesce(m.missed,0),'excused',coalesce(m.excused,0),'unexcused',coalesce(m.unexcused,0))),'[]')
  from public.profiles p left join rates r on r.person=p.id left join misses m on m.assignee_id=p.id
  where p.role='farm_worker' and p.worker_category in ('driver','crop_management_worker');
$$;

-- Atomically claim push batches so multiple backend processes do not double-send.
create function public.claim_operation_notifications()
returns setof public.operation_notification_outbox language sql security definer set search_path = '' as $$
  update public.operation_notification_outbox set claimed_at=now(),attempts=attempts+1
  where id in (select id from public.operation_notification_outbox where delivered_at is null
    and (claimed_at is null or claimed_at<now()-interval '5 minutes') order by id limit 100 for update skip locked)
  returning *;
$$;

do $$ declare n text; f record; begin
  foreach n in array array['operation_incidents','operation_dependencies','operation_reports','operation_notification_outbox'] loop
    execute format('alter table public.%I enable row level security',n);
    execute format('revoke all on public.%I from anon, authenticated',n);
    execute format('grant all on public.%I to service_role',n);
    execute format('grant usage, select on sequence public.%I to service_role',n || '_id_seq');
  end loop;
  for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname in (
    'operation_notify','detect_overdue_operations','guard_operation_progress','guard_operation_schedule','recover_operation','claim_operation_notifications',
    'generate_operation_report','review_operation_incident','add_operation_dependency','complete_operation_dependency','request_operation_delivery_date','operation_performance'
  ) loop
    execute format('revoke all on function %s from public, anon, authenticated',f.sig);
    execute format('grant execute on function %s to service_role',f.sig);
  end loop;
end $$;
notify pgrst, 'reload schema';
commit;
