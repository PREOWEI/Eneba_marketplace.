import { useState } from 'react'

function coverUrl(imageUrl: string): string {
  if (!imageUrl || imageUrl === '/covers/fallback.svg' || /^https?:\/\/(?:via\.)?placeholder\.com\//i.test(imageUrl)) return '/marketplace-logo.png'
  // Keep the existing Steam app ID; replace only legacy landscape headers.
  return imageUrl.replace(/^(https:\/\/(?:cdn\.akamai|cdn\.cloudflare|shared\.akamai)\.steamstatic\.com\/steam\/apps\/\d+\/)header\.jpg(?:\?.*)?$/, '$1library_600x900.jpg')
}

export default function ProductImage({ name, imageUrl, decorative = false }: { name: string; imageUrl: string; decorative?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const source = coverUrl(imageUrl)
  const fallback = failedUrl === source || source === '/marketplace-logo.png'
  return <img className="product-image" src={fallback ? '/marketplace-logo.png' : source}
    alt={decorative ? '' : fallback ? `${name}: image unavailable` : name} loading="lazy"
    onError={fallback ? undefined : () => setFailedUrl(source)} />
}
