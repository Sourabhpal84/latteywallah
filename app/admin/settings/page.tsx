"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { updateEmail, updatePassword } from "firebase/auth";

type StoreSettings = {
  storeName: string;
  supportPhone: string;
  deliveryCharge: string;
  freeDeliveryThreshold: string;
  storeOpen: boolean;
  heroImageDesktop: string;
  heroImageMobile: string;
  heroEyebrow: string;
  heroTitle: string;
  heroAccent: string;
  heroDescription: string;
  heroButtonText: string;
  heroButtonLink: string;
  showHeroCopy: boolean;
};

const defaults: StoreSettings = {
  storeName: "LATTEY WALA",
  supportPhone: "",
  deliveryCharge: "99",
  freeDeliveryThreshold: "1998",
  storeOpen: true,
  heroImageDesktop: "",
  heroImageMobile: "",
  heroEyebrow: "THE EVERYDAY EDIT — 01",
  heroTitle: "Everyday style.",
  heroAccent: "Elevated.",
  heroDescription: "Thoughtful essentials for the way you live now. Designed in India, made to last.",
  heroButtonText: "SHOP THE EDIT",
  heroButtonLink: "#shop",
  showHeroCopy: true,
};

export default function SettingsPage() {
  const [form, setForm] = useState(defaults);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = "/admin/login";
        return;
      }
      setAdminEmail(user.email || "");
      try {
        const snapshot = await getDoc(doc(db, "settings", "store"));
        if (snapshot.exists()) {
          const data = snapshot.data();
          setForm((current) => ({
            ...current,
            ...(data as Partial<StoreSettings>),
            heroImageDesktop: String(data.heroImageDesktop || data.heroImage || ""),
            heroImageMobile: String(data.heroImageMobile || ""),
            heroEyebrow: typeof data.heroEyebrow === "string" ? data.heroEyebrow : defaults.heroEyebrow,
            heroTitle: typeof data.heroTitle === "string" ? data.heroTitle : defaults.heroTitle,
            heroAccent: typeof data.heroAccent === "string" ? data.heroAccent : defaults.heroAccent,
            heroDescription: typeof data.heroDescription === "string" ? data.heroDescription : defaults.heroDescription,
            heroButtonText: typeof data.heroButtonText === "string" ? data.heroButtonText : defaults.heroButtonText,
            heroButtonLink: typeof data.heroButtonLink === "string" ? data.heroButtonLink : defaults.heroButtonLink,
            showHeroCopy: data.showHeroCopy !== false,
          }));
        }
      } catch (error) {
        setMessage(`Could not load settings: ${String((error as Error).message || error)}`);
      }
    });
  }, []);

  const saveAdminAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth.currentUser) return;
    if (!newEmail.trim() && !newPassword) {
      setAccountMessage("Enter a new email, a new password, or both.");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setAccountMessage("Password must be at least 6 characters long.");
      return;
    }
    setAccountSaving(true);
    setAccountMessage("");
    try {
      if (newEmail.trim()) await updateEmail(auth.currentUser, newEmail.trim());
      if (newPassword) await updatePassword(auth.currentUser, newPassword);
      setAdminEmail(auth.currentUser.email || newEmail.trim());
      setNewEmail("");
      setNewPassword("");
      setAccountMessage("Admin login details updated. Use the new credentials next time you sign in.");
    } catch (error) {
      const code = (error as { code?: string }).code;
      const detail = code === "auth/requires-recent-login"
        ? "For security, sign out and sign back in, then update the login details again."
        : code === "auth/email-already-in-use"
          ? "This email is already used by another account."
          : code === "auth/invalid-email"
            ? "Enter a valid email address."
            : String((error as Error).message || error);
      setAccountMessage(`Login details were not fully updated: ${detail}`);
      setAdminEmail(auth.currentUser?.email || "");
    } finally {
      setAccountSaving(false);
    }
  };

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
        <section className="admin-account-settings">
          <p className="eyebrow">ADMIN ACCOUNT</p>
          <h2>Change email or password</h2>
          <p className="admin-account-current">Current email: {adminEmail || "—"}</p>
          {accountMessage && <p className="admin-notice admin-account-notice">{accountMessage}</p>}
          <form className="admin-account-form" onSubmit={saveAdminAccount}>
            <label>New email<input type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} /></label>
            <label>New password<input type="password" autoComplete="new-password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
            <button className="button admin-account-submit" disabled={accountSaving}>{accountSaving ? "UPDATING LOGIN DETAILS…" : "SET CLIENT LOGIN DETAILS"}</button>
          </form>
        </section>
        <p className="eyebrow">STORE SETTINGS</p>
        {message && <p className="admin-notice">{message}</p>}
        <form className="admin-form" onSubmit={save}>
          <section className="hero-image-settings wide">
            <p className="eyebrow">HOMEPAGE HERO</p>
            <h2>Background image</h2>
            <p>Use separate public image URLs for desktop and mobile. Images display in full without cropping; empty mobile URL uses the desktop image.</p>
            <label>
              Desktop image URL
              <input
                type="url"
                placeholder="https://example.com/hero.jpg"
                value={form.heroImageDesktop}
                onChange={(event) => setForm({ ...form, heroImageDesktop: event.target.value })}
              />
            </label>
            {form.heroImageDesktop ? (
              <div className="hero-image-preview" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.45), rgba(0,0,0,.05)), url("${form.heroImageDesktop.replaceAll('"', '%22')}")` }}>
                <span>{form.heroTitle} <i>{form.heroAccent}</i></span>
              </div>
            ) : <p className="hero-image-empty">Current default hero image will be used until you add a desktop URL.</p>}
            <label>
              Mobile image URL
              <input
                type="url"
                placeholder="https://example.com/hero-mobile.jpg"
                value={form.heroImageMobile}
                onChange={(event) => setForm({ ...form, heroImageMobile: event.target.value })}
              />
            </label>
            {form.heroImageMobile && (
              <div className="hero-image-preview hero-image-preview-mobile" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.45), rgba(0,0,0,.05)), url("${form.heroImageMobile.replaceAll('"', '%22')}")` }}>
                <span>{form.heroTitle} <i>{form.heroAccent}</i></span>
              </div>
            )}
          </section>
          <section className="hero-copy-settings wide">
            <p className="eyebrow">HERO TEXT & BUTTON</p>
            <h2>Homepage message</h2>
            <label className="hero-copy-toggle">
              <input type="checkbox" checked={form.showHeroCopy} onChange={(event) => setForm({ ...form, showHeroCopy: event.target.checked })} />
              Show all hero text and button
            </label>
            <div className="hero-copy-fields">
              <label>Small heading<input value={form.heroEyebrow} onChange={(event) => setForm({ ...form, heroEyebrow: event.target.value })} /></label>
              <label>Main heading<input value={form.heroTitle} onChange={(event) => setForm({ ...form, heroTitle: event.target.value })} /></label>
              <label>Italic heading<input value={form.heroAccent} onChange={(event) => setForm({ ...form, heroAccent: event.target.value })} /></label>
              <label>Button text<input value={form.heroButtonText} onChange={(event) => setForm({ ...form, heroButtonText: event.target.value })} /></label>
              <label className="hero-copy-description">Description<textarea value={form.heroDescription} onChange={(event) => setForm({ ...form, heroDescription: event.target.value })} /></label>
              <label>Button link<input value={form.heroButtonLink} placeholder="#shop or https://example.com" onChange={(event) => setForm({ ...form, heroButtonLink: event.target.value })} /></label>
            </div>
            {!form.showHeroCopy && <p className="hero-copy-hidden-note">Hero text and button are hidden on the storefront. The background image remains visible.</p>}
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
