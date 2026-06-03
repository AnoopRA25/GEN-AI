import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X, Eye, ChevronLeft, ChevronRight, Tag } from 'lucide-react';

const TABS = [
  { id: 'original', label: 'Original',    key: 'original_b64', color: '#8a8378', desc: 'Raw MRI scan as uploaded.' },
  { id: 'enhanced', label: 'ESRGAN',       key: 'enhanced_b64', color: '#d4a853', desc: 'Super-resolution enhanced image.' },
  { id: 'mask',     label: 'Mask',         key: 'mask_b64',     color: '#7cb893', desc: 'Binary tumor segmentation mask.' },
  { id: 'bbox',     label: 'Bounding Box', key: 'bbox_b64',     color: '#c07850', desc: 'Detected tumor region outlined.' },
  { id: 'overlay',  label: 'Overlay',      key: 'overlay_b64',  color: '#d96b6b', desc: 'Mask overlaid on enhanced image.' },
];

const OverlayViewer = ({ data }) => {
  const [active, setActive]         = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [imgError, setImgError]     = useState(false);

  const tab = TABS[active];
  const src = data[tab.key];

  const goTo = (idx) => { setImgError(false); setActive(idx); };
  const prev  = () => goTo((active - 1 + TABS.length) % TABS.length);
  const next  = () => goTo((active + 1) % TABS.length);

  return (
    <>
      {/* ── Inline Viewer Card ── */}
      <div className="glass-card overflow-hidden flex flex-col" style={{ minHeight: 420 }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
             style={{ borderColor: 'var(--border-color)', background: 'rgba(0,0,0,0.12)' }}>
          <div className="flex items-center gap-2">
            <Eye size={13} style={{ color: 'var(--accent-amber)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>
              Image Viewer
            </span>
            {/* current tab label pill — top bar, NOT on the image */}
            <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-md"
                  style={{ background: tab.color + '22', color: tab.color, border: `1px solid ${tab.color}44` }}>
              {tab.label}
            </span>
          </div>
          <button onClick={() => setFullscreen(true)}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }} title="Open fullscreen">
            <Maximize2 size={13} />
          </button>
        </div>

        {/* ── Image display — fills available height, image stretches to fit ── */}
        <div className="relative flex-1"
             style={{ background: '#080a10', minHeight: 300 }}>

          <AnimatePresence mode="wait">
            {src && !imgError ? (
              <motion.img
                key={active}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                src={src}
                alt={tab.label}
                onError={() => setImgError(true)}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  position: 'absolute',
                  inset: 0,
                }}
              />
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              >
                <Eye size={40} style={{ color: 'var(--text-muted)', opacity: 0.25 }} />
                <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                  {imgError ? 'Image failed to load' : 'No image data'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nav arrows — only visible, nothing else inside the image area */}
          <button onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg
                       flex items-center justify-center transition-opacity hover:opacity-100 opacity-60 z-10"
            style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(212,168,83,0.10)' }}>
            <ChevronLeft size={16} color="#ede8e0" />
          </button>
          <button onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg
                       flex items-center justify-center transition-opacity hover:opacity-100 opacity-60 z-10"
            style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(212,168,83,0.10)' }}>
            <ChevronRight size={16} color="#ede8e0" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="px-3 py-2.5 border-t flex gap-1.5 flex-wrap flex-shrink-0"
             style={{ borderColor: 'var(--border-color)', background: 'rgba(0,0,0,0.08)' }}>
          {TABS.map((t, i) => (
            <button key={t.id} onClick={() => goTo(i)}
              className="img-tab"
              style={active === i
                ? { borderColor: t.color + '70', color: t.color, background: t.color + '1a' }
                : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Description row */}
        <div className="px-4 py-2 border-t text-xs font-mono flex-shrink-0"
             style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
          <Tag size={10} className="inline mr-1.5" style={{ color: tab.color }} />
          {tab.desc}
        </div>
      </div>

      {/* ── Fullscreen Modal ── */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col"
            style={{ background: 'rgba(5,8,16,0.98)', backdropFilter: 'blur(24px)' }}
          >
            {/* Fullscreen header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
                 style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {tab.label}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{ background: tab.color + '22', color: tab.color }}>
                  {tab.desc}
                </span>
              </div>
              <button onClick={() => setFullscreen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Fullscreen image */}
            <div className="flex-1 relative">
              <button onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-xl
                           flex items-center justify-center hover:bg-white/10 transition-colors"
                style={{ border: '1px solid rgba(212,168,83,0.10)', background: 'rgba(0,0,0,0.6)' }}>
                <ChevronLeft size={20} color="#ede8e0" />
              </button>

              {src && !imgError ? (
                <motion.img
                  key={`fs-${active}`}
                  src={src}
                  alt={tab.label}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onError={() => setImgError(true)}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    position: 'absolute',
                    inset: 0,
                    padding: '24px',
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Eye size={56} style={{ color: 'var(--text-muted)', opacity: 0.25 }} />
                  <p style={{ color: 'var(--text-muted)' }}>Image unavailable</p>
                </div>
              )}

              <button onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-xl
                           flex items-center justify-center hover:bg-white/10 transition-colors"
                style={{ border: '1px solid rgba(212,168,83,0.10)', background: 'rgba(0,0,0,0.6)' }}>
                <ChevronRight size={20} color="#ede8e0" />
              </button>
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-3 justify-center px-6 py-4 border-t flex-shrink-0"
                 style={{ borderColor: 'var(--border-color)', background: 'rgba(0,0,0,0.4)' }}>
              {TABS.map((t, i) => (
                <button key={t.id} onClick={() => goTo(i)}
                  className="rounded-lg overflow-hidden transition-all flex-shrink-0"
                  style={{
                    outline: active === i ? `2px solid ${t.color}` : '2px solid transparent',
                    outlineOffset: 2,
                    opacity: active === i ? 1 : 0.5,
                  }}>
                  <img src={data[t.key]} alt={t.label}
                       className="w-20 h-14 object-cover block" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OverlayViewer;
