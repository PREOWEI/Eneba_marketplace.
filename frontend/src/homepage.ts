import type { HomePayload, Product } from './marketplace'

export function matchesCategory(platform: string, category: string, productType = 'game', deviceCategories: string[] = []): boolean {
  if (category === 'gift-cards') return productType === 'gift-card'
  if (category === 'subscriptions') return productType === 'subscription'
  if (category === 'game-credits') return productType === 'game-credit'
  if (category === 'pc' || category === 'playstation' || category === 'xbox') {
    if (productType !== 'game') return false
    if (deviceCategories.length) return deviceCategories.includes(category)
    if (category === 'playstation') return /playstation|\bps[345]\b/i.test(platform)
    if (category === 'xbox') return /xbox/i.test(platform)
    return /\b(pc|steam|gog|epic|ea app|origin|ubisoft|uplay|battle\.net|rockstar|windows)\b/i.test(platform)
  }
  if (category === 'deals') return true
  return true
}

export function homepageShelves(home: HomePayload) {
  const unique = (products: Product[]) => [...new Map(products.map(product => [product.id, product])).values()]
  const pool = unique(home.sections.flatMap(section => section.products))
  const deals = unique(home.sections.filter(section => /deal|sale/i.test(section.id)).flatMap(section => section.products))
  const dealPool = deals.length ? deals : pool.filter(product => (product.originalPrice ?? 0) > product.price)
  const popularPool = unique([...home.sections.filter(section => /popular|bestseller/i.test(section.id)).flatMap(section => section.products), ...pool])
  // Reserve deal candidates where possible, without inventing popularity or discounts.
  const dealIds = new Set(dealPool.map(product => product.id))
  const popular = [...popularPool.filter(product => !dealIds.has(product.id)), ...popularPool.filter(product => dealIds.has(product.id))].slice(0, 4)
  const used = new Set(popular.map(product => product.id))
  const special = dealPool.filter(product => !used.has(product.id)).slice(0, 4)
  return [
    { id: 'popular', title: 'Popular Games', products: popular },
    { id: 'deals', title: 'Special Deals', products: special.length ? special : dealPool.slice(0, 4) },
  ]
}
