const { before, beforeEach, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { recoveryWindow, validateReason } = require('../lib/overdue-operations');
const admin = '11111111-1111-4111-8111-111111111111';
const worker = '22222222-2222-4222-8222-222222222222';
const backup = '33333333-3333-4333-8333-333333333333';
const driver = '44444444-4444-4444-8444-444444444444';
const buyer = '55555555-5555-4555-8555-555555555555';
let db;
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create type public.worker_category as enum('crop_management_worker','driver','seller');
    create table profiles(id uuid primary key,full_name text,role text,worker_category public.worker_category);
    create table task_statuses(id bigint primary key,code text);
    create table schedule_statuses(id bigint primary key,code text);
    create table tasks(id bigint primary key,task_name text,assigned_worker_id uuid references profiles(id),status_id bigint references task_statuses(id),completed_at timestamptz);
    create table schedules(id bigint primary key,task_id bigint unique references tasks(id),schedule_date date,start_time time,end_time time,status_id bigint references schedule_statuses(id));
    create table buyer_orders(id bigint primary key,order_number text,buyer_id uuid references profiles(id),assigned_driver_id uuid references profiles(id),order_status text,delivery_assignment_status text,delivery_scheduled_at timestamptz,delivery_window_end_at timestamptz,estimated_delivery_at timestamptz,driver_assigned_at timestamptz,delivered_at timestamptz);
    create table notifications(id bigint generated always as identity primary key,recipient_id uuid references profiles(id),type text,title text,body text,entity_type text,entity_id bigint,created_at timestamptz default now());
  `);
  for (const file of ['051_prevent_schedule_conflicts.sql', '057_overdue_operations.sql', '060_fix_operation_recovery_worker_category.sql', '061_allow_overdue_task_progress.sql']) await db.exec(readFileSync(join(__dirname, '../../supabase/migrations', file), 'utf8'));
});
after(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec(`truncate operation_notification_outbox,operation_dependencies,operation_reports,operation_incidents,notifications,schedules,tasks,buyer_orders,profiles,task_statuses,schedule_statuses restart identity cascade;
    insert into profiles values('${admin}','Admin','admin',null),('${worker}','Worker','farm_worker','crop_management_worker'),('${backup}','Backup','farm_worker','crop_management_worker'),('${driver}','Driver','farm_worker','driver'),('${buyer}','Buyer','buyer',null);
    insert into task_statuses values(1,'pending'),(2,'in_progress'),(3,'completed'),(4,'cancelled'),(5,'awaiting_approval');
    insert into schedule_statuses values(1,'scheduled'),(2,'in_progress'),(3,'completed');
    insert into tasks values(1,'Monitoring','${worker}',1,null),(2,'Today task','${worker}',1,null);
    insert into schedules values(1,1,(now() at time zone 'Asia/Manila')::date-1,'08:00','09:00',1),(2,2,(now() at time zone 'Asia/Manila')::date,'08:00','09:00',1);
    insert into buyer_orders values(1,'ORD-1','${buyer}','${driver}','ready_for_delivery','assigned',((now() at time zone 'Asia/Manila')::date-1 + time '08:00') at time zone 'Asia/Manila',((now() at time zone 'Asia/Manila')::date-1 + time '09:00') at time zone 'Asia/Manila',null,now(),null);
  `);
});
test('overdue scan flags only past dates, notifies immediately without reasons, and deduplicates rescans', async () => {
  assert.equal(await scalar('select detect_overdue_operations()'), 2);
  assert.equal(await scalar('select detect_overdue_operations()'), 0);
  assert.equal(await scalar('select count(*)::int from operation_incidents'), 2);
  assert.equal(await scalar('select count(*)::int from notifications'), 5); // 2 staff + 2 admin + 1 buyer
  assert.equal(await scalar('select count(*)::int from operation_notification_outbox'), 5);
  assert.equal(await scalar('select status_id::int from tasks where id=1'), 1);
});
test('overdue tasks can start and reach review without a reason while another job stays guarded', async () => {
  await assert.rejects(db.exec('update tasks set status_id=2 where id=2'), /Submit a delay reason/);
  await assert.rejects(db.exec("update buyer_orders set delivery_assignment_status='accepted' where id=1"), /Submit a delay reason/);
  await db.exec('update tasks set status_id=2 where id=1');
  assert.equal(await scalar('select status_id::int from tasks where id=1'), 2);
  await db.exec('update tasks set status_id=5,completed_at=now() where id=1');
  assert.equal(await scalar('select status_id::int from tasks where id=1'), 5);
  await db.exec('select detect_overdue_operations()');
  assert.equal(await scalar('select recovery_action from operation_incidents where task_id=1'), 'completed');
  assert.equal(await scalar('select reason_submitted_at is null from operation_incidents where task_id=1'), true);
  await db.exec('update tasks set status_id=2 where id=2');
});
test('atomic recovery preserves original deadline, releases holds, and updates the assignee', async () => {
  await db.exec('select detect_overdue_operations()');
  const id = await scalar('select id from operation_incidents where task_id=1');
  await db.query("select add_operation_dependency($1,'Replacement packing slip','warehouse')", [id]);
  const dep = await scalar('select id from operation_dependencies');
  await assert.rejects(db.query('select complete_operation_dependency($1)', [dep]), /paused/);
  const oldDate = await scalar('select scheduled_at from operation_incidents where task_id=1');
  await db.query("select recover_operation($1,$2,$3,date_trunc('day',now())+interval '2 days 8 hours',date_trunc('day',now())+interval '2 days 9 hours')", [id, admin, backup]);
  assert.equal(await scalar('select assigned_worker_id from tasks where id=1'), backup);
  assert.equal(await scalar('select recovery_action from operation_incidents where task_id=1'), 'reassign');
  assert.equal((await scalar('select scheduled_at from operation_incidents where task_id=1')).getTime(), oldDate.getTime());
  assert.equal(await scalar('select released_at is not null from operation_dependencies'), true);
  await db.query('select complete_operation_dependency($1)', [dep]);
  await assert.rejects(db.query("select recover_operation($1,$2,$3,now()+interval '3 days',now()+interval '3 days 1 hour')", [id, admin, worker]), /no longer needs recovery/);
});
test('schedule conflicts roll back reassignment and recovery history together', async () => {
  await db.exec('select detect_overdue_operations()');
  const id = await scalar('select id from operation_incidents where task_id=1');
  // Existing today task for this worker overlaps the recovery window.
  await assert.rejects(db.query("select recover_operation($1,$2,$3,((now() at time zone 'Asia/Manila')::date+time '08:00') at time zone 'Asia/Manila',((now() at time zone 'Asia/Manila')::date+time '09:00') at time zone 'Asia/Manila')", [id, admin, worker]), /worker_schedule_conflict/);
  assert.equal(await scalar('select recovered_at is null from operation_incidents where task_id=1'), true);
});
test('an in-progress task can keep its worker and move to a free future window', async () => {
  await db.exec('select detect_overdue_operations()');
  const incidentId = await scalar('select id from operation_incidents where task_id=1');
  await db.query("update operation_incidents set reason_code='weather',reason_submitted_at=now() where id=$1", [incidentId]);
  await db.exec('update tasks set status_id=2 where id=1');
  await db.query("select recover_operation($1,$2,$3,((now() at time zone 'Asia/Manila')::date+interval '2 days 8 hours') at time zone 'Asia/Manila',((now() at time zone 'Asia/Manila')::date+interval '2 days 9 hours') at time zone 'Asia/Manila')", [incidentId, admin, worker]);
  assert.equal(await scalar('select recovery_action from operation_incidents where id=$1', [incidentId]), 'reschedule');
  assert.equal(await scalar("select schedule_date = (now() at time zone 'Asia/Manila')::date+2 from schedules where task_id=1"), true);
});
test('driver recovery notifies buyer of confirmed ETA and preserves lifecycle', async () => {
  await db.exec('select detect_overdue_operations()');
  const id = await scalar('select id from operation_incidents where order_id=1');
  await db.query("select recover_operation($1,$2,$3,now()+interval '2 days',now()+interval '2 days 1 hour')", [id, admin, driver]);
  assert.equal(await scalar("select count(*)::int from notifications where recipient_id=$1 and title='New delivery schedule confirmed'", [buyer]), 1);
  assert.equal(await scalar('select delivery_assignment_status from buyer_orders where id=1'), 'assigned');
  await db.query('select request_operation_delivery_date(1,$1,(now() at time zone \'Asia/Manila\')::date+3,\'Please deliver later\')', [buyer]);
  assert.equal(await scalar('select buyer_requested_date is not null from operation_incidents where order_id=1'), true);
  await assert.rejects(db.query("select request_operation_delivery_date(1,$1,current_date+3,'Wrong buyer')", [worker]), /cannot be rescheduled/);
});
test('reviewed unexcused repeats generate one report, and rescans preserve performance history', async () => {
  await db.exec('select detect_overdue_operations()');
  await db.query("insert into operation_incidents(task_id,assignee_id,label,scheduled_at,original_status) values(1,$1,'Older miss',now()-interval '4 days','pending'),(1,$1,'Earlier miss',now()-interval '3 days','pending')", [worker]);
  const ids = (await db.query('select id from operation_incidents where assignee_id=$1 order by id', [worker])).rows;
  for (const i of ids) await db.query("select review_operation_incident($1,$2,'unexcused','Reviewed attendance evidence')", [i.id, admin]);
  assert.equal(await scalar('select count(*)::int from operation_reports'), 1);
  await db.query('select generate_operation_report($1,$2)', [ids.at(-1).id, admin]);
  assert.equal(await scalar('select count(*)::int from operation_reports'), 1);
  const metrics = await scalar('select operation_performance()');
  assert.equal(metrics.find((m) => m.assignee_id === worker).unexcused, 3);
  await assert.rejects(db.query("select review_operation_incident($1,$2,'excused','Changed decision')", [ids[0].id, admin]), /already reviewed/);
});
test('old assignment editors cannot bypass recovery and outbox claims do not duplicate', async () => {
  await db.exec('select detect_overdue_operations()');
  await assert.rejects(db.query('update tasks set assigned_worker_id=$1 where id=1', [backup]), /Use Operations Recovery/);
  await assert.rejects(db.exec("update schedules set schedule_date=current_date+1 where id=1"), /Use Operations Recovery/);
  assert.equal((await db.query('select * from claim_operation_notifications()')).rows.length, 5);
  assert.equal((await db.query('select * from claim_operation_notifications()')).rows.length, 0);
});
test('same-day late hours are not overdue and backup staff do not inherit missed-date penalties', async () => {
  await db.exec("update schedules set start_time='23:00',end_time='23:59' where id=2; select detect_overdue_operations()");
  assert.equal(await scalar('select count(*)::int from operation_incidents where task_id=2'), 0);
  const id = await scalar('select id from operation_incidents where task_id=1');
  await db.query("select recover_operation($1,$2,$3,((now() at time zone 'Asia/Manila')::date+time '10:00') at time zone 'Asia/Manila',((now() at time zone 'Asia/Manila')::date+time '11:00') at time zone 'Asia/Manila')", [id, admin, backup]);
  await db.exec('update tasks set status_id=3,completed_at=now() where id=1; select detect_overdue_operations()');
  const metrics = await scalar('select operation_performance()');
  assert.equal(metrics.find((m) => m.assignee_id === backup).on_time_rate, 100);
  assert.equal(metrics.find((m) => m.assignee_id === worker).missed, 1);
});
test('reason and recovery validation reject forged codes, invalid dates and reversed windows', () => {
  assert.throws(() => validateReason({ reason_code: 'unexcused', notes: 'Overslept' }), /Select/);
  assert.throws(() => validateReason({ reason_code: 'weather', notes: '' }), /Explain/);
  const today = new Date('2026-11-17T00:00:00+08:00');
  const form = { date: '2026-11-17', start_time: '08:00', end_time: '09:00', assignee_id: driver };
  assert.equal(recoveryWindow(form, today).p_start, '2026-11-17T00:00:00.000Z');
  assert.throws(() => recoveryWindow({ ...form, date: '2026-11-16' }, today), /today/);
  assert.throws(() => recoveryWindow({ ...form, date: '2026-02-30' }, today), /valid date/);
  assert.throws(() => recoveryWindow({ ...form, end_time: '07:00' }, today), /end time/);
});
