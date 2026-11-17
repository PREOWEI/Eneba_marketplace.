// @vitest-environment jsdom
import { StrictMode, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import useScrollReveal from './useScrollReveal'
import ProductCard from './ProductCard'
import Catalog from './Catalog'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
function Shelf({ active }: { active: boolean }) {
  const { ref, revealed } = useScrollReveal(active)
  return <section ref={ref} data-testid="shelf" data-revealed={revealed} />
}
test('observers clean up in StrictMode, ignore late callbacks and skip closed shelves', () => {
  const observers: { callback: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }[] = []
  class Observer {
    disconnect = vi.fn()
    observe = vi.fn()
    constructor(callback: IntersectionObserverCallback) { observers.push({ callback, disconnect: this.disconnect }) }
  }
  vi.stubGlobal('IntersectionObserver', Observer)
  const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>
  const view = render(<Shelf active={false} />, { wrapper })
  expect(observers).toHaveLength(0)
  view.rerender(<Shelf active />)
  expect(observers.length).toBeGreaterThan(0)
  const observer = observers[observers.length - 1]!
  view.rerender(<Shelf active={false} />)
  expect(observer.disconnect).toHaveBeenCalled()
  act(() => observer.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
  expect(screen.getByTestId('shelf').getAttribute('data-revealed')).toBe('false')
  view.rerender(<Shelf active />)
  const current = observers[observers.length - 1]!
  act(() => current.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
  expect(screen.getByTestId('shelf').getAttribute('data-revealed')).toBe('true')
  expect(current.disconnect).toHaveBeenCalled()
  view.unmount()
  expect(observers.every(item => item.disconnect.mock.calls.length > 0)).toBe(true)
})
test('a retained card keeps its entrance delay and DOM node when its index changes', () => {
  const product = { id: 'test', name: 'Test', platform: 'Steam', region: 'Global', price: 10, imageUrl: '/test.jpg' }
  const onOpen = vi.fn()
  const view = render(<ProductCard product={product} onOpen={onOpen} index={12} />)
  const card = screen.getByRole('article')
  expect(card.style.getPropertyValue('--i')).toBe('7')
  view.rerender(<ProductCard product={{ ...product }} onOpen={onOpen} index={0} />)
  expect(screen.getByRole('article')).toBe(card)
  expect(card.style.getPropertyValue('--i')).toBe('7')
})
test('initial skeletons give way to the normal empty result', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/filters') ? { platforms: [], regions: [] } : [] })))
  const view = render(<Catalog />)
  expect(view.container.querySelectorAll('.skeleton-card')).toHaveLength(5)
  expect(screen.getByRole('status').textContent).toBe('Loading games…')
  await screen.findByText(/No products match/)
  await waitFor(() => expect(view.container.querySelectorAll('.skeleton-card')).toHaveLength(0))
})
