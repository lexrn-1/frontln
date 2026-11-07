/** @type {import('tailwindcss').Config} */
module.exports = {
  future: { hoverOnlyWhenSupported: true },
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-dark': 'var(--color-primary-dark)',
        'primary-soft': 'var(--color-primary-soft)',
        accent: 'var(--color-accent)',
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        'surface-raised': 'var(--color-surface-raised)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        skeleton: 'var(--color-skeleton)',
        danger: 'var(--color-danger)',
        'danger-soft': 'var(--color-danger-soft)',
        success: 'var(--color-success)',
        'success-soft': 'var(--color-success-soft)',
        warning: 'var(--color-warning)',
        'warning-soft': 'var(--color-warning-soft)',
        'danger-warm': 'var(--color-danger-warm)',
        'success-muted': 'var(--color-success-muted)',
        'warning-warm': 'var(--color-warning-warm)',
        'glow-soft': 'var(--color-glow-soft)',
        'tile-peach': 'var(--color-tile-peach)',
        'tile-mint': 'var(--color-tile-mint)',
        'tile-sky': 'var(--color-tile-sky)',
        'tile-rose': 'var(--color-tile-rose)',
        lavender: 'var(--color-lavender)',
        'lavender-soft': 'var(--color-lavender-soft)'
      },
      fontFamily: {
        sans: ['"DM Sans"', 'Inter', 'sans-serif'],
        display: ['Manrope', '"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        modal: '0 24px 70px rgb(60 40 30 / 18%)',
        soft: 'var(--shadow-soft)',
        raised: 'var(--shadow-raised)',
        inset: 'var(--shadow-inset)',
        primary: 'var(--shadow-primary)',
        pressed: 'var(--shadow-pressed)',
        lavender: 'var(--shadow-lavender)',
        'glow-soft': 'var(--shadow-glow-soft)'
      }
    }
  },
  plugins: []
};
