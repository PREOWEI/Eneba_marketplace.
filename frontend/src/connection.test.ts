import { afterEach, expect, it, vi } from 'vitest'
import { apiFetch, connect, initializeMarketplace } from './connection'

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

it('shares cold-start recovery and succeeds after temporary errors', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn().mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 })).mockResolvedValueOnce(Response.json({ status: 'ok' }))
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

it('rejects HTML and wrong health JSON until exact readiness', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn()
    .mockResolvedValueOnce(new Response('<html>Starting</html>'))
    .mockResolvedValueOnce(Response.json({ status: 'starting' }))
    .mockResolvedValueOnce(Response.json({ status: 'ok' }))
  vi.stubGlobal('fetch', fetch)
  const result = connect()
  await vi.runAllTimersAsync()
  await result
  expect(fetch).toHaveBeenCalledTimes(3)
})

it('waits for initial data after health succeeds and retries HTML and network failures', async () => {
  vi.useFakeTimers()
  let products = 0
  const fetch = vi.fn(async (url: string) => {
    if (url === '/api/health') return Response.json({ status: 'ok' })
    if (url === '/api/products') {
      products++
      if (products === 1) return new Response('<html>Bad gateway</html>', { status: 502 })
      if (products === 2) throw new TypeError('Network failure')
      if (products === 3) return new Response('<html>Starting</html>')
    }
    return Response.json([])
  })
  vi.stubGlobal('fetch', fetch)
  let ready = false
  const result = initializeMarketplace().then(() => { ready = true })
  await vi.advanceTimersByTimeAsync(500)
  expect(ready).toBe(false)
  await vi.runAllTimersAsync()
  await result
  expect(products).toBe(4)
  expect(fetch.mock.calls.filter(([url]) => url === '/api/health')).toHaveLength(1)
})

it('can retry startup after the bounded failure', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn(async () => new Response('Unavailable', { status: 504 })))
  const failed = expect(initializeMarketplace()).rejects.toThrow('unavailable')
  await vi.runAllTimersAsync()
  await failed
  vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url === '/api/health' ? { status: 'ok' } : [])))
  await initializeMarketplace()
})
