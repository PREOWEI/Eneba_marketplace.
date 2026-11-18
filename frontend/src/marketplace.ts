export type * from './types/marketplace'
import type { Product, HomePayload } from './types/marketplace'

export function homePayload(value: unknown): HomePayload {
  if (Array.isArray(value)) {
    const products = value as Product[]
    return {
      banners: products.slice(0, 3).map((product, index) => ({
        id: product.id,
        title: product.name,
        eyebrow: index === 0 ? 'Featured game' : 'Find your next game',
        description: product.description ?? '',
        imageUrl: product.imageUrl,
      })),
      sections: [{ id: 'bestsellers', title: 'Bestsellers', products }],
    }
  }
  if (!value || typeof value !== 'object') throw new Error('The storefront response was invalid.')
  const payload = value as Partial<HomePayload>
  if (!Array.isArray(payload.banners) || !Array.isArray(payload.sections)) {
    throw new Error('The storefront response was invalid.')
  }
  return payload as HomePayload
}
