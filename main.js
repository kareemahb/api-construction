// =====================================================
// Construction Checker
// Free APIs (no key needed):
//   Zippopotam.us  - ZIP code -> city, state, coordinates
//   Open-Meteo     - current weather + 5-day forecast
//   weather.gov    - active National Weather Service alerts
//   Census ACS     - how old the homes in the ZIP code are
//   Open-Meteo AQ  - current air quality
//   OpenFEMA       - recent disaster declarations in the state
// =====================================================

const RECENT_KEY = "construction-checker-recent";
const TRADE_KEY = "construction-checker-trade";
const MAX_RECENT = 5;

// WMO weather codes used by Open-Meteo
const WEATHER_CODES = {
  0: { text: "Clear sky", icon: "☀️" },
  1: { text: "Mainly clear", icon: "🌤️" },
  2: { text: "Partly cloudy", icon: "⛅" },
  3: { text: "Overcast", icon: "☁️" },
  45: { text: "Fog", icon: "🌫️" },
  48: { text: "Freezing fog", icon: "🌫️" },
  51: { text: "Light drizzle", icon: "🌦️" },
  53: { text: "Drizzle", icon: "🌦️" },
  55: { text: "Heavy drizzle", icon: "🌧️" },
  56: { text: "Freezing drizzle", icon: "🌧️" },
  57: { text: "Freezing drizzle", icon: "🌧️" },
  61: { text: "Light rain", icon: "🌦️" },
  63: { text: "Rain", icon: "🌧️" },
  65: { text: "Heavy rain", icon: "🌧️" },
  66: { text: "Freezing rain", icon: "🌧️" },
  67: { text: "Freezing rain", icon: "🌧️" },
  71: { text: "Light snow", icon: "🌨️" },
  73: { text: "Snow", icon: "🌨️" },
  75: { text: "Heavy snow", icon: "❄️" },
  77: { text: "Snow grains", icon: "🌨️" },
  80: { text: "Rain showers", icon: "🌦️" },
  81: { text: "Rain showers", icon: "🌧️" },
  82: { text: "Violent showers", icon: "⛈️" },
  85: { text: "Snow showers", icon: "🌨️" },
  86: { text: "Snow showers", icon: "🌨️" },
  95: { text: "Thunderstorm", icon: "⛈️" },
  96: { text: "Thunderstorm with hail", icon: "⛈️" },
  99: { text: "Thunderstorm with hail", icon: "⛈️" },
};

const RAIN_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82,
]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const STORM_CODES = new Set([95, 96, 99]);

// Each trade has its own limits. Temperatures in °F, wind gusts in mph.
const TRADES = {
  general: {
    label: "General Construction",
    heatCaution: 90,
    heatStop: 103,
    coldCaution: 32,
    coldStop: 10,
    windCaution: 25,
    windStop: 40,
    rainPenalty: 15,
    tips: [
      "Walk the site first and note trip hazards, overhead lines, and open trenches.",
      "Check ladders and scaffolding before every use.",
      "Keep a stocked first aid kit and fire extinguisher on site.",
    ],
  },
  roofing: {
    label: "Roofing",
    heatCaution: 85,
    heatStop: 100,
    coldCaution: 40,
    coldStop: 20,
    windCaution: 20,
    windStop: 30,
    rainPenalty: 40,
    tips: [
      "Set up fall protection before anyone steps onto the roof.",
      "Wet, frosty, or dusty shingles are slippery. Wait until surfaces are dry.",
      "Secure bundles and sheets of material, since gusts can lift them off the roof.",
    ],
  },
  hvac: {
    label: "HVAC",
    heatCaution: 85,
    heatStop: 100,
    coldCaution: 32,
    coldStop: 10,
    windCaution: 25,
    windStop: 40,
    rainPenalty: 15,
    tips: [
      "Attics can be 30°F+ hotter than outside. Plan attic work for the morning.",
      "Shut off and lock out power before servicing units.",
      "Check for gas leaks and carbon monoxide around older furnaces.",
    ],
  },
  plumbing: {
    label: "Plumbing",
    heatCaution: 90,
    heatStop: 103,
    coldCaution: 32,
    coldStop: 10,
    windCaution: 30,
    windStop: 45,
    rainPenalty: 15,
    tips: [
      "Below freezing, check for frozen or burst pipes and protect exposed lines.",
      "Call 811 before any digging so buried utilities get marked.",
      "Use ventilation when soldering or using solvents in tight spaces.",
    ],
  },
  electrical: {
    label: "Electrical",
    heatCaution: 90,
    heatStop: 103,
    coldCaution: 32,
    coldStop: 10,
    windCaution: 25,
    windStop: 35,
    rainPenalty: 35,
    tips: [
      "Never do outdoor electrical work in rain or on wet surfaces.",
      "Lock out and tag out circuits, then test before you touch.",
      "Use GFCI protection for all temporary power on site.",
    ],
  },
  painting: {
    label: "Painting",
    heatCaution: 90,
    heatStop: 100,
    coldCaution: 50,
    coldStop: 35,
    windCaution: 15,
    windStop: 25,
    rainPenalty: 40,
    humidityCaution: 85,
    tips: [
      "Most exterior paints need 50°F+ and dry surfaces to cure properly.",
      "Wind carries overspray. Cover cars and nearby surfaces.",
      "In older homes, test paint for lead before you sand or scrape.",
    ],
  },
};

