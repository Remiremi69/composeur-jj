/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Tout le thème pointe vers des variables CSS (cf. src/index.css).
      // Pour rhabiller l'app pour un autre traiteur : on ne touche QUE ces variables,
      // jamais le code des composants.
      colors: {
        cream: 'var(--color-cream)',
        surface: 'var(--color-surface)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        accent: 'var(--color-accent)',
        'accent-dark': 'var(--color-accent-dark)',
        line: 'var(--color-line)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
      },
    },
  },
  plugins: [],
}
