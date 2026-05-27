import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudUpload, Image as ImageIcon, X, Loader2, AlertCircle, CheckCircle2, FileImage } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const STEPS = [
  'Reading MRI image…',
  'Running ESRGAN super-resolution…',
  'Segmenting with U-Net++…',
  'Detecting bounding boxes…',
  'Computing confidence metrics…',
  'Generating clinical insight…',
];

const Upload = ({ onSuccess }) => {
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const inputRef = useRef(null);
  const stepTimer = useRef(null);

  /* ── Drag handlers ───────────────── */
  const onDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setDrag(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, []);

  /* ── File selection ──────────────── */
  const handleFile = (f) => {
    if (!f.type.startsWith('image/')) {
      toast.error('Please upload a valid image file.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clear = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  /* ── Process image ───────────────── */
  const analyse = async () => {
    if (!file) return;
    setLoading(true);
    setStep(0);

    // Step cycling animation
    let s = 0;
    stepTimer.current = setInterval(() => {
      s = Math.min(s + 1, STEPS.length - 1);
      setStep(s);
    }, 900);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const { data } = await axios.post('http://127.0.0.1:8000/predict', fd);
      clearInterval(stepTimer.current);
      toast.success('Analysis complete!');
      onSuccess(data);
    } catch (err) {
      clearInterval(stepTimer.current);
      toast.error(err.response?.data?.detail || 'Backend unreachable. Start the server and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!preview ? (
          /* ── Drop Zone ──── */
          <motion.div key="drop"
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className={`upload-zone p-14 flex flex-col items-center justify-center text-center ${drag ? 'drag-active' : ''}`}
            onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

            <motion.div animate={drag ? { scale: 1.15 } : { scale: 1 }} transition={{ type:'spring', stiffness:300 }}
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(99,102,241,0.09)', border: '1px solid rgba(99,102,241,0.28)', color: 'var(--accent-indigo)' }}
            >
              <CloudUpload size={36} />
            </motion.div>

            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Drag &amp; drop MRI scan here</h3>
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>or click anywhere in this zone to browse your files</p>

            <div className="flex items-center gap-6 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {['JPEG', 'PNG', 'BMP', 'TIFF'].map(f => (
                <span key={f} className="flex items-center gap-1.5">
                  <FileImage size={12} style={{ color: 'var(--text-muted)' }} /> {f}
                </span>
              ))}
            </div>
          </motion.div>

        ) : (
          /* ── Preview + Analyse ──── */
          <motion.div key="preview"
            initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
            className="glass-card overflow-hidden"
          >
            {/* Image */}
            <div className="relative bg-black/40" style={{ maxHeight: 340 }}>
              <img src={preview} alt="MRI Preview" className="w-full h-auto object-contain" style={{ maxHeight: 340 }} />

              {/* Scan overlay while loading */}
              {loading && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center scan-effect">
                  <div className="loader-ring mb-5" />
                  <AnimatePresence mode="wait">
                    <motion.p key={step}
                      initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
                      className="text-sm font-mono" style={{ color: 'var(--accent-indigo)' }}
                    >
                      {STEPS[step]}
                    </motion.p>
                  </AnimatePresence>
                  <div className="mt-4 flex gap-1.5">
                    {STEPS.map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                        style={{ background: i <= step ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.18)' }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Remove button */}
              {!loading && (
                <button onClick={clear}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <X size={14} className="text-slate-300" />
                </button>
              )}
            </div>

            {/* File info + actions */}
            <div className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(99,102,241,0.09)', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <ImageIcon size={16} style={{ color: 'var(--accent-indigo)' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{file?.name}</p>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{(file?.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>

              <div className="flex gap-3 flex-shrink-0">
                <button onClick={clear} disabled={loading} className="btn-secondary text-sm px-4 py-2.5">
                  Cancel
                </button>
                <button onClick={analyse} disabled={loading} className="btn-primary text-sm px-6 py-2.5 flex items-center gap-2">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {loading ? 'Analysing…' : 'Analyse MRI'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!preview && (
        <p className="mt-4 text-center text-xs font-mono flex items-center justify-center gap-1.5"
           style={{ color: 'var(--text-muted)' }}>
          <AlertCircle size={11} /> Scans are processed locally. No data is sent to external servers.
        </p>
      )}
    </div>
  );
};

export default Upload;
