import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Upload from '../components/Upload';
import Dashboard from '../components/Dashboard';
import { FadeIn, GradientText, PopInButton, FloatingCard, GlowCard, CountUp } from '../components/ReactBitsComponents';

// ─── Icon components (inline SVG for reliability) ─────────────────────────────
const UploadIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const PlayIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><polygon fill="currentColor" stroke="none" points="10,8 16,12 10,16"/>
  </svg>
);
const ZapIcon = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const MicroscopeIcon = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6m-6 0v4m6-4v4M9 7h6M5 21h14M12 17v4m-4-4h8m-8 0a4 4 0 110-8h8a4 4 0 110 8"/>
  </svg>
);
const FileIcon = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>
);
const ChevronDown = () => (
  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
  </svg>
);

// ─── Typewriter hook ─────────────────────────────────────────────────────────
const useTypewriter = (text, speed = 60, delay = 300) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const timeout = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(iv); setDone(true); }
      }, speed);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);

  return { displayed, done };
};

const FEATURES = [
  {
    icon: <ZapIcon />, color: '#d4a853', bg: 'rgba(212,168,83,0.08)',
    badge: 'ENHANCEMENT', title: 'ESRGAN Super-Resolution',
    desc: 'AI-powered super-resolution upscales low-resolution MRI scans 4× for significantly clearer diagnostic detail.',
  },
  {
    icon: <MicroscopeIcon />, color: '#9b8ec4', bg: 'rgba(155,142,196,0.08)',
    badge: 'SEGMENTATION', title: 'U-Net++ Segmentation',
    desc: 'Deep learning encoder-decoder network precisely isolates and outlines tumor boundaries with pixel-level accuracy.',
  },
  {
    icon: <FileIcon />, color: '#5ea8a8', bg: 'rgba(94,168,168,0.08)',
    badge: 'REPORTING', title: 'NLP Clinical Report',
    desc: 'Gemini Vision analyzes scan images and generates clinical insights with risk classifications for treating clinicians.',
  },
];

const STATS = [
  { value: '94', suffix: '%+', label: 'Accuracy', color: '#d4a853', bg: 'rgba(212,168,83,0.08)' },
  { value: '2',  suffix: 's',  label: 'Processing Speed', color: '#5ea8a8', bg: 'rgba(94,168,168,0.08)' },
  { value: '5',  suffix: '',   label: 'Output Formats', color: '#9b8ec4', bg: 'rgba(155,142,196,0.08)' },

];

