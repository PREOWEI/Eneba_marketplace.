import type { ReactNode } from 'react'
import type { User } from '../marketplace'
import CartCounter from '../components/CartCounter'
import AccountMenu from '../components/AccountMenu'

export default function Header({ search, user, cartCount, onNavigate, onBrowse, onLogout, activeCategory }: {
  activeCategory?: string
  search?: ReactNode
  user: User | null
  cartCount: number
  onNavigate: (path: string) => void
  onBrowse: (values: { q?: string; platform?: string; category?: string; region?: string; minPrice?: string; maxPrice?: string; sort?: string }) => void
  onLogout: () => void
}) {
  const link = (path: string, label: ReactNode, className = '') => <a className={className} href={path}
    onClick={event => { event.preventDefault(); onNavigate(path) }}>{label}</a>
  return <header className="site-header">
    <div className="header-inner">
      {link('/', <><img className="brand-mark" src="/marketplace-logo.png" alt="" /><span className="brand-name">eneba<span>marketplace</span></span></>, 'brand')}
      {search && <div className="header-search" role="search" aria-label="Find games">{search}<span className="search-symbol" aria-hidden="true">⌕</span></div>}
      <div className="header-actions">
        {link('/cart', <><svg className="header-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h2l2.2 12.1a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg><span className="visually-hidden">Cart</span><CartCounter count={cartCount} /> </>, 'header-icon-link cart-link')}
        {link('/favorites', <><svg className="header-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg><span className="visually-hidden">Favorites</span></>, 'header-icon-link favorites-link')}
        <AccountMenu key={user?.id ?? "guest"} user={user} onNavigate={onNavigate} onLogout={onLogout} />
      </div>
    </div>
    <nav className="category-nav" aria-label="Shop categories">
      <button aria-current={activeCategory === 'home' ? 'page' : undefined} onClick={() => onNavigate('/')}>Home</button>
      <button aria-current={activeCategory === '' ? 'page' : undefined} onClick={() => onBrowse({})}>All Products</button>
      <button aria-current={activeCategory === 'pc' ? 'page' : undefined} onClick={() => onBrowse({ category: 'pc' })}>PC</button>
      <button aria-current={activeCategory === 'playstation' ? 'page' : undefined} onClick={() => onBrowse({ category: 'playstation' })}>PlayStation</button>
      <button aria-current={activeCategory === 'xbox' ? 'page' : undefined} onClick={() => onBrowse({ category: 'xbox' })}>Xbox</button>
      <button aria-current={activeCategory === 'gift-cards' ? 'page' : undefined} onClick={() => onBrowse({ category: 'gift-cards' })}>Gift Cards</button>
      <button aria-current={activeCategory === 'subscriptions' ? 'page' : undefined} onClick={() => onBrowse({ category: 'subscriptions' })}>Subscriptions</button>
      <button aria-current={activeCategory === 'game-credits' ? 'page' : undefined} onClick={() => onBrowse({ category: 'game-credits' })}>Game Credits</button>
      <button aria-current={activeCategory === 'deals' ? 'page' : undefined} className="nav-deals" onClick={() => onBrowse({ category: 'deals', sort: 'price_asc' })}>Deals</button>
    </nav>
  </header>
}
