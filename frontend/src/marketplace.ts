export type Offer = {
  id: string
  seller: string
  price: number
  currency: string
  platform: string
  region: string
  delivery: string
  rating: number
  ratingCount: number
}

export type Product = {
  id: string
  name: string
  platform: string
  region: string
  price: number
  imageUrl: string
  description?: string
  originalPrice?: number
  currency?: string
  offers?: Offer[]
  productType?: 'game' | 'gift-card' | 'subscription' | 'game-credit'
  deviceCategories?: string[]
  duration?: string
  redemptionPlatform?: string
  source?: string
}

export type User = { id: string; name: string; email: string }

export type HomePayload = {
  banners: Array<{ id: string; title: string; eyebrow: string; description: string; imageUrl: string }>
  sections: Array<{ id: string; title: string; products: Product[] }>
}

export type CartLine = { product: Product; offer: Offer; quantity: number }

export type Order = {
  id: string
  createdAt: string
  total: number
  paymentStatus: string
  items: Array<{
    productId: string
    productName: string
    productType?: Product['productType']
    duration?: string
    redemptionPlatform?: string
    seller: string
    quantity: number
    unitPrice: number
    lineTotal: number
    demoKeys: string[]
  }>
}

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
