import { Routes, Route } from 'react-router-dom'
import AccueilPage from './routes/AccueilPage'
import FormulePage from './routes/FormulePage'
import ComposerPage from './routes/ComposerPage'
import OptionsPage from './routes/OptionsPage'
import RecapPage from './routes/RecapPage'
import ConfirmationPage from './routes/ConfirmationPage'
import AdminPage from './routes/AdminPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AccueilPage />} />
      <Route path="/formule" element={<FormulePage />} />
      <Route path="/composer" element={<ComposerPage />} />
      <Route path="/options" element={<OptionsPage />} />
      <Route path="/recap" element={<RecapPage />} />
      <Route path="/confirmation" element={<ConfirmationPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}
