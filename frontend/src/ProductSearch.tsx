import { useEffect, useId, useRef, useState } from 'react'
import ProductImage from './ProductImage'
import { apiFetch as fetch } from './connection'
import { matchesCategory } from './homepage'

export type Suggestion = { id: string; name: string; platform: string; region: string; price: number; imageUrl: string; originalPrice?: number; productType?: string; deviceCategories?: string[] }
type Response = { items: Suggestion[]; didYouMean: string | null }
const euro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })

export default function ProductSearch({ value, filters, onChange, onSelect, onSubmit, category = '' }: {
  category?: string
  value: string
  filters: { platform: string; region: string; minPrice: string; maxPrice: string }
  onChange: (value: string) => void
  onSelect: (product: Suggestion) => void
  onSubmit?: (query: string) => void
}) {
  const listId = useId()
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [result, setResult] = useState<{ key: string; data?: Response; error?: string } | null>(null)
  const list = useRef<HTMLUListElement>(null)
  const params = new URLSearchParams({ q: value, ...filters, category }).toString()
  const key = `${category}:${params}`
  const visible = open && value.trim().length > 0
  const current = result?.key === key ? result : null
  const items = (current?.data?.items ?? []).filter(item => matchesCategory(item.platform, category, item.productType, item.deviceCategories) && (category !== 'deals' || (item.originalPrice ?? 0) > item.price))
  const activeIndex = active >= 0 && active < items.length ? active : -1

  useEffect(() => {
    if (!visible) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(category ? `/api/products?${params}` : `/api/products/suggestions?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Suggestions unavailable. You can still search the catalog.')
        const payload = await response.json()
        const data: Response = category ? { items: payload.filter((item: Suggestion) => matchesCategory(item.platform, category, item.productType, item.deviceCategories) && (category !== 'deals' || (item.originalPrice ?? 0) > item.price)), didYouMean: null } : payload
        if (!Array.isArray(data.items)) throw new Error('Suggestions unavailable.')
        if (!controller.signal.aborted) setResult({ key, data: { ...data, items: data.items.slice(0, 5) } })
      } catch {
        if (!controller.signal.aborted) setResult({ key, error: 'Suggestions unavailable. You can still search the catalog.' })
      }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [key, visible, category, params])

  useEffect(() => {
    if (activeIndex >= 0) list.current?.children[activeIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex])

  const select = (product: Suggestion) => { setOpen(false); setActive(-1); onSelect(product) }
  return <div className="search-field autocomplete" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    <label htmlFor={inputId}>Search games</label>
    <input id={inputId} role="combobox" type="search" autoComplete="off" aria-autocomplete="list"
      aria-expanded={visible} aria-controls={visible ? listId : undefined}
      aria-activedescendant={visible && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
      placeholder="Search games, platforms and more" value={value} maxLength={120}
      onFocus={() => setOpen(true)} onChange={event => { setActive(-1); setResult(null); setOpen(true); onChange(event.target.value) }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setActive(-1) }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setOpen(true)
          if (items.length) setActive(event.key === 'ArrowDown' ? (activeIndex + 1) % items.length : (activeIndex <= 0 ? items.length - 1 : activeIndex - 1))
        }
        if (event.key === 'Enter' && visible && activeIndex >= 0) { event.preventDefault(); select(items[activeIndex]) }
        else if (event.key === 'Enter' && onSubmit) { event.preventDefault(); setOpen(false); onSubmit(value.trim()) }
      }} />
    {visible && <div className="suggestion-panel">
      <div className="suggestion-status" role="status">
        {!current ? 'Searching…' : current.error ?? (items.length === 0 ? 'No matching games.' : `${items.length} suggestions`)}
      </div>
      {current?.data?.didYouMean && <button type="button" className="did-you-mean"
        onClick={() => { const match = items.find(item => item.name === current.data?.didYouMean); if (match) select(match) }}>
        Did you mean? <strong>{current.data.didYouMean}</strong>
      </button>}
      <ul id={listId} role="listbox" aria-label="Game suggestions" ref={list}>
        {items.map((item, index) => <li key={item.id} id={`${listId}-${index}`} role="option" aria-selected={index === activeIndex}
          onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => select(item)}>
          <div className="suggestion-cover"><ProductImage name={item.name} imageUrl={item.imageUrl} decorative /></div>
          <span className="suggestion-description"><strong>{item.name}</strong><small>{item.platform}</small></span>
          <span className="suggestion-price">{euro.format(item.price)}</span>
        </li>)}
      </ul>
    </div>}
  </div>
}
