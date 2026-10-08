"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  ConfirmationResult,
  linkWithPhoneNumber,
  onAuthStateChanged,
  RecaptchaVerifier,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type ProfileForm = { name: string; phone: string; address: string; city: string; state: string; pincode: string; instructions: string };
const empty: ProfileForm = { name: "", phone: "", address: "", city: "", state: "", pincode: "", instructions: "" };

function phoneError(error: unknown) {
  const code = (error as { code?: string }).code;
  if (code === "auth/operation-not-allowed") return "Phone sign-in is not enabled for this Firebase project yet.";
  if (code === "auth/unauthorized-domain") return "This website domain is not authorized for phone sign-in in Firebase.";
  if (code === "auth/too-many-requests" || code === "auth/quota-exceeded") return "Too many OTP requests. Please try again later.";
  if (code === "auth/invalid-phone-number") return "Enter a valid 10-digit Indian mobile number.";
  if (code === "auth/invalid-verification-code") return "That OTP is incorrect. Check the code and try again.";
  if (code === "auth/code-expired") return "That OTP expired. Please request a new one.";
  if (code === "auth/credential-already-in-use") return "This phone number is already linked to another account. Sign in with that number or contact support.";
  if (code === "auth/requires-recent-login") return "Please sign out, sign back in, then link your phone again.";
  return error instanceof Error ? error.message : "Could not link this phone number.";
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [otp, setOtp] = useState("");
  const [linkedPhone, setLinkedPhone] = useState("");
  const verifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!auth) return;
    return auth.onAuthStateChanged(async (current) => {
      if (!current) { window.location.href = "/account/login"; return; }
      setUser(current);
      setLinkedPhone(current.phoneNumber || "");
      const snapshot = await getDoc(doc(db, "customers", current.uid));
      const saved = snapshot.exists() ? snapshot.data() : {};
      setForm((value) => ({
        ...value,
        name: String(saved.name || current.displayName || ""),
        phone: String(saved.phone || current.phoneNumber?.replace(/^\+91/, "") || ""),
        address: String(saved.address || ""), city: String(saved.city || ""),
        state: String(saved.state || ""), pincode: String(saved.pincode || ""),
        instructions: String(saved.instructions || ""),
      }));
      setLoading(false);
    });
  }, []);

  useEffect(() => () => verifier.current?.clear(), []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "customers", user.uid), { ...form, email: user.email || "", updatedAt: new Date().toISOString() }, { merge: true });
      setMessage("Profile and saved address updated.");
    } catch (error) { setMessage(`Could not save profile: ${(error as Error).message}`); }
    finally { setSaving(false); }
  };

  const sendLinkOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth || !user) return;
    const digits = form.phone.replace(/\D/g, "");
    const normalized = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
    if (!/^\d{10}$/.test(normalized)) { setOtpError("Enter a valid 10-digit Indian mobile number in your profile first."); return; }
    setOtpLoading(true); setOtpError(""); setOtpMessage("");
    try {
      verifier.current?.clear();
      verifier.current = new RecaptchaVerifier(auth, "profile-recaptcha", { size: "normal" });
      const result = await linkWithPhoneNumber(user, `+91${normalized}`, verifier.current);
      setConfirmation(result);
      setOtpMessage(`Verification code sent to +91 ${normalized}.`);
    } catch (error) { verifier.current?.clear(); verifier.current = null; setOtpError(phoneError(error)); }
    finally { setOtpLoading(false); }
  };

  const confirmLinkOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!confirmation || !user) return;
    setOtpLoading(true); setOtpError("");
    try {
      const result = await confirmation.confirm(otp);
      const verifiedPhone = result.user.phoneNumber || "";
      await setDoc(doc(db, "customers", user.uid), { phone: verifiedPhone, updatedAt: new Date().toISOString() }, { merge: true });
      setLinkedPhone(verifiedPhone);
      setForm((current) => ({ ...current, phone: verifiedPhone }));
      setOtpMessage("Phone verified and linked to this account. You can now sign in with OTP and keep your existing orders.");
      setConfirmation(null); setOtp("");
    } catch (error) { setOtpError(phoneError(error)); }
    finally { setOtpLoading(false); }
  };

  if (loading) return <main className="order-page"><p>Loading profile…</p></main>;
  return (
    <main className="order-page">
      <header className="detail-header"><Link href="/account" className="back-link"><ArrowLeft size={16} /> ACCOUNT</Link><span className="logo">PROFILE</span></header>
      <section className="account-content">
        <p className="eyebrow">PROFILE & SAVED ADDRESS</p><h1>Your details</h1>
        {message && <p className="admin-notice">{message}</p>}
        <form className="profile-form" onSubmit={save}>
          <label>Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Mobile number<input required type="tel" inputMode="numeric" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label className="wide">Address<textarea required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
          <label>City<input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
          <label>State<input required value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} /></label>
          <label>Pincode<input required inputMode="numeric" value={form.pincode} onChange={(event) => setForm({ ...form, pincode: event.target.value.replace(/\D/g, "").slice(0, 6) })} /></label>
          <label className="wide">Delivery instructions<textarea value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} /></label>
          <button className="button button-dark wide" type="submit" disabled={saving}>{saving ? "SAVING…" : "SAVE DETAILS"} <ArrowRight size={16} /></button>
        </form>
        <section className="phone-link-panel">
          <p className="eyebrow">LOGIN & SECURITY</p><h2>Mobile OTP sign-in</h2>
          {linkedPhone ? <p>Verified phone linked: <strong>{linkedPhone}</strong></p> : <p>Link your verified phone to this account to use OTP and keep your existing order history.</p>}
          {otpError && <p className="login-error admin-notice">{otpError}</p>}
          {otpMessage && <p className="admin-notice">{otpMessage}</p>}
          {linkedPhone ? null : (
            <form className="login-form" onSubmit={confirmation ? confirmLinkOtp : sendLinkOtp}>
              {confirmation && <label>6-digit verification code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} /></label>}
              <div id="profile-recaptcha" />
              <button className="button button-dark" disabled={otpLoading}>{otpLoading ? "PLEASE WAIT…" : confirmation ? "VERIFY & LINK PHONE" : "SEND PHONE OTP"}</button>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}
