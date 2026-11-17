// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})

function renderRegistration() {
  window.history.replaceState({}, '', '/account')
  const fetcher = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = String(input)
    if (url === '/api/home') return { ok: true, json: async () => ({ banners: [], sections: [] }) }
    if (url === '/api/products/filters') return { ok: true, json: async () => ({ platforms: [], regions: [] }) }
    if (url === '/api/auth/me') return { ok: true, json: async () => ({ user: null }) }
    return { ok: true, json: async () => (options?.method === 'POST' ? { user: null } : {}) }
  })
  vi.stubGlobal('fetch', fetcher)
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
  return fetcher
}

function fillRegistration(email: string, name = 'Samuel John', password = 'Samuel@2026') {
  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

test.each(['   y@gmail.com', 'y@gmail.com   ', 'y @gmail.com'])('rejects email with spaces: %j', email => {
  const fetcher = renderRegistration()
  fillRegistration(email)
  expect(screen.getByText('Email addresses cannot contain spaces.')).toBeTruthy()
  expect(fetcher.mock.calls.some(([url]) => url === '/api/auth/register')).toBe(false)
})

test('rejects symbol-only names and password spaces while accepting valid values', () => {
  const fetcher = renderRegistration()
  fillRegistration('y@gmail.com', '---------', '        ')
  expect(screen.getByText('Your name should contain letters, not numbers or other symbols.')).toBeTruthy()
  expect(screen.getByText('Password cannot contain spaces.')).toBeTruthy()
  expect(fetcher.mock.calls.some(([url]) => url === '/api/auth/register')).toBe(false)
})

test('accepts valid registration values and sends the original email and password', () => {
  const fetcher = renderRegistration()
  fillRegistration('y@gmail.com')
  expect(fetcher.mock.calls.some(([url]) => url === '/api/auth/register')).toBe(true)
  const registration = fetcher.mock.calls.find(([url]) => url === '/api/auth/register')
  expect(JSON.parse(String(registration?.[1]?.body))).toEqual({ name: 'Samuel John', email: 'y@gmail.com', password: 'Samuel@2026' })
})