// U.S. EPA Air Quality Index categories
const AQI_LEVELS = [
  { max: 50, label: "Good", level: "good" },
  { max: 100, label: "Moderate", level: "good" },
  { max: 150, label: "Sensitive groups", level: "caution" },
  { max: 200, label: "Unhealthy", level: "stop" },
  { max: 300, label: "Very Unhealthy", level: "stop" },
  { max: Infinity, label: "Hazardous", level: "stop" },
];

const DISASTER_ICONS = {
  "Severe Storm": "⛈️",
  Flood: "🌊",
  Hurricane: "🌀",
  "Tropical Storm": "🌀",
  Tornado: "🌪️",
  Fire: "🔥",
  Snowstorm: "❄️",
  "Severe Ice Storm": "🧊",
  "Winter Storm": "❄️",
  Earthquake: "🌎",
  "Coastal Storm": "🌊",
  Mud: "🪨",
  Biological: "🦠",
};

const DISASTER_YEARS = 5;

// ---------- Helpers ----------

const escapeHTML = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const weatherInfo = (code) =>
  WEATHER_CODES[code] ?? { text: "Unknown", icon: "🌡️" };

const round = (value) => Math.round(Number(value));

const readStorage = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked (private mode). The app still works without it.
  }
};

const fetchJSON = async (url, options = {}) => {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = new Error(`Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  // The Census API sends 204 No Content when there's no data
  if (response.status === 204) return null;

  return response.json();
};

// Scores a set of conditions for one trade. Used for "right now" and each forecast day.
const evaluateConditions = (conditions, trade) => {
  const issues = [];
  let score = 100;

  const addIssue = (points, level, text) => {
    score -= points;
    issues.push({ level, text });
  };

  const { temp, gust, humidity, rain, snow, storm } = conditions;

  if (storm) {
    addIssue(
      35,
      "stop",
      "Thunderstorms: stay off roofs, ladders, and scaffolds, and avoid metal equipment.",
    );
  }

  if (temp >= trade.heatStop) {
    addIssue(
      30,
      "stop",
      `Extreme heat (${round(temp)}°F): high risk of heat illness. Limit outdoor work.`,
    );
  } else if (temp >= trade.heatCaution) {
    addIssue(
      15,
      "caution",
      `Hot (${round(temp)}°F): plan water, rest, and shade breaks.`,
    );
  }

  if (temp <= trade.coldStop) {
    addIssue(
      25,
      "stop",
      `Extreme cold (${round(temp)}°F): frostbite risk. Keep exposure short.`,
    );
  } else if (temp <= trade.coldCaution) {
    addIssue(
      10,
      "caution",
      `Cold (${round(temp)}°F): watch for ice and dress in layers.`,
    );
  }

  if (gust >= trade.windStop) {
    addIssue(
      30,
      "stop",
      `Wind gusts ${round(gust)} mph: unsafe for ladders, lifts, and work at heights.`,
    );
  } else if (gust >= trade.windCaution) {
    addIssue(
      12,
      "caution",
      `Wind gusts ${round(gust)} mph: secure materials and take care at heights.`,
    );
  }

  if (rain && !storm) {
    const level = trade.rainPenalty >= 30 ? "stop" : "caution";
    addIssue(
      trade.rainPenalty,
      level,
      "Rain: wet, slippery surfaces. Protect tools and materials.",
    );
  }

  if (snow) {
    addIssue(
      20,
      "caution",
      "Snow or ice: clear walkways and ladders before starting.",
    );
  }

  if (trade.humidityCaution && humidity >= trade.humidityCaution) {
    addIssue(
      10,
      "caution",
      `Humidity ${round(humidity)}%: coatings may not dry or cure properly.`,
    );
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), issues };
};

const aqiLevel = (aqi) => AQI_LEVELS.find((level) => aqi <= level.max);

const verdictFor = (score) => {
  if (score >= 75)
    return {
      level: "good",
      label: "Good to go",
      sub: "Conditions look workable for your trade.",
    };
  if (score >= 50)
    return {
      level: "caution",
      label: "Use caution",
      sub: "Work is possible with extra precautions.",
    };
  return {
    level: "stop",
    label: "Hold outdoor work",
    sub: "Consider rescheduling outdoor or high work.",
  };
};

// =====================================================
// API classes
// =====================================================

class ZipLookupAPI {
  constructor() {
    this.baseURL = "https://api.zippopotam.us/us";
  }

  async getLocation(zipCode) {
    try {
      const data = await fetchJSON(`${this.baseURL}/${zipCode}`);
      const place = data.places[0];

      return {
        zip: zipCode,
        city: place["place name"],
        state: place.state,
        stateCode: place["state abbreviation"],
        lat: Number(place.latitude),
        lon: Number(place.longitude),
      };
    } catch (error) {
      if (error.status === 404) {
        throw new Error(
          `We couldn't find ZIP code ${zipCode}. Double-check it and try again.`,
        );
      }
      throw new Error(
        "The ZIP code lookup service isn't responding. Please try again in a minute.",
      );
    }
  }
}

