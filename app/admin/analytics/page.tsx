"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { ArrowLeft, Eye, ShoppingBag, UserRoundPlus } from "lucide-react";
import { auth } from "@/lib/firebase";
import { money } from "@/components/order-ui";

type Visitor = {
  id: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  firstPath?: string;
  visits?: number;
};
type CheckoutAttempt = {
  id: string;
  status?: string;
  customer?: { name?: string; phone?: string; email?: string };
  deliveryAddress?: { address?: string; pincode?: string };
  items?: Array<{ name?: string; quantity?: number }>;
  totalAmount?: number;
  createdAt?: string;
  updatedAt?: string;
};

function displayDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminAnalyticsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [attempts, setAttempts] = useState<CheckoutAttempt[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth) return;
    let refreshTimer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    const load = async (user: User) => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/analytics", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load analytics");
        if (cancelled) return;
        setVisitors(result.visitors as Visitor[]);
        setAttempts(result.attempts as CheckoutAttempt[]);
        setError("");
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load analytics");
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    const stopAuth = auth.onAuthStateChanged((user) => {
      if (refreshTimer) clearInterval(refreshTimer);
      if (!user) {
        window.location.href = "/admin/login";
        return;
      }
      void load(user);
      refreshTimer = setInterval(() => void load(user), 30_000);
    });
    return () => {
      cancelled = true;
      stopAuth();
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, []);

  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newVisitors = useMemo(
    () => visitors.filter((visitor) => Date.parse(visitor.firstSeenAt || "") >= since).length,
    [visitors, since],
  );
  const recentVisitors = useMemo(
    () => visitors.filter((visitor) => Date.parse(visitor.lastSeenAt || "") >= since),
    [visitors, since],
  );
  const unpaid = useMemo(
    () => attempts.filter((attempt) => attempt.status !== "PAID"),
    [attempts],
  );

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/admin" className="back-link"><ArrowLeft size={16} /> ADMIN</Link>
        <div className="admin-header-actions">
          <Link className="button button-outline" href="/admin/orders">ORDERS</Link>
          <span className="admin-status">● LIVE</span>
        </div>
      </header>
      <section className="admin-content analytics-dashboard">
        <div className="admin-intro">
          <div>
            <p className="eyebrow">STORE TRAFFIC & CHECKOUT</p>
            <h1>Visitors and unpaid checkouts</h1>
            <p>Anonymous browser counts and customer details entered before Razorpay payment.</p>
          </div>
        </div>
        {error && <div className="orders-state error">{error}</div>}
        <div className="order-stats analytics-stats">
          <article><span><UserRoundPlus size={17} /></span><small>New visitors · 30 days</small><b>{ready ? newVisitors : "—"}</b></article>
          <article><span><Eye size={17} /></span><small>Unique visitors · 30 days</small><b>{ready ? recentVisitors.length : "—"}</b></article>
          <article><span><ShoppingBag size={17} /></span><small>Unpaid checkout attempts</small><b>{ready ? unpaid.length : "—"}</b></article>
        </div>

        <section className="admin-section analytics-section">
          <div className="admin-section-head">
            <div><p className="eyebrow">PAYMENT NOT COMPLETED</p><h2>Checkout attempts</h2></div>
            <span>{unpaid.length} unpaid</span>
          </div>
          <p className="analytics-note">If a customer pays after leaving this screen, the record switches to PAID and disappears from this list.</p>
          {!ready ? <div className="orders-state">Loading analytics…</div> : unpaid.length ? (
            <div className="analytics-attempts">
              {unpaid.map((attempt) => (
                <article className="analytics-attempt" key={attempt.id}>
                  <div className="analytics-customer">
                    <b>{attempt.customer?.name || "Customer"}</b>
                    {attempt.customer?.phone && <a href={`tel:${attempt.customer.phone}`}>{attempt.customer.phone}</a>}
                    {attempt.customer?.email && <a href={`mailto:${attempt.customer.email}`}>{attempt.customer.email}</a>}
                    <small>{attempt.deliveryAddress?.address || ""}{attempt.deliveryAddress?.pincode ? ` · ${attempt.deliveryAddress.pincode}` : ""}</small>
                  </div>
                  <div className="analytics-items">
                    <b>{attempt.items?.map((item) => `${item.name || "Item"} ×${item.quantity || 1}`).join(", ") || "Cart details unavailable"}</b>
                    <small>Started {displayDate(attempt.createdAt)}</small>
                  </div>
                  <strong>{money(attempt.totalAmount)}</strong>
                  <span className={`analytics-status analytics-status-${(attempt.status || "unknown").toLowerCase()}`}>{attempt.status || "UNKNOWN"}</span>
                </article>
              ))}
            </div>
          ) : <div className="orders-state">No unpaid checkout attempts.</div>}
        </section>

        <section className="admin-section analytics-section">
          <div className="admin-section-head">
            <div><p className="eyebrow">ANONYMOUS TRAFFIC</p><h2>New visitors · last 30 days</h2></div>
            <span>{newVisitors} new</span>
          </div>
          {!ready ? <div className="orders-state">Loading visitors…</div> : (
            <div className="analytics-visitors">
              {visitors.filter((visitor) => Date.parse(visitor.firstSeenAt || "") >= since).slice(0, 100).map((visitor) => (
                <article key={visitor.id}>
                  <b>{displayDate(visitor.firstSeenAt)}</b>
                  <span>{visitor.firstPath || "/"}</span>
                  <small>{visitor.visits || 1} page visits</small>
                </article>
              ))}
              {!newVisitors && <div className="orders-state">No new visitors in this period yet.</div>}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
