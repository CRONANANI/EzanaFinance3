'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  Bar,
  ComposedChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import './kairos-signal.css';
import { KairosCorrelationsCard } from '@/components/kairos/KairosCorrelationsCard';
import { KairosEventsCard } from '@/components/kairos/KairosEventsCard';

/* ── Region config ─────────────────────────────────────────── */
const REGIONS = [
  { id: 'us-midwest', label: 'U.S. Midwest', lat: 41.5, lon: -89.0, commodity: 'Corn & Soybeans' },
  {
    id: 'brazil-south',
    label: 'Brazil (South)',
    lat: -23.5,
    lon: -49.0,
    commodity: 'Soybeans & Coffee',
  },
  { id: 'ukraine', label: 'Ukraine', lat: 49.0, lon: 32.0, commodity: 'Wheat' },
  { id: 'gulf', label: 'Gulf of Mexico', lat: 28.0, lon: -90.0, commodity: 'Oil & Natural Gas' },
  { id: 'west-africa', label: 'West Africa', lat: 7.0, lon: -5.0, commodity: 'Cocoa' },
  { id: 'india', label: 'India (Central)', lat: 23.0, lon: 79.0, commodity: 'Cotton & Sugar' },
];

const TIMEFRAMES = [
  { id: '7d', label: '7D' },
  { id: '14d', label: '14D' },
  { id: '30d', label: '30D' },
];

/* ── Open-Meteo fetch helpers ──────────────────────────────── */
async function fetchWeatherForecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,et0_fao_evapotranspiration,shortwave_radiation_sum&timezone=auto&past_days=14&forecast_days=14`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function calcGDD(tmax, tmin, base = 10) {
  const avg = (tmax + tmin) / 2;
  return Math.max(0, avg - base);
}

/* ── Shared UI pieces ──────────────────────────────────────── */
function KairosCard({ icon, title, children, wide, actions }) {
  return (
    <section className={`kairos-card${wide ? ' kairos-card--wide' : ''}`}>
      <div className="kairos-card-header">
        <div className="kairos-card-header-left">
          <i className={`bi ${icon}`} aria-hidden />
          {title}
        </div>
        {actions && <div className="kairos-card-actions">{actions}</div>}
      </div>
      <div className="kairos-card-body">{children}</div>
    </section>
  );
}

function RegionPicker({ value, onChange }) {
  return (
    <select className="kairos-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {REGIONS.map((r) => (
        <option key={r.id} value={r.id}>
          {r.label} — {r.commodity}
        </option>
      ))}
    </select>
  );
}

function TimeframePicker({ value, onChange }) {
  return (
    <div className="kairos-tf-group">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.id}
          type="button"
          className={`kairos-tf-btn${value === tf.id ? ' active' : ''}`}
          onClick={() => onChange(tf.id)}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}

function LoadingPulse() {
  return (
    <div className="kairos-loading-pulse">
      <span>Loading weather data…</span>
    </div>
  );
}

function MiniStat({ label, value, unit, positive }) {
  return (
    <div className="kairos-mini-stat">
      <span className="kairos-mini-stat-label">{label}</span>
      <span
        className={`kairos-mini-stat-value${positive === true ? ' positive' : positive === false ? ' negative' : ''}`}
      >
        {value}
        {unit && <small>{unit}</small>}
      </span>
    </div>
  );
}

const chartTooltipStyle = {
  background: '#161b22',
  border: '1px solid rgba(212, 175, 55, 0.2)',
  borderRadius: '8px',
  fontSize: '0.7rem',
  color: '#e2e8f0',
};

/* ── 1. Temperature Anomaly Card ───────────────────────────── */
function TemperatureAnomalyCard({ weatherData, region }) {
  const chartData = useMemo(() => {
    if (!weatherData?.daily) return [];
    const { time, temperature_2m_max, temperature_2m_min } = weatherData.daily;
    return time.map((d, i) => {
      const avg = (temperature_2m_max[i] + temperature_2m_min[i]) / 2;
      return {
        date: formatDate(d),
        high: Math.round(temperature_2m_max[i] * 10) / 10,
        low: Math.round(temperature_2m_min[i] * 10) / 10,
        avg: Math.round(avg * 10) / 10,
        raw: d,
      };
    });
  }, [weatherData]);

  const today = new Date().toISOString().slice(0, 10);
  const todayIdx = chartData.findIndex((d) => d.raw === today);
  const currentTemp =
    todayIdx >= 0 ? chartData[todayIdx].avg : chartData[chartData.length - 1]?.avg;
  const weekAgo = todayIdx >= 7 ? chartData[todayIdx - 7]?.avg : chartData[0]?.avg;
  const delta = currentTemp != null && weekAgo != null ? currentTemp - weekAgo : null;

  return (
    <KairosCard icon="bi-thermometer-half" title="Temperature tracker">
      <div className="kairos-stat-row">
        <MiniStat
          label="Current avg"
          value={currentTemp != null ? `${currentTemp}°` : '—'}
          unit="C"
        />
        <MiniStat
          label="7-day Δ"
          value={delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}°` : '—'}
          positive={delta != null ? delta > 0 : undefined}
        />
        <MiniStat label="Region" value={region.label} />
      </div>
      <div className="kairos-chart-wrap">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}°`}
              width={36}
            />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${v}°C`]} />
            <Area
              type="monotone"
              dataKey="high"
              stroke="#ef4444"
              fill="url(#tempGrad)"
              strokeWidth={1.5}
              dot={false}
              name="High"
            />
            <Area
              type="monotone"
              dataKey="low"
              stroke="#3b82f6"
              fill="rgba(59,130,246,0.08)"
              strokeWidth={1.5}
              dot={false}
              name="Low"
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="#d4af37"
              strokeWidth={2}
              dot={false}
              name="Avg"
              strokeDasharray="4 2"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </KairosCard>
  );
}

/* ── 2. Precipitation & Drought Card ──────────────────────── */
function PrecipitationCard({ weatherData, region }) {
  const chartData = useMemo(() => {
    if (!weatherData?.daily) return [];
    const { time, precipitation_sum, et0_fao_evapotranspiration } = weatherData.daily;
    let cumulative = 0;
    return time.map((d, i) => {
      const precip = precipitation_sum[i] ?? 0;
      cumulative += precip;
      const et0 = et0_fao_evapotranspiration?.[i] ?? 0;
      return {
        date: formatDate(d),
        precip: Math.round(precip * 10) / 10,
        cumulative: Math.round(cumulative * 10) / 10,
        waterBalance: Math.round((precip - et0) * 10) / 10,
      };
    });
  }, [weatherData]);

  const totalPrecip = chartData.reduce((s, d) => s + d.precip, 0);
  const dryDays = chartData.filter((d) => d.precip < 1).length;

  return (
    <KairosCard icon="bi-cloud-rain" title="Precipitation & water balance">
      <div className="kairos-stat-row">
        <MiniStat label="Total precip" value={`${totalPrecip.toFixed(1)}`} unit="mm" />
        <MiniStat
          label="Dry days"
          value={dryDays}
          positive={dryDays > 20 ? false : dryDays < 10 ? true : undefined}
        />
        <MiniStat label="Commodity" value={region.commodity} />
      </div>
      <div className="kairos-chart-wrap">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
              width={32}
            />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v, name) => [`${v} mm`, name]} />
            <Bar
              dataKey="precip"
              fill="rgba(59,130,246,0.6)"
              radius={[2, 2, 0, 0]}
              name="Daily rain"
            />
            <Line
              type="monotone"
              dataKey="waterBalance"
              stroke="#10b981"
              strokeWidth={1.5}
              dot={false}
              name="Water balance"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </KairosCard>
  );
}

