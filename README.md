# AgriVerse

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
