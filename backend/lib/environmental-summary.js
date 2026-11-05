const manilaTime = (value) => new Date(value).toLocaleTimeString("en-PH", {
  timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit",
});
const number = (value) => Number(value).toFixed(1).replace(/\.0$/, "");
const change = (metric) => Math.round((metric.last - metric.first) * 10) / 10;

function describeMetric(label, metric, unit) {
  if (!metric.count) return `No valid ${label} readings were available.`;
  const first = `${number(metric.first)}${unit}`;
  const last = `${number(metric.last)}${unit}`;
  const difference = change(metric);
  const movement = metric.count < 2 ? "one reading" : difference === 0
    ? "no first-to-last change" : `${difference > 0 ? "up" : "down"} ${number(Math.abs(difference))}${unit === "%" ? " percentage points" : "°C"}`;
  return `${label[0].toUpperCase()}${label.slice(1)} went from ${first} to ${last} (${movement}), averaging ${number(metric.average)}${unit} (range ${number(metric.min)}–${number(metric.max)}${unit}).`;
}

function describePattern(metrics) {
  const list = Object.values(metrics);
  if (list.some((metric) => metric.count < 2)) return "The available readings cannot establish a pattern across all three sensors.";
  const [temperature, humidity, moisture] = list.map((metric) => Math.sign(change(metric)));
  if (temperature === 0 && humidity === 0 && moisture === 0) return "All three sensors ended where they began, showing a stable first-to-last pattern.";
  if (temperature > 0 && humidity < 0 && moisture < 0) return "Temperature ended higher while humidity and moisture ended lower, a warming and drying pattern.";
  if (temperature < 0 && humidity > 0 && moisture > 0) return "Temperature ended lower while humidity and moisture ended higher, a cooling and moistening pattern.";
  if (temperature && temperature === humidity && humidity === moisture) return `All three sensors ended ${temperature > 0 ? "higher" : "lower"}, moving in the same direction.`;
  return "The sensors did not all move in the same direction.";
}

function chooseSuggestion(report, { target = null, activities = [] } = {}) {
  const { soilTemperature, humidity, soilMoisture } = report.metrics;
  if (report.qualityIssues?.length) {
    return `Check the sensors in ${report.field} before acting on this report. Some readings are missing, delayed, or unchanged. Generate a new summary once the sensors are reporting normally.`;
  }
  if (target && soilMoisture.count && soilMoisture.last < target.min) {
    if (!report.isToday) {
      return `Check the current soil moisture in ${report.field} before deciding to water. This report uses readings from an earlier day. Water the field only if a current reading is below its target.`;
    }
    if (activities.some((activity) => activity.type === "irrigation")) {
      return `Check the soil and moisture sensor in ${report.field} before watering again. Irrigation was recorded during this period, and the latest reading may not show its effect yet. Wait for fresh readings and inspect the soil first.`;
    }
    return `Water ${report.field} because its latest soil moisture reading is below the farm's target. After watering, watch the next few readings to see whether moisture rises. If it stays low, check the soil and sensor before watering again.`;
  }
  const temperatureChanged = soilTemperature.count > 1 && change(soilTemperature) !== 0;
  const humidityChanged = humidity.count > 1 && change(humidity) !== 0;
  const moistureChanged = soilMoisture.count > 1 && change(soilMoisture) !== 0;
  if (soilTemperature.count > 1 && humidity.count > 1 && soilMoisture.count > 1 &&
    ((moistureChanged && !temperatureChanged && !humidityChanged) ||
      (!moistureChanged && (temperatureChanged || humidityChanged)))) {
    return `Check the irrigation and drainage in ${report.field}. Compare any field activity with the time the sensor readings changed. Watch the next readings before changing the watering schedule.`;
  }
  if (temperatureChanged && humidityChanged && moistureChanged) {
    const irrigation = activities.some((activity) => activity.type === "irrigation");
    return irrigation
      ? `Check the weather conditions in ${report.field} during this period. All three sensors changed, and irrigation was recorded. Compare the timing before deciding what affected the soil moisture.`
      : `Check the weather conditions in ${report.field} during this period. All three sensors changed, which may be related to weather or sun exposure. Watch the next readings to see whether this pattern continues.`;
  }
  if (!temperatureChanged && !humidityChanged && !moistureChanged &&
    [soilTemperature, humidity, soilMoisture].every((metric) => metric.count > 1)) {
    return `Keep monitoring ${report.field} as new readings arrive. The three sensors ended near where they began, so this report does not call for a change in watering or shading. Compare with the next report for any new pattern.`;
  }
  return `Keep monitoring ${report.field} as new readings arrive. This report does not show a clear reason to change field care. Review the next summary before adjusting watering or shading.`;
}

function buildEnvironmentalSummary(report, options = {}) {
  if (!report.hasReadings) throw new Error("Cannot summarize a field without valid readings");
  const { soilTemperature, humidity, soilMoisture } = report.metrics;
  const counts = [soilTemperature.count, humidity.count, soilMoisture.count];
  const countText = counts.every((count) => count === counts[0])
    ? `${counts[0]} valid ${counts[0] === 1 ? "reading" : "readings"} per sensor`
    : `${counts[0]} soil temperature, ${counts[1]} humidity, and ${counts[2]} soil moisture readings`;
  const latest = report.isToday && report.lastAt &&
    Date.parse(report.generatedAt) - Date.parse(report.lastAt) >= 60 * 1000
    ? ` (latest valid reading at ${manilaTime(report.lastAt)})` : "";
  const period = report.isToday
    ? `As of generation at ${manilaTime(report.generatedAt)}, ${report.field} had ${countText} since the first valid reading at ${manilaTime(report.firstAt)}`
    : `On ${report.date}, ${report.field} had ${countText} from ${manilaTime(report.firstAt)} to ${manilaTime(report.lastAt)}`;
  const temperatureSentence = describeMetric("soil temperature", soilTemperature, "°C");
  const firstSentence = `${period}${latest}; ${temperatureSentence[0].toLowerCase()}${temperatureSentence.slice(1)}`;
  const summary = [
    firstSentence,
    describeMetric("humidity", humidity, "%"),
    describeMetric("soil moisture", soilMoisture, "%"),
    describePattern(report.metrics),
  ].join(" ");
  return {
    summary,
    suggestedCheck: chooseSuggestion(report, options),
    model: "calculated-summary-v3",
  };
}

module.exports = { buildEnvironmentalSummary, chooseSuggestion };
