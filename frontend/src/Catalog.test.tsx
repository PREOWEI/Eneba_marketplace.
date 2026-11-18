// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
vi.mock('./connection', () => ({ apiFetch: (url: string, options?: RequestInit) => globalThis.fetch(url, options) }))
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Catalog from './Catalog'
import App from './App'

const product: { id: string; name: string; platform: string; region: string; price: number; imageUrl: string; deviceCategories?: string[] } = { id: 'elden', name: 'Elden Ring', platform: 'Steam', region: 'Europe', price: 39.99, imageUrl: '/missing.jpg' }
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/') })
function mockApi(items = [product]) {
  const fetcher = vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/filters') ? { platforms: ['Steam'], regions: ['Europe'] } : url.includes('/suggestions') ? { items, didYouMean: null } : items }))
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}
test('storefront search and collection links use the catalog query', async () => {
  const fetcher = mockApi(); render(<App />)
  await screen.findAllByRole('heading', { name: 'Elden Ring' })
  expect(screen.getAllByRole('combobox', { name: 'Search games' })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'PC' }))
  expect(screen.getByRole('heading', { name: 'PC Games' })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Store / Launcher'), { target: { value: 'Steam' } })
  await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.startsWith('/api/products?') && url.includes('platform=Steam'))).toBe(true))
  fireEvent.click(screen.getByRole('button', { name: 'Deals' }))
  expect(screen.getByRole('heading', { name: 'Deals' })).toBeTruthy()
  expect((screen.getByLabelText('Sort by') as HTMLSelectElement).value).toBe('price_asc')
  fireEvent.click(screen.getByRole('button', { name: 'Home' }))
  fireEvent.click(screen.getByRole('button', { name: /Explore Elden Ring/ }))
  await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.startsWith('/api/products?') && url.includes('q=Elden+Ring'))).toBe(true))
})
test('header opens login and registration directly and labels the cart icon', async () => {
  mockApi(); render(<App />)
  const cart = screen.getByRole('link', { name: /Cart/ })
  expect(cart.querySelector('svg.header-icon')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Account' }))
  fireEvent.click(screen.getByRole('link', { name: 'Register' }))
  expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeTruthy()
  expect(screen.getByLabelText('Your name')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Account' }))
  fireEvent.click(screen.getByRole('link', { name: 'Log in' }))
  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
  expect(screen.queryByLabelText('Your name')).toBeNull()
})
test('loads API products, formats EUR and provides image fallback', async () => {
  mockApi(); render(<Catalog />)
  expect(screen.getByText('Loading games…')).toBeTruthy()
  expect(await screen.findByRole('heading', { name: 'Elden Ring' })).toBeTruthy()
  expect(screen.getByText('€39.99')).toBeTruthy()
  fireEvent.error(screen.getByRole('img', { name: 'Elden Ring' }))
  expect(screen.getByRole('img', { name: 'Elden Ring: image unavailable' }).getAttribute('src')).toBe('/marketplace-logo.png')
})
test('combines all controls in backend request and clears them', async () => {
  const fetcher = mockApi(); render(<Catalog />)
  await screen.findByRole('heading', { name: 'Elden Ring' })
  for (const [label, value] of [['Search games', 'elden rign'], ['Activation / Service', 'Steam'], ['Region', 'Europe'], ['Min price (€)', '30'], ['Max price (€)', '40'], ['Sort by', 'price_desc']]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  }
  await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.includes('q=elden+rign&activation=Steam&region=Europe&minPrice=30&maxPrice=40&sort=price_desc'))).toBe(true))
  fireEvent.click(screen.getByText('Clear filters'))
  expect((screen.getByLabelText('Search games') as HTMLInputElement).value).toBe('elden rign')
})
test('shows empty results and rejects reversed price bounds', async () => {
  mockApi([]); render(<Catalog />)
  expect(await screen.findByText(/No products match/)).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Min price (€)'), { target: { value: '50' } })
  fireEvent.change(screen.getByLabelText('Max price (€)'), { target: { value: '10' } })
  expect(screen.getByRole('alert').textContent).toContain('Minimum price')
})
test('shows an API error and retries successfully', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })))
  render(<Catalog />)
  expect(await screen.findByRole('alert')).toBeTruthy()
  mockApi()
  fireEvent.click(screen.getByText('Retry'))
  expect(await screen.findByRole('heading', { name: 'Elden Ring' })).toBeTruthy()
})

