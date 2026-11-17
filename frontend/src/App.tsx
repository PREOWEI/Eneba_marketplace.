import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import Catalog from './Catalog'
import ProductCard from './ProductCard'
import ProductImage from './ProductImage'
import ProductSearch from './ProductSearch'
import type { CartLine, HomePayload, Offer, Order, Product, User } from './marketplace'
import { homePayload } from './marketplace'
import { homepageShelves } from './homepage'
import useScrollReveal from './useScrollReveal'
import './App.css'

const euro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })
const productTypeLabel = (type: Product['productType'] = 'game') => ({ game: 'Game', 'gift-card': 'Gift card', subscription: 'Subscription', 'game-credit': 'Game credit' })[type]

function routeFromLocation(): string {
  return window.location.pathname + window.location.search
}

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options?.body ? { 'Content-Type': 'application/json' } : {}), ...options?.headers },
  })
  const data = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'The request could not be completed.')
  return data
}

function CartCounter({ count }: { count: number }) {
  const [change, setChange] = useState({ count, revision: 0 })
  if (change.count !== count) setChange({ count, revision: change.revision + 1 })
  return <span key={change.revision} className={`cart-count${change.revision ? ' cart-count-changed' : ''}`}>{count}</span>
}

function RevealShelf({ id, active, children }: { id: string; active: boolean; children: ReactNode }) {
  const { ref, revealed } = useScrollReveal(active)
  return <section ref={ref} className={`home-shelf scroll-reveal${revealed ? ' is-revealed' : ''}`} aria-labelledby={`${id}-title`}>{children}</section>
}


