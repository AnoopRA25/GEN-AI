import React, { useEffect, useRef, useCallback } from 'react';
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
      initial={{ opacity: 0, y: 28 }}
      animate={controls}
      transition={{ duration, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
};

// ─── GradientText: warm amber → copper → teal gradient ───────────────────────
export const GradientText = ({ text, className = '' }) => {
  return (
    <span
      className={className}
      style={{
        background: 'linear-gradient(135deg, #d4a853 0%, #c07850 45%, #5ea8a8 100%)',
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

// ─── PopInButton: elastic pop-in with magnetic cursor effect ─────────────────
export const PopInButton = ({ children, delay = 0, style = {}, className = '', onClick, type }) => {
  const btnRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * 0.12;
    const dy = (e.clientY - cy) * 0.12;
    btn.style.transform = `translate(${dx}px, ${dy}px) scale(1.03)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const btn = btnRef.current;
    if (btn) btn.style.transform = 'translate(0, 0) scale(1)';
  }, []);

  return (
    <motion.button
      ref={btnRef}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: delay / 1000,
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
      whileTap={{ scale: 0.97 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...style, transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1)' }}
      className={`magnetic-btn ${className}`}
      onClick={onClick}
      type={type}
    >
      {children}
    </motion.button>
  );
};

// ─── FloatingCard: 3D tilt card with perspective transforms ──────────────────
export const FloatingCard = ({ children, delay = 0, style = {}, className = '' }) => {
  const cardRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (card) card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.15s ease-out, box-shadow 0.3s ease',
        willChange: 'transform',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── GlowCard: card with ambient radial glow following mouse ─────────────────
export const GlowCard = ({ children, glowColor = 'rgba(212,168,83,0.10)', style = {}, className = '' }) => {
  const cardRef = useRef(null);
  const glowRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    glow.style.left = `${x}px`;
    glow.style.top = `${y}px`;
    glow.style.opacity = '1';
  }, []);

  const handleMouseLeave = useCallback(() => {
    const glow = glowRef.current;
    if (glow) glow.style.opacity = '0';
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
          opacity: 0,
          transition: 'opacity 0.4s ease',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};

// ─── ParticleNetwork: neural network background ──────────────────────────────
export const ParticleNetwork = () => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    const PARTICLE_COUNT = 45;
    const MAX_DIST = 160;
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 2 + 1,
        color: ['#d4a853', '#c07850', '#5ea8a8', '#9b8ec4', '#7cb893'][Math.floor(Math.random() * 5)],
      });
    }
    particlesRef.current = particles;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Update and draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.5;
        ctx.fill();
      }

      // Draw connections
      ctx.globalAlpha = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(212, 168, 83, ${0.06 * (1 - dist / MAX_DIST)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" />;
};

// ─── MorphingBackground: organic blob background ─────────────────────────────
export const GridBackground = ({ children }) => {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
      {/* Particle network */}
      <ParticleNetwork />

      {/* Morphing gradient blobs */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
      }}>
        {/* Top-right warm blob */}
        <motion.div
          animate={{ x: [0, 35, 0], y: [0, -25, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '-140px', right: '-120px',
            width: '560px', height: '560px',
            background: 'radial-gradient(circle, rgba(212,168,83,0.08) 0%, transparent 70%)',
            animation: 'morphBlob 18s ease-in-out infinite',
          }}
        />
        {/* Bottom-left sage blob */}
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, 35, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          style={{
            position: 'absolute', bottom: '-120px', left: '-100px',
            width: '480px', height: '480px',
            background: 'radial-gradient(circle, rgba(124,184,147,0.06) 0%, transparent 70%)',
            animation: 'morphBlob 22s ease-in-out infinite reverse',
          }}
        />
        {/* Center copper blob */}
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          style={{
            position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%,-50%)',
            width: '650px', height: '320px',
            background: 'radial-gradient(ellipse, rgba(192,120,80,0.04) 0%, transparent 70%)',
            animation: 'morphBlob 15s ease-in-out infinite',
          }}
        />
        {/* Subtle lavender accent blob */}
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
          style={{
            position: 'absolute', top: '20%', right: '25%',
            width: '300px', height: '300px',
            background: 'radial-gradient(circle, rgba(155,142,196,0.05) 0%, transparent 70%)',
            animation: 'morphBlob 20s ease-in-out infinite',
          }}
        />

        {/* Subtle organic mesh lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(212,168,83,0.015) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(124,184,147,0.015) 0%, transparent 50%),
            radial-gradient(circle at 50% 80%, rgba(192,120,80,0.012) 0%, transparent 50%)
          `,
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};

// ─── DNA Helix Loader ────────────────────────────────────────────────────────
export const DNALoader = () => {
  return (
    <div className="dna-loader" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} className="strand" style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          marginLeft: '-4px',
          marginTop: '-4px',
        }} />
      ))}
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