const Home = () => {
  const [result, setResult] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const { displayed: heroText, done: heroDone } = useTypewriter('AI MRI Tumor', 55, 400);
  const { displayed: heroText2, done: heroDone2 } = useTypewriter('Detection', 55, 1200);

  // ─── Styles ──────────────────────────────────────────────────────────────────
  const S = {
    heroSection: {
      textAlign: 'center', padding: '80px 0 60px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    },
    badge: {
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      padding: '6px 16px', borderRadius: '999px',
      background: 'rgba(212,168,83,0.06)',
      border: '1px solid rgba(212,168,83,0.18)',
      color: '#d4a853', fontSize: '12px', fontWeight: '700',
      letterSpacing: '0.06em', textTransform: 'uppercase',
      marginBottom: '28px',
    },
    heroTitle: {
      fontSize: 'clamp(44px, 6vw, 80px)',
      fontWeight: '900', letterSpacing: '-2.5px', lineHeight: 1.05,
      color: 'var(--text-primary)', marginBottom: '20px',
    },
    heroDesc: {
      fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.7,
      maxWidth: '560px', margin: '0 auto 40px',
    },
    btnPrimary: {
      display: 'inline-flex', alignItems: 'center', gap: '10px',
      padding: '14px 32px', borderRadius: '14px',
      background: 'linear-gradient(135deg, #c09038 0%, #d4a853 50%, #c07850 100%)',
      color: '#0d0f14', fontSize: '16px', fontWeight: '700',
      border: 'none', cursor: 'pointer',
      boxShadow: '0 8px 28px rgba(212,168,83,0.30)',
      letterSpacing: '-0.2px',
    },
    btnSecondary: {
      display: 'inline-flex', alignItems: 'center', gap: '10px',
      padding: '14px 28px', borderRadius: '14px',
      background: 'rgba(212,168,83,0.06)', color: 'var(--accent-amber)',
      fontSize: '16px', fontWeight: '700',
      border: '1px solid rgba(212,168,83,0.18)', cursor: 'pointer',
      boxShadow: 'var(--shadow-sm)',
    },
    statsRow: {
      display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
      gap: '12px', marginTop: '36px',
    },
    statPill: (color, bg) => ({
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 16px', borderRadius: '999px',
      background: bg, border: `1px solid ${color}22`,
      fontSize: '14px', fontWeight: '700', color,
      transition: 'all 0.3s ease',
    }),
    statValue: { fontSize: '18px', fontWeight: '900' },
    sectionTitle: {
      fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: '800',
      color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: '12px',
    },
    sectionSub: {
      fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '48px',
    },
    featureCard: (color, bg) => ({
      background: 'var(--bg-card)', borderRadius: '24px', padding: '28px',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-sm)',
      transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)', cursor: 'default',
      textAlign: 'left',
    }),
    iconBox: (color, bg) => ({
      width: '52px', height: '52px', borderRadius: '14px',
      background: bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color, marginBottom: '16px',
      border: `1px solid ${color}22`,
      boxShadow: `0 0 20px ${color}10`,
    }),
    cardBadge: (color, bg) => ({
      display: 'inline-block', fontSize: '10px', fontWeight: '800',
      letterSpacing: '0.08em', color, background: bg,
      padding: '3px 10px', borderRadius: '999px',
      border: `1px solid ${color}22`, marginBottom: '10px',
    }),
    cardTitle: {
      fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)',
      marginBottom: '8px', letterSpacing: '-0.3px',
    },
    cardDesc: { fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.65 },
    uploadWrapper: {
      background: 'var(--bg-card-solid)', borderRadius: '24px', padding: '8px',
      boxShadow: 'var(--shadow-lg)',
      border: '1px solid var(--border-color)',
      width: '100%', maxWidth: '640px',
    },
  };

  if (result) {
    return (
      <motion.div
        key="dashboard"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
      >
        <Dashboard data={result} onReset={() => { setResult(null); setShowUpload(false); }} />
      </motion.div>
    );
  }

  return (
    <div>
      {/* ── Hero ── */}
      <div style={S.heroSection}>
        {/* Neural badge */}
        <FadeIn delay={0}>
          <div style={S.badge}>
            <motion.span
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'inline-block' }}
            >
              ◈
            </motion.span>
            AI-Powered Medical Imaging
          </div>
        </FadeIn>

        {/* Typewriter headline */}
        <FadeIn delay={100}>
          <h1 style={S.heroTitle}>
            {heroText}
            {!heroDone && <span className="typewriter-cursor" />}
            <br />
            <GradientText text={heroText2} />
            {heroDone && !heroDone2 && <span className="typewriter-cursor" />}
          </h1>
        </FadeIn>

        {/* Description */}
        <FadeIn delay={180}>
          <p style={S.heroDesc}>
            Upload your MRI scan for instant AI-powered tumor detection using{' '}
            <strong style={{ color: 'var(--accent-amber)' }}>ESRGAN</strong> super-resolution and{' '}
            <strong style={{ color: 'var(--accent-lavender)' }}>U-Net++</strong> segmentation.
          </p>
        </FadeIn>

        {/* CTA Buttons */}
        <FadeIn delay={260} style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <PopInButton delay={300} style={S.btnPrimary} onClick={() => setShowUpload(v => !v)}>
            <UploadIcon />
            {showUpload ? 'Hide Upload' : 'Upload MRI Scan'}
          </PopInButton>
          <PopInButton delay={380} style={S.btnSecondary}>
            <PlayIcon />
            View Demo
          </PopInButton>
        </FadeIn>

        {/* Stats row */}
        <FadeIn delay={460} style={{ width: '100%' }}>
          <div style={S.statsRow}>
            {STATS.map((s, i) => (
              <motion.div
                key={i}
                style={S.statPill(s.color, s.bg)}
                whileHover={{ scale: 1.05, boxShadow: `0 0 24px ${s.color}20` }}
              >
                <span style={S.statValue}><CountUp target={s.value} suffix={s.suffix} duration={1.5} /></span>
                <span style={{ fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>{s.label}</span>
              </motion.div>
            ))}
          </div>
        </FadeIn>

        {/* Upload box – reveal on click */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '40px', overflow: 'hidden' }}
            >
              <div style={S.uploadWrapper}>
                <Upload onSuccess={setResult} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scroll indicator */}
      <FadeIn delay={600} style={{ textAlign: 'center', paddingBottom: '40px', color: 'var(--text-muted)' }}>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown />
        </motion.div>
      </FadeIn>

      {/* ── Features ── */}
      <div style={{ paddingBottom: '80px' }}>
        <FadeIn delay={0} style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={S.sectionTitle}>
            Powered by <GradientText text="State-of-the-Art" /> Models
          </h2>
          <p style={S.sectionSub}>Three AI systems working together for accurate MRI analysis.</p>
        </FadeIn>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {FEATURES.map((f, i) => (
            <FloatingCard key={i} delay={i * 120}
              style={S.featureCard(f.color, f.bg)}
            >
              <GlowCard
                glowColor={`${f.color}15`}
                style={{
                  background: 'transparent',
                  borderRadius: '16px',
                  padding: '0',
                }}
              >
                <div style={S.iconBox(f.color, f.bg)}>{f.icon}</div>
                <div style={S.cardBadge(f.color, f.bg)}>{f.badge}</div>
                <h3 style={S.cardTitle}>{f.title}</h3>
                <p style={S.cardDesc}>{f.desc}</p>

                {/* Bottom animated accent line */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1.2, delay: 0.3 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    height: '3px', marginTop: '20px', borderRadius: '999px',
                    background: `linear-gradient(90deg, ${f.color}, transparent)`,
                    opacity: 0.5, transformOrigin: 'left',
                  }}
                />
              </GlowCard>
            </FloatingCard>
          ))}
        </div>
      </div>

      {/* ── Trust strip ── */}
      <FadeIn delay={0}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: '32px', padding: '40px 0 20px',
          borderTop: '1px solid rgba(212,168,83,0.08)',
        }}>
          {[

            { icon: <ZapIcon />,    label: '<2s Processing',   color: '#d4a853' },
            { icon: <FileIcon />,   label: 'PDF + JSON Export', color: '#9b8ec4' },
            { icon: <MicroscopeIcon />, label: 'Gemini Vision AI', color: '#5ea8a8' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.3, duration: 0.5 }}
              whileHover={{ y: -4, scale: 1.05 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                color: item.color, fontSize: '14px', fontWeight: '600',
                cursor: 'default',
              }}
            >
              {item.icon}
              {item.label}
            </motion.div>
          ))}
        </div>
      </FadeIn>
    </div>
  );
};

export default Home;
