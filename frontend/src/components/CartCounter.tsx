import { useState } from 'react'

export default function CartCounter({ count }: { count: number }) {
  const [change, setChange] = useState({ count, revision: 0 })
  if (change.count !== count) setChange({ count, revision: change.revision + 1 })
  return <span key={change.revision} className={`cart-count${change.revision ? ' cart-count-changed' : ''}`}>{count}</span>
}
