// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
vi.mock('./connection', () => ({ apiFetch: (url: string, options?: RequestInit) => globalThis.fetch(url, options) }))
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import type { Product, User } from './marketplace'

const user: User = { id: 'player@example.com', name: 'Player One', email: 'player@example.com' }
const items: Product[] = [
  { id: 'elden', name: 'Elden Ring', platform: 'Steam', region: 'Europe', price: 35, imageUrl: '/covers/fallback.svg', productType: 'game', deviceCategories: ['pc'] },
  { id: 'ps5-game', name: 'Console Adventure', platform: 'PlayStation 5', region: 'Europe', price: 40, imageUrl: '/covers/fallback.svg', productType: 'game', deviceCategories: ['playstation'] },
  { id: 'wallet', name: 'Steam Wallet €10 (Demo)', platform: 'Steam Wallet', region: 'Demo only — no redemption', price: 10, imageUrl: '/covers/demo-gift-card.svg', productType: 'gift-card', redemptionPlatform: 'Steam account' },
  { id: 'pass', name: 'Xbox Game Pass Ultimate — 1 Month (Demo)', platform: 'Xbox / Microsoft Store', region: 'Demo only — no redemption', price: 17.99, imageUrl: '/covers/demo-subscription.svg', productType: 'subscription', duration: '1 month', redemptionPlatform: 'Eligible Xbox / Microsoft account', offers: [{ id: 'pass-offer', seller: 'Demo Seller', price: 17.99, currency: 'EUR', platform: 'Xbox / Microsoft Store', region: 'Demo only — no redemption', delivery: 'DEMO code only (not redeemable)', rating: 4.8, ratingCount: 12 }] },
  { id: 'credit', name: 'Roblox Credit Code (Demo)', platform: 'Roblox', region: 'Demo only — no redemption', price: 10, imageUrl: '/covers/demo-game-credit.svg', productType: 'game-credit', redemptionPlatform: 'Roblox account in a web browser' },
]
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/') })

