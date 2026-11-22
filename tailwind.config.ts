import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: 'var(--c-navy)',
        indigo: 'var(--c-indigo)',
        lavender: 'var(--c-lavender)',
        cream: 'var(--c-cream)',
        pink: 'var(--c-pink)',
        orange: 'var(--c-orange)',
        blue: 'var(--c-blue)',
        danger: 'var(--c-danger)',
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
