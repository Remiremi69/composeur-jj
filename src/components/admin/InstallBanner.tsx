import { useState } from 'react'

const KEY = 'jj-admin:installation-comprise'

function alreadyUnderstood(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

// Déjà ouvert depuis l'icône de l'écran d'accueil : inutile d'expliquer.
function isInstalled(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// Bandeau discret, après la connexion : comment ajouter l'espace à l'écran
// d'accueil. « Compris » le fait disparaître sur cet appareil.
export default function InstallBanner() {
  const [hidden, setHidden] = useState(() => alreadyUnderstood() || isInstalled())
  if (hidden) return null

  function close() {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // stockage indisponible : le bandeau reviendra, sans conséquence
    }
    setHidden(true)
  }

  return (
    <div className="border-b border-lin bg-lin-light" role="note">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3 text-base text-ink">
        <p className="flex-1">
          Sur iPhone : touchez Partager, puis « Sur l’écran d’accueil ».
          <br />
          Sur Android : touchez le menu ⋮, puis « Installer l’application ».
        </p>
        <button type="button" onClick={close} className="min-h-11 shrink-0 rounded-card bg-slate px-4 font-bold text-lin">
          Compris
        </button>
      </div>
    </div>
  )
}
