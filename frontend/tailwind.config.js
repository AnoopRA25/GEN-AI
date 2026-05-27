/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Keep legacy aliases so any remaining tailwind class refs work */
        'bg-primary':    'var(--bg-primary)',
        'neon-cyan':     '#3b82f6',
        'neon-blue':     '#6366f1',
        'neon-green':    '#22c55e',
        'neon-red':      '#ef4444',
        'neon-orange':   '#f97316',
        'card-bg':       'var(--bg-card)',
        'border-subtle': 'var(--border-color)',
        'accent-indigo': '#6366f1',
        'accent-blue':   '#3b82f6',
        'accent-teal':   '#14b8a6',
        'accent-green':  '#22c55e',
        'accent-red':    '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
