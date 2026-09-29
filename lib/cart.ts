export const CART_STORAGE_KEY = 'lattey-wallah-cart'
export const CART_UPDATED_EVENT = 'lattey-cart-updated'

export type CartLine = {
  productId: string
  name: string
  image: string
  color: string
  size: string
  quantity: number
  price: number
  sku: string
}

export function cartLineKey(line: Pick<CartLine, 'productId' | 'color' | 'size' | 'sku'>) {
  return [line.productId, line.color, line.size, line.sku].join('::').toLowerCase()
}

export function readCart(): CartLine[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]') as Partial<CartLine>[]
    return saved.filter(item => item.productId || item.name).map(item => ({
      productId: item.productId || item.sku || item.name || '', name: item.name || '', image: item.image || '',
      color: item.color || '', size: item.size || '', quantity: Math.max(1, Number(item.quantity) || 1),
      price: Math.max(0, Number(item.price) || 0), sku: item.sku || item.productId || '',
    }))
  } catch { return [] }
}

export function writeCart(lines: CartLine[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines))
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export function addCartLine(lines: CartLine[], line: CartLine) {
  const index = lines.findIndex(item => cartLineKey(item) === cartLineKey(line))
  if (index === -1) return [...lines, line]
  return lines.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: item.quantity + line.quantity } : item)
}
