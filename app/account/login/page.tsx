'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function AccountLoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { if (!auth) return; return onAuthStateChanged(auth, user => { if (user) window.location.href = '/checkout' }) }, [])
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!auth) { setError('Firebase Authentication is not configured.'); return } setLoading(true); setError(''); try { if (mode === 'login') await signInWithEmailAndPassword(auth, email, password); else await createUserWithEmailAndPassword(auth, email, password); window.location.href = '/checkout' } catch { setError(mode === 'login' ? 'Invalid email or password.' : 'Could not create account. Email may already be registered.') } finally { setLoading(false) } }
  return <main className="admin-login customer-login"><div className="admin-login-card"><Link href="/" className="back-link"><ArrowLeft size={15} /> BACK TO STORE</Link><div className="logo">LATTEY <span>WALLAH</span></div><p className="eyebrow">YOUR ACCOUNT</p><h1>{mode === 'login' ? 'Welcome back.' : 'Create account.'}</h1><p className="login-copy">Sign in to continue to secure checkout and track your orders.</p>{error && <p className="admin-notice login-error">{error}</p>}<form onSubmit={submit} className="login-form"><label>Email<input required type="email" value={email} onChange={event => setEmail(event.target.value)} /></label><label>Password<input required minLength={6} type="password" value={password} onChange={event => setPassword(event.target.value)} /></label><button className="button button-dark full" disabled={loading}>{loading ? 'PLEASE WAIT…' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'} <ArrowRight size={15} /></button></form><button className="login-switch" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></div></main>
}
