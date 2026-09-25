import { Routes, Route } from 'react-router-dom'
import AccueilPage from './routes/AccueilPage'
import FormulePage from './routes/FormulePage'
import ComposerPage from './routes/ComposerPage'
import OptionsPage from './routes/OptionsPage'
import RecapPage from './routes/RecapPage'
import ConfirmationPage from './routes/ConfirmationPage'
import AdminPage from './routes/AdminPage'
import ResumePage from './routes/ResumePage'
import MenuPage from './routes/MenuPage'
import UnsubscribePage from './routes/UnsubscribePage'
import CatalogGuard from './components/CatalogGuard'

export default function App() {
  return (
    <>
      {/* Retire les plats / options qui ne sont plus proposés (et le signale). */}
      <CatalogGuard />
      <Routes>
        <Route path="/" element={<AccueilPage />} />
        <Route path="/formule" element={<FormulePage />} />
        <Route path="/composer" element={<ComposerPage />} />
        <Route path="/options" element={<OptionsPage />} />
        <Route path="/recap" element={<RecapPage />} />
        <Route path="/confirmation" element={<ConfirmationPage />} />
        <Route path="/reprendre/:token" element={<ResumePage />} />
        <Route path="/menu/:token" element={<MenuPage />} />
        <Route path="/desinscription/:token" element={<UnsubscribePage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </>
  )
}