test('autocomplete selects the exact product without dropping filters', async () => {
  const fetcher = mockApi(); render(<Catalog />)
  await screen.findByRole('heading', { name: 'Elden Ring' })
  fireEvent.change(screen.getByLabelText('Activation / Service'), { target: { value: 'Steam' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Search games' }), { target: { value: 'elden rign' } })
  fireEvent.click(await screen.findByRole('option', { name: /Elden Ring/ }, { timeout: 3000 }))
  await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.startsWith('/api/products?') && url.includes('id=elden') && url.includes('activation=Steam'))).toBe(true))
  fetcher.mockClear()
  fireEvent.change(screen.getByRole('combobox', { name: 'Search games' }), { target: { value: 'hades' } })
  await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.startsWith('/api/products?') && url.includes('q=hades') && !url.includes('id='))).toBe(true))
})

test('category filters include mixed platforms, preserve store filters, and clear together', async () => {
  mockApi([product, { ...product, id: 'console', name: 'Console game', platform: 'PlayStation', deviceCategories: ['playstation'] }, { ...product, id: 'mixed', name: 'Mixed game', platform: 'Steam / Xbox / PC', deviceCategories: ['pc', 'xbox'] }])
  render(<App />)
  await screen.findByRole('heading', { name: 'Console game' })
  fireEvent.click(screen.getByRole('button', { name: 'PC' }))
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Console game' })).toBeNull())
  expect(await screen.findByRole('heading', { name: 'Mixed game' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Xbox' }))
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Elden Ring' })).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect((screen.getByLabelText('Console') as HTMLSelectElement).value).toBe('')
  expect(await screen.findByRole('heading', { name: 'Mixed game' })).toBeTruthy()
})

test.each([
  ['pc', 'Store / Launcher', 'Steam', 'GOG'],
  ['playstation', 'Console', 'PlayStation 4', 'PlayStation 5'],
  ['xbox', 'Console', 'Xbox One', 'Xbox Series X'],
  ['gift-cards', 'Brand', 'Steam Wallet', 'Nintendo eShop'],
  ['subscriptions', 'Service', 'Xbox Game Pass', 'PlayStation Plus'],
  ['game-credits', 'Game', 'Roblox', 'Fortnite'],
  ['', 'Activation / Service', 'Steam', 'GOG'],
  ['deals', 'Activation / Service', 'Steam', 'GOG'],
])('keeps category options after selecting and switching filters: %s', async (category, label, first, second) => {
  window.history.replaceState({}, '', '/games?category=' + category)
  const items = [first, second].map((platform, index) => ({ ...product, id: String(index), name: 'Product ' + index, platform, originalPrice: 60, deviceCategories: [category], productType: category === 'gift-cards' ? 'gift-card' : category === 'subscriptions' ? 'subscription' : category === 'game-credits' ? 'game-credit' : 'game' }))
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost')
    const selected = url.searchParams.get('platform') || url.searchParams.get('activation')
    return { ok: true, json: async () => url.pathname.endsWith('/filters') ? { platforms: [first, second], regions: ['Europe'] } : items.filter(item => !selected || item.platform === selected) }
  }))
  render(<Catalog />)
  await screen.findByRole('heading', { name: 'Product 0' })
  const select = screen.getByLabelText(label) as HTMLSelectElement
  fireEvent.change(select, { target: { value: first } })
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Product 1' })).toBeNull())
  expect(Array.from(select.options).map(option => option.value)).toEqual(['', ...[first, second].sort((a, b) => a.localeCompare(b))])
  fireEvent.change(select, { target: { value: second } })
  await screen.findByRole('heading', { name: 'Product 1' })
  expect(screen.queryByRole('heading', { name: 'Product 0' })).toBeNull()
  expect(select.options).toHaveLength(3)
})
