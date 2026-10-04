"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type StoreSettings = {
  storeName: string;
  supportPhone: string;
  deliveryCharge: string;
  freeDeliveryThreshold: string;
  storeOpen: boolean;
  heroImage: string;
};

const defaults: StoreSettings = {
  storeName: "LATTEY WALA",
  supportPhone: "",
  deliveryCharge: "99",
  freeDeliveryThreshold: "1999",
  storeOpen: true,
  heroImage: "",
};

export default function SettingsPage() {
  const [form, setForm] = useState(defaults);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = "/admin/login";
        return;
      }
      try {
        const snapshot = await getDoc(doc(db, "settings", "store"));
        if (snapshot.exists()) {
          setForm((current) => ({ ...current, ...(snapshot.data() as Partial<StoreSettings>) }));
        }
      } catch (error) {
        setMessage(`Could not load settings: ${String((error as Error).message || error)}`);
      }
    });
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await setDoc(doc(db, "settings", "store"), {
        ...form,
        deliveryCharge: Number(form.deliveryCharge),
        freeDeliveryThreshold: Number(form.freeDeliveryThreshold),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setMessage("Settings saved. The homepage hero updates automatically.");
    } catch (error) {
      setMessage(`Settings were not saved: ${String((error as Error).message || error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/admin" className="back-link">ADMIN</Link>
        <h1>Settings</h1>
      </header>
      <section className="admin-content">
        <p className="eyebrow">STORE SETTINGS</p>
        {message && <p className="admin-notice">{message}</p>}
        <form className="admin-form" onSubmit={save}>
          <section className="hero-image-settings wide">
            <p className="eyebrow">HOMEPAGE HERO</p>
            <h2>Background image</h2>
            <p>Paste a public image URL. The preview shows how it will look behind the homepage headline.</p>
            <label>
              Hero image URL
              <input
                type="url"
                placeholder="https://example.com/hero.jpg"
                value={form.heroImage}
                onChange={(event) => setForm({ ...form, heroImage: event.target.value })}
              />
            </label>
            {form.heroImage ? (
              <div className="hero-image-preview" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.45), rgba(0,0,0,.05)), url("${form.heroImage.replaceAll('"', '%22')}")` }}>
                <span>Everyday style. <i>Elevated.</i></span>
              </div>
            ) : <p className="hero-image-empty">Current default hero image will be used until you add a URL.</p>}
          </section>
          <label>Store name<input value={form.storeName} onChange={(event) => setForm({ ...form, storeName: event.target.value })} /></label>
          <label>Support phone<input value={form.supportPhone} onChange={(event) => setForm({ ...form, supportPhone: event.target.value })} /></label>
          <label>Delivery charge<input type="number" value={form.deliveryCharge} onChange={(event) => setForm({ ...form, deliveryCharge: event.target.value })} /></label>
          <label>Free delivery threshold<input type="number" value={form.freeDeliveryThreshold} onChange={(event) => setForm({ ...form, freeDeliveryThreshold: event.target.value })} /></label>
          <label>Store available<select value={String(form.storeOpen)} onChange={(event) => setForm({ ...form, storeOpen: event.target.value === "true" })}><option value="true">Open</option><option value="false">Closed</option></select></label>
          <button className="button button-dark wide" disabled={saving}>{saving ? "SAVING…" : "SAVE SETTINGS"}</button>
        </form>
      </section>
    </main>
  );
}
