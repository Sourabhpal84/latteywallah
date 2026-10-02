"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Package, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { dateTime, money, StatusBadge } from "@/components/order-ui";

type Order = {
  id: string;
  displayOrderId?: string;
  totalAmount?: number;
  orderStatus?: string;
  paymentStatus?: string;
  createdAt?: string;
  items?: Array<{ name?: string; image?: string; quantity?: number }>;
};
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!auth) {
      setSignedOut(true);
      setLoading(false);
      return;
    }
    let stop: (() => void) | undefined;
    return auth.onAuthStateChanged((user) => {
      stop?.();
      if (!user) {
        setSignedOut(true);
        setLoading(false);
        return;
      }
      setSignedOut(false);
      stop = onSnapshot(
        query(collection(db, "orders"), where("customerId", "==", user.uid)),
        (snapshot) => {
          setOrders(
            snapshot.docs
              .map((item) => ({
                id: item.id,
                ...(item.data() as Omit<Order, "id">),
              }))
              .filter((order) => order.paymentStatus === "PAID")
              .sort((a, b) =>
                String(b.createdAt).localeCompare(String(a.createdAt)),
              ),
          );
          setLoading(false);
        },
        () => {
          setError("Unable to load orders. Please try again.");
          setLoading(false);
        },
      );
    });
    return () => stop?.();
  }, []);
  if (signedOut)
    return (
      <main className="order-page">
        <section className="order-card">
          <p className="eyebrow">YOUR ORDERS</p>
          <h1>Sign in to see your orders.</h1>
          <Link className="button button-dark" href="/account/login">
            SIGN IN <ArrowRight size={15} />
          </Link>
        </section>
      </main>
    );
  return (
    <main className="order-page">
      <header className="detail-header">
        <Link href="/account" className="back-link">
          <ArrowLeft size={16} /> ACCOUNT
        </Link>
        <span className="logo">MY ORDERS</span>
      </header>
      <section className="orders-page-content">
        <div className="orders-page-heading">
          <div>
            <p className="eyebrow">ORDER HISTORY</p>
            <h1>Everything you’ve ordered.</h1>
            <p>
              Track every order in real time, from confirmation to delivery.
            </p>
          </div>
          <span className="orders-count">
            <Package size={18} /> {orders.length} order
            {orders.length === 1 ? "" : "s"}
          </span>
        </div>
        {loading ? (
          <div className="customer-orders-loading">
            <span />
            <span />
            <span />
          </div>
        ) : error ? (
          <div className="customer-orders-empty">{error}</div>
        ) : orders.length ? (
          <div className="customer-orders-list">
            {orders.map((order) => (
              <Link
                className="customer-order-row"
                href={`/orders/${order.id}`}
                key={order.id}
              >
                <img src={order.items?.[0]?.image || ""} alt="" />
                <div className="customer-order-main">
                  <div>
                    <b>#{order.displayOrderId || order.id.slice(0, 8)}</b>
                    <small>{dateTime(order.createdAt)}</small>
                  </div>
                  <p>
                    {order.items
                      ?.slice(0, 2)
                      .map((item) => `${item.name} × ${item.quantity}`)
                      .join(" · ") || "Order details"}
                  </p>
                  <div className="customer-order-badges">
                    <StatusBadge status={order.orderStatus} />
                    <StatusBadge status={order.paymentStatus} payment />
                  </div>
                </div>
                <div className="customer-order-total">
                  <b>{money(order.totalAmount)}</b>
                  <span>
                    TRACK <ArrowRight size={15} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="customer-orders-empty">
            <ShoppingBag size={28} />
            <h2>No orders yet.</h2>
            <p>
              When you place an order, its live delivery status will appear
              here.
            </p>
            <Link className="button button-dark" href="/#shop">
              START SHOPPING <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
