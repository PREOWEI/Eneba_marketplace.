import type { HomePayload } from '../marketplace'
import type { Product } from '../marketplace'
import ProductCard from '../ProductCard'
import { homepageShelves } from '../homepage'
import RevealShelf from '../components/RevealShelf'

export default function HomeSections({ home, loading, error, browse, onOpenProduct, onToggleFavorite, favoriteIds, active }: {
  active: boolean
  home: HomePayload | null
  loading: boolean
  error: string
  browse: (values: { q?: string; category?: string; maxPrice?: string; sort?: string }) => void
  onOpenProduct: (product: Product) => void
  onToggleFavorite: (product: Product) => void
  favoriteIds: string[]
}) {
  const shelves = home ? homepageShelves(home) : []
  const featured = home?.banners[0]
  const sideBanners = home?.banners.slice(1, 3) ?? []
  const findProduct = (id: string) => home?.sections.flatMap(section => section.products).find(product => product.id === id)
  return <div className="home-content">
    <div className="shelf-heading featured-heading"><h2>Featured Games</h2><a href="#games">Explore all games ↓</a></div>
    {loading ? <p className="home-status" role="status">Loading the storefront…</p>
      : error ? <p className="home-status" role="alert">{error}</p>
      : featured ? <section className={`featured${sideBanners.length ? '' : ' featured-single'}`} aria-label="Featured games">
        <article className="feature-main">
          <div className="feature-background" aria-hidden="true" style={{ backgroundImage: `url("${featured.imageUrl}")` }} />
          <div className="feature-copy">
            <span className="eyebrow">{featured.eyebrow} · {featured.title}</span>
            <h1>Find your next great adventure.</h1>
            <p>{featured.description}</p>
            <button className="primary-button" onClick={() => browse({ q: featured.title })}>Explore {featured.title} <span aria-hidden="true">→</span></button>
          </div>
        </article>
        <div className="feature-side">
          {sideBanners.map((banner, index) => <button className="feature-small" key={banner.id} onClick={() => {
            const product = findProduct(banner.id)
            if (product) onOpenProduct(product)
            else browse({ q: banner.title })
          }}>
            <img src={banner.imageUrl || '/marketplace-logo.png'} alt="" />
            <span>{index === 0 ? 'More to discover' : 'Your next adventure'} <b aria-hidden="true">→</b><strong>{banner.title}</strong></span>
          </button>)}
        </div>
      </section> : <section className="featured-empty"><p>Find your next game at a great price.</p><button className="primary-button" onClick={() => browse({})}>Browse all games</button></section>}
    {!loading && !error && shelves.map(section => <RevealShelf key={section.id} id={section.id} active={active}>
      <div className="shelf-heading"><div><h2 id={`${section.id}-title`}>{section.title}</h2></div>
        <button onClick={() => browse(section.id === 'deals' ? { category: 'deals', sort: 'price_asc' } : {})}>View all <span aria-hidden="true">→</span></button>
      </div>
      {section.products.length > 0
        ? <div className="product-grid home-product-grid">{section.products.map((product, index) => <ProductCard index={index} key={product.id} product={product} onOpen={onOpenProduct} favorite={favoriteIds.includes(product.id)} onToggleFavorite={onToggleFavorite} />)}</div>
        : <p className="shelf-empty">No games in this collection just yet.</p>}
    </RevealShelf>)}
  </div>
}
