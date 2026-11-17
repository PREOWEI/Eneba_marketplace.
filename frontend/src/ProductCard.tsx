import { useState, type CSSProperties } from 'react'
import ProductImage from './ProductImage'
import type { Product } from './marketplace'

const euro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })

export default function ProductCard({ product, onOpen, index = 0, favorite = false, onToggleFavorite }: { product: Product; onOpen: (product: Product) => void; index?: number; favorite?: boolean; onToggleFavorite?: (product: Product) => void }) {
  const [entranceIndex] = useState(() => Math.min(index, 7))
  return <article className="product-card" style={{ '--i': entranceIndex } as CSSProperties}>
    {onToggleFavorite && <button className={`favorite-toggle${favorite ? ' is-favorite' : ''}`} type="button" aria-label={`${favorite ? 'Remove' : 'Add'} ${product.name} ${favorite ? 'from' : 'to'} favorites`} aria-pressed={favorite} onClick={() => onToggleFavorite(product)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
    </button>}
    <a className="product-card-link" href={`/product/${encodeURIComponent(product.id)}`}
      onClick={event => { event.preventDefault(); onOpen(product) }} aria-label={`View ${product.name}`}>
      <div className="product-image-wrap"><ProductImage name={product.name} imageUrl={product.imageUrl} /></div>
      <div className="platform-strip">{product.platform}{product.productType && product.productType !== 'game' ? ` · ${product.productType.replace('-', ' ')}` : ''}</div>
      <div className="product-info">
        <h3>{product.name}</h3>
        <p className="product-region">{product.region}</p>
        
{product.originalPrice != null && product.originalPrice > product.price && (
  <p className="price-comparison">
    <del>{euro.format(product.originalPrice)}</del>
    <span>
      {Math.round((1 - product.price / product.originalPrice) * 100)}% off
    </span>
  </p>
)}

        <div className="product-bottom">
          <span className="current-price">{euro.format(product.price)}</span>
          <span className="product-type">From</span>
        </div>
      </div>
    </a>
  </article>
}
