# AgriVerse

## Automatic monitoring tasks

Run migrations `070_monitoring_task_automation.sql`,
`071_overdue_monitoring_task_findings.sql`, then
`072_assign_new_monitoring_findings.sql` and `073_monitoring_task_rules.sql` in
the **main** Supabase project before deploying the updated backend. Run only the
ones you have not applied yet.
Fresh readings from a device assigned to a field and new admin crop assessments
can create a task automatically. The backend chooses the least-loaded available
crop management worker and the first free one-hour slot from the current Manila
time onward, then sends the normal assignment notification. The admin task page
shows a recent assignment inline, including category, field, worker, and time.
Findings with no available worker remain visible there and are retried every
minute while the backend is running. Older overdue tasks remain overdue;
they do not hide new findings. Reprocessing the same finding does not create
another task. Each saved crop assessment has its own finding key, while
environmental readings of the same condition share a field/day key.

Sensor-based tasks come from the `monitoring_task_rules` table
(`073_monitoring_task_rules.sql`). A database trigger checks every new row in
`sensor_readings` and `soil_readings`, including rows inserted in the SQL
editor. When the three latest readings from that device and field, all from the
last 10 minutes, meet an enabled rule, the rule's category, priority and
description become a new task. Each rule creates at most one task per field per
Manila day. A rule with a `field_name` replaces the all-fields rule of the same
`kind` for that field. Edit `threshold` or set `enabled = false` in the table to
change a rule; the starting humidity, soil-temperature and cold-air thresholds
are placeholders, and the cold-air rule starts disabled. The backend sends the
assignment notification within a minute. `ENVIRONMENTAL_SOIL_MOISTURE_TARGETS`
no longer controls task creation; it is still read by the environmental report.

Admin crop photo diagnoses and rule-based inspections create **Pest & Disease
→ Inspection** for possible pest or disease findings, or **Monitoring** for
crop condition and nutrient-like symptoms. They do not automatically create
pesticide or fertilizer application tasks. The assigned worker verifies the
finding and submits the normal completion evidence for admin review.

To test in a staging project, apply the migration, add an onboarded crop
management worker, confirm the ESP32 is assigned to a field, and configure that
field's approved moisture target. Upload three distinct current readings below
the target and check **Tasks & Schedules** and the worker's mobile tasks. Repeat
the same condition to confirm no second open task is created. Save an admin crop
assessment with a possible pest finding to check the Inspection path. In a
staging project with no eligible crop worker, the finding should appear in the
admin queue.

## Signup email verification codes

The web registration page accepts an emailed verification code after
`supabase.auth.signUp`. In the main Supabase project, keep **Confirm Email**
enabled and configure a production SMTP sender. Under **Authentication → Email
Templates → Confirm signup**, include `{{ .Token }}` in the template. Keep the
confirmation link as a fallback:

```html
<h2>Verify your AgriVerse account</h2>
<p>Enter this code on the registration page: <strong>{{ .Token }}</strong></p>
<p>Or <a href="{{ .ConfirmationURL }}">confirm your email with this link</a>.</p>
```

The **Magic Link** template controls passwordless sign-in, not registration.
The signup code is verified with `verifyOtp({ email, token, type: 'email' })`.
Set the Supabase Site URL to the deployed website and allow its
`/auth/confirm` redirect for the link fallback.

## Worker task start-time restrictions

Worker daily-hours and scheduled-start restrictions are temporarily disabled.
To restore both backend checks, set
`WORKER_TASK_TIME_RESTRICTIONS_ENABLED=true` in the backend environment. To
restore the matching mobile button restriction, set
`EXPO_PUBLIC_WORKER_TASK_TIME_RESTRICTIONS_ENABLED=true` in the mobile build
environment and rebuild or reload the app.

## Daily environmental reports

The Environmental Monitoring page shows daily measurements for each field.
Admins can press Generate Summary whenever at least one valid sensor reading is
available, including during the current day. The report begins with the first
valid reading for the selected Manila date and uses only readings collected by
the generation time. It shows the latest valid reading time separately when it
precedes generation. The calculated summary covers air temperature, soil
temperature, humidity, and soil moisture, followed by one suggestion chosen
from the measured data.
An empty field cannot be summarized. Automatic final reports are generated after
the Manila day ends when at least one valid reading exists; six hours of readings
and 50% coverage indicate a fuller report but are not required for generation.
Weather is excluded because this app does not store historical weather observations.

Apply `supabase/migrations/045_environmental_daily_reports.sql` in the **main**
AgriVerse Supabase project. The earlier `044_sensor_device_fields.sql` belongs in
the **sensor** project. Configure the backend with
`SENSOR_SUPABASE_URL` for that project. When it is the same project as
`SUPABASE_URL`, the backend reuses its existing `SUPABASE_SERVICE_ROLE_KEY`.
For a separate sensor project, set `SENSOR_SUPABASE_SECRET_KEY` on the backend.
Keep secret keys only on the backend. The backend generates final
reports for the previous Manila day shortly after midnight and checks for a
missed final report when it starts. Manual summaries can be generated before
the reports migration is applied, but they are only shown for the current page
session until report storage is set up.

The current firmware reports as `ESP32_001` in Field A. Apply
`supabase/migrations/056_assign_esp32_001_field_a.sql` in the sensor project to
assign new and existing readings to that field. Until then, the website and
report service recognize unassigned readings from that device as Field A.

To enable a direct watering suggestion, set `ENVIRONMENTAL_SOIL_MOISTURE_TARGETS`
on the backend to a JSON object keyed by field, such as
`{"Field A":{"min":35,"max":45}}`. These numbers are only an example; use a
farm-approved target. Without a configured target, the report does not call a
moisture reading too low or recommend watering from that reading alone. Completed
irrigation tasks for the same field and date are considered before suggesting
another watering. Historical rainfall is not recorded, so the report never
claims that rainfall caused a sensor change.