class WeatherAPI {
  constructor() {
    this.baseURL = "https://api.open-meteo.com/v1/forecast";
  }

  async getForecast(lat, lon) {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "precipitation",
        "weather_code",
        "wind_speed_10m",
        "wind_gusts_10m",
        "uv_index",
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "wind_gusts_10m_max",
      ].join(","),
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      precipitation_unit: "inch",
      forecast_days: 5,
      timezone: "auto",
    });

    const data = await fetchJSON(`${this.baseURL}?${params}`);
    const { daily } = data;

    return {
      current: data.current,
      days: daily.time.map((date, i) => ({
        date,
        code: daily.weather_code[i],
        high: daily.temperature_2m_max[i],
        low: daily.temperature_2m_min[i],
        rainChance: daily.precipitation_probability_max[i] ?? 0,
        gust: daily.wind_gusts_10m_max[i],
      })),
    };
  }
}

class AlertsAPI {
  constructor() {
    this.baseURL = "https://api.weather.gov/alerts/active";
  }

  async getAlerts(lat, lon) {
    const point = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const data = await fetchJSON(`${this.baseURL}?point=${point}`, {
      headers: { Accept: "application/geo+json" },
    });

    return data.features.map(({ properties }) => ({
      event: properties.event,
      severity: properties.severity,
      headline: properties.headline,
      ends: properties.ends ?? properties.expires,
      description: properties.description,
      instruction: properties.instruction,
    }));
  }
}

class HousingAPI {
  constructor() {
    // American Community Survey 5-year estimates
    this.baseURL = "https://api.census.gov/data/2022/acs/acs5";
  }

  async getHomeAge(zipCode) {
    // B25035_001E = median year built
    // B25034_001E = total homes, B25034_007E-011E = built 1979 or earlier
    const fields = [
      "B25035_001E",
      "B25034_001E",
      "B25034_007E",
      "B25034_008E",
      "B25034_009E",
      "B25034_010E",
      "B25034_011E",
    ];

    const url = `${this.baseURL}?get=${fields.join(",")}&for=zip%20code%20tabulation%20area:${zipCode}`;
    const rows = await fetchJSON(url);

    if (!rows || rows.length < 2) return null;

    const [headers, values] = rows;
    const get = (field) => Number(values[headers.indexOf(field)]);

    const total = get("B25034_001E");
    if (!total) return null;

    const pre1980 = [
      "B25034_007E",
      "B25034_008E",
      "B25034_009E",
      "B25034_010E",
      "B25034_011E",
    ]
      .map(get)
      .reduce((sum, count) => sum + count, 0);

    const pre1950 = get("B25034_010E") + get("B25034_011E");
    const medianYear = get("B25035_001E");

    return {
      total,
      medianYear: medianYear > 0 ? medianYear : null,
      pre1980Share: pre1980 / total,
      pre1950Share: pre1950 / total,
    };
  }
}

class AirQualityAPI {
  constructor() {
    this.baseURL = "https://air-quality-api.open-meteo.com/v1/air-quality";
  }

  async getAirQuality(lat, lon) {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: "us_aqi,pm2_5,pm10,ozone",
      timezone: "auto",
    });

    const data = await fetchJSON(`${this.baseURL}?${params}`);
    return data.current;
  }
}

class DisasterAPI {
  constructor() {
    this.baseURL =
      "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries";
  }

