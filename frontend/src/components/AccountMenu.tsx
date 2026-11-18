import { useEffect } from 'react'
import { useRef } from 'react'
import { useState } from 'react'
import type { User } from '../marketplace'

export default function AccountMenu({ user, onNavigate, onLogout }: { user: User | null; onNavigate: (path: string) => void; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  const link = (path: string, text: string) => <a href={path} onClick={event => { event.preventDefault(); setOpen(false); onNavigate(path) }}>{text}</a>
  return <div className="account-menu" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <button ref={trigger} type="button" className="account-menu-trigger" aria-label="Account" aria-expanded={open} aria-controls="account-dropdown" onClick={() => setOpen(value => !value)}>
      <svg className="header-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>
    </button>
    {open && <div id="account-dropdown" className="account-dropdown">{user ? <>
      {link('/account', 'My Account')}{link('/orders', 'Order History')}
      <button type="button" onClick={() => { setOpen(false); onLogout() }}>Log Out</button>
    </> : <>{link('/account?mode=login', 'Log in')}{link('/account?mode=register', 'Register')}</>}</div>}
  </div>
}
