# AgriVerse

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
`SENSOR_SUPABASE_URL` and `SENSOR_SUPABASE_PUBLISHABLE_KEY` for that sensor
project. The backend generates final
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

The Crop Health Assessment page is under Monitoring. It combines field sensor
readings with the latest Gemini crop diagnosis from the selected period. Apply
`supabase/migrations/064_crop_health_factor_scores.sql` in the **main** project
before expecting a complete weighted score; older inspections have no separate
image factor scores. The page shows Environmental Suitability when all three
sensor factors can be scored, and a Crop Health Score only when all seven
factors are available. It never fills missing factors with sample values.
Soil temperature is displayed and supplied to Gemini as context; it does not
change the seven-factor score weights.

For assessment soil scoring, extend each field's
`ENVIRONMENTAL_SOIL_MOISTURE_TARGETS` entry with a farm-calibrated `dryBelow`
value below `min`, for example `{"Field A":{"dryBelow":25,"min":35,"max":45}}`.
The numbers here illustrate the configuration shape and must be replaced with
validated field thresholds. Without `dryBelow`, soil moisture remains unscored.
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