  async getRecentDisasters(stateCode) {
    const since = new Date();
    since.setFullYear(since.getFullYear() - DISASTER_YEARS);

    // OData-style query. Built by hand so spaces become %20, not +
    const query = [
      `$filter=${encodeURIComponent(`state eq '${stateCode}' and declarationDate ge '${since.toISOString()}'`)}`,
      `$orderby=${encodeURIComponent("declarationDate desc")}`,
      "$top=1000",
    ].join("&");

    const data = await fetchJSON(`${this.baseURL}?${query}`);

    // FEMA lists one row per county, so keep one entry per disaster
    const disasters = new Map();

    for (const item of data.DisasterDeclarationsSummaries ?? []) {
      if (disasters.has(item.disasterNumber)) continue;

      disasters.set(item.disasterNumber, {
        number: item.disasterNumber,
        type: item.incidentType,
        title: item.declarationTitle ?? item.title,
        date: item.declarationDate,
      });
    }

    return [...disasters.values()];
  }
}

// =====================================================
// App
// =====================================================

class ConstructionCheckApp {
  constructor() {
    this.zipAPI = new ZipLookupAPI();
    this.weatherAPI = new WeatherAPI();
    this.alertsAPI = new AlertsAPI();
    this.housingAPI = new HousingAPI();
    this.airQualityAPI = new AirQualityAPI();
    this.disasterAPI = new DisasterAPI();

    this.report = null;

    this.form = document.querySelector("#zip-form");
    this.zipInput = document.querySelector("#zip-input");
    this.tradeSelect = document.querySelector("#trade-select");
    this.checkButton = document.querySelector("#check-button");
    this.formError = document.querySelector("#form-error");
    this.results = document.querySelector("#results");
    this.recent = document.querySelector("#recent");
    this.recentList = document.querySelector("#recent-list");
  }

  init() {
    this.renderTradeOptions();
    this.renderRecent();
    this.addEventListeners();

    const params = new URLSearchParams(window.location.search);
    const zipFromURL = params.get("zip");
    const tradeFromURL = params.get("trade");

    if (tradeFromURL && TRADES[tradeFromURL]) {
      this.tradeSelect.value = tradeFromURL;
    }

    if (zipFromURL && /^\d{5}$/.test(zipFromURL)) {
      this.zipInput.value = zipFromURL;
      this.checkArea(zipFromURL);
    }
  }

  get trade() {
    return TRADES[this.tradeSelect.value] ?? TRADES.general;
  }

