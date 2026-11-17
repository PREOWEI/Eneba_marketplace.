import { useEffect, useRef, useState } from 'react'

export default function useScrollReveal(active: boolean) {
  const ref = useRef<HTMLElement>(null)
  const [revealed, setRevealed] = useState(false)
  const supported = typeof IntersectionObserver !== 'undefined'
  useEffect(() => {
    const element = ref.current
    if (!active || revealed || !supported || !element) return
    let cancelled = false
    const observer = new IntersectionObserver(entries => {
      if (!cancelled && entries.some(entry => entry.isIntersecting) && !element.closest('.home-disclosure.is-closed')) {
        setRevealed(true)
        observer.disconnect()
      }
    }, { threshold: 0.08 })
    observer.observe(element)
    return () => { cancelled = true; observer.disconnect() }
  }, [active, revealed, supported])
  return { ref, revealed: revealed || !supported }
}
