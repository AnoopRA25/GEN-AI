import React from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

/* ─── Confidence Gauge ──────────────────────────────────────────── */
export const ConfidenceGauge = ({ confidence, tumorDetected }) => {
  const pct = Math.min(Math.max(confidence, 0), 100);

  /* Color logic: red if tumor present + high confidence, green if clear */
  let fillColor;
  if (tumorDetected) {
    fillColor = pct >= 80 ? '#ef4444' : pct >= 60 ? '#f97316' : '#eab308';
  } else {
    fillColor = pct >= 70 ? '#22c55e' : '#3b82f6';
  }

  const data = {
    datasets: [{
      data: [pct, 100 - pct],
      backgroundColor: [fillColor, 'rgba(148,163,184,0.10)'],
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

  const detectionColor = tumorDetected ? '#ef4444' : '#22c55e';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '4px' }}>
      {/* Title */}
      <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
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
          <span style={{ fontSize: '30px', fontWeight: '900', color: fillColor, lineHeight: 1, fontFamily: 'monospace' }}>
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

  const data = {
    labels: ['Healthy', 'Abnormal'],
    datasets: [{
      data: [healthy, tumor],
      backgroundColor: ['rgba(59,130,246,0.65)', 'rgba(239,68,68,0.75)'],
      borderColor:     ['rgba(59,130,246,1)',     'rgba(239,68,68,1)'],
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
        backgroundColor: 'rgba(15,23,42,0.9)',
        titleColor:      '#f1f5f9',
        bodyColor:       '#94a3b8',
        borderColor:     'rgba(37,99,235,0.3)',
        borderWidth: 1,
        callbacks: { label: ctx => ` ${ctx.raw.toFixed(2)}%` },
      },
    },
    scales: {
      x: {
        max: 100,
        grid:  { color: 'rgba(148,163,184,0.12)' },
        ticks: { color: '#475569', font: { size: 11 } },
      },
      y: {
        grid:  { display: false },
        ticks: { color: '#334155', font: { weight: '600', size: 12 } },
      },
    },
    animation: { duration: 900 },
  };

  return (
    <div style={{ height: 90 }}>
      <Bar data={data} options={options} />
    </div>
  );
};
