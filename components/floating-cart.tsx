"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { CART_UPDATED_EVENT, readCart } from "@/lib/cart";

export function FloatingCart() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const syncCart = () =>
      setCount(readCart().reduce((total, line) => total + line.quantity, 0));
    syncCart();
    window.addEventListener(CART_UPDATED_EVENT, syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  if (!count || pathname === "/checkout" || pathname.startsWith("/admin"))
    return null;

  return (
    <Link
      className="floating-cart"
      href="/checkout"
      aria-label={`View cart, ${count} ${count === 1 ? "item" : "items"}`}
    >
      <ShoppingBag size={22} strokeWidth={1.8} />
      <span className="floating-cart-count">{count > 99 ? "99+" : count}</span>
    </Link>
  );
}