test('guest favorite intent survives login and favorites persist across logout and login', async () => {
  window.history.replaceState({}, '', '/product/pass')
  const saved = new Set<string>()
  let signedIn = false
  const fetcher = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    if (url.pathname === '/api/home') return { ok: true, json: async () => ({ banners: [], sections: [] }) }
    if (url.pathname === '/api/auth/me') return { ok: true, json: async () => ({ user: null }) }
    if (url.pathname === '/api/auth/login') { signedIn = true; return { ok: true, json: async () => ({ user }) } }
    if (url.pathname === '/api/auth/logout') { signedIn = false; return { ok: true, json: async () => ({ user: null }) } }
    if (url.pathname === '/api/products/pass') return { ok: true, json: async () => items[3] }
    if (url.pathname === '/api/products/filters') return { ok: true, json: async () => ({ platforms: [], regions: [] }) }
    if (url.pathname === '/api/favorites' && options?.method === 'POST') {
      const body = JSON.parse(String(options.body)) as { productId: string; action: string }
      if (body.action === 'add') saved.add(body.productId)
      else saved.delete(body.productId)
      return { ok: true, json: async () => ({ favoriteIds: [...saved] }) }
    }
    if (url.pathname === '/api/favorites') return { ok: true, json: async () => ({ favoriteIds: [...saved], products: items.filter(item => saved.has(item.id)) }) }
    return { ok: true, json: async () => items }
  })
  vi.stubGlobal('fetch', fetcher)
  render(<App />)
  fireEvent.click(await screen.findByRole('button', { name: 'Add Xbox Game Pass Ultimate — 1 Month (Demo) to favorites' }))
  expect(window.location.pathname).toBe('/account')
  expect(window.location.search).toContain('favorite=pass')
  fireEvent.change(await screen.findByLabelText('Email'), { target: { value: user.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'demo-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByRole('heading', { name: 'Favorites' })).toBeTruthy()
  expect(await screen.findByRole('heading', { name: 'Xbox Game Pass Ultimate — 1 Month (Demo)' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Account' }))
  fireEvent.click(screen.getByRole('button', { name: 'Log Out' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Log Out' })).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: 'Account' }))
  await waitFor(() => expect(screen.getByRole('link', { name: 'Log in' })).toBeTruthy())
  fireEvent.click(screen.getByRole('link', { name: 'Log in' }))
  fireEvent.change(await screen.findByLabelText('Email'), { target: { value: user.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'demo-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  await screen.findByRole('heading', { name: 'Welcome back, Player One' })
  fireEvent.click(screen.getByRole('link', { name: /Favorites/ }))
  const favorite = await screen.findByRole('button', { name: 'Remove Xbox Game Pass Ultimate — 1 Month (Demo) from favorites' })
  expect(favorite.getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(favorite)
  expect(await screen.findByText(/no favorites yet/i)).toBeTruthy()
  expect([...saved]).toEqual([])
  expect(signedIn).toBe(true)
})

test('category sections select the right items and retain the Home/catalog behavior', async () => {
  window.history.replaceState({}, '', '/')
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost')
    if (url.pathname === '/api/home') return { ok: true, json: async () => ({ banners: [], sections: [] }) }
    if (url.pathname === '/api/auth/me') return { ok: true, json: async () => ({ user: null }) }
    if (url.pathname.endsWith('/filters')) return { ok: true, json: async () => ({ platforms: [], regions: [] }) }
    const category = url.searchParams.get('category')
    const results = category === 'gift-cards' ? items.filter(item => item.productType === 'gift-card')
      : category === 'pc' ? items.filter(item => item.deviceCategories?.includes('pc'))
      : category === 'playstation' ? items.filter(item => item.deviceCategories?.includes('playstation'))
      : category === 'subscriptions' ? items.filter(item => item.productType === 'subscription')
      : category === 'game-credits' ? items.filter(item => item.productType === 'game-credit')
      : items
    return { ok: true, json: async () => results }
  })
  vi.stubGlobal('fetch', fetcher)
  const { container } = render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Gift Cards' }))
  expect(container.querySelector('.home-disclosure')?.classList.contains('is-closed')).toBe(true)
  expect(await screen.findByRole('heading', { name: 'Steam Wallet €10 (Demo)' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Elden Ring' })).toBeNull()
  expect(fetcher.mock.calls.some(([input]) => new URL(String(input), 'http://localhost').searchParams.get('category') === 'gift-cards')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'PlayStation' }))
  expect(await screen.findByRole('heading', { name: 'Console Adventure' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Steam Wallet €10 (Demo)' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Subscriptions' }))
  expect(await screen.findByRole('heading', { name: 'Xbox Game Pass Ultimate — 1 Month (Demo)' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Game Credits' }))
  expect(await screen.findByRole('heading', { name: 'Roblox Credit Code (Demo)' })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Game'), { target: { value: 'Roblox' } })
  await waitFor(() => expect(fetcher.mock.calls.some(([input]) => {
    const url = new URL(String(input), 'http://localhost')
    return url.searchParams.get('category') === 'game-credits' && url.searchParams.get('platform') === 'Roblox'
  })).toBe(true))
})

test('subscription product uses the existing simulated checkout and typed demo order history', async () => {
  window.history.replaceState({}, '', '/product/pass')
  const order = { id: 'order-pass', createdAt: '2026-01-01T00:00:00Z', total: 17.99, paymentStatus: 'simulated-paid', items: [{ productId: 'pass', productName: items[3]!.name, productType: 'subscription', duration: '1 month', redemptionPlatform: 'Eligible Xbox / Microsoft account', seller: 'Demo Seller', quantity: 1, unitPrice: 17.99, lineTotal: 17.99, demoKeys: ['DEMO-ABCDEF012345', 'DEMO-SECOND'] }] }
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/api/home') return { ok: true, json: async () => ({ banners: [], sections: [] }) }
    if (url === '/api/auth/me') return { ok: true, json: async () => ({ user }) }
    if (url === '/api/favorites') return { ok: true, json: async () => ({ favoriteIds: [], products: [] }) }
    if (url === '/api/products/pass') return { ok: true, json: async () => items[3] }
    if (url === '/api/checkout') return { ok: true, json: async () => order }
    if (url === '/api/orders') return { ok: true, json: async () => [order] }
    if (url === '/api/products/filters') return { ok: true, json: async () => ({ platforms: [], regions: [] }) }
    return { ok: true, json: async () => [] }
  })
  vi.stubGlobal('fetch', fetcher)
  render(<App />)
  expect(await screen.findByText('1 month')).toBeTruthy()
  expect(screen.getByText(/non-redeemable DEMO code/i)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
  fireEvent.click(screen.getByRole('link', { name: /Cart/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue to checkout' }))
  fireEvent.click(screen.getByRole('button', { name: 'Simulate payment and place order' }))
  expect(await screen.findByText(/Subscription · 1 month · Seller: Demo Seller/)).toBeTruthy()
  expect(screen.queryByText('DEMO-ABCDEF012345')).toBeNull()
  fireEvent.click(screen.getAllByRole('button', { name: 'Reveal code' })[0]!)
  expect(screen.getByText('DEMO-ABCDEF012345')).toBeTruthy()
  expect(screen.queryByText('DEMO-SECOND')).toBeNull()
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
  await waitFor(() => expect(writeText).toHaveBeenCalledWith('DEMO-ABCDEF012345'))
  fireEvent.click(screen.getByRole('button', { name: 'Hide code' }))
  expect(screen.queryByText('DEMO-ABCDEF012345')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Account' }))
  expect(screen.getByRole('link', { name: 'My Account' })).toBeTruthy()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('link', { name: 'My Account' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Account' }))
  fireEvent.pointerDown(document.body)
  expect(screen.queryByRole('link', { name: 'My Account' })).toBeNull()
  expect(screen.getByText('For: Eligible Xbox / Microsoft account')).toBeTruthy()
  expect(fetcher.mock.calls.some(([input]) => String(input) === '/api/checkout')).toBe(true)
})
