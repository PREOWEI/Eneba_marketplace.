// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ConnectionGate from './ConnectionGate'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

it('keeps children hidden through cold start and initial data recovery', async () => {
  vi.useFakeTimers()
  let productCalls = 0
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/api/health') return Response.json({ status: 'ok' })
    if (url === '/api/products' && ++productCalls < 3) return new Response('<html>Sleeping</html>', { status: 502 })
    return Response.json([])
  }))
  render(<ConnectionGate><p>Marketplace loaded</p></ConnectionGate>)
  expect(screen.getByRole('status').textContent).toContain('Connecting to marketplace server...')
  await act(async () => { await vi.advanceTimersByTimeAsync(500) })
  expect(screen.queryByText('Marketplace loaded')).toBeNull()
  await act(async () => { await vi.runAllTimersAsync() })
  expect(screen.getByText('Marketplace loaded')).toBeTruthy()
})

it('shows manual Retry after timeout and mounts children after recovery', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Unavailable</html>', { status: 503 })))
  render(<ConnectionGate><p>Marketplace loaded</p></ConnectionGate>)
  await act(async () => { await vi.runAllTimersAsync() })
  expect(screen.getByRole('alert')).toBeTruthy()
  vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url === '/api/health' ? { status: 'ok' } : [])))
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await vi.runAllTimersAsync() })
  expect(screen.getByText('Marketplace loaded')).toBeTruthy()
})
