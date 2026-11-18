// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
vi.mock('./connection', () => ({ apiFetch: (url: string, options?: RequestInit) => globalThis.fetch(url, options) }))
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'

const games = ['Steam', 'PlayStation 5', 'Xbox Series X|S'].map((platform, index) => ({
  id: String(index), name: `${platform} game`, platform, region: 'Europe', price: 20 + index, imageUrl: '/covers/fallback.svg',
}))
function setup() {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost')
    const data = url.pathname === '/api/home' ? { banners: [], sections: [{ id: 'popular', title: 'Popular Games', products: games }] }
      : url.pathname === '/api/auth/me' ? { user: null }
      : url.pathname.endsWith('/filters') ? { platforms: games.map(game => game.platform), regions: ['Europe'] }
      : games.filter(game => !url.searchParams.get('platform') || game.platform === url.searchParams.get('platform'))
    return { ok: true, json: async () => data }
  }))
  return render(<App />)
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/') })

test('navigation collapses home once, preserves unrelated filters, and Home/logo restore it', async () => {
  const { container } = setup()
  const results = within(screen.getByRole('region', { name: 'Game results' }))
  await results.findByRole('heading', { name: 'Steam game' })
  expect(screen.getByRole('heading', { name: 'Featured Games' })).toBeTruthy()
  const disclosure = container.querySelector('.home-disclosure')!
  fireEvent.click(screen.getByRole('button', { name: 'PC' }))
  expect(disclosure.classList.contains('is-closed')).toBe(true)
  expect(disclosure.hasAttribute('inert')).toBe(true)
  expect(screen.queryByRole('heading', { name: 'Popular Games' })).toBeNull()
  await waitFor(() => expect(results.queryByRole('heading', { name: 'PlayStation 5 game' })).toBeNull())
  fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'Europe' } })
  fireEvent.change(screen.getByLabelText('Max price (€)'), { target: { value: '50' } })
  fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'price_desc' } })
  fireEvent.click(screen.getByRole('button', { name: 'PlayStation' }))
  expect((screen.getByLabelText('Region') as HTMLSelectElement).value).toBe('Europe')
  expect((screen.getByLabelText('Max price (€)') as HTMLInputElement).value).toBe('50')
  expect((screen.getByLabelText('Sort by') as HTMLSelectElement).value).toBe('price_desc')
  expect(await results.findByRole('heading', { name: 'PlayStation 5 game' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Xbox' }))
  expect(results.getAllByRole('heading')).toHaveLength(1)
  expect(await results.findByRole('heading', { name: 'Xbox Series X|S game' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'All Products' }))
  await waitFor(() => expect(results.getAllByRole('heading')).toHaveLength(3))
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(container.querySelector('.home-disclosure')).toBe(disclosure)
  expect(disclosure.classList.contains('is-closed')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Home' }))
  expect(disclosure.hasAttribute('inert')).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'All Products' }))
  fireEvent.click(container.querySelector('.brand')!)
  expect(screen.getByRole('heading', { name: 'Featured Games' })).toBeTruthy()
})

test('Back and Forward restore Home and catalog including filter state', async () => {
  setup()
  await screen.findByRole('option', { name: 'Europe' })
  fireEvent.click(screen.getByRole('button', { name: 'PC' }))
  fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'Europe' } })
  await act(async () => { window.history.back() })
  await waitFor(() => expect(screen.getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBe('page'))
  await act(async () => { window.history.forward() })
  await waitFor(() => expect(screen.getByRole('heading', { name: 'PC Games' })).toBeTruthy())
  expect((screen.getByLabelText('Region') as HTMLSelectElement).value).toBe('Europe')
  expect(screen.queryByRole('heading', { name: 'Featured Games' })).toBeNull()
})

test('filtering keeps existing cards mounted during refresh and does not reopen home', async () => {
  const { container } = setup()
  const results = within(screen.getByRole('region', { name: 'Game results' }))
  const card = await results.findByRole('heading', { name: 'Steam game' })
  fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'Europe' } })
  expect(window.location.pathname).toBe('/games')
  expect(container.querySelector('.results-content')?.getAttribute('aria-busy')).toBe('true')
  expect(results.getByRole('heading', { name: 'Steam game' })).toBe(card)
  await waitFor(() => expect(container.querySelector('.results-content')?.getAttribute('aria-busy')).toBe('false'))
  expect(screen.queryByRole('heading', { name: 'Featured Games' })).toBeNull()
})

test('All Games to PC retains the old results while dimming, then updates without remounting retained cards', async () => {
  window.history.replaceState({}, '', '/games')
  const { container } = setup()
  const results = within(screen.getByRole('region', { name: 'Game results' }))
  const pc = await results.findByRole('heading', { name: 'Steam game' })
  const consoleGame = results.getByRole('heading', { name: 'PlayStation 5 game' })
  fireEvent.click(screen.getByRole('button', { name: 'PC' }))
  expect(container.querySelector('.results-content')?.getAttribute('aria-busy')).toBe('true')
  expect(results.getByRole('heading', { name: 'PlayStation 5 game' })).toBe(consoleGame)
  expect(results.getByRole('heading', { name: 'Steam game' })).toBe(pc)
  await waitFor(() => expect(container.querySelector('.results-content')?.getAttribute('aria-busy')).toBe('false'))
  expect(results.queryByRole('heading', { name: 'PlayStation 5 game' })).toBeNull()
  expect(results.getByRole('heading', { name: 'Steam game' })).toBe(pc)
})
