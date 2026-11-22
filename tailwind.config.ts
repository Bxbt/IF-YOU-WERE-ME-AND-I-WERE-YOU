import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
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
    },
  },
  plugins: [],
} satisfies Config;
