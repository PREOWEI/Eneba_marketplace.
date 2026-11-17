// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'

const game = {
  id: 'elden-ring',
  name: 'Elden Ring',
  platform: 'Steam',
  region: 'Europe',
  price: 19.99,
  originalPrice: 49.99,
  imageUrl: '/covers/elden-ring.jpg',
  description: 'An open-world action RPG.',
  offers: [
    { id: 'offer-a', seller: 'Pixel Vault', price: 19.99, currency: 'EUR', platform: 'Steam', region: 'Europe', delivery: 'Instant digital delivery', rating: 4.9, ratingCount: 100 },
    { id: 'offer-b', seller: 'Northstar Digital', price: 22.49, currency: 'EUR', platform: 'Steam', region: 'Europe', delivery: 'Instant digital delivery', rating: 4.8, ratingCount: 80 },
  ],
}
const user = { id: 'player@example.com', name: 'Player One', email: 'player@example.com' }
const order = {
  id: 'order-1',
  createdAt: '2026-01-01T10:00:00+00:00',
  total: 39.98,
  paymentStatus: 'simulated-paid',
  items: [{
    productId: game.id,
    productName: game.name,
    seller: 'Pixel Vault',
    quantity: 2,
    unitPrice: 19.99,
    lineTotal: 39.98,
    demoKeys: ['DEMO-ABCDEF012345', 'DEMO-012345ABCDEF'],
  }],
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})

test('compares sellers, edits a cart, signs up, simulates checkout and views demo keys', async () => {
  const fetcher = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = String(input)
    if (url === '/api/home') return { ok: true, json: async () => ({ banners: [], sections: [{ id: 'bestsellers', title: 'Bestsellers', products: [game] }] }) }
    if (url === '/api/products/filters') return { ok: true, json: async () => ({ platforms: ['Steam'], regions: ['Europe'] }) }
    if (url === '/api/auth/me') return { ok: true, json: async () => ({ user: null }) }
    if (url === '/api/products/elden-ring') return { ok: true, json: async () => game }
    if (url.startsWith('/api/products?')) return { ok: true, json: async () => [game] }
    if (url === '/api/auth/register') return { ok: true, json: async () => ({ user }) }
    if (url === '/api/checkout') return { ok: true, json: async () => order }
    if (url === '/api/orders') return { ok: true, json: async () => [order] }
    throw new Error(`Unexpected request: ${url} ${options?.method ?? 'GET'}`)
  })
  vi.stubGlobal('fetch', fetcher)
  render(<App />)

  const gameLinks = await screen.findAllByRole('link', { name: 'View Elden Ring' })
  expect(screen.getAllByText('60% off').length).toBeGreaterThan(0)
  fireEvent.click(gameLinks[0]!)
  expect(await screen.findByRole('heading', { name: 'Compare seller offers' })).toBeTruthy()
  expect(screen.getByText('Pixel Vault')).toBeTruthy()
  expect(screen.getByText('Northstar Digital')).toBeTruthy()
  const addButtons = screen.getAllByRole('button', { name: 'Add to cart' })
  fireEvent.click(addButtons[0]!)
  fireEvent.click(addButtons[1]!)

  fireEvent.click(screen.getByRole('link', { name: /Cart/ }))
  const secondCartLine = screen.getAllByRole('article').find(line => line.textContent?.includes('Northstar Digital'))
  if (!secondCartLine) throw new Error('Second seller offer was not added to the cart.')
  fireEvent.click(within(secondCartLine).getByRole('button', { name: 'Remove' }))
  const quantity = await screen.findByLabelText('Quantity')
  fireEvent.change(quantity, { target: { value: '2' } })
  expect(screen.getAllByText('€39.98')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'Continue to checkout' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Sign in to checkout' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Create account' }))
  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: user.name } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-42' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

  fireEvent.click(await screen.findByRole('button', { name: 'Simulate payment and place order' }))
  expect(await screen.findByRole('heading', { name: 'Order history' })).toBeTruthy()
  expect(screen.queryByText('DEMO-ABCDEF012345')).toBeNull()
  fireEvent.click((await screen.findAllByRole('button', { name: 'Reveal code' }))[0]!)
  expect(screen.getByText('DEMO-ABCDEF012345')).toBeTruthy()
  expect(screen.queryByText('DEMO-012345ABCDEF')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Reveal code' }))
  expect(screen.getByText('DEMO-012345ABCDEF')).toBeTruthy()
  const checkoutCall = fetcher.mock.calls.find(([url]) => url === '/api/checkout')
  expect(JSON.parse(String(checkoutCall?.[1]?.body))).toEqual({ items: [{ offerId: 'offer-a', quantity: 2 }] })
  await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url === '/api/orders')).toBe(true))
})


test('Enter searches the catalog from a product page', async () => {
  window.history.replaceState({}, '', '/product/elden-ring')
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/api/home') return { ok: true, json: async () => ({ banners: [], sections: [] }) }
    if (url === '/api/auth/me') return { ok: true, json: async () => ({ user: null }) }
    if (url === '/api/products/filters') return { ok: true, json: async () => ({ platforms: ['Steam'], regions: ['Europe'] }) }
    if (url === '/api/products/elden-ring') return { ok: true, json: async () => game }
    return { ok: true, json: async () => [] }
  })
  vi.stubGlobal('fetch', fetcher)
  render(<App />)
  await screen.findByRole('heading', { name: 'Compare seller offers' })
  const search = screen.getByRole('combobox', { name: 'Search games' })
  fireEvent.change(search, { target: { value: 'elden rign' } })
  fireEvent.keyDown(search, { key: 'Enter' })
  expect(window.location.pathname).toBe('/games')
  await waitFor(() => expect(fetcher.mock.calls.some(([url]) => String(url).startsWith('/api/products?') && String(url).includes('q=elden+rign'))).toBe(true))
})

test('login establishes the account and logout restricts order history again', async () => {
  window.history.replaceState({}, '', '/account')
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/api/home') return { ok: true, json: async () => ({ banners: [], sections: [] }) }
    if (url === '/api/products/filters') return { ok: true, json: async () => ({ platforms: [], regions: [] }) }
    if (url === '/api/auth/login') return { ok: true, json: async () => ({ user }) }
    if (url === '/api/auth/me' || url === '/api/auth/logout') return { ok: true, json: async () => ({ user: null }) }
    return { ok: true, json: async () => [] }
  }))
  render(<App />)
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-42' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  await screen.findByRole('heading', { name: 'Welcome back, Player One' })
  fireEvent.click(screen.getByRole('button', { name: 'Account' }))
  fireEvent.click(screen.getByRole('button', { name: 'Log Out' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Log Out' })).toBeNull())
  window.history.pushState({}, '', '/orders')
  fireEvent.popState(window)
  expect(await screen.findByRole('heading', { name: 'Sign in to view your orders' })).toBeTruthy()
})
