import { afterEach, expect, it, vi } from 'vitest'
import { apiFetch, connect } from './connection'

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

it('shares cold-start recovery and succeeds after temporary errors', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn().mockResolvedValueOnce(new Response('', { status: 502 })).mockResolvedValueOnce(new Response('{}'))
  vi.stubGlobal('fetch', fetch)
  const first = connect()
  expect(connect()).toBe(first)
  await vi.runAllTimersAsync()
  await first
  expect(fetch).toHaveBeenCalledTimes(2)
})

it('loads successful GET requests immediately', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('[]'))
  vi.stubGlobal('fetch', fetch)
  expect(await (await apiFetch('/api/products')).json()).toEqual([])
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('stops on permanent unavailability', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })))
  const result = expect(connect()).rejects.toThrow('unavailable')
  await vi.runAllTimersAsync()
  await result
})

it('never retries a POST', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('', { status: 502 }))
  vi.stubGlobal('fetch', fetch)
  expect((await apiFetch('/api/checkout', { method: 'POST' })).status).toBe(502)
  expect(fetch).toHaveBeenCalledTimes(1)
})
