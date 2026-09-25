// Squelettes de chargement : cartes grisées animées, de la même forme que
// le contenu attendu (la pulsation s'arrête si l'utilisateur réduit les
// animations, cf. .skeleton dans index.css).
import type { ReactNode } from 'react'

function Line({ className = '' }: { className?: string }) {
  return <div className={`skeleton h-4 ${className}`} />
}

function Wrapper({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

// Page des formules : 3 cartes.
export function FormulesSkeleton() {
  return (
    <Wrapper label="Chargement des formules…">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <Line className="mx-auto h-3 w-20" />
        <Line className="mx-auto mt-3 h-8 w-72" />
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-6">
              <Line className="mx-auto h-7 w-32" />
              <Line className="mx-auto w-48" />
              <div className="my-3 h-px bg-line" />
              {[0, 1, 2, 3, 4, 5].map((j) => (
                <Line key={j} className="mx-auto w-40" />
              ))}
              <div className="skeleton mt-4 h-11 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </Wrapper>
  )
}

// Écran de composition : titre + grille de cartes de plats.
export function ScreenSkeleton() {
  return (
    <Wrapper label="Chargement du catalogue…">
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-7 w-20 rounded-full" />
          ))}
        </div>
        <Line className="mt-6 h-8 w-64" />
        <Line className="mt-2 w-80" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="overflow-hidden rounded-card bg-surface">
              <div className="skeleton aspect-[4/3] rounded-none" />
              <div className="flex flex-col gap-2 p-3">
                <Line className="w-3/4" />
                <Line className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Wrapper>
  )
}

// Liste d'options.
export function ListSkeleton() {
  return (
    <Wrapper label="Chargement des options…">
      <div className="mx-auto max-w-2xl px-5 pt-10">
        <Line className="h-8 w-48" />
        <div className="mt-8 flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 rounded-card border border-line bg-surface p-4">
              <div className="skeleton h-5 w-5 rounded-md" />
              <div className="flex flex-1 flex-col gap-2">
                <Line className="w-1/2" />
                <Line className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Wrapper>
  )
}

// Menu (récap, page menu) : en-tête + sections centrées.
export function MenuSkeleton() {
  return (
    <Wrapper label="Chargement du menu…">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Line className="mx-auto h-3 w-24" />
        <Line className="mx-auto mt-3 h-9 w-56" />
        <Line className="mx-auto mt-3 w-40" />
        <div className="mt-10 flex flex-col gap-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Line className="h-3 w-28" />
              <Line className="h-5 w-64" />
              <Line className="h-3 w-48" />
            </div>
          ))}
        </div>
      </div>
    </Wrapper>
  )
}
