import { useState } from 'react'

export default function OrderCode({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false)
  const [message, setMessage] = useState('')
  async function copy() {
    try { await navigator.clipboard.writeText(value); setMessage('Copied') }
    catch { setMessage('Unable to copy. Select the revealed code to copy it manually.') }
  }
  const eye = revealed
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A11.7 11.7 0 0 1 12 5c5.3 0 9 7 9 7a18.3 18.3 0 0 1-3.1 3.8M6.1 6.1C3.9 7.8 3 12 3 12s3.7 7 9 7a10.8 10.8 0 0 0 3-.4" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.7-7 9-7 9 7 9 7-3.7 7-9 7-9-7-9-7Z" /><circle cx="12" cy="12" r="2.5" /></svg>
  return <div className="order-code">
    {revealed ? <code>{value}</code> : <span>Code hidden</span>}
    <button className="order-code-toggle" type="button" aria-label={revealed ? 'Hide code' : 'Reveal code'} title={revealed ? 'Hide code' : 'Reveal code'} aria-expanded={revealed} onClick={() => { setRevealed(!revealed); setMessage('') }}>{eye}</button>
    {revealed && <button type="button" onClick={() => void copy()}>Copy</button>}
    <span role="status">{message}</span>
  </div>
}
