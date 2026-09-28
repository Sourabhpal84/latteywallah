'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ChevronDown, Heart, Menu, Search, ShoppingBag, Sparkles, X } from 'lucide-react'
import { categories, products, Product } from '@/lib/products'
import { loadCategoriesFromFirestore, loadProductsFromFirestore } from '@/lib/firestore-catalog'
import { CategoryNode, descendantsOf, slugify } from '@/lib/category-tree'
import { loadCategoryNodesFromFirestore } from '@/lib/firestore-catalog'

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`

export default function Home() {
  const [cart, setCart] = useState<Product[]>([])
  const [catalog, setCatalog] = useState<Product[]>(products)
  const [categoryCatalog, setCategoryCatalog] = useState(categories)
  const [categoryNodes, setCategoryNodes] = useState<CategoryNode[]>([])
  const [wishlist, setWishlist] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const loadCatalog = async () => {
      const savedProducts = localStorage.getItem('lattey-wallah-products')
      const savedCategories = localStorage.getItem('lattey-wallah-categories')
      const loadedProducts = await loadProductsFromFirestore(savedProducts ? JSON.parse(savedProducts) : products)
      const loadedCategories = await loadCategoriesFromFirestore(savedCategories ? JSON.parse(savedCategories) : categories.map(([name]) => name))
      setCatalog(loadedProducts)
      setCategoryCatalog(loadedCategories.map(name => [name.toUpperCase(), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=85']))
      const fallbackNodes = loadedCategories.map((name, index) => ({ id: slugify(name), name, slug: slugify(name), parentId: null, active: true, sortOrder: index }))
      setCategoryNodes(await loadCategoryNodesFromFirestore(fallbackNodes))
    }
    loadCatalog().catch(() => undefined)
    const refresh = () => { loadCatalog().catch(() => undefined) }
    window.addEventListener('lattey-catalog-updated', refresh)
    return () => window.removeEventListener('lattey-catalog-updated', refresh)
  }, [])

  const shown = useMemo(() => { const selected = categoryNodes.find(category => category.id === activeCategory); const visibleIds = selected ? descendantsOf(categoryNodes, selected.id) : null; const term = query.trim().toLowerCase(); return catalog.filter(product => { const categoryMatch = !selected || visibleIds?.has(product.categoryId || slugify(product.category)); const searchable = [product.name, product.description, product.category, product.color, product.material, ...(product.tags || []), ...(product.searchKeywords || []), ...(product.variants || []).map(variant => `${variant.sku} ${variant.color} ${variant.size}`)].filter(Boolean).join(' ').toLowerCase().replace(/-/g, ' '); const isAvailable = product.active !== false && product.published !== false; return isAvailable && categoryMatch && (!term || searchable.includes(term)) }) }, [activeCategory, query, catalog, categoryNodes])
  const childCategories = categoryNodes.filter(category => category.parentId === activeCategory)
  const toggleWishlist = (id: string) => setWishlist(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id])
  const addCart = (product: Product) => { const next = [...cart, product]; setCart(next); localStorage.setItem('lattey-wallah-cart', JSON.stringify(next)); setCartOpen(true) }

  return <main>
    <div className="announcement">FREE SHIPPING ON ORDERS ABOVE ₹1,999 <span>·</span> EASY 7-DAY RETURNS</div>
    <header className="header">
      <button className="icon mobile-only" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">{menuOpen ? <X /> : <Menu />}</button>
      <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}><a href="#shop">SHOP</a><a href="#collections">COLLECTIONS</a><a href="#about">ABOUT</a></nav>
      <a className="logo" href="#top">LATTEY <span>WALLAH</span></a>
      <div className="actions"><button className="icon search-toggle" onClick={() => document.getElementById('search')?.focus()} aria-label="Search"><Search /></button><button className="icon" onClick={() => setWishlist(v => v)} aria-label="Wishlist"><Heart className={wishlist.length ? 'filled' : ''} /></button><button className="bag" onClick={() => setCartOpen(true)} aria-label="Cart"><ShoppingBag /><b>{cart.length || ''}</b></button></div>
    </header>

    <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow">THE EVERYDAY EDIT — 01</p><h1>Everyday style.<br /><i>Elevated.</i></h1><p className="hero-sub">Thoughtful essentials for the way you live now. Designed in India, made to last.</p><a className="button button-light" href="#shop">SHOP THE EDIT <ArrowRight size={16} /></a></div><div className="hero-note"><span>01 / 03</span><span>SCROLL TO EXPLORE ↓</span></div></section>

    <section className="intro"><p className="eyebrow">WHY LATTEY WALLAH</p><h2>Less, but better.</h2><p>Wardrobe staples, considered down to the last stitch. Clean silhouettes, honest fabrics, and a point of view that’s all your own.</p></section>

    <section className="category-wrap" id="collections"><div className="section-head"><div><p className="eyebrow">SHOP BY CATEGORY</p><h2>Find your uniform.</h2></div><a href="#shop" className="text-link">VIEW ALL <ArrowRight size={15} /></a></div><div className="category-grid">{categoryNodes.filter(category => !category.parentId).map(category => <a className="category-card" href="#shop" key={category.id} onClick={() => setActiveCategory(category.id)}><img src={category.image || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=85'} alt={category.name} /><div><span>{category.name.toUpperCase()}</span><ArrowRight size={17} /></div></a>)}</div></section>

    <section className="shop" id="shop"><div className="section-head"><div><p className="eyebrow">{query ? `SEARCH RESULTS FOR “${query}”` : 'THE LATEST DROP'}</p><h2>{query ? `${shown.length} products found` : 'Made for now.'}</h2></div><div className="shop-tools"><div className="search"><Search size={16} /><input id="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products, colours, tags" /></div><button className="filter">FILTER <ChevronDown size={15} /></button></div></div><div className="chips"><button className={activeCategory === 'All' ? 'active' : ''} onClick={() => setActiveCategory('All')}>ALL</button>{categoryNodes.filter(category => !category.parentId).map(category => <button className={activeCategory === category.id ? 'active' : ''} key={category.id} onClick={() => setActiveCategory(category.id)}>{category.name.toUpperCase()}</button>)}</div>{childCategories.length > 0 && <div className="chips secondary-chips">{childCategories.map(category => <button className={activeCategory === category.id ? 'active' : ''} key={category.id} onClick={() => setActiveCategory(category.id)}>{category.name.toUpperCase()}</button>)}</div>}{shown.length ? <div className="product-grid">{shown.map(p => <ProductCard key={p.id} product={p} liked={wishlist.includes(p.id)} onLike={() => toggleWishlist(p.id)} onAdd={() => addCart(p)} />)}</div> : <div className="empty-search"><h3>No products found</h3><p>Try searching for another product, category or keyword.</p></div>}</section>

    <section className="manifesto"><div><p className="eyebrow">OUR PHILOSOPHY</p><h2>Clothes that<br /><i>stay with you.</i></h2></div><p>Good design doesn’t demand attention. It earns a place in your everyday — quietly, confidently, completely.</p><a className="button button-dark" href="#about">OUR STORY <ArrowRight size={16} /></a></section>

    <section className="newsletter"><div><p className="eyebrow">STAY IN THE LOOP</p><h2>Good things,<br /><i>in your inbox.</i></h2></div><form onSubmit={e => e.preventDefault()}><label htmlFor="email">Be the first to know about new drops and stories.</label><div className="email-row"><input id="email" type="email" placeholder="Your email address" required /><button type="submit">JOIN <ArrowRight size={16} /></button></div></form></section>

    <footer id="about"><div className="footer-brand"><a className="logo" href="#top">LATTEY <span>WALLAH</span></a><p>Everyday style. Elevated.</p></div><div className="footer-links"><div><p className="eyebrow">EXPLORE</p><a href="#shop">Shop all</a><a href="#collections">Collections</a><a href="#about">Our story</a></div><div><p className="eyebrow">HELP</p><a href="#about">Contact</a><a href="#about">Shipping & returns</a><a href="#about">Size guide</a></div><div><p className="eyebrow">FOLLOW ALONG</p><a href="#about">Instagram ↗</a><a href="#about">Pinterest ↗</a></div></div><div className="footer-bottom"><span>© 2024 LATTEY WALLAH</span><span>MADE WITH INTENTION IN INDIA</span><span>PRIVACY · TERMS</span></div></footer>

    {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)}><aside className="cart" onClick={e => e.stopPropagation()}><div className="cart-head"><div><p className="eyebrow">YOUR BAG</p><h2>{cart.length} {cart.length === 1 ? 'item' : 'items'}</h2></div><button className="icon" onClick={() => setCartOpen(false)}><X /></button></div>{cart.length ? <><div className="cart-list">{cart.map((p, i) => <div className="cart-item" key={`${p.id}-${i}`}><img src={p.image} alt="" /><div><b>{p.name}</b><span>{p.color} · M</span><strong>{money(p.price)}</strong></div><button onClick={() => { const next = cart.filter((_, j) => j !== i); setCart(next); localStorage.setItem('lattey-wallah-cart', JSON.stringify(next)) }}><X size={15} /></button></div>)}</div><div className="cart-total"><span>Subtotal</span><b>{money(cart.reduce((a, p) => a + p.price, 0))}</b></div><a className="button button-dark full" href="/checkout">CHECKOUT <ArrowRight size={16} /></a></> : <div className="empty"><Sparkles size={24} /><p>Your bag is waiting.</p><a href="#shop" onClick={() => setCartOpen(false)}>Explore the edit →</a></div>}</aside></div>}
  </main>
}

function ProductCard({ product, liked, onLike, onAdd }: { product: Product; liked: boolean; onLike: () => void; onAdd: () => void }) {
  return <article className="product-card"><div className="product-image" onClick={() => window.location.href = `/product/${product.id}`} role="link" tabIndex={0}><img src={product.image} alt={product.name} />{product.tag && <span className="product-tag">{product.tag}</span>}<button className="wish" onClick={event => { event.stopPropagation(); onLike() }} aria-label="Wishlist"><Heart size={18} className={liked ? 'filled' : ''} /></button><button className="quick-add" onClick={event => { event.stopPropagation(); onAdd() }}>ADD TO BAG <ArrowRight size={14} /></button></div><div className="product-meta" onClick={() => window.location.href = `/product/${product.id}`}><div><h3>{product.name}</h3><p>{product.color}</p></div><div className="price"><b>{money(product.price)}</b>{product.mrp > product.price && <del>{money(product.mrp)}</del>}</div></div></article>
}
