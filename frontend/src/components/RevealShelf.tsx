import type { ReactNode } from 'react'
import useScrollReveal from '../useScrollReveal'

export default function RevealShelf({ id, active, children }: { id: string; active: boolean; children: ReactNode }) {
  const { ref, revealed } = useScrollReveal(active)
  return <section ref={ref} className={`home-shelf scroll-reveal${revealed ? ' is-revealed' : ''}`} aria-labelledby={`${id}-title`}>{children}</section>
}
