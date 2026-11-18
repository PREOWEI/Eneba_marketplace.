import type { Product } from '../marketplace'
import type { User } from '../marketplace'
import ProductCard from '../ProductCard'

export default function FavoritesPage({ user, products, loading, error, onRemove, onOpen, onNavigate, onRetry }: {
  user: User | null
  products: Product[]
  loading: boolean
  error: string
  onRemove: (product: Product) => void
  onOpen: (product: Product) => void
  onNavigate: (path: string) => void
  onRetry: () => void
}) {
  return <main className="content-page favorites-page">
    <p className="section-kicker">YOUR SAVED PRODUCTS</p><h1>Favorites</h1>
    {!user ? <div className="empty-panel"><p>Log in to see and save your favorites across sessions.</p>
      <button className="primary-button" onClick={() => onNavigate('/account?mode=login&return=favorites')}>Log in</button>
      {' '}<button className="secondary-button" onClick={() => onNavigate('/account?mode=register&return=favorites')}>Register</button></div>
      : loading ? <p role="status">Loading favorites…</p>
      : error ? <div className="form-error" role="alert">{error} <button className="secondary-button" onClick={onRetry}>Retry</button></div>
      : products.length === 0 ? <div className="empty-panel"><p>You have no favorites yet. Save a product with its heart button.</p>
        <button className="primary-button" onClick={() => onNavigate('/games')}>Browse products</button></div>
      : <div className="product-grid favorites-grid">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} onOpen={onOpen} favorite onToggleFavorite={onRemove} />)}</div>}
  </main>
}
