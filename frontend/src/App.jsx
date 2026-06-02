import React, { useState, useEffect, useRef } from 'react';
import Home from './pages/Home';
import { Toaster } from 'react-hot-toast';
import { Brain, Sun, Moon } from 'lucide-react';
import { GridBackground } from './components/ReactBitsComponents';
import { motion, AnimatePresence } from 'framer-motion';
import trainingCurves from './assets/training_curves.png';
import esrganResult from './assets/esrgan_result.png';
import unetResult from './assets/unet_result.png';

// ─── ESRGAN Panel Data ────────────────────────────────────────────────────────
const ESRGAN_DATA = {
  psnr:  { value: 32.96, benchmark: '30 – 33',  label: 'Best Validation PSNR', unit: 'dB' },
  ssim:  { value: 0.9524, benchmark: '0.88 – 0.93', label: 'Best Validation SSIM', unit: '' },
  optimizations: [
    { icon: '⬡', text: 'RRDB Blocks (Residual-in-Residual Dense Block)' },
    { icon: '⚡', text: 'Mixed Precision Training (FP16/FP32)' },
    { icon: '📊', text: 'Validation Progress Bar' },
    { icon: '🚀', text: 'Fast Validation Subset' },
    { icon: '🗂️', text: 'Official Validation Dataset' },
    { icon: '🧠', text: 'MRI-Specific Preprocessing Pipeline' },
    { icon: '💾', text: 'Automatic Best Model Saving' },
  ],
};

// ─── U-Net++ Panel Data ──────────────────────────────────────────────────────
const UNET_DATA = {
  dice: { value: 0.9076, benchmark: '0.85 – 0.92', label: 'Best Dice Score', unit: '' },
  iou: { value: 0.8321, benchmark: '0.75 – 0.82', label: 'Best IoU', unit: '' },
  features: [
    { icon: '🔬', text: 'ESRGAN Enhanced MRI Input' },
    { icon: '⬡', text: 'U-Net++ Architecture (Nested Encoder-Decoder)' },
    { icon: '📐', text: 'Dice + BCE Combined Loss Function' },
    { icon: '⚡', text: 'Mixed Precision Training (FP16/FP32)' },
    { icon: '🎯', text: 'Bounding Box Detection' },
    { icon: '🧠', text: 'Tumor Presence Detection' },
    { icon: '💾', text: 'Automatic Best Model Saving' },
  ],
};

// ─── Nav panel definitions ────────────────────────────────────────────────────
const NAV_PANELS = {
  ESRGAN: 'esrgan',
  'U-Net++': 'unet',
  'NLP Report': 'nlp',
  'Analysis': 'analysis',
};

// ─── Radial progress ring ─────────────────────────────────────────────────────
const Ring = ({ value, max, color, size = 90, strokeWidth = 8, label, unit, benchmark }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const offset = circ * (1 - pct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth={strokeWidth} />
          <motion.circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '15px', fontWeight: '800', color, lineHeight: 1, fontFamily: 'monospace' }}>
            {value}
          </span>
          {unit && <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>{unit}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{label}</div>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Benchmark: <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{benchmark}</span>
        </div>
      </div>
    </div>
  );
};

