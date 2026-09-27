import { Routes, Route, useLocation } from 'react-router-dom'
import AccueilPage from './routes/AccueilPage'
import FormulePage from './routes/FormulePage'
import ComposerPage, { ComposerEntry } from './routes/ComposerPage'
import OptionsPage from './routes/OptionsPage'
import RecapPage from './routes/RecapPage'
import ConfirmationPage from './routes/ConfirmationPage'
import AdminPage from './routes/AdminPage'
import ResumePage from './routes/ResumePage'
import MenuPage from './routes/MenuPage'
import UnsubscribePage from './routes/UnsubscribePage'
import BrandHeader from './components/BrandHeader'
import CatalogGuard from './components/CatalogGuard'

export default function App() {
  // L'en-tête de marque est affiché sur toutes les pages publiques
  // (pas sur le back-office).
  const isAdmin = useLocation().pathname.startsWith('/admin')
  return (
    <div className="flex min-h-screen flex-col">
      {/* Retire les plats / options qui ne sont plus proposés (et le signale). */}
      <CatalogGuard />
      {!isAdmin && <BrandHeader />}
      <div className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<AccueilPage />} />
          <Route path="/formule" element={<FormulePage />} />
          {/* Une route par écran : le bouton retour du navigateur revient à
              l'étape précédente, un rafraîchissement garde l'étape. */}
          <Route path="/composer" element={<ComposerEntry />} />
          <Route path="/composer/:slug" element={<ComposerPage />} />
          <Route path="/options" element={<OptionsPage />} />
          <Route path="/recap" element={<RecapPage />} />
          <Route path="/confirmation" element={<ConfirmationPage />} />
          <Route path="/reprendre/:token" element={<ResumePage />} />
          <Route path="/menu/:token" element={<MenuPage />} />
          <Route path="/desinscription/:token" element={<UnsubscribePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </div>
  )
}
