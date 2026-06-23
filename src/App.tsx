import { Routes, Route } from 'react-router-dom'
import AccueilPage from './routes/AccueilPage'
import ComposerPage from './routes/ComposerPage'
import RecapPage from './routes/RecapPage'
import ConfirmationPage from './routes/ConfirmationPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AccueilPage />} />
      <Route path="/composer" element={<ComposerPage />} />
      <Route path="/recap" element={<RecapPage />} />
      <Route path="/confirmation" element={<ConfirmationPage />} />
    </Routes>
  )
}