// ─── ESRGAN Panel ─────────────────────────────────────────────────────────────
const ESRGANPanel = () => (
  <div style={{ display: 'flex', gap: '32px', padding: '20px 24px', flexWrap: 'wrap' }}>

    {/* Left: Metric rings */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '220px' }}>
      <div style={{
        fontSize: '10px', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase',
        color: '#94a3b8', paddingBottom: '8px', borderBottom: '1px solid rgba(37,99,235,0.08)',
      }}>
        Final ESRGAN Results
      </div>

      <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>
        {/* PSNR — max sensible is ~40dB */}
        <Ring value={32.96} max={40} color="#2563eb" label="Best PSNR" unit="dB" benchmark="30 – 33" />
        {/* SSIM — out of 1.0 */}
        <Ring value={0.9524} max={1} color="#7c3aed" label="Best SSIM" unit="" benchmark="0.88 – 0.93" size={90} />
      </div>

      {/* Performance badges */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { label: 'PSNR', val: '32.96 dB', status: 'Exceeds Average', color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
          { label: 'SSIM', val: '0.9524',   status: 'Above Benchmark', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
        ].map(b => (
          <div key={b.label} style={{
            padding: '8px 12px', borderRadius: '10px',
            background: b.bg, border: `1px solid ${b.color}22`,
          }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{b.label}</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: b.color, fontFamily: 'monospace', lineHeight: 1.2 }}>{b.val}</div>
            <div style={{ fontSize: '10px', color: '#059669', fontWeight: '700', marginTop: '2px' }}>✓ {b.status}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Divider */}
    <div style={{ width: '1px', background: 'rgba(37,99,235,0.1)', alignSelf: 'stretch' }} />

    {/* Middle: Optimizations */}
    <div style={{ flex: '1 1 260px', minWidth: '260px' }}>
      <div style={{
        fontSize: '10px', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase',
        color: '#94a3b8', paddingBottom: '8px', marginBottom: '12px', borderBottom: '1px solid rgba(37,99,235,0.08)',
      }}>
        Optimizations Used
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {ESRGAN_DATA.optimizations.map((opt, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i + 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 12px', borderRadius: '10px',
              background: 'rgba(37,99,235,0.04)',
              border: '1px solid rgba(37,99,235,0.08)',
            }}
          >
            <span style={{ fontSize: '15px', flexShrink: 0 }}>{opt.icon}</span>
            <span style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>{opt.text}</span>
            <span style={{
              marginLeft: 'auto', fontSize: '10px', fontWeight: '700',
              color: '#059669', background: 'rgba(5,150,105,0.1)',
              padding: '2px 7px', borderRadius: '999px', flexShrink: 0,
            }}>✓</span>
          </motion.div>
        ))}
      </div>
    </div>

    {/* Divider */}
    <div style={{ width: '1px', background: 'rgba(37,99,235,0.1)', alignSelf: 'stretch' }} />

    {/* Right: Visual Super-Resolution Output */}
    <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
      <div style={{
        fontSize: '10px', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase',
        color: '#94a3b8', paddingBottom: '8px', marginBottom: '12px', borderBottom: '1px solid rgba(37,99,235,0.08)',
      }}>
        Visual Resolution Enhancement
      </div>
      <div style={{
        background: 'rgba(5, 8, 16, 0.4)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
      }}>
        <img 
          src={esrganResult} 
          alt="ESRGAN Before vs After Comparison" 
          style={{ width: '100%', height: 'auto', borderRadius: '8px', display: 'block' }} 
        />
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', marginTop: '4px' }}>
          Left: Low-res MRI slice (256×256) | Right: ESRGAN 4× upscaled output (1024×1024)
        </div>
      </div>
    </div>
  </div>
);

