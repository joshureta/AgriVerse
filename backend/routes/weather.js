const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000; // city coordinates don't move
const FORECAST_TTL_MS = 20 * 60 * 1000; // avoid re-hitting the provider for every worker in the same town

const geocodeCache = new Map();
const forecastCache = new Map();

function cacheGet(cache, key, ttlMs) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.storedAt > ttlMs) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(cache, key, value) {
  cache.set(key, { value, storedAt: Date.now() });
}

// WMO weather codes (https://open-meteo.com/en/docs) bucketed into what the app's widgets render.
const CONDITION_BUCKETS = [
  { codes: [0], condition: "sunny", label: "Sunny" },
  { codes: [1, 2], condition: "cloudy", label: "Partly Cloudy" },
  { codes: [3], condition: "overcast", label: "Overcast" },
  { codes: [45, 48], condition: "foggy", label: "Foggy" },
  { codes: [51, 53, 55, 56, 57], condition: "rainy", label: "Drizzling" },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], condition: "rainy", label: "Raining" },
  { codes: [71, 73, 75, 77, 85, 86], condition: "snowy", label: "Snowing" },
  { codes: [95, 96, 99], condition: "stormy", label: "Thunderstorms" },
];

function classifyWeatherCode(code) {
  const bucket = CONDITION_BUCKETS.find((entry) => entry.codes.includes(code));
  return bucket ? { condition: bucket.condition, label: bucket.label } : { condition: "cloudy", label: "Cloudy" };
}

async function geocodeLocation(query) {
  const cached = cacheGet(geocodeCache, query, GEOCODE_TTL_MS);
  if (cached) return cached;

  const url = new URL(GEOCODE_URL);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  url.searchParams.set("country", "PH");

  const response = await fetch(url);
  if (!response.ok) throw new Error("Location lookup is temporarily unavailable.");
  const payload = await response.json();
  const match = payload?.results?.[0];
  if (!match) return null;

  const province = String(match.admin2 || "").replace(/^Province of\s+/i, "");
  const result = {
    latitude: match.latitude,
    longitude: match.longitude,
    label: [match.name, province || match.admin1].filter(Boolean).join(", "),
  };
  cacheSet(geocodeCache, query, result);
  return result;
}

async function fetchForecast(latitude, longitude) {
  const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const cached = cacheGet(forecastCache, key, FORECAST_TTL_MS);
  if (cached) return cached;

  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure,precipitation"
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset"
  );
  url.searchParams.set("forecast_days", "5");
  url.searchParams.set("timezone", "Asia/Manila");

  const response = await fetch(url);
  if (!response.ok) throw new Error("Weather provider is temporarily unavailable.");
  const payload = await response.json();
  const current = payload?.current;
  if (!current) throw new Error("Weather provider returned an unexpected response.");

  const daily = payload?.daily;
  const times = daily?.time || [];
  const dailyForecast = times.map((timeStr, idx) => {
    const code = daily?.weather_code?.[idx] ?? 0;
    const { condition, label } = classifyWeatherCode(code);
    const dateObj = new Date(timeStr);
    let dayLabel = "Today";
    if (idx === 1) {
      dayLabel = "Tomorrow";
    } else if (idx > 1) {
      dayLabel = dateObj.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
    }

    return {
      date: timeStr,
      day: dayLabel,
      condition,
      label,
      lowTemp: daily?.temperature_2m_min?.[idx] != null ? Math.round(daily.temperature_2m_min[idx]) : 24,
      highTemp: daily?.temperature_2m_max?.[idx] != null ? Math.round(daily.temperature_2m_max[idx]) : 32,
      rainChance:
        daily?.precipitation_probability_max?.[idx] != null
          ? Math.round(daily.precipitation_probability_max[idx])
          : 0,
    };
  });

  const result = {
    ...current,
    highTemp:
      daily?.temperature_2m_max?.[0] != null
        ? Math.round(daily.temperature_2m_max[0])
        : Math.round(current.temperature_2m + 3),
    lowTemp:
      daily?.temperature_2m_min?.[0] != null
        ? Math.round(daily.temperature_2m_min[0])
        : Math.round(current.temperature_2m - 4),
    sunrise: daily?.sunrise?.[0] || null,
    sunset: daily?.sunset?.[0] || null,
    precipitation: current.precipitation != null ? Number(current.precipitation) : 0,
    pressure: current.surface_pressure != null ? Math.round(current.surface_pressure) : 1012,
    dailyForecast,
  };

  cacheSet(forecastCache, key, result);
  return result;
}

function profileLocationQuery(profile) {
  const cityMunicipality = String(profile?.city_municipality || "").trim();
  if (cityMunicipality) return cityMunicipality;
  return "Silang"; // matches the app's default placeholder farm location
}

router.get("/current", requireAuth, async (req, res, next) => {
  try {
    const query = profileLocationQuery(req.profile);
    const place = await geocodeLocation(query);
    if (!place) return res.status(404).json({ error: `Could not find weather for '${query}'.` });

    const current = await fetchForecast(place.latitude, place.longitude);
    const { condition, label } = classifyWeatherCode(current.weather_code);

    return res.json({
      condition,
      label,
      temp: Math.round(current.temperature_2m),
      highTemp: current.highTemp,
      lowTemp: current.lowTemp,
      humidity: Math.round(current.relative_humidity_2m),
      windSpeed: Math.round(current.wind_speed_10m),
      precipitation: current.precipitation,
      pressure: current.pressure,
      sunrise: current.sunrise,
      sunset: current.sunset,
      dailyForecast: current.dailyForecast || [],
      locationLabel: place.label || query,
      observedAt: current.time || new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
