import type { Product } from '../marketplace'
export const euro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })
export const productTypeLabel = (type: Product['productType'] = 'game') => ({ game: 'Game', 'gift-card': 'Gift card', subscription: 'Subscription', 'game-credit': 'Game credit' })[type]
