import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useComposition } from '../context/CompositionContext'

export default function AccueilPage() {
  const navigate = useNavigate()
  const { couple, setCouple } = useComposition()

  const [coupleNames, setCoupleNames] = useState(couple?.coupleNames ?? '')
  const [weddingDate, setWeddingDate] = useState(couple?.weddingDate ?? '')
  const [guestCount, setGuestCount] = useState(
    couple?.guestCount ? String(couple.guestCount) : '',
  )
  const [email, setEmail] = useState(couple?.email ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const guests = parseInt(guestCount, 10)

    if (!coupleNames.trim()) return setError('Indiquez vos prénoms.')
    if (!email.includes('@')) return setError('Indiquez un email valide.')
    if (!Number.isFinite(guests) || guests < 1) {
      return setError('Indiquez le nombre de convives.')
    }

    setCouple({
      coupleNames: coupleNames.trim(),
      email: email.trim(),
      weddingDate,
      guestCount: guests,
    })
    navigate('/composer')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-sm uppercase tracking-[0.2em] text-accent">J&amp;J Traiteur</p>
        <h1 className="mt-3 text-4xl leading-tight text-ink">
          Composez le menu de votre mariage
        </h1>
        <p className="mt-3 text-muted">
          Quelques instants à deux pour imaginer votre repas. Commençons par faire
          connaissance.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <Field label="Vos prénoms">
            <input
              type="text"
              value={coupleNames}
              onChange={(e) => setCoupleNames(e.target.value)}
              placeholder="Camille & Alex"
              className="input"
            />
          </Field>

          <Field label="Date du mariage">
            <input
              type="date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Nombre de convives">
            <input
              type="number"
              min={1}
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              placeholder="120"
              className="input"
            />
          </Field>

          <Field label="Votre email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              className="input"
            />
          </Field>

          {error && <p className="text-sm text-accent">{error}</p>}

          <button
            type="submit"
            className="mt-2 rounded-full bg-accent px-6 py-3.5 font-semibold text-cream transition-colors hover:bg-accent-dark"
          >
            Composer notre menu
          </button>
        </form>
      </motion.div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  )
}
