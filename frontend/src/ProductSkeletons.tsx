export default function ProductSkeletons() {
  return <><p className="results-count" role="status">Loading games…</p>
    <div className="product-grid skeleton-grid" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => <div className="product-card skeleton-card" key={index}>
        <div className="product-card-link">
          <div className="product-image-wrap skeleton-surface" />
          <div className="platform-strip skeleton-surface">&nbsp;</div>
          <div className="product-info"><h3><span className="skeleton-line" /><span className="skeleton-line" /></h3>
            <p className="product-region"><span className="skeleton-line" /></p>
            <div className="product-bottom"><span className="current-price skeleton-price">&nbsp;</span></div>
          </div>
        </div>
      </div>)}
    </div></>
}
