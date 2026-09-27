/** @type {import('tailwindcss').Config} */

// Couleur de la charte : composantes oklch définies dans src/index.css.
// Le format oklch(var(--x) / <alpha-value>) fait fonctionner les
// modificateurs d'opacité (bg-fond/95, border-error/40…).
const c = (name) => `oklch(var(--color-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Tout le thème pointe vers des variables CSS (cf. src/index.css).
      // Pour rhabiller l'app : on ne touche QUE ces variables, jamais le code
      // des composants.
      colors: {
        slate: c('slate'), // ardoise : boutons, titres
        'slate-deep': c('slate-deep'), // survol des boutons
        lin: c('lin'), // texte des boutons, filets, bordures
        'lin-light': c('lin-light'), // fond général
        ink: c('ink'), // texte
        bronze: c('bronze'), // accent décoratif — jamais du texte sur fond clair
        fond: c('fond'), // cartes, panneaux
        muted: c('slate'), // texte secondaire (= ardoise)
        error: c('error'),
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