  addEventListeners() {
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleSubmit();
    });

    // Only allow digits in the ZIP field
    this.zipInput.addEventListener("input", () => {
      this.zipInput.value = this.zipInput.value.replace(/\D/g, "").slice(0, 5);
      this.formError.textContent = "";
    });

    // Changing trade re-scores the current report without new API calls
    this.tradeSelect.addEventListener("change", () => {
      writeStorage(TRADE_KEY, this.tradeSelect.value);
      if (this.report) {
        this.renderReport();
        this.updateURL();
      }
    });

    this.recentList.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-zip]");
      if (!chip) return;

      this.zipInput.value = chip.dataset.zip;
      this.handleSubmit();
    });

    // Buttons inside the results are re-rendered, so listen on the container
    this.results.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;

      if (action === "copy") this.copyBriefing();
      if (action === "share") this.copyLink();
      if (action === "print") window.print();
    });
  }

  handleSubmit() {
    const zip = this.zipInput.value.trim();

    if (!/^\d{5}$/.test(zip)) {
      this.formError.textContent = "Please enter a valid 5-digit ZIP code.";
      this.zipInput.focus();
      return;
    }

    this.checkArea(zip);
  }

  async checkArea(zip) {
    this.formError.textContent = "";
    this.setLoading(true);
    this.renderLoading();

    try {
      const location = await this.zipAPI.getLocation(zip);

      // Each source loads on its own, so one failing doesn't break the rest
      const [weather, alerts, housing, air, disasters] =
        await Promise.allSettled([
          this.weatherAPI.getForecast(location.lat, location.lon),
          this.alertsAPI.getAlerts(location.lat, location.lon),
          this.housingAPI.getHomeAge(zip),
          this.airQualityAPI.getAirQuality(location.lat, location.lon),
          this.disasterAPI.getRecentDisasters(location.stateCode),
        ]);

      this.report = { location, weather, alerts, housing, air, disasters };

      this.saveRecent(location);
      this.renderReport();
      this.updateURL();
    } catch (error) {
      console.error(error);
      this.report = null;
      this.results.innerHTML = `<div class="error-card">${escapeHTML(error.message)}</div>`;
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(isLoading) {
    this.checkButton.disabled = isLoading;
    this.checkButton.textContent = isLoading ? "Checking..." : "Check Area";
  }

  updateURL() {
    const { zip } = this.report.location;
    const url = `${window.location.pathname}?zip=${zip}&trade=${this.tradeSelect.value}`;
    window.history.replaceState(null, "", url);
  }

  // ---------- Scoring ----------

  getSiteScore() {
    const { weather, alerts, air } = this.report;
    if (weather.status !== "fulfilled") return null;

    const { current } = weather.value;
    const code = current.weather_code;

    const result = evaluateConditions(
      {
        temp: current.apparent_temperature,
        gust: current.wind_gusts_10m,
        humidity: current.relative_humidity_2m,
        rain: current.precipitation > 0 || RAIN_CODES.has(code),
        snow: SNOW_CODES.has(code),
        storm: STORM_CODES.has(code),
      },
      this.trade,
    );

    if (current.uv_index >= 8) {
      result.score -= 5;
      result.issues.push({
        level: "caution",
        text: `UV index ${round(current.uv_index)}: wear sunscreen and cover up.`,
      });
    }

    // Poor air quality matters for anyone working outside all day
    const aqi = air.status === "fulfilled" ? air.value?.us_aqi : null;

    if (aqi > 200) {
      result.score -= 35;
      result.issues.push({
        level: "stop",
        text: `Air quality index ${round(aqi)}: limit outdoor work and use respirators.`,
      });
    } else if (aqi > 150) {
      result.score -= 20;
      result.issues.push({
        level: "stop",
        text: `Air quality index ${round(aqi)}: unhealthy air. Shorten outdoor shifts.`,
      });
    } else if (aqi > 100) {
      result.score -= 10;
      result.issues.push({
        level: "caution",
        text: `Air quality index ${round(aqi)}: crew with asthma or heart conditions should limit time outside.`,
      });
    }

    // Active weather alerts lower the score too
    if (alerts.status === "fulfilled" && alerts.value.length) {
      const severe = alerts.value.some((alert) =>
        ["Extreme", "Severe"].includes(alert.severity),
      );
      result.score -= severe ? 30 : 10;
      result.issues.unshift({
        level: severe ? "stop" : "caution",
        text: `${alerts.value.length} active weather alert${alerts.value.length > 1 ? "s" : ""}: ${alerts.value[0].event}.`,
      });
    }

    result.score = Math.max(0, Math.min(100, result.score));
    return result;
  }

  // ---------- Rendering ----------

  renderTradeOptions() {
    this.tradeSelect.innerHTML = Object.entries(TRADES)
      .map(([key, trade]) => `<option value="${key}">${trade.label}</option>`)
      .join("");

    const savedTrade = readStorage(TRADE_KEY, "general");
    this.tradeSelect.value = TRADES[savedTrade] ? savedTrade : "general";
  }

  renderLoading() {
    this.results.innerHTML = `
      <div class="grid">
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
      </div>
    `;
  }

  renderReport() {
    const { location } = this.report;

    this.results.innerHTML = `
      <div class="location-bar">
        <div>
          <h2>${escapeHTML(location.city)}, ${escapeHTML(location.stateCode)} ${location.zip}</h2>
          <p class="location-meta">${escapeHTML(location.state)} · ${location.lat.toFixed(3)}, ${location.lon.toFixed(3)} · ${escapeHTML(this.trade.label)}</p>
        </div>
        <div class="action-buttons">
          <button class="btn-outline" type="button" data-action="copy">📋 Copy briefing</button>
          <button class="btn-outline" type="button" data-action="share">🔗 Share link</button>
          <button class="btn-outline" type="button" data-action="print">🖨️ Print</button>
        </div>
      </div>

      <div class="grid">
        ${this.scoreCard()}
        ${this.conditionsCard()}
        ${this.alertsCard()}
        ${this.airQualityCard()}
        ${this.disastersCard()}
        ${this.homeAgeCard()}
        ${this.plannerCard()}
        ${this.tipsCard()}
      </div>
    `;
  }

  scoreCard() {
    const result = this.getSiteScore();

    if (!result) {
      return `
        <article class="card score-card">
          <h3 class="card-title">Site Conditions Score</h3>
          <p class="unavailable">Weather data is unavailable, so the score can't be calculated right now.</p>
        </article>
      `;
    }

    const verdict = verdictFor(result.score);
    const issues = result.issues.length
      ? result.issues
          .map(
            (issue) =>
              `<li class="issue issue-${issue.level}">${escapeHTML(issue.text)}</li>`,
          )
          .join("")
      : '<li class="issue issue-good">No weather concerns for your trade right now.</li>';

    return `
      <article class="card score-card">
        <h3 class="card-title">Site Conditions Score</h3>
        <div class="score-body">
          <div class="gauge" style="--value: ${result.score}; --gauge-color: var(--${verdict.level === "good" ? "mint" : verdict.level})">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle class="gauge-track" cx="60" cy="60" r="52" pathLength="100" />
              <circle class="gauge-fill" cx="60" cy="60" r="52" pathLength="100" />
            </svg>
            <div class="gauge-label">
              <span class="gauge-score">${result.score}</span>
              <span class="gauge-max">/ 100</span>
            </div>
          </div>
          <div>
            <p class="verdict">${verdict.label}</p>
            <p class="verdict-sub">${verdict.sub}</p>
          </div>
        </div>
        <ul class="issue-list">${issues}</ul>
      </article>
    `;
  }

  conditionsCard() {
    const { weather } = this.report;

    if (weather.status !== "fulfilled") {
      return this.unavailableCard(
        "Conditions Right Now",
        "Weather data couldn't be loaded.",
      );
    }

    const { current } = weather.value;
    const info = weatherInfo(current.weather_code);

    return `
      <article class="card">
        <h3 class="card-title">Conditions Right Now</h3>
        <div class="now-main">
          <span class="now-icon" aria-hidden="true">${info.icon}</span>
          <div>
            <p class="now-temp">${round(current.temperature_2m)}°F</p>
            <p class="muted">${info.text} · Feels like ${round(current.apparent_temperature)}°F</p>
          </div>
        </div>
        <div class="stat-grid">
          ${this.stat("Wind", `${round(current.wind_speed_10m)} mph`)}
          ${this.stat("Gusts", `${round(current.wind_gusts_10m)} mph`)}
          ${this.stat("Humidity", `${round(current.relative_humidity_2m)}%`)}
          ${this.stat("UV Index", round(current.uv_index))}
        </div>
      </article>
    `;
  }

  alertsCard() {
    const { alerts } = this.report;

    if (alerts.status !== "fulfilled") {
      return this.unavailableCard(
        "Weather Alerts",
        "National Weather Service alerts couldn't be loaded.",
      );
    }

    if (!alerts.value.length) {
      return `
        <article class="card">
          <h3 class="card-title">Weather Alerts <span class="badge badge-good">All clear</span></h3>
          <div class="all-clear"><span aria-hidden="true">✅</span> No active National Weather Service alerts for this area.</div>
        </article>
      `;
    }

    const list = alerts.value
      .map((alert) => {
        const severe = ["Extreme", "Severe"].includes(alert.severity);
        const ends = alert.ends
          ? `Until ${new Date(alert.ends).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`
          : "";

        return `
          <details class="alert ${severe ? "alert-severe" : ""}">
            <summary>${escapeHTML(alert.event)}</summary>
            <p class="alert-meta">${escapeHTML(alert.severity)} ${ends ? `· ${ends}` : ""}</p>
            <p class="alert-text">${escapeHTML(alert.instruction || alert.description || alert.headline)}</p>
          </details>
        `;
      })
      .join("");

    return `
      <article class="card">
        <h3 class="card-title">Weather Alerts <span class="badge badge-stop">${alerts.value.length} active</span></h3>
        <div class="alert-list">${list}</div>
      </article>
    `;
  }

  homeAgeCard() {
    const { housing } = this.report;

    if (housing.status !== "fulfilled" || !housing.value) {
      return this.unavailableCard(
        "Home Age & Hazards",
        "Census housing data isn't available for this ZIP code.",
      );
    }

    const { medianYear, pre1980Share, pre1950Share, total } = housing.value;
    const pct = Math.round(pre1980Share * 100);

    const risk =
      pre1980Share >= 0.5
        ? { level: "stop", label: "High" }
        : pre1980Share >= 0.2
          ? { level: "caution", label: "Moderate" }
          : { level: "good", label: "Low" };

    const checklist = [];

    if (pre1980Share > 0) {
      checklist.push(
        "<strong>Lead paint:</strong> homes built before 1978 may have it. Test before sanding, scraping, or demo, and follow EPA lead-safe (RRP) practices.",
        "<strong>Asbestos:</strong> common in pre-1980 insulation, flooring, ceiling texture, and pipe wrap. Don't disturb suspect materials until they're tested.",
      );
    }

    if (pre1950Share >= 0.1) {
      checklist.push(
        "<strong>Old wiring:</strong> pre-1950 homes may still have knob-and-tube wiring or no grounding.",
        "<strong>Old pipes:</strong> galvanized steel or lead service lines are possible in older homes.",
      );
    }

    if (!checklist.length) {
      checklist.push(
        "<strong>Newer housing stock:</strong> lower chance of lead paint and asbestos, but always check the specific home.",
      );
    }

    return `
      <article class="card card-wide">
        <h3 class="card-title">Home Age & Hazards <span class="badge badge-${risk.level}">${risk.label} risk</span></h3>
        <div class="home-grid">
          <div class="home-stats">
            <div class="stat-grid">
              ${this.stat("Median year built", medianYear ?? "N/A")}
              ${this.stat("Homes in ZIP", total.toLocaleString())}
            </div>
            <div>
              <div class="age-bar" role="img" aria-label="${pct}% of homes built before 1980">
                <div class="age-bar-fill" style="--pct: ${pct}%"></div>
              </div>
              <div class="age-bar-labels"><span>${pct}% built before 1980</span><span>${100 - pct}% newer</span></div>
            </div>
            <p class="card-note">Source: U.S. Census Bureau, American Community Survey 5-year estimates.</p>
          </div>
          <ul class="check-list">${checklist.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
      </article>
    `;
  }

  airQualityCard() {
    const { air } = this.report;

    if (air.status !== "fulfilled" || air.value?.us_aqi == null) {
      return this.unavailableCard(
        "Air Quality",
        "Air quality data couldn't be loaded.",
      );
    }

    const { us_aqi: aqi, pm2_5: pm25, pm10, ozone } = air.value;
    const category = aqiLevel(aqi);

    const tip =
      aqi > 150
        ? "Unhealthy air. Use N95 respirators outdoors and take breaks indoors."
        : aqi > 100
          ? "Sensitive crew members (asthma, heart conditions) should limit heavy outdoor work."
          : "Air quality is fine for outdoor work. Still use dust control when cutting or sanding.";

    return `
      <article class="card">
        <h3 class="card-title">Air Quality <span class="badge badge-${category.level}">${category.label}</span></h3>
        <div class="now-main">
          <span class="now-icon" aria-hidden="true">😷</span>
          <div>
            <p class="now-temp">${round(aqi)}</p>
            <p class="muted">U.S. Air Quality Index (0–500)</p>
          </div>
        </div>
        <div class="stat-grid stat-grid-3">
          ${this.stat("PM2.5", round(pm25))}
          ${this.stat("PM10", round(pm10))}
          ${this.stat("Ozone", round(ozone))}
        </div>
        <p class="card-note">${tip} Particles and ozone are in µg/m³.</p>
      </article>
    `;
  }

  disastersCard() {
    const { disasters, location } = this.report;
    const title = `FEMA Disasters in ${escapeHTML(location.stateCode)} (Last ${DISASTER_YEARS} Years)`;

    if (disasters.status !== "fulfilled") {
      return this.unavailableCard(
        title,
        "FEMA disaster data couldn't be loaded.",
      );
    }

    const list = disasters.value;

    if (!list.length) {
      return `
        <article class="card card-span-2">
          <h3 class="card-title">${title} <span class="badge badge-good">None</span></h3>
          <div class="all-clear"><span aria-hidden="true">✅</span> No federal disaster declarations in ${escapeHTML(location.state)} in the last ${DISASTER_YEARS} years.</div>
        </article>
      `;
    }

    // Count disasters by type, most common first
    const counts = list.reduce((totals, disaster) => {
      totals[disaster.type] = (totals[disaster.type] ?? 0) + 1;
      return totals;
    }, {});

    const chips = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([type, count]) =>
          `<span class="type-chip">${DISASTER_ICONS[type] ?? "⚠️"} ${escapeHTML(type)} <strong>${count}</strong></span>`,
      )
      .join("");

    const recent = list
      .slice(0, 4)
      .map(
        (disaster) => `
          <li>
            <span class="disaster-icon" aria-hidden="true">${DISASTER_ICONS[disaster.type] ?? "⚠️"}</span>
            <div>
              <p class="disaster-title">${escapeHTML(disaster.title)}</p>
              <p class="card-note">${escapeHTML(disaster.type)} · ${new Date(disaster.date).toLocaleDateString([], { month: "short", year: "numeric" })}</p>
            </div>
          </li>
        `,
      )
      .join("");

    return `
      <article class="card card-span-2">
        <h3 class="card-title">${title} <span class="badge badge-caution">${list.length} declared</span></h3>
        <div class="type-chips">${chips}</div>
        <ul class="disaster-list">${recent}</ul>
        <p class="card-note">Shows which hazards hit this state most, so you can plan materials, scheduling, and storm prep.</p>
      </article>
    `;
  }

  plannerCard() {
    const { weather } = this.report;
    if (weather.status !== "fulfilled") return "";

    const days = weather.value.days
      .map((day, index) => {
        const { score } = evaluateConditions(
          {
            temp: day.high,
            gust: day.gust,
            rain: day.rainChance >= 50,
            snow: SNOW_CODES.has(day.code),
            storm: STORM_CODES.has(day.code),
          },
          this.trade,
        );

        const verdict = verdictFor(score);
        const info = weatherInfo(day.code);
        const name =
          index === 0
            ? "Today"
            : new Date(`${day.date}T12:00:00`).toLocaleDateString([], {
                weekday: "short",
              });

        return `
          <div class="day day-${verdict.level}">
            <p class="day-name">${name}</p>
            <span class="day-icon" aria-hidden="true">${info.icon}</span>
            <p class="day-temps">${round(day.high)}° <span>${round(day.low)}°</span></p>
            <p class="day-detail">💧 ${round(day.rainChance)}% · 💨 ${round(day.gust)} mph</p>
            <span class="badge badge-${verdict.level}">${verdict.label}</span>
          </div>
        `;
      })
      .join("");

    return `
      <article class="card card-wide">
        <h3 class="card-title">5-Day Work Planner</h3>
        <div class="planner">${days}</div>
        <p class="card-note">Ratings use each day's high temperature, rain chance, and strongest gusts for ${escapeHTML(this.trade.label.toLowerCase())}.</p>
      </article>
    `;
  }

  tipsCard() {
    return `
      <article class="card card-wide">
        <h3 class="card-title">${escapeHTML(this.trade.label)} Safety Tips</h3>
        <ul class="tips-list">${this.trade.tips.map((tip) => `<li>${escapeHTML(tip)}</li>`).join("")}</ul>
      </article>
    `;
  }

  stat(label, value) {
    return `
      <div class="stat">
        <p class="stat-label">${escapeHTML(label)}</p>
        <p class="stat-value">${escapeHTML(value)}</p>
      </div>
    `;
  }

  unavailableCard(title, message) {
    return `
      <article class="card">
        <h3 class="card-title">${escapeHTML(title)}</h3>
        <p class="unavailable">${escapeHTML(message)}</p>
      </article>
    `;
  }

  // ---------- Recent searches ----------

  saveRecent(location) {
    const label = `${location.city}, ${location.stateCode}`;
    const recent = readStorage(RECENT_KEY, []).filter(
      (item) => item.zip !== location.zip,
    );

    recent.unshift({ zip: location.zip, label });
    writeStorage(RECENT_KEY, recent.slice(0, MAX_RECENT));
    this.renderRecent();
  }

  renderRecent() {
    const recent = readStorage(RECENT_KEY, []);
    this.recent.hidden = recent.length === 0;

    this.recentList.innerHTML = recent
      .map(
        (item) =>
          `<button class="chip" type="button" data-zip="${escapeHTML(item.zip)}">${escapeHTML(item.zip)} · ${escapeHTML(item.label)}</button>`,
      )
      .join("");
  }

  // ---------- Briefing + sharing ----------

  buildBriefing() {
    const { location, weather, alerts, housing, air, disasters } = this.report;
    const lines = [
      "JOB SITE BRIEFING: Construction Checker",
      `${location.city}, ${location.stateCode} ${location.zip} · ${this.trade.label}`,
      `Checked: ${new Date().toLocaleString()}`,
      "",
    ];

    const result = this.getSiteScore();
    if (result) {
      lines.push(
        `Site score: ${result.score}/100 (${verdictFor(result.score).label})`,
      );
    }

    if (weather.status === "fulfilled") {
      const { current } = weather.value;
      lines.push(
        `Now: ${round(current.temperature_2m)}°F (feels ${round(current.apparent_temperature)}°F), ${weatherInfo(current.weather_code).text}, gusts ${round(current.wind_gusts_10m)} mph`,
      );
    }

    if (alerts.status === "fulfilled") {
      lines.push(
        `Alerts: ${alerts.value.length ? alerts.value.map((alert) => alert.event).join(", ") : "None"}`,
      );
    }

    if (air.status === "fulfilled" && air.value?.us_aqi != null) {
      lines.push(
        `Air quality: AQI ${round(air.value.us_aqi)} (${aqiLevel(air.value.us_aqi).label})`,
      );
    }

    if (disasters.status === "fulfilled") {
      lines.push(
        `FEMA disasters in ${location.stateCode}, last ${DISASTER_YEARS} years: ${disasters.value.length}`,
      );
    }

    if (housing.status === "fulfilled" && housing.value) {
      const { medianYear, pre1980Share } = housing.value;
      lines.push(
        `Homes: median built ${medianYear ?? "N/A"}, ${Math.round(pre1980Share * 100)}% built before 1980`,
      );
    }

    if (result?.issues.length) {
      lines.push(
        "",
        "Watch for:",
        ...result.issues.map((issue) => `- ${issue.text}`),
      );
    }

    return lines.join("\n");
  }

  async copyBriefing() {
    await this.copyText(
      this.buildBriefing(),
      "Briefing copied. Paste it into your crew chat.",
    );
  }

  async copyLink() {
    await this.copyText(window.location.href, "Link copied.");
  }

  async copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(successMessage);
    } catch {
      this.showToast("Couldn't copy. Your browser blocked clipboard access.");
    }
  }

  showToast(message) {
    const toast =
      document.querySelector(".toast") ?? document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.append(toast);

    requestAnimationFrame(() => toast.classList.add("show"));
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
  }
}

const app = new ConstructionCheckApp();
app.init();
