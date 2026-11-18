import type { Order } from '../marketplace'
import { euro } from '../utils/format'
import { productTypeLabel } from '../utils/format'
import OrderCode from '../components/OrderCode'

export default function OrdersPage({ orders, loading, error, onRetry, onNavigate }: {
  orders: Order[]
  loading: boolean
  error: string
  onRetry: () => void
  onNavigate: (path: string) => void
}) {
  return <main className="content-page orders-page">
    <p className="section-kicker">YOUR ACCOUNT</p><h1>Order history</h1>
    {loading ? <p role="status">Loading your orders…</p>
      : error ? <p className="form-error" role="alert">{error} <button onClick={onRetry}>Retry</button></p>
      : orders.length === 0 ? <div className="empty-panel"><p>No orders yet.</p><button className="primary-button" onClick={() => onNavigate('/games')}>Find a game</button></div>
      : orders.map(order => <article className="order-card" key={order.id}>
        <div className="order-heading"><strong>Demo order</strong><span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</span><b>{euro.format(order.total)}</b></div>
        {order.items.map((item, index) => <div className="order-item" key={`${item.productId}-${index}`}>
          <div><h2>{item.productName} × {item.quantity}</h2><p>{productTypeLabel(item.productType)}{item.duration ? ` · ${item.duration}` : ''} · Seller: {item.seller} · {euro.format(item.unitPrice)} each</p>{item.redemptionPlatform && <p>For: {item.redemptionPlatform}</p>}</div>
          <div className="demo-keys"><span>DEMO code{item.demoKeys.length === 1 ? '' : 's'} — not redeemable</span>{item.demoKeys.map((key, index) => <OrderCode key={index} value={key} />)}</div>
        </div>)}
      </article>)}
  </main>
}
