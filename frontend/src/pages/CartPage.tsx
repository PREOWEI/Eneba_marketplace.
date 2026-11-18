import type { CartLine } from '../marketplace'
import ProductImage from '../ProductImage'
import { euro } from '../utils/format'

export default function CartPage({ cart, onQuantity, onRemove, onNavigate }: {
  cart: CartLine[]
  onQuantity: (offerId: string, quantity: number) => void
  onRemove: (offerId: string) => void
  onNavigate: (path: string) => void
}) {
  const total = cart.reduce((sum, line) => sum + line.offer.price * line.quantity, 0)
  return <main className="content-page">
    <p className="section-kicker">READY WHEN YOU ARE</p><h1>Your cart</h1>
    {cart.length === 0 ? <div className="empty-panel"><p>Your cart is waiting for its first game.</p><button className="primary-button" onClick={() => onNavigate('/games')}>Browse games</button></div>
      : <div className="cart-layout"><section className="cart-lines" aria-label="Cart items">
        {cart.map(line => <article className="cart-line" key={line.offer.id}>
          <ProductImage name={line.product.name} imageUrl={line.product.imageUrl} />
          <div className="cart-line-details"><h2>{line.product.name}</h2><p>{line.offer.platform} · {line.offer.region}</p><p>Sold by {line.offer.seller}</p>
            <label>Quantity<select value={line.quantity} onChange={event => onQuantity(line.offer.id, Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
          </div>
          <div className="cart-line-price"><strong>{euro.format(line.offer.price * line.quantity)}</strong><button onClick={() => onRemove(line.offer.id)}>Remove</button></div>
        </article>)}
      </section><aside className="order-summary"><h2>Order summary</h2><p><span>Items ({cart.reduce((sum, line) => sum + line.quantity, 0)})</span><strong>{euro.format(total)}</strong></p><p><span>Payment</span><strong>Simulated only</strong></p><button className="primary-button" onClick={() => onNavigate('/checkout')}>Continue to checkout</button></aside></div>}
  </main>
}