// ─── U-Net++ Panel ───────────────────────────────────────────────────────────
const UNetPanel = () => {
  const dice = UNET_DATA.dice;
  const iou = UNET_DATA.iou;
  const size = 90, strokeWidth = 8;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offsetDice = circ * (1 - dice.value);
  const offsetIou = circ * (1 - iou.value);

  return (
    <div style={{ display: 'flex', gap: '32px', padding: '20px 24px', flexWrap: 'wrap' }}>

      {/* Left: Metric rings + BraTS comparison + badges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '220px' }}>
        <div style={{
          fontSize: '10px', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: '#94a3b8', paddingBottom: '8px', borderBottom: '1px solid rgba(124,58,237,0.1)',
        }}>
          Final U-Net++ Results
        </div>

        {/* Dice & IoU Rings */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <Ring value={dice.value} max={1} color="#7c3aed" label="Best Dice (F1)" unit="" benchmark={dice.benchmark} />
          <Ring value={iou.value} max={1} color="#2563eb" label="Best IoU" unit="" benchmark={iou.benchmark} />
        </div>

        {/* BraTS comparison mini-gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { label: 'Our Model (Dice)',  value: dice.value, color: '#7c3aed' },
            { label: 'BraTS Avg (Dice)', value: 0.885,  color: '#94a3b8' },
          ].map((row, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '10px', fontWeight: '600' }}>
                <span style={{ color: row.color }}>{row.label}</span>
                <span style={{ fontFamily: 'monospace', color: row.color }}>{row.value}</span>
              </div>
              <div style={{ width: '200px', height: '6px', borderRadius: '999px', background: 'rgba(148,163,184,0.15)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(row.value / 1) * 100}%` }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.4 + i * 0.1 }}
                  style={{ height: '100%', borderRadius: '999px', background: row.color }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Performance badges */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '240px' }}>
          {[
            { label: 'Precision', val: '91.04%', status: 'High Precision', color: '#059669', bg: 'rgba(5,150,105,0.08)' },
            { label: 'Recall', val: '90.59%', status: 'High Recall', color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
            { label: 'F1-Score', val: '0.9076', status: 'Optimal F1', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
            { label: 'Val Loss', val: '0.1863', status: 'Minimal Loss', color: '#ea580c', bg: 'rgba(234,88,12,0.08)' },
          ].map(b => (
            <div key={b.label} style={{
              padding: '6px 10px', borderRadius: '10px',
              background: b.bg, border: `1px solid ${b.color}22`,
              minWidth: '100px', flex: '1 1 45%',
            }}>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{b.label}</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: b.color, fontFamily: 'monospace', lineHeight: 1.2 }}>{b.val}</div>
              <div style={{ fontSize: '9px', color: '#059669', fontWeight: '700', marginTop: '2px' }}>✓ {b.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', background: 'rgba(124,58,237,0.1)', alignSelf: 'stretch' }} />

      {/* Middle: Features */}
      <div style={{ flex: '1 1 260px', minWidth: '260px' }}>
        <div style={{
          fontSize: '10px', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: '#94a3b8', paddingBottom: '8px', marginBottom: '12px', borderBottom: '1px solid rgba(124,58,237,0.1)',
        }}>
          Features
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {UNET_DATA.features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i + 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', borderRadius: '10px',
                background: 'rgba(124,58,237,0.04)',
                border: '1px solid rgba(124,58,237,0.08)',
              }}
            >
              <span style={{ fontSize: '15px', flexShrink: 0 }}>{f.icon}</span>
              <span style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>{f.text}</span>
              <span style={{
                marginLeft: 'auto', fontSize: '10px', fontWeight: '700',
                color: '#059669', background: 'rgba(5,150,105,0.1)',
                padding: '2px 7px', borderRadius: '999px', flexShrink: 0,
              }}>✓</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', background: 'rgba(124,58,237,0.1)', alignSelf: 'stretch' }} />

      {/* Right: Visual Segmentation Output */}
      <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
        <div style={{
          fontSize: '10px', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: '#94a3b8', paddingBottom: '8px', marginBottom: '12px', borderBottom: '1px solid rgba(124,58,237,0.1)',
        }}>
          Visual Segmentation Results
        </div>
        <div style={{
          background: 'rgba(5, 8, 16, 0.4)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
        }}>
          <img 
            src={unetResult} 
            alt="U-Net++ Segmentation Visualization" 
            style={{ width: '100%', height: 'auto', borderRadius: '8px', display: 'block' }} 
          />
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', marginTop: '4px' }}>
            Visualizing input slice, ground truth mask, and model predictions
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Coming soon placeholder ──────────────────────────────────────────────────
const ComingSoon = ({ name }) => (
  <div style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>
    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔬</div>
    <div style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>{name} metrics panel</div>
    <div style={{ fontSize: '12px', marginTop: '4px' }}>Coming soon</div>
  </div>
);

// ─── Analysis Panel ───────────────────────────────────────────────────────────
const AnalysisPanel = () => (
  <div style={{ display: 'flex', gap: '32px', padding: '24px 28px', flexWrap: 'wrap' }}>
    {/* Left: Charts and Visuals */}
    <div style={{ flex: '1 1 60%', minWidth: '340px' }}>
      <div style={{
        fontSize: '10px', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase',
        color: '#94a3b8', paddingBottom: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(124,58,237,0.1)',
      }}>
        Validation & Training Curves
      </div>
      
      <div style={{
        background: 'rgba(5, 8, 16, 0.4)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
      }}>
        <img 
          src={trainingCurves} 
          alt="U-Net++ Training Curves" 
          style={{ width: '100%', height: 'auto', borderRadius: '8px', display: 'block' }} 
        />
      </div>
    </div>

    {/* Right: Training Specifications & Best Results */}
    <div style={{ flex: '1 1 30%', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{
          fontSize: '10px', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: '#94a3b8', paddingBottom: '8px', marginBottom: '12px', borderBottom: '1px solid rgba(124,58,237,0.1)',
        }}>
          Training Specifications
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { label: 'Device / GPU', val: 'Nvidia Tesla T4 (15.64 GB VRAM)' },
            { label: 'Dataset', val: 'BraTS 2020 (2,107 slice pairs)' },
            { label: 'Split Ratio', val: '80% Train (1,685) / 20% Val (422)' },
            { label: 'Optimizer / Scheduler', val: 'AdamW + Cosine Annealing' },
            { label: 'Loss Function', val: 'Dice + BCE Combined Loss' },
            { label: 'Epochs Run', val: '30 Epochs (Full Convergence)' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', borderRadius: '10px',
              background: 'rgba(37,99,235,0.03)', border: '1px solid rgba(37,99,235,0.06)'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>{item.label}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '700', textAlign: 'right' }}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{
          fontSize: '10px', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: '#94a3b8', paddingBottom: '8px', marginBottom: '12px', borderBottom: '1px solid rgba(124,58,237,0.1)',
        }}>
          Best Model Epoch Results
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Validation Loss', val: '0.1863', color: '#ea580c' },
            { label: 'Dice Score', val: '0.9076', color: '#7c3aed' },
            { label: 'Intersection over Union (IoU)', val: '0.8321', color: '#2563eb' },
            { label: 'Precision', val: '91.04%', color: '#059669' },
            { label: 'Recall', val: '90.59%', color: '#0891b2' },
            { label: 'F1-Score', val: '0.9076', color: '#7c3aed' },
          ].map((metric, i) => (
            <div key={i} style={{
              padding: '10px 12px', borderRadius: '12px',
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            }}>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{metric.label}</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: metric.color, fontFamily: 'monospace', lineHeight: '1.2' }}>{metric.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [apiOnline, setApiOnline] = useState(null);
  const [activePanel, setActivePanel] = useState(null);
  const panelRef = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/', { signal: AbortSignal.timeout(3000) });
        setApiOnline(res.ok);
      } catch { setApiOnline(false); }
    };
    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setActivePanel(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNavClick = (link) => {
    const panelKey = NAV_PANELS[link];
    setActivePanel(prev => prev === panelKey ? null : panelKey);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-primary)', color: 'var(--text-primary)',
      fontFamily: "'Inter', sans-serif", transition: 'background-color 0.3s ease, color 0.3s ease',
    }}>
      <GridBackground>
        {/* ── Header ── */}
        <div ref={panelRef} style={{ position: 'sticky', top: 0, zIndex: 100 }}>
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderBottom: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
            }}
          >
            <div style={{
              maxWidth: '1200px', margin: '0 auto',
              padding: '0 24px', height: '68px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              {/* Brand */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #0ea5e9 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
                }}>
                  <Brain size={22} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-primary)', lineHeight: 1 }}>
                    MRI<span style={{ color: '#2563eb' }}>·</span>AI
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500', marginTop: '2px' }}>
                    Tumor Detection System
                  </div>
                </div>
              </div>

              {/* Nav */}
              <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {Object.keys(NAV_PANELS).map(link => {
                  const key = NAV_PANELS[link];
                  const isActive = activePanel === key;
                  return (
                    <button
                      key={link}
                      onClick={() => handleNavClick(link)}
                      style={{
                        fontSize: '13px', fontWeight: '600',
                        color: isActive ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                        textDecoration: 'none', cursor: 'pointer',
                        padding: '6px 14px', borderRadius: '8px', border: 'none',
                        background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                        transition: 'all 0.2s', letterSpacing: '0.01em',
                        display: 'flex', alignItems: 'center', gap: '5px',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--accent-indigo)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      {link}
                      <motion.span
                        animate={{ rotate: isActive ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ display: 'inline-block', lineHeight: 1 }}
                      >
                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </motion.span>
                    </button>
                  );
                })}
              </nav>

              {/* Controls: Theme Toggle & API Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Theme Toggle Button */}
                <button
                  onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                  style={{
                    background: 'var(--border-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    transition: 'all 0.25s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.background = 'rgba(99,102,241,0.12)';
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.background = 'var(--border-color)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                  title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>

                {/* Status pill */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 14px', borderRadius: '999px',
                    background: apiOnline === true ? 'rgba(34,197,94,0.10)'
                      : apiOnline === false ? 'rgba(239,68,68,0.10)'
                      : 'rgba(99,102,241,0.10)',
                    border: `1px solid ${apiOnline === true ? 'rgba(34,197,94,0.3)'
                      : apiOnline === false ? 'rgba(239,68,68,0.3)'
                      : 'rgba(99,102,241,0.3)'}`,
                  }}
                >
                  <motion.span
                    animate={apiOnline !== false ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      width: '7px', height: '7px', borderRadius: '50%', display: 'block',
                      background: apiOnline === true ? '#22c55e' : apiOnline === false ? '#ef4444' : '#818cf8',
                    }}
                  />
                  <span style={{
                    fontSize: '12px', fontWeight: '700', letterSpacing: '0.02em',
                    color: apiOnline === true ? '#16a34a' : apiOnline === false ? '#dc2626' : '#6366f1',
                  }}>
                    API {apiOnline === null ? 'Checking…' : apiOnline ? 'Online' : 'Offline'}
                  </span>
                </motion.div>
              </div>
            </div>
          </motion.header>

          {/* ── Dropdown Panel ── */}
          <AnimatePresence>
            {activePanel && (
              <motion.div
                key={activePanel}
                initial={{ opacity: 0, y: -8, scaleY: 0.96 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -6, scaleY: 0.97 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'absolute', left: 0, right: 0,
                  background: 'var(--bg-card-solid)',
                  backdropFilter: 'blur(20px)',
                  borderBottom: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-lg)',
                  transformOrigin: 'top',
                  transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                  zIndex: 99,
                }}
              >
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                  {activePanel === 'esrgan'   && <ESRGANPanel />}
                  {activePanel === 'unet'     && <UNetPanel />}
                  {activePanel === 'nlp'      && <ComingSoon name="NLP Report" />}
                  {activePanel === 'analysis' && <AnalysisPanel />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Main ── */}
        <main style={{ flex: 1, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 24px 80px' }}>
          <Home />
        </main>

        {/* ── Footer ── */}
        <footer style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)', padding: '20px 24px', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>MRI·AI &nbsp;•&nbsp; ESRGAN + U-Net++ Segmentation Pipeline</span>
            <span style={{ fontSize: '12px', color: 'var(--accent-blue)', opacity: 0.8, fontWeight: '700' }}>FOR CLINICAL RESEARCH USE ONLY</span>
          </div>
        </footer>

        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'var(--bg-card-solid)', color: 'var(--text-primary)',
              border: '1px solid var(--border-color)', borderRadius: '12px',
              boxShadow: 'var(--shadow-md)',
              fontFamily: 'Inter, sans-serif', fontSize: '14px',
            },
          }}
        />
      </GridBackground>
    </div>
  );
}

export default App;
