import { motion } from 'framer-motion'
import type { RuleStatus } from '../lib/rules'

// Compteur de règle bienveillant : libellé + jauge animée.
export default function RuleCounter({ status }: { status: RuleStatus }) {
  const showGauge = status.target != null && status.target > 0
  const ratio = showGauge ? Math.min(status.current / (status.target as number), 1) : 0

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-ink">{status.label}</span>
        {status.satisfied && <span className="text-sm text-accent">✓</span>}
      </div>

      {showGauge && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={false}
            animate={{ width: `${ratio * 100}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          />
        </div>
      )}
    </div>
  )
}
