import { expect, test } from 'vitest'
import { homepageShelves, matchesCategory } from './homepage'
import type { Product } from './marketplace'

const products: Product[] = Array.from({ length: 8 }, (_, index) => ({ id: String(index), name: 'Game ' + index, platform: 'Steam', region: 'Global', price: 10, imageUrl: '/cover.jpg' }))
test('keeps API products unique across shelves when enough are available', () => {
  const shelves = homepageShelves({ banners: [], sections: [{ id: 'bestsellers', title: '', products }, { id: 'deals', title: '', products }] })
  expect(shelves.map(shelf => shelf.title)).toEqual(['Popular Games', 'Special Deals'])
  expect(shelves.map(shelf => shelf.products.length)).toEqual([4, 4])
  expect(new Set(shelves.flatMap(shelf => shelf.products.map(product => product.id))).size).toBe(8)
})
test('does not invent deals and tolerates a small or empty catalog', () => {
  expect(homepageShelves({ banners: [], sections: [] }).every(shelf => shelf.products.length === 0)).toBe(true)
  const shelves = homepageShelves({ banners: [], sections: [{ id: 'bestsellers', title: '', products: products.slice(0, 1) }] })
  expect(shelves[0]?.products).toEqual(products.slice(0, 1))
  expect(shelves[1]?.products).toEqual([])
})
test('groups stores and mixed platform products without changing API platform values', () => {
  for (const platform of ['Steam', 'GOG', 'EA App', 'Battle.net', 'Steam / Xbox / PC']) expect(matchesCategory(platform, 'pc')).toBe(true)
  expect(matchesCategory('Steam / Xbox / PC', 'xbox')).toBe(true)
  expect(matchesCategory('PlayStation', 'playstation')).toBe(true)
  expect(matchesCategory('PlayStation', 'pc')).toBe(false)
})
