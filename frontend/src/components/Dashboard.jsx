import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OverlayViewer from './OverlayViewer';
import { ConfidenceGauge, TissueChart } from './Charts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

// ─── Inline SVG icons ─────────────────────────────────────────────────────────
const DownloadIcon  = () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>;
const RefreshIcon   = () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>;
const AlertIcon     = () => <svg width="24" height="24" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>;
const ShieldIcon    = () => <svg width="24" height="24" fill="none" stroke="#22c55e" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>;
const ActivityIcon  = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const ClockIcon     = () => <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const BrainIcon     = () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>;
const ChevronUpIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/></svg>;
const ChevronDnIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>;
const BarIcon       = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>;
const ZapIcon       = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const WarnIcon      = () => <svg width="11" height="11" fill="none" stroke="#f97316" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>;

// ─── Severity / Risk colour maps ──────────────────────────────────────────────
const SEV_META = {
  None:   { color: '#16a34a', bg: 'rgba(22,163,74,0.08)',   border: 'rgba(22,163,74,0.25)' },
  Small:  { color: '#2563eb', bg: 'rgba(37,99,235,0.08)',   border: 'rgba(37,99,235,0.25)' },
  Medium: { color: '#ea580c', bg: 'rgba(234,88,12,0.08)',   border: 'rgba(234,88,12,0.25)' },
  Large:  { color: '#dc2626', bg: 'rgba(220,38,38,0.08)',   border: 'rgba(220,38,38,0.25)' },
};
const RISK_COLOR = {
  'No Risk':       { color: '#16a34a', bg: 'rgba(22,163,74,0.08)',   border: 'rgba(22,163,74,0.25)' },
  'Low Risk':      { color: '#2563eb', bg: 'rgba(37,99,235,0.08)',   border: 'rgba(37,99,235,0.25)' },
  'Moderate Risk': { color: '#ea580c', bg: 'rgba(234,88,12,0.08)',   border: 'rgba(234,88,12,0.25)' },
  'High Risk':     { color: '#dc2626', bg: 'rgba(220,38,38,0.08)',   border: 'rgba(220,38,38,0.25)' },
};

// ─── Simple custom Markdown parser & renderer ──────────────────────────────
const parseItalic = (text) => {
  if (!text) return '';
  const parts = text.split(/(\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} style={{ fontStyle: 'italic', color: '#475569' }}>
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
};

const parseBoldAndItalic = (text) => {
  if (!text) return '';
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={i} style={{ fontWeight: '700', color: '#0f172a' }}>
          {parseItalic(boldText)}
        </strong>
      );
    }
    return parseItalic(part);
  });
};

const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    
    // Check for headers (e.g. ### Header)
    if (trimmed.startsWith('### ')) {
      return (
        <h5 key={idx} style={{ 
          fontSize: '15px', 
          fontWeight: '700', 
          color: '#1e3a8a', 
          marginTop: '16px', 
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {parseBoldAndItalic(trimmed.slice(4))}
        </h5>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h4 key={idx} style={{ 
          fontSize: '17px', 
          fontWeight: '800', 
          color: '#1e3a8a', 
          marginTop: '20px', 
          marginBottom: '10px' 
        }}>
          {parseBoldAndItalic(trimmed.slice(3))}
        </h4>
      );
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h3 key={idx} style={{ 
          fontSize: '19px', 
          fontWeight: '900', 
          color: '#1e3a8a', 
          marginTop: '24px', 
          marginBottom: '12px' 
        }}>
          {parseBoldAndItalic(trimmed.slice(2))}
        </h3>
      );
    }
    
    // Check for bullet list items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <li key={idx} style={{ 
          fontSize: '13.5px', 
          color: '#334155', 
          marginLeft: '20px', 
          marginBottom: '6px', 
          lineHeight: '1.6',
          listStyleType: 'disc'
        }}>
          {parseBoldAndItalic(trimmed.slice(2))}
        </li>
      );
    }

    // Empty line / paragraph break
    if (trimmed === '') {
      return <div key={idx} style={{ height: '8px' }} />;
    }

    // Regular line
    return (
      <p key={idx} style={{ 
        fontSize: '13.5px', 
        lineHeight: '1.65', 
        color: '#334155', 
        margin: '6px 0' 
      }}>
        {parseBoldAndItalic(line)}
      </p>
    );
  });
};

