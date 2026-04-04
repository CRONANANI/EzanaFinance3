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

/* ── Region config ─────────────────────────────────────────── */
const REGIONS = [
  { id: 'us-midwest', label: 'U.S. Midwest', lat: 41.5, lon: -89.0, commodity: 'Corn & Soybeans' },
  { id: 'brazil-south', label: 'Brazil (South)', lat: -23.5, lon: -49.0, commodity: 'Soybeans & Coffee' },
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
  const currentTemp = todayIdx >= 0 ? chartData[todayIdx].avg : chartData[chartData.length - 1]?.avg;
  const weekAgo = todayIdx >= 7 ? chartData[todayIdx - 7]?.avg : chartData[0]?.avg;
  const delta = currentTemp != null && weekAgo != null ? currentTemp - weekAgo : null;

  return (
    <KairosCard icon="bi-thermometer-half" title="Temperature tracker">
      <div className="kairos-stat-row">
        <MiniStat label="Current avg" value={currentTemp != null ? `${currentTemp}°` : '—'} unit="C" />
        <MiniStat
          label="7-day Δ"
          value={delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}°` : '—'}
          positive={delta != null ? delta > 0 : undefined}
        />
        <MiniStat label="Region" value={region.label} />
      </div>
      <div className="kairos-chart-wrap">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
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
            <Line type="monotone" dataKey="avg" stroke="#d4af37" strokeWidth={2} dot={false} name="Avg" strokeDasharray="4 2" />
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
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
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
            <Bar dataKey="precip" fill="rgba(59,130,246,0.6)" radius={[2, 2, 0, 0]} name="Daily rain" />
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
      </div>
      <p className="kairos-card-hint">
        GDD accumulates heat above 10°C — critical for tracking corn, soy, and wheat growth stages.
      </p>
      <div className="kairos-chart-wrap">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
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
            <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} width={40} />
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

  const avgWind = chartData.length ? chartData.reduce((s, d) => s + d.wind, 0) / chartData.length : 0;
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
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis yAxisId="wind" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} width={32} />
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

/* ── 5. Commodity Sensitivity Radar ────────────────────────── */
function CommoditySensitivityCard() {
  const [selected, setSelected] = useState('corn');

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

  return (
    <KairosCard
      icon="bi-bullseye"
      title="Commodity weather sensitivity"
      actions={
        <div className="kairos-pill-selector">
          {Object.entries(profiles).map(([k, v]) => (
            <button
              key={k}
              type="button"
              className={`kairos-pill-btn${selected === k ? ' active' : ''}`}
              onClick={() => setSelected(k)}
            >
              {v.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="kairos-chart-wrap kairos-chart-wrap--centered">
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={profiles[selected].data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="rgba(212,175,55,0.12)" />
            <PolarAngleAxis dataKey="dim" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
            <Radar
              dataKey="v"
              stroke="#d4af37"
              fill="rgba(212,175,55,0.2)"
              strokeWidth={2}
              name="Sensitivity"
              dot={{ r: 3, fill: '#d4af37' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="kairos-card-hint">
        Sensitivity score (0–100) estimates how strongly each weather dimension affects the commodity&apos;s supply and
        price.
      </p>
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
        { label: 'Planting', months: [3, 4], risk: 'Wet delays' },
        { label: 'Pollination', months: [6], risk: 'Heat stress' },
        { label: 'Harvest', months: [8, 9, 10], risk: 'Rain damage' },
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
        The same weather event can be noise in one month and market-moving in another. Active windows are highlighted.
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

/* ── 7. Signal Strength Dashboard Card ─────────────────────── */
function SignalDashboardCard({ weatherData, region }) {
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
      avgTemp > 35 ? 'extreme-heat' : avgTemp > 30 ? 'heat-stress' : avgTemp < 0 ? 'frost-risk' : avgTemp < 5 ? 'cold-stress' : 'normal';
    const precipSignal =
      totalPrecip < 5 ? 'drought-risk' : totalPrecip > 100 ? 'flood-risk' : totalPrecip > 60 ? 'wet' : 'normal';
    const windSignal = maxWind > 80 ? 'storm' : maxWind > 50 ? 'high-wind' : 'normal';

    return [
      {
        dim: 'Temperature',
        signal: tempSignal,
        detail: `Avg ${avgTemp.toFixed(1)}°C (7d)`,
        severity:
          tempSignal === 'normal' ? 0 : tempSignal.includes('extreme') || tempSignal === 'frost-risk' ? 3 : 2,
      },
      {
        dim: 'Precipitation',
        signal: precipSignal,
        detail: `${totalPrecip.toFixed(1)} mm (7d)`,
        severity:
          precipSignal === 'normal' ? 0 : precipSignal.includes('flood') || precipSignal.includes('drought') ? 3 : 1,
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

  return (
    <KairosCard icon="bi-shield-check" title="Signal strength — live">
      <div className="kairos-signal-overall" style={{ borderLeftColor: severityColors[overallSeverity] }}>
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
  const [loading, setLoading] = useState(true);

  const region = REGIONS.find((r) => r.id === regionId) || REGIONS[0];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWeatherForecast(region.lat, region.lon);
      setWeatherData(data);
    } catch (err) {
      console.error('[kairos] Weather fetch failed:', err);
      setWeatherData(null);
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
            Live weather and environmental data mapped to commodity markets. Track conditions across key production
            regions and pair physical signals with market context.
          </p>
        </div>
      </header>

      <div className="kairos-controls">
        <RegionPicker value={regionId} onChange={setRegionId} />
        <TimeframePicker value={timeframe} onChange={setTimeframe} />
      </div>

      {loading && <LoadingPulse />}

      {!loading && trimmedData && (
        <div className="kairos-grid">
          <SignalDashboardCard weatherData={trimmedData} region={region} />
          <TemperatureAnomalyCard weatherData={trimmedData} region={region} />
          <PrecipitationCard weatherData={trimmedData} region={region} />
          <GrowingDegreeDaysCard weatherData={trimmedData} />
          <WindSolarCard weatherData={trimmedData} />
          <CommoditySensitivityCard />
          <CriticalWindowsCard />
        </div>
      )}

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
