export type ProductVariant = { id: string; color: string; size: string; price: number; stock: number; sku: string; image?: string }
export type Product = { id: string; name: string; category: string; categoryId?: string; subcategoryId?: string; description?: string; price: number; mrp: number; image: string; images?: string[]; tag?: string; tags?: string[]; searchKeywords?: string[]; sizes: string[]; colors?: string[]; color: string; variants?: ProductVariant[]; material?: string; active?: boolean; published?: boolean }

const imageSet = (images: string[]) => images.map(image => `${image}?auto=format&fit=crop&w=1200&q=85`)
const createVariants = (name: string, colors: string[], sizes: string[], price: number, stock = 8) => colors.flatMap(color => sizes.map(size => ({ id: `${name}-${color}-${size}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'), color, size, price, stock, sku: `${name.slice(0, 3).toUpperCase()}-${color.slice(0, 2).toUpperCase()}-${size}` })))

export const products: Product[] = [
  { id: 'p1', name: 'Essential Boxy Tee', category: 'T-Shirts', description: 'A considered everyday tee in a relaxed, boxy silhouette. Cut from soft heavyweight cotton for a clean drape.', price: 799, mrp: 1199, tag: 'BESTSELLER', color: 'Off-white', colors: ['Off-white', 'Black'], sizes: ['S', 'M', 'L', 'XL'], material: '100% Cotton', images: imageSet(['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab', 'https://images.unsplash.com/photo-1503341504253-dff4815485f1', 'https://images.unsplash.com/photo-1562157873-818bc0726f68', 'https://images.unsplash.com/photo-1583743814966-8936f37f5a2e']), image: imageSet(['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab'])[0], variants: createVariants('boxy', ['Off-white', 'Black'], ['S', 'M', 'L', 'XL'], 799) },
  { id: 'p2', name: 'Relaxed Linen Shirt', category: 'Shirts', price: 1499, mrp: 2199, tag: 'NEW', color: 'Stone', sizes: ['S', 'M', 'L', 'XL'], image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85' },
  { id: 'p3', name: 'Everyday Wide Leg', category: 'Trousers', price: 1899, mrp: 2599, color: 'Charcoal', sizes: ['28', '30', '32', '34'], image: 'https://images.unsplash.com/photo-1506629905607-d9c297d4c42f?auto=format&fit=crop&w=900&q=85' },
  { id: 'p4', name: 'Studio Overshirt', category: 'Jackets', price: 2299, mrp: 2999, tag: 'LIMITED', color: 'Black', sizes: ['S', 'M', 'L', 'XL'], image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=85' },
  { id: 'p5', name: 'Soft Rib Tank', category: 'T-Shirts', price: 699, mrp: 999, color: 'Black', sizes: ['S', 'M', 'L'], image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85' },
  { id: 'p6', name: 'Cropped Utility Jacket', category: 'Jackets', price: 2499, mrp: 3299, tag: 'NEW', color: 'Olive', sizes: ['S', 'M', 'L'], image: 'https://images.unsplash.com/photo-1548883354-94bcfe321cbb?auto=format&fit=crop&w=900&q=85' },
  { id: 'p7', name: 'Heavyweight Hoodie', category: 'Hoodies', price: 1999, mrp: 2799, color: 'Ash', sizes: ['S', 'M', 'L', 'XL'], image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85' },
  { id: 'p8', name: 'Straight Fit Denim', category: 'Jeans', price: 2099, mrp: 2899, color: 'Washed blue', sizes: ['28', '30', '32', '34'], image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85' },
]

export const categories = [
  ['T-SHIRTS', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=85'],
  ['SHIRTS', 'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=700&q=85'],
  ['TROUSERS', 'https://images.unsplash.com/photo-1506629905607-d9c297d4c42f?auto=format&fit=crop&w=700&q=85'],
  ['JACKETS', 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=85'],
]