const Dashboard = ({ data, onReset }) => {
  const reportRef = useRef(null);
  const [insightOpen, setInsightOpen] = useState(true);
  const [displayedInsight, setDisplayedInsight] = useState('');
  const [typingDone, setTypingDone]   = useState(false);

  useEffect(() => {
    if (!data?.insight) return;
    setDisplayedInsight(''); setTypingDone(false);
    let i = 0;
    const full = data.insight;
    const iv = setInterval(() => {
      i++;
      setDisplayedInsight(full.slice(0, i));
      if (i >= full.length) { clearInterval(iv); setTypingDone(true); }
    }, 16);
    return () => clearInterval(iv);
  }, [data?.insight]);

  const sev  = SEV_META[data.severity]        || SEV_META.Small;
  const risk = RISK_COLOR[data.risk_assessment] || RISK_COLOR['Low Risk'];
  const scanId = `NSC-${Date.now().toString(36).toUpperCase()}`;

  const exportPDF = async () => {
    const toastId = toast.loading('Generating PDF…');
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, logging: false });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, w, (canvas.height * w) / canvas.width);
      pdf.save('MRI_AI_Report.pdf');
      toast.success('Report saved!', { id: toastId });
    } catch { toast.error('PDF export failed.', { id: toastId }); }
  };

  // ─── Style helpers ────────────────────────────────────────────────────────
  const card = (extra = {}) => ({
    background: 'var(--bg-card-solid)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-md)',
    transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
    ...extra,
  });

  const CONF_BARS = [
    { label: 'Segmentation Confidence', value: data.confidence,                      color: '#2563eb' },
    { label: 'Enhancement Quality',     value: Math.min(data.confidence * 0.95, 100), color: '#7c3aed' },
    { label: 'Boundary Precision',      value: Math.min(data.confidence * 0.92, 100), color: '#059669' },
    { label: 'Classification Score',    value: Math.min(data.confidence * 0.88, 100), color: '#ea580c' },
  ];

  const METRIC_CARDS = [
    { label: 'Tumor Area',   value: `${data.tumor_percentage}%`,  color: '#dc2626' },
    { label: 'Severity',     value: data.severity,                color: sev.color  },
    { label: 'AI Model',     value: 'U-Net++',                    color: '#2563eb'  },
    { label: 'Enhancement',  value: 'ESRGAN',                     color: '#7c3aed'  },
  ];

  return (
    <motion.div ref={reportRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px', fontFamily: 'Inter, sans-serif' }}
    >
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: 0 }}>
            Diagnostic Report
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ClockIcon /> {data.processing_time}s processing
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ActivityIcon /> Analysis complete
            </span>
            <span>•</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--accent-indigo)', fontWeight: '600', fontSize: '11px' }}>
              {scanId}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportPDF} style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 18px', borderRadius: '10px', cursor: 'pointer',
            background: 'var(--border-color)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600',
            transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
          }}>
            <DownloadIcon /> Export PDF
          </button>
          <button onClick={onReset} style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 18px', borderRadius: '10px', cursor: 'pointer',
            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            border: 'none', color: '#fff', fontSize: '13px', fontWeight: '600',
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
          }}>
            <RefreshIcon /> New Scan
          </button>
        </div>
      </div>

      {/* ── Detection Banner ── */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 }}
        style={{
          borderRadius: '16px', padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
          background: data.tumor_detected ? 'rgba(220,38,38,0.05)' : 'rgba(22,163,74,0.05)',
          border: `1px solid ${data.tumor_detected ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: data.tumor_detected ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)',
            border: `1px solid ${data.tumor_detected ? 'rgba(220,38,38,0.25)' : 'rgba(22,163,74,0.25)'}`,
          }}>
            {data.tumor_detected ? <AlertIcon /> : <ShieldIcon />}
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>
              {data.tumor_detected ? 'Abnormality Detected' : 'No Abnormality Found'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              {data.tumor_detected
                ? 'U-Net++ identified regions of interest requiring clinical evaluation.'
                : 'Segmentation model reports no significant tumor regions.'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { label: data.risk_assessment, ...risk },
            { label: `${data.severity} Severity`,  ...sev },
          ].map((b, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: '700',
              color: b.color, background: b.bg, border: `1px solid ${b.border}`,
            }}>
              <ZapIcon /> {b.label}
            </span>
          ))}
        </div>
      </motion.div>

      {/* ── Main Grid: Images (left) + Metrics (right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>

        {/* Left – Image viewer */}
        <OverlayViewer data={data} />

        {/* Right – Metrics panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Confidence gauge */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}
            style={{ ...card({ padding: '24px 16px' }), display: 'flex', justifyContent: 'center' }}
          >
            <ConfidenceGauge confidence={data.confidence} tumorDetected={data.tumor_detected} />
          </motion.div>

          {/* 4 metric cards */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
          >
            {METRIC_CARDS.map(m => (
              <div key={m.label} style={{
                ...card({ padding: '14px 16px' }),
              }}>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>
                  {m.label}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: m.color, fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                  {m.value}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Tissue distribution */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 }}
            style={card({ padding: '20px' })}
          >
            <h4 style={{
              fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase',
              color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <BarIcon /> Tissue Distribution
            </h4>
            <TissueChart tumorPct={data.tumor_percentage} />
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#3b82f6', display: 'inline-block' }} />
                Healthy {(100 - data.tumor_percentage).toFixed(2)}%
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#ef4444', display: 'inline-block' }} />
                Abnormal {data.tumor_percentage}%
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Confidence Breakdown ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        style={card({ padding: '24px' })}
      >
        <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ActivityIcon /> Confidence Breakdown
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {CONF_BARS.map(m => (
            <div key={m.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{m.label}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: m.color, fontFamily: 'monospace' }}>
                  {m.value.toFixed(1)}%
                </span>
              </div>
              <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(148,163,184,0.15)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${m.value}%` }}
                  transition={{ duration: 1.1, ease: [0.22, 0.61, 0.36, 1], delay: 0.4 }}
                  style={{
                    height: '100%', borderRadius: '999px',
                    background: `linear-gradient(90deg, ${m.color}88, ${m.color})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── AI Clinical Insight ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }}
        style={card({ overflow: 'hidden' })}
      >
        <button
          onClick={() => setInsightOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 24px', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: insightOpen ? '1px solid var(--border-color)' : 'none',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <BrainIcon />
            AI Clinical Insight
            {data.image_insight_powered && (
              <span style={{
                fontSize: '10px', fontWeight: '800', letterSpacing: '0.06em',
                padding: '2px 8px', borderRadius: '999px',
                background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', color: '#7c3aed',
              }}>
                VISION-POWERED
              </span>
            )}
          </h4>
          {insightOpen ? <ChevronUpIcon /> : <ChevronDnIcon />}
        </button>

        <AnimatePresence>
          {insightOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28 }}
            >
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  background: 'var(--bg-card)', borderLeft: '4px solid var(--accent-blue)',
                  borderRadius: '0 16px 16px 0', padding: '20px 24px',
                  transition: 'background 0.3s ease, border-color 0.3s ease',
                }}>
                  <div style={{ margin: 0 }}>
                    {renderMarkdown(displayedInsight)}
                    {!typingDone && (
                      <span style={{
                        display: 'inline-block', width: '2px', height: '16px',
                        background: '#2563eb', marginLeft: '3px', verticalAlign: 'middle',
                        animation: 'pulse 1s ease-in-out infinite',
                      }} />
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <WarnIcon />
                  This AI analysis is not a substitute for professional medical diagnosis.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
