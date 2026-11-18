-- worker_category is an enum; the category variable is text. Compare like types.
create or replace function public.recover_operation(p_incident bigint,p_admin uuid,p_assignee uuid,p_start timestamptz,p_end timestamptz)
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
    if not exists(select 1 from public.profiles where id=p_assignee and role='farm_worker' and worker_category::text=category) then raise exception 'Choose a worker in the same category.' using errcode='P0001'; end if;
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
