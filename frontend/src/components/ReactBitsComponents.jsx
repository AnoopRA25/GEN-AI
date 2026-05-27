import React, { useEffect, useRef } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';

// ─── FadeIn: staggered reveal on mount ───────────────────────────────────────
export const FadeIn = ({ children, delay = 0, duration = 0.7, className = '', style = {} }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start({ opacity: 1, y: 0 });
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={controls}
      transition={{ duration, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
};

// ─── GradientText: animated gradient heading ──────────────────────────────────
export const GradientText = ({ text, className = '' }) => {
  return (
    <span
      className={className}
      style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 50%, #06b6d4 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        display: 'inline-block',
      }}
    >
      {text}
    </span>
  );
};

// ─── PopInButton: elastic pop-in on mount ────────────────────────────────────
export const PopInButton = ({ children, delay = 0, style = {}, className = '', onClick, type }) => {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: delay / 1000,
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.97 }}
      style={style}
      className={className}
      onClick={onClick}
      type={type}
    >
      {children}
    </motion.button>
  );
};

// ─── FloatingCard: card with hover lift + shimmer border ─────────────────────
export const FloatingCard = ({ children, delay = 0, style = {}, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, boxShadow: '0 24px 48px rgba(37,99,235,0.15)' }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── GridBackground: animated dot grid ───────────────────────────────────────
export const GridBackground = ({ children }) => {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
      {/* Animated gradient orbs */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
      }}>
        {/* Top-right orb */}
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '-120px', right: '-100px',
            width: '520px', height: '520px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
          }}
        />
        {/* Bottom-left orb */}
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{
            position: 'absolute', bottom: '-100px', left: '-80px',
            width: '440px', height: '440px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)',
          }}
        />
        {/* Center orb */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          style={{
            position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
            width: '600px', height: '300px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(14,165,233,0.06) 0%, transparent 70%)',
          }}
        />
        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};

// ─── CountUp: animated number counter ────────────────────────────────────────
export const CountUp = ({ target, suffix = '', duration = 1.5 }) => {
  const [count, setCount] = React.useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = parseFloat(target);
    const increment = end / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.round(start * 10) / 10);
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};
