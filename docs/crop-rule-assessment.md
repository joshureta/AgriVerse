# Rule-based crop health assessment

The Crop Health Monitoring page records four human-selected visual descriptions. A photo is optional evidence; no model interprets it. The server supplies the descriptions and calculates all scores, so changing browser code cannot change a score.

| Assessed visible area with signs | Severity | Score |
| --- | --- | ---: |
| 0%, with a sufficiently clear relevant view | None | 100 |
| More than 0% through 10% | Mild | 85 |
| More than 10% through 30% | Moderate | 60 |
| More than 30% through 60% | Severe | 30 |
| More than 60% | Extensive | 10 |
| Relevant tissue cannot be assessed | Unknown | Excluded |

The inspector records crop condition, disease-like signs, pest-specific signs, and nutrient-like signs separately. A visual sign is not a confirmed cause or diagnosis. These boundaries and point values are a project rubric, not a measured probability or a validated agronomic standard. Review them with a pineapple agronomist before using the score for treatment decisions.

The Crop Health Assessment page averages every valid score for each visual factor from all inspections on the selected Manila date. An unknown factor is excluded from that factor's average. It separately scores each valid sensor reading and averages scores within each sensor factor. The eight resulting factor scores are combined using visual weights (15%, 20%, 15%, 15%) and air temperature (5%), relative humidity (10%), soil moisture (15%), and soil temperature (5%). The number of inspections or readings does not change a factor's final weight. Missing factors are excluded from the weighted calculation and the result is marked partial. A combined score requires at least one visual factor and one sensor factor.

Every valid soil-temperature reading is scored before averaging: 24–30°C = 100; 20–under 24°C or over 30–33°C = 75; 17–under 20°C or over 33–36°C = 40; outside those bands = 10. The raw °C average is displayed separately. These point boundaries are a provisional app rubric, not a published pineapple-health scale. [University of Hawaii research](https://www.ctahr.hawaii.edu/oc/freepubs/pdf/DP-27.pdf) found low root temperatures impaired pineapple nutrient and water uptake and that growth increased through the tested 25–30°C range; review the app bands against sensor depth and local field observations.

The assessment prefers records with `assessment_source = 'rule-inspection'`. If none exist for the selected field and date, it uses saved `gemini-diagnosis` results so previously recorded assessments remain visible. That fallback is labeled as AI photo findings: its visual ratings came from AI, although the factor averaging, sensor scoring, final weights, and current guidance use fixed rules. Once a rule-based checklist is saved for that date, only the rule-based inspections are used. The old AI diagnosis endpoint is disabled by default and returns HTTP 410 unless `ENABLE_LEGACY_AI_CROP_DIAGNOSIS=true` is explicitly set. The current checklist and guidance do not call Gemini.

The `factor_scores` and `assessment_source` columns from migration `064_crop_health_factor_scores.sql` must exist before saving rule-based inspections.