/* ── 3. Growing Degree Days Card ───────────────────────────── */
function GrowingDegreeDaysCard({ weatherData }) {
  const chartData = useMemo(() => {
    if (!weatherData?.daily) return [];
    const { time, temperature_2m_max, temperature_2m_min } = weatherData.daily;
    let cumGDD = 0;
    return time.map((d, i) => {
      const gdd = calcGDD(temperature_2m_max[i], temperature_2m_min[i]);
      cumGDD += gdd;
      return {
        date: formatDate(d),
        gdd: Math.round(gdd * 10) / 10,
        cumulative: Math.round(cumGDD),
      };
    });
  }, [weatherData]);

  const totalGDD = chartData.length ? chartData[chartData.length - 1].cumulative : 0;

  return (
    <KairosCard icon="bi-graph-up-arrow" title="Growing degree days (GDD)">
      <div className="kairos-stat-row">
        <MiniStat label="Cumulative GDD" value={totalGDD} unit=" °C·d" />
        <MiniStat label="Base temp" value="10°C" />
        <MiniStat
          label="Corn pollination"
          value={totalGDD >= 630 ? '✓ Reached' : `${Math.max(0, 630 - totalGDD)} to go`}
        />
      </div>
      <p className="kairos-card-hint">
        GDD accumulates heat above 10°C. Corn pollination occurs at ~630 GDD (silking begins, pollen
        shed lasts ~2 weeks). Per Iowa State research, this is the highest-risk window — drought +
        heat here causes irreversible yield loss. No-till fields and stress-tolerant hybrids perform
        best during this critical period.
      </p>
      <div className="kairos-chart-wrap">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#10b981"
              fill="url(#gddGrad)"
              strokeWidth={2}
              dot={false}
              name="Cumulative GDD"
            />
            <ReferenceLine
              y={630}
              stroke="#d4af37"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: '🌽 Pollination (~630 GDD)',
                position: 'right',
                fill: '#d4af37',
                fontSize: 9,
                fontWeight: 600,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </KairosCard>
  );
}