function AccountMenu({ user, onNavigate, onLogout }: { user: User | null; onNavigate: (path: string) => void; onLogout: () => void }) {
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

function OrderCode({ value }: { value: string }) {
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

function Header({ search, user, cartCount, onNavigate, onBrowse, onLogout, activeCategory }: {
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

function HomeSections({ home, loading, error, browse, onOpenProduct, onToggleFavorite, favoriteIds, active }: {
  active: boolean
  home: HomePayload | null
  loading: boolean
  error: string
  browse: (values: { q?: string; category?: string; maxPrice?: string; sort?: string }) => void
  onOpenProduct: (product: Product) => void
  onToggleFavorite: (product: Product) => void
  favoriteIds: string[]
}) {
  const shelves = home ? homepageShelves(home) : []
  const featured = home?.banners[0]
  const sideBanners = home?.banners.slice(1, 3) ?? []
  const findProduct = (id: string) => home?.sections.flatMap(section => section.products).find(product => product.id === id)
  return <div className="home-content">
    <div className="shelf-heading featured-heading"><h2>Featured Games</h2><a href="#games">Explore all games ↓</a></div>
    {loading ? <p className="home-status" role="status">Loading the storefront…</p>
      : error ? <p className="home-status" role="alert">{error}</p>
      : featured ? <section className={`featured${sideBanners.length ? '' : ' featured-single'}`} aria-label="Featured games">
        <article className="feature-main">
          <div className="feature-background" aria-hidden="true" style={{ backgroundImage: `url("${featured.imageUrl}")` }} />
          <div className="feature-copy">
            <span className="eyebrow">{featured.eyebrow} · {featured.title}</span>
            <h1>Find your next great adventure.</h1>
            <p>{featured.description}</p>
            <button className="primary-button" onClick={() => browse({ q: featured.title })}>Explore {featured.title} <span aria-hidden="true">→</span></button>
          </div>
        </article>
        <div className="feature-side">
          {sideBanners.map((banner, index) => <button className="feature-small" key={banner.id} onClick={() => {
            const product = findProduct(banner.id)
            if (product) onOpenProduct(product)
            else browse({ q: banner.title })
          }}>
            <img src={banner.imageUrl || '/marketplace-logo.png'} alt="" />
            <span>{index === 0 ? 'More to discover' : 'Your next adventure'} <b aria-hidden="true">→</b><strong>{banner.title}</strong></span>
          </button>)}
        </div>
      </section> : <section className="featured-empty"><p>Find your next game at a great price.</p><button className="primary-button" onClick={() => browse({})}>Browse all games</button></section>}
    {!loading && !error && shelves.map(section => <RevealShelf key={section.id} id={section.id} active={active}>
      <div className="shelf-heading"><div><h2 id={`${section.id}-title`}>{section.title}</h2></div>
        <button onClick={() => browse(section.id === 'deals' ? { category: 'deals', sort: 'price_asc' } : {})}>View all <span aria-hidden="true">→</span></button>
      </div>
      {section.products.length > 0
        ? <div className="product-grid home-product-grid">{section.products.map((product, index) => <ProductCard index={index} key={product.id} product={product} onOpen={onOpenProduct} favorite={favoriteIds.includes(product.id)} onToggleFavorite={onToggleFavorite} />)}</div>
        : <p className="shelf-empty">No games in this collection just yet.</p>}
    </RevealShelf>)}
  </div>
}


function AuthPage({ user, error: accountError, onAuthenticate, onNavigate }: {
  user: User | null
  error: string
  onAuthenticate: (mode: 'login' | 'register', values: { name: string; email: string; password: string }) => Promise<void>
  onNavigate: (path: string) => void
}) {
  const [mode, setMode] = useState<'login' | 'register'>(() => new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const cleanName = name.trim()

  const nameError = mode !== 'register' ? ''
    : !cleanName ? 'Please enter your name.'
    : !/^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(cleanName)
      ? 'Your name should contain letters, not numbers or other symbols.'
    : new TextEncoder().encode(cleanName).length > 80
      ? 'Your name is too long.'
    : ''

 const emailError = !email
  ? 'Please enter your email address.'
  : /\s/.test(email)
    ? 'Email addresses cannot contain spaces.'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? 'Please enter a valid email address.'
      : ''

  const passwordError = !password
    ? 'Please enter your password.'
    : mode === 'register' && /\s/u.test(password)
      ? 'Password cannot contain spaces.'
    : mode === 'register' && password.length < 8
      ? 'Use at least 8 characters.'
    : mode === 'register' && new TextEncoder().encode(password).length > 72
      ? 'Your password is too long. Choose a shorter one.'
    : ''

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setError('')

    if (nameError || emailError || passwordError) return

    setBusy(true)
    try {
      await onAuthenticate(mode, {
        name: cleanName,
        email,
        password
      })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (user) return <main className="content-page account-page">
    <p className="section-kicker">YOUR ACCOUNT</p>
    <h1>Welcome back, {user.name}</h1>
    <p>{user.email}</p>
    <p>Your demo purchases and keys are available in your order history.</p>
    <button className="primary-button" onClick={() => onNavigate('/orders')}>
      View order history
    </button>
  </main>

  return <main className="content-page auth-page">
    <p className="section-kicker">PLAYER ACCOUNT</p>
    <h1>{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
    <p>Sign in to complete checkout and keep your purchase history together.</p>

    {(error || accountError) && (
      <p className="form-error" role="alert">{error || accountError}</p>
    )}

    <form noValidate onSubmit={submit}>
      {mode === 'register' && (
        <label>
          Your name
          <input
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={event => setName(event.target.value)}
            onBlur={() => setTouched(previous => ({ ...previous, name: true }))}
            aria-invalid={Boolean((touched.name || submitted) && nameError)}
          />
          {(touched.name || submitted) && nameError && (
            <span className="field-error">{nameError}</span>
          )}
        </label>
      )}

      <label>
        Email
        <input
          type="text"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          value={email}
         onChange={event => setEmail(event.target.value)}
          onBlur={() => setTouched(previous => ({ ...previous, email: true }))}
          aria-invalid={Boolean((touched.email || submitted) && emailError)}
        />
        {(touched.email || submitted) && emailError && (
          <span className="field-error">{emailError}</span>
        )}
      </label>

      <label>
        Password
        <span className="password-input">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={event => setPassword(event.target.value)}
            onBlur={() => setTouched(previous => ({ ...previous, password: true }))}
            aria-invalid={Boolean((touched.password || submitted) && passwordError)}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </span>
        {(touched.password || submitted) && passwordError && (
          <span className="field-error">{passwordError}</span>
        )}
      </label>

      <button className="primary-button" type="submit" disabled={busy}>
        {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
      </button>
    </form>

    <p className="auth-switch">
      {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
      <button type="button" onClick={() => {
        setError('')
        setSubmitted(false)
        setTouched({ name: false, email: false, password: false })
        setPassword('')
        setShowPassword(false)
        setMode(mode === 'login' ? 'register' : 'login')
      }}>
        {mode === 'login' ? 'Create account' : 'Sign in'}
      </button>
    </p>
  </main>
}


function CartPage({ cart, onQuantity, onRemove, onNavigate }: {
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

function FavoritesPage({ user, products, loading, error, onRemove, onOpen, onNavigate, onRetry }: {
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

function CheckoutPage({ cart, user, busy, error, onPay, onNavigate }: {
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

function OrdersPage({ orders, loading, error, onRetry, onNavigate }: {
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

function App() {
  const [location, setRoute] = useState(routeFromLocation)
  const route = location.split('?')[0]
  const [home, setHome] = useState<HomePayload | null>(null)
  const [homeLoading, setHomeLoading] = useState(true)
  const [homeError, setHomeError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [favorites, setFavorites] = useState<Product[]>([])
  const [favoritesLoadedKey, setFavoritesLoadedKey] = useState<string | null>(null)
  const [favoritesError, setFavoritesError] = useState('')
  const [favoriteRetry, setFavoriteRetry] = useState(0)
  const [headerQuery, setHeaderQuery] = useState('')
  const [accountError, setAccountError] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [productResult, setProductResult] = useState<{ id: string; product?: Product; error?: string } | null>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [ordersResult, setOrdersResult] = useState<{ key: string; orders?: Order[]; error?: string } | null>(null)
  const [orderRetry, setOrderRetry] = useState(0)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0)
  const productMatch = route.match(/^\/product\/([^/]+)$/)
  const productId = productMatch ? decodeURIComponent(productMatch[1] ?? '') : ''
  const currentProductResult = productResult?.id === productId ? productResult : null
  const detailProduct = currentProductResult?.product
  const ordersKey = `${user?.id ?? ''}:${orderRetry}`
  const currentOrdersResult = ordersResult?.key === ordersKey ? ordersResult : null
  const favoritesLoading = Boolean(user && favoritesLoadedKey !== `${user.id}:${favoriteRetry}`)
  const isCatalog = route === '/' || route === '/games'

  const navigate = (path: string, replace = false) => {
    if (path !== routeFromLocation()) window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
    setRoute(routeFromLocation())
    setActionMessage('')
  }

  useEffect(() => {
    const handlePopState = () => setRoute(routeFromLocation())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    let active = true
    apiJson<unknown>('/api/home').then(value => {
      if (active) setHome(homePayload(value))
    }).catch(error => {
      if (active) setHomeError(error instanceof Error ? error.message : 'Unable to load the storefront.')
    }).finally(() => { if (active) setHomeLoading(false) })
    apiJson<{ user: User | null }>('/api/auth/me').then(value => {
      if (active) setUser(value.user ?? null)
    }).catch(error => {
      if (active) setAccountError(error instanceof Error ? error.message : 'Unable to check your account.')
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!productId) return
    const controller = new AbortController()
    apiJson<Product>(`/api/products/${encodeURIComponent(productId)}`, { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setProductResult({ id: productId, product: value })
    }).catch(error => {
      if (!controller.signal.aborted) setProductResult({ id: productId, error: error instanceof Error ? error.message : 'Unable to load this game.' })
    })
    return () => controller.abort()
  }, [productId])

  useEffect(() => {
    if (route !== '/orders' || !user) return
    let active = true
    apiJson<Order[]>('/api/orders').then(value => {
      if (active) setOrdersResult({ key: ordersKey, orders: value })
    }).catch(error => {
      if (active) setOrdersResult({ key: ordersKey, error: error instanceof Error ? error.message : 'Unable to load order history.' })
    })
    return () => { active = false }
  }, [route, user, ordersKey])

  useEffect(() => {
    if (!user) return
    let active = true
    const requestKey = `${user.id}:${favoriteRetry}`
    apiJson<{ favoriteIds: string[]; products: Product[] }>('/api/favorites').then(value => {
      if (active) { setFavoriteIds(value.favoriteIds); setFavorites(value.products); setFavoritesError(''); setFavoritesLoadedKey(requestKey) }
    }).catch(error => {
      if (active) { setFavoritesError(error instanceof Error ? error.message : 'Unable to load favorites.'); setFavoritesLoadedKey(requestKey) }
    })
    return () => { active = false }
  }, [user, favoriteRetry])

  const authenticate = async (mode: 'login' | 'register', values: { name: string; email: string; password: string }) => {
    setAccountError('')
    const result = await apiJson<{ user: User }>(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(values) })
    const params = new URLSearchParams(window.location.search)
    const pendingFavorite = params.get('favorite')
    if (pendingFavorite) await apiJson<{ favoriteIds: string[] }>('/api/favorites', {
      method: 'POST', body: JSON.stringify({ productId: pendingFavorite, action: 'add' }),
    })
    setUser(result.user)
    const returnTo = params.get('return')
    navigate(returnTo === 'checkout' ? '/checkout' : (returnTo === 'favorites' || pendingFavorite) ? '/favorites' : '/account')
  }

  const logout = async () => {
    try {
      await apiJson('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setFavoriteIds([])
      setFavorites([])
      setFavoritesLoadedKey(null)
      navigate('/')
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Unable to log out.')
    }
  }

  const toggleFavorite = async (product: Product) => {
    if (!user) {
      navigate(`/account?mode=login&return=favorites&favorite=${encodeURIComponent(product.id)}`)
      return
    }
    const action = favoriteIds.includes(product.id) ? 'remove' : 'add'
    try {
      const result = await apiJson<{ favoriteIds: string[] }>('/api/favorites', {
        method: 'POST', body: JSON.stringify({ productId: product.id, action }),
      })
      setFavoriteIds(result.favoriteIds)
      setFavorites(current => action === 'remove'
        ? current.filter(item => item.id !== product.id)
        : current.some(item => item.id === product.id) ? current : [...current, product])
    } catch (error) {
      setFavoritesError(error instanceof Error ? error.message : 'Unable to update favorites.')
    }
  }

  const addOffer = (selectedProduct: Product, offer: Offer) => {
    setCart(current => {
      const existing = current.find(line => line.offer.id === offer.id)
      if (existing) return current.map(line => line.offer.id === offer.id ? { ...line, quantity: Math.min(10, line.quantity + 1) } : line)
      return [...current, { product: selectedProduct, offer, quantity: 1 }]
    })
    setActionMessage(`${selectedProduct.name} from ${offer.seller} added to your cart.`)
  }

  const browse = (values: { q?: string; platform?: string; category?: string; maxPrice?: string; sort?: string }) => {
    const params = new URLSearchParams(Object.entries(values).filter(([, value]) => value))
    navigate(`/games${params.size ? `?${params}` : ''}`)
  }

  const pay = async () => {
    setCheckoutBusy(true)
    setCheckoutError('')
    try {
      await apiJson<Order>('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ items: cart.map(line => ({ offerId: line.offer.id, quantity: line.quantity })) }),
      })
      setCart([])
      setOrderRetry(value => value + 1)
      navigate('/orders')
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to complete the demo checkout.')
    } finally { setCheckoutBusy(false) }
  }

  const detachedSearch = <ProductSearch value={headerQuery} filters={{ platform: '', region: '', minPrice: '', maxPrice: '' }}
    onChange={setHeaderQuery} onSubmit={q => browse({ q })} onSelect={game => navigate(`/product/${encodeURIComponent(game.id)}`)} />
  const header = (search?: ReactNode, onBrowse = browse) => <Header search={search ?? (!isCatalog ? detachedSearch : undefined)} user={user} cartCount={cartCount}
    onNavigate={navigate} onBrowse={onBrowse} onLogout={logout}
    activeCategory={route === '/' ? 'home' : route === '/games' ? new URLSearchParams(location.split('?')[1]).get('category') ?? '' : undefined} />

  if (isCatalog) return <div className="storefront">
    <a className="skip-link" href="#games">Skip to games</a>
    <Catalog location={location} onNavigate={navigate} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} onOpenProduct={game => navigate(`/product/${encodeURIComponent(game.id)}`)}
      renderStorefront={(search, catalogBrowse) => <>
        {header(search, catalogBrowse)}
        <div className={`home-disclosure${route === '/' ? '' : ' is-closed'}`} aria-hidden={route !== '/'} inert={route !== '/'}>
          <div className="home-disclosure-inner"><HomeSections active={route === '/'} home={home} loading={homeLoading} error={homeError}
            browse={catalogBrowse} onToggleFavorite={toggleFavorite} favoriteIds={favoriteIds} onOpenProduct={game => navigate(`/product/${encodeURIComponent(game.id)}`)} /></div>
        </div>
      </>} />
    <Footer />
  </div>

  return <div className="storefront">
    {header()}
    {productId ? <main className="content-page product-page">
      {!currentProductResult ? <p role="status">Loading game details…</p>
        : currentProductResult.error ? <p className="form-error" role="alert">{currentProductResult.error}</p>
        : detailProduct && <>
          <button className="back-link" onClick={() => navigate('/games')}>← Back to games</button>
          <div className="product-detail">
            <div className="product-detail-cover"><ProductImage name={detailProduct.name} imageUrl={detailProduct.imageUrl} /></div>
            <section className="product-detail-copy">
              <p className="section-kicker">{detailProduct.platform} · {detailProduct.region}</p><h1>{detailProduct.name}</h1>
              <p className="product-description">{detailProduct.description || 'Digital game offer. See seller details and activation region below.'}</p>
              <div className="product-title-row"><span className="product-type-pill">{productTypeLabel(detailProduct.productType)}</span><button className={`favorite-toggle detail-favorite${favoriteIds.includes(detailProduct.id) ? ' is-favorite' : ''}`} type="button" aria-pressed={favoriteIds.includes(detailProduct.id)} aria-label={`${favoriteIds.includes(detailProduct.id) ? 'Remove' : 'Add'} ${detailProduct.name} ${favoriteIds.includes(detailProduct.id) ? 'from' : 'to'} favorites`} onClick={() => toggleFavorite(detailProduct)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg></button></div>
              <p className="product-metadata"><span>Platform</span><strong>{detailProduct.platform}</strong><span>Region</span><strong>{detailProduct.region}</strong>{detailProduct.duration && <><span>Duration</span><strong>{detailProduct.duration}</strong></>}{detailProduct.redemptionPlatform && <><span>Account / device</span><strong>{detailProduct.redemptionPlatform}</strong></>}</p>
              {detailProduct.productType !== 'game' && <p className="demo-product-note">Demo listing only: checkout creates a clearly labeled non-redeemable DEMO code. No real credit or subscription is issued.</p>}
              {detailProduct.productType !== 'game' && detailProduct.source && <p className="product-source"><a href={detailProduct.source} target="_blank" rel="noreferrer">Check official product and region information ↗</a></p>}
              <h2>Compare seller offers</h2>
              {detailProduct.offers?.length ? <div className="offer-list">{detailProduct.offers.map(offer => <article className="offer-row" key={offer.id}>
                <div><strong>{offer.seller}</strong><span className="seller-rating">★ {offer.rating.toFixed(1)} ({offer.ratingCount.toLocaleString()})</span>
                  <small>{offer.delivery} · {offer.platform} · {offer.region}</small></div>
                <strong className="offer-price">{euro.format(offer.price)}</strong>
                <button className="primary-button" onClick={() => addOffer(detailProduct, offer)}>Add to cart</button>
              </article>)}</div> : <p className="shelf-empty">Seller offers are not available for this game yet.</p>}
              {actionMessage && <p className="success-message" role="status">{actionMessage} <button onClick={() => navigate('/cart')}>View cart</button></p>}
            </section>
          </div>
        </>}
    </main>
      : route === '/cart' ? <CartPage cart={cart}
        onQuantity={(offerId, quantity) => setCart(current => current.map(line => line.offer.id === offerId ? { ...line, quantity } : line))}
        onRemove={offerId => setCart(current => current.filter(line => line.offer.id !== offerId))}
        onNavigate={navigate} />
      : route === '/favorites' ? <FavoritesPage user={user} products={favorites} loading={favoritesLoading} error={favoritesError}
        onRemove={toggleFavorite} onOpen={game => navigate(`/product/${encodeURIComponent(game.id)}`)} onNavigate={navigate}
        onRetry={() => setFavoriteRetry(value => value + 1)} />
      : route === '/checkout' ? <CheckoutPage cart={cart} user={user} busy={checkoutBusy} error={checkoutError} onPay={pay} onNavigate={navigate} />
      : route === '/account' ? <AuthPage key={location} user={user} error={accountError} onAuthenticate={authenticate} onNavigate={navigate} />
      : route === '/orders' ? user ? <OrdersPage orders={currentOrdersResult?.orders ?? []} loading={!currentOrdersResult} error={currentOrdersResult?.error ?? ''}
        onRetry={() => setOrderRetry(value => value + 1)} onNavigate={navigate} />
        : <main className="content-page"><h1>Sign in to view your orders</h1><button className="primary-button" onClick={() => navigate('/account')}>Sign in</button></main>
      : <main className="content-page"><h1>Page not found</h1><button className="primary-button" onClick={() => navigate('/')}>Back to home</button></main>}
    <Footer />
  </div>
}

function Footer() {
  return <footer className="site-footer"><a className="footer-brand" href="/">eneba <span>marketplace</span></a>
    <p>Find your next game. Make it a good one.</p></footer>
}

export default App
