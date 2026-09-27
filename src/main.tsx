import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
// Polices de la charte, auto-hébergées (aucun appel à Google Fonts).
import '@fontsource/playfair-display/400.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/playfair-display/400-italic.css'
import '@fontsource/lato/400.css'
import '@fontsource/lato/700.css'
import '@fontsource/lato/400-italic.css'
import './index.css'
import App from './App.tsx'
import { CatalogProvider } from './context/CatalogContext'
import { CompositionProvider } from './context/CompositionContext'
import { captureAttribution } from './lib/attribution'

// Provenance (?source=, utm_*) lue à la première arrivée sur le site.
captureAttribution()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Respecte le réglage « réduire les animations » du système. */}
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <CatalogProvider>
          <CompositionProvider>
            <App />
          </CompositionProvider>
        </CatalogProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
)