/* ── 4. Wind & Solar Card ──────────────────────────────────── */
function WindSolarCard({ weatherData }) {
  const chartData = useMemo(() => {
    if (!weatherData?.daily) return [];
    const { time, windspeed_10m_max, shortwave_radiation_sum } = weatherData.daily;
    return time.map((d, i) => ({
      date: formatDate(d),
      wind: Math.round((windspeed_10m_max[i] ?? 0) * 10) / 10,
      solar: Math.round((shortwave_radiation_sum?.[i] ?? 0) * 100) / 100,
    }));
  }, [weatherData]);

  const avgWind = chartData.length
    ? chartData.reduce((s, d) => s + d.wind, 0) / chartData.length
    : 0;
  const maxWind = chartData.length ? Math.max(...chartData.map((d) => d.wind)) : 0;

  return (
    <KairosCard icon="bi-wind" title="Wind speed & solar radiation">
      <div className="kairos-stat-row">
        <MiniStat label="Avg wind" value={avgWind.toFixed(1)} unit=" km/h" />
        <MiniStat
          label="Peak gust"
          value={maxWind.toFixed(1)}
          unit=" km/h"
          positive={maxWind > 60 ? false : undefined}
        />
      </div>
      <div className="kairos-chart-wrap">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="wind"
              tick={{ fill: '#6b7280', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <YAxis
              yAxisId="solar"
              orientation="right"
              tick={{ fill: '#6b7280', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Line
              yAxisId="wind"
              type="monotone"
              dataKey="wind"
              stroke="#8b5cf6"
              strokeWidth={1.8}
              dot={false}
              name="Wind (km/h)"
            />
            <Line
              yAxisId="solar"
              type="monotone"
              dataKey="solar"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              name="Solar (MJ/m²)"
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </KairosCard>
  );
}

/* ── 5. Commodity Sensitivity Radar (Expandable) ──────────── */
function CommoditySensitivityCard() {
  const [selected, setSelected] = useState('corn');
  const [activeDim, setActiveDim] = useState(null); // clicked variable

  /* ── Variable impact explanations per commodity ── */
  const VARIABLE_IMPACTS = {
    Temperature: {
      corn: {
        score: 95,
        summary:
          "Temperature is the dominant factor for corn yields. Per Iowa State research, pollen viability drops to zero once temperatures reach the mid-90s°F — especially with low relative humidity. Silks grow 1–1.5 inches/day and must be fertilized by viable pollen for kernels to develop. The natural buffer: pollen shed occurs early-to-mid morning when temps are lower. But the critical insight is that high temperatures alone won't destroy pollination IF soil moisture is adequate. It's the combination of drought + heat at pollination that causes catastrophic yield loss. The 2012 US drought destroyed 27% of the corn crop when this combination persisted for 10+ days across the Corn Belt.",
        risks: [
          'Pollen dies at mid-90s°F+ (low humidity amplifies)',
          'Drought desynchronizes silk emergence from pollen shed',
          'No-till fields outperform in heat — moisture conservation is key',
          'Early-maturing hybrids can escape peak heat windows',
        ],
      },
      coffee: {
        score: 80,
        summary:
          "Coffee arabica thrives in a narrow 60–70°F band. Sustained temps above 86°F accelerate cherry ripening, reducing bean density and cup quality. Brazil's 2021 frost event wiped out 10% of global arabica production when temps dropped below 28°F in Minas Gerais.",
        risks: [
          'Frost damage below 28°F kills branches',
          'Heat above 86°F reduces cherry quality',
          'Temperature swings during flowering',
        ],
      },
      natgas: {
        score: 90,
        summary:
          'Natural gas demand is directly driven by heating degree days (winter) and cooling degree days (summer). A 1°F colder-than-normal winter across the US Northeast increases gas demand by ~1.5 Bcf/day. The 2021 Texas freeze spiked spot gas prices from $3 to $400/MMBtu.',
        risks: [
          'Polar vortex events spike heating demand',
          'Summer heatwaves drive AC electricity demand',
          'Mild winters collapse demand forecasts',
        ],
      },
      wheat: {
        score: 85,
        summary:
          'Wheat is sensitive to temperature extremes at both ends. Winter kill occurs when soil temps drop below 12°F without snow cover. Spring heat above 90°F during grain fill accelerates maturity and shrinks kernel weight, directly reducing yield.',
        risks: [
          'Winterkill from exposed crowns',
          'Heat during grain fill (>90°F)',
          'Late frost on spring wheat seedlings',
        ],
      },
      oil: {
        score: 35,
        summary:
          'Crude oil has limited direct temperature sensitivity, but extreme cold affects pipeline flow (crude thickens), refinery operations, and offshore platform safety. The primary temperature impact is on demand — cold winters increase heating oil consumption.',
        risks: [
          'Pipeline viscosity issues in extreme cold',
          'Refinery outages from freeze events',
          'Heating oil demand spikes',
        ],
      },
    },
    Precipitation: {
      corn: {
        score: 90,
        summary:
          'Corn requires 20–24 inches during the growing season, but WHEN moisture is available matters more than how much. Iowa State research shows drought stress slows silk elongation while simultaneously accelerating pollen shed — this desynchronization means pollen is gone before silks emerge, and no fertilization occurs. One corn plant produces enough pollen for 10 plants (a natural compensation buffer), but if silking is delayed 2+ weeks by drought stress, that buffer is exhausted. No-till and reduced-till practices conserve soil moisture and significantly improve pollination success during drought years.',
        risks: [
          'Drought desynchronizes pollen shed and silk emergence',
          'Silk delay >2 weeks = total fertilization failure',
          'No-till conserves moisture — fields outperform in drought',
          'Every planting day past May 15 costs ~1 bushel/acre',
        ],
      },
      coffee: {
        score: 85,
        summary:
          'Coffee needs a distinct dry season for flowering (triggers blossom simultaneously) followed by consistent moisture during cherry development. Irregular rainfall causes uneven ripening, forcing multiple harvest passes and increasing labor costs 30–40%.',
        risks: [
          'Irregular rainfall causes uneven ripening',
          'Drought during cherry development',
          'Excess rain during drying phase',
        ],
      },
      natgas: {
        score: 30,
        summary:
          'Precipitation has minimal direct impact on gas supply, but severe flooding can disrupt pipeline infrastructure and offshore operations. Hurricane-driven rainfall in the Gulf Coast region historically causes 10–15% production shutdowns.',
        risks: [
          'Gulf hurricane flooding',
          'Pipeline right-of-way flooding',
          'Hydroelectric competition in wet years',
        ],
      },
      wheat: {
        score: 88,
        summary:
          'Wheat needs 15–20 inches during the growing season, with moisture critical during tillering and heading. Drought in the Black Sea region (Russia, Ukraine) during April–May directly moves global wheat futures — these regions produce 30% of world wheat exports.',
        risks: [
          'Black Sea spring drought',
          'Harvest rain (sprouting/mycotoxins)',
          'Waterlogging of clay soils',
        ],
      },
      oil: {
        score: 25,
        summary:
          'Precipitation affects oil primarily through logistics — hurricanes and flooding disrupt Gulf Coast refining capacity (45% of US refining), pipeline operations, and port loading. Hurricane Katrina (2005) shut 95% of Gulf production for weeks.',
        risks: [
          'Hurricane-forced refinery shutdowns',
          'Flooding of pipeline infrastructure',
          'Port disruptions at export terminals',
        ],
      },
    },
    Solar: {
      corn: {
        score: 60,
        summary:
          'Solar radiation drives photosynthesis — corn needs 500+ hours of direct sunlight during the growing season. Overcast conditions during grain fill reduce starch accumulation. However, too much direct sun during drought amplifies heat stress on exposed ears.',
        risks: [
          'Low light during grain fill',
          'Solar-amplified heat stress',
          'Cloud cover reducing photosynthesis',
        ],
      },
      coffee: {
        score: 55,
        summary:
          'Coffee is a shade-loving plant — direct tropical sun can scorch leaves and cherries. Many premium farms use shade-grown techniques. Solar radiation matters most during drying — sun-dried beans (natural process) require 15–20 days of consistent sun.',
        risks: [
          'Leaf scorch from direct sun',
          'Insufficient drying conditions',
          'UV damage at high altitudes',
        ],
      },
      natgas: {
        score: 25,
        summary:
          'Solar energy competes with natural gas for electricity generation. High solar output in summer reduces gas-fired power demand. The growth of utility-scale solar in ERCOT (Texas) has structurally reduced summer gas demand by ~2 Bcf/day.',
        risks: [
          'Solar displacement of gas generation',
          'Cloud cover spikes gas power demand',
          'Seasonal solar intermittency',
        ],
      },
      wheat: {
        score: 65,
        summary:
          'Wheat needs adequate solar radiation during heading and grain fill. Cloudy conditions reduce photosynthesis and extend the growing season, increasing exposure to late-season disease. In northern latitudes, shorter day length limits the planting window.',
        risks: [
          'Low light during grain fill',
          'Extended season increases disease risk',
          'Day length constraints at high latitudes',
        ],
      },
      oil: {
        score: 10,
        summary:
          'Solar has minimal direct impact on crude oil supply, but long-term solar adoption displaces oil in electricity generation and transportation (EV charging). This is a structural demand threat, not a weather event risk.',
        risks: [
          'Structural demand displacement',
          'EV adoption reducing gasoline demand',
          'Minimal operational impact',
        ],
      },
    },
    'Frost risk': {
      corn: {
        score: 70,
        summary:
          "Corn is a tropical grass — it cannot survive frost. A late spring frost kills seedlings, forcing replanting at lower yield potential. An early fall frost before maturity traps moisture in kernels. Iowa State research adds a subtlety: early-season hybrids that pollinate before July heat peaks can avoid the worst temperature stress entirely, but they also face higher frost risk on both ends of the season. Hybrid selection that balances frost escape with stress tolerance is the most important management decision — because it's impossible to predict when stressful conditions will occur year to year.",
        risks: [
          'Late spring frost kills seedlings → replanting penalty',
          'Early fall frost traps kernel moisture',
          'Early hybrids escape heat but increase frost exposure',
          'Stress-tolerant hybrid selection is the #1 management tool',
        ],
      },
      coffee: {
        score: 95,
        summary:
          'Frost is the existential risk for coffee. A single hard frost event in Brazil can destroy 2–3 years of production (trees take 3–5 years to recover). The July 2021 frost in Minas Gerais and São Paulo destroyed 600M+ trees and pushed arabica futures up 75% in two months.',
        risks: [
          'Hard frost kills trees (3–5yr recovery)',
          'Frost pockets at elevation transitions',
          'La Niña patterns increase frost probability',
        ],
      },
      natgas: {
        score: 45,
        summary:
          "Frost itself doesn't impact gas production, but frost events correlate with cold outbreaks that spike heating demand. The distinction matters — it's the cold temperatures, not the frost, that move gas prices.",
        risks: [
          'Early frost signals cold winter onset',
          'Agricultural demand for frost protection',
          'Correlated with polar vortex displacement',
        ],
      },
      wheat: {
        score: 80,
        summary:
          'Winter wheat survives cold by going dormant under snow cover. The danger is frost without snow — exposed crowns die below 12°F. Spring frost on wheat that has broken dormancy (greened up) can destroy tillers and reduce head count by 30–50%.',
        risks: [
          'Crown kill without snow cover',
          'Spring frost on greened-up wheat',
          'Frost heaving of seedlings',
        ],
      },
      oil: {
        score: 15,
        summary:
          'Frost has negligible direct impact on crude oil operations, except in extreme Arctic conditions where surface equipment can freeze. The primary connection is through cold-correlated demand for heating fuels.',
        risks: [
          'Arctic equipment failures',
          'Heating oil demand correlation',
          'Minimal supply-side impact',
        ],
      },
    },
    Wind: {
      corn: {
        score: 40,
        summary:
          "Wind primarily affects corn through derecho events — straight-line windstorms that can flatten millions of acres in hours. The 2020 Iowa derecho destroyed 43% of Iowa's corn crop with 140mph winds. Wind also increases evapotranspiration, worsening drought stress.",
        risks: [
          'Derecho events flatten standing corn',
          'Increased evapotranspiration in drought',
          'Pollination disruption from sustained wind',
        ],
      },
      coffee: {
        score: 30,
        summary:
          'Wind is a secondary concern for coffee, primarily affecting flowering (wind knocks blossoms off branches) and drying operations. Windbreaks are a standard management practice in most coffee-growing regions.',
        risks: [
          'Blossom drop during flowering',
          'Drying disruption',
          'Branch breakage in tropical storms',
        ],
      },
      natgas: {
        score: 75,
        summary:
          'Wind directly competes with gas for electricity — when wind generation is high, gas-fired plants ramp down. In ERCOT (Texas), wind provides 25–30% of electricity. Wind also affects offshore operations — high seas shut down Gulf platforms.',
        risks: [
          'Wind displacement of gas generation',
          'Offshore platform shutdowns (>40kt winds)',
          'Wind intermittency spikes gas backup demand',
        ],
      },
      wheat: {
        score: 50,
        summary:
          'Wind causes lodging (plants blow over) in mature wheat, making harvest difficult and reducing yield. Sustained winds during dry conditions cause soil erosion, particularly in the US Great Plains — echoing the 1930s Dust Bowl dynamics.',
        risks: [
          'Lodging of mature wheat',
          'Soil erosion in dry conditions',
          'Harvest disruption from high winds',
        ],
      },
      oil: {
        score: 55,
        summary:
          'Wind impacts oil through offshore production — tropical storms and hurricanes force platform evacuations in the Gulf of Mexico. Hurricane season (June–November) historically causes 5–15% Gulf production shutdowns. Wind also affects tanker loading at ports.',
        risks: [
          'Hurricane-forced platform evacuations',
          'Tanker loading delays',
          'Pipeline stress from thermal cycling',
        ],
      },
    },
    Logistics: {
      corn: {
        score: 35,
        summary:
          'Corn logistics are primarily river-based — the Mississippi River system moves 60% of US corn exports. Low water levels (drought) restrict barge loading capacity, adding $0.20–0.50/bushel in transport costs. The 2022 Mississippi drought cut barge capacity 30%.',
        risks: [
          'Low Mississippi River levels',
          'Rail bottlenecks during harvest',
          'Port congestion at Gulf terminals',
        ],
      },
      coffee: {
        score: 50,
        summary:
          "Coffee logistics are highly weather-sensitive — most Brazilian coffee moves by truck on unpaved rural roads. Harvest-season rain turns roads to mud, delaying transport to dry mills by days. Port congestion at Santos (world's largest coffee port) compounds the problem.",
        risks: [
          'Muddy harvest roads delay transport',
          'Santos port congestion',
          'Container shipping disruptions',
        ],
      },
      natgas: {
        score: 85,
        summary:
          "Natural gas logistics ARE the market — pipeline capacity, LNG liquefaction, and storage utilization determine regional prices. A pipeline freeze (2021 Texas) or compressor station failure creates localized price spikes of 10–100x. Gas can't be easily rerouted like oil.",
        risks: [
          'Pipeline freeze/compressor failures',
          'LNG export terminal weather delays',
          'Storage draw rates in extreme cold',
        ],
      },
      wheat: {
        score: 60,
        summary:
          'Wheat logistics depend on Black Sea shipping (30% of world exports). Winter ice in the Sea of Azov, drought on the Danube (barge transport), and storms at export ports (Novorossiysk, Odessa) all disrupt the supply chain.',
        risks: ['Black Sea port closures', 'Danube River barge restrictions', 'Ice in Sea of Azov'],
      },
      oil: {
        score: 95,
        summary:
          'Logistics is THE weather variable for oil. Strait of Hormuz (20% of global oil), Suez Canal, Malacca Strait — any disruption at these chokepoints (hurricanes, fog, military conflict amplified by weather) directly reprices crude.',
        risks: [
          'Gulf hurricane refinery shutdowns',
          'Chokepoint disruptions (Hormuz, Suez)',
          'Arctic shipping route volatility',
        ],
      },
    },
  };

  /* ── Weather news events (mock — would come from API in production) ── */
  const WEATHER_NEWS = {
    Temperature: [
      {
        date: '2026-05-15',
        headline:
          'Iowa State Extension: corn pollination window approaching — pollen viability drops to zero above mid-90s°F. Drought + heat combination is the critical threat, not heat alone. No-till fields and early-maturing hybrids offer best resilience.',
        region: 'US Midwest',
        severity: 'medium',
      },
      {
        date: '2026-05-14',
        headline:
          'Pacific Northwest heatwave forecast for June — NOAA warns of 100°F+ temps across Oregon and Washington',
        region: 'US West Coast',
        severity: 'high',
      },
      {
        date: '2026-05-12',
        headline:
          'India heatwave death toll rises as temperatures exceed 122°F in Rajasthan — rice planting delays expected',
        region: 'South Asia',
        severity: 'critical',
      },
      {
        date: '2026-05-10',
        headline:
          'Southern Brazil cold snap forecasted for late May — coffee growing regions on frost watch',
        region: 'Brazil',
        severity: 'high',
      },
      {
        date: '2026-05-08',
        headline:
          'EU Mediterranean basin projected to see hottest summer on record — drought risk elevated',
        region: 'Europe',
        severity: 'medium',
      },
    ],
    Precipitation: [
      {
        date: '2026-05-15',
        headline:
          'ISU research reminder: drought stress slows silk elongation while accelerating pollen shed — this desynchronization is the #1 mechanism for corn yield loss. Soil moisture at pollination matters more than total season rainfall.',
        region: 'US Midwest',
        severity: 'high',
      },
      {
        date: '2026-05-13',
        headline:
          'Corn Belt rainfall deficit widens — Iowa and Illinois at 60% of normal May precipitation',
        region: 'US Midwest',
        severity: 'high',
      },
      {
        date: '2026-05-11',
        headline:
          'Monsoon onset forecast 10 days early for central India — potential flooding in Gujarat',
        region: 'South Asia',
        severity: 'medium',
      },
      {
        date: '2026-05-09',
        headline:
          'La Niña watch issued by NOAA — dry pattern expected across US Southern Plains through August',
        region: 'Global',
        severity: 'high',
      },
      {
        date: '2026-05-07',
        headline:
          'Black Sea region drought deepening — Ukraine winter wheat crop rated 35% poor/very poor',
        region: 'Eastern Europe',
        severity: 'critical',
      },
    ],
    Solar: [
      {
        date: '2026-05-12',
        headline:
          'Extended cloud cover across Northern Europe reduces solar generation — gas backup demand rises',
        region: 'Europe',
        severity: 'low',
      },
      {
        date: '2026-05-09',
        headline: 'Australian solar output hits record — displaces coal and gas in NEM grid',
        region: 'Australia',
        severity: 'low',
      },
      {
        date: '2026-05-06',
        headline:
          'ERCOT forecasts record solar generation for Texas summer 2026 — gas demand outlook lowered',
        region: 'US South',
        severity: 'medium',
      },
    ],
    'Frost risk': [
      {
        date: '2026-05-14',
        headline:
          'Late frost warning for Argentina Pampas — soybean harvest 80% complete but unharvested fields at risk',
        region: 'South America',
        severity: 'high',
      },
      {
        date: '2026-05-10',
        headline:
          'Southern Brazil coffee regions see frost probability rise to 35% for June — GFS and ECMWF models agree',
        region: 'Brazil',
        severity: 'critical',
      },
      {
        date: '2026-05-07',
        headline: 'Montana spring wheat hit by May frost — 200K acres replanting',
        region: 'US Northern Plains',
        severity: 'medium',
      },
    ],
    Wind: [
      {
        date: '2026-05-13',
        headline:
          'NOAA issues above-average hurricane season forecast — 18-22 named storms expected',
        region: 'Atlantic Basin',
        severity: 'high',
      },
      {
        date: '2026-05-11',
        headline: 'Gulf of Mexico platform evacuations as Tropical Depression 2 forms early',
        region: 'US Gulf Coast',
        severity: 'high',
      },
      {
        date: '2026-05-08',
        headline:
          'Derecho risk elevated across Corn Belt through late June — atmospheric pattern favors MCS formation',
        region: 'US Midwest',
        severity: 'medium',
      },
    ],
    Logistics: [
      {
        date: '2026-05-14',
        headline:
          'Mississippi River levels forecast to drop below critical thresholds by mid-June — barge restrictions likely',
        region: 'US Interior',
        severity: 'high',
      },
      {
        date: '2026-05-12',
        headline: 'Santos port closure due to storm — 15 coffee vessels delayed, basis widens',
        region: 'Brazil',
        severity: 'medium',
      },
      {
        date: '2026-05-09',
        headline:
          'Panama Canal transit restrictions tightened again — drought reduces daily crossings to 24 from 36 normal',
        region: 'Central America',
        severity: 'critical',
      },
      {
        date: '2026-05-06',
        headline: 'Black Sea grain corridor talks stall — shipping insurance premiums rise 40%',
        region: 'Eastern Europe',
        severity: 'high',
      },
    ],
  };

  const SEVERITY_COLORS = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#6b7280',
  };

  const profiles = {
    corn: {
      label: 'Corn',
      data: [
        { dim: 'Temperature', v: 95 },
        { dim: 'Precipitation', v: 90 },
        { dim: 'Wind', v: 40 },
        { dim: 'Frost risk', v: 70 },
        { dim: 'Solar', v: 60 },
        { dim: 'Logistics', v: 35 },
      ],
    },
    coffee: {
      label: 'Coffee',
      data: [
        { dim: 'Temperature', v: 80 },
        { dim: 'Precipitation', v: 85 },
        { dim: 'Wind', v: 30 },
        { dim: 'Frost risk', v: 95 },
        { dim: 'Solar', v: 55 },
        { dim: 'Logistics', v: 50 },
      ],
    },
    natgas: {
      label: 'Nat Gas',
      data: [
        { dim: 'Temperature', v: 90 },
        { dim: 'Precipitation', v: 30 },
        { dim: 'Wind', v: 75 },
        { dim: 'Frost risk', v: 45 },
        { dim: 'Solar', v: 25 },
        { dim: 'Logistics', v: 85 },
      ],
    },
    wheat: {
      label: 'Wheat',
      data: [
        { dim: 'Temperature', v: 85 },
        { dim: 'Precipitation', v: 88 },
        { dim: 'Wind', v: 50 },
        { dim: 'Frost risk', v: 80 },
        { dim: 'Solar', v: 65 },
        { dim: 'Logistics', v: 60 },
      ],
    },
    oil: {
      label: 'Crude Oil',
      data: [
        { dim: 'Temperature', v: 35 },
        { dim: 'Precipitation', v: 25 },
        { dim: 'Wind', v: 55 },
        { dim: 'Frost risk', v: 15 },
        { dim: 'Solar', v: 10 },
        { dim: 'Logistics', v: 95 },
      ],
    },
  };

  const currentImpact = activeDim && VARIABLE_IMPACTS[activeDim]?.[selected];
  const currentNews = activeDim ? WEATHER_NEWS[activeDim] || [] : [];

  return (
    <KairosCard
      icon="bi-bullseye"
      title="Commodity weather sensitivity"
      wide={!!activeDim}
      actions={
        <div className="kairos-pill-selector">
          {Object.entries(profiles).map(([k, v]) => (
            <button
              key={k}
              type="button"
              className={`kairos-pill-btn${selected === k ? ' active' : ''}`}
              onClick={() => {
                setSelected(k);
                setActiveDim(null);
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      }
    >
      <div style={{ display: 'flex', gap: '1rem', flexWrap: activeDim ? 'nowrap' : 'wrap' }}>
        {/* Radar chart */}
        <div
          style={{
            flex: activeDim ? '0 0 280px' : '1 1 100%',
            minWidth: 240,
            transition: 'flex 0.3s ease',
          }}
        >
          <div className="kairos-chart-wrap kairos-chart-wrap--centered">
            <ResponsiveContainer width="100%" height={activeDim ? 240 : 280}>
              <RadarChart data={profiles[selected].data} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(212,175,55,0.12)" />
                <PolarAngleAxis
                  dataKey="dim"
                  tick={({ x, y, payload }) => {
                    const isActive = activeDim === payload.value;
                    return (
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        fill={isActive ? '#d4af37' : '#9ca3af'}
                        fontSize={isActive ? 11 : 10}
                        fontWeight={isActive ? 700 : 400}
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                          setActiveDim(activeDim === payload.value ? null : payload.value)
                        }
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar
                  dataKey="v"
                  stroke="#d4af37"
                  fill="rgba(212,175,55,0.2)"
                  strokeWidth={2}
                  name="Sensitivity"
                  dot={({ cx: dotCx, cy: dotCy, payload: dotPayload }) => {
                    const isActive = activeDim === dotPayload.dim;
                    return (
                      <circle
                        key={dotPayload.dim}
                        cx={dotCx}
                        cy={dotCy}
                        r={isActive ? 6 : 3}
                        fill={isActive ? '#d4af37' : '#d4af37'}
                        stroke={isActive ? '#fff' : 'none'}
                        strokeWidth={isActive ? 2 : 0}
                        style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                        onClick={() =>
                          setActiveDim(activeDim === dotPayload.dim ? null : dotPayload.dim)
                        }
                      />
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {!activeDim && (
            <p className="kairos-card-hint">
              Click any variable on the radar to see how it affects {profiles[selected].label} and
              related weather news.
            </p>
          )}
        </div>

        {/* Expanded panel — only shows when a variable is selected */}
        {activeDim && currentImpact && (
          <div style={{ flex: 1, display: 'flex', gap: '0.75rem', minWidth: 0, flexWrap: 'wrap' }}>
            {/* Left: Weather news chain view */}
            <div style={{ flex: '1 1 280px', minWidth: 240 }}>
              <div
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: '#d4af37',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <i className="bi bi-newspaper" /> Weather News — {activeDim}
              </div>
              <div style={{ position: 'relative', paddingLeft: 16 }}>
                {/* Chain view vertical line */}
                <div
                  style={{
                    position: 'absolute',
                    left: 4,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: 'linear-gradient(180deg, #d4af37, rgba(212,175,55,0.15))',
                    borderRadius: 1,
                  }}
                />
                {currentNews.map((evt, i) => (
                  <div
                    key={i}
                    style={{ position: 'relative', marginBottom: '0.6rem', paddingLeft: 10 }}
                  >
                    {/* Dot */}
                    <div
                      style={{
                        position: 'absolute',
                        left: -13,
                        top: 4,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: SEVERITY_COLORS[evt.severity] || '#6b7280',
                        border: '2px solid #0d1117',
                      }}
                    />
                    {/* Content */}
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 8,
                        padding: '0.5rem 0.65rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.2rem',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.5rem',
                            color: SEVERITY_COLORS[evt.severity],
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {evt.severity}
                        </span>
                        <span style={{ fontSize: '0.5rem', color: '#6b7280' }}>{evt.region}</span>
                      </div>
                      <p
                        style={{
                          fontSize: '0.65rem',
                          color: '#e2e8f0',
                          lineHeight: 1.45,
                          margin: 0,
                        }}
                      >
                        {evt.headline}
                      </p>
                      <span
                        style={{
                          fontSize: '0.475rem',
                          color: '#6b7280',
                          marginTop: '0.2rem',
                          display: 'block',
                        }}
                      >
                        {new Date(evt.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Variable impact explanation */}
            <div style={{ flex: '1 1 240px', minWidth: 200 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    color: '#d4af37',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <i className="bi bi-info-circle" /> {activeDim} × {profiles[selected].label}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDim(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    padding: '0.2rem',
                  }}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              {/* Score badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: 6,
                  background: `rgba(212,175,55,${currentImpact.score > 70 ? '0.15' : '0.06'})`,
                  border: '1px solid rgba(212,175,55,0.2)',
                  marginBottom: '0.5rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#d4af37',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {currentImpact.score}
                </span>
                <span style={{ fontSize: '0.5rem', color: '#d4af37', fontWeight: 600 }}>
                  /100 SENSITIVITY
                </span>
              </div>

              {/* Summary */}
              <p
                style={{
                  fontSize: '0.65rem',
                  color: '#c9d1d9',
                  lineHeight: 1.65,
                  margin: '0 0 0.5rem',
                }}
              >
                {currentImpact.summary}
              </p>

              {/* Key risks */}
              <div
                style={{
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  color: '#8b949e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '0.25rem',
                }}
              >
                Key Risks
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {currentImpact.risks.map((risk, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.35rem',
                      fontSize: '0.6rem',
                      color: '#e2e8f0',
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: currentImpact.score > 70 ? '#f59e0b' : '#3b82f6',
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    />
                    {risk}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </KairosCard>
  );
}

/* ── 6. Critical Time Windows Card ─────────────────────────── */
function CriticalWindowsCard() {
  const now = new Date();
  const currentMonth = now.getMonth();

  const windows = [
    {
      crop: 'Corn',
      region: 'U.S. Midwest',
      windows: [
        {
          label: 'Planting',
          months: [3, 4],
          risk: 'Wet delays — each day past May 15 costs ~1 bu/acre',
        },
        {
          label: 'Pollination',
          months: [6],
          risk: 'CRITICAL: pollen dies >95°F, drought desynchronizes silk emergence from pollen shed. 2-week window determines the entire crop.',
        },
        {
          label: 'Grain fill',
          months: [7],
          risk: 'Night temps drive kernel weight — high nights reduce starch accumulation',
        },
        {
          label: 'Harvest',
          months: [8, 9, 10],
          risk: 'Rain damage, early frost traps moisture in kernels',
        },
      ],
    },
    {
      crop: 'Soybeans',
      region: 'Brazil',
      windows: [
        { label: 'Planting', months: [9, 10], risk: 'Dry soil' },
        { label: 'Flowering', months: [0, 1], risk: 'Drought' },
        { label: 'Harvest', months: [2, 3], risk: 'Rain / logistic' },
      ],
    },
    {
      crop: 'Wheat',
      region: 'Russia/Ukraine',
      windows: [
        { label: 'Winter kill', months: [11, 0, 1], risk: 'Extreme cold' },
        { label: 'Spring growth', months: [3, 4], risk: 'Drought' },
        { label: 'Harvest', months: [6, 7], risk: 'Rain, heat' },
      ],
    },
    {
      crop: 'Coffee',
      region: 'Brazil',
      windows: [
        { label: 'Flowering', months: [8, 9], risk: 'Frost / dry' },
        { label: 'Cherry dev', months: [10, 11, 0, 1], risk: 'Drought' },
        { label: 'Harvest', months: [4, 5, 6, 7], risk: 'Rain quality' },
      ],
    },
  ];

  const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  return (
    <KairosCard icon="bi-calendar-event" title="Critical time windows" wide>
      <p className="kairos-card-hint" style={{ marginBottom: '0.75rem' }}>
        The same weather event can be noise in one month and market-moving in another. Active
        windows are highlighted.
      </p>
      <div className="kairos-windows-table">
        <div className="kairos-windows-header">
          <div className="kairos-windows-crop">Crop</div>
          {monthLabels.map((m, i) => (
            <div key={i} className={`kairos-windows-month${i === currentMonth ? ' current' : ''}`}>
              {m}
            </div>
          ))}
        </div>
        {windows.map((w) => (
          <div key={w.crop} className="kairos-windows-row">
            <div className="kairos-windows-crop">
              <strong>{w.crop}</strong>
              <small>{w.region}</small>
            </div>
            {monthLabels.map((_, mi) => {
              const win = w.windows.find((wn) => wn.months.includes(mi));
              const isCurrent = mi === currentMonth;
              return (
                <div
                  key={mi}
                  className={`kairos-windows-cell${win ? ' active' : ''}${isCurrent ? ' current' : ''}`}
                  title={win ? `${win.label}: ${win.risk}` : ''}
                >
                  {win && <span className="kairos-windows-dot" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="kairos-windows-legend">
        <span>
          <span className="kairos-windows-dot" /> Active growth/risk window
        </span>
        <span>
          <span className="kairos-windows-current-marker" /> Current month
        </span>
      </div>
    </KairosCard>
  );
}

/* ── Weather → Market Impact Forecast ─────────────────────── */
function WeatherMarketImpactCard({ weatherData, region }) {
  const impacts = useMemo(() => {
    if (!weatherData?.daily) return [];
    const d = weatherData.daily;
    const recentPrecip = (d.precipitation_sum || []).slice(-7);
    const recentTemps = (d.temperature_2m_max || []).slice(-7);
    const recentWind = (d.windspeed_10m_max || []).slice(-7);

    const totalPrecip = recentPrecip.reduce((s, v) => s + (v ?? 0), 0);
    const avgTemp = recentTemps.reduce((s, v) => s + (v ?? 0), 0) / Math.max(recentTemps.length, 1);
    const peakWind = Math.max(...recentWind.map((v) => v ?? 0), 0);

    const rows = [];
    const commodity = region.commodity;

    if (totalPrecip > 80) {
      rows.push({
        event: 'Heavy rainfall',
        commodity,
        direction: 'bearish',
        magnitude: 'High',
        reason: `${totalPrecip.toFixed(0)}mm in 7 days — flooding risk for ${commodity} supply chain`,
        icon: '🌧️',
      });
    } else if (totalPrecip < 5) {
      rows.push({
        event: 'Drought conditions',
        commodity,
        direction: 'bullish',
        magnitude: 'High',
        reason: `Only ${totalPrecip.toFixed(1)}mm in 7 days — yield reduction risk`,
        icon: '☀️',
      });
    }

    if (avgTemp > 34) {
      rows.push({
        event: 'Extreme heat stress',
        commodity,
        direction: 'bullish',
        magnitude: avgTemp > 38 ? 'Critical' : 'Medium',
        reason: `Average ${avgTemp.toFixed(1)}°C over 7 days — crop stress likely`,
        icon: '🌡️',
      });
    } else if (avgTemp < 2) {
      rows.push({
        event: 'Frost / freeze risk',
        commodity,
        direction: 'bullish',
        magnitude: 'High',
        reason: `Temperatures near or below freezing — potential crop loss`,
        icon: '❄️',
      });
    }

    if (peakWind > 70) {
      rows.push({
        event: 'Storm-level wind',
        commodity: 'Energy / Logistics',
        direction: 'bullish',
        magnitude: 'High',
        reason: `${peakWind.toFixed(0)} km/h peak — offshore disruption possible`,
        icon: '🌪️',
      });
    }

    if (rows.length === 0) {
      rows.push({
        event: 'Conditions normal',
        commodity,
        direction: 'neutral',
        magnitude: 'Low',
        reason: 'No extreme weather detected. Supply chain disruption risk is minimal.',
        icon: '✅',
      });
    }

    return rows;
  }, [weatherData, region]);

  const directionColor = { bullish: '#10b981', bearish: '#ef4444', neutral: '#6b7280' };
  const magnitudeColor = {
    Critical: '#ef4444',
    High: '#f97316',
    Medium: '#f59e0b',
    Low: '#10b981',
  };

  return (
    <KairosCard icon="bi-graph-up-arrow" title="Weather → market impact forecast" wide>
      <p className="kairos-card-hint" style={{ marginBottom: '0.75rem' }}>
        Projected price direction based on current weather conditions for {region.commodity} in{' '}
        {region.label}.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {impacts.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background:
                item.direction === 'bullish'
                  ? 'rgba(16,185,129,0.05)'
                  : item.direction === 'bearish'
                    ? 'rgba(239,68,68,0.05)'
                    : 'rgba(107,114,128,0.05)',
              border: `1px solid ${
                item.direction === 'bullish'
                  ? 'rgba(16,185,129,0.15)'
                  : item.direction === 'bearish'
                    ? 'rgba(239,68,68,0.15)'
                    : 'rgba(107,114,128,0.1)'
              }`,
            }}
          >
            <span style={{ fontSize: '1.25rem', flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  marginBottom: '0.2rem',
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color: 'var(--home-heading, #111827)',
                    fontSize: '0.875rem',
                  }}
                >
                  {item.event}
                </span>
                <span
                  style={{
                    padding: '1px 8px',
                    borderRadius: '999px',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    background: directionColor[item.direction] + '20',
                    color: directionColor[item.direction],
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {item.direction}
                </span>
                <span
                  style={{
                    padding: '1px 8px',
                    borderRadius: '999px',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    background: (magnitudeColor[item.magnitude] || '#6b7280') + '20',
                    color: magnitudeColor[item.magnitude] || '#6b7280',
                  }}
                >
                  {item.magnitude} impact
                </span>
              </div>
              <p style={{ color: 'var(--home-muted, #9ca3af)', fontSize: '0.75rem', margin: 0 }}>
                {item.reason}
              </p>
              <p
                style={{
                  color: 'var(--home-muted, #6b7280)',
                  fontSize: '0.6875rem',
                  margin: '0.2rem 0 0',
                  fontWeight: 600,
                }}
              >
                Affected: {item.commodity}
              </p>
            </div>
          </div>
        ))}
      </div>
    </KairosCard>
  );
}

function BehaviouralSignalsCard() {
  const month = new Date().getMonth();

  const SEASONAL_PATTERNS = [
    {
      months: [0, 1],
      commodity: 'Nat Gas',
      signal: 'Peak winter heating demand',
      direction: 'bullish',
      note: 'Jan–Feb historically see highest nat gas price volatility',
      reliability: 78,
    },
    {
      months: [2, 3, 4],
      commodity: 'Agricultural',
      signal: 'Spring planting season — input buying',
      direction: 'bullish',
      note: 'Fertiliser, corn seed, soy futures see volume spikes',
      reliability: 72,
    },
    {
      months: [5, 6],
      commodity: 'Crude Oil',
      signal: 'Summer driving season demand',
      direction: 'bullish',
      note: 'Gasoline demand peaks Jun–Jul; refinery margins widen',
      reliability: 68,
    },
    {
      months: [7, 8],
      commodity: 'Corn / Soybeans',
      signal: 'Harvest pressure incoming',
      direction: 'bearish',
      note: 'Aug–Sep supply increases typically suppress grain prices',
      reliability: 74,
    },
    {
      months: [9, 10],
      commodity: 'Nat Gas',
      signal: 'Pre-winter storage builds',
      direction: 'bullish',
      note: 'Storage injections peak in Oct before heating season',
      reliability: 71,
    },
    {
      months: [11],
      commodity: 'Precious Metals',
      signal: 'Year-end safe-haven demand',
      direction: 'bullish',
      note: 'Gold and silver see demand ahead of macro uncertainty',
      reliability: 65,
    },
  ];

  const FEAR_GREED_SIGNALS = [
    {
      label: 'Commodity Fear Index',
      value: 42,
      level: 'Fear',
      color: '#f97316',
      note: 'Elevated hedging activity in grain futures',
    },
    {
      label: 'Weather Trader Sentiment',
      value: 67,
      level: 'Greed',
      color: '#10b981',
      note: 'Speculators net-long agricultural commodities',
    },
    {
      label: 'Energy Risk Premium',
      value: 55,
      level: 'Neutral',
      color: '#f59e0b',
      note: 'Balanced positioning ahead of inventory data',
    },
  ];

  const activePatterns = SEASONAL_PATTERNS.filter((p) => p.months.includes(month));
  const directionColor = { bullish: '#10b981', bearish: '#ef4444', neutral: '#6b7280' };

  return (
    <KairosCard icon="bi-people" title="Behavioural signals & seasonal patterns">
      <p className="kairos-card-hint" style={{ marginBottom: '0.65rem' }}>
        Active seasonal patterns this month:
      </p>
      {activePatterns.length === 0 ? (
        <p
          style={{
            color: 'var(--home-muted, #6b7280)',
            fontSize: '0.8125rem',
            marginBottom: '0.75rem',
          }}
        >
          No dominant seasonal patterns active this month.
        </p>
      ) : (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}
        >
          {activePatterns.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(212,175,55,0.04)',
                border: '1px solid rgba(212,175,55,0.1)',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '2px',
                  flexShrink: 0,
                  marginTop: 4,
                  background: directionColor[p.direction],
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.15rem',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      color: 'var(--home-heading, #111827)',
                    }}
                  >
                    {p.signal}
                  </span>
                  <span
                    style={{
                      fontSize: '0.5625rem',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      background: directionColor[p.direction] + '20',
                      color: directionColor[p.direction],
                      fontWeight: 700,
                    }}
                  >
                    {p.direction}
                  </span>
                </div>
                <p
                  style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.6875rem', margin: 0 }}
                >
                  {p.note}
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    marginTop: '0.3rem',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      background: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <div
                      style={{
                        width: `${p.reliability}%`,
                        height: '100%',
                        borderRadius: 2,
                        background: '#d4af37',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.5625rem', color: '#d4af37', fontWeight: 700 }}>
                    {p.reliability}% historical reliability
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="kairos-card-hint" style={{ marginBottom: '0.5rem' }}>
        Market sentiment indicators:
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {FEAR_GREED_SIGNALS.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: 'var(--home-heading, #111827)',
                  }}
                >
                  {s.label}
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: s.color }}>
                  {s.level}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                <div
                  style={{
                    width: `${s.value}%`,
                    height: '100%',
                    borderRadius: 3,
                    background: s.color,
                  }}
                />
              </div>
              <p
                style={{
                  color: 'var(--home-muted, #6b7280)',
                  fontSize: '0.6rem',
                  margin: '2px 0 0',
                }}
              >
                {s.note}
              </p>
            </div>
          </div>
        ))}
      </div>
    </KairosCard>
  );
}

function ForecastOutlookCard({ weatherData, region }) {
  const forecastRows = useMemo(() => {
    if (!weatherData?.daily) return [];
    const d = weatherData.daily;
    const today = new Date().toISOString().slice(0, 10);
    const todayIdx = d.time?.findIndex((t) => t >= today) ?? 0;

    const futureDays = d.time.slice(todayIdx, todayIdx + 14).map((date, i) => ({
      date: formatDate(date),
      tempMax: d.temperature_2m_max[todayIdx + i],
      precip: d.precipitation_sum[todayIdx + i] ?? 0,
      wind: d.windspeed_10m_max?.[todayIdx + i] ?? 0,
    }));

    const periods = [
      { label: 'Days 1–5', days: futureDays.slice(0, 5) },
      { label: 'Days 6–10', days: futureDays.slice(5, 10) },
      { label: 'Days 11–14', days: futureDays.slice(10) },
    ].filter((p) => p.days.length > 0);

    return periods.map((p) => {
      const avgTemp = p.days.reduce((s, d0) => s + (d0.tempMax ?? 0), 0) / p.days.length;
      const totPrecp = p.days.reduce((s, d0) => s + (d0.precip ?? 0), 0);
      const peakWind = Math.max(...p.days.map((d0) => d0.wind ?? 0));

      let outlook = 'Neutral';
      let color = '#6b7280';
      let icon = '〰️';
      let note = 'Conditions within normal range.';

      if (totPrecp > 40) {
        outlook = 'Bearish for supply';
        color = '#ef4444';
        icon = '🌧️';
        note = `Heavy rain (${totPrecp.toFixed(0)}mm) — logistics and harvest disruption risk.`;
      } else if (totPrecp < 2 && avgTemp > 30) {
        outlook = 'Bullish for prices';
        color = '#10b981';
        icon = '☀️';
        note = `Dry + hot — drought stress risk for ${region.commodity}.`;
      } else if (peakWind > 65) {
        outlook = 'Supply disruption risk';
        color = '#f97316';
        icon = '💨';
        note = `High winds (${peakWind.toFixed(0)} km/h) — transport and offshore impact.`;
      } else if (avgTemp < 1) {
        outlook = 'Frost risk';
        color = '#3b82f6';
        icon = '❄️';
        note = `Near-freezing temps — potential damage to ${region.commodity}.`;
      }

      return { label: p.label, outlook, color, icon, note, avgTemp, totPrecp, peakWind };
    });
  }, [weatherData, region]);

  return (
    <KairosCard icon="bi-calendar3" title="14-day forecast → commodity outlook">
      <p className="kairos-card-hint" style={{ marginBottom: '0.75rem' }}>
        How the upcoming forecast may affect {region.commodity} prices in {region.label}.
      </p>
      {forecastRows.length === 0 ? (
        <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.8125rem' }}>
          Insufficient forecast data.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {forecastRows.map((row) => (
            <div
              key={row.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr',
                gap: '0.75rem',
                padding: '0.65rem 0.75rem',
                borderRadius: '8px',
                background: `${row.color}08`,
                border: `1px solid ${row.color}20`,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: 'var(--home-muted, #6b7280)',
                    margin: 0,
                  }}
                >
                  {row.label}
                </p>
                <span style={{ fontSize: '1.25rem' }}>{row.icon}</span>
              </div>
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    marginBottom: '0.15rem',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: row.color }}>
                    {row.outlook}
                  </span>
                </div>
                <p
                  style={{ color: 'var(--home-muted, #9ca3af)', fontSize: '0.6875rem', margin: 0 }}
                >
                  {row.note}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.3rem' }}>
                  <span style={{ fontSize: '0.5625rem', color: 'var(--home-muted, #6b7280)' }}>
                    🌡 {row.avgTemp.toFixed(1)}°C avg
                  </span>
                  <span style={{ fontSize: '0.5625rem', color: 'var(--home-muted, #6b7280)' }}>
                    💧 {row.totPrecp.toFixed(0)}mm rain
                  </span>
                  <span style={{ fontSize: '0.5625rem', color: 'var(--home-muted, #6b7280)' }}>
                    💨 {row.peakWind.toFixed(0)} km/h
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </KairosCard>
  );
}

/* ── 7. Signal Strength Dashboard Card ─────────────────────── */
function SignalDashboardCard({ weatherData, region, owmCurrent }) {
  const signals = useMemo(() => {
    if (!weatherData?.daily) return [];
    const d = weatherData.daily;
    const recentTemps = d.temperature_2m_max.slice(-7);
    const recentPrecip = d.precipitation_sum.slice(-7);
    const recentWind = d.windspeed_10m_max.slice(-7);

    const avgTemp = recentTemps.reduce((a, b) => a + b, 0) / recentTemps.length;
    const totalPrecip = recentPrecip.reduce((a, b) => a + (b ?? 0), 0);
    const maxWind = Math.max(...recentWind.map((w) => w ?? 0));

    const tempSignal =
      avgTemp > 35
        ? 'extreme-heat'
        : avgTemp > 30
          ? 'heat-stress'
          : avgTemp < 0
            ? 'frost-risk'
            : avgTemp < 5
              ? 'cold-stress'
              : 'normal';
    const precipSignal =
      totalPrecip < 5
        ? 'drought-risk'
        : totalPrecip > 100
          ? 'flood-risk'
          : totalPrecip > 60
            ? 'wet'
            : 'normal';
    const windSignal = maxWind > 80 ? 'storm' : maxWind > 50 ? 'high-wind' : 'normal';

    return [
      {
        dim: 'Temperature',
        signal: tempSignal,
        detail: `Avg ${avgTemp.toFixed(1)}°C (7d)`,
        severity:
          tempSignal === 'normal'
            ? 0
            : tempSignal.includes('extreme') || tempSignal === 'frost-risk'
              ? 3
              : 2,
      },
      {
        dim: 'Precipitation',
        signal: precipSignal,
        detail: `${totalPrecip.toFixed(1)} mm (7d)`,
        severity:
          precipSignal === 'normal'
            ? 0
            : precipSignal.includes('flood') || precipSignal.includes('drought')
              ? 3
              : 1,
      },
      {
        dim: 'Wind',
        signal: windSignal,
        detail: `Peak ${maxWind.toFixed(0)} km/h`,
        severity: windSignal === 'normal' ? 0 : windSignal === 'storm' ? 3 : 2,
      },
    ];
  }, [weatherData]);

  const overallSeverity = signals.length ? Math.max(...signals.map((s) => s.severity)) : 0;
  const severityLabels = ['Normal', 'Watch', 'Warning', 'Alert'];
  const severityColors = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

  // Real-time conditions sourced from OpenWeather One Call. Open-Meteo
  // doesn't expose pressure / UV index / wind gust on the free plan, so this
  // panel is gated on OWM availability — when it's missing the existing
  // severity grid below still renders.
  const conditionTiles = owmCurrent
    ? [
        {
          label: 'Temperature',
          value: owmCurrent.temp != null ? `${owmCurrent.temp.toFixed(1)}°C` : '—',
          icon: 'bi-thermometer-half',
        },
        {
          label: 'Humidity',
          value: owmCurrent.humidity != null ? `${owmCurrent.humidity}%` : '—',
          icon: 'bi-droplet',
        },
        {
          label: 'Wind',
          value: owmCurrent.windSpeed != null ? `${owmCurrent.windSpeed.toFixed(1)} m/s` : '—',
          icon: 'bi-wind',
        },
        {
          label: 'Pressure',
          value: owmCurrent.pressure != null ? `${owmCurrent.pressure} hPa` : '—',
          icon: 'bi-speedometer2',
        },
        {
          label: 'UV Index',
          value: owmCurrent.uvi != null ? owmCurrent.uvi.toFixed(1) : '—',
          icon: 'bi-brightness-high',
        },
        {
          label: 'Cloud Cover',
          value: owmCurrent.clouds != null ? `${owmCurrent.clouds}%` : '—',
          icon: 'bi-cloud',
        },
      ]
    : null;

  return (
    <KairosCard icon="bi-shield-check" title="Signal strength — live">
      {conditionTiles && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}
        >
          {conditionTiles.map((item) => (
            <div
              key={item.label}
              style={{
                background: 'rgba(212,175,55,0.04)',
                border: '1px solid rgba(212,175,55,0.08)',
                borderRadius: 8,
                padding: '0.4rem 0.5rem',
                textAlign: 'center',
              }}
            >
              <i
                className={`bi ${item.icon}`}
                style={{
                  fontSize: '0.7rem',
                  color: '#d4af37',
                  display: 'block',
                  marginBottom: '0.15rem',
                }}
              />
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f0f6fc' }}>
                {item.value}
              </div>
              <div
                style={{
                  fontSize: '0.45rem',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>
      )}
      <div
        className="kairos-signal-overall"
        style={{ borderLeftColor: severityColors[overallSeverity] }}
      >
        <span className="kairos-signal-level" style={{ color: severityColors[overallSeverity] }}>
          {severityLabels[overallSeverity]}
        </span>
        <span className="kairos-signal-region">
          {region.label} — {region.commodity}
        </span>
      </div>
      <div className="kairos-signal-grid">
        {signals.map((s) => (
          <div key={s.dim} className="kairos-signal-item">
            <div className="kairos-signal-dot" style={{ background: severityColors[s.severity] }} />
            <div>
              <strong>{s.dim}</strong>
              <span>{s.signal.replace(/-/g, ' ')}</span>
              <small>{s.detail}</small>
            </div>
          </div>
        ))}
      </div>
    </KairosCard>
  );
}

/* ── Page ──────────────────────────────────────────────────── */
export default function KairosSignalPage() {
  const [regionId, setRegionId] = useState('us-midwest');
  const [timeframe, setTimeframe] = useState('14d');
  const [weatherData, setWeatherData] = useState(null);
  // OpenWeatherMap One Call payload (current conditions + govt alerts + AI
  // overview). Kept separate from `weatherData` because it's additive —
  // Open-Meteo remains the primary feed for the 28-day daily charts and
  // OpenWeather only contributes data the charts don't already have.
  const [owmData, setOwmData] = useState(null);
  const [loading, setLoading] = useState(true);

  const region = REGIONS.find((r) => r.id === regionId) || REGIONS[0];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Open-Meteo (primary) and OpenWeather (supplemental) fetch in parallel
      // so the page render isn't gated on the slower of the two. The
      // OpenWeather proxy is best-effort — a failure there should still let
      // the chart-driving Open-Meteo data through, hence the `.catch(null)`.
      const [openMeteoData, owmRes] = await Promise.all([
        fetchWeatherForecast(region.lat, region.lon),
        fetch(`/api/kairos/weather?lat=${region.lat}&lon=${region.lon}`)
          .then(async (r) => {
            const json = await r.json().catch(() => null);
            // Accept both 200 (full or degraded) responses
            if (json && !json.degraded) return json;
            // Degraded or failed — return null so OWM-only cards hide gracefully
            return null;
          })
          .catch(() => null),
      ]);
      setWeatherData(openMeteoData);
      setOwmData(owmRes);
    } catch (err) {
      console.error('[kairos] Weather fetch failed:', err);
      setWeatherData(null);
      setOwmData(null);
    }
    setLoading(false);
  }, [region.lat, region.lon]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const trimmedData = useMemo(() => {
    if (!weatherData?.daily) return null;
    const days = timeframe === '7d' ? 7 : timeframe === '14d' ? 14 : 28;
    const d = weatherData.daily;
    const len = d.time.length;
    const start = Math.max(0, len - days);
    const sliced = {};
    for (const key of Object.keys(d)) {
      sliced[key] = d[key].slice(start);
    }
    return { ...weatherData, daily: sliced };
  }, [weatherData, timeframe]);

  return (
    <div className="kairos-page">
      <header className="kairos-hero kairos-hero--compact">
        <div className="kairos-hero-inner">
          <div className="kairos-hero-badge">
            <i className="bi bi-activity" aria-hidden />
            Alternative data
          </div>
          <h1>Kairos Signal</h1>
          <p className="kairos-hero-lead">
            Live weather and environmental data mapped to commodity markets. Track conditions across
            key production regions and pair physical signals with market context.
          </p>
          {/* AI-generated weather summary from OpenWeather's One Call overview
              endpoint. Hidden when the OWM key is unset or the endpoint
              returned no narrative — never falls back to placeholder copy so
              the hero doesn't lie about live data. */}
          {owmData?.overview && (
            <div
              style={{
                marginTop: '0.75rem',
                padding: '0.6rem 0.85rem',
                background: 'rgba(212, 175, 55, 0.04)',
                border: '1px solid rgba(212, 175, 55, 0.12)',
                borderRadius: 10,
                maxWidth: 700,
              }}
            >
              <div
                style={{
                  fontSize: '0.5rem',
                  fontWeight: 700,
                  color: '#d4af37',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <i className="bi bi-robot" /> AI Weather Summary — {region.label}
              </div>
              <p
                style={{
                  fontSize: '0.65rem',
                  color: '#c9d1d9',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {owmData.overview}
              </p>
            </div>
          )}
        </div>
      </header>

      <div className="kairos-controls">
        <RegionPicker value={regionId} onChange={setRegionId} />
        <TimeframePicker value={timeframe} onChange={setTimeframe} />
      </div>

      <div className="kairos-grid">
        <KairosEventsCard regionId={region.id} owmAlerts={owmData?.alerts || []} />
        {loading && <LoadingPulse />}
        {!loading && trimmedData && (
          <>
            <SignalDashboardCard
              weatherData={trimmedData}
              region={region}
              owmCurrent={owmData?.current || null}
            />
            <TemperatureAnomalyCard weatherData={trimmedData} region={region} />
            <PrecipitationCard weatherData={trimmedData} region={region} />
            <GrowingDegreeDaysCard weatherData={trimmedData} />
            <WindSolarCard weatherData={trimmedData} />
            <CommoditySensitivityCard />
            <CriticalWindowsCard />
            <KairosCorrelationsCard regionId={region.id} />
            <WeatherMarketImpactCard weatherData={trimmedData} region={region} />
            <BehaviouralSignalsCard />
            <ForecastOutlookCard weatherData={trimmedData} region={region} />
          </>
        )}
      </div>

      {!loading && !trimmedData && (
        <div className="kairos-empty">
          <i className="bi bi-cloud-slash" />
          <p>Could not load weather data. Please try again later.</p>
          <button type="button" className="kairos-retry-btn" onClick={loadData}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
