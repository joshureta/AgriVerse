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
precedes generation. The calculated summary covers soil temperature, humidity,
and soil moisture, followed by one suggestion chosen from the measured data.
An empty field cannot be summarized. Automatic final reports are generated after
the Manila day ends when at least one valid reading exists; six hours of readings
and 50% coverage indicate a fuller report but are not required for generation.
Weather is excluded because this app does not store historical weather observations.

Apply `supabase/migrations/045_environmental_daily_reports.sql` in the **main**
AgriVerse Supabase project. The earlier `044_sensor_device_fields.sql` belongs in
the separate **sensor** project. Configure the backend with
`SENSOR_SUPABASE_URL` and `SENSOR_SUPABASE_PUBLISHABLE_KEY` for that sensor
project. The backend generates final
reports for the previous Manila day shortly after midnight and checks for a
missed final report when it starts. Manual summaries can be generated before
the reports migration is applied, but they are only shown for the current page
session until report storage is set up.

To enable a direct watering suggestion, set `ENVIRONMENTAL_SOIL_MOISTURE_TARGETS`
on the backend to a JSON object keyed by field, such as
`{"Field A":{"min":35,"max":45}}`. These numbers are only an example; use a
farm-approved target. Without a configured target, the report does not call a
moisture reading too low or recommend watering from that reading alone. Completed
irrigation tasks for the same field and date are considered before suggesting
another watering. Historical rainfall is not recorded, so the report never
claims that rainfall caused a sensor change.
