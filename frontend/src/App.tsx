import './App.css'
import { apiJson } from './api/client'
import { useEffect } from 'react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { CartLine } from './marketplace'
import type { HomePayload } from './marketplace'
import type { Offer } from './marketplace'
import type { Order } from './marketplace'
import type { Product } from './marketplace'
import type { User } from './marketplace'
import ProductImage from './ProductImage'
import ProductSearch from './ProductSearch'
import { euro } from './utils/format'
import { productTypeLabel } from './utils/format'
import Catalog from './Catalog'
import { homePayload } from './marketplace'
import Header from './components/Header'
import HomeSections from './components/HomeSections'
import AuthPage from './pages/AuthPage'
import CartPage from './pages/CartPage'
import FavoritesPage from './pages/FavoritesPage'
import CheckoutPage from './pages/CheckoutPage'
import OrdersPage from './pages/OrdersPage'
import Footer from './components/Footer'

function routeFromLocation(): string {
  return window.location.pathname + window.location.search
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

export default App
