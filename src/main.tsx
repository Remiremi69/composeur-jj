import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
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