## Close public sensor API access

The sensor project's previous `anon` policies let anyone holding the browser's
publishable key read readings and submit rows with a claimed device ID. To
contain an active exposure, run
`supabase/migrations/066_private_sensor_api.sql` in the **sensor** project's SQL
Editor now. This temporarily stops the old website monitoring, backend reports,
and ESP32 uploads until the following configuration is deployed.

1. Set `SENSOR_SUPABASE_URL` on the backend. If the sensor tables are in the
   same Supabase project as the main app, the existing server-only
   `SUPABASE_SERVICE_ROLE_KEY` is reused. If they are in a different project,
   create a secret API key there and set `SENSOR_SUPABASE_SECRET_KEY` on the
   backend. Remove `SENSOR_SUPABASE_PUBLISHABLE_KEY` from backend configuration.
2. Generate a random token of at least 32 characters. Set the same token as
   `SENSOR_DEVICE_TOKEN` on the backend and `DEVICE_TOKEN` in the active ESP32's
   ignored `secrets.h`. Set backend `SENSOR_DEVICE_ID` to the firmware's
   `DEVICE_ID` (`ESP32_001` for the combined sketch). Set firmware `API_URL` to
   the HTTPS backend origin, deploy the backend, and reflash the device. Do not
   place the sensor project's secret key on the ESP32 or website.
3. Deploy the updated website. Admin monitoring now reads through authenticated
   backend routes and polls for changes. Remove the unused `VITE_SENSOR_*`
   variables from the website's deployment configuration.
4. Verify an unauthenticated GET to `/rest/v1/sensor_readings` with the
   publishable key returns permission denied, while the admin monitoring page
   loads readings and the device receives HTTP 201 for a new reading. The
   backend's `/api/sensors/sensor_readings` also requires an admin session.

If the combined sketch cannot be reflashed immediately, it will keep readings
in its local queue. The simpler test sketches do not queue readings. Do not
restore public insert access to clear the queue.

The Crop Health Assessment page is under Monitoring. For the selected Manila
date, it combines that day's field sensor readings with the latest valid score
for each image factor from that day's saved Gemini diagnosis history. It never
uses an image factor from another date. Apply
`supabase/migrations/064_crop_health_factor_scores.sql` in the **main** project
before expecting a complete weighted score; older inspections have no separate
image factor scores. The page shows Environmental Suitability when all three
sensor factors can be scored. The Crop Health Score requires at least one image
factor and one sensor factor. It divides the weighted sum of available factor
scores by their total available weight and labels scores below 100% weight
coverage as partial. It never fills missing factors with sample values.
Soil temperature is displayed and supplied to Gemini as context; it does not
change the seven-factor score weights.

Assessment soil scoring uses the existing live monitoring boundaries as
provisional defaults: below 25% is dry, 25-30% is below the healthy range,
30-70% is within range, and above 70% is wet. These are sensor-relative app
rules, not farm-calibrated irrigation targets. A field-specific
`ENVIRONMENTAL_SOIL_MOISTURE_TARGETS` entry with `dryBelow`, `min`, and `max`
overrides the defaults when validated limits are available.
The Gemini recommendations use the available assessment evidence and can be
regenerated from the page; they are guidance to verify in the field.

## Crop Health Monitoring image score

New photo diagnoses use the `visible-crop-area-v3` method. Gemini describes
non-overlapping regions of the assessable crop visible in the photo, giving each
region a share of that visible crop and a severity. The backend maps none,
mild, moderate, severe, and extensive to 100, 85, 60, 30, and 10, then
calculates the area-weighted average. The shares must total approximately 100%;
otherwise no score is shown. A healthy region retains 100 points, while visible
damage lowers the score according to its extent and severity. Disease, pest,
and nutrient findings explain the evidence without adding another deduction.
The score describes only assessable crop in the photo, not the whole field.
Older saved diagnoses continue to display their original score and method.

The following weighted-factor method describes those older diagnoses:

The photo diagnosis uses Gemini to identify visible evidence and rate crop
condition, disease, pests, and nutrients as none, mild, moderate, severe,
extensive, or unknown. The backend maps these ratings to 100, 85, 60, 30,
and 10 points. It calculates the image Crop Health Index as the sum of available
weighted scores divided by the sum of available weights, then rounds to a whole
number. Weights are crop condition 30%, disease 40%, pests 20%, and nutrients
10%. Unknown factors are excluded from both sums. When none can be assessed,
the Index has no number. Otherwise the page shows assessment coverage (sum of
available weights as a percent) and labels any result below 100% coverage as
partial. Coverage is not AI diagnostic confidence. The score estimates only
the visible photo, not the health of an entire field.

The existing monitoring view shows the Index, classification, partial
coverage when applicable, and visual findings for assessed and unassessed
categories. Ratings, evidence, weights, and method remain in the saved result.
Older incomplete equal-weight results with saved factor scores
are recalculated for display; older complete scores retain their original value.
Rounded Index classifications are 81-100
Excellent, 61-80 Good, 41-60 Fair, 21-40 Poor, and 0-20 Critical. These fixed
weights make the arithmetic reproducible, but expert-labeled pineapple photos
are still needed to validate accuracy and whether condition and disease ratings
overlap for a given photo.

Apply `supabase/migrations/064_crop_health_factor_scores.sql` followed by
`supabase/migrations/065_nullable_crop_health_score.sql` in the **main** project
before using the new diagnosis flow. The latter permits a diagnosis with no
assessable image factors to be stored without inventing a numeric score.
