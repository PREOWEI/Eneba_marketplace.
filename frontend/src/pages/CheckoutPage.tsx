import type { CartLine } from '../marketplace'
import type { User } from '../marketplace'
import { euro } from '../utils/format'

export default function CheckoutPage({ cart, user, busy, error, onPay, onNavigate }: {
  cart: CartLine[]
  user: User | null
  busy: boolean
  error: string
  onPay: () => void
  onNavigate: (path: string) => void
}) {
  if (!user) return <main className="content-page"><p className="section-kicker">CHECKOUT</p><h1>Sign in to continue</h1>
    <p>Log in or create an account before placing your order.</p><button className="primary-button" onClick={() => onNavigate('/account?return=checkout')}>Sign in to checkout</button></main>
  if (cart.length === 0) return <main className="content-page"><h1>Your cart is empty</h1><button className="primary-button" onClick={() => onNavigate('/games')}>Browse games</button></main>
  const total = cart.reduce((sum, line) => sum + line.offer.price * line.quantity, 0)
  return <main className="content-page checkout-page">
    <p className="section-kicker">DEMO CHECKOUT</p><h1>Review your order</h1>
    <div className="checkout-summary">{cart.map(line => <p key={line.offer.id}><span>{line.product.name} × {line.quantity} <small>from {line.offer.seller}</small></span><strong>{euro.format(line.offer.price * line.quantity)}</strong></p>)}<p className="checkout-total"><span>Total</span><strong>{euro.format(total)}</strong></p></div>
    <div className="demo-payment-note"><strong>Simulation only</strong><p>No payment details are collected and no real entitlement is issued. Clearly labeled non-redeemable DEMO codes appear in order history.</p></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="primary-button" onClick={onPay} disabled={busy}>{busy ? 'Completing demo order…' : 'Simulate payment and place order'}</button>
  </main>
}
