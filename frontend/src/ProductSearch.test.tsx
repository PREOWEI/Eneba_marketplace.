// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
vi.mock('./connection', () => ({ apiFetch: (url: string, options?: RequestInit) => globalThis.fetch(url, options) }))
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProductSearch from './ProductSearch'

const game = { id: 'elden-ring', name: 'Elden Ring', platform: 'Steam', region: 'Europe', price: 39.99, imageUrl: '/cover.jpg' }
const filters = { platform: 'Steam', region: 'Europe', minPrice: '30', maxPrice: '40' }
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })
function Harness({ select = vi.fn() }) {
  const [value, setValue] = useState('')
  return <ProductSearch value={value} filters={filters} onChange={setValue} onSelect={item => { select(item); setValue(item.name) }} />
}
function mockSuggestions(items = [game], didYouMean: string | null = 'Elden Ring') {
  const fetcher = vi.fn(async (_url: string, _options?: RequestInit) => ({ ok: true, json: async () => ({ items, didYouMean }) }))
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}
test('debounces requests for 250ms and includes current filters', async () => {
  vi.useFakeTimers()
  const fetcher = mockSuggestions()
  render(<Harness />)
  const input = screen.getByRole('combobox')
  fireEvent.change(input, { target: { value: 'eld' } })
  await act(async () => { vi.advanceTimersByTime(200) })
  fireEvent.change(input, { target: { value: 'elden rign' } })
  await act(async () => { vi.advanceTimersByTime(249) })
  expect(fetcher).not.toHaveBeenCalled()
  await act(async () => { vi.advanceTimersByTime(1) })
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(fetcher.mock.calls[0]?.[0]).toContain('q=elden+rign&platform=Steam&region=Europe&minPrice=30&maxPrice=40')
})
test('renders cover/title/platform/price and selects with arrows and Enter', async () => {
  mockSuggestions()
  const select = vi.fn()
  render(<Harness select={select} />)
  const input = screen.getByRole('combobox')
  fireEvent.change(input, { target: { value: 'elden rign' } })
  const option = await screen.findByRole('option')
  expect(option.textContent).toContain('Elden Ring')
  expect(option.textContent).toContain('Steam')
  expect(option.textContent).toContain('€39.99')
  expect(option.querySelector('img')?.getAttribute('src')).toBe('/cover.jpg')
  expect(screen.getByRole('button', { name: /Did you mean/ })).toBeTruthy()
  fireEvent.keyDown(input, { key: 'ArrowUp' })
  expect(option.getAttribute('aria-selected')).toBe('true')
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(select).toHaveBeenCalledWith(game)
  expect(screen.queryByRole('listbox')).toBeNull()
  expect((input as HTMLInputElement).value).toBe('Elden Ring')
})
test('supports clicking suggestions and dismissing with Escape', async () => {
  mockSuggestions()
  const select = vi.fn()
  render(<Harness select={select} />)
  const input = screen.getByRole('combobox')
  fireEvent.change(input, { target: { value: 'eld' } })
  await screen.findByRole('option')
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(screen.queryByRole('listbox')).toBeNull()
  fireEvent.focus(input)
  fireEvent.click(await screen.findByRole('option'))
  expect(select).toHaveBeenCalledWith(game)
})
test('caps suggestions at five and lets Did you mean select a product', async () => {
  mockSuggestions(Array.from({ length: 7 }, (_, index) => ({ ...game, id: String(index) })))
  const select = vi.fn()
  render(<Harness select={select} />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'elden rign' } })
  await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(5))
  fireEvent.click(screen.getByRole('button', { name: /Did you mean/ }))
  expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: '0' }))
})
test('handles no matches and suggestion service errors', async () => {
  mockSuggestions([], null)
  render(<Harness />)
  const input = screen.getByRole('combobox')
  fireEvent.change(input, { target: { value: 'none' } })
  expect(await screen.findByText('No matching games.')).toBeTruthy()
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })))
  fireEvent.change(input, { target: { value: 'another' } })
  expect(await screen.findByText(/Suggestions unavailable/)).toBeTruthy()
})

test('ignores a late response from an older search', async () => {
  let resolveOld!: (value: unknown) => void
  const fetcher = vi.fn((url: string) => url.includes('q=old')
    ? new Promise(resolve => { resolveOld = resolve })
    : Promise.resolve({ ok: true, json: async () => ({ items: [game], didYouMean: null }) }))
  vi.stubGlobal('fetch', fetcher)
  render(<Harness />)
  const input = screen.getByRole('combobox')
  fireEvent.change(input, { target: { value: 'old' } })
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
  fireEvent.change(input, { target: { value: 'elden' } })
  await screen.findByRole('option')
  await act(async () => { resolveOld({ ok: true, json: async () => ({ items: [{ ...game, name: 'Old result' }], didYouMean: null }) }) })
  expect(screen.queryByText('Old result')).toBeNull()
  expect(screen.getByRole('option').textContent).toContain('Elden Ring')
})
