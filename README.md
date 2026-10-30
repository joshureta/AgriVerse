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

## Daily environmental reports

The Environmental Monitoring page shows daily measurements for each field.
Admins can press Generate Summary whenever at least one valid sensor reading is
available. Gemini labels sparse results as partial and describes only the
readings collected. An empty field cannot be summarized. Automatic final reports
require at least six hours of readings and 50% coverage for soil temperature,
humidity, and soil moisture. Weather is excluded because this app does not store
historical weather observations.

Apply `supabase/migrations/045_environmental_daily_reports.sql` in the **main**
AgriVerse Supabase project. The earlier `044_sensor_device_fields.sql` belongs in
the separate **sensor** project. Configure the backend with
`SENSOR_SUPABASE_URL` and `SENSOR_SUPABASE_PUBLISHABLE_KEY` for that sensor
project, alongside its existing `GEMINI_API_KEY`. The backend generates final
reports for the previous Manila day shortly after midnight and checks for a
missed final report when it starts. Manual summaries can be generated before
the reports migration is applied, but they are only shown for the current page
session until report storage is set up.
