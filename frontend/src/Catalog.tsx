import { useEffect, useMemo, useState, type ReactNode } from 'react'
import ProductCard from './ProductCard'
import ProductSkeletons from './ProductSkeletons'
import ProductSearch from './ProductSearch'
import type { Product } from './marketplace'
import { matchesCategory } from './homepage'

const defaults = { q: '', platform: '', activation: '', productName: '', region: '', minPrice: '', maxPrice: '', sort: 'default', id: '', category: '', onSaleOnly: '' }

type Browse = (values: Partial<typeof defaults>) => void
export default function Catalog({ renderStorefront, onOpenProduct = () => {}, onToggleFavorite, favoriteIds = [], location, onNavigate }: { renderStorefront?: (search: ReactNode, browse: Browse, platforms: string[]) => ReactNode; onOpenProduct?: (product: Product) => void; onToggleFavorite?: (product: Product) => void; favoriteIds?: string[]; location?: string; onNavigate?: (path: string, replace?: boolean) => void }) {
  const [localSearch, setLocalSearch] = useState(window.location.search)
  const searchParams = location === undefined ? localSearch : location.includes('?') ? location.slice(location.indexOf('?')) : ''
  const query = useMemo(() => {
    const params = new URLSearchParams(searchParams)
    return { ...defaults, category: params.get('category') ?? '', q: params.get('q') ?? '', platform: params.get('platform') ?? '', activation: params.get('activation') ?? '', productName: params.get('productName') ?? '', region: params.get('region') ?? '',
      minPrice: params.get('minPrice') ?? '', maxPrice: params.get('maxPrice') ?? '', sort: params.get('sort') ?? defaults.sort, id: params.get('id') ?? '', onSaleOnly: params.get('onSaleOnly') ?? '' }
  }, [searchParams])
  const setQuery = (next: typeof defaults, push = false) => {
    const params = new URLSearchParams(Object.entries(next).filter(([, value]) => value !== ''))
    if (onNavigate) onNavigate(`/games?${params}`, !push && location?.startsWith('/games'))
    else setLocalSearch(`?${params}`)
  }
  const [products, setProducts] = useState<Product[]>([])
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([])
  const [displayedCategory, setDisplayedCategory] = useState(query.category)
  const [facets, setFacets] = useState<{ platforms: string[]; regions: string[] }>({ platforms: [], regions: [] })
  const [settledRequest, setSettledRequest] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const requestKey = `${searchParams}:${retry}`
  const loading = settledRequest !== requestKey
  const invalidRange = query.minPrice !== '' && query.maxPrice !== '' && Number(query.minPrice) > Number(query.maxPrice)

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setError('')
      if (invalidRange) { setSettledRequest(requestKey); return }
      try {
        const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== ''))
        const [response, filterResponse, categoryResponse] = await Promise.all([
          fetch(`/api/products?${params}`, { signal: controller.signal }),
          fetch('/api/products/filters', { signal: controller.signal }),
          // Options depend only on the category, never on the selected result filters.
          fetch(`/api/products?${new URLSearchParams({ category: query.category })}`, { signal: controller.signal }),
        ])
        if (!response.ok || !filterResponse.ok || !categoryResponse.ok) throw new Error('Unable to load products. Please try again.')
        const [data, filters, categoryData] = await Promise.all([response.json(), filterResponse.json(), categoryResponse.json()])
        if (!Array.isArray(data) || !Array.isArray(categoryData) || !Array.isArray(filters.platforms) || !Array.isArray(filters.regions)) throw new Error('Unexpected server response.')
        if (!controller.signal.aborted) { setProducts(data); setCategoryProducts(categoryData); setDisplayedCategory(query.category); setFacets(filters) }
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load products.')
      } finally {
        if (!controller.signal.aborted) setSettledRequest(requestKey)
      }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, requestKey, invalidRange])

  const visibleProducts = products.filter(product => matchesCategory(product.platform, displayedCategory, product.productType, product.deviceCategories) && (displayedCategory !== 'deals' || (product.originalPrice ?? 0) > product.price) && (query.onSaleOnly !== '1' || (product.originalPrice ?? 0) > product.price))
  const update = (key: keyof typeof defaults, value: string) => setQuery({ ...query, [key]: value, id: ['q', 'platform', 'activation', 'productName'].includes(key) ? '' : query.id })
  const browse: Browse = values => {
    setQuery({ ...query, category: '', platform: '', activation: '', productName: '', id: '', ...values }, true)
  }
  const facetValues = [...new Set(categoryProducts.map(product => product.platform).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const activationValues = [...new Set(categoryProducts.map(product => product.redemptionPlatform || product.platform).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const categoryFilter = query.category === 'pc' ? { label: 'Store / Launcher', key: 'platform' as const, values: facetValues.filter(value => /steam|epic|ea app|origin|gog|battle\.net|ubisoft|uplay|rockstar|windows/i.test(value)) }
    : query.category === 'playstation' ? { label: 'Console', key: 'platform' as const, values: facetValues.filter(value => /ps4|ps5|playstation/i.test(value)) }
      : query.category === 'xbox' ? { label: 'Console', key: 'platform' as const, values: facetValues.filter(value => /xbox one|series x|series s|xbox/i.test(value)) }
        : query.category === 'gift-cards' ? { label: 'Brand', key: 'platform' as const, values: facetValues }
          : query.category === 'subscriptions' ? { label: 'Service', key: 'platform' as const, values: facetValues }
            : query.category === 'game-credits' ? { label: 'Game', key: 'platform' as const, values: facetValues }
              : { label: 'Activation / Service', key: 'activation' as const, values: activationValues }
  const search = <ProductSearch category={query.category} value={query.q} filters={{ platform: query.platform, region: query.region, minPrice: query.minPrice, maxPrice: query.maxPrice }}
    onChange={value => update('q', value)} onSelect={product => setQuery({ ...query, q: product.name, id: product.id })} />
  return <>
    {renderStorefront?.(search, browse, facets.platforms)}
    <main className="catalog" id="games" aria-labelledby="catalog-title">
      <div className="catalog-heading"><div><p className="section-kicker">THE MARKETPLACE</p><h1 id="catalog-title">{categoryTitle(query.category)}</h1></div></div>
      {!renderStorefront && search}
      <div className="catalog-layout">
    <aside className="catalog-controls" aria-label="Filter games">
      <div className="filter-heading"><h2>Filters</h2><button type="button" onClick={() => setQuery({ ...query, platform: '', activation: '', productName: '', region: '', minPrice: '', maxPrice: '', onSaleOnly: '', id: '' })}>Clear filters</button></div>
      <label>{categoryFilter.label}<select value={query[categoryFilter.key]} onChange={event => update(categoryFilter.key, event.target.value)}><option value="">All {categoryFilter.label}</option>{categoryFilter.values.map(value => <option key={value} value={value}>{value === 'gift-card' ? 'Gift Cards' : value === 'game-credit' ? 'Game Credits' : value === 'subscription' ? 'Subscriptions' : value === 'game' ? 'Games' : value}</option>)}</select></label>
      <label>Region<select value={query.region} onChange={event => update('region', event.target.value)}><option value="">All Regions</option><option value="Global">Global</option><option value="Europe">Europe</option></select></label>
      <div className="price-filter-row"><label>Min price (€)<input type="number" min="0" step="0.01" placeholder="Min price" value={query.minPrice} onChange={event => update('minPrice', event.target.value)} /></label><label>Max price (€)<input type="number" min="0" step="0.01" placeholder="Max price" value={query.maxPrice} onChange={event => update('maxPrice', event.target.value)} /></label></div>
      <label className="checkbox-filter"><input type="checkbox" checked={query.onSaleOnly === '1'} onChange={event => update('onSaleOnly', event.target.checked ? '1' : '')} /> On Sale Only</label>
      
    </aside>
    <section className="catalog-results" aria-label="Game results">
    <div className="results-toolbar"><label>Sort by<select value={query.sort} onChange={event => update('sort', event.target.value)}><option value="default">Default</option><option value="price_asc">Price: Low to High</option><option value="price_desc">Price: High to Low</option><option value="name_asc">Name: A to Z</option><option value="name_desc">Name: Z to A</option></select></label></div>
    <div className="results-content" aria-live="polite" aria-busy={loading}>
      {invalidRange ? <p className="catalog-status" role="alert">Minimum price must not exceed maximum price.</p>
        : loading && settledRequest === null ? <ProductSkeletons />
        : error && !loading ? <div className="catalog-status" role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>Retry</button></div>
        : visibleProducts.length === 0 ? <p className="catalog-status">No products match your search. Try another name or clear your filters.</p>
        : <><p className="results-count">{visibleProducts.length} products found</p><div className="product-grid">
          {visibleProducts.map((product, index) => <ProductCard index={index} key={product.id} product={product} onOpen={onOpenProduct} favorite={favoriteIds.includes(product.id)} onToggleFavorite={onToggleFavorite} />)}
        </div></>}
    </div>
    </section></div></main>
  </>
}

function categoryTitle(category: string): string {
  return ({ pc: 'PC Games', playstation: 'PlayStation Games', xbox: 'Xbox Games', 'gift-cards': 'Gift Cards', subscriptions: 'Subscriptions', 'game-credits': 'Game Credits', deals: 'Deals' } as Record<string, string>)[category] ?? 'All Products'
}
