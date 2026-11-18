import { useEffect, useState, type ReactNode } from 'react'
import { connect } from './connection'

export default function ConnectionGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    connect().then(() => { if (active) setState('ready') }, () => { if (active) setState('error') })
    return () => { active = false }
  }, [attempt])
  if (state === 'ready') return children
  return <main style={{ padding: '3rem', textAlign: 'center' }}>
    {state === 'loading' ? <p role="status">Connecting to marketplace server...</p> : <div role="alert">
      <p>The marketplace server is unavailable. Please try again.</p>
      <button onClick={() => { setState('loading'); setAttempt(value => value + 1) }}>Retry</button>
    </div>}
  </main>
}
