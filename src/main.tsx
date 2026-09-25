import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { CompositionProvider } from './context/CompositionContext'
import { captureAttribution } from './lib/attribution'

// Provenance (?source=, utm_*) lue à la première arrivée sur le site.
captureAttribution()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CompositionProvider>
        <App />
      </CompositionProvider>
    </BrowserRouter>
  </StrictMode>,
)
