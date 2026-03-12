'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const RANGES = ['1D', '1W', '1M', '3M', '6M', '1Y'];

function getMonthYearLabels(monthCount) {
  const labels = [];
  const now = new Date();
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
  }
  return labels;
}

function getTimeRangeConfig(range) {
  const monthLabels3 = getMonthYearLabels(3);
  const monthLabels6 = getMonthYearLabels(6);
  const monthLabels12 = getMonthYearLabels(12);
  const configs = {
    '1D': {
      labels: ['9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'],
      points: 14,
    },
    '1W': {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      points: 7,
    },
    '1M': {
      labels: ['Wk1', 'Wk2', 'Wk3', 'Wk4', 'Wk5'],
      points: 5,
    },
    '3M': { labels: monthLabels3, points: 3 },
    '6M': { labels: monthLabels6, points: 6 },
    '1Y': { labels: monthLabels12, points: 12 },
  };
  return configs[range] || configs['3M'];
}

function generatePortfolioData(baseValue, range, points) {
  const rand = (seed, min, max) => ((seed * 0.1) % 1) * (max - min) + min;
  const min = baseValue * 0.8;
  const max = baseValue * 1.15;
  const swing = baseValue * 0.003;
  const trend = 1.0003;

  const startFactors = {
    '1D': 0.998,
    '1W': 0.97,
    '1M': 0.95,
    '3M': 0.92,
    '6M': 0.9,
    '1Y': 0.85,
  };
  const startFactor = startFactors[range] ?? 0.92;

  const data = [];
  let v = baseValue * startFactor;
  for (let i = 0; i < points; i++) {
    v = v * trend + rand(i + 1, -swing, swing);
    v = Math.min(max, Math.max(min, v));
    data.push(Math.round(v * 100) / 100);
  }
  if (range !== '1D' && data.length > 0) {
    data[data.length - 1] = baseValue;
  }
  return data;
}

const DEFAULT_PORTFOLIO_VALUE = 158420;

export function PortfolioChart({ portfolioValue }) {
  const [timeRange, setTimeRange] = useState('3M');
  const [fetchedValue, setFetchedValue] = useState(null);

  useEffect(() => {
    if (portfolioValue != null) return;
    fetch('/api/portfolio')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const v = data?.summary?.totalValue;
        if (typeof v === 'number' && v > 0) setFetchedValue(v);
      })
      .catch(() => {});
  }, [portfolioValue]);

  const baseValue = portfolioValue ?? fetchedValue ?? DEFAULT_PORTFOLIO_VALUE;

  const chartData = useMemo(() => {
    const { labels, points } = getTimeRangeConfig(timeRange);
    const values = generatePortfolioData(baseValue, timeRange, points);
    return {
      labels,
      datasets: [
        {
          label: 'Portfolio Value',
          data: values,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [timeRange, baseValue]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: '#10b981',
          bodyColor: '#9ca3af',
          borderColor: 'rgba(16, 185, 129, 0.2)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (ctx) => `$${ctx.raw?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(156, 163, 175, 0.1)' },
          ticks: { color: '#9ca3af', font: { size: 10 } },
        },
        y: {
          grid: { color: 'rgba(156, 163, 175, 0.1)' },
          ticks: {
            color: '#9ca3af',
            font: { size: 10 },
            callback: (value) => '$' + (value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value),
          },
        },
      },
    }),
    []
  );

  return (
    <div className="portfolio-chart-react">
      <div className="chart-header compact">
        <div className="chart-title-area">
          <h2 className="chart-title" id="chartTitle">Total Portfolio Value</h2>
        </div>
        <div className="chart-controls" id="chartControls">
          <div className="time-range-selector compact" id="timeRangeSelector">
            {RANGES.map((r) => (
              <button
                key={r}
                className={`time-btn ${timeRange === r ? 'active' : ''}`}
                type="button"
                data-range={r}
                onClick={() => setTimeRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="chart-container compact" style={{ minHeight: 350 }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
