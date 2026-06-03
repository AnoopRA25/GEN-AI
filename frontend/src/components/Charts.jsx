import React from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const getCSSVal = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};

/* ─── Confidence Gauge ──────────────────────────────────────────── */
export const ConfidenceGauge = ({ confidence, tumorDetected }) => {
  const pct = Math.min(Math.max(confidence, 0), 100);

  /* Color logic: coral if tumor present + high confidence, sage if clear */
  let fillColor;
  if (tumorDetected) {
    fillColor = pct >= 80 ? '#d96b6b' : pct >= 60 ? '#c07850' : '#d4a853';
  } else {
    fillColor = pct >= 70 ? '#7cb893' : '#5ea8a8';
  }

  const data = {
    datasets: [{
      data: [pct, 100 - pct],
      backgroundColor: [fillColor, 'rgba(212,168,83,0.06)'],
      borderColor:     [fillColor, 'transparent'],
      borderWidth: 0,
      circumference: 200,
      rotation: -100,
      cutout: '80%',
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend:  { display: false },
      tooltip: { enabled: false },
    },
    animation: { animateRotate: true, duration: 1100 },
  };

  /* Label shown below gauge */
  const detectionLabel = tumorDetected
    ? '🔴 Tumor Present'
    : '✅ Tumor Not Present';

  const detectionColor = tumorDetected ? '#d96b6b' : '#7cb893';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '4px' }}>
      {/* Title */}
      <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
        AI Confidence
      </span>

      {/* Gauge + centered number */}
      <div style={{ position: 'relative', width: 180, height: 130 }}>
        <Doughnut data={data} options={options} />
        {/* Percentage — positioned at center-bottom of the arc */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-end',
          paddingBottom: '22px',
        }}>
          <span style={{ fontSize: '30px', fontWeight: '900', color: fillColor, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Detection label */}
      <span style={{ fontSize: '13px', fontWeight: '700', color: detectionColor, marginTop: '2px' }}>
        {detectionLabel}
      </span>
    </div>
  );
};

/* ─── Tissue Distribution Bar ─────────────────────────────────── */
export const TissueChart = ({ tumorPct }) => {
  const tumor   = Math.min(Math.max(tumorPct, 0), 100);
  const healthy = 100 - tumor;

  const isLight = typeof document !== 'undefined' && document.documentElement.classList.contains('light');
  const chartKey = isLight ? 'light' : 'dark';

  const textColor = getCSSVal('--text-secondary', '#8a8378');
  const borderColor = getCSSVal('--border-color', 'rgba(212,168,83,0.10)');
  const titleColor = getCSSVal('--text-primary', '#ede8e0');
  const tooltipBg = getCSSVal('--bg-card-solid', '#1a1d26');

  const data = {
    labels: ['Healthy', 'Abnormal'],
    datasets: [{
      data: [healthy, tumor],
      backgroundColor: ['rgba(94,168,168,0.60)', 'rgba(217,107,107,0.70)'],
      borderColor:     ['rgba(94,168,168,1)',     'rgba(217,107,107,1)'],
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor:      titleColor,
        bodyColor:       textColor,
        borderColor:     borderColor,
        borderWidth: 1,
        callbacks: { label: ctx => ` ${ctx.raw.toFixed(2)}%` },
      },
    },
    scales: {
      x: {
        max: 100,
        grid:  { color: borderColor },
        ticks: { color: textColor, font: { size: 11 } },
      },
      y: {
        grid:  { display: false },
        ticks: { color: textColor, font: { weight: '600', size: 12 } },
      },
    },
    animation: { duration: 900 },
  };

  return (
    <div style={{ height: 90 }}>
      <Bar key={chartKey} data={data} options={options} />
    </div>
  );
};
