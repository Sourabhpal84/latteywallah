"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { ArrowLeft, Trash2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";

type Coupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount: number;
  startsAt: string;
  expiresAt: string;
  active: boolean;
};

const blank = { code: "", type: "percent" as const, value: "10", minOrder: "0", maxDiscount: "", startsAt: "", expiresAt: "" };
export default function AdminCouponsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCoupons = async () => {
    const result = await getDocs(query(collection(db, "coupons"), orderBy("updatedAt", "desc")));
    setCoupons(result.docs.map((item) => ({ id: item.id, ...item.data() } as Coupon)));
  };

  useEffect(() => onAuthStateChanged(auth, (current) => {
    setUser(current);
    if (!current) window.location.href = "/admin/login";
    else loadCoupons().catch((error) => setMessage(`Could not load coupons: ${(error as Error).message}`));
  }), []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);
    const minOrder = Number(form.minOrder || 0);
    const maxDiscount = Number(form.maxDiscount || 0);
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return setMessage("Use 3–30 letters, numbers, hyphens or underscores for the code.");
    if (!Number.isFinite(value) || value <= 0 || (form.type === "percent" && value > 100)) return setMessage("Enter a valid discount value. Percentage must be 1–100.");
    setSaving(true);
    setMessage("");
    try {
      const existing = await getDocs(query(collection(db, "coupons")));
      const duplicate = existing.docs.some((item) => item.id === code);
      if (duplicate) throw new Error("That coupon code already exists.");
      await setDoc(doc(db, "coupons", code), {
        code,
        type: form.type,
        value,
        minOrder: Math.max(0, minOrder),
        maxDiscount: form.type === "percent" ? Math.max(0, maxDiscount) : 0,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "",
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : "",
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setForm(blank);
      setMessage(`${code} coupon created.`);
      await loadCoupons();
    } catch (error) {
      setMessage(`Coupon was not saved: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (coupon: Coupon, active: boolean) => {
    try {
      await setDoc(doc(db, "coupons", coupon.id), { active, updatedAt: new Date().toISOString() }, { merge: true });
      await loadCoupons();
      setMessage(`${coupon.code} ${active ? "enabled" : "disabled"}.`);
    } catch (error) { setMessage(`Coupon was not updated: ${(error as Error).message}`); }
  };

  const remove = async (coupon: Coupon) => {
    if (!confirm(`Delete coupon ${coupon.code}?`)) return;
    try {
      await deleteDoc(doc(db, "coupons", coupon.id));
      await loadCoupons();
      setMessage(`${coupon.code} deleted.`);
    } catch (error) { setMessage(`Coupon was not deleted: ${(error as Error).message}`); }
  };

  if (!user) return <main className="admin-page" />;
  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/admin" className="back-link"><ArrowLeft size={16} /> ADMIN</Link>
        <div className="logo">LATTEY <span>WALA</span></div>
        <span className="admin-badge">COUPON MANAGER</span>
      </header>
      <section className="admin-content coupon-manager">
        <p className="eyebrow">PROMOTIONS</p>
        <h1>Coupon codes</h1>
        <p className="coupon-intro">Create percentage or fixed discounts. Discounts apply to product subtotal before tax; delivery fees are not discounted.</p>
        {message && <p className="admin-notice">{message}</p>}
        <form className="admin-form coupon-form" onSubmit={save}>
          <label>Coupon code<input required maxLength={30} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} placeholder="WELCOME10" /></label>
          <label>Discount type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as "percent" | "fixed" })}><option value="percent">Percentage</option><option value="fixed">Fixed amount (₹)</option></select></label>
          <label>{form.type === "percent" ? "Percentage off" : "Amount off (₹)"}<input required type="number" min="1" max={form.type === "percent" ? 100 : undefined} step="1" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} /></label>
          <label>Minimum order (₹)<input type="number" min="0" step="1" value={form.minOrder} onChange={(event) => setForm({ ...form, minOrder: event.target.value })} /></label>
          {form.type === "percent" && <label>Maximum discount (₹, optional)<input type="number" min="0" step="1" value={form.maxDiscount} onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })} /></label>}
          <label>Starts at (optional)<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
          <label>Expires at (optional)<input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></label>
          <button className="button button-dark wide" disabled={saving}>{saving ? "SAVING…" : "CREATE COUPON"}</button>
        </form>
        <section className="coupon-list">
          <h2>Existing coupons</h2>
          {coupons.length === 0 ? <p>No coupons yet.</p> : coupons.map((coupon) => (
            <article className="coupon-row" key={coupon.id}>
              <div><b>{coupon.code}</b><span>{coupon.type === "percent" ? `${coupon.value}% off` : `₹${coupon.value} off`} · min order ₹{coupon.minOrder || 0}{coupon.maxDiscount ? ` · max ₹${coupon.maxDiscount}` : ""}</span><small>{coupon.expiresAt ? `Expires ${new Date(coupon.expiresAt).toLocaleString()}` : "No expiry"}</small></div>
              <label className="coupon-active">Active<input type="checkbox" checked={coupon.active} onChange={(event) => setActive(coupon, event.target.checked)} /></label>
              <button className="tree-delete" onClick={() => remove(coupon)} aria-label={`Delete ${coupon.code}`}><Trash2 size={16} /></button>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
