// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('renders working children normally', () => {
  render(<ErrorBoundary><p>Marketplace ready</p></ErrorBoundary>)
  expect(screen.getByText('Marketplace ready')).toBeTruthy()
})

it('provides a recovery action when a child crashes', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  function Broken(): never { throw new Error('Render failure') }
  render(<ErrorBoundary><Broken /></ErrorBoundary>)
  expect(screen.getByRole('alert').textContent).toContain('Something went wrong')
  expect(screen.getByRole('button', { name: 'Reload marketplace' })).toBeTruthy()
})
