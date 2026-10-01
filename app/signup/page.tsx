'use client'
import { useEffect } from 'react'
export default function SignupPage() { useEffect(() => { window.location.replace('/account/login?mode=signup') }, []); return <main className="order-page"><p>Opening signup…</p></main> }
