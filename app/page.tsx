"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Heart, Menu, Search, ShoppingBag, X } from "lucide-react";
import { Product } from "@/lib/products";
import { watchCatalog } from "@/lib/firestore-catalog";
import { CategoryNode, descendantsOf } from "@/lib/category-tree";
import {
  addCartLine,
  CART_UPDATED_EVENT,
  CartLine,
  readCart,
  writeCart,
} from "@/lib/cart";
import { useToast } from "@/components/toast";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function Home() {
  const { notify } = useToast();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [categoryNodes, setCategoryNodes] = useState<CategoryNode[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    setCart(readCart());
    const syncCart = () => setCart(readCart());
    window.addEventListener(CART_UPDATED_EVENT, syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);
  useEffect(
    () =>
      watchCatalog(setCatalog, setCategoryNodes, (error) =>
        console.warn("Live catalog update failed:", error),
      ),
    [],
  );
  const selected = categoryNodes.find(
    (category) => category.id === activeCategory,
  );
  const rootCategories = categoryNodes.filter((category) => !category.parentId);
  const displayedCategories = selected
    ? categoryNodes.filter((category) => category.parentId === selected.id)
    : rootCategories;
  const visibleIds = selected
    ? descendantsOf(categoryNodes, selected.id)
    : null;
  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return catalog.filter((product) => {
      const categoryMatch =
        !selected ||
        visibleIds?.has(
          product.categoryId ||
            product.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        );
      const searchable = [
        product.name,
        product.description,
        product.category,
        product.color,
        ...(product.tags || []),
        ...(product.searchKeywords || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        product.active !== false &&
        product.published !== false &&
        categoryMatch &&
        (!term || searchable.includes(term))
      );
    });
  }, [catalog, query, selected, visibleIds]);
  const products = catalog;
  const addCart = (product: Product) => {
    const line: CartLine = {
      productId: product.id,
      name: product.name,
      image: product.image,
      color: product.color,
      size: product.sizes[0] || "",
      quantity: 1,
      price: product.price,
      sku: product.id,
    };
    const next = addCartLine(cart, line);
    setCart(next);
    writeCart(next);
    setCartOpen(true);
    notify({
      kind: "success",
      title: "Added to cart",
      message: product.name,
      image: product.image,
    });
  };
  const changeQuantity = (index: number, amount: number) => {
    const next = cart
      .map((line, itemIndex) =>
        itemIndex === index
          ? { ...line, quantity: Math.max(0, line.quantity + amount) }
          : line,
      )
      .filter((line) => line.quantity > 0);
    setCart(next);
    writeCart(next);
  };
  return (
    <main>
      <div className="announcement">
        FREE SHIPPING ON ORDERS ABOVE ₹1,999 · EASY 7-DAY RETURNS
      </div>
      <header className="header">
        <button
          className="icon mobile-only"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <Menu />
        </button>
        <nav className={`nav ${menuOpen ? "nav-open" : ""}`}>
          <a href="#shop">SHOP</a>
          <a href="#collections">COLLECTIONS</a>
          <a href="#about">ABOUT</a>
        </nav>
        <a className="logo" href="#top">
          LATTEY <span>WALLAH</span>
        </a>
        <div className="actions">
          <button
            className="icon"
            onClick={() => document.getElementById("search")?.focus()}
            aria-label="Search"
          >
            <Search />
          </button>
          <button
            className="icon"
            onClick={() => setWishlist((value) => value)}
            aria-label="Wishlist"
          >
            <Heart />
          </button>
          <button
            className="bag"
            onClick={() => setCartOpen(true)}
            aria-label="Cart"
          >
            <ShoppingBag />
            <b>
              {cart.reduce((total, line) => total + line.quantity, 0) || ""}
            </b>
          </button>
        </div>
      </header>
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">THE EVERYDAY EDIT — 01</p>
          <h1>
            Everyday style.
            <br />
            <i>Elevated.</i>
          </h1>
          <p className="hero-sub">
            Thoughtful essentials for the way you live now. Designed in India,
            made to last.
          </p>
          <a className="button button-light" href="#shop">
            SHOP THE EDIT <ArrowRight size={16} />
          </a>
        </div>
      </section>
      <section className="category-wrap" id="collections">
        <div className="section-head">
          <div>
            <p className="eyebrow">SHOP BY CATEGORY</p>
            <h2>Find your uniform.</h2>
          </div>
        </div>
        <div className="category-grid">
          {displayedCategories.map((category) => (
              <a
                className="category-card"
                href={category.parentId ? "#shop" : "#collections"}
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
              >
                <img
                  src={
                    category.image ||
                    products.find((product) => product.categoryId === category.id)
                      ?.image ||
                    ""
                  }
                  alt={category.name}
                />
                <div>
                  <span>{category.name.toUpperCase()}</span>
                  <ArrowRight size={17} />
                </div>
              </a>
            ))}
        </div>
      </section>
      <section className="shop" id="shop">
        <div className="section-head">
          <div>
            <p className="eyebrow">
              {query ? `SEARCH RESULTS FOR “${query}”` : "THE LATEST DROP"}
            </p>
            <h2>
              {query ? `${shown.length} products found` : "Made for now."}
            </h2>
          </div>
          <div className="shop-tools">
            <div className="search">
              <Search size={16} />
              <input
                id="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products"
              />
            </div>
          </div>
        </div>
        <div className="chips">
          <button
            className={activeCategory === "All" ? "active" : ""}
            onClick={() => setActiveCategory("All")}
          >
            ALL
          </button>
          {categoryNodes
            .filter((category) => !category.parentId)
            .map((category) => (
              <button
                className={activeCategory === category.id ? "active" : ""}
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name.toUpperCase()}
              </button>
            ))}
        </div>
        {shown.length ? (
          <div className="product-grid">
            {shown.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                liked={wishlist.includes(product.id)}
                onLike={() =>
                  setWishlist((value) =>
                    value.includes(product.id)
                      ? value.filter((id) => id !== product.id)
                      : [...value, product.id],
                  )
                }
                onAdd={() => addCart(product)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-search">
            <h3>No products found</h3>
          </div>
        )}
      </section>
      <footer id="about">
        <div className="footer-brand">
          <a className="logo" href="#top">
            LATTEY <span>WALLAH</span>
          </a>
          <p>Everyday style. Elevated.</p>
        </div>
      </footer>
      {cartOpen && (
        <div className="overlay" onClick={() => setCartOpen(false)}>
          <aside className="cart" onClick={(event) => event.stopPropagation()}>
            <div className="cart-head">
              <div>
                <p className="eyebrow">YOUR BAG</p>
                <h2>
                  {cart.reduce((total, line) => total + line.quantity, 0)} items
                </h2>
              </div>
              <button className="icon" onClick={() => setCartOpen(false)}>
                <X />
              </button>
            </div>
            {cart.length ? (
              <>
                <div className="cart-list">
                  {cart.map((line, index) => (
                    <div
                      className="cart-item"
                      key={`${line.productId}-${line.color}-${line.size}-${line.sku}`}
                    >
                      <img src={line.image} alt="" />
                      <div>
                        <b>{line.name}</b>
                        <span>
                          {line.color} · {line.size || "One size"}
                        </span>
                        <div className="cart-quantity">
                          <button onClick={() => changeQuantity(index, -1)}>
                            −
                          </button>
                          <b>{line.quantity}</b>
                          <button onClick={() => changeQuantity(index, 1)}>
                            +
                          </button>
                        </div>
                        <strong>{money(line.price * line.quantity)}</strong>
                      </div>
                      <button
                        onClick={() => {
                          const next = cart.filter(
                            (_, itemIndex) => itemIndex !== index,
                          );
                          setCart(next);
                          writeCart(next);
                        }}
                        aria-label="Remove item"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="cart-total">
                  <span>Subtotal</span>
                  <b>
                    {money(
                      cart.reduce(
                        (total, line) => total + line.price * line.quantity,
                        0,
                      ),
                    )}
                  </b>
                </div>
                <a className="button button-dark full" href="/checkout">
                  CHECKOUT <ArrowRight size={16} />
                </a>
              </>
            ) : (
              <div className="empty">
                <p>Your bag is waiting.</p>
                <a href="#shop" onClick={() => setCartOpen(false)}>
                  Browse menu →
                </a>
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

function ProductCard({
  product,
  liked,
  onLike,
  onAdd,
}: {
  product: Product;
  liked: boolean;
  onLike: () => void;
  onAdd: () => void;
}) {
  return (
    <article className="product-card">
      <div
        className="product-image"
        onClick={() => (window.location.href = `/product/${product.id}`)}
      >
        <img src={product.image} alt={product.name} />
        <button
          className="wish"
          onClick={(event) => {
            event.stopPropagation();
            onLike();
          }}
          aria-label="Wishlist"
        >
          <Heart className={liked ? "filled" : ""} />
        </button>
        <button
          className="quick-add"
          onClick={(event) => {
            event.stopPropagation();
            onAdd();
          }}
        >
          ADD TO BAG <ArrowRight size={14} />
        </button>
      </div>
      <div className="product-meta">
        <div>
          <h3>{product.name}</h3>
          <p>{product.color}</p>
        </div>
        <div className="price">
          <b>{money(product.price)}</b>
          {product.mrp > product.price && <del>{money(product.mrp)}</del>}
        </div>
      </div>
    </article>
  );
}
