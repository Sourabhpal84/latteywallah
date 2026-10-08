"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  ConfirmationResult,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type Mode = "login" | "signup" | "otp";

function authError(error: unknown) {
  const code = (error as { code?: string }).code;
  if (code === "auth/operation-not-allowed") return "Firebase rejected phone sign-in. Check that Phone is enabled and India is allowed under Authentication → Settings → SMS region policy. Also confirm this site uses that same Firebase project.";
  if (code === "auth/unauthorized-domain") return "This website domain is not authorized for phone sign-in in Firebase.";
  if (code === "auth/too-many-requests" || code === "auth/quota-exceeded") return "Too many OTP requests. Please try again later.";
  if (code === "auth/invalid-phone-number") return "Enter a valid 10-digit Indian mobile number.";
  if (code === "auth/invalid-verification-code") return "That OTP is incorrect. Check the code and try again.";
  if (code === "auth/code-expired") return "That OTP expired. Please request a new one.";
  if (code === "auth/captcha-check-failed") return "reCAPTCHA could not be verified. Refresh and try again.";
  return error instanceof Error ? error.message : "Could not sign in. Please try again.";
}

export default function AccountLoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const verifier = useRef<RecaptchaVerifier | null>(null);
  const authFlowStarted = useRef(false);

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    if (requestedMode === "signup") setMode("signup");
    if (!auth) return;
    return onAuthStateChanged(auth, (user) => {
      if (user && !authFlowStarted.current) window.location.replace("/account");
    });
  }, []);

  useEffect(() => () => verifier.current?.clear(), []);

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth) return setError("Firebase Authentication is not configured.");
    setLoading(true); setError(""); setMessage("");
    try {
      authFlowStarted.current = true;
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const created = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "customers", created.user.uid), {
          name, phone: phone ? `+91${phone}` : "", email,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }
      window.location.assign("/account");
    } catch (submitError) {
      authFlowStarted.current = false;
      setError(mode === "login" ? "Invalid email or password." : "Could not create account. Email may already be registered.");
    } finally { setLoading(false); }
  };

  const sendOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth) return setError("Firebase Authentication is not configured.");
    if (!/^\d{10}$/.test(phone)) return setError("Enter a valid 10-digit Indian mobile number.");
    setLoading(true); setError(""); setMessage("");
    try {
      verifier.current?.clear();
      verifier.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "normal" });
      const result = await signInWithPhoneNumber(auth, `+91${phone}`, verifier.current);
      setConfirmation(result);
      setMessage(`Verification code sent to +91 ${phone}.`);
    } catch (sendError) {
      verifier.current?.clear(); verifier.current = null;
      setError(authError(sendError));
    } finally { setLoading(false); }
  };

  const confirmOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!confirmation || !auth) return;
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit verification code.");
    setLoading(true); setError(""); setMessage("");
    try {
      authFlowStarted.current = true;
      const credential = await confirmation.confirm(otp);
      const profile: Record<string, string> = {
        phone: credential.user.phoneNumber || `+91${phone}`,
        updatedAt: new Date().toISOString(),
      };
      if (name.trim()) profile.name = name.trim();
      if (credential.user.email) profile.email = credential.user.email;
      await setDoc(doc(db, "customers", credential.user.uid), profile, { merge: true });
      window.location.assign("/account");
    } catch (confirmError) {
      authFlowStarted.current = false;
      setError(authError(confirmError));
    } finally { setLoading(false); }
  };

  const resetPassword = async () => {
    if (!auth || !email) return setError("Enter your email first.");
    try { await sendPasswordResetEmail(auth, email); setMessage("Password reset email sent."); setError(""); }
    catch { setError("Could not send password reset email."); }
  };

  const chooseMode = (next: Mode) => {
    setMode(next); setError(""); setMessage(""); setConfirmation(null); setOtp("");
    verifier.current?.clear(); verifier.current = null;
  };

  return (
    <main className="admin-login customer-login">
      <div className="admin-login-card">
        <Link href="/" className="back-link"><ArrowLeft size={15} /> BACK TO STORE</Link>
        <div className="logo">LATTEY <span>WALA</span></div>
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>{mode === "signup" ? "Create account." : "Welcome back."}</h1>
        <p className="login-copy">{mode === "otp" ? "Sign in or create your customer account with a one-time code." : mode === "signup" ? "Create an account to save your address and track orders." : "Sign in to track orders and continue checkout."}</p>
        <div className="auth-method-tabs">
          <button type="button" className={mode !== "otp" ? "selected" : ""} onClick={() => chooseMode("login")}>EMAIL</button>
          <button type="button" className={mode === "otp" ? "selected" : ""} onClick={() => chooseMode("otp")}>MOBILE OTP</button>
        </div>
        {mode === "signup" && <p className="auth-backup-note">New customer? <button type="button" onClick={() => chooseMode("signup")}>Create an email account</button></p>}
        {error && <p className="admin-notice login-error">{error}</p>}
        {message && <p className="admin-notice">{message}</p>}

        {mode !== "otp" ? (
          <form onSubmit={submitEmail} className="login-form">
            {mode === "signup" && <><label>Full name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Mobile number (optional)<input type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} /></label></>}
            <label>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input required minLength={6} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <button className="button button-dark full" disabled={loading}>{loading ? "PLEASE WAIT…" : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"} <ArrowRight size={15} /></button>
          </form>
        ) : (
          <>
            <form onSubmit={confirmation ? confirmOtp : sendOtp} className="login-form">
              {!confirmation && <><label>Name (for new customers, optional)<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Mobile number<input required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit number" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} /></label></>}
              {confirmation && <label>6-digit code sent to +91 {phone}<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} /></label>}
              <div id="recaptcha-container" />
              <button className="button button-dark full" disabled={loading}>{loading ? "PLEASE WAIT…" : confirmation ? "VERIFY & SIGN IN" : "SEND OTP"} <ArrowRight size={15} /></button>
            </form>
            {confirmation && <button type="button" className="login-switch" disabled={loading} onClick={() => { setConfirmation(null); setOtp(""); setMessage(""); verifier.current?.clear(); verifier.current = null; }}>Use a different number</button>}
            <p className="otp-consent">By continuing, you agree to receive an SMS verification code. Standard SMS rates may apply.</p>
            <p className="auth-backup-note">If you already have an email account, sign in with email first and link your phone in My Profile to keep your existing orders.</p>
          </>
        )}
        {mode === "login" && <button className="login-switch" onClick={resetPassword}>Forgot password?</button>}
        {mode !== "otp" && <button className="login-switch" onClick={() => chooseMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "New here? Create an email account" : "Already have an account? Sign in"}</button>}
      </div>
    </main>
  );
}
