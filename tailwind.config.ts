import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Phone in landscape (docs/06 §1.4): scene left 60%, dialogue right 40%.
      screens: { short: { raw: '(max-height: 479px) and (orientation: landscape)' } },
      colors: {
        navy: 'rgb(var(--c-navy) / <alpha-value>)',
        indigo: 'rgb(var(--c-indigo) / <alpha-value>)',
        lavender: 'rgb(var(--c-lavender) / <alpha-value>)',
        cream: 'rgb(var(--c-cream) / <alpha-value>)',
        pink: 'rgb(var(--c-pink) / <alpha-value>)',
        orange: 'rgb(var(--c-orange) / <alpha-value>)',
        blue: 'rgb(var(--c-blue) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
      },
      fontFamily: {
        pixel: ['Silkscreen', 'monospace'],
        thai: ['"IBM Plex Sans Thai"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { panel: '16px', btn: '12px' },
      keyframes: {
        'scene-shake': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '20%': { transform: 'translate(-3px, 1px)' },
          '40%': { transform: 'translate(3px, -1px)' },
          '60%': { transform: 'translate(-2px, 0)' },
          '80%': { transform: 'translate(2px, 1px)' },
        },
      },
      animation: { 'scene-shake': 'scene-shake 0.4s steps(5) 1' },
    },
  },
  plugins: [],
} satisfies Config;
